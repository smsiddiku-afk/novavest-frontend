/**
 * Referral & Multi-Tier Commission System
 * 
 * Rules:
 * 1. Each user gets a unique invitation code (e.g. 6-digit alphanumeric based on memberId or custom generated).
 * 2. 3-Tier hierarchy:
 *    - Tier 1 (Level 1): Direct invitees (user signed up with your code). Commission: 7%
 *    - Tier 2 (Level 2): Invitees of your Tier 1 invitees. Commission: 3%
 *    - Tier 3 (Level 3): Invitees of your Tier 2 invitees. Commission: 1%
 * 3. Whenever someone in your 3-level tree deposits/recharges/invests, the commission is calculated and credited to the uplines.
 * 4. Local persistence fallback + cloud sync via localStorage & Firestore user docs.
 */

import {
  db,
  saveReferralNodeToFirestore,
  syncReferralAccountsFromFirestore,
  recordCommissionInFirestore,
  creditUserCommissionInFirestore,
} from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface TeamMember {
  id: string;
  phone: string;
  username?: string;
  level: 1 | 2 | 3;
  date: string;
  investAmount: number;
  commissionEarned: number;
  status: 'active' | 'pending';
  referralCode?: string;
  referredBy?: string;
  referredByName?: string;
}

export interface CommissionLog {
  id: string;
  recipientCode: string;
  sourceUserCode: string;
  sourcePhone?: string;
  level: 1 | 2 | 3;
  rate: number;
  depositAmount: number;
  commissionAmount: number;
  timestamp: string; // ISO string
}

export interface ReferralTreeSummary {
  userCode: string;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalTeamCount: number;
  activeLevel1Count: number;
  activeLevel2Count: number;
  activeLevel3Count: number;
  totalActiveCount: number;
  level1Earnings: number;
  level2Earnings: number;
  level3Earnings: number;
  totalEarnings: number;
  todayEarnings: number;
  yesterdayEarnings: number;
  availableRewards: number;
  members: TeamMember[];
}

export const TIER_COMMISSION_RATES: Record<1 | 2 | 3, number> = {
  1: 0.06, // 6% for Tier 1
  2: 0.03, // 3% for Tier 2
  3: 0.01, // 1% for Tier 3
};

export async function loadCommissionRatesFromFirestore(): Promise<{ tier1: number; tier2: number; tier3: number }> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const ref = doc(db, 'settings', 'commissionRates');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as { tier1?: number; tier2?: number; tier3?: number };
      if (typeof data.tier1 === 'number') TIER_COMMISSION_RATES[1] = data.tier1;
      if (typeof data.tier2 === 'number') TIER_COMMISSION_RATES[2] = data.tier2;
      if (typeof data.tier3 === 'number') TIER_COMMISSION_RATES[3] = data.tier3;
    }
  } catch (err) {
    console.warn('[ReferralService] loadCommissionRatesFromFirestore error:', err);
  }
  return {
    tier1: TIER_COMMISSION_RATES[1],
    tier2: TIER_COMMISSION_RATES[2],
    tier3: TIER_COMMISSION_RATES[3],
  };
}

