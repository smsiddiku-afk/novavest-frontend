import { UserProfile } from '../types';
import {
  auth,
  db,
  createFirestoreUserProfile,
  getFirestoreUserProfile,
  updateFirestoreUserProfile,
  updateFirestoreWalletBalance,
  subscribeToFirestoreUserProfile,
  findEmailByPhone,
  normalizePhone,
} from '../lib/firebase';
import { registerUserInReferralNetwork } from './referralService';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged as onFirebaseAuthChanged,
  User as FirebaseUser,
} from 'firebase/auth';

const STORAGE_KEYS = [
  'nvt_auth_user',
  'novavest_auth_user',
  'auth_user',
  'nvt_user_session',
  'currentUser',
];

// In-memory runtime cache to prevent loss during client-side navigation or restricted iframe storage
let inMemoryAuthUser: UserProfile | null = null;
let activeFirestoreUnsubscribe: (() => void) | null = null;

// Safe cookie extraction helper
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
    return match ? decodeURIComponent(match[3]) : null;
  } catch {
    return null;
  }
};

// Safe cookie setter helper
const setCookie = (name: string, value: string, days = 30) => {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
};

// Safe cookie deleter
const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
};

// Helper to normalize parsed user data
const normalizeUser = (data: any): UserProfile | null => {
  if (!data || typeof data !== 'object') return null;

  const uid = data.uid || undefined;
  const name = data.name || data.username || data.fullName || 'NVT Member';
  const phone = data.phone || data.mobile || data.phoneNumber || '+880 1712-345678';
  const email = data.email || 'user@novaterraenergy.io';
  const memberId = data.memberId || data.id || `NVT${Math.floor(100000 + Math.random() * 900000)}`;
  const referralCode =
    data.referralCode ||
    memberId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase() ||
    'NV8829';
  const referredBy = data.referredBy ? data.referredBy.trim().toUpperCase() : undefined;
  const walletBalance =
    typeof data.walletBalance === 'number' && data.walletBalance !== 12450.0
      ? data.walletBalance
      : 0.0;
  const memberSince = data.memberSince || 'May 2024';
  const isVerified = data.isVerified ?? true;
  const transactions = data.transactions || [];

  return {
    uid,
    name,
    phone,
    email,
    memberId,
    referralCode,
    referredBy,
    walletBalance,
    memberSince,
    isVerified,
    transactions,
  };
};

export const isSameUser = (
  a: UserProfile | null | undefined,
  b: UserProfile | null | undefined
): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.uid === b.uid &&
    a.name === b.name &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.memberId === b.memberId &&
    a.walletBalance === b.walletBalance &&
    a.memberSince === b.memberSince &&
    a.isVerified === b.isVerified
  );
};

let lastSerializedAuthUser: string = '';

/**
 * Retrieve current authenticated user with multi-tier fallback:
 * 1. Runtime memory
 * 2. LocalStorage
 * 3. SessionStorage
 * 4. Document Cookie
 */
export const getPersistedAuthUser = (): UserProfile | null => {
  if (inMemoryAuthUser) {
    return inMemoryAuthUser;
  }

  // Check localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    for (const key of STORAGE_KEYS) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const user = normalizeUser(parsed);
          if (user) {
            inMemoryAuthUser = user;
            lastSerializedAuthUser = JSON.stringify(user);
            return user;
          }
        }
      } catch (err) {
        console.warn(`[AuthService] Error reading localStorage key '${key}':`, err);
      }
    }
  }

  // Check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    for (const key of STORAGE_KEYS) {
      try {
        const raw = window.sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const user = normalizeUser(parsed);
          if (user) {
            inMemoryAuthUser = user;
            lastSerializedAuthUser = JSON.stringify(user);
            return user;
          }
        }
      } catch (err) {
        console.warn(`[AuthService] Error reading sessionStorage key '${key}':`, err);
      }
    }
  }

  // Check Document Cookie fallback
  const cookieData = getCookie('nvt_user_session');
  if (cookieData) {
    try {
      const parsed = JSON.parse(cookieData);
      const user = normalizeUser(parsed);
      if (user) {
        inMemoryAuthUser = user;
        lastSerializedAuthUser = JSON.stringify(user);
        return user;
      }
    } catch {
      // ignore
    }
  }

  return null;
};

