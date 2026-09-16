import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  onAuthStateChanged as onFirebaseAuthChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDocFromServer,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  increment,
  orderBy,
  limit,
  arrayUnion,
} from 'firebase/firestore';
import { UserProfile } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyCylFAPujR2odXOCFg3dncfjNGK-edJHJM",
  authDomain: "novavest-a711c.firebaseapp.com",
  projectId: "novavest-a711c",
  storageBucket: "novavest-a711c.firebasestorage.app",
  messagingSenderId: "826750954477",
  appId: "1:826750954477:web:5cc28ef9c03318208855e4",
  measurementId: "G-J9MHHMXXVY"
};

// Initialize Firebase app singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Error logging conforming to skill guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('[Firestore Safely Handled Error]:', JSON.stringify(errInfo));
  return errInfo;
}

// Non-blocking background connectivity test (does not block UI or auth initialization)
export function testFirestoreConnection() {
  setTimeout(async () => {
    try {
      await getDoc(doc(db, 'test', 'connection'));
    } catch {
      // ignore
    }
  }, 3000);
}

testFirestoreConnection();

/**
 * Normalizes phone numbers for matching (strips non-digits)
 */
export const normalizePhone = (phone: string): string => {
  return (phone || '').replace(/\D/g, '');
};

/**
 * Sanitizes document IDs to ensure valid Firestore document paths:
 * - Trims whitespace
 * - Replaces slashes '/' with '_' so references don't produce invalid segment counts
 * - Replaces whitespace with '_'
 * - Ensures a non-empty fallback
 */
export const cleanDocId = (id: unknown, fallback = 'doc'): string => {
  if (typeof id !== 'string' && typeof id !== 'number') {
    return fallback;
  }
  let str = String(id).trim().replace(/\//g, '_').replace(/\s+/g, '_');
  str = str.replace(/^\.+|\.+$/g, '');
  if (str === '.' || str === '..' || str.length === 0) {
    return fallback;
  }
  return str;
};

/**
 * Recursively sanitizes any JavaScript object/data before sending to Firestore:
 * - Strips `undefined`, functions, symbols, and bigints
 * - Replaces NaN, Infinity, -Infinity with 0
 * - Flattens nested arrays recursively so Firestore never encounters nested arrays [[...]]
 * - Prevents FieldValues inside arrays (Firestore throws if serverTimestamp/increment is in an array)
 * - Strips empty keys `""` and keys beginning/ending with `__`
 * - Converts non-plain objects / class instances safely to plain objects
 * - Preserves top-level Firestore FieldValues (serverTimestamp, increment, arrayUnion, arrayRemove, deleteField)
 * - Preserves Firestore DocumentReferences
 */
export function sanitizeFirestoreData(data: any, inArray = false): any {
  if (data === undefined) {
    return undefined;
  }
  if (data === null) {
    return null;
  }

  const type = typeof data;
  if (type === 'number') {
    if (!Number.isFinite(data) || Number.isNaN(data)) {
      return 0;
    }
    return data;
  }
  if (type === 'string' || type === 'boolean') {
    return data;
  }
  if (type === 'function' || type === 'symbol' || type === 'bigint') {
    return undefined;
  }

  // Preserve Date instances and Firestore Timestamps
  if (data instanceof Date) {
    return data;
  }
  if (typeof data === 'object' && 'nanoseconds' in data && 'seconds' in data) {
    return data;
  }

  // Preserve Firestore DocumentReferences (do not convert to plain object which strips prototype)
  if (typeof data === 'object' && data !== null && (data.type === 'document' || (data.firestore && data.path))) {
    return data;
  }

  // Preserve Firestore FieldValues (increment, serverTimestamp, arrayUnion, arrayRemove, deleteField, etc.)
  const isFieldValue =
    Boolean(data._methodName) ||
    Boolean(data?.constructor && typeof data.constructor.name === 'string' && data.constructor.name.includes('FieldValue')) ||
    (typeof data.isEqual === 'function' && typeof data._toFieldTransform === 'function');

  if (isFieldValue) {
    if (inArray) {
      // Firestore does NOT permit FieldValues inside arrays
      if (data._methodName === 'serverTimestamp') {
        return new Date().toISOString();
      }
      if (data._methodName === 'increment' && typeof data._operand === 'number') {
        return data._operand;
      }
      return null;
    }
    // If it's an arrayUnion or arrayRemove, sanitize the elements inside it safely
    try {
      if ((data._methodName === 'arrayUnion' || data._methodName === 'arrayRemove') && Array.isArray(data._elements)) {
        data._elements = data._elements
          .map((el: any) => sanitizeFirestoreData(el, true))
          .filter((el: any) => el !== undefined);
      }
    } catch {}
    return data;
  }

  // Handle Arrays:
  if (Array.isArray(data)) {
    const flatItems: any[] = [];
    for (const item of data) {
      if (Array.isArray(item)) {
        // Flatten nested arrays recursively
        const innerSanitized = sanitizeFirestoreData(item, true);
        if (Array.isArray(innerSanitized)) {
          flatItems.push(...innerSanitized);
        } else if (innerSanitized !== undefined) {
          flatItems.push(innerSanitized);
        }
      } else {
        const sanitized = sanitizeFirestoreData(item, true);
        if (sanitized !== undefined) {
          flatItems.push(sanitized);
        }
      }
    }
    return flatItems;
  }

  // Handle Objects:
  if (type === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (typeof key !== 'string') continue;
      const cleanKey = key.trim();
      // Firestore forbids empty keys and keys starting and ending with __
      if (cleanKey.length === 0 || /^__.*__$/.test(cleanKey)) {
        continue;
      }
      if (val === undefined) {
        continue;
      }
      const sanitizedVal = sanitizeFirestoreData(val, inArray);
      if (sanitizedVal !== undefined) {
        result[cleanKey] = sanitizedVal;
      }
    }
    return result;
  }

  return undefined;
}

/**
 * Safe document reference constructor that validates collection and document paths
 */
