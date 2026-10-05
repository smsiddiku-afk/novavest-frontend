import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  X,
  RefreshCw,
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
  Crown,
} from 'lucide-react';
import { Language } from '../types';
import { getReferralTreeForUser } from '../utils/referralService';
import { subscribeToReferralNetwork, syncReferralAccountsFromFirestore } from '../lib/firebase';
import { PromoBonusScreen } from './PromoBonusScreen';

export interface ReferralMember {
  id: string;
  phone?: string;
  memberId?: string;
  username?: string;
  level: 1 | 2 | 3;
  date: string;
  investAmount: number;
  commissionEarned: number;
  status: 'active' | 'pending';
}

interface ReferralPageProps {
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  userCode?: string;
  userMemberId?: string;
  onBack: () => void;
  onClaimReward?: (amount: number) => void;
  onClaimPromoReward?: (amount: number, level: string) => void;
  showToast?: (msg: string) => void;
  userBalance?: number;
  referralRewards?: number;
  canRefer?: boolean;
  referralLimit?: number;
  onContactManager?: () => void;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({
  currentLang = 'bn',
  themeMode = 'night',
  userCode = 'NV8829',
  userMemberId,
  onBack,
  onClaimReward,
  onClaimPromoReward,
  showToast = (_msg: string) => {},
  userBalance = 0,
  referralRewards = 0,
  canRefer = true,
  referralLimit = 0,
  onContactManager,
}) => {
  // Main Tabs: 'invite' | 'details' | 'promo' (রেফার অপশনের পাশাপাশি প্রমো বোনাস)
  const [activeTab, setActiveTab] = useState<'invite' | 'details' | 'promo'>('invite');

  // Details sub-filter: all | 1 | 2 | 3
  const [tierFilter, setTierFilter] = useState<'all' | '1' | '2' | '3'>('all');

  // FAQ accordion state
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Copy states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveAccounts, setLiveAccounts] = useState<Record<string, any> | undefined>(undefined);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    // 0. Instantaneous seed from localStorage
    try {
      const raw = localStorage.getItem('novavest_registered_accounts');
      if (raw) {
        setLiveAccounts(JSON.parse(raw));
      }
    } catch {}

    // 1. Immediate Firestore initial sync
    syncReferralAccountsFromFirestore()
      .then((accs) => {
        if (accs && Object.keys(accs).length > 0) {
          setLiveAccounts((prev) => ({ ...(prev || {}), ...accs }));
        }
      })
      .catch(() => {});

    // 2. Real-time Firestore snapshot listener for instantaneous 3-tier sync
    const unsubscribe = subscribeToReferralNetwork((streamedAccounts) => {
      setLiveAccounts((prev) => ({ ...(prev || {}), ...streamedAccounts }));
      setRefreshTick((t) => t + 1);
    });

    // 3. Local instantaneous event listener for zero-delay UI update
    const handleUpdate = () => {
      try {
        const raw = localStorage.getItem('novavest_registered_accounts');
        if (raw) {
          setLiveAccounts((prev) => ({ ...(prev || {}), ...JSON.parse(raw) }));
        }
      } catch {}
      setRefreshTick((t) => t + 1);
    };