/**
 * Persist authenticated user across all storage mechanisms & Firestore database
 */
export const persistAuthUser = (user: UserProfile): void => {
  // Deduplicate to prevent infinite re-render / dispatch cycles
  if (isSameUser(inMemoryAuthUser, user)) {
    return;
  }

  const serialized = JSON.stringify(user);
  lastSerializedAuthUser = serialized;
  inMemoryAuthUser = user;

  if (typeof window !== 'undefined') {
    // 1. LocalStorage
    try {
      window.localStorage.setItem('nvt_auth_user', serialized);
      window.localStorage.setItem('auth_user', serialized);
      window.localStorage.removeItem('novavest_auth_user');
    } catch (err) {
      console.warn('[AuthService] Failed to write localStorage:', err);
    }

    // 2. SessionStorage
    try {
      window.sessionStorage.setItem('nvt_auth_user', serialized);
    } catch {
      // ignore
    }

    // 3. Document Cookie
    setCookie('nvt_user_session', serialized, 30);

    // 4. Custom Broadcast Event (emulates onAuthStateChanged) - deferred to microtask/timeout to prevent React render-phase update collisions
    try {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('nvt-auth-state-changed', {
            detail: user,
          })
        );
      }, 0);
    } catch {
      // ignore
    }
  }

  // 5. Cloud Sync with Firestore
  if (user.uid) {
    updateFirestoreUserProfile(user.uid, user).catch((err) => {
      console.warn('[AuthService] Background Firestore sync failed:', err);
    });
  }
};

/**
 * Clear authenticated user from all tiers & notify listeners
 */
export const clearPersistedAuthUser = (): void => {
  if (activeFirestoreUnsubscribe) {
    activeFirestoreUnsubscribe();
    activeFirestoreUnsubscribe = null;
  }

  inMemoryAuthUser = null;
  lastSerializedAuthUser = '';

  if (typeof window !== 'undefined') {
    for (const key of STORAGE_KEYS) {
      try {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    }

    deleteCookie('nvt_user_session');

    try {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('nvt-auth-state-changed', {
            detail: null,
          })
        );
      }, 0);
    } catch {
      // ignore
    }
  }
};

/**
 * Setup continuous listener for Firestore document
 */
const attachFirestoreListener = (uid: string) => {
  if (activeFirestoreUnsubscribe) {
    activeFirestoreUnsubscribe();
  }

  activeFirestoreUnsubscribe = subscribeToFirestoreUserProfile(
    uid,
    (updatedProfile) => {
      if (inMemoryAuthUser && !isSameUser(inMemoryAuthUser, updatedProfile)) {
        inMemoryAuthUser = updatedProfile;
        const serialized = JSON.stringify(updatedProfile);
        lastSerializedAuthUser = serialized;

        if (typeof window !== 'undefined') {
          window.localStorage.setItem('nvt_auth_user', serialized);
          window.dispatchEvent(
            new CustomEvent('nvt-auth-state-changed', {
              detail: updatedProfile,
            })
          );
        }
      }
    },
    (err) => {
      console.warn('[AuthService] Firestore sync listener:', err);
    }
  );
};

// Initialize Firebase Auth State Listener
if (typeof window !== 'undefined') {
  onFirebaseAuthChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      try {
        const firestoreProfile = await getFirestoreUserProfile(firebaseUser.uid);
        if (firestoreProfile) {
          const mergedUser: UserProfile = {
            ...firestoreProfile,
            uid: firebaseUser.uid,
          };
          if (!isSameUser(inMemoryAuthUser, mergedUser)) {
            persistAuthUser(mergedUser);
          }
          attachFirestoreListener(firebaseUser.uid);
        } else {
          // Document not in Firestore yet, create default
          const initialUser = await createFirestoreUserProfile(firebaseUser.uid, {
            name: firebaseUser.displayName || 'NVT Member',
            phone: firebaseUser.phoneNumber || inMemoryAuthUser?.phone || '+880 1712-345678',
            email: firebaseUser.email || 'user@novaterraenergy.io',
            walletBalance:
              inMemoryAuthUser?.walletBalance && inMemoryAuthUser.walletBalance !== 12450.0
                ? inMemoryAuthUser.walletBalance
                : 0.0,
          });
          persistAuthUser(initialUser);
          attachFirestoreListener(firebaseUser.uid);
        }
      } catch (err) {
        console.warn('[AuthService] Error restoring user from Firestore:', err);
      }
    } else {
      if (activeFirestoreUnsubscribe) {
        activeFirestoreUnsubscribe();
        activeFirestoreUnsubscribe = null;
      }
    }
  });
}