export async function saveCommissionRatesToFirestore(tier1Percent: number, tier2Percent: number, tier3Percent: number): Promise<void> {
  const t1 = Number((tier1Percent / 100).toFixed(4));
  const t2 = Number((tier2Percent / 100).toFixed(4));
  const t3 = Number((tier3Percent / 100).toFixed(4));
  TIER_COMMISSION_RATES[1] = t1;
  TIER_COMMISSION_RATES[2] = t2;
  TIER_COMMISSION_RATES[3] = t3;
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const ref = doc(db, 'settings', 'commissionRates');
    await setDoc(ref, {
      tier1: t1,
      tier2: t2,
      tier3: t3,
      tier1Percent,
      tier2Percent,
      tier3Percent,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('[ReferralService] saveCommissionRatesToFirestore error:', err);
    throw err;
  }
}

if (typeof window !== 'undefined') {
  loadCommissionRatesFromFirestore().catch(() => {});
}

export const STORAGE_KEY_REWARDS = 'referral_cash_rewards';
export const STORAGE_KEY_ACCOUNTS = 'novavest_registered_accounts';
export const STORAGE_KEY_COMMISSION_LOGS = 'novavest_commission_logs';

/**
 * Generate all normalized code variants for reliable matching:
 * - Trims and uppercases
 * - Handles NVT prefix (NVT440912 -> 440912, NV440912)
 * - Handles NV prefix (NV8829 -> 8829, NVT8829)
 * - Handles pure numbers (440912 -> NVT440912, NV440912)
 * - Handles phone numbers (+88017..., 017...)
 */
export function getAllCodeVariants(code?: string): string[] {
  if (!code) return [];
  let rawStr = code.toString().trim();
  if (!rawStr) return [];

  // If user pasted a full URL as referral code, extract the ref parameter or path
  if (rawStr.includes('http') || rawStr.includes('?') || rawStr.includes('&')) {
    try {
      const match = rawStr.match(/[?&](?:ref|referral|code|invite|inviter)=([^&#]+)/i);
      if (match && match[1]) {
        rawStr = match[1];
      }
    } catch {}
  }

  const clean = rawStr.toUpperCase();
  const set = new Set<string>();
  set.add(clean);

  // Strip spaces, dashes, slashes, underscores
  const stripped = clean.replace(/[\s\-_\/]/g, '');
  if (stripped) {
    set.add(stripped);
  }

  const checkPrefixes = [clean, stripped];
  checkPrefixes.forEach((item) => {
    if (item.startsWith('NVT')) {
      const raw = item.slice(3);
      if (raw) {
        set.add(raw);
        set.add(`NV${raw}`);
        set.add(`NVT${raw}`);
        set.add(`NV-${raw}`);
        set.add(`NVT-${raw}`);
      }
    }
    if (item.startsWith('NV') && !item.startsWith('NVT')) {
      const raw = item.slice(2);
      if (raw) {
        set.add(raw);
        set.add(`NV${raw}`);
        set.add(`NVT${raw}`);
        set.add(`NV-${raw}`);
        set.add(`NVT-${raw}`);
      }
    }
  });

  // Pure digits: e.g. "8829" or "481923"
  const pureDigits = stripped.replace(/\D/g, '');
  if (pureDigits) {
    if (pureDigits === stripped) {
      set.add(pureDigits);
      set.add(`NV${pureDigits}`);
      set.add(`NVT${pureDigits}`);
      set.add(`NV-${pureDigits}`);
      set.add(`NVT-${pureDigits}`);
    }

    // Phone number handling (Bangladesh +880 and 01...)
    if (pureDigits.length >= 10) {
      const last10 = pureDigits.slice(-10);
      set.add(pureDigits);
      set.add(last10);
      set.add(`0${last10}`);
      set.add(`880${last10}`);
      set.add(`+880${last10}`);
      set.add(`+880 ${last10}`);
      set.add(`0${last10.slice(0, 4)} ${last10.slice(4)}`);
      set.add(`+880 ${last10.slice(0, 4)}-${last10.slice(4)}`);
    }
  }

  return Array.from(set);
}

/**
 * Match two codes flexibly across all variants
 */
export function codesMatch(code1?: string, code2?: string): boolean {
  if (!code1 || !code2) return false;
  const v1 = getAllCodeVariants(code1);
  const v2 = new Set(getAllCodeVariants(code2));
  return v1.some((x) => v2.has(x));
}

/**
 * Extract all normalized identifier variants from an account object
 * NOTE: Username is strictly excluded to prevent accidental collisions across accounts with generic names
 */
export function getAccountIdentifiers(acc: any): string[] {
  if (!acc) return [];
  const set = new Set<string>();
  if (acc.userCode) getAllCodeVariants(acc.userCode).forEach((v) => set.add(v));
  if (acc.memberId) getAllCodeVariants(acc.memberId).forEach((v) => set.add(v));
  if (acc.referralCode) getAllCodeVariants(acc.referralCode).forEach((v) => set.add(v));
  if (acc.userId) set.add(acc.userId.toString().trim());
  if (acc.uid) set.add(acc.uid.toString().trim());
  if (acc.phone) getAllCodeVariants(acc.phone).forEach((v) => set.add(v));
  return Array.from(set);
}

export const PENDING_REFERRAL_KEY = 'nvt_pending_referral_code';

/**
 * Save pending referral code across both sessionStorage and localStorage
 */
export function savePendingReferralCode(code: string): void {
  if (typeof window === 'undefined' || !code) return;
  const clean = code.trim().toUpperCase();
  if (!clean) return;
  try {
    sessionStorage.setItem(PENDING_REFERRAL_KEY, clean);
    localStorage.setItem(PENDING_REFERRAL_KEY, clean);
  } catch {}
}

/**
 * Clear pending referral code once registered
 */
export function clearPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_REFERRAL_KEY);
    localStorage.removeItem(PENDING_REFERRAL_KEY);
  } catch {}
}

/**
 * Extract referral code from URL query (?ref=, ?referral=, ?code=, ?invite=)
 * or URL hash or previously stored session/local storage
 */
export function extractPendingReferralCode(): string {
  if (typeof window === 'undefined') return '';
  try {
    // 1. Check window.location.search
    const urlParams = new URLSearchParams(window.location.search);
    let code =
      urlParams.get('ref') ||
      urlParams.get('referral') ||
      urlParams.get('code') ||
      urlParams.get('invite') ||
      urlParams.get('inviter');

    // 2. Check window.location.hash
    if (!code && window.location.hash) {
      const hashStr = window.location.hash;
      const qIdx = hashStr.indexOf('?');
      if (qIdx !== -1) {
        const hashParams = new URLSearchParams(hashStr.substring(qIdx));
        code =
          hashParams.get('ref') ||
          hashParams.get('referral') ||
          hashParams.get('code') ||
          hashParams.get('invite') ||
          hashParams.get('inviter');
      }
    }

    // 3. Save to storage if found in URL
    if (code && code.trim()) {
      const clean = code.trim().toUpperCase();
      savePendingReferralCode(clean);
      return clean;
    }

    // 4. Check stored from prior visit/redirect
    const fromSession = sessionStorage.getItem(PENDING_REFERRAL_KEY);
    if (fromSession && fromSession.trim()) return fromSession.trim().toUpperCase();

    const fromLocal = localStorage.getItem(PENDING_REFERRAL_KEY);
    if (fromLocal && fromLocal.trim()) return fromLocal.trim().toUpperCase();
  } catch {}
  return '';
}

/**
 * Generate a clean, memorable 6-character referral code
 */
export function generateUniqueReferralCode(seed?: string): string {
  if (seed) {
    const cleaned = seed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.length >= 6) {
      return cleaned.slice(0, 6);
    }
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Mask phone number for clean privacy display (e.g. 017*****412)
 */
export function maskPhone(phone: string): string {
  if (!phone) return '017*****888';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 8) return phone;
  const prefix = clean.slice(-11, -8) || clean.slice(0, 3);
  const suffix = clean.slice(-3);
  return `${prefix}*****${suffix}`;
}

/**
 * Register a user into the referral ledger and persist to Firestore
 */
export async function registerUserInReferralNetwork(
  userId: string,
  userCode: string,
  referredByCode?: string,
  phone?: string,
  username?: string,
  memberId?: string
): Promise<void> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    const accounts: Record<string, {
      userId: string;
      userCode: string;
      memberId?: string;
      referredByCode: string;
      phone: string;
      username: string;
      joinedAt: string;
      investAmount: number;
    }> = raw ? JSON.parse(raw) : {};

    const cleanCode = (userCode || '').trim().toUpperCase();
    const cleanReferredBy = (referredByCode || '').trim().toUpperCase();
    const cleanMemberId = (memberId || '').trim().toUpperCase();

    if (!cleanCode) return;

    const nodeData = {
      userId,
      userCode: cleanCode,
      memberId: cleanMemberId || undefined,
      referredByCode: cleanReferredBy,
      phone: phone || '',
      username: username || 'User',
      joinedAt: new Date().toISOString(),
      investAmount: accounts[cleanCode]?.investAmount || 0,
    };

    accounts[cleanCode] = nodeData;
    if (cleanMemberId) {
      accounts[cleanMemberId] = nodeData;
    }
    if (userId) {
      accounts[userId] = nodeData;
    }

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('referral_rewards_updated'));
      window.dispatchEvent(new Event('storage'));
    }

    // Cloud Firestore Sync: persist referral node
    try {
      await saveReferralNodeToFirestore(nodeData);
    } catch (err) {
      console.warn('[ReferralService] Cloud Firestore node save notice:', err);
    }
  } catch (err) {
    console.warn('[ReferralService] Failed to save to accounts store:', err);
  }
}

