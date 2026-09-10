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
 * Match two codes flexibly, accounting for case, whitespace, and optional "NVT" prefix
 * e.g. "NVT440912" matches "440912", "NV8829" matches "NV8829"
 */
export function codesMatch(code1?: string, code2?: string): boolean {
  if (!code1 || !code2) return false;
  const c1 = code1.trim().toUpperCase();
  const c2 = code2.trim().toUpperCase();
  if (c1 === c2) return true;
  const s1 = c1.replace(/^NVT/i, '');
  const s2 = c2.replace(/^NVT/i, '');
  return Boolean(s1 && s2 && s1 === s2);
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

    accounts[cleanCode] = {
      userId,
      userCode: cleanCode,
      memberId: cleanMemberId || undefined,
      referredByCode: cleanReferredBy,
      phone: phone || '',
      username: username || 'User',
      joinedAt: new Date().toISOString(),
      investAmount: accounts[cleanCode]?.investAmount || 0,
    };

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));

    // Cloud Firestore Sync: persist referral node
    saveReferralNodeToFirestore({
      userId,
      userCode: cleanCode,
      memberId: cleanMemberId || undefined,
      referredByCode: cleanReferredBy,
      phone: phone || '',
      username: username || 'User',
      joinedAt: new Date().toISOString(),
      investAmount: accounts[cleanCode]?.investAmount || 0,
    }).catch(() => {});
  } catch (err) {
    console.warn('[ReferralService] Failed to save to accounts store:', err);
  }
}

/**
 * Compute the 3-tier team tree for any user given their personal referral code or memberId
 */