export const safeDoc = (collectionName: string, ...segments: (string | undefined | null)[]) => {
  try {
    if (!collectionName || typeof collectionName !== 'string' || collectionName.trim().length === 0) {
      return null;
    }
    const cleanCol = collectionName.trim();
    const cleanSegments: string[] = [];
    for (const s of segments) {
      if (s === undefined || s === null) continue;
      const c = cleanDocId(String(s), '');
      if (c && c.length > 0) {
        cleanSegments.push(c);
      }
    }
    if (cleanSegments.length === 0) return null;
    // Total path components must be even (e.g. collection/doc or col/doc/subcol/doc)
    if ((cleanSegments.length + 1) % 2 !== 0) {
      return null;
    }
    return doc(db, cleanCol, ...cleanSegments);
  } catch {
    return null;
  }
};

/**
 * Safe setDoc wrapper that prevents "Invalid data" or document reference exceptions
 */
export const safeSetDoc = async (
  docRef: any,
  data: any,
  options: { merge?: boolean } = { merge: true }
): Promise<boolean> => {
  if (!docRef) return false;
  try {
    const clean = sanitizeFirestoreData(data);
    if (!clean || typeof clean !== 'object' || Array.isArray(clean)) {
      return false;
    }
    if (Object.keys(clean).length === 0) {
      return true; // No keys to write
    }
    await setDoc(docRef, clean, options);
    return true;
  } catch (err: any) {
    console.warn('[Firebase] safeSetDoc notice:', err?.message || err);
    return false;
  }
};

/**
 * Safe updateDoc wrapper that prevents "Invalid data" or missing document exceptions
 */
export const safeUpdateDoc = async (
  docRef: any,
  data: any
): Promise<boolean> => {
  if (!docRef) return false;
  try {
    const clean = sanitizeFirestoreData(data);
    if (!clean || typeof clean !== 'object' || Array.isArray(clean)) {
      return false;
    }
    if (Object.keys(clean).length === 0) {
      return true;
    }
    await setDoc(docRef, clean, { merge: true });
    return true;
  } catch (err: any) {
    console.warn('[Firebase] safeUpdateDoc notice:', err?.message || err);
    return false;
  }
};

/**
 * Create a new user profile in Firestore
 */
export const createFirestoreUserProfile = async (
  uid: string,
  data: {
    name: string;
    phone: string;
    email: string;
    memberId?: string;
    referralCode?: string;
    referredBy?: string;
    walletBalance?: number;
  }
): Promise<UserProfile> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) {
    return {
      uid: '',
      name: data?.name || 'NVT Member',
      phone: data?.phone || '',
      email: data?.email || '',
      memberId: data?.memberId || 'NVT000000',
      referralCode: 'NV0000',
      walletBalance: 0,
      memberSince: 'May 2024',
      isVerified: true,
    };
  }

  const userDocRef = safeDoc('users', cleanUid);
  const now = new Date();
  const memberSince = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Generate unique 6-character referral code if not already provided
  const cleanMemberId = (data.memberId || '').trim() || `NVT${Math.floor(100000 + Math.random() * 900000)}`;
  const referralCode =
    (data.referralCode || '').trim().toUpperCase() ||
    cleanMemberId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() ||
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const cleanReferredBy = (data.referredBy || '').trim().toUpperCase();

  const safeBalance =
    typeof data.walletBalance === 'number' && !Number.isNaN(data.walletBalance) && data.walletBalance !== 12450.0
      ? data.walletBalance
      : 0.0;

  const profile: UserProfile = {
    uid: cleanUid,
    name: (data.name || '').trim() || 'NVT Member',
    phone: (data.phone || '').trim(),
    email: (data.email || '').trim(),
    memberId: cleanMemberId,
    referralCode,
    referredBy: cleanReferredBy || undefined,
    walletBalance: safeBalance,
    memberSince,
    isVerified: true,
  };

  const normalized = normalizePhone(profile.phone);
  const last10 = normalized.length >= 10 ? normalized.slice(-10) : normalized;

  const docPayload: Record<string, any> = {
    uid: cleanUid,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    memberId: cleanMemberId,
    referralCode,
    walletBalance: profile.walletBalance,
    memberSince,
    isVerified: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (normalized) {
    docPayload.phoneNormalized = normalized;
  }
  if (last10) {
    docPayload.phoneLast10 = last10;
  }
  if (cleanReferredBy) {
    docPayload.referredBy = cleanReferredBy;
  }

  try {
    const cleanPayload = sanitizeFirestoreData(docPayload);
    if (cleanPayload && Object.keys(cleanPayload).length > 0) {
      await safeSetDoc(userDocRef, cleanPayload, { merge: true });
    }

    // Immediately create referral node record and dispatch real-time event
    const nodePayload = {
      userId: cleanUid,
      userCode: referralCode,
      memberId: cleanMemberId,
      referredByCode: cleanReferredBy,
      phone: profile.phone,
      username: profile.name,
      joinedAt: now.toISOString(),
      investAmount: safeBalance,
      updatedAt: serverTimestamp(),
    };

    const ref1 = safeDoc('referral_nodes', referralCode);
    if (ref1) safeSetDoc(ref1, nodePayload, { merge: true }).catch(() => {});
    if (cleanMemberId && cleanMemberId !== referralCode) {
      const ref2 = safeDoc('referral_nodes', cleanMemberId);
      if (ref2) safeSetDoc(ref2, nodePayload, { merge: true }).catch(() => {});
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem('novavest_registered_accounts');
        const accs = raw ? JSON.parse(raw) : {};
        accs[referralCode] = {
          userId: cleanUid,
          userCode: referralCode,
          memberId: cleanMemberId,
          referredByCode: cleanReferredBy,
          phone: profile.phone,
          username: profile.name,
          joinedAt: now.toISOString(),
          investAmount: safeBalance,
        };
        if (cleanMemberId) {
          accs[cleanMemberId] = accs[referralCode];
        }
        localStorage.setItem('novavest_registered_accounts', JSON.stringify(accs));
        window.dispatchEvent(new Event('referral_rewards_updated'));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }

    return profile;
  } catch (error) {
    console.warn('[Firebase] Warning in createFirestoreUserProfile:', error);
    return profile;
  }
};

/**
 * Fetch a user profile by UID
 */
