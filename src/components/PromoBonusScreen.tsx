import React, { useState, useEffect, useMemo } from 'react';
import { scrollAppToTop } from '../utils/scrollHelper';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
  RotateCw,
  RefreshCw,
  UserCheck,
  Crown,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Language } from '../types';
import { getReferralTreeForUser, computeVipLevelFromLevels } from '../utils/referralService';
import { getPersistedAuthUser } from '../utils/authService';
import {
  recordPromoClaimInFirestore,
  getFirestorePromoClaims,
  syncReferralAccountsFromFirestore,
  subscribeToReferralNetwork,
} from '../lib/firebase';
import {
  SolarHeaderIcon,
  SolarMiniIcon,
  SolarTierIcon,
} from './PromoBonusSolarIcons';

export interface TierLevelItem {
  id: string;
  level: string; // VIP 1 to VIP 8
  tierNumber: number;
  targetCount: number;
  rewardBdt: number;
  taskBn: string;
  taskEn: string;
  type: 'direct' | 'team';
}

const TIER_LEVELS: TierLevelItem[] = [
  {
    id: 'v1',
    level: 'VIP 1',
    tierNumber: 1,
    targetCount: 3,
    rewardBdt: 300,
    taskBn: 'প্রথম লেভেলে ৩ জন সক্রিয় সদস্য যুক্ত করুন (VIP 1 আনলক ও ৳৩০০ বোনাস)',
    taskEn: 'Add 3 active members in Level 1 (Unlock VIP 1 & ৳300 Bonus)',
    type: 'direct',
  },
  {
    id: 'v2',
    level: 'VIP 2',
    tierNumber: 2,
    targetCount: 5,
    rewardBdt: 500,
    taskBn: 'প্রথম লেভেলে ৫ জন সক্রিয় সদস্য যুক্ত করুন (VIP 2 আনলক ও ৳৫০০ বোনাস)',
    taskEn: 'Add 5 active members in Level 1 (Unlock VIP 2 & ৳500 Bonus)',
    type: 'direct',
  },
  {
    id: 'v3',
    level: 'VIP 3',
    tierNumber: 3,
    targetCount: 10,
    rewardBdt: 1000,
    taskBn: 'প্রথম লেভেলে ১০ জন সক্রিয় সদস্য যুক্ত করুন (VIP 3 আনলক ও ৳১,০০০ বোনাস)',
    taskEn: 'Add 10 active members in Level 1 (Unlock VIP 3 & ৳1000 Bonus)',
    type: 'direct',
  },
  {
    id: 'v4',
    level: 'VIP 4',
    tierNumber: 4,
    targetCount: 20,
    rewardBdt: 2000,
    taskBn: 'প্রথম লেভেলে ২০ জন সক্রিয় সদস্য যুক্ত করুন (VIP 4 আনলক ও ৳২,০০০ বোনাস)',
    taskEn: 'Add 20 active members in Level 1 (Unlock VIP 4 & ৳2000 Bonus)',
    type: 'direct',
  },
  {
    id: 'v5',
    level: 'VIP 5',
    tierNumber: 5,
    targetCount: 40,
    rewardBdt: 4000,
    taskBn: '১-৩ লেভেলে মোট ৪০ জন সক্রিয় সদস্য যুক্ত করুন (VIP 5 আনলক ও ৳৪,০০০ বোনাস)',
    taskEn: 'Add 40 active members across Levels 1-3 (Unlock VIP 5 & ৳4000 Bonus)',
    type: 'team',
  },
  {
    id: 'v6',
    level: 'VIP 6',
    tierNumber: 6,
    targetCount: 80,
    rewardBdt: 8000,
    taskBn: '১-৩ লেভেলে মোট ৮০ জন সক্রিয় সদস্য যুক্ত করুন (VIP 6 আনলক ও ৳৮,০০০ বোনাস)',
    taskEn: 'Add 80 active members across Levels 1-3 (Unlock VIP 6 & ৳8000 Bonus)',
    type: 'team',
  },
  {
    id: 'v7',
    level: 'VIP 7',
    tierNumber: 7,
    targetCount: 160,
    rewardBdt: 16000,
    taskBn: '১-৩ লেভেলে মোট ১৬০ জন সক্রিয় সদস্য যুক্ত করুন (VIP 7 আনলক ও ৳১৬,০০০ বোনাস)',
    taskEn: 'Add 160 active members across Levels 1-3 (Unlock VIP 7 & ৳16000 Bonus)',
    type: 'team',
  },
  {
    id: 'v8',
    level: 'VIP 8',
    tierNumber: 8,
    targetCount: 320,
    rewardBdt: 32000,
    taskBn: '১-৩ লেভেলে মোট ৩২০ জন সক্রিয় সদস্য যুক্ত করুন (VIP 8 আনলক ও ৳৩২,০০০ বোনাস)',
    taskEn: 'Add 320 active members across Levels 1-3 (Unlock VIP 8 & ৳32000 Bonus)',
    type: 'team',
  },
];