/**
 * Compute the 3-tier team tree for any user given their personal referral code or memberId
 *
 * Rules:
 * Level 1 (১ম লেভেল): Direct invitees whose referredByCode matches this user.
 * Level 2 (২য় লেভেল): Invitees whose referredByCode matches any Level 1 member ("প্রথম লেবেলে মেম্বার যদি আর একজন কে রেফার করে সেটি আমার দ্বিতীয় লেভেলে যুক্ত হবে").
 * Level 3 (৩য় লেভেল): Invitees whose referredByCode matches any Level 2 member ("দ্বিতীয় লেভেলের মেম্বার যদি রেফার করে সেটা তৃতীয় রেফার যাবে এভাবে").
 */
export function getReferralTreeForUser(
  userCode: string,
  userMemberId?: string,
  customAccounts?: Record<string, any>
): ReferralTreeSummary {
  const cleanUserCode = (userCode || 'NV8829').trim().toUpperCase();
  const cleanMemberId = (userMemberId || '').trim().toUpperCase();

  // Retrieve accounts from custom parameter (real-time stream) or localStorage
  let accounts: Record<string, any> = customAccounts || {};
  if (!customAccounts || Object.keys(customAccounts).length === 0) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (raw) accounts = JSON.parse(raw);
    } catch {
      accounts = {};
    }
  }

  // Deduplicate accounts into a single list of unique users
  const uniqueAccounts: any[] = [];
  const seenUserKeys = new Set<string>();

  Object.values(accounts).forEach((acc: any) => {
    if (!acc) return;
    const primaryUid = (acc.userId || acc.uid || '').toString().trim();
    const primaryPhone = (acc.phone ? acc.phone.replace(/\D/g, '').slice(-10) : '').trim();
    const primaryCode = (acc.userCode || acc.memberId || '').toString().trim().toUpperCase();

    // Composite unique key prevents merging distinct users that lack a uid
    const uniqueKey =
      primaryUid ||
      (primaryPhone ? `phone_${primaryPhone}` : '') ||
      (primaryCode ? `code_${primaryCode}` : '');
    if (!uniqueKey) return;
    if (seenUserKeys.has(uniqueKey)) return;
    seenUserKeys.add(uniqueKey);
    uniqueAccounts.push(acc);
  });

  // Collect all identifiers for Root User (Strict codes and phone only - never username)
  const rootIdentifiers = new Set<string>();
  getAllCodeVariants(cleanUserCode).forEach((v) => rootIdentifiers.add(v));
  if (cleanMemberId) {
    getAllCodeVariants(cleanMemberId).forEach((v) => rootIdentifiers.add(v));
  }

  // Also discover if Root User's record is in uniqueAccounts and extract their phone, userId, and uid
  uniqueAccounts.forEach((acc) => {
    if (!acc) return;
    const ids = getAccountIdentifiers(acc);
    if (ids.some((id) => rootIdentifiers.has(id))) {
      ids.forEach((id) => rootIdentifiers.add(id));
      if (acc.phone) {
        getAllCodeVariants(acc.phone).forEach((v) => rootIdentifiers.add(v));
      }
      if (acc.userId) {
        rootIdentifiers.add(acc.userId.toString().trim());
      }
      if (acc.uid) {
        rootIdentifiers.add(acc.uid.toString().trim());
      }
    }
  });

  const isRootUser = (acc: any) => {
    const ids = getAccountIdentifiers(acc);
    return ids.some((id) => rootIdentifiers.has(id));
  };

  const matchesIdentifiers = (refCode: string | undefined, identSet: Set<string>): boolean => {
    if (!refCode) return false;
    const variants = getAllCodeVariants(refCode);
    return variants.some((v) => identSet.has(v));
  };

  const members: TeamMember[] = [];
  const visitedAccountIds = new Set<string>();

  const getAccountId = (acc: any): string => {
    const uid = (acc.userId || acc.uid || '').toString().trim();
    const phone = (acc.phone ? acc.phone.replace(/\D/g, '').slice(-10) : '').trim();
    const code = (acc.userCode || acc.memberId || '').toString().trim().toUpperCase();
    return uid || (phone ? `p_${phone}` : '') || (code ? `c_${code}` : `rnd_${Math.random()}`);
  };

  const isAccountActive = (acc: any): boolean => {
    if (!acc) return false;
    // Strict business rule: A member is ONLY active if they have recharged or made a paid investment.
    // Signup welcome bonus, initial wallet balance, or registration status alone NEVER makes them active.
    const invest = Number(
      acc.investAmount ||
      acc.totalInvested ||
      acc.totalRecharge ||
      acc.totalDeposit ||
      0
    );
    const hasPaidInv =
      Array.isArray(acc.activeInvestments) &&
      acc.activeInvestments.some((inv: any) => Number(inv.amount || inv.investAmount || 0) > 0);

    return invest > 0 || hasPaidInv;
  };

  // -------------------------------------------------------------
  // LEVEL 1: Direct Referrals
  // -------------------------------------------------------------
  const l1Accounts: any[] = [];
  const l1Identifiers = new Set<string>();

  uniqueAccounts.forEach((acc) => {
    if (isRootUser(acc)) return;
    if (matchesIdentifiers(acc.referredByCode, rootIdentifiers)) {
      const accId = getAccountId(acc);
      if (!visitedAccountIds.has(accId)) {
        visitedAccountIds.add(accId);
        l1Accounts.push(acc);
        getAccountIdentifiers(acc).forEach((id) => l1Identifiers.add(id));

        const invest = Number(
          acc.investAmount ||
          acc.totalInvested ||
          acc.totalRecharge ||
          acc.totalDeposit ||
          0
        );
        const comm = Number((invest * TIER_COMMISSION_RATES[1]).toFixed(2));
        const active = isAccountActive(acc);
        members.push({
          id: `REF-L1-${acc.userCode || accId}`,
          phone: maskPhone(acc.phone),
          username: acc.username || 'Member',
          level: 1,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Today',
          investAmount: invest,
          commissionEarned: comm,
          status: active ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: cleanUserCode,
          referredByName: 'You (Direct)',
        });
      }
    }
  });

  // -------------------------------------------------------------
  // LEVEL 2: Referrals by Level 1 Members
  // "প্রথম লেবেলে মেম্বার যদি আর একজন কে রেফার করে সেটি আমার দ্বিতীয় লেভেলে যুক্ত হবে"
  // -------------------------------------------------------------
  const l2Accounts: any[] = [];
  const l2Identifiers = new Set<string>();

  if (l1Identifiers.size > 0) {
    uniqueAccounts.forEach((acc) => {
      if (isRootUser(acc)) return;
      const accId = getAccountId(acc);
      if (visitedAccountIds.has(accId)) return;

      if (matchesIdentifiers(acc.referredByCode, l1Identifiers)) {
        visitedAccountIds.add(accId);
        l2Accounts.push(acc);
        getAccountIdentifiers(acc).forEach((id) => l2Identifiers.add(id));

        // Find parent in L1 for display
        const parentL1 = l1Accounts.find((p) => {
          const pIds = new Set(getAccountIdentifiers(p));
          return getAllCodeVariants(acc.referredByCode).some((v) => pIds.has(v));
        });

        const invest = Number(
          acc.investAmount ||
          acc.totalInvested ||
          acc.totalRecharge ||
          acc.totalDeposit ||
          0
        );
        const comm = Number((invest * TIER_COMMISSION_RATES[2]).toFixed(2));
        const active = isAccountActive(acc);
        members.push({
          id: `REF-L2-${acc.userCode || accId}`,
          phone: maskPhone(acc.phone),
          username: acc.username || 'Member',
          level: 2,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: active ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: parentL1 ? parentL1.userCode : acc.referredByCode,
          referredByName: parentL1 ? maskPhone(parentL1.phone) : 'L1 Member',
        });
      }
    });
  }

  // -------------------------------------------------------------
  // LEVEL 3: Referrals by Level 2 Members
  // "দ্বিতীয় লেভেলের মেম্বার যদি রেফার করে সেটা তৃতীয় রেফার যাবে এভাবে"
  // -------------------------------------------------------------
  const l3Accounts: any[] = [];

  if (l2Identifiers.size > 0) {
    uniqueAccounts.forEach((acc) => {
      if (isRootUser(acc)) return;
      const accId = getAccountId(acc);
      if (visitedAccountIds.has(accId)) return;

      if (matchesIdentifiers(acc.referredByCode, l2Identifiers)) {
        visitedAccountIds.add(accId);
        l3Accounts.push(acc);

        // Find parent in L2 for display
        const parentL2 = l2Accounts.find((p) => {
          const pIds = new Set(getAccountIdentifiers(p));
          return getAllCodeVariants(acc.referredByCode).some((v) => pIds.has(v));
        });

        const invest = Number(
          acc.investAmount ||
          acc.totalInvested ||
          acc.totalRecharge ||
          acc.totalDeposit ||
          0
        );
        const comm = Number((invest * TIER_COMMISSION_RATES[3]).toFixed(2));
        const active = isAccountActive(acc);
        members.push({
          id: `REF-L3-${acc.userCode || accId}`,
          phone: maskPhone(acc.phone),
          username: acc.username || 'Member',
          level: 3,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: active ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: parentL2 ? parentL2.userCode : acc.referredByCode,
          referredByName: parentL2 ? maskPhone(parentL2.phone) : 'L2 Member',
        });
      }
    });
  }

  // Calculate active counts
  const activeLevel1Count = l1Accounts.filter(isAccountActive).length;
  const activeLevel2Count = l2Accounts.filter(isAccountActive).length;
  const activeLevel3Count = l3Accounts.filter(isAccountActive).length;
  const totalActiveCount = activeLevel1Count + activeLevel2Count + activeLevel3Count;

  // Retrieve commission logs for this user
  let commissionLogs: CommissionLog[] = [];
  try {
    const rawLogs = localStorage.getItem(STORAGE_KEY_COMMISSION_LOGS);
    if (rawLogs) {
      commissionLogs = JSON.parse(rawLogs);
    }
  } catch {}

  const myLogs = commissionLogs.filter((log) => matchesIdentifiers(log.recipientCode, rootIdentifiers));

  let l1Earnings = 0;
  let l2Earnings = 0;
  let l3Earnings = 0;
  let todayEarnings = 0;
  let yesterdayEarnings = 0;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Sum earnings from real commission logs if available
  if (myLogs.length > 0) {
    myLogs.forEach((log) => {
      const amt = Number(log.commissionAmount) || 0;
      if (log.level === 1) l1Earnings += amt;
      else if (log.level === 2) l2Earnings += amt;
      else if (log.level === 3) l3Earnings += amt;

      const logDate = log.timestamp ? log.timestamp.split('T')[0] : '';
      if (logDate === todayStr) {
        todayEarnings += amt;
      } else if (logDate === yesterdayStr) {
        yesterdayEarnings += amt;
      }
    });
  } else {
    // If no logs yet, calculate based on current active investment rates
    l1Accounts.forEach((acc) => {
      l1Earnings += Number(acc.investAmount || 0) * TIER_COMMISSION_RATES[1];
    });
    l2Accounts.forEach((acc) => {
      l2Earnings += Number(acc.investAmount || 0) * TIER_COMMISSION_RATES[2];
    });
    l3Accounts.forEach((acc) => {
      l3Earnings += Number(acc.investAmount || 0) * TIER_COMMISSION_RATES[3];
    });
  }

  const totalEarnings = l1Earnings + l2Earnings + l3Earnings;

  // Available claimable cash rewards
  let savedRewards = 0;
  try {
    const userSpecificKey = `${STORAGE_KEY_REWARDS}_${cleanUserCode}`;
    const rawRewards = localStorage.getItem(userSpecificKey) || localStorage.getItem(STORAGE_KEY_REWARDS);
    if (rawRewards) {
      savedRewards = Number(rawRewards);
    } else {
      savedRewards = totalEarnings;
    }
  } catch {
    savedRewards = totalEarnings;
  }

  return {
    userCode: cleanUserCode,
    level1Count: l1Accounts.length,
    level2Count: l2Accounts.length,
    level3Count: l3Accounts.length,
    totalTeamCount: l1Accounts.length + l2Accounts.length + l3Accounts.length,
    activeLevel1Count,
    activeLevel2Count,
    activeLevel3Count,
    totalActiveCount,
    level1Earnings: Number(l1Earnings.toFixed(2)),
    level2Earnings: Number(l2Earnings.toFixed(2)),
    level3Earnings: Number(l3Earnings.toFixed(2)),
    totalEarnings: Number(totalEarnings.toFixed(2)),
    todayEarnings: Number(todayEarnings.toFixed(2)),
    yesterdayEarnings: Number(yesterdayEarnings.toFixed(2)),
    availableRewards: Number(savedRewards.toFixed(2)),
    members,
  };
}