export const getFirestoreUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return null;
  const userDocRef = safeDoc('users', cleanUid);
  if (!userDocRef) return null;
  try {
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid: cleanUid,
      name: data.name || 'NVT Member',
      phone: data.phone || '',
      email: data.email || '',
      memberId: data.memberId || `NVT${Math.floor(100000 + Math.random() * 900000)}`,
      referralCode: data.referralCode || data.memberId?.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'NV8829',
      referredBy: data.referredBy || undefined,
      walletBalance:
        typeof data.walletBalance === 'number' && !Number.isNaN(data.walletBalance) && data.walletBalance !== 12450.0
          ? data.walletBalance
          : 0.0,
      memberSince: data.memberSince || 'May 2024',
      isVerified: data.isVerified ?? true,
      avatarUrl: data.avatarUrl,
      fullName: data.fullName,
      transactions: data.transactions || [],
    };
  } catch (error) {
    console.warn('[Firebase] Warning fetching user profile:', error);
    return null;
  }
};

/**
 * Find email associated with a phone number (or identifier) in Firestore
 */
export const findEmailByPhone = async (rawPhone: string): Promise<string | null> => {
  const normalized = normalizePhone(rawPhone);
  if (!normalized && !rawPhone.trim()) return null;

  const last10 = normalized.length >= 10 ? normalized.slice(-10) : normalized;

  // 1. Check multi-variant localStorage client cache first (instant 0ms)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keysToTry = [
        `nvt_phone_email_${normalized}`,
        `nvt_phone_email_${last10}`,
        `nvt_phone_email_0${last10}`,
        `nvt_phone_email_880${last10}`,
        `nvt_phone_email_8800${last10}`,
      ];
      for (const key of keysToTry) {
        const cached = localStorage.getItem(key);
        if (cached) return cached;
      }

      // Also check local referral accounts table
      const rawAccounts = localStorage.getItem('novaterra_referral_accounts_v3');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        for (const acc of Object.values(accounts) as any[]) {
          if (acc.phone && last10 && normalizePhone(acc.phone).slice(-10) === last10) {
            if (acc.email) return acc.email;
          }
          if (acc.memberId && acc.memberId.toUpperCase() === rawPhone.trim().toUpperCase()) {
            if (acc.email) return acc.email;
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 2. Comprehensive multi-tier Firestore lookup
  try {
    const usersRef = collection(db, 'users');
    let foundEmail: string | null = null;
    let matchedDocId: string | null = null;

    // A. Single-value indexed queries (fastest and resilient)
    if (last10) {
      try {
        const qLast10 = query(usersRef, where('phoneLast10', '==', last10));
        const res: any = await Promise.race([
          getDocs(qLast10),
          new Promise<null>((res) => setTimeout(() => res(null), 2500)),
        ]);
        if (res && !res.empty) {
          foundEmail = res.docs[0].data().email || null;
          matchedDocId = res.docs[0].id;
        }
      } catch (err) {
        // continue
      }
    }

    if (!foundEmail && normalized) {
      try {
        const qNorm = query(usersRef, where('phoneNormalized', '==', normalized));
        const res: any = await Promise.race([
          getDocs(qNorm),
          new Promise<null>((res) => setTimeout(() => res(null), 2500)),
        ]);
        if (res && !res.empty) {
          foundEmail = res.docs[0].data().email || null;
          matchedDocId = res.docs[0].id;
        }
      } catch (err) {
        // continue
      }
    }

    // B. Direct raw phone string queries
    if (!foundEmail && last10) {
      const candidates = [
        `+880 ${last10}`,
        `+880 0${last10}`,
        `+880${last10}`,
        `0${last10}`,
        last10,
        rawPhone.trim(),
      ];
      for (const phoneStr of candidates) {
        try {
          const qPhone = query(usersRef, where('phone', '==', phoneStr));
          const res: any = await Promise.race([
            getDocs(qPhone),
            new Promise<null>((res) => setTimeout(() => res(null), 1500)),
          ]);
          if (res && !res.empty) {
            foundEmail = res.docs[0].data().email || null;
            matchedDocId = res.docs[0].id;
            break;
          }
        } catch {
          // continue
        }
      }
    }

    // C. Identifier query by memberId or name
    if (!foundEmail && rawPhone.trim()) {
      try {
        const cleanIdent = rawPhone.trim();
        const qMember = query(usersRef, where('memberId', '==', cleanIdent.toUpperCase()));
        const res: any = await Promise.race([
          getDocs(qMember),
          new Promise<null>((res) => setTimeout(() => res(null), 1500)),
        ]);
        if (res && !res.empty) {
          foundEmail = res.docs[0].data().email || null;
          matchedDocId = res.docs[0].id;
        }
      } catch {
        // continue
      }
    }

    // D. Comprehensive Firestore collection scan fallback (guarantees finding ANY legacy format)
    if (!foundEmail) {
      try {
        const scanSnap: any = await Promise.race([
          getDocs(usersRef),
          new Promise<null>((res) => setTimeout(() => res(null), 3000)),
        ]);
        if (scanSnap && scanSnap.docs) {
          for (const docSnap of scanSnap.docs) {
            const data = docSnap.data();
            const docPhone = data.phone || data.phoneNormalized || '';
            const docNorm = normalizePhone(docPhone);
            const docLast10 = docNorm.length >= 10 ? docNorm.slice(-10) : docNorm;

            if (
              (last10 && docLast10 && docLast10 === last10) ||
              (normalized && docNorm && docNorm === normalized) ||
              (data.memberId && data.memberId.toUpperCase() === rawPhone.trim().toUpperCase())
            ) {
              if (data.email) {
                foundEmail = data.email;
                matchedDocId = docSnap.id;
                break;
              }
            }
          }
        }
      } catch (scanErr) {
        console.warn('[Firebase] Scan fallback notice:', scanErr);
      }
    }

    if (foundEmail) {
      // Cache locally for instantaneous subsequent logins
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          if (normalized) localStorage.setItem(`nvt_phone_email_${normalized}`, foundEmail);
          if (last10) {
            localStorage.setItem(`nvt_phone_email_${last10}`, foundEmail);
            localStorage.setItem(`nvt_phone_email_0${last10}`, foundEmail);
            localStorage.setItem(`nvt_phone_email_880${last10}`, foundEmail);
            localStorage.setItem(`nvt_phone_email_8800${last10}`, foundEmail);
          }
        } catch {}
      }

      // Self-heal Firestore doc with phoneNormalized & phoneLast10 asynchronously
      if (matchedDocId && (normalized || last10)) {
        const patch: Record<string, any> = {};
        if (normalized) patch.phoneNormalized = normalized;
        if (last10) patch.phoneLast10 = last10;
        if (Object.keys(patch).length > 0) {
          const safeMatchedId = cleanDocId(matchedDocId);
          const uRef = safeDoc('users', safeMatchedId);
          if (uRef) safeSetDoc(uRef, patch, { merge: true }).catch(() => {});
        }
      }

      return foundEmail;
    }

    return null;
  } catch (err) {
    console.warn('[Firebase] Query phone notice:', err);
    return null;
  }
};