/**
 * Convert Firebase Auth errors into helpful bilingual messages
 */
export const getFriendlyFirebaseError = (error: any, lang: 'bn' | 'en' = 'bn'): string => {
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return lang === 'bn'
        ? 'এই ইমেইলটি ইতিমধ্যে নিবন্ধিত রয়েছে। অনুগ্রহ করে সাইন ইন করুন।'
        : 'This email is already registered. Please sign in.';
    case 'auth/invalid-email':
      return lang === 'bn'
        ? 'অনুগ্রহ করে একটি সঠিক ইমেল ঠিকানা দিন।'
        : 'Please enter a valid email address.';
    case 'auth/weak-password':
      return lang === 'bn'
        ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।'
        : 'Password must be at least 6 characters.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return lang === 'bn'
        ? 'ইমেইল/ফোন নম্বর অথবা পাসওয়ার্ড সঠিক নয়।'
        : 'Invalid email/phone or password.';
    case 'auth/network-request-failed':
      return lang === 'bn'
        ? 'ইন্টারনেট সংযোগ বিচ্ছিন্ন। সংযোগটি পরীক্ষা করুন।'
        : 'Network error. Please check your connection.';
    case 'auth/too-many-requests':
      return lang === 'bn'
        ? 'অতিরিক্ত ভুল চেষ্টার কারণে অ্যাকাউন্ট সাময়িক লক হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।'
        : 'Access temporarily blocked due to too many failed attempts. Try again later.';
    default: {
      const msg = error?.message || '';
      if (typeof msg === 'string') {
        try {
          const parsed = JSON.parse(msg);
          if (parsed?.error) {
            if (
              parsed.error.includes('already registered') ||
              parsed.error.includes('already in use') ||
              parsed.error.includes('email-already-in-use')
            ) {
              return lang === 'bn'
                ? 'এই অ্যাকাউন্টটি ইতিমধ্যে নিবন্ধিত রয়েছে। অনুগ্রহ করে সাইন ইন করুন।'
                : 'This account is already registered. Please sign in.';
            }
            return lang === 'bn'
              ? 'নিবন্ধন সম্পন্ন করতে সমস্যা হয়েছে, অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
              : parsed.error;
          }
        } catch {
          // not JSON
        }
        return msg;
      }
      return lang === 'bn' ? 'লগইন বা নিবন্ধন করতে সমস্যা হয়েছে।' : 'Authentication failed.';
    }
  }
};

/**
 * Sign in user with Firebase Authentication & Firestore
 */
export const signInWithFirebase = async (
  emailOrPhone: string,
  pass: string,
  lang: 'bn' | 'en' = 'bn'
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  try {
    let resolvedEmail = emailOrPhone.trim();

    // If identifier is a phone number, search Firestore for corresponding email
    if (!resolvedEmail.includes('@')) {
      const foundEmail = await findEmailByPhone(resolvedEmail);
      if (foundEmail) {
        resolvedEmail = foundEmail;
      } else {
        // Synthesize standard phone-backed email
        const digits = normalizePhone(resolvedEmail);
        resolvedEmail = `${digits || 'user'}@novavest.local`;
      }
    }

    const cred = await signInWithEmailAndPassword(auth, resolvedEmail, pass);
    const firestoreUser = await getFirestoreUserProfile(cred.user.uid);

    let user: UserProfile;
    if (firestoreUser) {
      user = {
        ...firestoreUser,
        uid: cred.user.uid,
      };
    } else {
      user = await createFirestoreUserProfile(cred.user.uid, {
        name: cred.user.displayName || (resolvedEmail.includes('@') ? resolvedEmail.split('@')[0] : 'NVT Member'),
        phone: resolvedEmail.endsWith('@novavest.local') ? emailOrPhone : '+880 1712-345678',
        email: cred.user.email || resolvedEmail,
        walletBalance: 0.0,
      });
    }

    // Cache phone to email mapping
    if (user.phone && user.email && typeof window !== 'undefined' && window.localStorage) {
      try {
        const norm = normalizePhone(user.phone);
        if (norm) localStorage.setItem(`nvt_phone_email_${norm}`, user.email);
      } catch {
        // ignore
      }
    }

    persistAuthUser(user);
    attachFirestoreListener(user.uid!);

    return { success: true, user };
  } catch (err: any) {
    console.error('[AuthService] signInWithFirebase error:', err);
    return {
      success: false,
      error: getFriendlyFirebaseError(err, lang),
    };
  }
};