export function getReferralTreeForUser(userCode: string, userMemberId?: string): ReferralTreeSummary {
  const cleanUserCode = (userCode || 'NV8829').trim().toUpperCase();
  const cleanMemberId = (userMemberId || '').trim().toUpperCase();

  const isCurrentUser = (code?: string) => {
    if (!code) return false;
    return codesMatch(code, cleanUserCode) || (cleanMemberId ? codesMatch(code, cleanMemberId) : false);
  };

  // Retrieve existing recorded accounts from localStorage
  let accounts: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) accounts = JSON.parse(raw);
  } catch {
    accounts = {};
  }

  // Find all Level 1 users (users whose referredByCode matches the user's code/memberId)
  const l1Codes: string[] = [];
  const members: TeamMember[] = [];

  Object.values(accounts).forEach((acc: any) => {
    if (
      (codesMatch(acc.referredByCode, cleanUserCode) || (cleanMemberId && codesMatch(acc.referredByCode, cleanMemberId))) &&
      !isCurrentUser(acc.userCode) &&
      !isCurrentUser(acc.memberId)
    ) {
      l1Codes.push(acc.userCode);
      const invest = Number(acc.investAmount || 0);
      const comm = Number((invest * TIER_COMMISSION_RATES[1]).toFixed(2));
      members.push({
        id: `REF-L1-${acc.userCode}`,
        phone: maskPhone(acc.phone),
        username: acc.username,
        level: 1,
        date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Today',
        investAmount: invest,
        commissionEarned: comm,
        status: invest > 0 ? 'active' : 'pending',
        referralCode: acc.userCode,
        referredBy: cleanUserCode,
      });
    }
  });

  // Find Level 2 users (users who entered an L1 user's code)
  const l2Codes: string[] = [];
  l1Codes.forEach((l1Code) => {
    Object.values(accounts).forEach((acc: any) => {
      if (
        codesMatch(acc.referredByCode, l1Code) &&
        !codesMatch(acc.userCode, l1Code) &&
        !isCurrentUser(acc.userCode) &&
        !isCurrentUser(acc.memberId) &&
        !l1Codes.some(c => codesMatch(c, acc.userCode))
      ) {
        l2Codes.push(acc.userCode);
        const invest = Number(acc.investAmount || 0);
        const comm = Number((invest * TIER_COMMISSION_RATES[2]).toFixed(2));
        members.push({
          id: `REF-L2-${acc.userCode}`,
          phone: maskPhone(acc.phone),
          username: acc.username,
          level: 2,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: invest > 0 ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: l1Code,
        });
      }
    });
  });

  // Find Level 3 users (users who entered an L2 user's code)
  const l3Codes: string[] = [];
  l2Codes.forEach((l2Code) => {
    Object.values(accounts).forEach((acc: any) => {
      if (
        codesMatch(acc.referredByCode, l2Code) &&
        !codesMatch(acc.userCode, l2Code) &&
        !isCurrentUser(acc.userCode) &&
        !isCurrentUser(acc.memberId) &&
        !l1Codes.some(c => codesMatch(c, acc.userCode)) &&
        !l2Codes.some(c => codesMatch(c, acc.userCode))
      ) {
        l3Codes.push(acc.userCode);
        const invest = Number(acc.investAmount || 0);
        const comm = Number((invest * TIER_COMMISSION_RATES[3]).toFixed(2));
        members.push({
          id: `REF-L3-${acc.userCode}`,
          phone: maskPhone(acc.phone),
          username: acc.username,
          level: 3,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleDateString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: invest > 0 ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: l2Code,
        });
      }
    });
  });

  // Calculate statistics from real registered members
  let l1Count = 0;
  let l2Count = 0;
  let l3Count = 0;
  let l1Earn = 0;
  let l2Earn = 0;
  let l3Earn = 0;

  members.forEach((m) => {
    if (m.level === 1) {
      l1Count++;
      l1Earn += m.commissionEarned;
    } else if (m.level === 2) {
      l2Count++;
      l2Earn += m.commissionEarned;
    } else if (m.level === 3) {
      l3Count++;
      l3Earn += m.commissionEarned;
    }
  });

  // Commission logs calculation for today and yesterday
  let todayEarnings = 0.0;
  let yesterdayEarnings = 0.0;

  try {
    const rawLogs = localStorage.getItem(STORAGE_KEY_COMMISSION_LOGS);
    if (rawLogs) {
      const logs: CommissionLog[] = JSON.parse(rawLogs);
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

      logs.forEach((log) => {
        if (isCurrentUser(log.recipientCode)) {
          const logDay = log.timestamp ? log.timestamp.slice(0, 10) : '';
          if (logDay === todayStr) {
            todayEarnings += log.commissionAmount;
          } else if (logDay === yesterdayStr) {
            yesterdayEarnings += log.commissionAmount;
          }
        }
      });
    }
  } catch {
    // ignore
  }

  const totalEarn = Number((l1Earn + l2Earn + l3Earn).toFixed(2));

  // Available rewards in cash rewards wallet
  let savedRewards = 0.0;
  try {
    const userSpecificKey = `${STORAGE_KEY_REWARDS}_${cleanUserCode}`;
    const rawUser = localStorage.getItem(userSpecificKey);
    if (rawUser !== null) {
      savedRewards = Math.max(0, Number(rawUser));
    } else {
      const rawGlobal = localStorage.getItem(STORAGE_KEY_REWARDS);
      if (rawGlobal !== null) {
        savedRewards = Math.max(0, Number(rawGlobal));
      }
    }
  } catch {
    savedRewards = 0.0;
  }

  return {
    userCode: cleanUserCode,
    level1Count: l1Count,
    level2Count: l2Count,
    level3Count: l3Count,
    totalTeamCount: members.length,
    level1Earnings: Number(l1Earn.toFixed(2)),
    level2Earnings: Number(l2Earn.toFixed(2)),
    level3Earnings: Number(l3Earn.toFixed(2)),
    totalEarnings: totalEarn,
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
    if (!raw) return result;
    const accounts: Record<string, any> = JSON.parse(raw);

    const cleanDepositCode = (depositUserCode || '').trim().toUpperCase();

    // Find the depositing user's account by code or memberId
    let userAcc = accounts[cleanDepositCode];
    if (!userAcc) {
      userAcc = Object.values(accounts).find(
        (a: any) => codesMatch(a.userCode, cleanDepositCode) || codesMatch(a.memberId, cleanDepositCode)
      );
    }

    // Update depositing user's own total investment
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

      // Find upline account
      const uplineAcc = Object.values(accounts).find(
        (a: any) => codesMatch(a.userCode, uplineRef) || codesMatch(a.memberId, uplineRef)
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
        const currentSaved = Number(localStorage.getItem(userSpecificKey) || localStorage.getItem(STORAGE_KEY_REWARDS) || '0');
        const updated = Number((currentSaved + commission).toFixed(2));
        localStorage.setItem(userSpecificKey, updated.toString());

        // Also update global reward if upline matches currentUserCode
        if (currentUserCode && (codesMatch(uplineCode, currentUserCode) || codesMatch(uplineAcc.memberId, currentUserCode))) {
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

