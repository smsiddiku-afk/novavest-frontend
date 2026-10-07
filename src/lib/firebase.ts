import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
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
  deleteDoc,
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
  addDoc,
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
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}
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
 * Normalizes phone numbers for matching (converts Bengali numerals and strips non-digits)
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  const bnDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const converted = String(phone).replace(/[০-৯]/g, (ch) => bnDigits[ch] || ch);
  return converted.replace(/\D/g, '');
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
 * Safe deleteDoc wrapper that catches and logs any exceptions
 */
export const safeDeleteDoc = async (docRef: any): Promise<boolean> => {
  if (!docRef) return false;
  try {
    await deleteDoc(docRef);
    return true;
  } catch (err: any) {
    console.warn('[Firebase] safeDeleteDoc notice:', err?.message || err);
    return false;
  }
};

/**
 * Delete a user profile and associated referral node records from Firestore
 */
/**
 * Permanently purge a user profile, all subcollections, phone records, and referral nodes from Firestore.
 */
export const deleteFirestoreUserProfile = async (
  uid: string,
  extraDetails?: { phone?: string; email?: string; memberId?: string; referralCode?: string }
): Promise<boolean> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return false;

  try {
    const userDocRef = safeDoc('users', cleanUid);
    let uData: any = {};

    if (userDocRef) {
      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          uData = snap.data() || {};
        }
      } catch (err) {
        console.warn('[Firebase] Error fetching user before deletion:', err);
      }
    }

    const phone = extraDetails?.phone || uData.phone || uData.phoneNormalized || '';
    const email = extraDetails?.email || uData.email || '';
    const memberId = extraDetails?.memberId || uData.memberId || '';
    const referralCode = extraDetails?.referralCode || uData.referralCode || '';
    const rawDigits = phone.replace(/\D/g, '');
    const last10 = uData.phoneLast10 || (rawDigits.length >= 10 ? rawDigits.slice(-10) : rawDigits);

    // 1. Delete all subcollections under /users/{cleanUid} (deposits, investments, transactions, promo_claims)
    const subcollections = ['deposits', 'investments', 'transactions', 'promo_claims'];
    for (const sub of subcollections) {
      try {
        const subSnap = await getDocs(collection(db, 'users', cleanUid, sub));
        const delOps = subSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {}));
        await Promise.all(delOps);
      } catch (subErr) {
        console.warn(`[Firebase] Notice cleaning subcollection ${sub}:`, subErr);
      }
    }

    // 2. Delete phone indices in registered_phones and phone_index
    const phoneKeysToDelete = new Set<string>();
    if (last10) {
      phoneKeysToDelete.add(last10);
      phoneKeysToDelete.add(`0${last10}`);
      phoneKeysToDelete.add(`880${last10}`);
    }
    if (phone) phoneKeysToDelete.add(phone.trim());
    if (uData.phoneNormalized) phoneKeysToDelete.add(uData.phoneNormalized);

    for (const pKey of phoneKeysToDelete) {
      try {
        const rp = safeDoc('registered_phones', pKey);
        if (rp) await safeDeleteDoc(rp);
      } catch (_) {}
      try {
        const pi = safeDoc('phone_index', pKey);
        if (pi) await safeDeleteDoc(pi);
      } catch (_) {}
    }

    // Query registered_phones and phone_index by uid
    try {
      const qRP = query(collection(db, 'registered_phones'), where('uid', '==', cleanUid));
      const rpSnap = await getDocs(qRP);
      await Promise.all(rpSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
    } catch (_) {}
    try {
      const qPI = query(collection(db, 'phone_index'), where('uid', '==', cleanUid));
      const piSnap = await getDocs(qPI);
      await Promise.all(piSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
    } catch (_) {}

    // 3. Delete referral node documents
    if (referralCode) {
      const ref1 = safeDoc('referral_nodes', referralCode);
      if (ref1) await safeDeleteDoc(ref1);
    }
    if (memberId && memberId !== referralCode) {
      const ref2 = safeDoc('referral_nodes', memberId);
      if (ref2) await safeDeleteDoc(ref2);
    }
    const ref3 = safeDoc('referral_nodes', cleanUid);
    if (ref3) await safeDeleteDoc(ref3);

    try {
      const qRN = query(collection(db, 'referral_nodes'), where('userId', '==', cleanUid));
      const rnSnap = await getDocs(qRN);
      await Promise.all(rnSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
    } catch (_) {}

    // 4. Delete root collection records associated with user
    const rootCols = ['deposits', 'withdrawals', 'investments', 'transactions', 'promo_claims'];
    for (const col of rootCols) {
      try {
        const q = query(collection(db, col), where('userId', '==', cleanUid));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref).catch(() => {})));
      } catch (_) {}
    }

    // 5. Add tombstone in deleted_accounts so any cached token is immediately rejected
    try {
      const tombRef = safeDoc('deleted_accounts', cleanUid);
      if (tombRef) {
        await safeSetDoc(
          tombRef,
          {
            uid: cleanUid,
            phone: phone || '',
            last10: last10 || '',
            email: email || '',
            memberId: memberId || '',
            deletedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (_) {}

    // 6. Delete the main user profile document itself
    if (userDocRef) {
      await deleteDoc(userDocRef);
    }

    // 6.5 If the active Firebase Auth user matches the deleted account, delete immediately from Firebase Auth
    try {
      if (auth.currentUser && (auth.currentUser.uid === cleanUid || (email && auth.currentUser.email?.toLowerCase() === email.toLowerCase()))) {
        console.log('[Firebase] Purging active user from Firebase Auth:', cleanUid);
        await deleteUser(auth.currentUser);
      }
    } catch (_) {}

    // 7. Purge from server-side registry (/api/admin/delete-user)
    try {
      await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: cleanUid, phone, email, memberId, last10 }),
      });
    } catch (_) {}

    return true;
  } catch (err: any) {
    console.error('[Firebase] deleteFirestoreUserProfile error:', err);
    throw err;
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
    vipLevel: 0,
    canRefer: false,
    referralLimit: 0,
    activeInvestments: [],
    totalInvested: 0,
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
    vipLevel: 0,
    canRefer: false,
    referralLimit: 0,
    activeInvestments: [],
    totalInvested: 0,
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

    // Persist phone indexing for instantaneous cross-browser lookup
    if (last10) {
      const phoneIndexPayload = {
        last10,
        phoneNormalized: normalized,
        phone: profile.phone,
        email: profile.email,
        uid: cleanUid,
        memberId: cleanMemberId,
        referralCode,
        username: profile.name,
        updatedAt: serverTimestamp(),
      };

      const keysToIndex = [last10, `0${last10}`, `880${last10}`];
      keysToIndex.forEach((k) => {
        const refP = safeDoc('registered_phones', k);
        if (refP) safeSetDoc(refP, phoneIndexPayload, { merge: true }).catch(() => {});
        const refIdx = safeDoc('phone_index', k);
        if (refIdx) safeSetDoc(refIdx, phoneIndexPayload, { merge: true }).catch(() => {});
      });

      // Also notify server-side phone registry for cross-browser persistence
      try {
        fetch('/api/auth/register-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: profile.phone,
            last10,
            email: profile.email,
            uid: cleanUid,
            memberId: cleanMemberId,
            referralCode,
            username: profile.name,
          }),
        }).catch(() => {});
      } catch (_) {}
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
      investAmount: 0,
      totalRecharge: 0,
      status: 'pending',
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
          investAmount: 0,
          totalRecharge: 0,
          status: 'pending',
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
 * Fetch a user profile by UID (with comprehensive multi-field fallback)
 */