/**
 * Find phone associated with an email address in Firestore or local cache
 */
export const findPhoneByEmail = async (rawEmail: string): Promise<string | null> => {
  const cleanEmail = rawEmail.trim().toLowerCase();
  if (!cleanEmail) return null;

  // 1. Check local storage accounts
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const rawAccounts = localStorage.getItem('novaterra_referral_accounts_v3');
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        for (const acc of Object.values(accounts) as any[]) {
          if (acc.email && acc.email.toLowerCase() === cleanEmail) {
            if (acc.phone) return acc.phone;
          }
        }
      }
    }
  } catch {}

  // 2. Query Firestore users by email
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', rawEmail.trim()));
    const snap: any = await Promise.race([
      getDocs(q),
      new Promise<null>((res) => setTimeout(() => res(null), 2500)),
    ]);
    if (snap && !snap.empty) {
      return snap.docs[0].data().phone || null;
    }

    // 3. Scan fallback in case of case-difference
    const scanSnap: any = await Promise.race([
      getDocs(usersRef),
      new Promise<null>((res) => setTimeout(() => res(null), 2500)),
    ]);
    if (scanSnap && scanSnap.docs) {
      for (const d of scanSnap.docs) {
        const data = d.data();
        if (data.email && data.email.toLowerCase() === cleanEmail) {
          return data.phone || null;
        }
      }
    }
  } catch (err) {
    console.warn('[Firebase] findPhoneByEmail notice:', err);
  }
  return null;
};

/**
 * Update wallet balance in Firestore and maintain consistency
 */
export const updateFirestoreWalletBalance = async (uid: string, newBalance: number): Promise<void> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return;
  const userDocRef = safeDoc('users', cleanUid);
  if (!userDocRef) return;
  const safeBalance = typeof newBalance === 'number' && !Number.isNaN(newBalance) ? newBalance : 0.0;
  try {
    await safeSetDoc(
      userDocRef,
      {
        walletBalance: safeBalance,
        balance: safeBalance,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Firebase] Warning updating wallet balance:', error);
  }
};

/**
 * Update full user profile in Firestore
 */
export const updateFirestoreUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return;
  const userDocRef = safeDoc('users', cleanUid);
  if (!userDocRef) return;
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.phone) {
      payload.phoneNormalized = normalizePhone(updates.phone);
    }
    await safeSetDoc(userDocRef, payload, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Warning updating user profile:', error);
  }
};

/**
 * Subscribe to real-time changes in a user document
 */
export const subscribeToFirestoreUserProfile = (
  uid: string,
  onUpdate: (user: UserProfile) => void,
  onError?: (err: Error) => void
): (() => void) => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return () => {};
  const userDocRef = safeDoc('users', cleanUid);
  if (!userDocRef) return () => {};
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const profile: UserProfile = {
          uid: cleanUid,
          name: data.name || 'NVT Member',
          phone: data.phone || '',
          email: data.email || '',
          memberId: data.memberId || `NVT${Math.floor(100000 + Math.random() * 900000)}`,
          referralCode: data.referralCode || data.memberId?.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'NV8829',
          referredBy: data.referredBy || undefined,
          walletBalance:
            typeof data.walletBalance === 'number' && !Number.isNaN(data.walletBalance) && data.walletBalance !== 12450.0
              ? data.walletBalance
              : 0.0,
          memberSince: data.memberSince || 'May 2024',
          isVerified: data.isVerified ?? true,
          avatarUrl: data.avatarUrl,
          fullName: data.fullName,
          transactions: data.transactions || [],
        };
        onUpdate(profile);
      }
    },
    (err) => {
      console.warn('[Firebase] Firestore onSnapshot warning:', err);
      if (onError) onError(err);
    }
  );
};

export interface DepositRecord {
  id: string;
  userId: string;
  amount: number;
  method: string;
  channel: string;
  trxId: string;
  senderPhone?: string;
  orderNo?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt?: any;
  dateFormatted?: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'recharge' | 'withdraw' | 'yield' | 'bonus';
  title: string;
  desc: string;
  amount: string;
  rawAmount: number;
  time: string;
  date: string;
  status: string;
  channel: string;
  isCredit: boolean;
  hash?: string;
  createdAt?: any;
}

/**
 * Record a successful deposit in Firestore:
 * 1. Atomically increments user walletBalance in users/{uid}
 * 2. Writes to top-level and subcollection deposits
 * 3. Writes to top-level and subcollection transactions
 * 4. Appends to user document transactions array
 */
