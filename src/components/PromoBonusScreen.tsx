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

export interface TierLevelItem {
  id: string;
  level: string; // V1 to V8
  targetCount: number;
  rewardBdt: number;
  rewardUsdt: number;
  taskBn: string;
  taskEn: string;
  type: 'direct' | 'team';
}

const TIER_LEVELS: TierLevelItem[] = [
  {
    id: 'v1',
    level: 'V1',
    targetCount: 3,
    rewardBdt: 300,
    rewardUsdt: 2.5,
    taskBn: 'সরাসরি ৩ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 3 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v2',
    level: 'V2',
    targetCount: 5,
    rewardBdt: 500,
    rewardUsdt: 4.0,
    taskBn: 'সরাসরি ৫ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 5 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v3',
    level: 'V3',
    targetCount: 10,
    rewardBdt: 1000,
    rewardUsdt: 8.5,
    taskBn: 'সরাসরি ১০ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 10 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v4',
    level: 'V4',
    targetCount: 20,
    rewardBdt: 2000,
    rewardUsdt: 17.0,
    taskBn: 'সরাসরি ২০ জন সক্রিয় সদস্য যুক্ত করুন',
    taskEn: 'Directly promote 20 active members to upgrade',
    type: 'direct',
  },
  {
    id: 'v5',
    level: 'V5',
    targetCount: 40,
    rewardBdt: 4000,
    rewardUsdt: 34.0,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ৪০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 40 active members',
    type: 'team',
  },
  {
    id: 'v6',
    level: 'V6',
    targetCount: 80,
    rewardBdt: 8000,
    rewardUsdt: 68.0,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ৮০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 80 active members',
    type: 'team',
  },
  {
    id: 'v7',
    level: 'V7',
    targetCount: 160,
    rewardBdt: 16000,
    rewardUsdt: 135.0,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ১৬০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 160 active members',
    type: 'team',
  },
  {
    id: 'v8',
    level: 'V8',
    targetCount: 320,
    rewardBdt: 32000,
    rewardUsdt: 270.0,
    taskBn: 'লেভেল ১, ২ ও ৩ মিলিয়ে মোট ৩২০ জন সক্রিয় সদস্য',
    taskEn: 'Team levels 1, 2 & 3 total 320 active members',
    type: 'team',
  },
];

// Lime Robot / Android Head Icon matching screenshot
const LimeRobotIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7 sm:w-8 sm:h-8' }) => (
  <svg
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`${className} shrink-0`}
  >
    {/* Left antenna */}
    <line x1="8" y1="4.5" x2="11" y2="8.5" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
    <circle cx="7" cy="4" r="1.3" fill="#a3e635" />
    {/* Right antenna */}
    <line x1="20" y1="4.5" x2="17" y2="8.5" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
    <circle cx="21" cy="4" r="1.3" fill="#a3e635" />
    {/* Left ear */}
    <rect x="2" y="11.5" width="2" height="6" rx="1" fill="#a3e635" />
    {/* Right ear */}
    <rect x="24" y="11.5" width="2" height="6" rx="1" fill="#a3e635" />
    {/* Head body */}
    <rect x="5" y="8.5" width="18" height="14" rx="4" fill="#a3e635" />
    {/* Eyes */}
    <circle cx="10" cy="14.5" r="1.8" fill="#14171e" />
    <circle cx="18" cy="14.5" r="1.8" fill="#14171e" />
    {/* Mouth subtle accent */}
    <rect x="11.5" y="19" width="5" height="1" rx="0.5" fill="#14171e" opacity="0.6" />
  </svg>
);

interface PromoBonusScreenProps {
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  onBack?: () => void;
  onClaimReward?: (amount: number, level: string) => void;
  showToast?: (msg: string) => void;
  onOpenWalletDeposit?: () => void;
}