    window.addEventListener('referral_rewards_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('referral_rewards_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Real referral network data for this user across all 3 levels
  const teamTree = useMemo(
    () => getReferralTreeForUser(userCode, userMemberId, liveAccounts),
    [userCode, userMemberId, refreshTick, liveAccounts]
  );
  const realMembers: ReferralMember[] = useMemo(() => {
    return (teamTree.members || []).map((m) => ({
      id: m.id,
      phone: m.phone,
      memberId: m.memberId,
      username: m.username,
      level: m.level,
      date: m.date,
      investAmount: m.investAmount,
      commissionEarned: m.commissionEarned,
      status: m.status,
    }));
  }, [teamTree]);

  // Available Cash Rewards state: combines Firestore profile referralRewards and real computed tree rewards across all 3 levels
  const currentAvailableRewards = useMemo(() => {
    if (typeof referralRewards === 'number') {
      return Number(Math.max(0, referralRewards).toFixed(2));
    }
    return Number((teamTree.availableRewards || 0).toFixed(2));
  }, [referralRewards, teamTree.availableRewards]);

  const [availableRewards, setAvailableRewards] = useState<number>(currentAvailableRewards);

  // Keep in sync with computed tree or firestore available rewards
  React.useEffect(() => {
    setAvailableRewards(currentAvailableRewards);
  }, [currentAvailableRewards]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualSync = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const freshAccounts = await syncReferralAccountsFromFirestore();
      if (freshAccounts && Object.keys(freshAccounts).length > 0) {
        setLiveAccounts(freshAccounts);
      }
      showToast(currentLang === 'bn' ? 'টিম ডাটা আপডেট করা হয়েছে!' : 'Team data updated!');
    } catch {
      showToast(currentLang === 'bn' ? 'ডাটা সিঙ্ক সম্পন্ন হয়েছে' : 'Sync completed');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const referralLink = `${window.location.origin}/register?ref=${userCode}`;

  const handleCopyCode = () => {
    if (!canRefer) {
      showToast(currentLang === 'bn' ? 'দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।' : 'Please contact the manager representative.');
      if (onContactManager) onContactManager();
      return;
    }
    if (referralLimit > 0 && teamTree.totalTeamCount >= referralLimit) {
      showToast(currentLang === 'bn' ? `আপনার রেফারেল সীমা (${referralLimit} জন) পূর্ণ হয়েছে। দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।` : `Referral limit (${referralLimit}) reached. Please contact manager representative.`);
      if (onContactManager) onContactManager();
      return;
    }
    navigator.clipboard.writeText(userCode);
    setCopiedCode(true);
    showToast(currentLang === 'bn' ? 'রেফারেল কোড কপি করা হয়েছে!' : 'Invitation code copied!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = () => {
    if (!canRefer) {
      showToast(currentLang === 'bn' ? 'দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।' : 'Please contact the manager representative.');
      if (onContactManager) onContactManager();
      return;
    }
    if (referralLimit > 0 && teamTree.totalTeamCount >= referralLimit) {
      showToast(currentLang === 'bn' ? `আপনার রেফারেল সীমা (${referralLimit} জন) পূর্ণ হয়েছে। দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।` : `Referral limit (${referralLimit}) reached. Please contact manager representative.`);
      if (onContactManager) onContactManager();
      return;
    }
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

  const MIN_TRANSFER_AMOUNT = 200;

  const handleClaim = () => {
    if (availableRewards < MIN_TRANSFER_AMOUNT) {
      showToast(
        currentLang === 'bn'
          ? `নূন্যতম ২০০ টাকা জমা হলে মূল ব্যালেন্সে ট্রান্সফার করতে পারবেন। আপনার বর্তমান ব্যালেন্স ৳${availableRewards.toFixed(2)}`
          : `Minimum ৳200 required to transfer. Your current balance is ৳${availableRewards.toFixed(2)}`
      );
      return;
    }

    const claimAmt = availableRewards;
    setAvailableRewards(0);
    try {
      localStorage.setItem('referral_cash_rewards', '0');
      if (userCode) {
        localStorage.setItem(`referral_cash_rewards_${userCode.trim().toUpperCase()}`, '0');
      }
      if (userMemberId) {
        localStorage.setItem(`referral_cash_rewards_${userMemberId.trim().toUpperCase()}`, '0');
      }
    } catch {
      // ignore
    }

    if (onClaimReward) {
      onClaimReward(claimAmt);
    }

    showToast(
      currentLang === 'bn'
        ? `🎉 অভিনন্দন! ৳${claimAmt.toFixed(2)} ক্যাশ রিওয়ার্ড সফলভাবে মূল ব্যালেন্সে যুক্ত হয়েছে!`
        : `🎉 Congratulations! ৳${claimAmt.toFixed(2)} cash reward transferred to main balance!`
    );
  };

  const filteredMembers = realMembers.filter((m) => {
    if (tierFilter === 'all') return true;
    return m.level.toString() === tierFilter;
  });

  const totalCommissionsEarned = realMembers.reduce(
    (sum, m) => sum + m.commissionEarned,
    0
  );

  return (
    <div
      id="full-referral-page"
      className={`w-full min-h-screen flex flex-col relative select-none pb-28 animate-in fade-in duration-200 transition-colors ${
        themeMode === 'day' ? 'bg-[#f4f6fb] text-slate-800' : 'bg-[#06483A] text-slate-100'
      }`}
    >
      {/* 1. Top Header Bar (Golden Amber title & Emerald background matching website) */}
      <header
        id="referral-page-header"
        className={`sticky top-0 z-30 w-full backdrop-blur-md shadow-md transition-colors ${
          themeMode === 'day'
            ? 'bg-white/95 border-b border-slate-200 text-slate-900'
            : 'bg-[#043228]/95 border-b border-[#0d614f]'
        }`}
      >
        <div className="w-full px-4 h-14 flex items-center justify-between">
          <button
            id="referral-back-btn"
            type="button"
            onClick={onBack}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
              themeMode === 'day'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 hover:text-white'
            }`}
            aria-label="Go Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Golden Header Title matching Screenshot */}
          <h1 className={`text-lg sm:text-xl font-extrabold tracking-wide ${
            themeMode === 'day'
              ? 'text-amber-600'
              : 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 drop-shadow-[0_1px_6px_rgba(245,158,11,0.3)]'
          }`}>
            {currentLang === 'bn' ? 'রেফারেল ও টিম কমিশন' : 'Referral'}
          </h1>

          <div className="flex items-center gap-1.5">
            <button
              id="referral-refresh-btn"
              type="button"
              onClick={handleManualSync}
              disabled={isRefreshing}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                themeMode === 'day'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-emerald-950/60 border border-emerald-500/30 text-amber-300 hover:text-amber-200'
              }`}
              title={currentLang === 'bn' ? 'ডাটা সিঙ্ক ও রিফ্রেশ' : 'Sync & Refresh'}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>

            <button
              id="referral-close-btn"
              type="button"
              onClick={onBack}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                themeMode === 'day'
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-emerald-950/60 border border-emerald-500/30 text-amber-300/90 hover:text-amber-200'
              }`}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. Navigation Tabs: Invite | Details | Promo Bonus (রেফার অপশনের পাশাপাশি প্রমো বোনাস) */}
        <div className={`w-full grid grid-cols-3 text-center text-xs sm:text-sm font-bold border-t ${
          themeMode === 'day' ? 'border-slate-200' : 'border-[#0d614f]'
        }`}>
          <button
            id="referral-tab-invite"
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`py-3 relative transition-all cursor-pointer ${
              activeTab === 'invite'
                ? themeMode === 'day'
                  ? 'text-amber-600 font-extrabold'
                  : 'text-amber-300 font-extrabold'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-800 font-medium'
                : 'text-emerald-200/70 hover:text-white font-medium'
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
                ? themeMode === 'day'
                  ? 'text-amber-600 font-extrabold'
                  : 'text-amber-300 font-extrabold'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-800 font-medium'
                : 'text-emerald-200/70 hover:text-white font-medium'
            }`}
          >
            <span>{currentLang === 'bn' ? 'বিস্তারিত (Details)' : 'Details'}</span>
            {activeTab === 'details' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_#f59e0b]" />
            )}
          </button>

          <button
            id="referral-tab-promo"
            type="button"
            onClick={() => setActiveTab('promo')}
            className={`py-3 relative transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'promo'
                ? themeMode === 'day'
                  ? 'text-amber-600 font-extrabold'
                  : 'text-amber-300 font-extrabold'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-800 font-medium'
                : 'text-emerald-200/70 hover:text-white font-medium'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{currentLang === 'bn' ? 'প্রমো বোনাস' : 'Promo'}</span>
            {activeTab === 'promo' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[3px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_#f59e0b]" />
            )}
          </button>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="w-full px-3.5 sm:px-4 pt-4 space-y-4 max-w-md mx-auto">
        {activeTab === 'invite' && (
          <>
            {/* CARD 1: Refer Your Friends and Earn */}
            <section
              id="referral-invite-card"
              className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/40 space-y-3.5 relative overflow-hidden"
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
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#06483A] via-[#085a49] to-[#03261f] border border-amber-500/40 p-3.5 sm:p-4 shadow-xl shadow-emerald-950/50 group">
                {/* Background Ambient Lighting & Cyber Circuit Grid */}
                <div className="absolute -top-14 -right-14 w-40 h-40 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/25 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b98110_1px,transparent_1px),linear-gradient(to_bottom,#10b98110_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

                {/* Top Status & Tier Badge Bar */}
                <div className="relative z-10 flex items-center justify-between gap-2 mb-2.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider shadow-sm">
                    <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>{currentLang === 'bn' ? 'ভিআইপি পার্টনার প্রোগ্রাম' : 'VIP Partner Program'}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
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
                    <p className="text-[10px] text-emerald-100/90 leading-snug font-medium">
                      {currentLang === 'bn'
                        ? 'বন্ধুদের যুক্ত করুন এবং তাদের প্রতিটি প্যাকেজ ক্রয়ে সরাসরি ৩-স্তরে (৬%, ৩%, ১%) নগদ কমিশন বুঝে নিন।'
                        : 'Invite partners & earn instant 3-tier commissions (6%, 3%, 1%) on every package purchase.'}
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
                        <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#6ee7b7" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#064e3b" />
                          <stop offset="100%" stopColor="#022c22" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>

                      {/* Holographic orbital pulse rings */}
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" opacity="0.45" />
                      <circle cx="60" cy="60" r="38" fill="none" stroke="#fbbf24" strokeWidth="1.2" opacity="0.6" />

                      {/* Central Energy Grid Power Generator Base */}
                      <polygon points="60,26 92,44 92,78 60,96 28,78 28,44" fill="url(#hubGrad)" stroke="url(#emeraldGrad)" strokeWidth="2" />
                      <polygon points="60,32 86,47 86,74 60,89 34,74 34,47" fill="#03261f" stroke="#059669" strokeWidth="1" opacity="0.85" />

                      {/* Power grid nodes and glowing core */}
                      <circle cx="60" cy="60" r="14" fill="#059669" opacity="0.3" filter="url(#glow)" />
                      <circle cx="60" cy="60" r="8" fill="#10b981" />
                      <polygon points="60,54 65,60 61,60 62,66 56,60 59,60" fill="#ffffff" />

                      {/* Floating Golden Coin 1 (Level 1: 6%) */}
                      <g transform="translate(18, 16)">
                        <circle cx="12" cy="12" r="11" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="1" />
                        <circle cx="12" cy="12" r="8.5" fill="none" stroke="#78350f" strokeWidth="0.8" opacity="0.6" />
                        <text x="12" y="15.5" fontSize="8.5" fontWeight="900" textAnchor="middle" fill="#451a03" fontFamily="sans-serif">6%</text>
                      </g>

                      {/* Floating Golden Coin 2 (Level 2: 3%) */}
                      <g transform="translate(86, 68)">
                        <circle cx="10" cy="10" r="9" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="1" />
                        <text x="10" y="13" fontSize="8" fontWeight="900" textAnchor="middle" fill="#451a03" fontFamily="sans-serif">3%</text>
                      </g>

                      {/* Floating Golden Coin 3 (Level 3: 1%) */}
                      <g transform="translate(14, 78)">
                        <circle cx="8" cy="8" r="7" fill="url(#goldGrad)" stroke="#fef08a" strokeWidth="0.8" />
                        <text x="8" y="10.5" fontSize="7" fontWeight="900" textAnchor="middle" fill="#451a03" fontFamily="sans-serif">1%</text>
                      </g>

                      {/* Laser connection arcs */}
                      <line x1="30" y1="28" x2="52" y2="52" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.7" />
                      <line x1="86" y1="74" x2="68" y2="64" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.7" />
                      <line x1="28" y1="82" x2="52" y2="68" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2,2" opacity="0.7" />
                    </svg>
                  </div>
                </div>

                {/* Bottom 3-Tier Commission Badges Pill Strip (6% / 3% / 1%) */}
                <div className="relative z-10 mt-3 pt-2.5 border-t border-emerald-700/50 grid grid-cols-3 gap-1.5 sm:gap-2">
                  <div className="bg-[#03261f]/90 border border-amber-500/40 rounded-xl py-1 px-1.5 text-center flex flex-col items-center">
                    <span className="text-[9px] text-amber-300 font-bold uppercase">{currentLang === 'bn' ? '১ম স্তর' : 'Level 1'}</span>
                    <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">6%</span>
                    <span className="text-[8px] text-emerald-200/70">{currentLang === 'bn' ? 'সরাসরি' : 'Direct'}</span>
                  </div>

                  <div className="bg-[#03261f]/90 border border-emerald-500/40 rounded-xl py-1 px-1.5 text-center flex flex-col items-center">
                    <span className="text-[9px] text-emerald-300 font-bold uppercase">{currentLang === 'bn' ? '২য় স্তর' : 'Level 2'}</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-300 font-mono">3%</span>
                    <span className="text-[8px] text-emerald-200/70">{currentLang === 'bn' ? 'সাব-টিম' : 'Sub-Team'}</span>
                  </div>

                  <div className="bg-[#03261f]/90 border border-teal-500/40 rounded-xl py-1 px-1.5 text-center flex flex-col items-center">
                    <span className="text-[9px] text-teal-300 font-bold uppercase">{currentLang === 'bn' ? '৩য় স্তর' : 'Level 3'}</span>
                    <span className="text-xs sm:text-sm font-black text-teal-300 font-mono">1%</span>
                    <span className="text-[8px] text-emerald-200/70">{currentLang === 'bn' ? 'নেটওয়ার্ক' : 'Network'}</span>
                  </div>
                </div>
              </div>

              {/* QR Code and Sharing Actions (2 Columns matching user screenshot) */}
              <div className="grid grid-cols-12 gap-3 pt-1">
                {/* Left Column (5 cols): Invitation QR Code */}
                <div className="col-span-5 flex flex-col items-center justify-between bg-[#03261f] border border-[#0d614f] rounded-xl p-2.5 shadow-inner">
                  <span className="text-[11px] font-semibold text-emerald-200 mb-1.5 text-center leading-tight">
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
                      <rect x="44" y="48" width="12" height="12" fill="#059669" rx="2" />
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
                    <div className="absolute inset-0 m-auto w-5 h-5 rounded-full bg-[#06483A] border border-amber-400 flex items-center justify-center text-amber-300 shadow-sm">
                      <Zap className="w-3 h-3 fill-current" />
                    </div>
                  </div>

                  <span className="text-[9px] text-emerald-300/80 mt-1">
                    {currentLang === 'bn' ? 'স্ক্যান করুন' : 'Scan to Join'}
                  </span>
                </div>

                {/* Right Column (7 cols): Invitation Link & Code */}
                <div className="col-span-7 flex flex-col justify-between space-y-2.5">
                  {/* Invitation Link Section */}
                  <div>
                    <span className="block text-[11px] font-semibold text-emerald-200 mb-1">
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
                    <span className="block text-[11px] font-semibold text-emerald-200 mb-1">
                      {currentLang === 'bn' ? 'আমন্ত্রণ কোড' : 'Invitation Code'}
                    </span>

                    <div className="flex items-center rounded-xl bg-[#03261f] border border-[#0d614f] overflow-hidden shadow-inner">
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
              className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 grid grid-cols-3 divide-x divide-[#0d614f] text-center"
            >
              {/* Col 1: Referral Count */}
              <div className="px-1.5 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-emerald-200/80 block mb-1">
                  {currentLang === 'bn' ? 'রেফারেল সংখ্যা' : 'Referral Count'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono tracking-tight">
                  {teamTree.totalTeamCount}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {currentLang === 'bn' ? `সক্রিয়: ${teamTree.totalActiveCount}` : `Active: ${teamTree.totalActiveCount}`}
                </span>
              </div>

              {/* Col 2: Today's Income (২৪ ঘণ্টা চক্র) */}
              <div className="px-1.5 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-emerald-200/80 block mb-1">
                  {currentLang === 'bn' ? 'আজকের ইনকাম' : "Today's Income"}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-0.5">
                  <span className="text-sm text-amber-500">৳</span>
                  <span>{teamTree.todayEarnings.toFixed(2)}</span>
                </span>
                <span className="text-[9px] text-emerald-300/70 font-medium">
                  {currentLang === 'bn' ? '২৪ ঘণ্টা চক্র' : '24h cycle'}
                </span>
              </div>

              {/* Col 3: Yesterday's Income (পূর্ববর্তী ২৪ ঘণ্টা) */}
              <div className="px-1.5 flex flex-col justify-center">
                <span className="text-[11px] font-medium text-emerald-200/80 block mb-1">
                  {currentLang === 'bn' ? 'গতকালের ইনকাম' : "Yesterday's Income"}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tracking-tight flex items-center justify-center gap-0.5">
                  <span className="text-sm text-amber-500">৳</span>
                  <span>{teamTree.yesterdayEarnings.toFixed(2)}</span>
                </span>
                <span className="text-[9px] text-emerald-300/70 font-medium">
                  {currentLang === 'bn' ? 'পূর্ববর্তী ২৪ ঘণ্টা' : 'Previous 24h'}
                </span>
              </div>
            </section>

            {/* CARD 2.5: Promo Bonus & 3-Level Active Members (রেফার অপশনের পাশাপাশি প্রমো বোনাস) */}
            <section
              id="referral-promo-bonus-overview-card"
              className="rounded-2xl bg-gradient-to-b from-[#043b2f] to-[#03261f] border border-amber-400/40 p-4 shadow-xl shadow-emerald-950/40 space-y-3 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Crown className="w-4.5 h-4.5 fill-amber-400 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight flex items-center gap-1.5">
                      <span>{currentLang === 'bn' ? 'প্রমো বোনাস (VIP রিওয়ার্ডস)' : 'Promo Bonus & VIP Rewards'}</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-bold text-emerald-300">
                        {currentLang === 'bn' ? '৩-স্তর' : '3-Tier'}
                      </span>
                    </h3>
                    <p className="text-[10px] text-emerald-200/80">
                      {currentLang === 'bn'
                        ? '৩ লেভেলের সক্রিয় সদস্য বাড়িয়ে VIP বোনাস আনলক করুন'
                        : 'Grow active members in 3 levels to unlock VIP rewards'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('promo')}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <span>{currentLang === 'bn' ? 'প্রমো বোনাস' : 'Promo'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3-Level Breakdown Grid: Level 1, Level 2, Level 3 */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                {/* Level 1 */}
                <div className="p-2 rounded-xl bg-[#03261f] border border-amber-500/30 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-amber-300">
                    {currentLang === 'bn' ? '১ম লেভেল' : 'Level 1'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-amber-400 font-mono my-0.5">
                    {teamTree.level1Count}
                  </span>
                  <span className="text-[9px] text-emerald-300 font-bold">
                    {currentLang === 'bn' ? `সক্রিয়: ${teamTree.activeLevel1Count}` : `Active: ${teamTree.activeLevel1Count}`}
                  </span>
                  <span className="text-[8px] text-amber-300/80 mt-0.5 font-mono">৬% কমিশন</span>
                </div>

                {/* Level 2 */}
                <div className="p-2 rounded-xl bg-[#03261f] border border-emerald-500/30 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-emerald-300">
                    {currentLang === 'bn' ? '২য় লেভেল' : 'Level 2'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-emerald-400 font-mono my-0.5">
                    {teamTree.level2Count}
                  </span>
                  <span className="text-[9px] text-emerald-300 font-bold">
                    {currentLang === 'bn' ? `সক্রিয়: ${teamTree.activeLevel2Count}` : `Active: ${teamTree.activeLevel2Count}`}
                  </span>
                  <span className="text-[8px] text-emerald-300/80 mt-0.5 font-mono">৩% কমিশন</span>
                </div>

                {/* Level 3 */}
                <div className="p-2 rounded-xl bg-[#03261f] border border-teal-500/30 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-teal-300">
                    {currentLang === 'bn' ? '৩য় লেভেল' : 'Level 3'}
                  </span>
                  <span className="text-base sm:text-lg font-black text-teal-400 font-mono my-0.5">
                    {teamTree.level3Count}
                  </span>
                  <span className="text-[9px] text-emerald-300 font-bold">
                    {currentLang === 'bn' ? `সক্রিয়: ${teamTree.activeLevel3Count}` : `Active: ${teamTree.activeLevel3Count}`}
                  </span>
                  <span className="text-[8px] text-teal-300/80 mt-0.5 font-mono">১% কমিশন</span>
                </div>
              </div>

              {/* Total Active Across 3 Levels Badge Banner */}
              <div className="p-2.5 rounded-xl bg-[#021f18] border border-[#0d614f] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-200 font-medium text-[11px]">
                    {currentLang === 'bn' ? '৩ লেভেলে মোট সক্রিয় সদস্য:' : 'Total Active in 3 Levels:'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    {teamTree.totalActiveCount} {currentLang === 'bn' ? 'জন' : ''}
                  </span>
                  <span className="text-[10px] text-emerald-200/70 font-mono">
                    ({teamTree.totalTeamCount} {currentLang === 'bn' ? 'মোট' : 'total'})
                  </span>
                </div>
              </div>
            </section>

            {/* CARD 3: Available Cash Rewards + Claim Button (matching Screenshot) */}
            <section
              id="referral-cash-rewards-card"
              className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 space-y-3"
            >
              {/* Section Header with vertical bar indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                    {currentLang === 'bn'
                      ? 'উত্তোলনযোগ্য ক্যাশ রিওয়ার্ড (Available Cash)'
                      : 'Available Cash Rewards'}
                  </h3>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  availableRewards >= 200
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                }`}>
                  {currentLang === 'bn' ? 'নূন্যতম ট্রান্সফার ৳২০০' : 'Min Transfer ৳200'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {/* Reward Amount */}
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight flex items-baseline gap-1">
                    <span className="text-lg sm:text-xl font-bold text-amber-500">৳</span>
                    <span>{availableRewards.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] sm:text-[11px] text-emerald-200/80">
                      {currentLang === 'bn'
                        ? 'রেফারেল কমিশন জমা থাকবে • ২০০ টাকা হলে ট্রান্সফার করতে পারবেন'
                        : 'Commissions accumulate here • Transfer when ৳200 or more'}
                    </span>
                    <span className={`text-[10px] font-semibold ${
                      availableRewards >= 200 ? 'text-emerald-300' : 'text-amber-400'
                    }`}>
                      {currentLang === 'bn'
                        ? (availableRewards >= 200
                            ? '✓ ট্রান্সফার করার জন্য প্রস্তুত (২০০ টাকার বেশি হয়েছে)'
                            : `• নূন্যতম ২০০ টাকা হলে ট্রান্সফার করা যাবে (বাকি ৳${Math.max(0, 200 - availableRewards).toFixed(2)})`)
                        : (availableRewards >= 200
                            ? '✓ Ready to transfer (min ৳200 reached)'
                            : `• Min ৳200 required to transfer (needs ৳${Math.max(0, 200 - availableRewards).toFixed(2)} more)`)}
                    </span>
                  </div>
                </div>

                {/* Claim Button */}
                <button
                  id="referral-claim-reward-btn"
                  type="button"
                  onClick={handleClaim}
                  disabled={availableRewards < 200}
                  className={`px-5 sm:px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 ${
                    availableRewards >= 200
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-500/25 ring-2 ring-amber-400/50 cursor-pointer animate-pulse'
                      : 'bg-[#03261f] text-emerald-400/50 border border-[#0d614f] cursor-not-allowed opacity-75'
                  }`}
                  title={
                    availableRewards >= 200
                      ? (currentLang === 'bn' ? 'ক্যাশ রিওয়ার্ড মূল ওয়ালেটে স্থানান্তর করুন' : 'Transfer rewards to main wallet')
                      : (currentLang === 'bn' ? 'নূন্যতম ২০০ টাকা হলে স্থানান্তর করতে পারবেন' : 'Min ৳200 required to transfer')
                  }
                >
                  {currentLang === 'bn' ? 'ট্রান্সফার করুন' : 'Transfer'}
                </button>
              </div>
            </section>

            {/* CARD 4: How to earn more rewards (6%, 3%, 1% Tier breakdown matching emerald theme) */}
            <section
              id="referral-how-it-works-card"
              className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 space-y-3.5"
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

              {/* 3 Tier Commission Overview Cards (6% / 3% / 1%) */}
              <div className="grid grid-cols-3 gap-2">
                {/* Tier 1: 6% */}
                <div className="rounded-xl bg-[#03261f] border border-amber-500/40 p-2.5 text-center flex flex-col items-center justify-between shadow-inner">
                  <span className="text-[10px] font-bold text-amber-300 uppercase">
                    {currentLang === 'bn' ? '১ম লেভেল' : 'Level 1'}
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-yellow-400 font-mono">
                      6%
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-200/80 leading-tight">
                    {currentLang === 'bn' ? 'সরাসরি মেম্বার' : 'Direct Members'}
                  </span>
                </div>

                {/* Tier 2: 3% */}
                <div className="rounded-xl bg-[#03261f] border border-emerald-500/40 p-2.5 text-center flex flex-col items-center justify-between shadow-inner">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase">
                    {currentLang === 'bn' ? '২য় লেভেল' : 'Level 2'}
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400 font-mono">
                      3%
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-200/80 leading-tight">
                    {currentLang === 'bn' ? 'সাব টিম সদস্য' : 'Sub-team Team'}
                  </span>
                </div>

                {/* Tier 3: 1% */}
                <div className="rounded-xl bg-[#03261f] border border-teal-500/40 p-2.5 text-center flex flex-col items-center justify-between shadow-inner">
                  <span className="text-[10px] font-bold text-teal-300 uppercase">
                    {currentLang === 'bn' ? '৩য় লেভেল' : 'Level 3'}
                  </span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-400 font-mono">
                      1%
                    </span>
                  </div>
                  <span className="text-[9px] text-emerald-200/80 leading-tight">
                    {currentLang === 'bn' ? 'নেটওয়ার্ক সদস্য' : 'Network Depth'}
                  </span>
                </div>
              </div>

              {/* Step by Step Flow */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#03261f] border border-[#0d614f]">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-emerald-100 leading-relaxed">
                    {currentLang === 'bn'
                      ? 'আপনার বিশেষ রেফারেল লিংক বা কিউআর কোড বন্ধুদের সাথে শেয়ার করুন।'
                      : 'Share your exclusive invitation link or QR code with friends.'}
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#03261f] border border-[#0d614f]">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-emerald-100 leading-relaxed">
                    {currentLang === 'bn'
                      ? 'বন্ধুরা রেজিস্ট্রেশন করে যেকোনো এনার্জি প্রজেক্টে অংশগ্রহণ করবে।'
                      : 'Friends register and invest in an energy project.'}
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2 rounded-xl bg-[#03261f] border border-[#0d614f]">
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-emerald-100 leading-relaxed">
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
              className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 space-y-3.5"
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
                <div className="p-3 rounded-xl bg-[#03261f] border border-[#0d614f] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '১. তাৎক্ষণিক স্বয়ংক্রিয় পে-আউট' : '1. Real-Time Instant Payout'}
                    </h5>
                    <p className="text-emerald-100/90 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'আপনার আমন্ত্রিত সদস্য যেকোনো এনার্জি প্যাকেজে বিনিয়োগ/ক্রয় করার সাথে সাথে ক্রয়মূল্যের অনুপাতে কমিশন স্বয়ংক্রিয়ভাবে ক্রেডিট হয়।'
                        : 'Commissions are credited automatically in proportion to the package value whenever an invited partner purchases an energy package.'}
                    </p>
                  </div>
                </div>

                {/* Rule 2 */}
                <div className="p-3 rounded-xl bg-[#03261f] border border-[#0d614f] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '২. আজীবন ৩-স্তর প্যাসিভ ইনকাম (৬% / ৩% / ১%)' : '2. 3-Tier Lifetime Yield (6% / 3% / 1%)'}
                    </h5>
                    <p className="text-emerald-100/90 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'সরাসরি রেফারে ৬%, ২য় স্তরে ৩% এবং ৩য় স্তরে ১% কমিশন প্রযোজ্য। সদস্য যতবার প্যাকেজ কিনবেন, প্যাকেজ মূল্যের অনুপাতে ততবারই আপনি নিয়মিত কমিশন পাবেন (শুধু রিচার্জে কোনো কমিশন প্রযোজ্য নয়)।'
                        : 'Earn 6% on Level 1, 3% on Level 2, and 1% on Level 3 proportional to the purchased package price (recharging alone yields no commission).'}
                    </p>
                  </div>
                </div>

                {/* Rule 3 */}
                <div className="p-3 rounded-xl bg-[#03261f] border border-[#0d614f] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '৩. শর্তহীন ও ফি-মুক্ত ক্যাশআউট' : '3. Zero Fee Direct Cashout'}
                    </h5>
                    <p className="text-emerald-100/90 text-[11px] leading-relaxed">
                      {currentLang === 'bn'
                        ? 'অর্জিত রেফারেল রিওয়ার্ড সম্পূর্ণ লক-মুক্ত। এক ক্লিকে মূল ব্যালেন্সে স্থানান্তর করে বিকাশ বা নগদে টাকায় তুলতে পারবেন।'
                        : 'Claimed commission transfers seamlessly to your main wallet with 0% hidden deductions, ready for instant mobile banking payout.'}
                    </p>
                  </div>
                </div>

                {/* Rule 4 */}
                <div className="p-3 rounded-xl bg-[#03261f] border border-[#0d614f] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-white text-xs">
                      {currentLang === 'bn' ? '৪. ভিআইপি টিম লিডারশিপ ও বোনাস' : '4. VIP Leadership & Monthly Salary'}
                    </h5>
                    <p className="text-emerald-100/90 text-[11px] leading-relaxed">
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
              className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="w-1 h-4.5 bg-gradient-to-b from-amber-400 to-yellow-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                <h3 className="text-sm sm:text-[15px] font-bold text-white tracking-wide">
                  {currentLang === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)' : 'Frequently Asked Questions'}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                {/* FAQ 1 */}
                <div className="rounded-xl bg-[#03261f] border border-[#0d614f] overflow-hidden">
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
                      className={`w-4 h-4 text-emerald-400 transition-transform ${
                        expandedFaq === 1 ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === 1 && (
                    <div className="px-3 pb-3 pt-0 text-[11px] text-emerald-100/90 border-t border-[#0d614f]/70 leading-relaxed mt-1">
                      {currentLang === 'bn'
                        ? 'না, কোনো বাধ্যতামূলক ইনভেস্টমেন্টের প্রয়োজন নেই। যেকোনো নিবন্ধিত অ্যাকাউন্ট থেকেই রেফারেল লিংক শেয়ার করে বন্ধুদের যুক্ত করে তাৎক্ষণিক কমিশন আয় করা যায়।'
                        : 'No mandatory investment required. Any registered member can immediately share their link, invite partners, and start accumulating commission.'}
                    </div>
                  )}
                </div>

                {/* FAQ 2 */}
                <div className="rounded-xl bg-[#03261f] border border-[#0d614f] overflow-hidden">
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
                      className={`w-4 h-4 text-emerald-400 transition-transform ${
                        expandedFaq === 2 ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === 2 && (
                    <div className="px-3 pb-3 pt-0 text-[11px] text-emerald-100/90 border-t border-[#0d614f]/70 leading-relaxed mt-1">
                      {currentLang === 'bn'
                        ? 'রেফারেলের কোনো সর্বোচ্চ লিমিট বা সীমা নেই! আপনি যত বেশি সদস্যকে আমন্ত্রণ করবেন, আপনার ৩-স্তর বিশিষ্ট দৈনিক ক্যাশ কমিশন আয় তত বেশি বৃদ্ধি পাবে।'
                        : 'There is zero limit! You can invite as many partners as you wish, creating an expanding 3-tier passive cash flow stream.'}
                    </div>
                  )}
                </div>

                {/* FAQ 3 */}
                <div className="rounded-xl bg-[#03261f] border border-[#0d614f] overflow-hidden">
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
                      className={`w-4 h-4 text-emerald-400 transition-transform ${
                        expandedFaq === 3 ? 'rotate-180 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === 3 && (
                    <div className="px-3 pb-3 pt-0 text-[11px] text-emerald-100/90 border-t border-[#0d614f]/70 leading-relaxed mt-1">
                      {currentLang === 'bn'
                        ? 'উপরে "উত্তোলনযোগ্য ক্যাশ রিওয়ার্ড"-এ ন্যূনতম ২০০.০০ টাকা হলে "ট্রান্সফার করুন" বাটনে চাপ দিলে ব্যালেন্স সাথে সাথে মূল ওয়ালেটে চলে যাবে। এরপর বিকাশ বা নগদ দিয়ে যেকোনো সময় টাকা তুলে নিন।'
                        : 'Once you accumulate a minimum of ৳200.00, click "Transfer" in the Available Cash Rewards section above to move rewards into your main wallet, then initiate a standard withdrawal to bKash or Nagad.'}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* CARD 7: 🛡️ OFFICIAL TEAM LEADER & PARTNER SUPPORT */}
            <section
              id="referral-support-card"
              className="rounded-2xl bg-gradient-to-br from-[#043228] via-[#053d31] to-[#03261f] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 flex items-center justify-between gap-3 mb-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {currentLang === 'bn' ? 'অফিসিয়াল পার্টনার সাপোর্ট' : 'Official Partner Desk'}
                  </h4>
                  <p className="text-[10px] text-emerald-200/80 mt-0.5">
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
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold flex items-center gap-1 transition-all shrink-0 active:scale-95 shadow-md shadow-emerald-950/30"
              >
                <span>{currentLang === 'bn' ? 'যুক্ত হোন' : 'Join'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </section>
          </>
        )}

        {/* ========================================================================= */}
        {/* DETAILS TAB: Team Members List, Tier Breakdown & Earning Records          */}
        {/* ========================================================================= */}
        {activeTab === 'details' && (
          <div className="space-y-4">
            {/* Total Team Earnings Card */}
            <div className="rounded-2xl bg-[#043228] border border-[#0d614f] p-4 shadow-xl shadow-emerald-950/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-200/80 block mb-0.5">
                  {currentLang === 'bn' ? 'মোট অর্জিত কমিশন' : 'Total Commission Earned'}
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  ৳{totalCommissionsEarned.toFixed(2)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-emerald-200/80 block mb-0.5">
                  {currentLang === 'bn' ? 'মোট সদস্য' : 'Total Members'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-emerald-300 font-mono">
                  {realMembers.length} {currentLang === 'bn' ? 'জন' : ''}
                </span>
                <span className="text-[11px] text-emerald-300 block font-medium">
                  {currentLang === 'bn' ? 'একটিভ মেম্বার:' : 'Active Members:'} {teamTree.totalActiveCount} {currentLang === 'bn' ? 'জন' : ''}
                </span>
              </div>
            </div>

            {/* Promo Bonus Quick Link Card in Details */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#043228] to-[#03261f] border border-amber-400/40 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                  <Crown className="w-4.5 h-4.5 fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    {currentLang === 'bn' ? 'প্রমো বোনাস ও ভিআইপি রিওয়ার্ডস' : 'Promo Bonus & VIP Rewards'}
                  </h4>
                  <p className="text-[10px] text-emerald-200/80">
                    {currentLang === 'bn'
                      ? `৩ লেভেলে সক্রিয়: ${teamTree.totalActiveCount} জন (VIP বোনাস আনলক করুন)`
                      : `Active in 3 levels: ${teamTree.totalActiveCount} (Unlock VIP bonuses)`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('promo')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shrink-0 cursor-pointer active:scale-95 shadow-xs"
              >
                <span>{currentLang === 'bn' ? 'প্রমো বোনাস' : 'Promo'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Tier Filter Chips with Active Counts */}
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
                {currentLang === 'bn' ? 'সব সদস্য' : 'All'} ({realMembers.length}) • {currentLang === 'bn' ? 'একটিভ' : 'Active'}: {teamTree.totalActiveCount}
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
                {currentLang === 'bn' ? '১ম লেভেল (৬%)' : 'Level 1 (6%)'} ({teamTree.level1Count}) • {currentLang === 'bn' ? 'একটিভ' : 'Active'}: {teamTree.activeLevel1Count}
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
                {currentLang === 'bn' ? '২য় লেভেল (৩%)' : 'Level 2 (3%)'} ({teamTree.level2Count}) • {currentLang === 'bn' ? 'একটিভ' : 'Active'}: {teamTree.activeLevel2Count}
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
                {currentLang === 'bn' ? '৩য় লেভেল (১%)' : 'Level 3 (1%)'} ({teamTree.level3Count}) • {currentLang === 'bn' ? 'একটিভ' : 'Active'}: {teamTree.activeLevel3Count}
              </button>
            </div>

            {/* Team Members List */}
            <div className="space-y-2.5">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => (
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
                              {currentLang === 'bn' ? 'একটিভ' : 'Active'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-emerald-200/70 block mt-0.5">
                          {member.memberId ? `মেম্বার আইডি: ${member.memberId} • ` : ''}{member.date} • {currentLang === 'bn' ? 'বিনিয়োগ:' : 'Invest:'} ৳
                          {member.investAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      {member.commissionEarned > 0 ? (
                        <span className="text-xs sm:text-sm font-bold text-amber-400 font-mono block">
                          +৳{member.commissionEarned.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-emerald-200/50 font-mono block">
                          ৳0.00
                        </span>
                      )}
                      <span className="text-[10px] text-emerald-200/80">
                        {member.level === 1 ? '6% ' : member.level === 2 ? '3% ' : '1% '}
                        {currentLang === 'bn' ? 'কমিশন' : 'Bonus'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-[#043228] rounded-2xl border border-[#0d614f] text-emerald-200/80 text-xs">
                  {currentLang === 'bn'
                    ? 'এই লেভেলে কোনো সদস্য এখনো যুক্ত হয়নি।'
                    : 'No members found in this tier yet.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROMO BONUS TAB: Integrated directly alongside Referral Option             */}
        {/* ========================================================================= */}
        {activeTab === 'promo' && (
          <div className="w-full pb-8">
            <PromoBonusScreen
              currentLang={currentLang}
              themeMode={themeMode}
              userCode={userCode}
              userMemberId={userMemberId}
              onBack={() => setActiveTab('invite')}
              onNavigateToReferral={() => setActiveTab('invite')}
              onClaimReward={(amt, lvl) => {
                if (onClaimPromoReward) {
                  onClaimPromoReward(amt, lvl);
                } else if (onClaimReward) {
                  onClaimReward(amt);
                }
              }}
              showToast={showToast}
            />
          </div>
        )}
      </main>
    </div>
  );
};