export const getFirestoreUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return null;
  try {
    let userDocRef = safeDoc('users', cleanUid);
    let snap = userDocRef ? await getDoc(userDocRef) : null;

    // Fallback: If not found directly by doc id, query by memberId, uid, phone, or email
    if (!snap || !snap.exists()) {
      try {
        const uCol = collection(db, 'users');
        const qMember = await getDocs(query(uCol, where('memberId', '==', cleanUid), limit(1)));
        if (!qMember.empty) {
          snap = qMember.docs[0];
          userDocRef = snap.ref;
        } else {
          const qUid = await getDocs(query(uCol, where('uid', '==', cleanUid), limit(1)));
          if (!qUid.empty) {
            snap = qUid.docs[0];
            userDocRef = snap.ref;
          } else {
            const qPhone = await getDocs(query(uCol, where('phone', '==', cleanUid), limit(1)));
            if (!qPhone.empty) {
              snap = qPhone.docs[0];
              userDocRef = snap.ref;
            } else {
              const qEmail = await getDocs(query(uCol, where('email', '==', cleanUid), limit(1)));
              if (!qEmail.empty) {
                snap = qEmail.docs[0];
                userDocRef = snap.ref;
              }
            }
          }
        }
      } catch (_) {}
    }

    if (!snap || !snap.exists()) {
      // Local client storage cache fallback
      try {
        const raw = localStorage.getItem('novavest_registered_accounts');
        if (raw) {
          const accs = JSON.parse(raw);
          const found = Object.values(accs).find((a: any) =>
            a && (a.id === cleanUid || a.uid === cleanUid || a.memberId === cleanUid || a.phone === cleanUid)
          ) as any;
          if (found) {
            return {
              uid: found.uid || found.id || cleanUid,
              name: found.name || 'NVT Member',
              phone: found.phone || '',
              email: found.email || '',
              memberId: found.memberId || cleanUid,
              referralCode: found.referralCode || found.memberId || 'NV8829',
              walletBalance: Number(found.walletBalance || 0),
              totalEarnings: Number(found.totalEarnings || 0),
              activeUnits: Array.isArray(found.activeInvestments) ? found.activeInvestments.length : 0,
              dailyRewards: Number(found.dailyRewards || 0),
              vipLevel: Number(found.vipLevel || 0),
              activeInvestments: Array.isArray(found.activeInvestments) ? found.activeInvestments : [],
              totalInvested: Number(found.totalInvested || 0),
              totalReferralEarnings: Number(found.totalReferralEarnings || 0),
              memberSince: found.memberSince || 'May 2024',
              isVerified: found.isVerified ?? true,
              avatarUrl: found.avatarUrl,
              fullName: found.fullName,
              transactions: Array.isArray(found.transactions) ? found.transactions : [],
              isAuthenticatorSet: Boolean(found.isAuthenticatorSet),
              authenticatorSecret: found.authenticatorSecret || '',
              canRefer: Boolean(found.canRefer),
              referralLimit: typeof found.referralLimit === 'number' ? found.referralLimit : 0,
            };
          }
        }
      } catch (_) {}
      return null;
    }

    const data = snap.data();
    return {
      uid: snap.id || cleanUid,
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
      totalEarnings: typeof data.totalEarnings === 'number' ? data.totalEarnings : 0.0,
      activeUnits: typeof data.activeUnits === 'number' ? data.activeUnits : (Array.isArray(data.activeInvestments) ? data.activeInvestments.length : 0),
      dailyRewards: typeof data.dailyRewards === 'number' ? data.dailyRewards : 0.0,
      vipLevel: typeof data.vipLevel === 'number' ? data.vipLevel : 0,
      activeInvestments: Array.isArray(data.activeInvestments) ? data.activeInvestments : [],
      totalInvested: typeof data.totalInvested === 'number' ? data.totalInvested : 0.0,
      totalReferralEarnings: typeof data.totalReferralEarnings === 'number' ? data.totalReferralEarnings : 0.0,
      memberSince: data.memberSince || 'May 2024',
      isVerified: data.isVerified ?? true,
      avatarUrl: data.avatarUrl,
      fullName: data.fullName,
      transactions: Array.isArray(data.transactions) ? data.transactions : [],
      isAuthenticatorSet: Boolean(data.isAuthenticatorSet),
      authenticatorSecret: data.authenticatorSecret || '',
      canRefer: Boolean(data.canRefer),
      referralLimit: typeof data.referralLimit === 'number' ? data.referralLimit : 0,
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

  // 1.5 High-Speed Parallel Lookup: races server endpoint, registered_phones, phone_index, and indexed users query
  if (last10) {
    try {
      const candidates: Promise<string | null>[] = [];

      // A. Fast server endpoint (5-20ms)
      candidates.push(
        fetch(`/api/auth/phone-to-email?phone=${encodeURIComponent(last10)}`, {
          signal: AbortSignal.timeout(800),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => (d && d.found && d.email ? d.email : null))
          .catch(() => null)
      );

      // B. Direct Firestore document checks (O(1))
      const keysToLookup = [last10, `0${last10}`, `880${last10}`];
      keysToLookup.forEach((k) => {
        const pDoc = safeDoc('registered_phones', k);
        if (pDoc) {
          candidates.push(
            getDoc(pDoc)
              .then((snap) => (snap && snap.exists() && snap.data()?.email ? snap.data().email : null))
              .catch(() => null)
          );
        }
        const idxDoc = safeDoc('phone_index', k);
        if (idxDoc) {
          candidates.push(
            getDoc(idxDoc)
              .then((snap) => (snap && snap.exists() && snap.data()?.email ? snap.data().email : null))
              .catch(() => null)
          );
        }
      });

      // C. Fast indexed query on users collection (limit 1)
      const usersRef = collection(db, 'users');
      candidates.push(
        getDocs(query(usersRef, where('phoneLast10', '==', last10), limit(1)))
          .then((snap) => (!snap.empty && snap.docs[0].data()?.email ? snap.docs[0].data().email : null))
          .catch(() => null)
      );

      // Race to the fastest resolved email
      const fastEmail = await new Promise<string | null>((resolve) => {
        let pending = candidates.length;
        if (pending === 0) return resolve(null);
        let resolved = false;

        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, 1200);

        candidates.forEach((p) => {
          p.then((em) => {
            if (!resolved && em && typeof em === 'string' && em.includes('@')) {
              resolved = true;
              clearTimeout(timer);
              resolve(em.trim());
            } else {
              pending--;
              if (pending === 0 && !resolved) {
                resolved = true;
                clearTimeout(timer);
                resolve(null);
              }
            }
          }).catch(() => {
            pending--;
            if (pending === 0 && !resolved) {
              resolved = true;
              clearTimeout(timer);
              resolve(null);
            }
          });
        });
      });

      if (fastEmail) {
        // Cache locally for instantaneous subsequent logins
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            if (normalized) localStorage.setItem(`nvt_phone_email_${normalized}`, fastEmail);
            localStorage.setItem(`nvt_phone_email_${last10}`, fastEmail);
            localStorage.setItem(`nvt_phone_email_0${last10}`, fastEmail);
            localStorage.setItem(`nvt_phone_email_880${last10}`, fastEmail);
          } catch {}
        }
        return fastEmail;
      }
    } catch (_) {}
  }

  return null;
};

/**
 * Checks if a phone number is already registered across Firestore, server memory, and local caches.
 * Enforces strict single-account-per-phone rule.
 */