export const PromoBonusScreen: React.FC<PromoBonusScreenProps> = ({
  currentLang = 'bn',
  themeMode = 'night',
  onBack,
  onClaimReward,
  showToast,
  onOpenWalletDeposit,
}) => {
  // Default to Bengali ('bn') as requested, with support for 1-click toggle to English
  const [lang, setLang] = useState<'en' | 'bn'>(() => {
    return currentLang === 'en' ? 'en' : 'bn';
  });

  // Currency is fixed to pure Bangladeshi Taka (৳ BDT) across the application

  // User referral stats: completely real from real registered referrals
  const authUser = getPersistedAuthUser();
  const userCode = authUser?.referralCode || authUser?.memberId?.slice(-6).toUpperCase() || '';
  const realTree = useMemo(() => getReferralTreeForUser(userCode), [userCode]);

  const level1Count = realTree.level1Count;
  const totalTeam = realTree.totalTeamCount;

  // Track claimed tiers
  const [claimedTiers, setClaimedTiers] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`promo_claimed_levels_${userCode}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save changes
  useEffect(() => {
    try {
      if (userCode) {
        localStorage.setItem(`promo_claimed_levels_${userCode}`, JSON.stringify(claimedTiers));
      }
    } catch {
      // ignore
    }
  }, [userCode, claimedTiers]);

  // Auto-scroll window to top whenever navigating to Promo Bonus page
  useEffect(() => {
    scrollAppToTop();
  }, []);

  // Handle claim strictly verified against real member targets
  const handleClaim = (tier: TierLevelItem) => {
    if (claimedTiers[tier.id]) return;

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
    }));

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
      className={`w-full flex flex-col items-center select-none pb-12 relative transition-colors duration-200 ${
        themeMode === 'day' ? 'bg-[#f4f6fb] text-slate-800' : 'text-slate-100'
      }`}
      style={
        themeMode === 'day'
          ? { backgroundColor: '#f4f6fb' }
          : {
              background: 'radial-gradient(circle at 10% 0%, rgba(132, 204, 22, 0.12) 0%, #111317 40%, #0d0f12 100%)',
            }
      }
    >
      {/* Top scroll anchor */}
      <div id="promo-bonus-top" className="w-full h-0 pointer-events-none opacity-0" />

      {/* Centered Responsive Canvas (mobile-first on mobile, expands on desktop) */}
      <div className="w-full max-w-md md:max-w-5xl lg:max-w-6xl mx-auto px-3.5 sm:px-4 pt-3 flex flex-col">
        {/* ========================================================================= */}
        {/* Top Header: '< Hosting level details' + Language Selector Pill '🇺🇸 English >' */}
        {/* ========================================================================= */}
        <header className="w-full flex items-center justify-between py-2.5 mb-2">
          {/* Back Button + Title */}
          <button
            id="hosting-back-btn"
            type="button"
            onClick={onBack}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer active:opacity-80 ${
              themeMode === 'day' ? 'text-slate-800 hover:text-slate-900' : 'text-slate-100 hover:text-white'
            }`}
          >
            <ChevronLeft className={`w-5 h-5 stroke-[2.2] ${themeMode === 'day' ? 'text-slate-700' : 'text-slate-200'}`} />
            <h1 className={`text-[17px] sm:text-[18px] font-bold tracking-normal ${themeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
              {lang === 'en' ? 'Hosting level details' : 'হোস্টিং লেভেল বিবরণী'}
            </h1>
          </button>

          {/* Right Controls: Currency & Language Switcher */}
          <div className="flex items-center gap-2">
            {/* Currency Badge */}
            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide font-mono ${
                themeMode === 'day'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              ৳ BDT
            </div>

            {/* Language Selector Pill */}
            <button
              id="language-selector-pill"
              type="button"
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] transition-colors cursor-pointer ${
                themeMode === 'day'
                  ? 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 shadow-sm'
                  : 'bg-[#1e2129] hover:bg-[#262a35] border border-[#2e3442] text-slate-200'
              }`}
            >
              <span>{lang === 'en' ? '🇺🇸 English' : '🇧🇩 বাংলা'}</span>
              <ChevronRight className={`w-3.5 h-3.5 ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`} />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* Team Statistics Card (প্রথম লেভেল, দ্বিতীয় লেভেল, তৃতীয় লেভেল) */}
        {/* ========================================================================= */}
        <div className={`w-full rounded-2xl p-3.5 sm:p-4 mb-3.5 shadow-sm transition-colors ${
          themeMode === 'day'
            ? 'bg-white border border-slate-200/90 text-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]'
            : 'bg-[#181b22] border border-[#282b35] text-white'
        }`}>
          {/* Header Row */}
          <div className={`flex items-center justify-between pb-2.5 mb-2.5 border-b ${
            themeMode === 'day' ? 'border-slate-100' : 'border-[#282b35]'
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#a3e635]/15 flex items-center justify-center text-[#65a30d]">
                <Users className="w-4 h-4" />
              </div>
              <span className={`text-[14px] sm:text-[15px] font-bold ${themeMode === 'day' ? 'text-slate-900' : 'text-white'}`}>
                {lang === 'en' ? 'Team Member Details' : 'টিম সদস্য বিবরণী'}
              </span>
            </div>
            {/* Total Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs ${
              themeMode === 'day'
                ? 'bg-lime-50 border border-lime-200 text-slate-700'
                : 'bg-[#202530] border border-[#2e3442]'
            }`}>
              <span className={`text-[11px] ${themeMode === 'day' ? 'text-slate-600' : 'text-slate-400'}`}>
                {lang === 'en' ? 'Total Active:' : 'মোট সদস্য:'}
              </span>
              <span className="font-mono font-bold text-[#65a30d] text-[13px]">{totalTeam}</span>
            </div>
          </div>

          {/* 3-Column Level Stats (প্রথম লেভেল, দ্বিতীয় লেভেল, তৃতীয় লেভেল) */}
          <div className="grid grid-cols-3 gap-2">
            {/* Level 1 (Direct) */}
            <div className={`rounded-xl p-2.5 flex flex-col items-center text-center ${
              themeMode === 'day'
                ? 'bg-slate-50 border border-slate-200'
                : 'bg-[#12141a] border border-[#262a34]'
            }`}>
              <span className={`text-[11px] font-normal ${themeMode === 'day' ? 'text-slate-600' : 'text-slate-400'}`}>
                {lang === 'en' ? '1st Level' : '১ম লেভেল'}
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-[#65a30d] font-mono my-0.5">
                {level1Count}
              </span>
              <span className={`text-[10px] ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-500'}`}>
                {lang === 'en' ? 'Direct' : 'সরাসরি'}
              </span>
            </div>

            {/* Level 2 (Sub-referral) */}
            <div className={`rounded-xl p-2.5 flex flex-col items-center text-center ${
              themeMode === 'day'
                ? 'bg-slate-50 border border-slate-200'
                : 'bg-[#12141a] border border-[#262a34]'
            }`}>
              <span className={`text-[11px] font-normal ${themeMode === 'day' ? 'text-slate-600' : 'text-slate-400'}`}>
                {lang === 'en' ? '2nd Level' : '২য় লেভেল'}
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-[#0284c7] font-mono my-0.5">
                {realTree.level2Count}
              </span>
              <span className={`text-[10px] ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-500'}`}>
                {lang === 'en' ? 'Sub-team' : 'সাব-টিম'}
              </span>
            </div>

            {/* Level 3 (Network) */}
            <div className={`rounded-xl p-2.5 flex flex-col items-center text-center ${
              themeMode === 'day'
                ? 'bg-slate-50 border border-slate-200'
                : 'bg-[#12141a] border border-[#262a34]'
            }`}>
              <span className={`text-[11px] font-normal ${themeMode === 'day' ? 'text-slate-600' : 'text-slate-400'}`}>
                {lang === 'en' ? '3rd Level' : '৩য় লেভেল'}
              </span>
              <span className="text-[18px] sm:text-[20px] font-bold text-[#d97706] font-mono my-0.5">
                {realTree.level3Count}
              </span>
              <span className={`text-[10px] ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-500'}`}>
                {lang === 'en' ? 'Network' : 'নেটওয়ার্ক'}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Tier Cards List (Responsive: 1 col on mobile, 2 cols on desktop) */}
        {/* ========================================================================= */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {TIER_LEVELS.map((tier) => {
            const isCompleted = !!claimedTiers[tier.id];
            // V1-V4 count from direct level 1; V5-V8 count from total team (L1 + L2 + L3)
            const currentProgress = tier.type === 'direct' ? level1Count : totalTeam;
            const isReadyToClaim = currentProgress >= tier.targetCount && !isCompleted;

            return (
              <div
                key={tier.id}
                id={`tier-card-${tier.id}`}
                className={`w-full rounded-2xl p-4 sm:p-4.5 flex items-center justify-between gap-3 border transition-all duration-200 ${
                  themeMode === 'day'
                    ? isReadyToClaim
                      ? 'bg-white border-lime-400 shadow-[0_4px_16px_rgba(101,163,13,0.12)]'
                      : isCompleted
                      ? 'bg-slate-50/80 border-slate-200 opacity-85'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm'
                    : isReadyToClaim
                    ? 'bg-[#181b22] border-[#a3e635]/50 shadow-[0_0_15px_rgba(163,230,53,0.08)]'
                    : isCompleted
                    ? 'bg-[#15171d] border-[#252934] opacity-80'
                    : 'bg-[#191b22] border-[#282b35] hover:border-[#353947]'
                }`}
              >
                {/* Left Section: Robot Icon + Description & Reward Line */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Lime-green Robot Head */}
                  <LimeRobotIcon />

                  {/* Text Container: Clean typography with generous spacing */}
                  <div className="flex flex-col min-w-0 flex-1">
                    {/* Task Title Line */}
                    <p className={`text-[13px] sm:text-[14px] font-medium leading-normal tracking-normal break-words ${
                      themeMode === 'day' ? 'text-slate-800' : 'text-white'
                    }`}>
                      {lang === 'en' ? tier.taskEn : tier.taskBn}
                    </p>

                    {/* Reward Line: 'Available to receive: 300 ৳' */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className={`text-[12px] sm:text-[13px] font-normal ${
                        themeMode === 'day' ? 'text-slate-500' : 'text-[#9ca3af]'
                      }`}>
                        {lang === 'en' ? 'Available to receive:' : 'পাওয়া যাবে:'}
                      </span>
                      <span className="text-[12px] sm:text-[13px] font-bold text-[#e11d48] font-mono">
                        ৳{tier.rewardBdt.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right-Middle: Level Badge (V1, V2, etc.) */}
                <div className="shrink-0 px-1">
                  <span className={`text-sm sm:text-[15px] font-bold tracking-wide select-none ${
                    themeMode === 'day' ? 'text-[#4d7c0f]' : 'text-[#a3e635]'
                  }`}>
                    {tier.level}
                  </span>
                </div>

                {/* Far-Right: Action Pill Button (0/3, 0/5, etc.) */}
                <div className="shrink-0 flex items-center justify-end">
                  {/* Case 1: Already Claimed */}
                  {isCompleted && (
                    <div
                      id={`tier-${tier.id}-claimed-pill`}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 select-none ${
                        themeMode === 'day'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          : 'bg-[#202530] border border-emerald-500/30 text-emerald-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'en' ? 'Done' : 'সম্পন্ন'}</span>
                    </div>
                  )}

                  {/* Case 2: Ready to Claim (Vibrant lime button) */}
                  {isReadyToClaim && (
                    <button
                      id={`tier-${tier.id}-claim-btn`}
                      type="button"
                      onClick={() => handleClaim(tier)}
                      className="px-4 py-1.5 rounded-full bg-[#84cc16] hover:bg-[#65a30d] text-slate-950 font-bold text-xs transition-all shadow-[0_0_12px_rgba(132,204,22,0.35)] cursor-pointer active:scale-95"
                    >
                      {lang === 'en' ? 'Claim' : 'দাবি করুন'}
                    </button>
                  )}

                  {/* Case 3: In Progress (Exact smooth slate pill button e.g. 0/3, 0/5) */}
                  {!isCompleted && !isReadyToClaim && (
                    <div
                      id={`tier-${tier.id}-status-pill`}
                      className={`px-3.5 py-1.5 min-w-[62px] text-center rounded-full text-xs sm:text-[13px] font-medium tracking-wide select-none font-mono shadow-sm ${
                        themeMode === 'day'
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : 'bg-[#3e4858] text-white'
                      }`}
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
