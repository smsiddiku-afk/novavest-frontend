import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on startup
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network is limited. Operating with local cache.');
    }
  }
}

testFirestoreConnection();

/**
 * Normalizes phone numbers for matching (strips non-digits)
 */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Strips all undefined fields recursively from an object before sending to Firestore
 * to ensure Firestore setDoc/updateDoc never fails with 'Unsupported field value: undefined'
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date) && !('nanoseconds' in val) && !Array.isArray(val)) {
        result[key] = sanitizeFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

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
  const userDocRef = doc(db, 'users', uid);
  const now = new Date();
  const memberSince = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Generate unique 6-character referral code if not already provided
  const cleanMemberId = data.memberId?.trim() || `NVT${Math.floor(100000 + Math.random() * 900000)}`;
  const referralCode =
    data.referralCode?.trim().toUpperCase() ||
    cleanMemberId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() ||
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const cleanReferredBy = data.referredBy?.trim().toUpperCase() || '';

  const profile: UserProfile = {
    uid,
    name: data.name.trim() || 'NVT Member',
    phone: data.phone.trim(),
    email: data.email.trim(),
    memberId: cleanMemberId,
    referralCode,
    referredBy: cleanReferredBy || undefined,
    walletBalance:
      typeof data.walletBalance === 'number' && data.walletBalance !== 12450.0
        ? data.walletBalance
        : 0.0,
    memberSince,
    isVerified: true,
  };

  const docPayload: Record<string, any> = {
    uid,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    memberId: cleanMemberId,
    referralCode,
    walletBalance: profile.walletBalance,
    memberSince,
    isVerified: true,
    phoneNormalized: normalizePhone(profile.phone),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (cleanReferredBy) {
    docPayload.referredBy = cleanReferredBy;
  }

  try {
    await setDoc(userDocRef, sanitizeFirestoreData(docPayload), { merge: true });
    return profile;
  } catch (error) {
    console.error('[Firebase] Error in createFirestoreUserProfile:', error);
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}`);
    return profile;
  }
};

/**
 * Fetch a user profile by UID
 */
export const getFirestoreUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userDocRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      uid,
      name: data.name || 'NVT Member',
      phone: data.phone || '',
      email: data.email || '',
      memberId: data.memberId || `NVT${Math.floor(100000 + Math.random() * 900000)}`,
      referralCode: data.referralCode || data.memberId?.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'NV8829',
      referredBy: data.referredBy || undefined,
      walletBalance:
        typeof data.walletBalance === 'number' && data.walletBalance !== 12450.0
          ? data.walletBalance
          : 0.0,
      memberSince: data.memberSince || 'May 2024',
      isVerified: data.isVerified ?? true,
      avatarUrl: data.avatarUrl,
      fullName: data.fullName,
      transactions: data.transactions || [],
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};

/**
 * Find email associated with a phone number in Firestore
 */
export const findEmailByPhone = async (rawPhone: string): Promise<string | null> => {
  const normalized = normalizePhone(rawPhone);
  if (!normalized) return null;

  // Check localStorage client cache first
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = localStorage.getItem(`nvt_phone_email_${normalized}`);
      if (cached) return cached;
    }
  } catch {
    // ignore
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('phoneNormalized', '==', normalized));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return docData.email || null;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase] Query phone notice:', err);
    return null;
  }
};

/**
 * Update wallet balance in Firestore and maintain consistency
 */
export const updateFirestoreWalletBalance = async (uid: string, newBalance: number): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  try {
    await updateDoc(userDocRef, {
      walletBalance: newBalance,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

/**
 * Update full user profile in Firestore
 */
export const updateFirestoreUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  const userDocRef = doc(db, 'users', uid);
  try {
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    if (updates.phone) {
      payload.phoneNormalized = normalizePhone(updates.phone);
    }
    await updateDoc(userDocRef, sanitizeFirestoreData(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
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
  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const profile: UserProfile = {
          uid,
          name: data.name || 'NVT Member',
          phone: data.phone || '',
          email: data.email || '',
          memberId: data.memberId || `NVT${Math.floor(100000 + Math.random() * 900000)}`,
          referralCode: data.referralCode || data.memberId?.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() || 'NV8829',
          referredBy: data.referredBy || undefined,
          walletBalance:
            typeof data.walletBalance === 'number' && data.walletBalance !== 12450.0
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
  const depositId = data.orderNo || `DEP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const trxId = (data.trxId && data.trxId.trim()) || `TXN-${Date.now().toString().slice(-6)}`;
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
    const userDocRef = doc(db, 'users', uid);

    // 1. If completed: atomically increment wallet balance and push transaction
    // If pending or failed: do NOT increment wallet balance, only push transaction
    const updatePayload: any = {
      transactions: arrayUnion(transactionItem),
      updatedAt: serverTimestamp(),
    };

    if (finalStatus === 'completed') {
      updatePayload.walletBalance = increment(data.amount);
      updatePayload.balance = increment(data.amount);
    }

    await setDoc(userDocRef, updatePayload, { merge: true });

    // 2. Save in deposits collection & subcollection
    try {
      await setDoc(doc(db, 'users', uid, 'deposits', depositId), {
        ...depositItem,
        serverCreatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'deposits', depositId), {
        ...depositItem,
        serverCreatedAt: serverTimestamp(),
      });
    } catch (depErr) {
      console.warn('[Firebase] Non-blocking notice saving deposits collection:', depErr);
    }

    // 3. Save in transactions collection & subcollection
    try {
      await setDoc(doc(db, 'users', uid, 'transactions', trxId), {
        ...transactionItem,
        serverCreatedAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'transactions', trxId), {
        ...transactionItem,
        serverCreatedAt: serverTimestamp(),
      });
    } catch (trxErr) {
      console.warn('[Firebase] Non-blocking notice saving transactions collection:', trxErr);
    }

    console.log(`[Firebase] Successfully recorded deposit [Status: ${finalStatus}]:`, depositItem);
    return { deposit: depositItem, transaction: transactionItem };
  } catch (error) {
    console.error('[Firebase] Error in recordFirestoreDeposit:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
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
    const isCompleted = newStatus === 'completed';
    const statusBangla = isCompleted ? 'সফল' : 'বাতিল';
    const depositStatus = isCompleted ? 'completed' : 'failed';

    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const txns: TransactionRecord[] = userData.transactions || [];
      let foundAmount = amount || 0;

      const updatedTxns = txns.map((t: any) => {
        if (t.id === trxIdOrOrderNo || t.hash === trxIdOrOrderNo || t.orderNo === trxIdOrOrderNo) {
          if (!foundAmount && t.rawAmount) foundAmount = Number(t.rawAmount);
          return {
            ...t,
            status: statusBangla,
            isCredit: isCompleted,
            desc: isCompleted
              ? `ডিপোজিট TrxID: ${trxIdOrOrderNo} (সফল)`
              : `ডিপোজিট TrxID: ${trxIdOrOrderNo} (বাতিল)`,
          };
        }
        return t;
      });

      const updatePayload: any = {
        transactions: updatedTxns,
        updatedAt: serverTimestamp(),
      };

      if (isCompleted && foundAmount > 0) {
        updatePayload.walletBalance = increment(foundAmount);
        updatePayload.balance = increment(foundAmount);
      }

      await updateDoc(userDocRef, updatePayload);
    }

    // Update in deposits collections
    try {
      await updateDoc(doc(db, 'users', uid, 'deposits', trxIdOrOrderNo), {
        status: depositStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}
    try {
      await updateDoc(doc(db, 'deposits', trxIdOrOrderNo), {
        status: isCompleted ? 'Approved' : 'Rejected',
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    // Update in transactions collections
    try {
      await updateDoc(doc(db, 'users', uid, 'transactions', trxIdOrOrderNo), {
        status: statusBangla,
        isCredit: isCompleted,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}
    try {
      await updateDoc(doc(db, 'transactions', trxIdOrOrderNo), {
        status: statusBangla,
        isCredit: isCompleted,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    console.log(`[Firebase] Successfully updated deposit status [${trxIdOrOrderNo} -> ${newStatus}]`);
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
  try {
    // Try user subcollection first
    const subColRef = collection(db, 'users', uid, 'transactions');
    const snap = await getDocs(subColRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as TransactionRecord);
    }

    // Fallback to querying top-level transactions collection
    const txRef = collection(db, 'transactions');
    const q = query(txRef, where('userId', '==', uid));
    const topSnap = await getDocs(q);
    if (!topSnap.empty) {
      return topSnap.docs.map((d) => d.data() as TransactionRecord);
    }

    // Fallback to transactions in user document
    const userDocRef = doc(db, 'users', uid);
    const uSnap = await getDoc(userDocRef);
    if (uSnap.exists()) {
      return uSnap.data().transactions || [];
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
  const subColRef = collection(db, 'users', uid, 'transactions');
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
  try {
    const userDocRef = doc(db, 'users', uid);
    const invId = investment.id || `INV-${Date.now()}`;

    // 1. Save in user's subcollection
    await setDoc(
      doc(db, 'users', uid, 'investments', invId),
      sanitizeFirestoreData({
        ...investment,
        id: invId,
        userId: uid,
        serverCreatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    // 2. Save in top-level investments collection for admin auditing
    await setDoc(
      doc(db, 'investments', invId),
      sanitizeFirestoreData({
        ...investment,
        id: invId,
        userId: uid,
        serverCreatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    // 3. Atomically update user document profile & balance
    await setDoc(
      userDocRef,
      sanitizeFirestoreData({
        walletBalance: updatedBalance,
        vipLevel: newVipLevel,
        dailyRewards: totalDaily,
        activeUnits: allInvestments.length,
        activeInvestments: allInvestments,
        updatedAt: serverTimestamp(),
      }),
      { merge: true }
    );

    console.log('[Firebase] Investment persisted to Firestore successfully:', invId);
  } catch (err) {
    console.warn('[Firebase] Non-blocking notice saving investment to Firestore:', err);
  }
};

export const getFirestoreUserInvestments = async (uid: string): Promise<InvestmentRecord[]> => {
  try {
    const subCol = collection(db, 'users', uid, 'investments');
    const snap = await getDocs(subCol);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as InvestmentRecord);
    }
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists() && Array.isArray(userDoc.data().activeInvestments)) {
      return userDoc.data().activeInvestments;
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

export const saveReferralNodeToFirestore = async (node: ReferralNodeRecord): Promise<void> => {
  try {
    const cleanCode = (node.userCode || '').trim().toUpperCase();
    if (!cleanCode) return;

    const payload = sanitizeFirestoreData({
      ...node,
      userCode: cleanCode,
      referredByCode: (node.referredByCode || '').trim().toUpperCase(),
      memberId: (node.memberId || '').trim().toUpperCase(),
      updatedAt: serverTimestamp(),
    });

    // Write to primary code doc
    await setDoc(doc(db, 'referral_nodes', cleanCode), payload, { merge: true });

    // Also alias by memberId if different from referral code
    if (node.memberId && node.memberId.trim().toUpperCase() !== cleanCode) {
      await setDoc(doc(db, 'referral_nodes', node.memberId.trim().toUpperCase()), payload, { merge: true });
    }

    console.log('[Firebase] Referral node synced to Firestore:', cleanCode);
  } catch (err) {
    console.warn('[Firebase] Notice saving referral node to Firestore:', err);
  }
};

export const syncReferralAccountsFromFirestore = async (): Promise<Record<string, ReferralNodeRecord>> => {
  try {
    const nodesCol = collection(db, 'referral_nodes');
    const snap = await getDocs(nodesCol);
    const result: Record<string, ReferralNodeRecord> = {};

    snap.forEach((d) => {
      const data = d.data() as ReferralNodeRecord;
      if (data.userCode) {
        result[data.userCode.toUpperCase()] = data;
      }
    });

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
  try {
    const claimId = `${uidOrCode.replace(/[^a-zA-Z0-9]/g, '_')}_${tierId.toLowerCase()}`;
    const nowIso = new Date().toISOString();

    const payload = sanitizeFirestoreData({
      id: claimId,
      userId: uidOrCode,
      tierId: tierId.toLowerCase(),
      level,
      amount,
      claimedAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    });

    // 1. Top-level promo claims
    await setDoc(doc(db, 'promo_claims', claimId), payload, { merge: true });

    // 2. User subcollection
    await setDoc(doc(db, 'users', uidOrCode, 'promo_claims', tierId.toLowerCase()), payload, { merge: true });

    console.log('[Firebase] Promo bonus claim persisted to Firestore:', claimId);
  } catch (err) {
    console.warn('[Firebase] Notice recording promo claim to Firestore:', err);
  }
};

export const getFirestorePromoClaims = async (uidOrCode: string): Promise<Record<string, boolean>> => {
  try {
    const result: Record<string, boolean> = {};

    // Check user subcollection
    const subCol = collection(db, 'users', uidOrCode, 'promo_claims');
    const snap = await getDocs(subCol);
    snap.forEach((d) => {
      const data = d.data();
      if (data.tierId) result[data.tierId] = true;
      if (data.level) result[data.level.toLowerCase()] = true;
    });

    if (Object.keys(result).length > 0) return result;

    // Fallback: check top-level promo_claims query
    const topCol = collection(db, 'promo_claims');
    const q = query(topCol, where('userId', '==', uidOrCode));
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
    const docRef = doc(db, 'commissions', comm.id);
    await setDoc(
      docRef,
      sanitizeFirestoreData({
        ...comm,
        serverCreatedAt: serverTimestamp(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firebase] Notice recording commission in Firestore:', err);
  }
};


