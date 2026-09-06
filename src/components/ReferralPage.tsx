import React, { useState } from 'react';
import {
  ChevronLeft,
  X,
  Share2,
  Copy,
  Check,
  Users,
  Sparkles,
  Award,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  QrCode,
  ArrowRight,
  TrendingUp,
  Wallet,
  Clock,
  Gift,
  Zap,
  HelpCircle,
  Info,
  BadgePercent,
  Coins,
  ChevronDown,
  Headphones,
  FileText,
  Lock,
} from 'lucide-react';
import { Language } from '../types';

interface ReferralMember {
  id: string;
  phone: string;
  level: 1 | 2 | 3;
  date: string;
  investAmount: number;
  commissionEarned: number;
  status: 'active' | 'pending';
}

interface ReferralPageProps {
  currentLang?: Language;
  userCode?: string;
  onBack: () => void;
  onClaimReward?: (amount: number) => void;
  showToast?: (msg: string) => void;
  userBalance?: number;
}

const ACTIVE_TEAM_MEMBERS: ReferralMember[] = [
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
  {
    id: 'REF-106',
    phone: '013*****910',
    level: 1,
    date: '2026-09-01 09:50',
    investAmount: 1000,
    commissionEarned: 70, // 7%
    status: 'active',
  },
];

export const ReferralPage: React.FC<ReferralPageProps> = ({
  currentLang = 'bn',
  userCode = 'NV8829',
  onBack,
  onClaimReward,
  showToast = (_msg: string) => {},
  userBalance = 12450,
}) => {
  // Main Tabs: 'invite' | 'details' (exactly matches user screenshot)
  const [activeTab, setActiveTab] = useState<'invite' | 'details'>('invite');

  // Details sub-filter: all | 1 | 2 | 3
  const [tierFilter, setTierFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Available Cash Rewards state
  const [availableRewards, setAvailableRewards] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('referral_cash_rewards');
      return saved !== null ? Number(saved) : 245.5;
    } catch {
      return 245.5;
    }
  });

  const referralLink = `${window.location.origin}/register?ref=${userCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userCode);
    setCopiedCode(true);
    showToast(currentLang === 'bn' ? 'রেফারেল কোড কপি করা হয়েছে!' : 'Invitation code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    showToast(currentLang === 'bn' ? 'আমন্ত্রণ লিংক কপি করা হয়েছে!' : 'Invitation link copied!');
    setTimeout(() => setCopiedLink(false), 2000);

    if (navigator.share) {
      navigator
        .share({
          title: 'NVT • Nova Terra Energy Referral',
          text:
            currentLang === 'bn'
              ? `নোভা টেরা এনার্জি (NVT)-তে যোগ দিন এবং ৩-স্তর কমিশন উপার্জন করুন! কোড: ${userCode}`
              : `Join Nova Terra Energy (NVT) and earn 3-tier lifetime commissions! Code: ${userCode}`,
          url: referralLink,
        })
        .catch(() => {});
    }
  };

  const handleClaim = () => {
    if (availableRewards <= 0) {
      showToast(
        currentLang === 'bn'
          ? 'দাবি করার মতো কোনো রিওয়ার্ড বর্তমানে নেই।'
          : 'No rewards available to claim right now.'
      );
      return;
    }

    const claimAmt = availableRewards;
    setAvailableRewards(0);
    try {
      localStorage.setItem('referral_cash_rewards', '0');
    } catch {
      // ignore
    }

    if (onClaimReward) {
      onClaimReward(claimAmt);
    }

    showToast(
      currentLang === 'bn'
        ? `অভিনন্দন! ৳${claimAmt.toFixed(2)} ক্যাশ রিওয়ার্ড সফলভাবে মূল ব্যালেন্সে যুক্ত হয়েছে!`
        : `Congratulations! ৳${claimAmt.toFixed(2)} cash reward transferred to main balance!`
    );
  };

  const filteredMembers = ACTIVE_TEAM_MEMBERS.filter((m) => {
    if (tierFilter === 'all') return true;
    return m.level.toString() === tierFilter;
  });

  const totalCommissionsEarned = ACTIVE_TEAM_MEMBERS.reduce(
    (sum, m) => sum + m.commissionEarned,
    0
  );

  return (
    <div
      id="full-referral-page"
      className="w-full min-h-screen bg-[#060b17] text-slate-100 flex flex-col relative select-none pb-28 animate-in fade-in duration-200"
    >
      {/* 1. Top Header Bar (Golden Amber title & Close button matching user screenshot) */}
      <header
        id="referral-page-header"
        className="sticky top-0 z-30 w-full bg-[#091122]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md"
      >
        <div className="w-full px-4 h-14 flex items-center justify-between">
          <button
            id="referral-back-btn"
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Golden Header Title matching Screenshot */}
          <h1 className="text-lg sm:text-xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 drop-shadow-[0_1px_6px_rgba(245,158,11,0.3)]">
            {currentLang === 'bn' ? 'রেফারেল ও টিম কমিশন' : 'Referral'}
          </h1>

          <button
            id="referral-close-btn"
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-800/60 hover:bg-slate-700/60 text-amber-300/90 hover:text-amber-200 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Dual Tabs: Invite | Details (Golden underline active state matching Screenshot) */}
        <div className="w-full grid grid-cols-2 text-center text-sm font-bold border-t border-slate-800/50">
          <button
            id="referral-tab-invite"
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`py-3 relative transition-all cursor-pointer ${
              activeTab === 'invite'
                ? 'text-amber-300 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <span>{currentLang === 'bn' ? 'আমন্ত্রণ (Invite)' : 'Invite'}</span>
            {activeTab === 'invite' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_#f59e0b]" />
            )}
          </button>

          <button
            id="referral-tab-details"
            type="button"
            onClick={() => setActiveTab('details')}
            className={`py-3 relative transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'text-amber-300 font-extrabold'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <span>{currentLang === 'bn' ? 'বিস্তারিত (Details)' : 'Details'}</span>
            {activeTab === 'details' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_#f59e0b]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="w-full px-3.5 sm:px-4 pt-4 space-y-4 max-w-md mx-auto">
        {activeTab === 'invite' ? (
          <>
            {/* CARD 1: Refer Your Friends and Earn */}
            <section
              id="referral-invite-card"
              className="rounded-2xl bg-[#0b1426] border border-slate-800/90 p-4 shadow-xl space-y-3.5 relative overflow-hidden"
            >
              {/* Section Header with vertical bar indicator */}
              <div className="flex items-center gap-2">
                <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                  {currentLang === 'bn'
                    ? 'বন্ধুদের রেফার করুন এবং উপার্জন করুন'
                    : 'Refer Your Friends and Earn'}
                </h3>
              </div>

              {/* Premium High-Tech Energy Partner Banner */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#08152c] via-[#0c1f40] to-[#08111e] border border-amber-500/40 p-3.5 sm:p-4 shadow-xl shadow-amber-950/25 relative group">
                {/* Background Ambient Lighting & Cyber Circuit Grid */}
                <div className="absolute -top-14 -right-14 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

                {/* Top Status & Tier Badge Bar */}
                <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{currentLang === 'bn' ? 'ভিআইপি পার্টনার প্রোগ্রাম' : 'VIP Partner Program'}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-bold text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{currentLang === 'bn' ? 'তাৎক্ষণিক অটো পে-আউট' : 'Real-time Payout'}</span>
                  </div>
                </div>

                {/* Main Hero Row: Left Typography & Right 3D Energy & Gold Vault Illustration */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  {/* Left Column: Heading & Value Prop */}
                  <div className="space-y-1 max-w-[210px] sm:max-w-[240px]">
                    <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block font-mono">
                      {currentLang === 'bn' ? 'আজীবন ক্যাশ কমিশন' : 'LIFETIME COMMISSION'}
                    </span>
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-white">
                        {currentLang === 'bn' ? 'ইনভাইট করুন ও আয় করুন' : 'INVITE & EARN TOGETHER'}
                      </span>
                    </h2>
                    <p className="text-[10px] text-slate-300 leading-snug font-medium">
                      {currentLang === 'bn'
                        ? 'বন্ধুদের যুক্ত করুন এবং প্রতি ডিপোজিটে সরাসরি ৩-স্তরে সর্বোচ্চ ১১% নগদ কমিশন বুঝে নিন।'
                        : 'Invite partners & earn up to 11% instant multi-tier commissions credited directly to your wallet.'}
                    </p>
                  </div>

                  {/* Right Column: Sleek 3D Clean Energy Power Hub & Golden Vault Graphic */}
                  <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                      <defs>
                        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#67e8f9" />
                          <stop offset="100%" stopColor="#0284c7" />
                        </linearGradient>
                        <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#1e293b" />
                          <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Holographic orbital pulse rings */}
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
                      <circle cx="60" cy="60" r="38" fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.5" />

                      {/* Central Energy Grid Power Generator Base */}
                      <polygon points="60,26 92,44 92,78 60,96 28,78 28,44" fill="url(#hubGrad)" stroke="url(#cyanGrad)" strokeWidth="2" />
                      <polygon points="60,32 86,47 86,74 60,89 34,74 34,47" fill="#091428" stroke="#0ea5e9" strokeWidth="1" opacity="0.8" />

                      {/* Power grid nodes and glowing core */}
                      <circle cx="60" cy="60" r="14" fill="#0284c7" opacity="0.3" filter="url(#glow)" />
                      <circle cx="60" cy="60" r="8" fill="#38bdf8" />
                      <polygon points="60,54 65,60 61,60 62,66 56,60 59,60" fill="#ffffff" />

                      {/* Floating Golden Coin 1 (Level 1: 7%) */}
                      <g transform="translate(18, 16)">
                        <circle cx="12" cy="12" r="11" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="1" />
                        <circle cx="12" cy="12" r="8.5" fill="none" stroke="#78350f" strokeWidth="0.8" opacity="0.6" />
                        <text x="12" y="15.5" fontSize="10" fontWeight="900" textAnchor="middle" fill="#451a03" fontFamily="sans-serif">৳</text>
                      </g>

                      {/* Floating Golden Coin 2 (Level 2: 3%) */}
                      <g transform="translate(86, 68)">
                        <circle cx="10" cy="10" r="9" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="1" />
                        <text x="10" y="13" fontSize="8" fontWeight="900" textAnchor="middle" fill="#451a03" fontFamily="sans-serif">৳</text>
                      </g>

                      {/* Floating Golden Coin 3 (Level 3: 1%) */}
                      <g transform="translate(14, 78)">
                        <circle cx="8" cy="8" r="7" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="0.8" />
                        <text x="8" y="10.5" fontSize="7" fontWeight="900" textAnchor="middle" fill="#451a03" fontFamily="sans-serif">★</text>
                      </g>

                      {/* Laser connection arcs */}
                      <line x1="30" y1="28" x2="52" y2="52" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.7" />
                      <line x1="86" y1="74" x2="68" y2="64" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.7" />
                      <line x1="28" y1="82" x2="52" y2="68" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.7" />
                    </svg>
                  </div>
                </div>

                {/* Bottom 3-Tier Commission Badges Pill Strip */}
                <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-[#050c18]/80 border border-amber-500/30 rounded-xl py-1 px-1.5 text-center flex flex-col items-center">
                    <span className="text-[9px] text-amber-300 font-bold uppercase">{currentLang === 'bn' ? '১ম স্তর' : 'Level 1'}</span>
                    <span className="text-xs sm:text-sm font-black text-white font-mono">7%</span>
                    <span className="text-[8px] text-slate-400">{currentLang === 'bn' ? 'সরাসরি' : 'Direct'}</span>
                  </div>

                  <div className="bg-[#050c18]/80 border border-blue-500/30 rounded-xl py-1 px-1.5 text-center flex flex-col items-center">
                    <span className="text-[9px] text-blue-300 font-bold uppercase">{currentLang === 'bn' ? '২য় স্তর' : 'Level 2'}</span>
                    <span className="text-xs sm:text-sm font-black text-white font-mono">3%</span>
                    <span className="text-[8px] text-slate-400">{currentLang === 'bn' ? 'সাব-টিম' : 'Sub-Team'}</span>
                  </div>

                  <div className="bg-[#050c18]/80 border border-indigo-500/30 rounded-xl py-1 px-1.5 text-center flex flex-col items-center">
                    <span className="text-[9px] text-indigo-300 font-bold uppercase">{currentLang === 'bn' ? '৩য় স্তর' : 'Level 3'}</span>
                    <span className="text-xs sm:text-sm font-black text-white font-mono">1%</span>
                    <span className="text-[8px] text-slate-400">{currentLang === 'bn' ? 'নেটওয়ার্ক' : 'Network'}</span>
                  </div>
                </div>
              </div>

              {/* QR Code and Sharing Actions (2 Columns matching user screenshot) */}
              <div className="grid grid-cols-12 gap-3 pt-1">
                {/* Left Column (5 cols): Invitation QR Code */}
                <div className="col-span-5 flex flex-col items-center justify-between bg-[#080e1a] border border-slate-800 rounded-xl p-2.5">
                  <span className="text-[11px] font-semibold text-slate-300 mb-1.5 text-center leading-tight">
                    {currentLang === 'bn' ? 'আমন্ত্রণ কিউআর কোড' : 'Invitation QR Code'}
                  </span>

                  {/* QR Code Visual Box */}
                  <div className="w-full aspect-square max-w-[110px] bg-white rounded-lg p-1.5 shadow-md flex items-center justify-center relative group">
                    <svg
                      viewBox="0 0 100 100"
                      className="w-full h-full text-slate-950"
                      fill="currentColor"
                    >
                      {/* Top-left position pattern */}
                      <rect x="5" y="5" width="28" height="28" fill="#000" rx="3" />
                      <rect x="9" y="9" width="20" height="20" fill="#fff" rx="1.5" />
                      <rect x="13" y="13" width="12" height="12" fill="#000" rx="1" />

                      {/* Top-right position pattern */}
                      <rect x="67" y="5" width="28" height="28" fill="#000" rx="3" />
                      <rect x="71" y="9" width="20" height="20" fill="#fff" rx="1.5" />
                      <rect x="75" y="13" width="12" height="12" fill="#000" rx="1" />

                      {/* Bottom-left position pattern */}
                      <rect x="5" y="67" width="28" height="28" fill="#000" rx="3" />
                      <rect x="9" y="71" width="20" height="20" fill="#fff" rx="1.5" />
                      <rect x="13" y="75" width="12" height="12" fill="#000" rx="1" />

                      {/* Authentic random matrix modules */}
                      <rect x="38" y="6" width="6" height="6" fill="#000" />
                      <rect x="48" y="6" width="6" height="6" fill="#000" />
                      <rect x="58" y="6" width="6" height="6" fill="#000" />

                      <rect x="38" y="16" width="6" height="6" fill="#000" />
                      <rect x="50" y="16" width="6" height="6" fill="#000" />

                      <rect x="38" y="26" width="6" height="6" fill="#000" />
                      <rect x="46" y="26" width="6" height="6" fill="#000" />
                      <rect x="56" y="26" width="6" height="6" fill="#000" />

                      <rect x="8" y="38" width="6" height="6" fill="#000" />
                      <rect x="18" y="38" width="6" height="6" fill="#000" />
                      <rect x="28" y="38" width="6" height="6" fill="#000" />
                      <rect x="38" y="38" width="6" height="6" fill="#000" />
                      <rect x="48" y="38" width="6" height="6" fill="#000" />
                      <rect x="68" y="38" width="6" height="6" fill="#000" />
                      <rect x="78" y="38" width="6" height="6" fill="#000" />
                      <rect x="88" y="38" width="6" height="6" fill="#000" />

                      <rect x="8" y="48" width="6" height="6" fill="#000" />
                      <rect x="24" y="48" width="6" height="6" fill="#000" />
                      <rect x="44" y="48" width="12" height="12" fill="#2563eb" rx="2" />
                      <rect x="68" y="48" width="6" height="6" fill="#000" />
                      <rect x="84" y="48" width="6" height="6" fill="#000" />

                      <rect x="16" y="58" width="6" height="6" fill="#000" />
                      <rect x="28" y="58" width="6" height="6" fill="#000" />
                      <rect x="38" y="58" width="6" height="6" fill="#000" />
                      <rect x="58" y="58" width="6" height="6" fill="#000" />
                      <rect x="78" y="58" width="6" height="6" fill="#000" />

                      <rect x="38" y="68" width="6" height="6" fill="#000" />
                      <rect x="48" y="68" width="6" height="6" fill="#000" />
                      <rect x="68" y="68" width="6" height="6" fill="#000" />
                      <rect x="80" y="68" width="6" height="6" fill="#000" />

                      <rect x="38" y="78" width="6" height="6" fill="#000" />
                      <rect x="54" y="78" width="6" height="6" fill="#000" />
                      <rect x="68" y="78" width="6" height="6" fill="#000" />
                      <rect x="88" y="78" width="6" height="6" fill="#000" />

                      <rect x="38" y="88" width="6" height="6" fill="#000" />
                      <rect x="48" y="88" width="6" height="6" fill="#000" />
                      <rect x="64" y="88" width="6" height="6" fill="#000" />
                      <rect x="84" y="88" width="6" height="6" fill="#000" />
                    </svg>

                    {/* Center badge */}
                    <div className="absolute inset-0 m-auto w-5 h-5 rounded-full bg-blue-600 border border-white flex items-center justify-center text-white">
                      <Zap className="w-3 h-3 fill-current" />
                    </div>
                  </div>

                  <span className="text-[9px] text-slate-400 mt-1">
                    {currentLang === 'bn' ? 'স্ক্যান করুন' : 'Scan to Join'}
                  </span>
                </div>

                {/* Right Column (7 cols): Invitation Link & Code */}
                <div className="col-span-7 flex flex-col justify-between space-y-2.5">
                  {/* Invitation Link Section */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {currentLang === 'bn' ? 'আমন্ত্রণ লিংক' : 'Invitation Link'}
                    </span>
                    <button
                      id="referral-share-link-btn"
                      type="button"
                      onClick={handleShareLink}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/30 transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-slate-950" />
                          <span>{currentLang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 text-slate-950" />
                          <span>{currentLang === 'bn' ? 'শেয়ার / কপি' : 'Share'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Invitation Code Section (matching Screenshot box + right golden copy button) */}
                  <div>
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {currentLang === 'bn' ? 'আমন্ত্রণ কোড' : 'Invitation Code'}
                    </span>

                    <div className="flex items-center rounded-xl bg-[#080e1a] border border-slate-700/80 overflow-hidden shadow-inner">
                      <div className="flex-1 px-3 py-2 text-sm sm:text-base font-mono font-bold text-white tracking-wider truncate">
                        {userCode}
                      </div>

                      <button
                        id="referral-copy-code-btn"
                        type="button"
                        onClick={handleCopyCode}
                        className="px-3 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                        title="Copy Invitation Code"
                      >
                        {copiedCode ? (
                          <Check className="w-4 h-4 text-slate-950" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-950" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* CARD 2: Referral Count, Today's Rewards, Yesterday's Rewards (3 Columns matching Screenshot) */}
            <section
              id="referral-stats-summary"
              className="rounded-2xl bg-[#0b1426] border border-slate-800/90 p-4 shadow-xl grid grid-cols-3 divide-x divide-slate-800/80 text-center"
            >
              {/* Col 1: Referral Count */}
              <div className="px-1.5 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  {currentLang === 'bn' ? 'রেফারেল সংখ্যা' : 'Referral Count'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono tracking-tight">
                  2
                </span>
              </div>

              {/* Col 2: Today's Rewards */}
              <div className="px-1.5 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  {currentLang === 'bn' ? 'আজকের রিওয়ার্ড' : "Today's Rewards"}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-0.5">
                  <span className="text-sm text-amber-500">৳</span>
                  <span>0.94</span>
                </span>
              </div>

              {/* Col 3: Yesterday's Rewards */}
              <div className="px-1.5 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-slate-400 block mb-1">
                  {currentLang === 'bn' ? 'গতকালের রিওয়ার্ড' : "Yesterday's Rewards"}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-0.5">
                  <span className="text-sm text-amber-500">৳</span>
                  <span>0</span>
                </span>
              </div>
            </section>

            {/* CARD 3: Available Cash Rewards + Claim Button (matching Screenshot) */}
            <section
              id="referral-cash-rewards-card"
              className="rounded-2xl bg-[#0b1426] border border-slate-800/90 p-4 shadow-xl space-y-3"
            >
              {/* Section Header with vertical bar indicator */}
              <div className="flex items-center gap-2">
                <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                  {currentLang === 'bn'
                    ? 'উত্তোলনযোগ্য ক্যাশ রিওয়ার্ড'
                    : 'Available Cash Rewards'}
                </h3>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Reward Amount */}
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-bold text-amber-500">৳</span>
                    <span>{availableRewards.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-slate-400">
                    {currentLang === 'bn'
                      ? 'সরাসরি ওয়ালেট ব্যালেন্সে নেওয়ার যোগ্য'
                      : 'Transferable directly to main wallet'}
                  </span>
                </div>

                {/* Claim Button */}
                <button
                  id="referral-claim-reward-btn"
                  type="button"
                  onClick={handleClaim}
                  disabled={availableRewards <= 0}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 cursor-pointer ${
                    availableRewards > 0
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/25'
                      : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-75'
                  }`}
                >
                  {currentLang === 'bn' ? 'দাবি করুন' : 'Claim'}
                </button>
              </div>
            </section>

            {/* CARD 4: How to earn more rewards (3-Tier commission breakdown matching screenshot) */}
            <section
              id="referral-how-it-works-card"
              className="rounded-2xl bg-[#0b1426] border border-slate-800/90 p-4 shadow-xl space-y-3.5"
            >
              {/* Section Header with vertical bar indicator */}
              <div className="flex items-center gap-2">
                <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                  {currentLang === 'bn'
                    ? 'কীভাবে আরও বেশি রিওয়ার্ড পাবেন'
                    : 'How to earn more rewards'}
                </h3>
              </div>

              {/* 3 Tier Commission Overview Cards */}
              <div className="grid grid-cols-3 gap-2">
                {/* Tier 1: 7% */}
                <div className="rounded-xl bg-[#070e1a] border border-cyan-500/30 p-2.5 text-center flex flex-col items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase">
                    {currentLang === 'bn' ? '১ম লেভেল' : 'Level 1'}
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 font-mono">
                      7%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-300 leading-tight">
                    {currentLang === 'bn' ? 'সরাসরি মেম্বার' : 'Direct Members'}
                  </span>
                </div>

                {/* Tier 2: 3% */}
                <div className="rounded-xl bg-[#070e1a] border border-blue-500/30 p-2.5 text-center flex flex-col items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">
                    {currentLang === 'bn' ? '২য় লেভেল' : 'Level 2'}
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-400 font-mono">
                      3%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-300 leading-tight">
                    {currentLang === 'bn' ? 'সাব টিম সদস্য' : 'Sub-team Team'}
                  </span>
                </div>

                {/* Tier 3: 1% */}
                <div className="rounded-xl bg-[#070e1a] border border-indigo-500/30 p-2.5 text-center flex flex-col items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase">
                    {currentLang === 'bn' ? '৩য় লেভেল' : 'Level 3'}
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400 font-mono">
                      1%
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-300 leading-tight">
                    {currentLang === 'bn' ? 'নেটওয়ার্ক সদস্য' : 'Network Depth'}
                  </span>
                </div>
              </div>

              {/* Step by Step Flow */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {currentLang === 'bn'
                      ? 'আপনার বিশেষ রেফারেল লিংক বা কিউআর কোড বন্ধুদের সাথে শেয়ার করুন।'
                      : 'Share your exclusive invitation link or QR code with friends.'}
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {currentLang === 'bn'
                      ? 'বন্ধুরা রেজিস্ট্রেশন করে যেকোনো এনার্জি প্রজেক্টে অংশগ্রহণ করবে।'
                      : 'Friends register and invest in an energy project.'}
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {currentLang === 'bn'
                      ? 'সঙ্গে সঙ্গে আপনার ক্যাশ রিওয়ার্ডসে কমিশন যুক্ত হবে যা যেকোনো সময় উত্তোলনযোগ্য।'
                      : 'Instant commission is credited to cash rewards, withdrawable anytime.'}
                  </p>
                </div>
              </div>
            </section>

            {/* CARD 5: 📜 REFERRAL PROGRAM RULES & COMMISSION POLICY (পেশাদার নিয়মাবলি ও শর্তসমূহ) */}
            <section
              id="referral-policy-card"
              className="rounded-2xl bg-[#0b1426] border border-slate-800/90 p-4 shadow-xl space-y-3.5"
            >
              {/* Section Header with vertical bar indicator */}
              <div className="flex items-center gap-2">
                <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                  {currentLang === 'bn'
                    ? 'কমিশন হিসাব ও পার্টনারশিপ নিয়মাবলি'
                    : 'Commission Policy & Program Terms'}
                </h3>
              </div>

              {/* Policy Features List */}
              <div className="space-y-2.5 text-xs">
                {/* Rule 1 */}
                <div className="p-3 rounded-xl bg-[#070e1c] border border-slate-800/90 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '১. তাৎক্ষণিক স্বয়ংক্রিয় পে-আউট' : '1. Real-Time Instant Payout'}
                    </h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'আপনার আমন্ত্রিত সদস্য যেকোনো এনার্জি প্রজেক্টে রিচার্জ বা ইনভেস্ট করার ৫ সেকেন্ডের মধ্যে কমিশন স্বয়ংক্রিয়ভাবে ক্রেডিট হয়।'
                        : 'Commissions are credited automatically within 5 seconds whenever an invited partner recharges or activates a project.'}
                    </p>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="p-3 rounded-xl bg-[#070e1c] border border-slate-800/90 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '২. আজীবন ৩-স্তর প্যাসিভ ইনকাম' : '2. 3-Tier Lifetime Yield'}
                    </h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'সরাসরি রেফারে ৭%, ২য় স্তরে ৩% এবং ৩য় স্তরে ১% কমিশন আজীবন প্রযোজ্য। সদস্য যতবার ডিপোজিট করবে, ততবারই আপনি নিয়মিত কমিশন পাবেন।'
                        : 'Earn 7% on Level 1 direct referrals, 3% on Level 2 sub-team, and 1% on Level 3 network depth continuously for life.'}
                    </p>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="p-3 rounded-xl bg-[#070e1c] border border-slate-800/90 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '৩. শর্তহীন ও ফি-মুক্ত ক্যাশআউট' : '3. Zero Fee Direct Cashout'}
                    </h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'অর্জিত রেফারেল রিওয়ার্ড সম্পূর্ণ লক-মুক্ত। এক ক্লিকে মূল ব্যালেন্সে স্থানান্তর করে বিকাশ, নগদ, রকেট অথবা ইউএসডিটিতে (USDT) তুলতে পারবেন।'
                        : 'Claimed commission transfers seamlessly to your main wallet with 0% hidden deductions, ready for instant mobile banking payout.'}
                    </p>
                  </div>
                </div>

                {/* Rule 4 */}
                <div className="p-3 rounded-xl bg-[#070e1c] border border-slate-800/90 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '৪. ভিআইপি টিম লিডারশিপ ও বোনাস' : '4. VIP Leadership & Monthly Salary'}
                    </h5>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'আপনার টিমে ২০ জনের বেশি সক্রিয় বিনিয়োগকারী তৈরি হলে অতিরিক্ত মাসিক ফিক্সড পার্টনারশিপ স্যালারি ও বিশেষ গ্রিড রিওয়ার্ডস প্রদান করা হয়।'
                        : 'Team leaders with 20+ active investors qualify for monthly fixed salaries and exclusive platform booster bonuses.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CARD 6: ❓ FREQUENTLY ASKED QUESTIONS (সচরাচর জিজ্ঞাসিত প্রশ্নাবলি) */}
            <section
              id="referral-faq-card"
              className="rounded-2xl bg-[#0b1426] border border-slate-800/90 p-4 shadow-xl space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                  {currentLang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)' : 'Frequently Asked Questions'}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {/* FAQ 1 */}
                <div className="rounded-xl bg-[#070e1c] border border-slate-800/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                    className="w-full p-3 text-left flex items-center justify-between gap-2 font-bold text-white hover:text-amber-300 transition-colors"
                  >
                    <span>
                      {currentLang === 'bn'
                        ? 'কমিশন পাওয়ার জন্য কি আমার নিজের ইনভেস্টমেন্ট থাকা জরুরি?'
                        : 'Do I need an active investment to earn commissions?'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        expandedFaq === 1 ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === 1 && (
                    <div className="px-3 pb-3 pt-0 text-[11px] text-slate-300 border-t border-slate-800/60 leading-relaxed mt-1">
                      {currentLang === 'bn'
                        ? 'না, কোনো বাধ্যতামূলক ইনভেস্টমেন্টের প্রয়োজন নেই। যেকোনো নিবন্ধিত অ্যাকাউন্ট থেকেই রেফারেল লিংক শেয়ার করে বন্ধুদের যুক্ত করে তাৎক্ষণিক কমিশন আয় করা যায়।'
                        : 'No mandatory investment required. Any registered member can immediately share their link, invite partners, and start accumulating commission.'}
                    </div>
                  )}
                </div>

                {/* FAQ 2 */}
                <div className="rounded-xl bg-[#070e1c] border border-slate-800/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                    className="w-full p-3 text-left flex items-center justify-between gap-2 font-bold text-white hover:text-amber-300 transition-colors"
                  >
                    <span>
                      {currentLang === 'bn'
                        ? 'আমি কতজন বন্ধুকে সর্বোচ্চ রেফার করতে পারব?'
                        : 'Is there a limit on how many friends I can invite?'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        expandedFaq === 2 ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === 2 && (
                    <div className="px-3 pb-3 pt-0 text-[11px] text-slate-300 border-t border-slate-800/60 leading-relaxed mt-1">
                      {currentLang === 'bn'
                        ? 'রেফারেলের কোনো সর্বোচ্চ লিমিট বা সীমা নেই! আপনি যত বেশি সদস্যকে আমন্ত্রণ করবেন, আপনার ৩-স্তর বিশিষ্ট দৈনিক ক্যাশ কমিশন আয় তত বেশি বৃদ্ধি পাবে।'
                        : 'There is zero limit! You can invite as many partners as you wish, creating an expanding 3-tier passive cash flow stream.'}
                    </div>
                  )}
                </div>

                {/* FAQ 3 */}
                <div className="rounded-xl bg-[#070e1c] border border-slate-800/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
                    className="w-full p-3 text-left flex items-center justify-between gap-2 font-bold text-white hover:text-amber-300 transition-colors"
                  >
                    <span>
                      {currentLang === 'bn'
                        ? 'অর্জিত ক্যাশ কমিশন কীভাবে উইথড্র করব?'
                        : 'How do I withdraw my earned referral rewards?'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        expandedFaq === 3 ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === 3 && (
                    <div className="px-3 pb-3 pt-0 text-[11px] text-slate-300 border-t border-slate-800/60 leading-relaxed mt-1">
                      {currentLang === 'bn'
                        ? 'উপরে "উত্তোলনযোগ্য ক্যাশ রিওয়ার্ড"-এর পাশে থাকা "দাবি করুন" বাটনে চাপ দিলে ব্যালেন্স সাথে সাথে মূল ওয়ালেটে চলে যাবে। এরপর বিকাশ বা নগদ দিয়ে যেকোনো সময় টাকা তুলে নিন।'
                        : 'Click "Claim" in the Available Cash Rewards section above to transfer rewards into your main wallet, then initiate a standard withdrawal to bKash, Nagad, or USDT.'}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* CARD 7: 🛡️ OFFICIAL TEAM LEADER & PARTNER SUPPORT */}
            <section
              id="referral-support-card"
              className="rounded-2xl bg-gradient-to-br from-[#0a162b] to-[#08111e] border border-cyan-500/30 p-4 shadow-xl flex items-center justify-between gap-3 mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {currentLang === 'bn' ? 'অফিসিয়াল পার্টনার সাপোর্ট' : 'Official Partner Desk'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {currentLang === 'bn'
                      ? 'টিম লিডারদের জন্য ২৪/৭ বিশেষ টেলিগ্রাম সহযোগিতা ও সাপোর্ট চ্যানেল'
                      : 'Dedicated 24/7 team leader Telegram support channel'}
                  </p>
                </div>
              </div>

              <a
                href="https://t.me"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95"
              >
                <span>{currentLang === 'bn' ? 'যুক্ত হোন' : 'Join'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </section>
          </>
        ) : (
          /* ========================================================================= */
          /* DETAILS TAB: Team Members List, Tier Breakdown & Earning Records          */
          /* ========================================================================= */
          <div className="space-y-4">
            {/* Total Team Earnings Card */}
            <div className="rounded-2xl bg-[#0b1426] border border-cyan-500/30 p-4 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">
                  {currentLang === 'bn' ? 'মোট অর্জিত কমিশন' : 'Total Commission Earned'}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  ৳{totalCommissionsEarned.toFixed(2)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block mb-0.5">
                  {currentLang === 'bn' ? 'মোট সদস্য' : 'Total Team Size'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
                  {ACTIVE_TEAM_MEMBERS.length} {currentLang === 'bn' ? 'জন' : 'Members'}
                </span>
              </div>
            </div>

            {/* Tier Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setTierFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === 'all'
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {currentLang === 'bn' ? 'সব সদস্য' : 'All Tiers'} ({ACTIVE_TEAM_MEMBERS.length})
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === '1'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {currentLang === 'bn' ? '১ম লেভেল (৭%)' : 'Level 1 (7%)'}
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('2')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === '2'
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {currentLang === 'bn' ? '২য় লেভেল (৩%)' : 'Level 2 (3%)'}
              </button>

              <button
                type="button"
                onClick={() => setTierFilter('3')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  tierFilter === '3'
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {currentLang === 'bn' ? '৩য় লেভেল (১%)' : 'Level 3 (1%)'}
              </button>
            </div>

            {/* Team Members List */}
            <div className="space-y-2.5">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-2xl bg-[#0b1426] border border-slate-800/90 flex items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          member.level === 1
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            : member.level === 2
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        L{member.level}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs sm:text-sm">
                            {member.phone}
                          </span>
                          <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-semibold">
                            {currentLang === 'bn' ? 'সক্রিয়' : 'Active'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {member.date} • {currentLang === 'bn' ? 'বিনিয়োগ:' : 'Invest:'} ৳
                          {member.investAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono block">
                        +৳{member.commissionEarned.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {member.level === 1 ? '7% ' : member.level === 2 ? '3% ' : '1% '}
                        {currentLang === 'bn' ? 'কমিশন' : 'Bonus'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-[#0b1426] rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  {currentLang === 'bn'
                    ? 'এই লেভেলে কোনো সদস্য এখনো যুক্ত হয়নি।'
                    : 'No members found in this tier yet.'}
                </div>
              )}
            </div>

            {/* Regulatory Assurance Note */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {currentLang === 'bn'
                    ? 'বিইআরসি ও আইএসও অনুমোদিত ক্লিন এনার্জি কমিশন পলিসি'
                    : 'BERC & ISO 50001 compliant transparent referral rewards'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {currentLang === 'bn'
                  ? 'প্রতিদিনের কমিশন রাত ১২:০০ টার পর স্বয়ংক্রিয়ভাবে অডিট ও আপডেট করা হয়।'
                  : 'Daily referral rewards are audited and settled automatically every midnight.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