/**
 * When any user deposits or activates an investment package, distribute 3-tier commissions to their uplines!
 * - Level 1 direct upline gets 7%
 * - Level 2 grandparent upline gets 3%
 * - Level 3 great-grandparent upline gets 1%
 */
/**
 * Cloud-based 3-level referral commission distribution
 * Reads live data directly from Firestore to ensure all 3 upline levels get credited reliably
 * even if local cache is fresh or from another browser/session.
 */
export async function distributeReferralDepositCommissionsCloud(
  depositUserCode: string,
  depositAmount: number,
  currentUserCode?: string,
  depositTxnId?: string
): Promise<{
  creditedUpline: boolean;
  commissionsDistributed: Array<{ uplineCode: string; level: number; amount: number }>;
}> {
  const result = {
    creditedUpline: false,
    commissionsDistributed: [] as Array<{ uplineCode: string; level: number; amount: number }>,
  };

  const cleanDepositCode = (depositUserCode || '').trim().toUpperCase();
  if (!cleanDepositCode || depositAmount <= 0) return result;

  try {
    // 1. Deduplication check if transaction or order ID is provided
    if (depositTxnId) {
      const dedupKey = `novavest_cloud_comm_done_${depositTxnId}`;
      if (typeof window !== 'undefined' && localStorage.getItem(dedupKey)) {
        console.log('[ReferralService Cloud] Commission already distributed for txn:', depositTxnId);
        return result;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(dedupKey, '1');
      }
    }

    // 2. Fetch authoritative live users list from Firestore
    const usersSnap = await getDocs(collection(db, 'users'));
    const allUsers: any[] = [];
    usersSnap.forEach((d) => {
      const data = d.data() || {};
      allUsers.push({
        uid: d.id,
        userCode: (data.referralCode || data.memberId || d.id || '').toString().trim().toUpperCase(),
        memberId: (data.memberId || '').toString().trim().toUpperCase(),
        referralCode: (data.referralCode || '').toString().trim().toUpperCase(),
        referredByCode: (data.referredBy || data.referredByCode || '').toString().trim().toUpperCase(),
        phone: (data.phone || '').toString().trim(),
        username: (data.name || data.username || 'User').toString().trim(),
        investAmount: Number(data.totalInvested || data.investAmount || 0),
        walletBalance: Number(data.walletBalance || 0),
      });
    });

    // 3. Find the depositing user in Firestore
    let userAcc = allUsers.find(
      (u) =>
        codesMatch(u.userCode, cleanDepositCode) ||
        codesMatch(u.referralCode, cleanDepositCode) ||
        codesMatch(u.memberId, cleanDepositCode) ||
        u.uid === depositUserCode ||
        (u.phone && maskPhone(u.phone) === maskPhone(depositUserCode))
    );

    // Local storage fallback for userAcc
    if (!userAcc) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (raw) {
          const localAccs = JSON.parse(raw);
          userAcc = Object.values(localAccs).find(
            (a: any) =>
              codesMatch(a.userCode, cleanDepositCode) ||
              codesMatch(a.memberId, cleanDepositCode) ||
              a.userId === depositUserCode ||
              (a.phone && maskPhone(a.phone) === maskPhone(depositUserCode))
          ) as any;
        }
      } catch {}
    }

    if (!userAcc || !userAcc.referredByCode) {
      console.log('[ReferralService Cloud] No upline chain found for user:', cleanDepositCode);
      return result;
    }

    console.log(`[ReferralService Cloud] Distributing 3-level commissions for deposit ৳${depositAmount} by ${cleanDepositCode}`);

    // 4. Traverse up to 3 levels:
    // Level 1: 7%
    // Level 2: 3%
    // Level 3: 1%
    let currentChildCode = userAcc.referralCode || userAcc.userCode || cleanDepositCode;
    let uplineRef = userAcc.referredByCode;

    for (let level = 1; level <= 3; level++) {
      if (!uplineRef) break;

      // Find upline user in allUsers
      const uplineUser = allUsers.find(
        (u) =>
          codesMatch(u.userCode, uplineRef) ||
          codesMatch(u.referralCode, uplineRef) ||
          codesMatch(u.memberId, uplineRef) ||
          u.uid === uplineRef ||
          (u.phone && maskPhone(u.phone) === maskPhone(uplineRef))
      );

      if (!uplineUser) {
        console.log(`[ReferralService Cloud] Level ${level} upline "${uplineRef}" not found in Firestore.`);
        break;
      }

      const uplineCode = uplineUser.referralCode || uplineUser.memberId || uplineUser.userCode;
      const rate = TIER_COMMISSION_RATES[level as 1 | 2 | 3] || 0;
      const commission = Number((depositAmount * rate).toFixed(2));

      if (commission > 0) {
        result.commissionsDistributed.push({
          uplineCode,
          level,
          amount: commission,
        });

        // Credit upline in Firestore with transaction record
        await creditUserCommissionInFirestore(uplineUser.uid, commission, {
          level,
          ratePercent: rate * 100,
          sourceUserCode: currentChildCode,
          depositAmount,
          trxId: depositTxnId,
        });

        console.log(`[ReferralService Cloud] Level ${level} (${rate * 100}%): Credited ৳${commission} to ${uplineUser.username || uplineCode}`);

        // Update local rewards if upline is currently logged in or on this device
        if (typeof window !== 'undefined') {
          const userSpecificKey = `${STORAGE_KEY_REWARDS}_${uplineCode}`;
          const currentSaved = Number(
            localStorage.getItem(userSpecificKey) || localStorage.getItem(STORAGE_KEY_REWARDS) || '0'
          );
          const updated = Number((currentSaved + commission).toFixed(2));
          localStorage.setItem(userSpecificKey, updated.toString());

          if (
            currentUserCode &&
            (codesMatch(uplineCode, currentUserCode) ||
              codesMatch(uplineUser.memberId, currentUserCode) ||
              codesMatch(uplineUser.uid, currentUserCode))
          ) {
            result.creditedUpline = true;
            localStorage.setItem(STORAGE_KEY_REWARDS, updated.toString());
          }
        }
      }

      // Next level upline
      currentChildCode = uplineCode;
      uplineRef = uplineUser.referredByCode;
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('referral_rewards_updated'));
    }
  } catch (err) {
    console.warn('[ReferralService Cloud] Notice during cloud commission distribution:', err);
  }

  return result;
}