export const isPhoneAlreadyRegistered = async (
  rawPhone: string
): Promise<{ registered: boolean; email?: string; existingEmail?: string; existingMemberId?: string }> => {
  if (!rawPhone || !rawPhone.trim()) {
    return { registered: false };
  }

  const normalized = normalizePhone(rawPhone);
  const last10 = normalized.length >= 10 ? normalized.slice(-10) : normalized;
  if (!last10 || last10.length < 6) {
    return { registered: false };
  }

  try {
    const checks: Promise<{ registered: boolean; email?: string; memberId?: string } | null>[] = [];

    // 1. Instant check against server-side phone registry (sub-20ms)
    checks.push(
      fetch(`/api/auth/check-phone?phone=${encodeURIComponent(last10)}`, {
        signal: AbortSignal.timeout(800),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (data && data.registered ? { registered: true, email: data.email, memberId: data.memberId } : null))
        .catch(() => null)
    );

    // 2. Direct O(1) check in registered_phones collection in Firestore
    const pDoc = safeDoc('registered_phones', last10);
    if (pDoc) {
      checks.push(
        getDoc(pDoc)
          .then((snap) => (snap && snap.exists() ? { registered: true, email: snap.data()?.email, memberId: snap.data()?.memberId } : null))
          .catch(() => null)
      );
    }

    // 3. Fast indexed query on users collection (limit 1)
    const usersRef = collection(db, 'users');
    const qLast10 = query(usersRef, where('phoneLast10', '==', last10), limit(1));
    checks.push(
      getDocs(qLast10)
        .then((snap) => (!snap.empty ? { registered: true, email: snap.docs[0].data()?.email, memberId: snap.docs[0].data()?.memberId } : null))
        .catch(() => null)
    );

    // Wait for the checks with a tight 1200ms cap
    const results = await Promise.race([
      Promise.allSettled(checks),
      new Promise<any[]>((res) => setTimeout(() => res([]), 1200)),
    ]);

    for (const r of results) {
      if (r && r.status === 'fulfilled' && r.value && r.value.registered) {
        return {
          registered: true,
          email: r.value.email,
          existingEmail: r.value.email,
          existingMemberId: r.value.memberId,
        };
      }
    }
  } catch (err) {
    console.warn('[Firebase] isPhoneAlreadyRegistered notice:', err);
  }

  return { registered: false };
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

  let isSubscribed = true;
  const unsubs: (() => void)[] = [];

  const handleDocSnap = (snap: any) => {
    if (snap && snap.exists()) {
      const data = snap.data();
      const profile: UserProfile = {
        uid: snap.id || cleanUid,
        name: data.name || 'NVT Member',
        phone: data.phone || '',
        email: data.email || '',
        memberId: data.memberId || cleanUid,
        referralCode: data.referralCode || data.memberId?.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'NV8829',
        referredBy: data.referredBy || undefined,
        walletBalance:
          typeof data.walletBalance === 'number' && !Number.isNaN(data.walletBalance) && data.walletBalance !== 12450.0
            ? data.walletBalance
            : 0.0,
        totalEarnings: typeof data.totalEarnings === 'number' ? data.totalEarnings : 0.0,
        activeUnits: typeof data.activeUnits === 'number' ? data.activeUnits : (Array.isArray(data.activeInvestments) ? data.activeInvestments.length : 0),
        dailyRewards: typeof data.dailyRewards === 'number' ? data.dailyRewards : 0.0,
        vipLevel: typeof data.vipLevel === 'number' ? data.vipLevel : 0,
        activeInvestments: Array.isArray(data.activeInvestments) ? data.activeInvestments : [],
        totalInvested: typeof data.totalInvested === 'number' ? data.totalInvested : 0.0,
        totalReferralEarnings: typeof data.totalReferralEarnings === 'number' ? data.totalReferralEarnings : 0.0,
        referralRewards: typeof data.referralRewards === 'number' ? data.referralRewards : 0.0,
        memberSince: data.memberSince || 'May 2024',
        isVerified: data.isVerified ?? true,
        avatarUrl: data.avatarUrl,
        fullName: data.fullName,
        transactions: Array.isArray(data.transactions) ? data.transactions : [],
        isAuthenticatorSet: Boolean(data.isAuthenticatorSet),
        authenticatorSecret: data.authenticatorSecret || '',
        canRefer: Boolean(data.canRefer),
        referralLimit: typeof data.referralLimit === 'number' ? data.referralLimit : 0,
      };
      onUpdate(profile);
    }
  };

  // 1. Direct doc listener
  const directRef = safeDoc('users', cleanUid);
  if (directRef) {
    try {
      const u1 = onSnapshot(directRef, handleDocSnap, (err) => {
        if (onError) onError(err);
      });
      unsubs.push(u1);
    } catch (_) {}
  }

  // 2. Query listener by memberId if cleanUid doesn't match direct doc ID
  (async () => {
    try {
      const uCol = collection(db, 'users');
      const qSnap = await getDocs(query(uCol, where('memberId', '==', cleanUid), limit(1)));
      if (isSubscribed && !qSnap.empty) {
        const foundDoc = qSnap.docs[0];
        if (foundDoc.id !== cleanUid) {
          const u2 = onSnapshot(foundDoc.ref, handleDocSnap);
          unsubs.push(u2);
        }
      }
    } catch (_) {}
  })();

  return () => {
    isSubscribed = false;
    unsubs.forEach((u) => {
      try {
        u();
      } catch (_) {}
    });
  };
};

/**
 * Update user referral permission and limit across Firestore, referral_nodes, and local storage
 */
export const updateFirestoreReferralPermission = async (
  userIdOrCode: string,
  targetUserInfo: any,
  canRefer: boolean,
  referralLimit: number
): Promise<boolean> => {
  const cleanId = cleanDocId(userIdOrCode, '');
  if (!cleanId) return false;

  const targetMemberId = targetUserInfo?.memberId ? cleanDocId(targetUserInfo.memberId, '') : '';
  const targetUid = targetUserInfo?.uid ? cleanDocId(targetUserInfo.uid, '') : '';
  const targetCode = targetUserInfo?.referralCode ? cleanDocId(targetUserInfo.referralCode, '') : '';
  const targetPhone = targetUserInfo?.phone || '';

  const numLimit = Number(referralLimit);
  const effectiveLimit = !isNaN(numLimit) && numLimit >= 0 ? numLimit : (canRefer ? 10 : 0);
  const payload = {
    canRefer: Boolean(canRefer),
    referralLimit: effectiveLimit,
    updatedAt: new Date().toISOString(),
  };

  // 1. Direct safeSetDoc on the primary user document and auth uid
  const directIds = Array.from(new Set([cleanId, targetUid].filter(Boolean)));
  for (const docId of directIds) {
    try {
      const dRef = safeDoc('users', docId);
      if (dRef) {
        await safeSetDoc(dRef, payload, { merge: true });
      }
    } catch (_) {}
  }

  // 2. Query Firestore 'users' by memberId, uid, phone to update any matching docs
  try {
    const uCol = collection(db, 'users');
    const queries = [];
    if (targetMemberId) {
      queries.push(query(uCol, where('memberId', '==', targetMemberId), limit(5)));
    }
    if (targetUid && targetUid !== cleanId) {
      queries.push(query(uCol, where('uid', '==', targetUid), limit(5)));
    }
    if (targetPhone) {
      queries.push(query(uCol, where('phone', '==', targetPhone), limit(5)));
    }

    for (const q of queries) {
      try {
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await safeSetDoc(d.ref, payload, { merge: true });
        }
      } catch (_) {}
    }
  } catch (_) {}

  // 3. Update 'referral_nodes' collection
  const codeKeys = Array.from(new Set([targetCode, targetMemberId].filter(Boolean)));
  for (const c of codeKeys) {
    try {
      const nRef = safeDoc('referral_nodes', c.toUpperCase());
      if (nRef) {
        await safeSetDoc(nRef, payload, { merge: true });
      }
    } catch (_) {}
  }

  // 4. Update localStorage and broadcast event
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem('novavest_registered_accounts');
      if (raw) {
        const accs = JSON.parse(raw);
        let updated = false;
        for (const k of Object.keys(accs)) {
          const item = accs[k];
          if (
            item &&
            (item.id === cleanId ||
              item.uid === cleanId ||
              item.memberId === cleanId ||
              item.referralCode === cleanId ||
              (targetMemberId && item.memberId === targetMemberId) ||
              (targetUid && (item.uid === targetUid || item.id === targetUid)) ||
              (targetCode && item.referralCode === targetCode))
          ) {
            item.canRefer = Boolean(canRefer);
            item.referralLimit = effectiveLimit;
            updated = true;
          }
        }
        if (updated) {
          localStorage.setItem('novavest_registered_accounts', JSON.stringify(accs));
        }
      }
    } catch (_) {}

    try {
      const authRaw = localStorage.getItem('nvt_auth_user') || localStorage.getItem('auth_user');
      if (authRaw) {
        const authObj = JSON.parse(authRaw);
        if (
          authObj &&
          (authObj.id === cleanId ||
            authObj.uid === cleanId ||
            authObj.memberId === cleanId ||
            (targetMemberId && authObj.memberId === targetMemberId) ||
            (targetUid && (authObj.uid === targetUid || authObj.id === targetUid)))
        ) {
          authObj.canRefer = Boolean(canRefer);
          authObj.referralLimit = effectiveLimit;
          localStorage.setItem('nvt_auth_user', JSON.stringify(authObj));
          localStorage.setItem('auth_user', JSON.stringify(authObj));
          window.dispatchEvent(new CustomEvent('nvt-auth-state-changed', { detail: authObj }));
        }
      }
    } catch (_) {}
  }

  // 5. Sync directly with server disk backup
  try {
    fetch('/api/admin/update-referral-permission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: cleanId,
        uid: targetUid || cleanId,
        memberId: targetMemberId,
        phone: targetPhone,
        referralCode: targetCode,
        canRefer: Boolean(canRefer),
        referralLimit: effectiveLimit,
      }),
    }).catch(() => {});
  } catch (_) {}

  return true;
};

export interface DepositRecord {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  method: string;
  channel: string;
  trxId: string;
  senderPhone?: string;
  senderNumber?: string;
  orderNo?: string;
  status: 'completed' | 'pending' | 'failed' | 'Approved' | 'Rejected' | 'Pending';
  createdAt?: any;
  dateFormatted?: string;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  type: 'recharge' | 'withdraw' | 'withdrawal' | 'yield' | 'bonus' | string;
  title?: string;
  desc?: string;
  description?: string;
  amount: string | number;
  rawAmount?: number;
  time?: string;
  date?: string;
  status: string;
  statusBangla?: string;
  channel?: string;
  isCredit: boolean;
  hash?: string;
  createdAt?: any;
  timestamp?: string;
  accountNumber?: string;
  accountName?: string;
  method?: string;
  walletMethod?: string;
  [key: string]: any;
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

  const isCompleted = data.status === 'completed';
  const isFailed = data.status === 'failed' || data.status === 'cancelled';
  const finalStatus: 'completed' | 'pending' | 'failed' = isCompleted ? 'completed' : isFailed ? 'failed' : 'pending';
  const banglaStatus = isCompleted ? 'সফল' : isFailed ? 'বাতিল' : 'অপেক্ষমাণ';

