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
  findPhoneByEmail,
  normalizePhone,
  isPhoneAlreadyRegistered,
} from '../lib/firebase';
import { registerUserInReferralNetwork } from './referralService';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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
  const transactions = Array.isArray(data.transactions) ? data.transactions : [];
  const vipLevel = typeof data.vipLevel === 'number' ? data.vipLevel : 0;
  const totalEarnings = typeof data.totalEarnings === 'number' ? data.totalEarnings : 0.0;
  const activeUnits = typeof data.activeUnits === 'number' ? data.activeUnits : (Array.isArray(data.activeInvestments) ? data.activeInvestments.length : 0);
  const dailyRewards = typeof data.dailyRewards === 'number' ? data.dailyRewards : 0.0;
  const activeInvestments = Array.isArray(data.activeInvestments) ? data.activeInvestments : [];
  const totalInvested = typeof data.totalInvested === 'number' ? data.totalInvested : 0.0;
  const totalReferralEarnings = typeof data.totalReferralEarnings === 'number' ? data.totalReferralEarnings : 0.0;
  const isAuthenticatorSet = Boolean(data.isAuthenticatorSet);
  const authenticatorSecret = data.authenticatorSecret || undefined;
  const avatarUrl = data.avatarUrl || undefined;
  const fullName = data.fullName || undefined;

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
    vipLevel,
    totalEarnings,
    activeUnits,
    dailyRewards,
    activeInvestments,
    totalInvested,
    totalReferralEarnings,
    isAuthenticatorSet,
    authenticatorSecret,
    avatarUrl,
    fullName,
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
    a.referralCode === b.referralCode &&
    a.referredBy === b.referredBy &&
    a.walletBalance === b.walletBalance &&
    a.memberSince === b.memberSince &&
    a.isVerified === b.isVerified &&
    a.vipLevel === b.vipLevel &&
    a.totalEarnings === b.totalEarnings &&
    a.activeUnits === b.activeUnits &&
    a.dailyRewards === b.dailyRewards &&
    (a.activeInvestments?.length || 0) === (b.activeInvestments?.length || 0) &&
    (a.transactions?.length || 0) === (b.transactions?.length || 0)
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
          // If firestoreProfile is null, the user account has been deleted by an administrator or does not exist.
          // NEVER resurrect or re-create user here. Immediately sign out and clear session!
          console.warn('[AuthService] User profile not found in Firestore. Account may have been removed. Signing out.');
          try {
            await signOut(auth);
          } catch (_) {}
          clearPersistedAuthUser();
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
    const rawInput = emailOrPhone.trim();
    if (!rawInput) {
      return {
        success: false,
        error: lang === 'bn' ? 'অনুগ্রহ করে ইমেইল বা ফোন নম্বর দিন।' : 'Please enter email or phone number.',
      };
    }

    const digits = normalizePhone(rawInput);
    const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

    const emailCandidates: string[] = [];
    const passwordsToTry: string[] = [pass];
    if (pass.trim() && pass.trim() !== pass) {
      passwordsToTry.push(pass.trim());
    }

    let phoneLookupDone = false;
    let foundEmailFromPhone: string | null = null;

    if (rawInput.includes('@')) {
      // 1. User typed an email
      emailCandidates.push(rawInput);
      emailCandidates.push(rawInput.toLowerCase());

      // If user originally registered with phone, look up if this email has an associated phone doc
      try {
        const associatedPhone = await findPhoneByEmail(rawInput);
        if (associatedPhone) {
          const pDigits = normalizePhone(associatedPhone);
          const pLast10 = pDigits.length >= 10 ? pDigits.slice(-10) : pDigits;
          if (pLast10) {
            emailCandidates.push(`${pLast10}@novavest.local`);
            emailCandidates.push(`880${pLast10}@novavest.local`);
            emailCandidates.push(`0${pLast10}@novavest.local`);
          }
          if (pDigits) {
            emailCandidates.push(`${pDigits}@novavest.local`);
          }
        }
      } catch {
        // continue
      }
    } else {
      // 2. User typed a phone number, username, or memberId
      phoneLookupDone = true;

      // Check synchronous local storage mapping first (0ms instant lookup)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keysToTry = [
            `nvt_phone_email_${digits}`,
            `nvt_phone_email_${last10}`,
            `nvt_phone_email_880${last10}`,
            `nvt_phone_email_0${last10}`,
            `nvt_phone_email_${rawInput.trim()}`,
          ];
          for (const k of keysToTry) {
            const cached = localStorage.getItem(k);
            if (cached && cached.includes('@')) {
              emailCandidates.push(cached.trim().toLowerCase());
              emailCandidates.push(cached.trim());
              foundEmailFromPhone = cached.trim();
              break;
            }
          }
        } catch {
          // ignore
        }
      }

      // Fast check from server-side registry (persistent & sub-20ms)
      if (!foundEmailFromPhone && last10) {
        try {
          const srvRes = await fetch(`/api/auth/phone-to-email?phone=${encodeURIComponent(last10)}`, {
            signal: AbortSignal.timeout(800),
          });
          if (srvRes.ok) {
            const srvData = await srvRes.json();
            if (srvData && srvData.found && srvData.email) {
              foundEmailFromPhone = srvData.email;
            }
          }
        } catch {
          // continue
        }
      }

      // Fast Firestore check if server didn't have it
      if (!foundEmailFromPhone) {
        try {
          const remoteFound = await Promise.race([
            findEmailByPhone(rawInput),
            new Promise<null>((res) => setTimeout(() => res(null), 1200)),
          ]);
          if (remoteFound) {
            foundEmailFromPhone = remoteFound;
          }
        } catch {
          // continue with deterministic candidates
        }
      }

      // Build target email list: if real email was found, ONLY use that email!
      if (foundEmailFromPhone) {
        emailCandidates.push(foundEmailFromPhone.trim());
      } else {
        // Fall back to canonical deterministic patterns
        if (last10 && last10.length === 10) {
          emailCandidates.push(`880${last10}@novavest.local`);
          emailCandidates.push(`${last10}@novavest.local`);
          emailCandidates.push(`0${last10}@novavest.local`);
        } else if (digits && digits.length >= 6) {
          emailCandidates.push(`880${digits}@novavest.local`);
          emailCandidates.push(`${digits}@novavest.local`);
        }
        const sanitizedUsername = rawInput.trim().replace(/[^a-zA-Z0-9._-]/g, '');
        if (sanitizedUsername && sanitizedUsername.length >= 3 && !rawInput.includes(' ') && !rawInput.includes('+')) {
          emailCandidates.push(`${sanitizedUsername.toLowerCase()}@novavest.local`);
        }
      }
    }

    // Helper: validate strictly that the email candidate has a valid format before sending to Firebase
    const isValidEmail = (em: string): boolean => {
      if (!em || typeof em !== 'string') return false;
      const trimmed = em.trim();
      return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
    };

    // Deduplicate candidate emails while strictly maintaining order and valid format
    const uniqueCandidates = Array.from(new Set(emailCandidates.map((e) => e.trim()))).filter(isValidEmail);

    let cred: any = null;
    let lastAuthErr: any = null;
    let successfulEmail = uniqueCandidates[0] || '';

    // Iteratively attempt login across candidates
    for (const candEmail of uniqueCandidates) {
      try {
        cred = await signInWithEmailAndPassword(auth, candEmail, pass);
        successfulEmail = candEmail;
        break;
      } catch (err: any) {
        lastAuthErr = err;
        if (err?.code === 'auth/network-request-failed') {
          throw err;
        }
      }
    }

    if (!cred) {
      // If user typed a phone number, give immediate precise feedback
      if (phoneLookupDone) {
        if (foundEmailFromPhone) {
          // Phone exists in registry, password was definitely wrong
          return {
            success: false,
            error:
              lang === 'bn'
                ? 'পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন অথবা "পাসওয়ার্ড ভুলে গেছেন" ব্যবহার করুন।'
                : 'Incorrect password. Please enter the correct password or reset your password.',
          };
        }

        // Fast phone check
        const phoneCheck = await isPhoneAlreadyRegistered(rawInput);
        if (phoneCheck.registered) {
          return {
            success: false,
            error:
              lang === 'bn'
                ? 'পাসওয়ার্ডটি সঠিক নয়। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন অথবা "পাসওয়ার্ড ভুলে গেছেন" ব্যবহার করুন।'
                : 'Incorrect password. Please enter the correct password or reset your password.',
          };
        } else {
          return {
            success: false,
            error:
              lang === 'bn'
                ? 'এই ফোন নম্বরে কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক নম্বর দিন অথবা নতুন অ্যাকাউন্ট তৈরি করুন।'
                : 'No account found for this phone number. Please check the number or sign up.',
          };
        }
      }
      throw lastAuthErr;
    }

    // Fast Firestore profile retrieval (max 1.5s)
    let firestoreUser: UserProfile | null = null;
    try {
      firestoreUser = await Promise.race([
        getFirestoreUserProfile(cred.user.uid),
        new Promise<null>((res) => setTimeout(() => res(null), 1500)),
      ]);
    } catch {
      // fallback
    }

    if (!firestoreUser) {
      // Check if user was permanently deleted by admin
      console.warn('[AuthService] Attempted login to non-existent or deleted account:', cred.user.uid);
      try {
        await signOut(auth);
      } catch (_) {}
      clearPersistedAuthUser();
      return {
        success: false,
        error:
          lang === 'bn'
            ? 'এই অ্যাকাউন্টটি ডাটাবেজে পাওয়া যায়নি বা অ্যাডমিন কর্তৃক মুছে ফেলা হয়েছে।'
            : 'This account was not found or has been removed by the administrator.',
      };
    }

    const user: UserProfile = {
      ...firestoreUser,
      uid: cred.user.uid,
    };

    // Cache phone to email mapping in localStorage for instant 0ms future lookups
    if (user.phone && user.email && typeof window !== 'undefined' && window.localStorage) {
      try {
        const norm = normalizePhone(user.phone);
        const norm10 = norm.slice(-10);
        localStorage.setItem(`nvt_phone_email_${norm}`, user.email);
        if (norm10) {
          localStorage.setItem(`nvt_phone_email_${norm10}`, user.email);
          localStorage.setItem(`nvt_phone_email_0${norm10}`, user.email);
          localStorage.setItem(`nvt_phone_email_880${norm10}`, user.email);
          localStorage.setItem(`nvt_phone_email_8800${norm10}`, user.email);
        }
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
  const digits = normalizePhone(data.phone);
  const last10 = digits.slice(-10);

  if (!finalEmail) {
    finalEmail = last10 && last10.length === 10 ? `880${last10}@novavest.local` : `${digits || 'user_' + Date.now()}@novavest.local`;
  }

  const uplineCode = data.referralCode?.trim().toUpperCase() || undefined;

  // Cache phone-to-email mapping locally so phone sign-in always works instantly
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      if (digits) localStorage.setItem(`nvt_phone_email_${digits}`, finalEmail);
      if (last10) {
        localStorage.setItem(`nvt_phone_email_${last10}`, finalEmail);
        localStorage.setItem(`nvt_phone_email_0${last10}`, finalEmail);
        localStorage.setItem(`nvt_phone_email_880${last10}`, finalEmail);
        localStorage.setItem(`nvt_phone_email_8800${last10}`, finalEmail);
      }
      localStorage.setItem(`nvt_phone_email_${data.phone.trim()}`, finalEmail);
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
      if (authErr?.code === 'auth/email-already-in-use') {
        try {
          cred = await signInWithEmailAndPassword(auth, finalEmail, data.password);
        } catch {
          throw authErr;
        }
      } else {
        throw authErr;
      }
    }

    // 2. Generate local user profile immediately for zero-lag response
    const generatedMemberId = `NVT${Math.floor(100000 + Math.random() * 900000)}`;
    const referralCode = generatedMemberId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase();

    const newUser: UserProfile = {
      uid: cred.user.uid,
      name: data.username.trim() || 'NVT Member',
      phone: data.phone.trim(),
      email: finalEmail,
      memberId: generatedMemberId,
      referralCode,
      referredBy: uplineCode,
      walletBalance: 0.0,
      memberSince: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      isVerified: true,
      transactions: [],
    };

    // 3. Persist and register locally first
    persistAuthUser(newUser);

    // Register phone in persistent server registry
    try {
      fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone.trim(),
          last10,
          uid: cred.user.uid,
          email: finalEmail,
          memberId: generatedMemberId,
        }),
      }).catch(() => {});
    } catch {}

    try {
      await registerUserInReferralNetwork(
        newUser.uid,
        newUser.referralCode,
        uplineCode || newUser.referredBy,
        data.phone.trim(),
        data.username.trim(),
        newUser.memberId
      );
    } catch (refErr) {
      console.warn('[AuthService] registerUserInReferralNetwork notice:', refErr);
    }

    // 4. Firestore persistence - ensure user profile & referral node are saved
    try {
      await Promise.race([
        Promise.all([
          createFirestoreUserProfile(cred.user.uid, {
            name: data.username.trim(),
            phone: data.phone.trim(),
            email: finalEmail,
            memberId: generatedMemberId,
            referralCode,
            referredBy: uplineCode,
            walletBalance: 0.0,
          }),
          data.username ? updateProfile(cred.user, { displayName: data.username.trim() }) : Promise.resolve(),
        ]),
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch (err) {
      console.warn('[AuthService] Firestore user profile creation notice:', err);
    }

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

/**
 * Send password reset email via Firebase Auth (resolves phone if given)
 */
export const sendFirebasePasswordReset = async (
  emailOrPhone: string,
  lang: 'bn' | 'en' = 'bn'
): Promise<{ success: boolean; message: string }> => {
  try {
    const raw = emailOrPhone.trim();
    if (!raw) {
      return {
        success: false,
        message: lang === 'bn' ? 'অনুগ্রহ করে ইমেইল বা ফোন নম্বর লিখুন।' : 'Please enter email or phone number.',
      };
    }

    let targetEmail = raw;
    if (!raw.includes('@')) {
      const found = await findEmailByPhone(raw);
      if (found && found.includes('@') && !found.endsWith('@novavest.local')) {
        targetEmail = found;
      } else {
        return {
          success: false,
          message:
            lang === 'bn'
              ? 'এই ফোন নম্বরের সাথে কোনো রেজিস্টার্ড রিয়েল ইমেইল যুক্ত নেই। অনুগ্রহ করে অ্যাডমিনের সাথে যোগাযোগ করুন বা নতুন অ্যাকাউন্ট তৈরি করুন।'
              : 'No external email address linked to this phone. Please contact support or register.',
        };
      }
    }

    await sendPasswordResetEmail(auth, targetEmail);
    return {
      success: true,
      message:
        lang === 'bn'
          ? `পাসওয়ার্ড রিসেট লিঙ্ক সফলভাবে ${targetEmail} ঠিকানায় পাঠানো হয়েছে। ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।`
          : `Password reset link sent to ${targetEmail}. Please check your inbox or spam folder.`,
    };
  } catch (err: any) {
    console.error('[AuthService] sendPasswordResetEmail error:', err);
    return {
      success: false,
      message: getFriendlyFirebaseError(err, lang),
    };
  }
};