export function distributeReferralDepositCommissions(
  depositUserCode: string,
  depositAmount: number,
  currentUserCode?: string,
  depositTxnId?: string
): { creditedUpline: boolean; commissionsDistributed: Array<{ uplineCode: string; level: number; amount: number }> } {
  const result = {
    creditedUpline: false,
    commissionsDistributed: [] as Array<{ uplineCode: string; level: number; amount: number }>,
  };

  if (depositAmount <= 0) return result;

  // Deduplication check
  if (depositTxnId) {
    const localDedupKey = `novavest_local_comm_done_${depositTxnId}`;
    if (typeof window !== 'undefined' && localStorage.getItem(localDedupKey)) {
      return result;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(localDedupKey, '1');
    }
  }

  // Trigger authoritative 3-level Cloud distribution in background
  distributeReferralDepositCommissionsCloud(
    depositUserCode,
    depositAmount,
    currentUserCode,
    depositTxnId
  ).catch((e) => console.warn('[ReferralService] Cloud distribution notice:', e));

  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    let accounts: Record<string, any> = raw ? JSON.parse(raw) : {};

    const cleanDepositCode = (depositUserCode || '').trim().toUpperCase();

    // Find the depositing user's account by code, memberId, userId, or phone
    let userAcc = accounts[cleanDepositCode];
    if (!userAcc) {
      userAcc = Object.values(accounts).find(
        (a: any) =>
          codesMatch(a.userCode, cleanDepositCode) ||
          codesMatch(a.memberId, cleanDepositCode) ||
          (a.userId && a.userId === depositUserCode) ||
          (a.phone && maskPhone(a.phone) === maskPhone(depositUserCode))
      );
    }

    // Fallback: Check logged in user in localStorage
    if (!userAcc) {
      try {
        const authUserRaw = localStorage.getItem('novavest_auth_user');
        if (authUserRaw) {
          const authUser = JSON.parse(authUserRaw);
          if (
            codesMatch(authUser.referralCode, cleanDepositCode) ||
            codesMatch(authUser.memberId, cleanDepositCode) ||
            authUser.uid === depositUserCode ||
            authUser.memberId === depositUserCode
          ) {
            const refBy = (authUser.referredBy || authUser.referrerCode || '').trim().toUpperCase();
            const codeToUse = (authUser.referralCode || authUser.memberId || cleanDepositCode).trim().toUpperCase();
            userAcc = {
              userId: authUser.uid || '',
              userCode: codeToUse,
              memberId: authUser.memberId ? authUser.memberId.trim().toUpperCase() : undefined,
              referredByCode: refBy,
              phone: authUser.phone || '',
              username: authUser.name || authUser.username || 'User',
              joinedAt: new Date().toISOString(),
              investAmount: 0,
            };
            accounts[codeToUse] = userAcc;
          }
        }
      } catch {}
    }

    // Update depositing user's own total investment & status
    if (userAcc) {
      userAcc.investAmount = (userAcc.investAmount || 0) + depositAmount;
      accounts[userAcc.userCode] = userAcc;

      // Update node in Firestore
      saveReferralNodeToFirestore({
        userId: userAcc.userId || '',
        userCode: userAcc.userCode,
        memberId: userAcc.memberId,
        referredByCode: userAcc.referredByCode || '',
        phone: userAcc.phone || '',
        username: userAcc.username || 'User',
        joinedAt: userAcc.joinedAt || new Date().toISOString(),
        investAmount: userAcc.investAmount,
      }).catch(() => {});
    }

    if (!userAcc || !userAcc.referredByCode) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      return result;
    }

    // Prepare logs array
    let logs: CommissionLog[] = [];
    try {
      const rawLogs = localStorage.getItem(STORAGE_KEY_COMMISSION_LOGS);
      if (rawLogs) logs = JSON.parse(rawLogs);
    } catch {
      logs = [];
    }

    // Traverse up to 3 levels
    let currentChildCode = userAcc.userCode;
    let uplineRef = userAcc.referredByCode;

    for (let level = 1; level <= 3; level++) {
      if (!uplineRef) break;

      // Find upline account matching uplineRef across all code variants
      const uplineAcc = Object.values(accounts).find((a: any) =>
        getAccountIdentifiers(a).some((id) => getAllCodeVariants(uplineRef).includes(id))
      );

      if (!uplineAcc) break;

      const uplineCode = uplineAcc.userCode;
      const rate = TIER_COMMISSION_RATES[level as 1 | 2 | 3] || 0;
      const commission = Number((depositAmount * rate).toFixed(2));

      if (commission > 0) {
        result.commissionsDistributed.push({
          uplineCode,
          level,
          amount: commission,
        });

        // Add to upline's available cash rewards in localStorage
        const userSpecificKey = `${STORAGE_KEY_REWARDS}_${uplineCode}`;
        const currentSaved = Number(
          localStorage.getItem(userSpecificKey) || localStorage.getItem(STORAGE_KEY_REWARDS) || '0'
        );
        const updated = Number((currentSaved + commission).toFixed(2));
        localStorage.setItem(userSpecificKey, updated.toString());

        // Also update global reward if upline matches currentUserCode
        if (
          currentUserCode &&
          (codesMatch(uplineCode, currentUserCode) ||
            (uplineAcc.memberId && codesMatch(uplineAcc.memberId, currentUserCode)))
        ) {
          result.creditedUpline = true;
          localStorage.setItem(STORAGE_KEY_REWARDS, updated.toString());
        }

        const commId = `COMM-${Date.now()}-L${level}-${Math.random().toString(36).slice(-4)}`;
        const nowIso = new Date().toISOString();

        // Record log locally
        logs.unshift({
          id: commId,
          recipientCode: uplineCode,
          sourceUserCode: currentChildCode,
          sourcePhone: userAcc.phone,
          level: level as 1 | 2 | 3,
          rate,
          depositAmount,
          commissionAmount: commission,
          timestamp: nowIso,
        });

        // Record log to Firestore
        recordCommissionInFirestore({
          id: commId,
          recipientCode: uplineCode,
          sourceUserCode: currentChildCode,
          level,
          rate,
          depositAmount,
          commissionAmount: commission,
          timestamp: nowIso,
        }).catch(() => {});

        // Direct credit to user's wallet in Firestore
        creditUserCommissionInFirestore(uplineAcc.userId || uplineCode, commission, {
          level,
          ratePercent: rate * 100,
          sourceUserCode: currentChildCode,
          depositAmount,
          trxId: depositTxnId,
        }).catch(() => {});
      }

      // Move up to next parent
      currentChildCode = uplineAcc.userCode;
      uplineRef = uplineAcc.referredByCode;
    }

    // Keep up to 200 logs
    if (logs.length > 200) {
      logs = logs.slice(0, 200);
    }

    localStorage.setItem(STORAGE_KEY_COMMISSION_LOGS, JSON.stringify(logs));
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('referral_rewards_updated'));
    }
  } catch (err) {
    console.warn('[ReferralService] distributeReferralDepositCommissions error:', err);
  }

  return result;
}

