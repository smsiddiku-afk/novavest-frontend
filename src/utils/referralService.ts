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
  saveReferralNodeToFirestore,
  syncReferralAccountsFromFirestore,
  recordCommissionInFirestore,
  creditUserCommissionInFirestore,
} from '../lib/firebase';

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
  1: 0.07, // 7% for Tier 1
  2: 0.03, // 3% for Tier 2
  3: 0.01, // 1% for Tier 3
};

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
  const clean = code.toString().trim().toUpperCase();
  if (!clean) return [];

  const set = new Set<string>();
  set.add(clean);

  // If starts with NVT
  if (clean.startsWith('NVT')) {
    const raw = clean.slice(3);
    if (raw) {
      set.add(raw);
      set.add(`NV${raw}`);
    }
  }

  // If starts with NV (and not NVT)
  if (clean.startsWith('NV') && !clean.startsWith('NVT')) {
    const raw = clean.slice(2);
    if (raw) {
      set.add(raw);
      set.add(`NVT${raw}`);
    }
  }

  // Pure digits: add NVT and NV prefixes
  const pureDigits = clean.replace(/\D/g, '');
  if (pureDigits && pureDigits === clean) {
    set.add(`NVT${clean}`);
    set.add(`NV${clean}`);
  }

  // Phone number normalization
  if (pureDigits.length >= 10) {
    set.add(pureDigits);
    set.add(pureDigits.slice(-10));
    if (pureDigits.length === 11 && pureDigits.startsWith('0')) {
      set.add(pureDigits.slice(1));
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
  const v2 = getAllCodeVariants(code2);
  return v1.some((x) => v2.includes(x));
}

/**
 * Extract all normalized identifier variants from an account object
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
 * Register a user into the referral ledger
 */
export function registerUserInReferralNetwork(
  userId: string,
  userCode: string,
  referredByCode?: string,
  phone?: string,
  username?: string,
  memberId?: string
): void {
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

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('referral_rewards_updated'));
    }

    // Cloud Firestore Sync: persist referral node
    saveReferralNodeToFirestore(nodeData).catch(() => {});
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
    const uid = (acc.userId || acc.phone || acc.userCode || '').toString().trim();
    if (!uid) return;
    if (seenUserKeys.has(uid)) return;
    seenUserKeys.add(uid);
    uniqueAccounts.push(acc);
  });

  // Collect all identifiers for Root User
  const rootIdentifiers = new Set<string>();
  getAllCodeVariants(cleanUserCode).forEach((v) => rootIdentifiers.add(v));
  if (cleanMemberId) {
    getAllCodeVariants(cleanMemberId).forEach((v) => rootIdentifiers.add(v));
  }

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

  // -------------------------------------------------------------
  // LEVEL 1: Direct Referrals
  // -------------------------------------------------------------
  const l1Accounts: any[] = [];
  const l1Identifiers = new Set<string>();

  uniqueAccounts.forEach((acc) => {
    if (isRootUser(acc)) return;
    if (matchesIdentifiers(acc.referredByCode, rootIdentifiers)) {
      const accId = acc.userId || acc.userCode;
      if (!visitedAccountIds.has(accId)) {
        visitedAccountIds.add(accId);
        l1Accounts.push(acc);
        getAccountIdentifiers(acc).forEach((id) => l1Identifiers.add(id));

        const invest = Number(acc.investAmount || 0);
        const comm = Number((invest * TIER_COMMISSION_RATES[1]).toFixed(2));
        members.push({
          id: `REF-L1-${acc.userCode || accId}`,
          phone: maskPhone(acc.phone),
          username: acc.username || 'Member',
          level: 1,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Today',
          investAmount: invest,
          commissionEarned: comm,
          status: invest > 0 ? 'active' : 'pending',
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
      const accId = acc.userId || acc.userCode;
      if (visitedAccountIds.has(accId)) return;

      if (matchesIdentifiers(acc.referredByCode, l1Identifiers)) {
        visitedAccountIds.add(accId);
        l2Accounts.push(acc);
        getAccountIdentifiers(acc).forEach((id) => l2Identifiers.add(id));

        // Find parent in L1 for display
        const parentL1 = l1Accounts.find((p) =>
          getAccountIdentifiers(p).some((pid) =>
            getAllCodeVariants(acc.referredByCode).includes(pid)
          )
        );

        const invest = Number(acc.investAmount || 0);
        const comm = Number((invest * TIER_COMMISSION_RATES[2]).toFixed(2));
        members.push({
          id: `REF-L2-${acc.userCode || accId}`,
          phone: maskPhone(acc.phone),
          username: acc.username || 'Member',
          level: 2,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: invest > 0 ? 'active' : 'pending',
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
      const accId = acc.userId || acc.userCode;
      if (visitedAccountIds.has(accId)) return;

      if (matchesIdentifiers(acc.referredByCode, l2Identifiers)) {
        visitedAccountIds.add(accId);
        l3Accounts.push(acc);

        // Find parent in L2 for display
        const parentL2 = l2Accounts.find((p) =>
          getAccountIdentifiers(p).some((pid) =>
            getAllCodeVariants(acc.referredByCode).includes(pid)
          )
        );

        const invest = Number(acc.investAmount || 0);
        const comm = Number((invest * TIER_COMMISSION_RATES[3]).toFixed(2));
        members.push({
          id: `REF-L3-${acc.userCode || accId}`,
          phone: maskPhone(acc.phone),
          username: acc.username || 'Member',
          level: 3,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: invest > 0 ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: parentL2 ? parentL2.userCode : acc.referredByCode,
          referredByName: parentL2 ? maskPhone(parentL2.phone) : 'L2 Member',
        });
      }
    });
  }

  // Calculate active counts
  const activeLevel1Count = l1Accounts.filter((a) => Number(a.investAmount || 0) > 0).length;
  const activeLevel2Count = l2Accounts.filter((a) => Number(a.investAmount || 0) > 0).length;
  const activeLevel3Count = l3Accounts.filter((a) => Number(a.investAmount || 0) > 0).length;
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
export function distributeReferralDepositCommissions(
  depositUserCode: string,
  depositAmount: number,
  currentUserCode?: string
): { creditedUpline: boolean; commissionsDistributed: Array<{ uplineCode: string; level: number; amount: number }> } {
  const result = {
    creditedUpline: false,
    commissionsDistributed: [] as Array<{ uplineCode: string; level: number; amount: number }>,
  };

  if (depositAmount <= 0) return result;

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
        creditUserCommissionInFirestore(uplineAcc.userId || uplineCode, commission).catch(() => {});
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

// Auto-sync global referral network from Firestore
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncReferralAccountsFromFirestore().catch(() => {});
  }, 1000);
}

