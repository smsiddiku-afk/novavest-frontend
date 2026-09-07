/**
 * Referral & Multi-Tier Commission System
 * 
 * Rules:
 * 1. Each user gets a unique invitation code (e.g. 6-digit alphanumeric based on memberId or custom generated).
 * 2. 3-Tier hierarchy:
 *    - Tier 1 (Level 1): Direct invitees (user signed up with your code). Commission: 7%
 *    - Tier 2 (Level 2): Invitees of your Tier 1 invitees. Commission: 3%
 *    - Tier 3 (Level 3): Invitees of your Tier 2 invitees. Commission: 1%
 * 3. Whenever someone in your 3-level tree deposits/recharges, the commission is calculated and credited to the uplines.
 * 4. Local persistence fallback + cloud sync via localStorage & Firestore user docs.
 */

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

export const TIER_COMMISSION_RATES = {
  1: 0.07, // 7% for Tier 1
  2: 0.03, // 3% for Tier 2
  3: 0.01, // 1% for Tier 3
};

const STORAGE_KEY_TREE = 'novavest_referral_tree_data';
const STORAGE_KEY_REWARDS = 'referral_cash_rewards';
const STORAGE_KEY_ACCOUNTS = 'novavest_registered_accounts';

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
 * Register a user into the referral ledger
 */
export function registerUserInReferralNetwork(
  userId: string,
  userCode: string,
  referredByCode?: string,
  phone?: string,
  username?: string
): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    const accounts: Record<string, {
      userId: string;
      userCode: string;
      referredByCode: string;
      phone: string;
      username: string;
      joinedAt: string;
      investAmount: number;
    }> = raw ? JSON.parse(raw) : {};

    const cleanCode = userCode.trim().toUpperCase();
    const cleanReferredBy = (referredByCode || '').trim().toUpperCase();

    accounts[cleanCode] = {
      userId,
      userCode: cleanCode,
      referredByCode: cleanReferredBy,
      phone: phone || '',
      username: username || 'User',
      joinedAt: new Date().toISOString(),
      investAmount: 0,
    };

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.warn('[ReferralService] Failed to save to accounts store:', err);
  }
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
 * Compute the 3-tier team tree for any user given their personal referral code
 */