/**
 * ─────────────────────────────────────────────────────────────
 * PREVIEW REFERRAL TESTER & 3-LEVEL SIMULATOR HELPERS
 * ─────────────────────────────────────────────────────────────
 */

export interface AddTestMemberParams {
  rootCode: string;
  rootMemberId?: string;
  level: 1 | 2 | 3;
  isActive: boolean;
  phone?: string;
  username?: string;
  depositAmount?: number;
}

export async function addTestReferralMember(params: AddTestMemberParams): Promise<{
  success: boolean;
  memberCode: string;
  level: 1 | 2 | 3;
  parentCode: string;
  message: string;
}> {
  const { rootCode, rootMemberId, level, isActive, phone, username, depositAmount = 1200 } = params;
  const cleanRootCode = (rootCode || 'NV8829').trim().toUpperCase();

  const tree = getReferralTreeForUser(cleanRootCode, rootMemberId);

  let parentCode = cleanRootCode;
  let parentPhone = '';

  if (level === 2) {
    const l1Members = tree.members.filter((m) => m.level === 1);
    if (l1Members.length > 0) {
      parentCode = l1Members[0].referralCode || l1Members[0].id.replace('REF-L1-', '');
      parentPhone = l1Members[0].phone;
    } else {
      // Create a Level 1 parent first so Level 2 has an authentic parent
      const autoL1Code = `NVL1_${Math.floor(1000 + Math.random() * 9000)}`;
      const autoL1MemberId = `NVT${Math.floor(100000 + Math.random() * 900000)}`;
      const autoL1Phone = `017${Math.floor(10000000 + Math.random() * 90000000)}`;
      await registerUserInReferralNetwork(
        `TEST_REF_${autoL1Code}`,
        autoL1Code,
        cleanRootCode,
        autoL1Phone,
        'L1 Test Member',
        autoL1MemberId
      );
      parentCode = autoL1Code;
    }
  } else if (level === 3) {
    const l2Members = tree.members.filter((m) => m.level === 2);
    if (l2Members.length > 0) {
      parentCode = l2Members[0].referralCode || l2Members[0].id.replace('REF-L2-', '');
      parentPhone = l2Members[0].phone;
    } else {
      // Ensure L1 exists
      let l1Code = '';
      const l1Members = tree.members.filter((m) => m.level === 1);
      if (l1Members.length > 0) {
        l1Code = l1Members[0].referralCode || l1Members[0].id.replace('REF-L1-', '');
      } else {
        l1Code = `NVL1_${Math.floor(1000 + Math.random() * 9000)}`;
        await registerUserInReferralNetwork(
          `TEST_REF_${l1Code}`,
          l1Code,
          cleanRootCode,
          `017${Math.floor(10000000 + Math.random() * 90000000)}`,
          'L1 Root Link',
          `NVT${Math.floor(100000 + Math.random() * 900000)}`
        );
      }
      // Create L2 parent
      const autoL2Code = `NVL2_${Math.floor(1000 + Math.random() * 9000)}`;
      await registerUserInReferralNetwork(
        `TEST_REF_${autoL2Code}`,
        autoL2Code,
        l1Code,
        `018${Math.floor(10000000 + Math.random() * 90000000)}`,
        'L2 Link Member',
        `NVT${Math.floor(100000 + Math.random() * 900000)}`
      );
      parentCode = autoL2Code;
    }
  }

  // Generate unique code & phone for new member
  const newMemberCode = `NV${level}_${Math.floor(1000 + Math.random() * 9000)}`;
  const newMemberId = `NVT${Math.floor(100000 + Math.random() * 900000)}`;
  const finalPhone = phone || (
    level === 1
      ? `017${Math.floor(10000000 + Math.random() * 90000000)}`
      : level === 2
      ? `018${Math.floor(10000000 + Math.random() * 90000000)}`
      : `019${Math.floor(10000000 + Math.random() * 90000000)}`
  );
  const finalName = username || `Level ${level} User (${newMemberCode.slice(-4)})`;
  const testUserId = `TEST_REF_${newMemberCode}`;

  await registerUserInReferralNetwork(
    testUserId,
    newMemberCode,
    parentCode,
    finalPhone,
    finalName,
    newMemberId
  );

  // If active, simulate their recharge/investment and distribute multi-tier commissions
  if (isActive) {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) {
      const accounts = JSON.parse(raw);
      if (accounts[newMemberCode]) {
        accounts[newMemberCode].investAmount = depositAmount;
        accounts[newMemberCode].totalInvested = depositAmount;
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
      }
    }

    distributeReferralDepositCommissions(
      newMemberCode,
      depositAmount,
      cleanRootCode,
      `TEST_TXN_${Date.now()}_${newMemberCode}`
    );
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('referral_rewards_updated'));
    window.dispatchEvent(new Event('storage'));
  }

  return {
    success: true,
    memberCode: newMemberCode,
    level,
    parentCode,
    message: `${level}ম লেভেলে সদস্য (${newMemberCode}) সফলভাবে যুক্ত করা হয়েছে! স্ট্যাটাস: ${isActive ? 'সক্রিয় (৳' + depositAmount + ')' : 'অপেক্ষমাণ'}`,
  };
}