interface PromoBonusScreenProps {
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  userCode?: string;
  userMemberId?: string;
  onBack?: () => void;
  onNavigateToReferral?: () => void;
  onClaimReward?: (amount: number, level: string) => void;
  showToast?: (msg: string) => void;
  onOpenWalletDeposit?: () => void;
}

export const PromoBonusScreen: React.FC<PromoBonusScreenProps> = ({
  currentLang = 'bn',
  themeMode = 'night',
  userCode: propUserCode,
  userMemberId: propUserMemberId,
  onBack,
  onNavigateToReferral,
  onClaimReward,
  showToast,
}) => {
  // Support easy toggle between English and Bengali matching screenshot
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    return currentLang === 'en' ? 'en' : 'bn';
  });

  // Sub-tabs: 'tiers' (VIP 1-8 tasks) | 'members' (3-Level Team Members list)
  const [activeSubTab, setActiveSubTab] = useState<'tiers' | 'members'>('tiers');
  const [tierFilter, setTierFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active'>('all');

  // User referral stats: completely real from real registered referrals
  const authUser = getPersistedAuthUser();
  const effectiveUserCode =
    propUserCode || authUser?.referralCode || authUser?.memberId?.slice(-6).toUpperCase() || '';
  const effectiveMemberId = propUserMemberId || authUser?.memberId || '';

  const [refreshTick, setRefreshTick] = useState(0);
  const [liveAccounts, setLiveAccounts] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('novavest_registered_accounts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync referral accounts live from Cloud Firestore and listen for changes
  useEffect(() => {
    let isMounted = true;
    setIsSyncing(true);

    // Initial sync from Firestore
    syncReferralAccountsFromFirestore()
      .then((cloudAccounts) => {
        if (isMounted && cloudAccounts && Object.keys(cloudAccounts).length > 0) {
          setLiveAccounts((prev) => ({ ...prev, ...cloudAccounts }));
          setRefreshTick((t) => t + 1);
        }
      })
      .catch((err) => console.warn('[PromoBonus] Initial referral sync error:', err))
      .finally(() => {
        if (isMounted) setIsSyncing(false);
      });

    // Real-time live listener across devices
    const unsubscribe = subscribeToReferralNetwork((streamed) => {
      if (isMounted && streamed && Object.keys(streamed).length > 0) {
        setLiveAccounts((prev) => ({ ...prev, ...streamed }));
        setRefreshTick((t) => t + 1);
      }
    });

    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem('novavest_registered_accounts');
        if (raw) setLiveAccounts(JSON.parse(raw));
      } catch {}
      setRefreshTick((t) => t + 1);
    };

    window.addEventListener('referral_rewards_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      unsubscribe();
      window.removeEventListener('referral_rewards_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const cloud = await syncReferralAccountsFromFirestore();
      if (cloud && Object.keys(cloud).length > 0) {
        setLiveAccounts((prev) => ({ ...prev, ...cloud }));
        setRefreshTick((t) => t + 1);
      }
    } catch (err) {
      console.warn('[PromoBonus] Manual sync error:', err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  const realTree = useMemo(
    () => getReferralTreeForUser(effectiveUserCode, effectiveMemberId, liveAccounts),
    [effectiveUserCode, effectiveMemberId, refreshTick, liveAccounts]
  );

  const level1Count = realTree.level1Count;
  const totalTeam = realTree.totalTeamCount;
  const activeLevel1Count = realTree.activeLevel1Count ?? 0;
  const activeLevel2Count = realTree.activeLevel2Count ?? 0;
  const activeLevel3Count = realTree.activeLevel3Count ?? 0;
  const totalActiveCount = realTree.totalActiveCount ?? 0;

  // 3-Level Members List
  const allMembers = useMemo(() => realTree.members || [], [realTree.members]);

  const filteredByTier = useMemo(() => {
    if (tierFilter === 'all') return allMembers;
    return allMembers.filter((m) => String(m.level) === tierFilter);
  }, [allMembers, tierFilter]);

  const displayedMembers = useMemo(() => {
    if (statusFilter === 'active') {
      return filteredByTier.filter((m) => m.status === 'active');
    }
    return filteredByTier;
  }, [filteredByTier, statusFilter]);

  // Track claimed tiers (supports both 'v1' and 'vip1' for 100% backward compatibility)
  const [claimedTiers, setClaimedTiers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`promo_claimed_levels_${effectiveUserCode || effectiveMemberId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      const activeKey = effectiveUserCode || effectiveMemberId;
      if (activeKey) {
        localStorage.setItem(`promo_claimed_levels_${activeKey}`, JSON.stringify(claimedTiers));
      }
    } catch {
      // ignore
    }
  }, [effectiveUserCode, effectiveMemberId, claimedTiers]);

  // Sync claimed tiers from Firestore on mount
  useEffect(() => {
    const activeKey = effectiveUserCode || effectiveMemberId;
    if (!activeKey) return;
    getFirestorePromoClaims(activeKey)
      .then((cloudClaims) => {
        if (cloudClaims && Object.keys(cloudClaims).length > 0) {
          setClaimedTiers((prev) => ({
            ...prev,
            ...cloudClaims,
          }));
        }
      })
      .catch(() => {});
  }, [effectiveUserCode, effectiveMemberId]);

  // Auto-scroll window to top whenever navigating to Promo Bonus page
  useEffect(() => {
    scrollAppToTop();
  }, []);

  // Handle claim strictly verified against real member targets
  const handleClaim = (tier: TierLevelItem) => {
    const isCompleted =
      !!claimedTiers[tier.id] ||
      !!claimedTiers[tier.level.toLowerCase()] ||
      !!claimedTiers[`vip${tier.tierNumber}`];

    if (isCompleted) return;

    // VIP 1-4: strictly evaluate Level 1 (direct) active members
    // VIP 5-8: evaluate across 1-3 levels active members
    const isDirectTier = tier.tierNumber <= 4 || tier.type === 'direct';
    const currentProgress = isDirectTier ? activeLevel1Count : totalActiveCount;
    if (currentProgress < tier.targetCount) {
      if (showToast) {
        showToast(
          lang === 'en'
            ? (isDirectTier
                ? `Target not reached yet. Active members in Level 1: ${currentProgress}/${tier.targetCount}`
                : `Target not reached yet. Active members in 1-3 levels: ${currentProgress}/${tier.targetCount}`)
            : (isDirectTier
                ? `টার্গেট এখনো পূরণ হয়নি। প্রথম লেভেলে সক্রিয় সদস্য: ${currentProgress}/${tier.targetCount} জন (শর্ত: প্রথম লেভেলে ৩টি রেফার)`
                : `টার্গেট এখনো পূরণ হয়নি। ১-৩ লেভেলে সক্রিয় সদস্য: ${currentProgress}/${tier.targetCount} জন`)
        );
      }
      return;
    }

    setClaimedTiers((prev) => ({
      ...prev,
      [tier.id]: true,
      [tier.level.toLowerCase()]: true,
      [`vip${tier.tierNumber}`]: true,
    }));

    // Cloud Firestore Sync: persist promo claim record
    const activeKey = effectiveUserCode || effectiveMemberId;
    if (activeKey) {
      recordPromoClaimInFirestore(activeKey, tier.id, tier.level, tier.rewardBdt).catch(() => {});
    }

    const rewardText = `৳${tier.rewardBdt.toLocaleString()}`;

    const msg =
      lang === 'en'
        ? `Congratulations! Level ${tier.level} reward (${rewardText}) received successfully!`
        : `অভিনন্দন! লেভেল ${tier.level} পুরস্কার (${rewardText}) সফলভাবে গৃহীত হয়েছে!`;

    if (showToast) {
      showToast(msg);
    }

    if (onClaimReward) {
      onClaimReward(tier.rewardBdt, tier.level);
    }
  };

  // Toggle language easily
  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  return (
    <div
      className="w-full min-h-screen flex flex-col items-center select-none pb-20 relative transition-colors duration-200"
      style={{
        background: 'radial-gradient(circle at 50% 0%, #063826 0%, #031811 45%, #02120c 100%)',
      }}
    >
      {/* Top scroll anchor */}
      <div id="promo-bonus-top" className="w-full h-0 pointer-events-none opacity-0" />

      {/* Centered Responsive Container matching screenshot */}
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-3.5 sm:px-4 pt-2.5 flex flex-col">
        {/* ========================================================================= */}
        {/* Top Header: '< Hosting level details' + Currency Pill + Language Pill     */}
        {/* ========================================================================= */}
        <header className="w-full flex items-center justify-between py-2 mb-2">
          {/* Back Button + Title */}
          <button
            id="hosting-back-btn"
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 transition-colors cursor-pointer text-white hover:text-emerald-300 active:opacity-80"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5] text-emerald-400" />
            <h1 className="text-[17px] sm:text-[18px] font-bold tracking-tight text-white">
              {lang === 'en' ? 'Hosting level details' : 'হোস্টিং লেভেল বিবরণী'}
            </h1>
          </button>

          {/* Right Controls: Currency & Language Switcher */}
          <div className="flex items-center gap-2">
            {/* Currency Pill: '৳ BDT >' */}
            <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-bold bg-[#04281c] border border-[#10b981]/50 text-[#34d399] shadow-sm">
              <span>৳ BDT</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#34d399]" />
            </div>

            {/* Language Selector Pill: '🇺🇸 English >' / '🇧🇩 বাংলা >' */}
            <button
              id="language-selector-pill"
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[#04281c] hover:bg-[#063b2a] border border-[#10b981]/40 text-slate-100 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <span>{lang === 'en' ? '🇺🇸 English' : '🇧🇩 বাংলা'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* Team Member Details Section (3-Level Team Members & Active Members)       */}
        {/* ========================================================================= */}
        <div className="w-full pb-3 mb-2 border-b border-emerald-500/20">
          {/* Top Row: Solar Badge + Title + Total Active Pill + Sync Button */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-emerald-500/15">
            <div className="flex items-center gap-3">
              {/* Circular Glowing Solar Panel Badge */}
              <div className="relative shrink-0">
                <SolarHeaderIcon className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
              </div>

              {/* Title with Green Team Icon */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[#34d399]">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[15px] sm:text-[16px] font-bold text-white tracking-normal">
                    {lang === 'en' ? 'Team Member Details' : 'টিম সদস্য বিবরণী'}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-200/70 mt-0.5">
                  {lang === 'en' ? '3-tier referral active tracking' : '৩ লেভেলের সক্রিয় সদস্য ও রিওয়ার্ড'}
                </span>
              </div>
            </div>

            {/* Right Side: Total Members + Active Members + Refresh Sync */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-950/60 border border-emerald-500/30 shadow-sm">
                <span className="text-[10px] sm:text-[11px] text-emerald-200/80 font-normal">
                  {lang === 'en' ? 'Total:' : 'মোট সদস্য:'}
                </span>
                <span className="font-mono font-bold text-amber-300 text-[12px] sm:text-[13px]">{totalTeam}</span>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-emerald-950/60 border border-emerald-500/30 shadow-sm">
                <span className="text-[10px] sm:text-[11px] text-[#6ee7b7] font-normal">
                  {lang === 'en' ? 'Active:' : 'একটিভ:'}
                </span>
                <span className="font-mono font-bold text-emerald-400 text-[12px] sm:text-[13px]">{totalActiveCount}</span>
              </div>

              <button
                type="button"
                onClick={handleManualSync}
                title={lang === 'en' ? 'Sync Team Data' : 'টিম ডেটা রিফ্রেশ করুন'}
                className="w-7 h-7 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-[#34d399] hover:bg-emerald-900 transition-all cursor-pointer active:scale-90"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-300' : ''}`} />
              </button>
            </div>
          </div>

          {/* 3-Column Level Stats (Interactive: tap to view members of that level) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
            {/* Level 1 (Direct) */}
            <button
              type="button"
              onClick={() => {
                setTierFilter('1');
                setActiveSubTab('members');
              }}
              className="flex flex-col items-center justify-center text-center py-2 px-1 rounded-xl hover:bg-emerald-500/10 transition-colors cursor-pointer bg-[#03261f]/60 border border-[#0d614f]/50"
            >
              <SolarMiniIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[11px] font-bold text-amber-300">
                {lang === 'en' ? '1st Level' : '১ম লেভেল'}
              </span>
              <span className="text-[20px] sm:text-[22px] font-black text-amber-400 font-mono my-0.5">
                {level1Count}
              </span>
              <span className="text-[10px] text-emerald-200/80 font-medium">
                {lang === 'en' ? 'Direct Member' : 'সরাসরি সদস্য'}
              </span>
              <span className="text-[10px] text-emerald-300 mt-0.5 font-bold">
                {lang === 'en' ? `Active: ${activeLevel1Count}` : `সক্রিয়: ${activeLevel1Count} জন`}
              </span>
              <span className="text-[9px] text-amber-300/80 mt-0.5 font-mono">৬% কমিশন</span>
            </button>

            {/* Level 2 (Sub-team) */}
            <button
              type="button"
              onClick={() => {
                setTierFilter('2');
                setActiveSubTab('members');
              }}
              className="flex flex-col items-center justify-center text-center py-2 px-1 rounded-xl hover:bg-emerald-500/10 transition-colors cursor-pointer border border-[#0d614f]/50 bg-[#03261f]/60"
            >
              <SolarMiniIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[11px] font-bold text-emerald-300">
                {lang === 'en' ? '2nd Level' : '২য় লেভেল'}
              </span>
              <span className="text-[20px] sm:text-[22px] font-black text-emerald-400 font-mono my-0.5">
                {realTree.level2Count}
              </span>
              <span className="text-[10px] text-emerald-200/80 font-medium">
                {lang === 'en' ? 'Sub-team' : 'সাব-টিম'}
              </span>
              <span className="text-[10px] text-emerald-300 mt-0.5 font-bold">
                {lang === 'en' ? `Active: ${activeLevel2Count}` : `সক্রিয়: ${activeLevel2Count} জন`}
              </span>
              <span className="text-[9px] text-emerald-300/80 mt-0.5 font-mono">৩% কমিশন</span>
            </button>

            {/* Level 3 (Network) */}
            <button
              type="button"
              onClick={() => {
                setTierFilter('3');
                setActiveSubTab('members');
              }}
              className="flex flex-col items-center justify-center text-center py-2 px-1 rounded-xl hover:bg-emerald-500/10 transition-colors cursor-pointer bg-[#03261f]/60 border border-[#0d614f]/50"
            >
              <SolarMiniIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[11px] font-bold text-teal-300">
                {lang === 'en' ? '3rd Level' : '৩য় লেভেল'}
              </span>
              <span className="text-[20px] sm:text-[22px] font-black text-teal-400 font-mono my-0.5">
                {realTree.level3Count}
              </span>
              <span className="text-[10px] text-emerald-200/80 font-medium">
                {lang === 'en' ? 'Network' : 'নেটওয়ার্ক'}
              </span>
              <span className="text-[10px] text-emerald-300 mt-0.5 font-bold">
                {lang === 'en' ? `Active: ${activeLevel3Count}` : `সক্রিয়: ${activeLevel3Count} জন`}
              </span>
              <span className="text-[9px] text-teal-300/80 mt-0.5 font-mono">১% কমিশন</span>
            </button>
          </div>
        </div>

        {/* Sub-tabs: VIP Promotion Tasks vs 3-Level Member List */}
        <div className="w-full grid grid-cols-2 gap-1.5 p-1 my-2 bg-[#03261f] border border-[#0d614f] rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('tiers')}
            className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'tiers'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'text-emerald-200/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? 'VIP Rewards (V1-V8)' : 'ভিআইপি রিওয়ার্ডস'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('members')}
            className={`py-2 px-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'members'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md font-extrabold'
                : 'text-emerald-200/70 hover:text-white hover:bg-emerald-900/30'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'en' ? `3-Level Team (${totalTeam})` : `৩-লেভেল সদস্য (${totalTeam})`}</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: 3-LEVEL MEMBERS LIST                                              */}
        {/* ========================================================================= */}
        {activeSubTab === 'members' && (
          <div className="w-full space-y-3 pt-1 pb-6 animate-in fade-in duration-150">
            {/* Tier Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === 'all'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-[#03261f] text-emerald-200/80 border border-[#0d614f] hover:text-white hover:bg-[#06483A]'
                }`}
              >
                {lang === 'en' ? 'All' : 'সব'} ({totalTeam}) • {lang === 'en' ? 'Active' : 'সক্রিয়'}: {totalActiveCount}
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === '1'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'bg-[#03261f] text-emerald-200/80 border border-[#0d614f] hover:text-white hover:bg-[#06483A]'
                }`}
              >
                {lang === 'en' ? 'Level 1' : '১ম লেভেল'} ({level1Count}) • {lang === 'en' ? 'Active' : 'সক্রিয়'}: {activeLevel1Count}
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === '2'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                    : 'bg-[#03261f] text-emerald-200/80 border border-[#0d614f] hover:text-white hover:bg-[#06483A]'
                }`}
              >
                {lang === 'en' ? 'Level 2' : '২য় লেভেল'} ({realTree.level2Count}) • {lang === 'en' ? 'Active' : 'সক্রিয়'}: {activeLevel2Count}
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('3')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === '3'
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold'
                    : 'bg-[#03261f] text-emerald-200/80 border border-[#0d614f] hover:text-white hover:bg-[#06483A]'
                }`}
              >
                {lang === 'en' ? 'Level 3' : '৩য় লেভেল'} ({realTree.level3Count}) • {lang === 'en' ? 'Active' : 'সক্রিয়'}: {activeLevel3Count}
              </button>
            </div>

            {/* Secondary Active Filter Toggle */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-emerald-200/80 font-medium">
                {lang === 'en' ? 'Filter status:' : 'ফিল্টার:'}
              </span>
              <div className="flex items-center gap-1 bg-[#03261f] p-0.5 rounded-lg border border-[#0d614f]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-emerald-200/70 hover:text-white'
                  }`}
                >
                  {lang === 'en' ? 'All' : 'সব'} ({filteredByTier.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-emerald-200/70 hover:text-white'
                  }`}
                >
                  {lang === 'en' ? 'Active' : 'একটিভ'} ({filteredByTier.filter((m) => m.status === 'active').length})
                </button>
              </div>
            </div>

            {/* Team Members List */}
            <div className="space-y-2.5">
              {displayedMembers.length > 0 ? (
                displayedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-2xl bg-[#043228] border border-[#0d614f] flex items-center justify-between gap-3 shadow-md hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          member.level === 1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : member.level === 2
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                        }`}
                      >
                        L{member.level}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs sm:text-sm">
                            {member.username || member.memberId || member.id}
                          </span>
                          {member.status === 'active' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-semibold">
                              {lang === 'en' ? 'Active' : 'একটিভ'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-200/70 block mt-0.5">
                          {member.memberId ? `ID: ${member.memberId} • ` : ''}{member.date} • {lang === 'en' ? 'Invested:' : 'বিনিয়োগ:'} ৳
                          {member.investAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-amber-300 block font-mono">
                        {member.level === 1 ? 'Tier 1' : member.level === 2 ? 'Tier 2' : 'Tier 3'}
                      </span>
                      <span className="text-[10px] text-emerald-200/70">
                        {member.status === 'active'
                          ? (lang === 'en' ? 'Package Active' : 'প্যাকেজ একটিভ')
                          : (lang === 'en' ? 'Registered' : 'নিবন্ধিত')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-[#043228] rounded-2xl border border-[#0d614f] text-emerald-200/80 text-xs">
                  {lang === 'en'
                    ? 'No members found in this selection yet.'
                    : 'এই সিলেকশনে কোনো সদস্য এখনো পাওয়া যায়নি।'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: Tier List: V1 to V8 (Directly on background with divider lines)   */}
        {/* ========================================================================= */}
        {activeSubTab === 'tiers' && (
          <div className="w-full flex flex-col pb-6 animate-in fade-in duration-150">
            {TIER_LEVELS.map((tier) => {
              const isCompleted =
                !!claimedTiers[tier.id] ||
                !!claimedTiers[tier.level.toLowerCase()] ||
                !!claimedTiers[`vip${tier.tierNumber}`];

              // VIP 1-4: strictly evaluate Level 1 (direct) active members
              // VIP 5-8: evaluate across 1-3 levels active members
              const isDirectTier = tier.tierNumber <= 4 || tier.type === 'direct';
              const currentProgress = isDirectTier ? activeLevel1Count : totalActiveCount;
              const isReadyToClaim = currentProgress >= tier.targetCount && !isCompleted;

              return (
                <div
                  key={tier.id}
                  id={`tier-card-${tier.id}`}
                  className="w-full py-3.5 px-1 border-b border-emerald-500/15 flex items-center justify-between gap-2.5 sm:gap-3 transition-colors hover:bg-emerald-500/5"
                >
                  {/* Left Section: Solar Graphic + Task Description & Reward Line */}
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    {/* Solar Energy Graphic Icon matching tier */}
                    <div className="shrink-0 relative">
                      <SolarTierIcon
                        tierNumber={tier.tierNumber}
                        className="w-11 h-11 sm:w-12 sm:h-12 drop-shadow-[0_0_8px_rgba(16,185,129,0.25)]"
                      />
                    </div>

                    {/* Text Container */}
                    <div className="flex flex-col min-w-0 flex-1 pr-1">
                      {/* Task Title Line */}
                      <p className="text-[13px] sm:text-[14px] font-medium text-white leading-snug tracking-tight break-words line-clamp-2">
                        {lang === 'en' ? tier.taskEn : tier.taskBn}
                      </p>

                      {/* Active count and target */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] sm:text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3 text-emerald-400" />
                          <span>
                            {isDirectTier
                              ? (lang === 'en'
                                  ? `Level 1 Active: ${currentProgress}/${tier.targetCount}`
                                  : `প্রথম লেভেল সক্রিয়: ${currentProgress}/${tier.targetCount} জন`)
                              : (lang === 'en'
                                  ? `1-3 Level Active: ${currentProgress}/${tier.targetCount}`
                                  : `১-৩ লেভেল সক্রিয়: ${currentProgress}/${tier.targetCount} জন`)}
                          </span>
                        </span>
                      </div>

                      {/* Mini progress bar */}
                      <div className="w-full max-w-[190px] bg-[#021f18] rounded-full h-1 mt-1 overflow-hidden border border-emerald-500/20">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round((currentProgress / tier.targetCount) * 100))}%`,
                          }}
                        />
                      </div>

                      {/* Reward Line: 'Available to receive: 300 ৳' in bright mint */}
                      <div className="flex items-center gap-1 mt-1 text-[11px] sm:text-[12px] leading-none">
                        <span className="text-[#6ee7b7] font-normal">
                          {lang === 'en' ? 'Available to receive:' : 'পাওয়া যাবে:'}
                        </span>
                        <span className="font-bold text-[#34d399] font-mono tracking-wide">
                          {tier.rewardBdt.toLocaleString()} ৳
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right-Middle: Level Badge (VIP 1, VIP 2, etc.) */}
                  <div className="shrink-0 px-1 text-center">
                    <span className={`text-[12px] sm:text-[13px] font-bold px-2 py-0.5 rounded-md border tracking-wide select-none ${
                      isCompleted || isReadyToClaim
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-mono shadow-sm'
                        : 'bg-emerald-950/60 border-emerald-500/30 text-[#34d399]'
                    }`}>
                      {tier.level}
                    </span>
                    <div className="text-[9px] mt-0.5 font-medium text-center">
                      {isCompleted
                        ? (lang === 'en' ? 'Unlocked' : 'অর্জিত')
                        : isReadyToClaim
                        ? (lang === 'en' ? 'Ready' : 'শর্ত পূরণ!')
                        : (lang === 'en' ? 'Locked' : 'লক')}
                    </div>
                  </div>

                  {/* Far-Right: Action Pill Button (0/3, 0/5, or Claim, or Done) */}
                  <div className="shrink-0 flex items-center justify-end">
                    {/* Case 1: Already Claimed */}
                    {isCompleted && (
                      <div
                        id={`tier-${tier.id}-claimed-pill`}
                        className="px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 select-none bg-[#042d20] border border-[#10b981]/40 text-[#34d399]"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{lang === 'en' ? 'Done' : 'সম্পন্ন'}</span>
                      </div>
                    )}

                    {/* Case 2: Ready to Claim (Vibrant glowing green button) */}
                    {isReadyToClaim && (
                      <button
                        id={`tier-${tier.id}-claim-btn`}
                        type="button"
                        onClick={() => handleClaim(tier)}
                        className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399] hover:from-[#059669] hover:to-[#10b981] text-[#022c1e] font-extrabold text-xs transition-all shadow-[0_0_16px_rgba(16,185,129,0.5)] cursor-pointer active:scale-95 animate-pulse"
                      >
                        {lang === 'en' ? 'Claim' : 'দাবি করুন'}
                      </button>
                    )}

                    {/* Case 3: In Progress (Exact smooth dark teal pill button e.g. 0/3, 0/5) */}
                    {!isCompleted && !isReadyToClaim && (
                      <div
                        id={`tier-${tier.id}-status-pill`}
                        className="px-3.5 sm:px-4 py-1.5 min-w-[58px] sm:min-w-[62px] text-center rounded-full text-xs sm:text-[13px] font-medium tracking-wide select-none font-mono bg-[#07382a] border border-[#0f614b] text-[#5eead4] shadow-sm"
                      >
                        {currentProgress}/{tier.targetCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