export function getReferralTreeForUser(userCode: string): ReferralTreeSummary {
  const cleanUserCode = (userCode || 'NV8829').trim().toUpperCase();

  // Retrieve existing recorded accounts from localStorage
  let accounts: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (raw) accounts = JSON.parse(raw);
  } catch {
    accounts = {};
  }

  // Find all Level 1 users (users who entered this user's code)
  const l1Codes: string[] = [];
  const members: TeamMember[] = [];

  Object.values(accounts).forEach((acc: any) => {
    if (acc.referredByCode === cleanUserCode && acc.userCode !== cleanUserCode) {
      l1Codes.push(acc.userCode);
      const invest = Number(acc.investAmount || 0);
      const comm = invest * TIER_COMMISSION_RATES[1];
      members.push({
        id: `REF-L1-${acc.userCode}`,
        phone: maskPhone(acc.phone),
        username: acc.username,
        level: 1,
        date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleString('en-GB') : 'Today',
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
      if (acc.referredByCode === l1Code && acc.userCode !== l1Code && acc.userCode !== cleanUserCode) {
        l2Codes.push(acc.userCode);
        const invest = Number(acc.investAmount || 0);
        const comm = invest * TIER_COMMISSION_RATES[2];
        members.push({
          id: `REF-L2-${acc.userCode}`,
          phone: maskPhone(acc.phone),
          username: acc.username,
          level: 2,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleString('en-GB') : 'Recently',
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
        acc.referredByCode === l2Code &&
        acc.userCode !== l2Code &&
        !l1Codes.includes(acc.userCode) &&
        acc.userCode !== cleanUserCode
      ) {
        l3Codes.push(acc.userCode);
        const invest = Number(acc.investAmount || 0);
        const comm = invest * TIER_COMMISSION_RATES[3];
        members.push({
          id: `REF-L3-${acc.userCode}`,
          phone: maskPhone(acc.phone),
          username: acc.username,
          level: 3,
          date: acc.joinedAt ? new Date(acc.joinedAt).toLocaleString('en-GB') : 'Recently',
          investAmount: invest,
          commissionEarned: comm,
          status: invest > 0 ? 'active' : 'pending',
          referralCode: acc.userCode,
          referredBy: l2Code,
        });
      }
    });
  });

  // If the user is brand new with no team yet, provide standard initial starter members
  // or use empty if real-time dynamic
  if (members.length === 0) {
    // Standard baseline sample members for pristine UX demonstration if brand new
    const sampleMembers: TeamMember[] = [
      {
        id: 'REF-101',
        phone: '017*****412',
        level: 1,
        date: '2026-09-05 14:23',
        investAmount: 2000,
        commissionEarned: 140, // 7%
        status: 'active',
      },
      {
        id: 'REF-102',
        phone: '018*****891',
        level: 1,
        date: '2026-09-04 19:10',
        investAmount: 5000,
        commissionEarned: 350, // 7%
        status: 'active',
      },
      {
        id: 'REF-103',
        phone: '019*****234',
        level: 2,
        date: '2026-09-04 11:45',
        investAmount: 3000,
        commissionEarned: 90, // 3%
        status: 'active',
      },
      {
        id: 'REF-104',
        phone: '016*****778',
        level: 2,
        date: '2026-09-03 16:30',
        investAmount: 1500,
        commissionEarned: 45, // 3%
        status: 'active',
      },
      {
        id: 'REF-105',
        phone: '015*****552',
        level: 3,
        date: '2026-09-02 20:15',
        investAmount: 4000,
        commissionEarned: 40, // 1%
        status: 'active',
      },
    ];

    sampleMembers.forEach((m) => members.push(m));
  }

  // Calculate statistics
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

  const totalEarn = l1Earn + l2Earn + l3Earn;

  // Available rewards in cash rewards wallet
  let savedRewards = 245.5;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REWARDS);
    if (raw !== null) {
      savedRewards = Number(raw);
    }
  } catch {
    // ignore
  }

  return {
    userCode: cleanUserCode,
    level1Count: l1Count,
    level2Count: l2Count,
    level3Count: l3Count,
    totalTeamCount: members.length,
    level1Earnings: l1Earn,
    level2Earnings: l2Earn,
    level3Earnings: l3Earn,
    totalEarnings: totalEarn,
    todayEarnings: Number((totalEarn * 0.08).toFixed(2)) || 15.5,
    yesterdayEarnings: Number((totalEarn * 0.12).toFixed(2)) || 28.0,
    availableRewards: savedRewards,
    members,
  };
}

/**
 * When any user deposits, distribute 3-tier commissions to their uplines!
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
    const userAcc = accounts[cleanDepositCode];

    // Update user's own total investment
    if (userAcc) {
      userAcc.investAmount = (userAcc.investAmount || 0) + depositAmount;
      accounts[cleanDepositCode] = userAcc;
    }

    // Traverse up to 3 levels
    let currentChildCode = cleanDepositCode;
    let uplineCode = userAcc?.referredByCode;

    for (let level = 1; level <= 3; level++) {
      if (!uplineCode || !accounts[uplineCode]) break;

      const rate = TIER_COMMISSION_RATES[level as 1 | 2 | 3] || 0;
      const commission = Number((depositAmount * rate).toFixed(2));

      result.commissionsDistributed.push({
        uplineCode,
        level,
        amount: commission,
      });

      // If upline is currently logged in user
      if (currentUserCode && uplineCode === currentUserCode.trim().toUpperCase()) {
        result.creditedUpline = true;
        const currentSaved = Number(localStorage.getItem(STORAGE_KEY_REWARDS) || '0');
        const updated = currentSaved + commission;
        localStorage.setItem(STORAGE_KEY_REWARDS, updated.toString());
      }

      // Move up to next parent
      currentChildCode = uplineCode;
      uplineCode = accounts[currentChildCode]?.referredByCode;
    }

    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (err) {
    console.warn('[ReferralService] distributeReferralDepositCommissions error:', err);
  }

  return result;
}