export const recordFirestoreDeposit = async (
  uid: string,
  data: {
    amount: number;
    method: string;
    channel?: string;
    trxId?: string;
    senderPhone?: string;
    orderNo?: string;
    status?: 'completed' | 'pending' | 'failed' | 'cancelled';
  }
): Promise<{ deposit: DepositRecord; transaction: TransactionRecord }> => {
  const depositId = cleanDocId(data.orderNo || `DEP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`);
  const trxId = cleanDocId((data.trxId && data.trxId.trim()) || `TXN-${Date.now().toString().slice(-6)}`);
  const now = new Date();

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const isPending = data.status === 'pending';
  const isFailed = data.status === 'failed' || data.status === 'cancelled';
  const finalStatus: 'completed' | 'pending' | 'failed' = isPending ? 'pending' : isFailed ? 'failed' : 'completed';
  const banglaStatus = isPending ? 'অপেক্ষমাণ' : isFailed ? 'বাতিল' : 'সফল';

  const depositItem: DepositRecord = {
    id: depositId,
    userId: uid,
    amount: data.amount,
    method: data.method || 'bKash',
    channel: data.channel || 'Instant Auto',
    trxId: trxId,
    senderPhone: data.senderPhone || '',
    orderNo: data.orderNo || depositId,
    status: finalStatus,
    createdAt: now.toISOString(),
    dateFormatted: `${dateStr} ${timeStr}`,
  };

  const transactionItem: TransactionRecord = {
    id: trxId,
    userId: uid,
    type: 'recharge',
    title: `ওয়ালেট রিচার্জ (${data.method || 'bKash'})`,
    desc: isPending
      ? `ডিপোজিট TrxID: ${trxId} (অপেক্ষমাণ)`
      : isFailed
      ? `ডিপোজিট TrxID: ${trxId} (বাতিল)`
      : `ডিপোজিট TrxID: ${trxId}`,
    amount: `+৳${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    rawAmount: data.amount,
    time: `আজ, ${timeStr}`,
    date: dateStr,
    status: banglaStatus,
    channel: `${data.method || 'bKash'} (${data.channel || 'Merchant Gateway'})`,
    isCredit: !isFailed && !isPending,
    hash: trxId,
    createdAt: now.toISOString(),
  };

  try {
    const cleanUid = cleanDocId(uid, '');
    if (!cleanUid) {
      return { deposit: depositItem, transaction: transactionItem };
    }
    const userDocRef = safeDoc('users', cleanUid);

    const safeDepositItem = sanitizeFirestoreData(depositItem);
    const safeTransactionItem = sanitizeFirestoreData(transactionItem);

    // 1. If completed: atomically increment wallet balance and push transaction
    // If pending or failed: do NOT increment wallet balance, only push transaction
    const updatePayload: any = {
      transactions: arrayUnion(safeTransactionItem),
      updatedAt: serverTimestamp(),
      ...(finalStatus === 'completed'
        ? {
            walletBalance: increment(Number(data.amount) || 0),
            balance: increment(Number(data.amount) || 0),
          }
        : {}),
    };

    if (userDocRef) {
      await safeSetDoc(userDocRef, updatePayload, { merge: true });
    }

    // 2. Save in deposits collection & subcollection
    try {
      const depPayload = {
        ...safeDepositItem,
        serverCreatedAt: serverTimestamp(),
      };
      const uDepRef = safeDoc('users', cleanUid, 'deposits', depositId);
      if (uDepRef) await safeSetDoc(uDepRef, depPayload, { merge: true });
      const tDepRef = safeDoc('deposits', depositId);
      if (tDepRef) await safeSetDoc(tDepRef, depPayload, { merge: true });
    } catch (depErr) {
      console.warn('[Firebase] Non-blocking notice saving deposits collection:', depErr);
    }

    // 3. Save in transactions collection & subcollection
    try {
      const trxPayload = {
        ...safeTransactionItem,
        serverCreatedAt: serverTimestamp(),
      };
      const uTrxRef = safeDoc('users', cleanUid, 'transactions', trxId);
      if (uTrxRef) await safeSetDoc(uTrxRef, trxPayload, { merge: true });
      const tTrxRef = safeDoc('transactions', trxId);
      if (tTrxRef) await safeSetDoc(tTrxRef, trxPayload, { merge: true });
    } catch (trxErr) {
      console.warn('[Firebase] Non-blocking notice saving transactions collection:', trxErr);
    }

    console.log(`[Firebase] Successfully recorded deposit [Status: ${finalStatus}]:`, depositItem);
    return { deposit: depositItem, transaction: transactionItem };
  } catch (error) {
    console.warn('[Firebase] Warning in recordFirestoreDeposit:', error);
    return { deposit: depositItem, transaction: transactionItem };
  }
};

/**
 * Update the status of a pending deposit in Firestore:
 * When approved/completed: atomically increments wallet balance & updates transaction status to 'সফল'
 * When cancelled/failed: updates status to 'বাতিল' without crediting balance
 */
export const updateFirestoreDepositStatus = async (
  uid: string,
  trxIdOrOrderNo: string,
  newStatus: 'completed' | 'cancelled' | 'failed',
  amount?: number
): Promise<boolean> => {
  try {
    const cleanUid = cleanDocId(uid, '');
    const cleanId = cleanDocId(trxIdOrOrderNo, '');
    if (!cleanUid || !cleanId) return false;

    const isCompleted = newStatus === 'completed';
    const statusBangla = isCompleted ? 'সফল' : 'বাতিল';
    const depositStatus = isCompleted ? 'completed' : 'failed';

    const userDocRef = safeDoc('users', cleanUid);
    if (!userDocRef) return false;
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const txns: TransactionRecord[] = userData.transactions || [];
      let foundAmount = amount || 0;

      const updatedTxns = txns.map((t: any) => {
        if (t.id === cleanId || t.hash === cleanId || t.orderNo === cleanId) {
          if (!foundAmount && t.rawAmount) foundAmount = Number(t.rawAmount);
          return {
            ...t,
            status: statusBangla,
            isCredit: isCompleted,
            desc: isCompleted
              ? `ডিপোজিট TrxID: ${cleanId} (সফল)`
              : `ডিপোজিট TrxID: ${cleanId} (বাতিল)`,
          };
        }
        return t;
      });

      const updatePayload: any = {
        transactions: updatedTxns,
        updatedAt: serverTimestamp(),
        ...(isCompleted && foundAmount > 0
          ? {
              walletBalance: increment(foundAmount),
              balance: increment(foundAmount),
            }
          : {}),
      };

      await safeSetDoc(userDocRef, updatePayload, { merge: true });
    }

    // Update in deposits collections
    try {
      const uDep = safeDoc('users', cleanUid, 'deposits', cleanId);
      if (uDep) {
        await safeSetDoc(
          uDep,
          {
            status: depositStatus,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (_) {}
    try {
      const tDep = safeDoc('deposits', cleanId);
      if (tDep) {
        await safeSetDoc(
          tDep,
          {
            status: isCompleted ? 'Approved' : 'Rejected',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (_) {}

    // Update in transactions collections
    try {
      const uTrx = safeDoc('users', cleanUid, 'transactions', cleanId);
      if (uTrx) {
        await safeSetDoc(
          uTrx,
          {
            status: statusBangla,
            isCredit: isCompleted,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (_) {}
    try {
      const tTrx = safeDoc('transactions', cleanId);
      if (tTrx) {
        await safeSetDoc(
          tTrx,
          {
            status: statusBangla,
            isCredit: isCompleted,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (_) {}

    console.log(`[Firebase] Successfully updated deposit status [${cleanId} -> ${newStatus}]`);
    return true;
  } catch (err) {
    console.error('[Firebase] updateFirestoreDepositStatus error:', err);
    return false;
  }
};

/**
 * Security: Client-side TrxIDs must NEVER be trusted as auto-approved.
 * Only verified server webhooks or admin approvals can confirm a transaction.
 */
export const isValidRealTrxId = (_trxId: string): boolean => {
  return false;
};

/**
 * Fetch all user transactions from Firestore
 */
export const getFirestoreUserTransactions = async (uid: string): Promise<TransactionRecord[]> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return [];
  try {
    // Try user subcollection first
    const subColRef = collection(db, 'users', cleanUid, 'transactions');
    const snap = await getDocs(subColRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as TransactionRecord);
    }

    // Fallback to querying top-level transactions collection
    const txRef = collection(db, 'transactions');
    const q = query(txRef, where('userId', '==', cleanUid));
    const topSnap = await getDocs(q);
    if (!topSnap.empty) {
      return topSnap.docs.map((d) => d.data() as TransactionRecord);
    }

    // Fallback to transactions in user document
    const userDocRef = safeDoc('users', cleanUid);
    if (userDocRef) {
      const uSnap = await getDoc(userDocRef);
      if (uSnap.exists()) {
        return uSnap.data().transactions || [];
      }
    }

    return [];
  } catch (err) {
    console.warn('[Firebase] getFirestoreUserTransactions error:', err);
    return [];
  }
};

/**
 * Real-time listener for user transactions
 */
export const subscribeToUserTransactions = (
  uid: string,
  onUpdate: (transactions: TransactionRecord[]) => void
): (() => void) => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return () => {};
  const subColRef = collection(db, 'users', cleanUid, 'transactions');
  return onSnapshot(
    subColRef,
    (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as TransactionRecord);
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('[Firebase] Transactions listener notice:', err);
    }
  );
};

/**
 * -------------------------------------------------------------
 * 1. CLOUD INVESTMENT SYNC
 * -------------------------------------------------------------
 */
export interface InvestmentRecord {
  id: string;
  userId?: string;
  name: string;
  amount: number;
  dailyYield: number;
  vipLevel: number;
  date: string;
  totalEarned?: number;
  createdAt?: string;
}

export const recordInvestmentInFirestore = async (
  uid: string,
  investment: InvestmentRecord,
  updatedBalance: number,
  newVipLevel: number,
  totalDaily: number,
  allInvestments: InvestmentRecord[]
): Promise<void> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return;

  try {
    const userDocRef = safeDoc('users', cleanUid);
    const invId = cleanDocId(investment.id || `INV-${Date.now()}`);

    const invPayload = {
      ...investment,
      id: invId,
      userId: cleanUid,
      serverCreatedAt: serverTimestamp(),
    };

    // 1. Save in user's subcollection
    const uInvRef = safeDoc('users', cleanUid, 'investments', invId);
    if (uInvRef) await safeSetDoc(uInvRef, invPayload, { merge: true });

    // 2. Save in top-level investments collection for admin auditing
    const tInvRef = safeDoc('investments', invId);
    if (tInvRef) await safeSetDoc(tInvRef, invPayload, { merge: true });

    // 3. Atomically update user document profile & balance
    if (userDocRef) {
      await safeSetDoc(
        userDocRef,
        {
          walletBalance: Number(updatedBalance) || 0,
          vipLevel: Number(newVipLevel) || 0,
          dailyRewards: Number(totalDaily) || 0,
          activeUnits: allInvestments?.length || 0,
          activeInvestments: allInvestments || [],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log('[Firebase] Investment persisted to Firestore successfully:', invId);
  } catch (err) {
    console.warn('[Firebase] Non-blocking notice saving investment to Firestore:', err);
  }
};

export const getFirestoreUserInvestments = async (uid: string): Promise<InvestmentRecord[]> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return [];
  try {
    const subCol = collection(db, 'users', cleanUid, 'investments');
    const snap = await getDocs(subCol);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as InvestmentRecord);
    }
    const uDoc = safeDoc('users', cleanUid);
    if (uDoc) {
      const userDoc = await getDoc(uDoc);
      if (userDoc.exists() && Array.isArray(userDoc.data().activeInvestments)) {
        return userDoc.data().activeInvestments;
      }
    }
    return [];
  } catch (err) {
    console.warn('[Firebase] Notice fetching investments from Firestore:', err);
    return [];
  }
};

/**
 * -------------------------------------------------------------
 * 2. CLOUD REFERRAL NODES & MULTI-TIER TREE SYNC
 * -------------------------------------------------------------
 */
export interface ReferralNodeRecord {
  userId: string;
  userCode: string;
  memberId?: string;
  referredByCode: string;
  phone: string;
  username: string;
  joinedAt: string;
  investAmount: number;
}

export const extractReferralNodeFromUserDoc = (data: any, id: string): ReferralNodeRecord | null => {
  if (!data) return null;
  const rawCode = data.referralCode || data.memberId || id || '';
  const code = rawCode.toString().trim().toUpperCase();
  if (!code) return null;

  const rawMemberId = (data.memberId || '').toString().trim().toUpperCase();
  const rawReferredBy = (data.referredBy || data.referredByCode || '').toString().trim().toUpperCase();
  const phone = (data.phone || '').toString().trim();
  const name = (data.name || data.username || 'User').toString().trim();

  let joinedAt = new Date().toISOString();
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') {
      joinedAt = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      joinedAt = data.createdAt;
    }
  } else if (data.joinedAt) {
    joinedAt = typeof data.joinedAt === 'string' ? data.joinedAt : new Date().toISOString();
  }

  const investAmount = Number(data.totalInvested || data.investAmount || data.walletBalance || 0);

  return {
    userId: id || data.uid || '',
    userCode: code,
    memberId: rawMemberId || undefined,
    referredByCode: rawReferredBy,
    phone,
    username: name,
    joinedAt,
    investAmount: isNaN(investAmount) ? 0 : investAmount,
  };
};

export const saveReferralNodeToFirestore = async (node: ReferralNodeRecord): Promise<void> => {
  try {
    const rawCode = (node.userCode || '').trim().toUpperCase();
    const cleanCode = cleanDocId(rawCode, '');
    if (!cleanCode) return;

    const cleanMemberId = node.memberId ? cleanDocId(node.memberId.trim().toUpperCase(), '') : '';

    const payload = {
      ...node,
      userCode: cleanCode,
      referredByCode: (node.referredByCode || '').trim().toUpperCase(),
      memberId: cleanMemberId || undefined,
      updatedAt: serverTimestamp(),
    };

    // Write to primary code doc
    const ref1 = safeDoc('referral_nodes', cleanCode);
    if (ref1) {
      await safeSetDoc(ref1, payload, { merge: true });
    }

    // Also alias by memberId if different from referral code
    if (cleanMemberId && cleanMemberId !== cleanCode) {
      const ref2 = safeDoc('referral_nodes', cleanMemberId);
      if (ref2) {
        await safeSetDoc(ref2, payload, { merge: true });
      }
    }

    console.log('[Firebase] Referral node synced to Firestore:', cleanCode);
  } catch (err) {
    console.warn('[Firebase] Notice saving referral node to Firestore:', err);
  }
};

export const syncReferralAccountsFromFirestore = async (): Promise<Record<string, ReferralNodeRecord>> => {
  try {
    const result: Record<string, ReferralNodeRecord> = {};

    // Seed with existing local data first
    try {
      const existingRaw = localStorage.getItem('novavest_registered_accounts');
      if (existingRaw) {
        Object.assign(result, JSON.parse(existingRaw));
      }
    } catch {}

    // 1. Fetch from 'users' collection (authoritative source)
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((d) => {
        const node = extractReferralNodeFromUserDoc(d.data(), d.id);
        if (node && node.userCode) {
          result[node.userCode] = {
            ...(result[node.userCode] || {}),
            ...node,
          };
          if (node.memberId && node.memberId !== node.userCode) {
            result[node.memberId] = result[node.userCode];
          }
        }
      });
    } catch (usersErr) {
      console.warn('[Firebase] Notice querying users collection for referrals:', usersErr);
    }

    // 2. Fetch from 'referral_nodes' collection
    try {
      const nodesCol = collection(db, 'referral_nodes');
      const snap = await getDocs(nodesCol);
      snap.forEach((d) => {
        const data = d.data() as ReferralNodeRecord;
        if (data.userCode) {
          const key = data.userCode.toUpperCase();
          result[key] = {
            ...(result[key] || {}),
            ...data,
            userCode: key,
            referredByCode: (data.referredByCode || result[key]?.referredByCode || '').toUpperCase(),
          };
          if (data.memberId) {
            result[data.memberId.toUpperCase()] = result[key];
          }
        }
      });
    } catch (nodesErr) {
      console.warn('[Firebase] Notice querying referral_nodes for referrals:', nodesErr);
    }

    if (Object.keys(result).length > 0) {
      // Merge with localStorage
      const existingRaw = localStorage.getItem('novavest_registered_accounts');
      const existing = existingRaw ? JSON.parse(existingRaw) : {};
      const merged = { ...existing, ...result };
      localStorage.setItem('novavest_registered_accounts', JSON.stringify(merged));
    }

    return result;
  } catch (err) {
    console.warn('[Firebase] Notice syncing referral nodes from Firestore:', err);
    return {};
  }
};

/**
 * Real-time listener for referral network changes.
 * Listens to Firestore 'users' and 'referral_nodes' to deliver instant updates with zero delay.
 */
export const subscribeToReferralNetwork = (
  callback: (accounts: Record<string, ReferralNodeRecord>) => void
): (() => void) => {
  let isMounted = true;
  const mergedAccounts: Record<string, ReferralNodeRecord> = {};

  // Seed from localStorage first for zero-delay UI rendering
  try {
    const raw = localStorage.getItem('novavest_registered_accounts');
    if (raw) {
      Object.assign(mergedAccounts, JSON.parse(raw));
      callback({ ...mergedAccounts });
    }
  } catch {}

  const updateStore = () => {
    if (!isMounted) return;
    try {
      // Ensure local non-synced items are preserved
      const rawLocal = localStorage.getItem('novavest_registered_accounts');
      const local = rawLocal ? JSON.parse(rawLocal) : {};
      const fullyMerged = { ...local, ...mergedAccounts };
      localStorage.setItem('novavest_registered_accounts', JSON.stringify(fullyMerged));
      callback(fullyMerged);
    } catch {
      callback({ ...mergedAccounts });
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('referral_rewards_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  };

  // 1. Real-time listener on 'users' collection
  const unsubUsers = onSnapshot(
    collection(db, 'users'),
    (snap) => {
      snap.forEach((d) => {
        const node = extractReferralNodeFromUserDoc(d.data(), d.id);
        if (node && node.userCode) {
          mergedAccounts[node.userCode] = {
            ...(mergedAccounts[node.userCode] || {}),
            ...node,
          };
          if (node.memberId && node.memberId !== node.userCode) {
            mergedAccounts[node.memberId] = mergedAccounts[node.userCode];
          }
        }
      });
      updateStore();
    },
    (err) => {
      console.warn('[Firebase] Real-time referral users listener notice:', err);
    }
  );

  // 2. Real-time listener on 'referral_nodes' collection
  const unsubNodes = onSnapshot(
    collection(db, 'referral_nodes'),
    (snap) => {
      snap.forEach((d) => {
        const data = d.data() as ReferralNodeRecord;
        if (data.userCode) {
          const key = data.userCode.toUpperCase();
          mergedAccounts[key] = {
            ...(mergedAccounts[key] || {}),
            ...data,
            userCode: key,
            referredByCode: (data.referredByCode || mergedAccounts[key]?.referredByCode || '').toUpperCase(),
          };
          if (data.memberId) {
            mergedAccounts[data.memberId.toUpperCase()] = mergedAccounts[key];
          }
        }
      });
      updateStore();
    },
    (err) => {
      console.warn('[Firebase] Real-time referral nodes listener notice:', err);
    }
  );

  return () => {
    isMounted = false;
    try {
      unsubUsers();
    } catch {}
    try {
      unsubNodes();
    } catch {}
  };
};

/**
 * Credit commission directly into user's wallet in Firestore
 */
export const creditUserCommissionInFirestore = async (
  userIdOrCode: string,
  commissionAmount: number
): Promise<void> => {
  const cleanId = cleanDocId(userIdOrCode, '');
  const amt = Number(commissionAmount);
  if (!cleanId || !amt || amt <= 0) return;
  try {
    const userRef = safeDoc('users', cleanId);
    if (userRef) {
      await safeSetDoc(
        userRef,
        {
          walletBalance: increment(amt),
          totalReferralEarnings: increment(amt),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Query by referralCode if doc doesn't exist by ID
    const q = query(collection(db, 'users'), where('referralCode', '==', cleanId));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      await safeSetDoc(
        qSnap.docs[0].ref,
        {
          walletBalance: increment(amt),
          totalReferralEarnings: increment(amt),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      const q2 = query(collection(db, 'users'), where('memberId', '==', cleanId));
      const q2Snap = await getDocs(q2);
      if (!q2Snap.empty) {
        await safeSetDoc(
          q2Snap.docs[0].ref,
          {
            walletBalance: increment(amt),
            totalReferralEarnings: increment(amt),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  } catch (err) {
    console.warn('[Firebase] Notice crediting commission to user in Firestore:', err);
  }
};

/**
 * -------------------------------------------------------------
 * 3. CLOUD VIP1-VIP8 PROMO BONUS CLAIMS SYNC
 * -------------------------------------------------------------
 */
export const recordPromoClaimInFirestore = async (
  uidOrCode: string,
  tierId: string,
  level: string,
  amount: number
): Promise<void> => {
  const cleanIdOrCode = cleanDocId(uidOrCode, '');
  const cleanTierId = cleanDocId(tierId, '').toLowerCase();
  if (!cleanIdOrCode || !cleanTierId) return;

  try {
    const claimId = cleanDocId(`${cleanIdOrCode}_${cleanTierId}`);
    const nowIso = new Date().toISOString();

    const payload = {
      id: claimId,
      userId: cleanIdOrCode,
      tierId: cleanTierId,
      level: level || '',
      amount: Number(amount) || 0,
      claimedAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    };

    // 1. Top-level promo claims
    const ref1 = safeDoc('promo_claims', claimId);
    if (ref1) await safeSetDoc(ref1, payload, { merge: true });

    // 2. User subcollection
    const ref2 = safeDoc('users', cleanIdOrCode, 'promo_claims', cleanTierId);
    if (ref2) await safeSetDoc(ref2, payload, { merge: true });

    console.log('[Firebase] Promo bonus claim persisted to Firestore:', claimId);
  } catch (err) {
    console.warn('[Firebase] Notice recording promo claim to Firestore:', err);
  }
};

export const getFirestorePromoClaims = async (uidOrCode: string): Promise<Record<string, boolean>> => {
  const cleanIdOrCode = cleanDocId(uidOrCode, '');
  if (!cleanIdOrCode) return {};

  try {
    const result: Record<string, boolean> = {};

    // Check user subcollection
    const subCol = collection(db, 'users', cleanIdOrCode, 'promo_claims');
    const snap = await getDocs(subCol);
    snap.forEach((d) => {
      const data = d.data();
      if (data.tierId) result[data.tierId] = true;
      if (data.level) result[data.level.toLowerCase()] = true;
    });

    if (Object.keys(result).length > 0) return result;

    // Fallback: check top-level promo_claims query
    const topCol = collection(db, 'promo_claims');
    const q = query(topCol, where('userId', '==', cleanIdOrCode));
    const topSnap = await getDocs(q);
    topSnap.forEach((d) => {
      const data = d.data();
      if (data.tierId) result[data.tierId] = true;
      if (data.level) result[data.level.toLowerCase()] = true;
    });

    return result;
  } catch (err) {
    console.warn('[Firebase] Notice fetching promo claims from Firestore:', err);
    return {};
  }
};

/**
 * -------------------------------------------------------------
 * 4. CLOUD COMMISSION LOG SYNC
 * -------------------------------------------------------------
 */
export const recordCommissionInFirestore = async (comm: {
  id: string;
  recipientCode: string;
  sourceUserCode: string;
  level: number;
  rate: number;
  depositAmount: number;
  commissionAmount: number;
  timestamp: string;
}): Promise<void> => {
  try {
    const safeId = cleanDocId(comm.id, `COMM-${Date.now()}`);
    const docRef = safeDoc('commissions', safeId);
    if (!docRef) return;
    const payload = {
      ...comm,
      id: safeId,
      recipientCode: cleanDocId(comm.recipientCode, ''),
      sourceUserCode: cleanDocId(comm.sourceUserCode, ''),
      level: Number(comm.level) || 1,
      rate: Number(comm.rate) || 0,
      depositAmount: Number(comm.depositAmount) || 0,
      commissionAmount: Number(comm.commissionAmount) || 0,
      timestamp: comm.timestamp || new Date().toISOString(),
      serverCreatedAt: serverTimestamp(),
    };
    await safeSetDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Notice recording commission in Firestore:', err);
  }
};


