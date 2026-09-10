import React, { useState, useEffect, useMemo } from 'react';
import { scrollAppToTop } from '../utils/scrollHelper';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Users,
} from 'lucide-react';
import { Language } from '../types';
import { getReferralTreeForUser } from '../utils/referralService';
import { getPersistedAuthUser } from '../utils/authService';
import {
  recordPromoClaimInFirestore,
  getFirestorePromoClaims,
} from '../lib/firebase';
import {
  SolarHeaderIcon,
  SolarMiniIcon,
  SolarTierIcon,
} from './PromoBonusSolarIcons';

export interface TierLevelItem {
  id: string;
  level: string; // V1 to V8 (and VIP1 to VIP8)
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
    level: 'V1',
    tierNumber: 1,
    targetCount: 3,
    rewardBdt: 300,
    taskBn: 'সরাসরি ৩ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 3 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v2',
    level: 'V2',
    tierNumber: 2,
    targetCount: 5,
    rewardBdt: 500,
    taskBn: 'সরাসরি ৫ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 5 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v3',
    level: 'V3',
    tierNumber: 3,
    targetCount: 10,
    rewardBdt: 1000,
    taskBn: 'সরাসরি ১০ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 10 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v4',
    level: 'V4',
    tierNumber: 4,
    targetCount: 20,
    rewardBdt: 2000,
    taskBn: 'সরাসরি ২০ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 20 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v5',
    level: 'V5',
    tierNumber: 5,
    targetCount: 40,
    rewardBdt: 4000,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ৪০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 40 active members',
    type: 'team',
  },
  {
    id: 'v6',
    level: 'V6',
    tierNumber: 6,
    targetCount: 80,
    rewardBdt: 8000,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ৮০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 80 active members',
    type: 'team',
  },
  {
    id: 'v7',
    level: 'V7',
    tierNumber: 7,
    targetCount: 160,
    rewardBdt: 16000,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ১৬০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 160 active members',
    type: 'team',
  },
  {
    id: 'v8',
    level: 'V8',
    tierNumber: 8,
    targetCount: 320,
    rewardBdt: 32000,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ৩২০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 320 active members',
    type: 'team',
  },
];