/**
 * 1-Click Fast Setup: Adds 3 active members across 3 levels
 * to immediately satisfy the "3 active members in levels" VIP 1 condition!
 */
export async function addThreeActiveTestMembers(rootCode: string, rootMemberId?: string): Promise<void> {
  const cleanRoot = (rootCode || 'NV8829').trim().toUpperCase();

  // 1. Add Level 1 Active Member
  await addTestReferralMember({
    rootCode: cleanRoot,
    rootMemberId,
    level: 1,
    isActive: true,
    phone: `01712${Math.floor(100000 + Math.random() * 900000)}`,
    username: 'L1 Active User',
    depositAmount: 1200,
  });

  // 2. Add Level 2 Active Member
  await addTestReferralMember({
    rootCode: cleanRoot,
    rootMemberId,
    level: 2,
    isActive: true,
    phone: `01834${Math.floor(100000 + Math.random() * 900000)}`,
    username: 'L2 Active User',
    depositAmount: 1200,
  });

  // 3. Add Level 3 Active Member
  await addTestReferralMember({
    rootCode: cleanRoot,
    rootMemberId,
    level: 3,
    isActive: true,
    phone: `01956${Math.floor(100000 + Math.random() * 900000)}`,
    username: 'L3 Active User',
    depositAmount: 1200,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('referral_rewards_updated'));
    window.dispatchEvent(new Event('storage'));
  }
}