/**
 * Register user with Firebase Authentication & create Firestore document
 */
export const registerWithFirebase = async (
  data: {
    email?: string;
    phone: string;
    username: string;
    password: string;
    referralCode?: string;
  },
  lang: 'bn' | 'en' = 'bn'
): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
  let finalEmail = data.email?.trim();
  if (!finalEmail) {
    const digits = normalizePhone(data.phone);
    finalEmail = `${digits || 'user_' + Date.now()}@novavest.local`;
  }

  const uplineCode = data.referralCode?.trim().toUpperCase() || undefined;

  // Cache phone-to-email mapping locally so phone sign-in always works
  const normPhone = normalizePhone(data.phone);
  if (normPhone && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`nvt_phone_email_${normPhone}`, finalEmail);
    } catch {
      // ignore
    }
  }

  try {
    // 1. Create Firebase Auth user
    let cred: any;
    try {
      cred = await createUserWithEmailAndPassword(auth, finalEmail, data.password);
    } catch (authErr: any) {
      // Auto-recovery: If user was created in Firebase Auth in a previous step where
      // Firestore setDoc failed, attempt to sign in with the provided password!
      if (authErr?.code === 'auth/email-already-in-use') {
        try {
          cred = await signInWithEmailAndPassword(auth, finalEmail, data.password);
        } catch {
          // Password didn't match existing account -> throw original error
          throw authErr;
        }
      } else {
        throw authErr;
      }
    }

    // 2. Set Firebase Auth Display Name
    if (data.username && cred?.user) {
      try {
        await updateProfile(cred.user, { displayName: data.username.trim() });
      } catch {
        // ignore non-critical
      }
    }

    // 3. Create or sync Firestore User Document with real zero initial wallet balance (0.0 BDT)
    const newUser = await createFirestoreUserProfile(cred.user.uid, {
      name: data.username.trim(),
      phone: data.phone.trim(),
      email: finalEmail,
      referredBy: uplineCode,
      walletBalance: 0.0,
    });

    // 4. Register in referral network ledger so the inviter sees the new member immediately
    registerUserInReferralNetwork(
      newUser.uid,
      newUser.referralCode,
      uplineCode || newUser.referredBy,
      data.phone.trim(),
      data.username.trim()
    );

    persistAuthUser(newUser);
    attachFirestoreListener(newUser.uid!);

    return { success: true, user: newUser };
  } catch (err: any) {
    console.error('[AuthService] registerWithFirebase error:', err);
    return {
      success: false,
      error: getFriendlyFirebaseError(err, lang),
    };
  }
};

/**
 * Sign out user from Firebase Authentication
 */
export const signOutFromFirebase = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('[AuthService] Error signing out from Firebase:', err);
  } finally {
    clearPersistedAuthUser();
  }
};

/**
 * Listener matching Firebase onAuthStateChanged pattern
 */
export const onAuthStateChanged = (
  callback: (user: UserProfile | null) => void
): (() => void) => {
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<UserProfile | null>;
    callback(customEvt.detail);
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key && STORAGE_KEYS.includes(e.key)) {
      const updated = getPersistedAuthUser();
      callback(updated);
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('nvt-auth-state-changed', handleCustomEvent);
    window.addEventListener('storage', handleStorageEvent);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('nvt-auth-state-changed', handleCustomEvent);
      window.removeEventListener('storage', handleStorageEvent);
    }
  };
};