interface PromoBonusScreenProps {
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  userCode?: string;
  userMemberId?: string;
  onBack?: () => void;
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
  onClaimReward,
  showToast,
}) => {
  // Support easy toggle between English and Bengali matching screenshot
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    return currentLang === 'en' ? 'en' : 'bn';
  });

  // User referral stats: completely real from real registered referrals
  const authUser = getPersistedAuthUser();
  const effectiveUserCode =
    propUserCode || authUser?.referralCode || authUser?.memberId?.slice(-6).toUpperCase() || '';
  const effectiveMemberId = propUserMemberId || authUser?.memberId || '';

  const realTree = useMemo(
    () => getReferralTreeForUser(effectiveUserCode, effectiveMemberId),
    [effectiveUserCode, effectiveMemberId]
  );

  const level1Count = realTree.level1Count;
  const totalTeam = realTree.totalTeamCount;

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

    const currentProgress = tier.type === 'direct' ? level1Count : totalTeam;
    if (currentProgress < tier.targetCount) {
      if (showToast) {
        showToast(
          lang === 'en'
            ? `Target not reached yet. Current: ${currentProgress}/${tier.targetCount}`
            : `লক্ষ্য এখনো পূরণ হয়নি। বর্তমান অগ্রগতি: ${currentProgress}/${tier.targetCount}`
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
        {/* Top Card: Team Member Details (with Sun/Solar circular illustration)     */}
        {/* ========================================================================= */}
        <div className="w-full rounded-[22px] p-3.5 sm:p-4 mb-3.5 bg-[#032318]/90 border border-[#0d5940]/70 shadow-[0_6px_25px_rgba(0,0,0,0.5),0_0_18px_rgba(16,185,129,0.08)]">
          {/* Top Row: Solar Badge + Title + Total Active Pill */}
          <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-[#0e523b]/60">
            <div className="flex items-center gap-3">
              {/* Circular Glowing Solar Panel Badge matching screenshot */}
              <div className="relative shrink-0">
                <SolarHeaderIcon className="w-13 h-13 sm:w-15 sm:h-15 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
              </div>

              {/* Title with Green Team Icon */}
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-[#10b981]/20 flex items-center justify-center text-[#34d399]">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-[15px] sm:text-[16px] font-bold text-white tracking-normal">
                  {lang === 'en' ? 'Team Member Details' : 'টিম সদস্য বিবরণী'}
                </span>
              </div>
            </div>

            {/* Total Active Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-[#053323] border border-[#0f664a]/80 shadow-sm">
              <span className="text-[11px] text-[#6ee7b7] font-normal">
                {lang === 'en' ? 'Total Active:' : 'মোট সক্রিয়:'}
              </span>
              <span className="font-mono font-bold text-white text-[13px]">{totalTeam}</span>
            </div>
          </div>

          {/* 3-Column Level Stats (1st Level, 2nd Level, 3rd Level) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            {/* Level 1 (Direct) */}
            <div className="bg-[#021810]/95 border border-[#0e523b]/70 rounded-[14px] p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
              <SolarMiniIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[11px] font-normal text-slate-300">
                {lang === 'en' ? '1st Level' : '১ম লেভেল'}
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-white font-mono my-0.5">
                {level1Count}
              </span>
              <span className="text-[10px] text-[#34d399] font-medium">
                {lang === 'en' ? 'Direct' : 'সরাসরি'}
              </span>
            </div>

            {/* Level 2 (Sub-team) */}
            <div className="bg-[#021810]/95 border border-[#0e523b]/70 rounded-[14px] p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
              <SolarMiniIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[11px] font-normal text-slate-300">
                {lang === 'en' ? '2nd Level' : '২য় লেভেল'}
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-white font-mono my-0.5">
                {realTree.level2Count}
              </span>
              <span className="text-[10px] text-[#34d399] font-medium">
                {lang === 'en' ? 'Sub-team' : 'সাব-টিম'}
              </span>
            </div>

            {/* Level 3 (Network) */}
            <div className="bg-[#021810]/95 border border-[#0e523b]/70 rounded-[14px] p-2.5 flex flex-col items-center justify-center text-center shadow-inner">
              <SolarMiniIcon className="w-6 h-6 sm:w-7 sm:h-7 mb-1" />
              <span className="text-[11px] font-normal text-slate-300">
                {lang === 'en' ? '3rd Level' : '৩য় লেভেল'}
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-white font-mono my-0.5">
                {realTree.level3Count}
              </span>
              <span className="text-[10px] text-[#34d399] font-medium">
                {lang === 'en' ? 'Network' : 'নেটওয়ার্ক'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Tier Cards List: V1 to V8 matching exact screenshot visual layout         */}
        {/* ========================================================================= */}
        <div className="w-full flex flex-col gap-2.5 sm:gap-3">
          {TIER_LEVELS.map((tier) => {
            const isCompleted =
              !!claimedTiers[tier.id] ||
              !!claimedTiers[tier.level.toLowerCase()] ||
              !!claimedTiers[`vip${tier.tierNumber}`];

            // V1-V4 count from direct level 1; V5-V8 count from total team (L1 + L2 + L3)
            const currentProgress = tier.type === 'direct' ? level1Count : totalTeam;
            const isReadyToClaim = currentProgress >= tier.targetCount && !isCompleted;

            return (
              <div
                key={tier.id}
                id={`tier-card-${tier.id}`}
                className={`w-full rounded-[20px] sm:rounded-[22px] p-3 sm:p-3.5 flex items-center justify-between gap-2.5 sm:gap-3 transition-all duration-200 border ${
                  isReadyToClaim
                    ? 'bg-[#04281c] border-[#34d399] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : isCompleted
                    ? 'bg-[#021810]/80 border-[#0a4430]/60 opacity-80'
                    : 'bg-[#032318]/90 border-[#0d5940]/70 hover:border-[#10b981]/50 shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
                }`}
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

                    {/* Reward Line: 'Available to receive: 300 ৳' in bright mint */}
                    <div className="flex items-center gap-1 mt-1 text-[12px] sm:text-[13px] leading-none">
                      <span className="text-[#6ee7b7] font-normal">
                        {lang === 'en' ? 'Available to receive:' : 'পাওয়া যাবে:'}
                      </span>
                      <span className="font-bold text-[#34d399] font-mono tracking-wide">
                        {tier.rewardBdt.toLocaleString()} ৳
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right-Middle: Level Badge (V1, V2, V3, etc.) */}
                <div className="shrink-0 px-1">
                  <span className="text-[14px] sm:text-[15px] font-bold text-[#34d399] tracking-wide select-none">
                    {tier.level}
                  </span>
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
      </div>
    </div>
  );
};