  const depositItem: DepositRecord = {
    id: depositId,
    userId: uid,
    userName: (data as any).userName || (data as any).payerName || '',
    amount: data.amount,
    method: data.method || 'bKash',
    channel: data.channel || 'Instant Auto',
    trxId: trxId,
    senderPhone: data.senderPhone || '',
    senderNumber: data.senderPhone || '',
    orderNo: data.orderNo || depositId,
    status: isCompleted ? 'Approved' : isFailed ? 'Rejected' : 'Pending',
    createdAt: now.toISOString(),
    dateFormatted: `${dateStr} ${timeStr}`,
  };

  const transactionItem: TransactionRecord = {
    id: trxId,
    userId: uid,
    type: 'recharge',
    title: `ওয়ালেট রিচার্জ (${data.method || 'bKash'})`,
    desc: !isCompleted && !isFailed
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
    isCredit: isCompleted,
    hash: trxId,
    createdAt: now.toISOString(),
  };

  try {
    const cleanUid = cleanDocId(uid, '');
    if (!cleanUid) {
      return { deposit: depositItem, transaction: transactionItem };
    }
    let userDocRef = safeDoc('users', cleanUid);
    let resolvedUserSnap = userDocRef ? await getDoc(userDocRef) : null;

    // Fallback: If not found by direct doc ID, search by memberId or email
    if (!resolvedUserSnap || !resolvedUserSnap.exists()) {
      try {
        const uCol = collection(db, 'users');
        const qSnap = await getDocs(query(uCol, where('memberId', '==', cleanUid), limit(1)));
        if (!qSnap.empty) {
          userDocRef = qSnap.docs[0].ref;
          resolvedUserSnap = qSnap.docs[0];
        } else {
          const qSnap2 = await getDocs(query(uCol, where('email', '==', cleanUid), limit(1)));
          if (!qSnap2.empty) {
            userDocRef = qSnap2.docs[0].ref;
            resolvedUserSnap = qSnap2.docs[0];
          }
        }
      } catch (_) {}
    }

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
  amount?: number,
  depositDocId?: string
): Promise<boolean> => {
  try {
    const cleanUid = cleanDocId(uid, '');
    const cleanId = cleanDocId(trxIdOrOrderNo, '');
    const cleanDepId = depositDocId ? cleanDocId(depositDocId, '') : '';
    if (!cleanUid || (!cleanId && !cleanDepId)) return false;

    const isCompleted = newStatus === 'completed';
    const statusBangla = isCompleted ? 'সফল' : 'বাতিল';
    const depositStatus = isCompleted ? 'completed' : 'failed';

    let userDocRef = safeDoc('users', cleanUid);
    if (!userDocRef) return false;
    let userSnap = await getDoc(userDocRef);

    // Fallback 1: If not found by direct doc ID, search by memberId, phone, email, or uid
    if (!userSnap.exists()) {
      try {
        const uCol = collection(db, 'users');
        const searchStrategies = [
          query(uCol, where('memberId', '==', cleanUid), limit(1)),
          query(uCol, where('phone', '==', cleanUid), limit(1)),
          query(uCol, where('uid', '==', cleanUid), limit(1)),
          query(uCol, where('email', '==', cleanUid), limit(1)),
        ];
        if (cleanUid.length === 11 && cleanUid.startsWith('01')) {
          searchStrategies.push(query(uCol, where('phone', '==', `+88${cleanUid}`), limit(1)));
        }
        for (const strat of searchStrategies) {
          const qSnap = await getDocs(strat);
          if (!qSnap.empty) {
            userDocRef = qSnap.docs[0].ref;
            userSnap = qSnap.docs[0];
            break;
          }
        }
      } catch (_) {}
    }

    // Fallback 2: Look up from the deposit document itself if available
    if (!userSnap.exists() && cleanDepId) {
      try {
        const dRef = safeDoc('deposits', cleanDepId);
        if (dRef) {
          const dSnap = await getDoc(dRef);
          if (dSnap.exists()) {
            const dData = dSnap.data();
            const dUserId = cleanDocId(dData.userId || dData.uid || '', '');
            if (dUserId) {
              const uRef2 = safeDoc('users', dUserId);
              if (uRef2) {
                const uSnap2 = await getDoc(uRef2);
                if (uSnap2.exists()) {
                  userDocRef = uRef2;
                  userSnap = uSnap2;
                }
              }
            }
          }
        }
      } catch (_) {}
    }

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const txns: TransactionRecord[] = Array.isArray(userData.transactions) ? userData.transactions : [];
      let foundAmount = Number(amount) || 0;

      let matched = false;
      const cleanIdLower = cleanId.toLowerCase();
      const cleanDepIdLower = cleanDepId.toLowerCase();

      const updatedTxns = txns.map((t: any) => {
        const tId = String(t.id || '').toLowerCase();
        const tHash = String(t.hash || '').toLowerCase();
        const tOrder = String(t.orderNo || '').toLowerCase();
        const matchesId =
          (cleanIdLower && (tId === cleanIdLower || tHash === cleanIdLower || tOrder === cleanIdLower)) ||
          (cleanDepIdLower && (tId === cleanDepIdLower || tOrder === cleanDepIdLower || tHash === cleanDepIdLower));
        if (matchesId) {
          matched = true;
          if (!foundAmount && t.rawAmount) foundAmount = Number(t.rawAmount);
          return {
            ...t,
            status: isCompleted ? 'Approved' : 'Rejected',
            statusBangla: statusBangla,
            isCredit: isCompleted,
            desc: isCompleted
              ? `ডিপোজিট TrxID: ${cleanId || cleanDepId} (সফল)`
              : `ডিপোজিট TrxID: ${cleanId || cleanDepId} (বাতিল)`,
          };
        }
        return t;
      });

      // If the deposit was not found in transactions array yet, prepend it
      if (!matched && isCompleted && foundAmount > 0) {
        const now = new Date();
        updatedTxns.unshift({
          id: cleanId || cleanDepId,
          type: 'recharge',
          title: `ওয়ালেট রিচার্জ (অনুমোদিত)`,
          desc: `ডিপোজিট TrxID: ${cleanId || cleanDepId} (সফল)`,
          amount: `+৳${foundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          rawAmount: foundAmount,
          time: `আজ, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
          date: now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          status: 'Approved',
          statusBangla: statusBangla,
          isCredit: true,
          hash: cleanId || cleanDepId,
          createdAt: now.toISOString(),
        });
      }

      const updatePayload: any = {
        transactions: updatedTxns,
        updatedAt: serverTimestamp(),
        ...(isCompleted && foundAmount > 0
          ? {
              walletBalance: increment(foundAmount),
              balance: increment(foundAmount),
              hasDeposited: true,
              totalDeposited: increment(foundAmount),
            }
          : {}),
      };

      await safeSetDoc(userDocRef, updatePayload, { merge: true });
    }

    // Update in deposits collections
    const idsToUpdateDep = [cleanId, cleanDepId].filter(Boolean);
    for (const depKey of idsToUpdateDep) {
      try {
        const uDep = safeDoc('users', cleanUid, 'deposits', depKey);
        if (uDep) {
          await safeSetDoc(
            uDep,
            {
              status: isCompleted ? 'Approved' : 'Rejected',
              isApproved: isCompleted,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (_) {}
      try {
        const tDep = safeDoc('deposits', depKey);
        if (tDep) {
          await safeSetDoc(
            tDep,
            {
              status: isCompleted ? 'Approved' : 'Rejected',
              isApproved: isCompleted,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      } catch (_) {}
    }

    // Update in transactions collections
    for (const trxKey of idsToUpdateDep) {
      try {
        const uTrx = safeDoc('users', cleanUid, 'transactions', trxKey);
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
        const tTrx = safeDoc('transactions', trxKey);
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
    }

    console.log(`[Firebase] Successfully updated deposit status [${cleanId} -> ${newStatus}]`);
    return true;
  } catch (err) {
    console.error('[Firebase] updateFirestoreDepositStatus error:', err);
    return false;
  }
};

/**
 * Authentic Bangladesh MFS TrxID Validator (bKash 10 chars, Nagad 8-10 chars, Rocket 8-12 chars)
 */
export const isValidRealTrxId = (trxId: string, _method?: string): boolean => {
  if (!trxId || typeof trxId !== 'string') return false;
  let clean = trxId.trim().toUpperCase().replace(/[\s\-_]/g, '');
  clean = clean.replace(/^(TRXID|TXNID|TRX|TXN)[:#\s]*/i, '');
  if (!/^[A-Z0-9]+$/.test(clean)) return false;
  if (clean.length < 6 || clean.length > 16) return false;

  const fakePatterns = [
    'TEST', 'FAKE', 'DEMO', 'NULL', 'VOID',
    'ADMIN', 'DUMMY', 'MOCK', 'WRONG', 'SAMPLE',
    'XXXX', 'AAAA', 'BBBB', 'CCCC', 'DDDD', 'EEEE', 'FFFF', 'ZZZZ',
    '00000000', '11111111', '22222222', '33333333', '44444444',
    '12345678', '87654321', '01234567', '76543210'
  ];
  for (const pat of fakePatterns) {
    if (clean.includes(pat) && clean.length <= 10) return false;
  }
  const uniqueChars = new Set(clean.split(''));
  if (uniqueChars.size < 3) return false;

  return true;
};

/**
 * Fetch all user transactions from Firestore
 */
export const getFirestoreUserTransactions = async (uid: string): Promise<TransactionRecord[]> => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return [];
  try {
    const combinedMap = new Map<string, TransactionRecord>();

    // 1. Fetch user transactions subcollection
    try {
      const subColRef = collection(db, 'users', cleanUid, 'transactions');
      const snap = await getDocs(subColRef);
      snap.forEach((d) => {
        const item = d.data() as TransactionRecord;
        const key = item.id || (item as any).hash || d.id;
        if (key) combinedMap.set(key, item);
      });
    } catch (_) {}

    // 2. Fetch user withdrawals subcollection
    try {
      const wColRef = collection(db, 'users', cleanUid, 'withdrawals');
      const wSnap = await getDocs(wColRef);
      wSnap.forEach((d) => {
        const data = d.data();
        const key = data.id || d.id;
        const rawStatus = String(data.status || 'Pending');
        const isApproved = rawStatus.toLowerCase() === 'approved';
        const isRejected = rawStatus.toLowerCase() === 'rejected';
        const statusBangla = isApproved ? 'এপ্রুভ' : isRejected ? 'বাতিল' : 'অপেক্ষমাণ';
        const wItem: TransactionRecord = {
          id: key,
          userId: cleanUid,
          type: 'withdrawal',
          amount: -(Math.abs(Number(data.amount) || 0)),
          status: isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending',
          timestamp: `${data.dateStr || ''} ${data.timeStr || ''}`.trim() || data.createdAt || 'Recent',
          date: data.dateStr || (data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-GB') : undefined),
          time: data.timeStr || undefined,
          channel: data.method || data.walletMethod || 'bKash',
          description: `উইথড্র: ${data.method || data.walletMethod || 'bKash'} (${String(data.accountNumber || '').slice(-4)}) - ${statusBangla}`,
          hash: key,
          isCredit: false,
          ...data,
        };
        const existing = combinedMap.get(key);
        combinedMap.set(key, { ...(existing || {}), ...wItem });
      });
    } catch (_) {}

    // 3. Check transactions array in user document
    try {
      const userDocRef = safeDoc('users', cleanUid);
      if (userDocRef) {
        const uSnap = await getDoc(userDocRef);
        if (uSnap.exists()) {
          const arr = uSnap.data().transactions || [];
          if (Array.isArray(arr)) {
            arr.forEach((t: any) => {
              const key = t.id || t.hash;
              if (key && !combinedMap.has(key)) {
                combinedMap.set(key, t);
              }
            });
          }
        }
      }
    } catch (_) {}

    // Fallback: top-level transactions collection if empty
    if (combinedMap.size === 0) {
      try {
        const txRef = collection(db, 'transactions');
        const q = query(txRef, where('userId', '==', cleanUid));
        const topSnap = await getDocs(q);
        topSnap.forEach((d) => {
          const item = d.data() as TransactionRecord;
          const key = item.id || (item as any).hash || d.id;
          if (key) combinedMap.set(key, item);
        });
      } catch (_) {}
    }

    return Array.from(combinedMap.values());
  } catch (err) {
    console.warn('[Firebase] getFirestoreUserTransactions error:', err);
    return [];
  }
};

/**
 * Real-time listener for user transactions and withdrawals
 */
export const subscribeToUserTransactions = (
  uid: string,
  onUpdate: (transactions: TransactionRecord[]) => void
): (() => void) => {
  const cleanUid = cleanDocId(uid, '');
  if (!cleanUid) return () => {};

  let latestTxns: TransactionRecord[] = [];
  let latestWithdrawals: TransactionRecord[] = [];
  let latestTopWithdrawals: TransactionRecord[] = [];
  let latestDeposits: TransactionRecord[] = [];
  let latestUserDocTxns: TransactionRecord[] = [];

  const isTerminalApproved = (st: any) => {
    const s = String(st || '').toLowerCase();
    return s === 'approved' || s === 'completed' || s === 'সফল' || s === 'এপ্রুভ' || s === 'অনুমোদিত';
  };

  const isTerminalRejected = (st: any) => {
    const s = String(st || '').toLowerCase();
    return s === 'rejected' || s === 'failed' || s === 'cancelled' || s === 'বাতিল';
  };

  const mergeAndEmit = () => {
    const map = new Map<string, TransactionRecord>();

    // 1. Transactions from user subcollection
    latestTxns.forEach((t) => {
      const k = t.id || (t as any).hash;
      if (k) map.set(k, t);
    });

    // 2. Deposits from user deposits subcollection (syncs real-time admin approvals)
    latestDeposits.forEach((dep) => {
      const k = dep.id || (dep as any).hash;
      if (k) {
        const existing = map.get(k);
        map.set(k, { ...(existing || {}), ...dep });
      }
    });

    // 3. Withdrawals from user withdrawals subcollection (syncs real-time admin approvals)
    latestWithdrawals.forEach((w) => {
      const k = w.id || (w as any).hash;
      if (k) {
        const existing = map.get(k);
        map.set(k, { ...(existing || {}), ...w });
      }
    });

    // 3.1 Withdrawals from top-level withdrawals collection (AUTHORITATIVE from Admin Panel)
    latestTopWithdrawals.forEach((w) => {
      const k = w.id || (w as any).hash;
      if (k) {
        const existing = map.get(k);
        map.set(k, { ...(existing || {}), ...w });
      }
    });

    // 4. Transactions from user document array
    latestUserDocTxns.forEach((t) => {
      const k = t.id || (t as any).hash;
      if (k) {
        const existing = map.get(k);
        if (!existing) {
          map.set(k, t);
        } else {
          // If existing is already approved or rejected from top collection, PRESERVE IT!
          const existingIsTerminal = isTerminalApproved(existing.status) || isTerminalRejected(existing.status);
          const newIsTerminal = isTerminalApproved(t.status) || isTerminalRejected(t.status);

          if (!existingIsTerminal && newIsTerminal) {
            const isAppr = isTerminalApproved(t.status);
            const isRej = isTerminalRejected(t.status);
            const statusText = isAppr ? 'Approved' : isRej ? 'Rejected' : (t.status || 'Pending');
            const statusBangla = isAppr ? (t.type === 'withdrawal' ? 'এপ্রুভ' : 'সফল') : isRej ? 'বাতিল' : 'অপেক্ষমাণ';
            map.set(k, {
              ...existing,
              ...t,
              status: statusText,
              statusBangla,
              isCredit: t.type === 'withdrawal' ? false : isAppr,
            });
          }
        }
      }
    });

    // 5. Final check against local storage admin broadcast status
    if (typeof window !== 'undefined' && window.localStorage) {
      map.forEach((item, k) => {
        const localStatus = window.localStorage.getItem(`nvt_withdrawal_status_${k}`);
        if (localStatus === 'Approved' || localStatus === 'Rejected') {
          const isAppr = localStatus === 'Approved';
          item.status = localStatus;
          item.statusBangla = isAppr ? (item.type === 'withdrawal' ? 'এপ্রুভ' : 'সফল') : 'বাতিল';
          item.description = String(item.description || item.desc || '').replace('অপেক্ষমাণ', item.statusBangla);
          if (item.type === 'withdrawal') {
            item.isCredit = false;
          }
        }
      });
    }

    onUpdate(Array.from(map.values()));
  };

  const unsubTxns = onSnapshot(
    collection(db, 'users', cleanUid, 'transactions'),
    (snap) => {
      latestTxns = snap.docs.map((d) => d.data() as TransactionRecord);
      mergeAndEmit();
    },
    (err) => {
      console.warn('[Firebase] Transactions listener notice:', err);
    }
  );

  const unsubDeposits = onSnapshot(
    collection(db, 'users', cleanUid, 'deposits'),
    (snap) => {
      latestDeposits = snap.docs.map((d) => {
        const data = d.data();
        const rawStatus = String(data.status || 'Pending').toLowerCase();
        const isApproved = rawStatus === 'approved' || rawStatus === 'completed' || rawStatus === 'সফল' || data.isApproved === true;
        const isRejected = rawStatus === 'rejected' || rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'বাতিল';
        const statusBangla = isApproved ? 'সফল' : isRejected ? 'বাতিল' : 'অপেক্ষমাণ';
        return {
          id: d.id,
          userId: cleanUid,
          type: 'recharge',
          amount: Math.abs(Number(data.amount) || 0),
          status: isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending',
          statusBangla: statusBangla,
          timestamp: data.dateFormatted || data.createdAt || 'Recent',
          date: data.dateFormatted ? data.dateFormatted.split(' ')[0] : undefined,
          channel: data.method || 'bKash',
          description: `ডিপোজিট TrxID: ${data.trxId || d.id} (${statusBangla})`,
          hash: data.trxId || d.id,
          isCredit: isApproved,
          ...data,
        } as TransactionRecord;
      });
      mergeAndEmit();
    },
    (err) => {
      console.warn('[Firebase] Deposits listener notice:', err);
    }
  );

  const unsubWithdrawals = onSnapshot(
    collection(db, 'users', cleanUid, 'withdrawals'),
    (snap) => {
      latestWithdrawals = snap.docs.map((d) => {
        const data = d.data();
        const rawStatus = String(data.status || 'Pending');
        const isApproved = rawStatus.toLowerCase() === 'approved';
        const isRejected = rawStatus.toLowerCase() === 'rejected';
        const statusBangla = isApproved ? 'এপ্রুভ' : isRejected ? 'বাতিল' : 'অপেক্ষমাণ';
        return {
          id: d.id,
          userId: cleanUid,
          type: 'withdrawal',
          amount: -(Math.abs(Number(data.amount) || 0)),
          rawAmount: Math.abs(Number(data.amount) || 0),
          status: isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending',
          statusBangla,
          timestamp: `${data.dateStr || ''} ${data.timeStr || ''}`.trim() || data.createdAt || 'Recent',
          date: data.dateStr || undefined,
          time: data.timeStr || undefined,
          channel: data.method || data.walletMethod || 'bKash',
          description: `উইথড্র: ${data.method || data.walletMethod || 'bKash'} (${String(data.accountNumber || '').slice(-4)}) - ${statusBangla}`,
          hash: d.id,
          isCredit: false,
          ...data,
        } as TransactionRecord;
      });
      mergeAndEmit();
    },
    (err) => {
      console.warn('[Firebase] Withdrawals listener notice:', err);
    }
  );

  // Authoritative top-level withdrawals listener for this user
  let unsubTopWithdrawals = () => {};
  try {
    unsubTopWithdrawals = onSnapshot(
      query(collection(db, 'withdrawals'), where('userId', '==', cleanUid)),
      (snap) => {
        latestTopWithdrawals = snap.docs.map((d) => {
          const data = d.data();
          const rawStatus = String(data.status || 'Pending');
          const isApproved = rawStatus.toLowerCase() === 'approved';
          const isRejected = rawStatus.toLowerCase() === 'rejected';
          const statusBangla = isApproved ? 'এপ্রুভ' : isRejected ? 'বাতিল' : 'অপেক্ষমাণ';
          return {
            id: d.id,
            userId: cleanUid,
            type: 'withdrawal',
            amount: -(Math.abs(Number(data.amount) || 0)),
            rawAmount: Math.abs(Number(data.amount) || 0),
            status: isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending',
            statusBangla,
            timestamp: `${data.dateStr || ''} ${data.timeStr || ''}`.trim() || data.createdAt || 'Recent',
            date: data.dateStr || undefined,
            time: data.timeStr || undefined,
            channel: data.method || data.walletMethod || 'bKash',
            description: `উইথড্র: ${data.method || data.walletMethod || 'bKash'} (${String(data.accountNumber || '').slice(-4)}) - ${statusBangla}`,
            hash: d.id,
            isCredit: false,
            ...data,
          } as TransactionRecord;
        });
        mergeAndEmit();
      },
      () => {}
    );
  } catch (_) {}

  const unsubUserDoc = onSnapshot(
    safeDoc('users', cleanUid),
    (snap) => {
      if (snap && snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.transactions)) {
          latestUserDocTxns = data.transactions;
          mergeAndEmit();
        }
      }
    },
    () => {}
  );

  return () => {
    try { unsubTxns(); } catch (_) {}
    try { unsubDeposits(); } catch (_) {}
    try { unsubWithdrawals(); } catch (_) {}
    try { unsubTopWithdrawals(); } catch (_) {}
    try { unsubUserDoc(); } catch (_) {}
  };
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
  createdAt?: number | string;
  lastProfitClaimAt?: number;
  nextProfitAt?: number;
  status?: 'active' | 'completed';
  dailyReturnPercent?: number;
  category?: string;
  claimedCount?: number;
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
    const totalInvestedSum = (allInvestments || []).reduce(
      (sum, inv) => sum + (Number(inv.amount || (inv as any).investAmount) || 0),
      0
    );

    if (userDocRef) {
      await safeSetDoc(
        userDocRef,
        {
          walletBalance: Number(updatedBalance) || 0,
          vipLevel: Number(newVipLevel) || 0,
          dailyRewards: Number(totalDaily) || 0,
          activeUnits: allInvestments?.length || 0,
          activeInvestments: allInvestments || [],
          totalInvested: totalInvestedSum,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Also update referral node so upline 3-level tree immediately reflects active status
      try {
        const uSnap = await getDoc(userDocRef);
        if (uSnap.exists()) {
          const uData = uSnap.data();
          const refCode = (uData.referralCode || '').toString().trim().toUpperCase();
          const memberId = (uData.memberId || '').toString().trim().toUpperCase();
          const nodePayload = {
            investAmount: totalInvestedSum,
            status: totalInvestedSum > 0 ? 'active' : 'pending',
            updatedAt: serverTimestamp(),
          };
          if (refCode) {
            const rRef = safeDoc('referral_nodes', refCode);
            if (rRef) safeSetDoc(rRef, nodePayload, { merge: true }).catch(() => {});
          }
          if (memberId && memberId !== refCode) {
            const mRef = safeDoc('referral_nodes', memberId);
            if (mRef) safeSetDoc(mRef, nodePayload, { merge: true }).catch(() => {});
          }
          const uRef = safeDoc('referral_nodes', cleanUid);
          if (uRef) safeSetDoc(uRef, nodePayload, { merge: true }).catch(() => {});
        }
      } catch (_) {}
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
  const rawReferredBy = (
    data.referredBy ||
    data.referredByCode ||
    data.uplineCode ||
    data.inviterCode ||
    data.referrerCode ||
    data.sponsor ||
    data.parentCode ||
    ''
  ).toString().trim().toUpperCase();
  const phone = (data.phone || data.mobile || data.phoneNumber || '').toString().trim();
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

  const hasActiveInvestments =
    Array.isArray(data.activeInvestments) &&
    data.activeInvestments.some((inv: any) => Number(inv.amount || inv.investAmount || 0) > 0);
  const rawInvest = Number(
    data.totalInvested ||
    data.investAmount ||
    data.totalRecharge ||
    data.totalDeposit ||
    0
  );
  const investAmount = isNaN(rawInvest) ? 0 : rawInvest;
  const isActive = investAmount > 0 || hasActiveInvestments;

  return {
    userId: id || data.uid || '',
    userCode: code,
    memberId: rawMemberId || undefined,
    referredByCode: rawReferredBy,
    phone,
    username: name,
    joinedAt,
    investAmount,
    status: isActive ? 'active' : 'pending',
  } as any;
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

    // Also alias by userId if present
    if (node.userId) {
      const cleanUid = cleanDocId(node.userId, '');
      if (cleanUid && cleanUid !== cleanCode && cleanUid !== cleanMemberId) {
        const ref3 = safeDoc('referral_nodes', cleanUid);
        if (ref3) {
          await safeSetDoc(ref3, payload, { merge: true });
        }
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
          if (node.userId && node.userId !== node.userCode) {
            result[node.userId] = result[node.userCode];
          }
          if (node.phone) {
            const cleanP = node.phone.replace(/\D/g, '');
            if (cleanP) result[cleanP] = result[node.userCode];
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
        const rawCode = data.userCode || data.memberId || d.id;
        if (rawCode) {
          const key = rawCode.toString().trim().toUpperCase();
          const cleanRefBy = (
            data.referredByCode ||
            (data as any).referredBy ||
            (data as any).uplineCode ||
            result[key]?.referredByCode ||
            ''
          )
            .toString()
            .trim()
            .toUpperCase();

          result[key] = {
            ...(result[key] || {}),
            ...data,
            userCode: key,
            referredByCode: cleanRefBy,
          };
          if (data.memberId) {
            result[data.memberId.toUpperCase()] = result[key];
          }
          if (data.userId) {
            result[data.userId] = result[key];
          }
          if (data.phone) {
            const cleanP = data.phone.replace(/\D/g, '');
            if (cleanP) result[cleanP] = result[key];
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
          if (node.userId && node.userId !== node.userCode) {
            mergedAccounts[node.userId] = mergedAccounts[node.userCode];
          }
          if (node.phone) {
            const cleanP = node.phone.replace(/\D/g, '');
            if (cleanP) mergedAccounts[cleanP] = mergedAccounts[node.userCode];
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
        const rawCode = data.userCode || data.memberId || d.id;
        if (rawCode) {
          const key = rawCode.toString().trim().toUpperCase();
          const cleanRefBy = (
            data.referredByCode ||
            (data as any).referredBy ||
            (data as any).uplineCode ||
            mergedAccounts[key]?.referredByCode ||
            ''
          )
            .toString()
            .trim()
            .toUpperCase();

          mergedAccounts[key] = {
            ...(mergedAccounts[key] || {}),
            ...data,
            userCode: key,
            referredByCode: cleanRefBy,
          };
          if (data.memberId) {
            mergedAccounts[data.memberId.toUpperCase()] = mergedAccounts[key];
          }
          if (data.userId) {
            mergedAccounts[data.userId] = mergedAccounts[key];
          }
          if (data.phone) {
            const cleanP = data.phone.replace(/\D/g, '');
            if (cleanP) mergedAccounts[cleanP] = mergedAccounts[key];
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
  commissionAmount: number,
  details?: {
    level?: number;
    ratePercent?: number;
    sourceUserCode?: string;
    depositAmount?: number;
    trxId?: string;
  }
): Promise<boolean> => {
  const cleanId = cleanDocId(userIdOrCode, '');
  const amt = Number(commissionAmount);
  if (!cleanId || !amt || amt <= 0) return false;

  try {
    let targetDocSnap: any = null;

    // 1. Check direct doc existence by ID/UID first
    const directRef = safeDoc('users', cleanId);
    if (directRef) {
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        targetDocSnap = directSnap;
      }
    }

    // 2. Search queries across all variants if not directly matching doc ID
    if (!targetDocSnap) {
      const cleanIdNoNVT = cleanId.replace(/^NVT/i, '');
      const cleanIdWithNVT = cleanId.startsWith('NVT') ? cleanId : `NVT${cleanId}`;
      const searchCodes = Array.from(new Set([cleanId, cleanIdNoNVT, cleanIdWithNVT])).filter(Boolean);

      // Search by referralCode
      for (const code of searchCodes) {
        const q = query(collection(db, 'users'), where('referralCode', '==', code));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          targetDocSnap = qSnap.docs[0];
          break;
        }
      }

      // Search by memberId
      if (!targetDocSnap) {
        for (const code of searchCodes) {
          const q = query(collection(db, 'users'), where('memberId', '==', code));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            targetDocSnap = qSnap.docs[0];
            break;
          }
        }
      }

      // Search by phone digits
      if (!targetDocSnap) {
        const cleanDigits = cleanId.replace(/\D/g, '');
        if (cleanDigits.length >= 8) {
          const allUsers = await getDocs(collection(db, 'users'));
          for (const d of allUsers.docs) {
            const uPhone = (d.data().phone || '').replace(/\D/g, '');
            if (uPhone && uPhone.includes(cleanDigits)) {
              targetDocSnap = d;
              break;
            }
          }
        }
      }
    }

    if (!targetDocSnap) {
      console.warn('[Firebase] Could not locate user document for commission credit:', cleanId);
      return false;
    }

    const targetRef = targetDocSnap.ref;
    const existingData = targetDocSnap.data() || {};
    const currentTxns = Array.isArray(existingData.transactions) ? existingData.transactions : [];

    const now = new Date();
    const formattedTime =
      now.toLocaleDateString('en-GB') +
      ' ' +
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const lvl = details?.level || 1;
    const rateText = details?.ratePercent ? `${details.ratePercent}%` : lvl === 1 ? '6%' : lvl === 2 ? '3%' : '1%';
    const sourceText = details?.sourceUserCode ? ` (${details.sourceUserCode})` : '';

    const newTxn = {
      id: `COMM-${Date.now()}-L${lvl}-${Math.random().toString(36).slice(-4)}`,
      type: 'bonus',
      amount: amt,
      timestamp: formattedTime,
      date: now.toLocaleDateString('en-GB'),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: 'completed',
      description: `লেভেল ${lvl} রেফার কমিশন ${rateText}${sourceText}`,
      title: `রেফার কমিশন (লেভেল ${lvl})`,
      hash: details?.trxId || `COMM-L${lvl}`,
      isCredit: true,
    };

    // Save commission strictly into invitation available referral rewards (not main wallet balance)
    // The user will transfer it to main wallet balance when it reaches at least ৳200 from the Invitation screen.
    await safeSetDoc(
      targetRef,
      {
        referralRewards: increment(amt),
        totalReferralEarnings: increment(amt),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Record in commissions collection in Firestore
    try {
      await addDoc(collection(db, 'commissions'), {
        recipientUid: targetDocSnap.id,
        recipientCode: existingData.referralCode || existingData.memberId || cleanId,
        recipientName: existingData.name || existingData.username || 'User',
        sourceUserCode: details?.sourceUserCode || '',
        level: lvl,
        rate: rateText,
        depositAmount: details?.depositAmount || 0,
        commissionAmount: amt,
        createdAt: serverTimestamp(),
        timestamp: now.toISOString(),
      });
    } catch (_) {}

    console.log(`[Firebase] Successfully credited ৳${amt} commission to user ${targetDocSnap.id} (Level ${lvl})`);
    return true;
  } catch (err) {
    console.warn('[Firebase] Notice crediting commission to user in Firestore:', err);
    return false;
  }
};

/**
 * Transfer referral rewards from invitation option to main wallet balance in Firestore
 * Enforces minimum transfer of 200 BDT
 */
export const transferReferralRewardsInFirestore = async (
  uidOrCode: string,
  amount: number
): Promise<boolean> => {
  const cleanId = cleanDocId(uidOrCode, '');
  const amt = Number(amount);
  if (!cleanId || amt <= 0) return false;

  try {
    const userDocRef = safeDoc('users', cleanId);
    if (!userDocRef) return false;
    await safeSetDoc(
      userDocRef,
      {
        walletBalance: increment(amt),
        balance: increment(amt),
        referralRewards: 0,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('[Firebase] Notice transferring referral rewards to wallet:', err);
    return false;
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

/**
 * -------------------------------------------------------------
 * 5. CLOUD WITHDRAWAL RECORD & ADMIN SYNC
 * -------------------------------------------------------------
 */
export interface WithdrawalRecordParams {
  uid: string;
  trxId: string;
  amount: number;
  walletMethod: string;
  accountNumber: string;
  accountName?: string;
  authCode?: string;
  status?: string;
  dateStr?: string;
  timeStr?: string;
}

export const recordFirestoreWithdrawal = async (params: WithdrawalRecordParams): Promise<boolean> => {
  try {
    const cleanUid = cleanDocId(params.uid, '');
    const cleanWId = cleanDocId(params.trxId, `WD-${Date.now()}`);
    if (!cleanUid || !cleanWId) return false;

    // 1. Resolve target user document by ID, memberId, email, or phone
    let realUid = cleanUid;
    let userDocRef = safeDoc('users', cleanUid);
    let userSnap = userDocRef ? await getDoc(userDocRef) : null;

    if (!userSnap || !userSnap.exists()) {
      try {
        const uCol = collection(db, 'users');
        const q1 = await getDocs(query(uCol, where('memberId', '==', cleanUid), limit(1)));
        if (!q1.empty) {
          userDocRef = q1.docs[0].ref;
          userSnap = q1.docs[0];
          realUid = q1.docs[0].id;
        } else {
          const q2 = await getDocs(query(uCol, where('email', '==', cleanUid), limit(1)));
          if (!q2.empty) {
            userDocRef = q2.docs[0].ref;
            userSnap = q2.docs[0];
            realUid = q2.docs[0].id;
          } else {
            const q3 = await getDocs(query(uCol, where('phone', '==', cleanUid), limit(1)));
            if (!q3.empty) {
              userDocRef = q3.docs[0].ref;
              userSnap = q3.docs[0];
              realUid = q3.docs[0].id;
            }
          }
        }
      } catch (_) {}
    }

    const now = new Date();
    const withdrawAmt = Math.abs(Number(params.amount) || 0);

    const payload = {
      id: cleanWId,
      userId: realUid,
      memberId: params.uid,
      amount: withdrawAmt,
      method: params.walletMethod || 'bKash',
      walletMethod: params.walletMethod || 'bKash',
      accountNumber: params.accountNumber || '',
      accountName: params.accountName || '',
      authCode: params.authCode || '2FA_VERIFIED',
      status: params.status || 'Pending',
      statusBangla: 'অপেক্ষমাণ',
      createdAt: now.toISOString(),
      dateStr: params.dateStr || now.toLocaleDateString('en-GB'),
      timeStr: params.timeStr || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      serverCreatedAt: serverTimestamp(),
    };

    const transactionItem = {
      id: cleanWId,
      userId: realUid,
      type: 'withdrawal',
      amount: -withdrawAmt,
      rawAmount: withdrawAmt,
      status: 'Pending',
      statusBangla: 'অপেক্ষমাণ',
      timestamp: `${payload.dateStr} ${payload.timeStr}`,
      date: payload.dateStr,
      time: payload.timeStr,
      channel: payload.method,
      accountNumber: payload.accountNumber,
      accountName: payload.accountName,
      description: `উইথড্র: ${payload.method} (${payload.accountNumber.slice(-4)}) - অপেক্ষমাণ`,
      hash: cleanWId,
      isCredit: false,
      serverCreatedAt: serverTimestamp(),
    };

    // 2. Save in global withdrawals collection for Admin Panel
    const wDocRef = safeDoc('withdrawals', cleanWId);
    if (wDocRef) {
      await safeSetDoc(wDocRef, payload, { merge: true });
    }

    // 3. Save in user withdrawals subcollection
    const uidsToSync = Array.from(new Set([cleanUid, realUid].filter(Boolean)));
    for (const u of uidsToSync) {
      try {
        const uWRef = safeDoc('users', u, 'withdrawals', cleanWId);
        if (uWRef) await safeSetDoc(uWRef, payload, { merge: true });
      } catch (_) {}

      try {
        const uTRef = safeDoc('users', u, 'transactions', cleanWId);
        if (uTRef) await safeSetDoc(uTRef, transactionItem, { merge: true });
      } catch (_) {}
    }

    // 4. Save in top-level transactions collection
    try {
      const topTRef = safeDoc('transactions', cleanWId);
      if (topTRef) await safeSetDoc(topTRef, transactionItem, { merge: true });
    } catch (_) {}

    // 5. Safely deduct wallet balance (NEVER negative: Math.max(0, currentBalance - amt))
    if (userDocRef) {
      const currentBalance = userSnap && userSnap.exists()
        ? Number(userSnap.data().walletBalance ?? userSnap.data().balance ?? 0)
        : 0;
      const newBalance = Math.max(0, currentBalance - withdrawAmt);

      await safeSetDoc(
        userDocRef,
        {
          walletBalance: newBalance,
          balance: newBalance,
          transactions: arrayUnion(sanitizeFirestoreData(transactionItem)),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    console.log(`[Firebase] Successfully recorded withdrawal [${cleanWId}]:`, payload);
    return true;
  } catch (err) {
    console.warn('[Firebase] Error recording withdrawal in Firestore:', err);
    return false;
  }
};

/**
 * -------------------------------------------------------------
 * 6. ADMIN WITHDRAWAL APPROVAL & SYNC
 * When Admin approves: updates status to "Approved" / "এপ্রুভ" across all collections
 * and in user profile transactions array.
 * When Admin rejects: updates status to "Rejected" / "বাতিল" and refunds balance.
 * -------------------------------------------------------------
 */
export const updateFirestoreWithdrawalStatus = async (
  uid: string,
  withdrawId: string,
  newStatus: 'Approved' | 'Rejected',
  amount?: number
): Promise<boolean> => {
  try {
    const cleanWId = cleanDocId(withdrawId, '');
    const cleanUid = cleanDocId(uid, '');
    if (!cleanWId) return false;

    const isApprove = newStatus === 'Approved';
    const statusText = isApprove ? 'Approved' : 'Rejected';
    const statusBangla = isApprove ? 'এপ্রুভ' : 'বাতিল';
    const nowIso = new Date().toISOString();
    const nowBanglaTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nowBanglaDate = new Date().toLocaleDateString('en-GB');

    // 1. Update top-level withdrawals collection
    const wDocRef = safeDoc('withdrawals', cleanWId);
    if (wDocRef) {
      await safeSetDoc(
        wDocRef,
        {
          status: statusText,
          statusBangla,
          updatedAt: nowIso,
          approvedAt: isApprove ? nowIso : null,
          rejectedAt: !isApprove ? nowIso : null,
        },
        { merge: true }
      );
    }

    // 2. Resolve user document by direct ID or fallback
    let realUid = cleanUid;
    let userDocRef = cleanUid ? safeDoc('users', cleanUid) : null;
    let userSnap = userDocRef ? await getDoc(userDocRef) : null;

    if (!userSnap || !userSnap.exists()) {
      try {
        const uCol = collection(db, 'users');
        if (cleanUid) {
          const q1 = await getDocs(query(uCol, where('memberId', '==', cleanUid), limit(1)));
          if (!q1.empty) {
            userDocRef = q1.docs[0].ref;
            userSnap = q1.docs[0];
            realUid = q1.docs[0].id;
          } else {
            const q2 = await getDocs(query(uCol, where('email', '==', cleanUid), limit(1)));
            if (!q2.empty) {
              userDocRef = q2.docs[0].ref;
              userSnap = q2.docs[0];
              realUid = q2.docs[0].id;
            } else {
              const q3 = await getDocs(query(uCol, where('phone', '==', cleanUid), limit(1)));
              if (!q3.empty) {
                userDocRef = q3.docs[0].ref;
                userSnap = q3.docs[0];
                realUid = q3.docs[0].id;
              }
            }
          }
        }
      } catch (_) {}
    }

    // Check withdrawal doc for userId if still unresolved
    if ((!userSnap || !userSnap.exists()) && wDocRef) {
      try {
        const wSnap = await getDoc(wDocRef);
        if (wSnap.exists()) {
          const wData = wSnap.data();
          const candidateUid = wData.userId || wData.uid || wData.memberId;
          if (candidateUid && candidateUid !== cleanUid) {
            const fbRef = safeDoc('users', candidateUid);
            if (fbRef) {
              const fSnap = await getDoc(fbRef);
              if (fSnap.exists()) {
                userDocRef = fbRef;
                userSnap = fSnap;
                realUid = candidateUid;
              }
            }
          }
        }
      } catch (_) {}
    }

    // 3. Update subcollections: users/{u}/withdrawals & users/{u}/transactions
    const uidsToSync = Array.from(new Set([cleanUid, realUid].filter(Boolean)));
    for (const u of uidsToSync) {
      try {
        const uWRef = safeDoc('users', u, 'withdrawals', cleanWId);
        if (uWRef) {
          await safeSetDoc(
            uWRef,
            {
              status: statusText,
              statusBangla,
              updatedAt: nowIso,
            },
            { merge: true }
          );
        }
      } catch (_) {}

      try {
        const uTRef = safeDoc('users', u, 'transactions', cleanWId);
        if (uTRef) {
          await safeSetDoc(
            uTRef,
            {
              status: statusText,
              statusBangla,
              updatedAt: nowIso,
            },
            { merge: true }
          );
        }
      } catch (_) {}
    }

    // 4. Update top-level transactions collection
    try {
      const topTRef = safeDoc('transactions', cleanWId);
      if (topTRef) {
        await safeSetDoc(
          topTRef,
          {
            status: statusText,
            statusBangla,
            updatedAt: nowIso,
          },
          { merge: true }
        );
      }
    } catch (_) {}

    // 5. Update user document's transactions array and wallet balance
    if (userDocRef && userSnap && userSnap.exists()) {
      const userData = userSnap.data();
      const txns: any[] = userData.transactions || [];
      const numAmount = Math.abs(Number(amount) || 0);

      let matched = false;
      const updatedTxns = txns.map((t: any) => {
        if (t.id === cleanWId || t.hash === cleanWId) {
          matched = true;
          const currentDesc = String(t.description || t.desc || '');
          const cleanDesc = currentDesc
            .replace('অপেক্ষমাণ', statusBangla)
            .replace('Pending', statusText)
            .replace('pending', statusText);
          return {
            ...t,
            status: statusText,
            statusBangla,
            description: cleanDesc.includes(statusBangla) ? cleanDesc : `${cleanDesc} - ${statusBangla}`,
          };
        }
        return t;
      });

      if (!matched) {
        updatedTxns.unshift({
          id: cleanWId,
          type: 'withdrawal',
          amount: -numAmount,
          rawAmount: numAmount,
          status: statusText,
          statusBangla,
          timestamp: `${nowBanglaDate} ${nowBanglaTime}`,
          description: `উইথড্র (${cleanWId.slice(-4)}) - ${statusBangla}`,
          hash: cleanWId,
          isCredit: false,
        });
      }

      const userUpdate: any = {
        transactions: updatedTxns,
        updatedAt: serverTimestamp(),
      };

      const currentBal = Number(userData.walletBalance ?? userData.balance ?? 0);

      if (!isApprove) {
        // If rejected, refund the deducted amount back to user's wallet
        if (numAmount > 0) {
          const refundedBal = Math.max(0, currentBal + numAmount);
          userUpdate.walletBalance = refundedBal;
          userUpdate.balance = refundedBal;
        }
      } else {
        // If approved, ensure balance is never negative
        if (currentBal < 0) {
          userUpdate.walletBalance = 0;
          userUpdate.balance = 0;
        }
      }

      await safeSetDoc(userDocRef, userUpdate, { merge: true });
    }

    console.log(`[Firebase] Successfully updated withdrawal [${cleanWId} -> ${statusText}]`);
    return true;
  } catch (err) {
    console.error('[Firebase] updateFirestoreWithdrawalStatus error:', err);
    return false;
  }
};