/**
 * Reset all simulated test referral members
 */
export function clearTestReferralMembers(rootCode?: string, rootMemberId?: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return;
    const accounts: Record<string, any> = JSON.parse(raw);
    const cleanAccounts: Record<string, any> = {};

    Object.entries(accounts).forEach(([k, v]) => {
      const isTest = (v?.userId && String(v.userId).startsWith('TEST_REF_')) ||
        (v?.userCode && (String(v.userCode).startsWith('NVL1_') || String(v.userCode).startsWith('NVL2_') || String(v.userCode).startsWith('NV1_') || String(v.userCode).startsWith('NV2_') || String(v.userCode).startsWith('NV3_')));
      if (!isTest) {
        cleanAccounts[k] = v;
      }
    });

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(cleanAccounts));

    // Also remove test commission logs
    const rawLogs = localStorage.getItem(STORAGE_KEY_COMMISSION_LOGS);
    if (rawLogs) {
      const logs = JSON.parse(rawLogs);
      const cleanLogs = logs.filter((l: any) => !String(l?.id || '').includes('TEST'));
      localStorage.setItem(STORAGE_KEY_COMMISSION_LOGS, JSON.stringify(cleanLogs));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('referral_rewards_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.warn('[ReferralService] clearTestReferralMembers error:', err);
  }
}

// Auto-sync global referral network from Firestore & clean any old test simulations
if (typeof window !== 'undefined') {
  try {
    clearTestReferralMembers();
  } catch (_) {}
  setTimeout(() => {
    syncReferralAccountsFromFirestore().catch(() => {});
  }, 1000);
}

