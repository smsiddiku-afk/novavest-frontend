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

  const profile: UserProfile = {
    uid,
    name: data.name.trim() || 'NVT Member',
    phone: data.phone.trim(),
    email: data.email.trim(),
    memberId: cleanMemberId,
    referralCode,
    referredBy: data.referredBy?.trim().toUpperCase() || undefined,
    walletBalance:
      typeof data.walletBalance === 'number' && data.walletBalance !== 12450.0
        ? data.walletBalance
        : 0.0,
    memberSince,
    isVerified: true,
  };

  try {
    await setDoc(userDocRef, {
      ...profile,
      phoneNormalized: normalizePhone(profile.phone),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return profile;
  } catch (error) {
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
    console.warn('[Firebase] Query phone failed:', err);
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
    await updateDoc(userDocRef, payload);
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
  }
): Promise<{ deposit: DepositRecord; transaction: TransactionRecord }> => {
  const depositId = data.orderNo || `DEP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const trxId = (data.trxId && data.trxId.trim()) || `TXN-${Date.now().toString().slice(-6)}`;
  const now = new Date();

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const depositItem: DepositRecord = {
    id: depositId,
    userId: uid,
    amount: data.amount,
    method: data.method || 'bKash',
    channel: data.channel || 'Instant Auto',
    trxId: trxId,
    senderPhone: data.senderPhone || '',
    orderNo: data.orderNo || depositId,
    status: 'completed',
    createdAt: now.toISOString(),
    dateFormatted: `${dateStr} ${timeStr}`,
  };

  const transactionItem: TransactionRecord = {
    id: trxId,
    userId: uid,
    type: 'recharge',
    title: `ওয়ালেট রিচার্জ (${data.method || 'bKash'})`,
    desc: `ডিপোজিট TrxID: ${trxId}`,
    amount: `+৳${data.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    rawAmount: data.amount,
    time: `আজ, ${timeStr}`,
    date: dateStr,
    status: 'সফল',
    channel: `${data.method || 'bKash'} (${data.channel || 'Merchant Gateway'})`,
    isCredit: true,
    hash: trxId,
    createdAt: now.toISOString(),
  };

  try {
    const userDocRef = doc(db, 'users', uid);

    // 1. Atomically increment wallet balance and push transaction into user profile
    await setDoc(
      userDocRef,
      {
        walletBalance: increment(data.amount),
        transactions: arrayUnion(transactionItem),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

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

    console.log('[Firebase] Successfully recorded deposit & credited wallet:', depositItem);
    return { deposit: depositItem, transaction: transactionItem };
  } catch (error) {
    console.error('[Firebase] Error in recordFirestoreDeposit:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    return { deposit: depositItem, transaction: transactionItem };
  }
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

