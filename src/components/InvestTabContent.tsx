import React, { useState, useEffect } from 'react';
import { scrollAppToTop } from '../utils/scrollHelper';
import {
  Sun,
  Wind,
  Droplets,
  Layers,
  LayoutGrid,
  ChevronRight,
  Lock,
  CheckCircle2,
  X,
  Zap,
  TrendingUp,
  Clock,
  Coins,
  Crown,
  Sparkles,
  ShieldCheck,
  Menu,
  Globe,
  Bell,
  ChevronDown,
  ArrowRight,
  Wallet,
  AlertCircle,
  Gem,
  Star,
} from 'lucide-react';
import { Language } from '../types';
import { resolveImageSrc, handleImageError } from '../utils/imageUtils';

export interface InvestmentPlan {
  id: string;
  category: 'solar' | 'wind' | 'hydro' | 'combo';
  badgeCategoryEn: string;
  badgeCategoryBn: string;
  badgeIconType: 'sun' | 'wind' | 'droplet' | 'crown' | 'gem' | 'star';
  nameEn: string;
  nameBn: string;
  taglineEn: string;
  taglineBn: string;
  image: string;
  minInvestmentUsd: number;
  minInvestmentBdt: number;
  durationDays: number;
  dailyReturnPercent: number;
  totalReturnPercent: number;
  maxPurchaseLimit?: number; // e.g. 2 for first 2 packages
  requiredVipLevel: number; // 0 for first 2, 1 for remaining
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 PACKAGES EXACTLY MATCHING USER SCREENSHOT
// ─────────────────────────────────────────────────────────────────────────────
export const INVESTMENT_PLANS: InvestmentPlan[] = [
  {
    id: 'basic-plan',
    category: 'solar',
    badgeCategoryEn: 'Solar Energy',
    badgeCategoryBn: 'সোলার এনার্জি',
    badgeIconType: 'sun',
    nameEn: 'Basic Plan',
    nameBn: 'বেসিক প্ল্যান',
    taglineEn: 'Stable returns | 100% Renewable',
    taglineBn: 'স্থির রিটার্ন | ১০০% নবায়নযোগ্য',
    image: '/images/apex-helios-solar.jpg',
    minInvestmentUsd: 10,
    minInvestmentBdt: 1200,
    durationDays: 30,
    dailyReturnPercent: 1.5,
    totalReturnPercent: 45,
    maxPurchaseLimit: 2, // Limit: 0/2
    requiredVipLevel: 0,
  },
  {
    id: 'standard-plan',
    category: 'wind',
    badgeCategoryEn: 'Wind Energy',
    badgeCategoryBn: 'উইন্ড এনার্জি',
    badgeIconType: 'wind',
    nameEn: 'Standard Plan',
    nameBn: 'স্ট্যান্ডার্ড প্ল্যান',
    taglineEn: 'Stable returns | Clean Energy',
    taglineBn: 'স্থির রিটার্ন | ক্লিন এনার্জি',
    image: '/images/novawind-facility.jpg',
    minInvestmentUsd: 50,
    minInvestmentBdt: 6000,
    durationDays: 45,
    dailyReturnPercent: 2.6,
    totalReturnPercent: 90,
    maxPurchaseLimit: 2, // Limit: 0/2
    requiredVipLevel: 0,
  },
  {
    id: 'premium-plan',
    category: 'hydro',
    badgeCategoryEn: 'Hydro Energy',
    badgeCategoryBn: 'হাইড্রো এনার্জি',
    badgeIconType: 'droplet',
    nameEn: 'Premium Plan',
    nameBn: 'প্রিমিয়াম প্ল্যান',
    taglineEn: 'Long Term Growth | Sustainable',
    taglineBn: 'দীর্ঘমেয়াদী প্রবৃদ্ধি | টেকসই শক্তি',
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80',
    minInvestmentUsd: 100,
    minInvestmentBdt: 12000,
    durationDays: 60,
    dailyReturnPercent: 2.5,
    totalReturnPercent: 150,
    requiredVipLevel: 1, // VIP1 Required
  },
  {
    id: 'vip-plan',
    category: 'combo',
    badgeCategoryEn: 'VIP Plan',
    badgeCategoryBn: 'ভিআইপি প্ল্যান',
    badgeIconType: 'crown',
    nameEn: 'VIP Plan',
    nameBn: 'ভিআইপি প্ল্যান',
    taglineEn: 'High Profit | Advanced Project',
    taglineBn: 'উচ্চ মুনাফা | অ্যাডভান্সড প্রজেক্ট',
    image: '/images/smart_turbine_plant_1788466039952.jpg',
    minInvestmentUsd: 200,
    minInvestmentBdt: 24000,
    durationDays: 75,
    dailyReturnPercent: 3.0,
    totalReturnPercent: 225,
    requiredVipLevel: 1, // VIP1 Required
  },
  {
    id: 'diamond-plan',
    category: 'solar',
    badgeCategoryEn: 'Diamond Plan',
    badgeCategoryBn: 'ডায়মন্ড প্ল্যান',
    badgeIconType: 'gem',
    nameEn: 'Diamond Plan',
    nameBn: 'ডায়মন্ড প্ল্যান',
    taglineEn: 'Maximum Profit | Premium Project',
    taglineBn: 'সর্বোচ্চ মুনাফা | প্রিমিয়াম প্রজেক্ট',
    image: '/images/solar_ai_substation_1788465992131.jpg',
    minInvestmentUsd: 500,
    minInvestmentBdt: 60000,
    durationDays: 90,
    dailyReturnPercent: 3.5,
    totalReturnPercent: 315,
    requiredVipLevel: 1, // VIP1 Required
  },
  {
    id: 'platinum-plan',
    category: 'wind',
    badgeCategoryEn: 'Platinum Plan',
    badgeCategoryBn: 'প্লাটিনাম প্ল্যান',
    badgeIconType: 'star',
    nameEn: 'Platinum Plan',
    nameBn: 'প্লাটিনাম প্ল্যান',
    taglineEn: 'Elite Investment | Long Term',
    taglineBn: 'এলিট বিনিয়োগ | দীর্ঘমেয়াদী চুক্তি',
    image: '/images/vanguard-bess-storage.jpg',
    minInvestmentUsd: 1000,
    minInvestmentBdt: 120000,
    durationDays: 120,
    dailyReturnPercent: 4.0,
    totalReturnPercent: 480,
    requiredVipLevel: 1, // VIP1 Required
  },
];

interface InvestTabContentProps {
  userBalance: number;
  userVipLevel?: number;
  userInvestments?: any[];
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  onInvestProject: (name: string, amount: number) => void;
  onOpenRecharge: () => void;
  onToggleLang?: (lang: Language) => void;
  onOpenNotifications?: () => void;
  onOpenMyInvestments?: () => void;
}

export const InvestTabContent: React.FC<InvestTabContentProps> = ({
  userBalance,
  userVipLevel = 0,
  userInvestments = [],
  currentLang = 'en',
  themeMode = 'night',
  onInvestProject,
  onOpenRecharge,
  onToggleLang,
  onOpenNotifications,
  onOpenMyInvestments,
}) => {
  const isBn = currentLang === 'bn';

  // Active Category Filter: 'all' | 'solar' | 'wind' | 'hydro' | 'combo'
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals state
  const [activeInvestModal, setActiveInvestModal] = useState<InvestmentPlan | null>(null);
  const [vipLockModal, setVipLockModal] = useState<InvestmentPlan | null>(null);
  const [showMyInvestmentsModal, setShowMyInvestmentsModal] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Status banners
  const [successCelebration, setSuccessCelebration] = useState<string | null>(null);
  const [insufficientError, setInsufficientError] = useState<string | null>(null);

  // Auto-scroll window to top whenever navigating to Invest page
  useEffect(() => {
    scrollAppToTop();
  }, []);

  // Filter plans according to selected category
  const filteredPlans = INVESTMENT_PLANS.filter((plan) => {
    if (selectedCategory === 'all') return true;
    return plan.category === selectedCategory;
  });

  // Calculate purchases per package to enforce limits
  const getPurchasedCount = (plan: InvestmentPlan): number => {
    if (!userInvestments || userInvestments.length === 0) {
      // Check localStorage backup
      try {
        const local = localStorage.getItem('user_investments_guest') || localStorage.getItem('user_investments');
        if (local) {
          const parsed = JSON.parse(local);
          return parsed.filter(
            (inv: any) =>
              inv.name === plan.nameEn ||
              inv.name === plan.nameBn ||
              (inv.name && (inv.name.includes(plan.nameEn) || inv.name.includes(plan.nameBn)))
          ).length;
        }
      } catch {
        // ignore
      }
      return 0;
    }
    return userInvestments.filter(
      (inv: any) =>
        inv.name === plan.nameEn ||
        inv.name === plan.nameBn ||
        (inv.name && (inv.name.includes(plan.nameEn) || inv.name.includes(plan.nameBn)))
    ).length;
  };

  const handleOpenInvest = (plan: InvestmentPlan) => {
    setInsufficientError(null);

    // Rule 1: Check VIP Lock if required
    if (plan.requiredVipLevel > 0 && userVipLevel < plan.requiredVipLevel) {
      setVipLockModal(plan);
      return;
    }

    // Rule 2: Check Purchase Limit (e.g. 0/2 for first 2 packages)
    if (plan.maxPurchaseLimit !== undefined) {
      const currentPurchased = getPurchasedCount(plan);
      if (currentPurchased >= plan.maxPurchaseLimit) {
        return; // Button is disabled
      }
    }

    setActiveInvestModal(plan);
  };

  const handleConfirmInvest = () => {
    if (!activeInvestModal) return;
    const requiredAmount = activeInvestModal.minInvestmentBdt;

    if (userBalance < requiredAmount) {
      setInsufficientError(
        isBn
          ? `অপর্যাপ্ত ব্যালেন্স! আপনার ব্যালেন্স ৳${userBalance.toLocaleString()}, প্রয়োজন ৳${requiredAmount.toLocaleString()}। অনুগ্রহ করে ওয়ালেট রিচার্জ করুন।`
          : `Insufficient balance! You have ৳${userBalance.toLocaleString()}, required ৳${requiredAmount.toLocaleString()}. Please recharge your wallet.`
      );
      return;
    }

    const pkgName = isBn ? activeInvestModal.nameBn : activeInvestModal.nameEn;
    onInvestProject(pkgName, requiredAmount);

    setSuccessCelebration(
      isBn
        ? `অভিনন্দন! "${pkgName}" সফলভাবে সক্রিয় করা হয়েছে। প্রতিদিনের লাভ আপনার ওয়ালেটে জমা হবে।`
        : `Congratulations! "${pkgName}" activated successfully. Daily yield will credit to your wallet.`
    );
    setActiveInvestModal(null);
    setInsufficientError(null);

    setTimeout(() => {
      setSuccessCelebration(null);
    }, 4500);
  };

  const renderBadgeIcon = (iconType: string) => {
    switch (iconType) {
      case 'sun':
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'wind':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'droplet':
        return <Droplets className="w-3.5 h-3.5 text-blue-400" />;
      case 'crown':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'gem':
        return <Gem className="w-3.5 h-3.5 text-teal-300" />;
      case 'star':
        return <Star className="w-3.5 h-3.5 text-indigo-300 fill-indigo-300/40" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div
      id="invest-tab-screen"
      className="w-full pb-20 select-none animate-in fade-in duration-200 font-sans"
    >
      {/* ───────────────────────────────────────────────────────────
          1. TOP APP BAR (HEADER MATCHING USER SCREENSHOT)
      ─────────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center justify-between pt-1 pb-3 px-1">
        {/* Left: 3-bar clean hamburger Menu button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-white"
          aria-label="Open Navigation Menu"
          title="Menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Center: Modern Clean Energy Branding with Sun/Leaf Icon */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="6.5" fill="#f59e0b" />
              <path
                d="M18 4V7M18 29V32M4 18H7M29 18H32M8.1 8.1L10.5 10.5M25.5 25.5L27.9 27.9M8.1 27.9L10.5 25.5M25.5 10.5L27.9 8.1"
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M12 28C12 28 14 17 25 14C25 14 26 23 15 27C13.8 27.4 12.8 27.8 12 28Z"
                fill="#00e676"
              />
              <path d="M15 25C18 22 21 19 23 16" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-wider leading-none">
              <span className="text-white">AI</span>
              <span className="text-[#00e676]">ENERGY</span>
            </div>
            <span className="text-[10px] text-slate-300 font-medium tracking-tight mt-0.5">
              Clean Energy | Better Tomorrow
            </span>
          </div>
        </div>

        {/* Right: Language Dropdown & Notification Bell */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onToggleLang && (
            <button
              type="button"
              onClick={() => onToggleLang(currentLang === 'en' ? 'bn' : 'en')}
              className="px-2.5 py-1.5 rounded-full border border-emerald-500/30 bg-[#072d24]/90 hover:bg-[#093c30] text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
              title={currentLang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-[#00e676]" />
              <span className="text-xs font-bold">{currentLang === 'en' ? 'English' : 'বাংলা'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          )}

          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-8 h-8 rounded-full border border-emerald-500/30 bg-[#072d24]/90 hover:bg-[#093c30] flex items-center justify-center transition-all relative cursor-pointer shadow-xs shrink-0 text-slate-200 hover:text-white"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#06483A] animate-pulse" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          2. INVESTMENT HERO BANNER (MATCHING SCREENSHOT)
      ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-[#072c23] via-[#093d31] to-[#0b4d3d] p-4 sm:p-5 shadow-xl shadow-emerald-950/40 mb-4 mt-1">
        {/* Background Landscape Graphic Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 sm:w-5/12 overflow-hidden pointer-events-none opacity-40 sm:opacity-50">
          <img
            src="/images/apex-helios-solar.jpg"
            alt="Clean Energy Landscape"
            className="w-full h-full object-cover object-center mix-blend-luminosity"
            onError={(e) => handleImageError(e, 'solar')}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#072c23] via-transparent to-transparent" />
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-[#00e676]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-sm sm:max-w-md space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00e676]/15 border border-[#00e676]/30 text-[10px] font-extrabold text-[#00e676] tracking-wider uppercase">
            <span>{isBn ? 'ইনভেস্টমেন্ট' : 'INVESTMENT'}</span>
          </div>

          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {isBn ? 'আপনার প্ল্যান নির্বাচন করুন' : 'Choose Your Plan'}
            </h1>
            <h2 className="text-xl sm:text-2xl font-black text-[#00e676] tracking-tight leading-tight">
              {isBn ? 'আজ থেকেই আয় শুরু করুন' : 'Start Earning Today'}
            </h2>
          </div>

          <p className="text-xs text-slate-200/90 leading-relaxed max-w-xs">
            {isBn
              ? 'পরিচ্ছন্ন জ্বালানি প্রকল্পে বিনিয়োগ করুন এবং একটি উন্নত ও সবুজ ভবিষ্যতের অংশীদার হোন।'
              : 'Invest in clean energy projects and be part of a better, greener future.'}
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                if (onOpenMyInvestments) {
                  onOpenMyInvestments();
                } else {
                  setShowMyInvestmentsModal(true);
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#00c853] hover:bg-[#00e676] active:scale-95 text-white font-black text-xs inline-flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/40 cursor-pointer"
            >
              <span>{isBn ? 'আমার বিনিয়োগসমূহ' : 'My Investments'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating "Green Energy Brighter Future" watermark badge */}
        <div className="absolute bottom-2.5 right-3 hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-[#04211a]/70 backdrop-blur-md border border-emerald-500/20 text-[11px] font-bold text-[#a7f3d0] shadow-sm">
          <span>🌿</span>
          <span className="italic">Green Energy Brighter Future</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successCelebration && (
        <div className="mb-4 p-3.5 rounded-2xl bg-[#063328] border border-[#00e676]/60 text-[#a7f3d0] text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-[#00e676] shrink-0" />
          <span className="font-semibold">{successCelebration}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          3. CATEGORY FILTERS (HORIZONTAL PILLS FROM SCREENSHOT)
      ─────────────────────────────────────────────────────────── */}
      <div className="w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-4">
        {/* 1. All Packages */}
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'all'
              ? 'bg-[#00c853] text-white shadow-md shadow-emerald-900/30'
              : 'bg-[#072d24]/90 border border-emerald-500/25 text-slate-300 hover:text-white hover:border-emerald-500/50'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>{isBn ? 'সব প্যাকেজ' : 'All Packages'}</span>
        </button>

        {/* 2. Solar Energy */}
        <button
          type="button"
          onClick={() => setSelectedCategory('solar')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'solar'
              ? 'bg-[#00c853] text-white shadow-md shadow-emerald-900/30'
              : 'bg-[#072d24]/90 border border-emerald-500/25 text-slate-300 hover:text-white hover:border-emerald-500/50'
          }`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>{isBn ? 'সোলার এনার্জি' : 'Solar Energy'}</span>
        </button>

        {/* 3. Wind Energy */}
        <button
          type="button"
          onClick={() => setSelectedCategory('wind')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'wind'
              ? 'bg-[#00c853] text-white shadow-md shadow-emerald-900/30'
              : 'bg-[#072d24]/90 border border-emerald-500/25 text-slate-300 hover:text-white hover:border-emerald-500/50'
          }`}
        >
          <Wind className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isBn ? 'উইন্ড এনার্জি' : 'Wind Energy'}</span>
        </button>

        {/* 4. Hydro Energy */}
        <button
          type="button"
          onClick={() => setSelectedCategory('hydro')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'hydro'
              ? 'bg-[#00c853] text-white shadow-md shadow-emerald-900/30'
              : 'bg-[#072d24]/90 border border-emerald-500/25 text-slate-300 hover:text-white hover:border-emerald-500/50'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-blue-400" />
          <span>{isBn ? 'হাইড্রো এনার্জি' : 'Hydro Energy'}</span>
        </button>

        {/* 5. Combo Plan */}
        <button
          type="button"
          onClick={() => setSelectedCategory('combo')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
            selectedCategory === 'combo'
              ? 'bg-[#00c853] text-white shadow-md shadow-emerald-900/30'
              : 'bg-[#072d24]/90 border border-emerald-500/25 text-slate-300 hover:text-white hover:border-emerald-500/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>{isBn ? 'কম্বো প্ল্যান' : 'Combo Plan'}</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────
          4. INVESTMENT PACKAGE CARDS (SPACIOUS GAP & FRESH STYLING)
      ─────────────────────────────────────────────────────────── */}
      <div className="space-y-4 sm:space-y-5">
        {filteredPlans.map((plan) => {
          const purchasedCount = getPurchasedCount(plan);
          const isLimitExceeded = plan.maxPurchaseLimit !== undefined && purchasedCount >= plan.maxPurchaseLimit;
          const isVipLocked = plan.requiredVipLevel > 0 && userVipLevel < plan.requiredVipLevel;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl sm:rounded-3xl border transition-all duration-200 relative overflow-hidden shadow-lg p-3.5 sm:p-4.5 ${
                isVipLocked
                  ? 'bg-[#062c23]/95 border-emerald-600/30 hover:border-emerald-500/50'
                  : 'bg-[#073327] border-emerald-500/30 hover:border-[#00e676]/60 shadow-emerald-950/20'
              }`}
            >
              {/* Inner ambient glow */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#00e676]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 sm:gap-4">
                {/* Left side: Thumbnail with Badge overlay */}
                <div className="relative w-full sm:w-36 h-36 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden shrink-0 border border-emerald-500/25 bg-[#031d16] shadow-md">
                  <img
                    src={resolveImageSrc(plan.image, plan.category === 'solar' ? 'solar' : 'wind')}
                    alt={isBn ? plan.nameBn : plan.nameEn}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => handleImageError(e, 'solar')}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Top-Left Category Badge */}
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-[#041e17]/85 backdrop-blur-md border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                    {renderBadgeIcon(plan.badgeIconType)}
                    <span className="text-[10px] font-extrabold text-white tracking-wide">
                      {isBn ? plan.badgeCategoryBn : plan.badgeCategoryEn}
                    </span>
                  </div>

                  {/* Locked Overlay icon if VIP Required */}
                  {isVipLocked && (
                    <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-md mb-1">
                        <Lock className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-black text-amber-300 tracking-wider uppercase">
                        {isBn ? 'VIP 1 প্রয়োজন' : 'VIP 1 Required'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Middle details: Plan Title, Subtitle, Info list */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                        {isBn ? plan.nameBn : plan.nameEn}
                      </h3>

                      {/* Limit Pill for first 2 packages */}
                      {plan.maxPurchaseLimit !== undefined && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider border ${
                          isLimitExceeded
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-[#a7f3d0]'
                        }`}>
                          {isBn ? `সীমাবদ্ধতা ${purchasedCount}/${plan.maxPurchaseLimit}` : `Limit ${purchasedCount}/${plan.maxPurchaseLimit}`}
                        </span>
                      )}

                      {/* VIP Status Pill */}
                      {plan.requiredVipLevel > 0 && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider border flex items-center gap-1 ${
                          isVipLocked
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-[#00e676]/20 border-[#00e676]/40 text-[#00e676]'
                        }`}>
                          {isVipLocked ? <Lock className="w-3 h-3 text-amber-400" /> : <ShieldCheck className="w-3 h-3 text-[#00e676]" />}
                          <span>{isVipLocked ? (isBn ? 'VIP 1 লক' : 'VIP 1 Locked') : (isBn ? 'VIP 1 আনলকড' : 'VIP 1 Unlocked')}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-300/80 mt-0.5 font-medium">
                      {isBn ? plan.taglineBn : plan.taglineEn}
                    </p>
                  </div>

                  {/* 3 Metrics Rows matching screenshot */}
                  <div className="space-y-1.5 pt-0.5 text-xs">
                    {/* Min Investment */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300/80 flex items-center gap-1.5 font-medium">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isBn ? 'ন্যূনতম বিনিয়োগ' : 'Min. Investment'}</span>
                      </span>
                      <span className="font-extrabold text-white font-mono text-sm">
                        ৳{plan.minInvestmentBdt.toLocaleString()}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300/80 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isBn ? 'মেয়াদ' : 'Duration'}</span>
                      </span>
                      <span className="font-extrabold text-slate-100 font-mono">
                        {plan.durationDays} {isBn ? 'দিন' : 'Days'}
                      </span>
                    </div>

                    {/* Daily Return */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300/80 flex items-center gap-1.5 font-medium">
                        <TrendingUp className="w-3.5 h-3.5 text-[#00e676]" />
                        <span>{isBn ? 'দৈনিক লাভ' : 'Daily Return'}</span>
                      </span>
                      <span className="font-extrabold text-[#00e676] font-mono">
                        {plan.dailyReturnPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Total Return + Invest Button */}
                <div className="flex sm:flex-col items-center justify-between sm:justify-center sm:items-end gap-2.5 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-500/20 shrink-0 min-w-[120px]">
                  <div className="text-left sm:text-right relative">
                    <span className="text-[11px] text-slate-300/80 block font-medium">
                      {isBn ? 'মোট রিটার্ন' : 'Total Return'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-[#00e676] font-mono tracking-tight">
                        {plan.totalReturnPercent}%
                      </span>
                      <span className="text-sm opacity-70">🌿</span>
                    </div>
                  </div>

                  {/* Action Button with condition checks */}
                  {isVipLocked ? (
                    <button
                      type="button"
                      onClick={() => setVipLockModal(plan)}
                      className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-amber-950/30"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isBn ? 'VIP 1 প্রয়োজন' : 'VIP 1 Required'}</span>
                    </button>
                  ) : isLimitExceeded ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2.5 rounded-xl bg-slate-700/60 border border-slate-600/40 text-slate-400 font-extrabold text-xs flex items-center gap-1.5 cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isBn ? 'সীমা শেষ (২/২)' : 'Limit (2/2)'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenInvest(plan)}
                      className="px-4.5 py-2.5 rounded-xl bg-[#00c853] hover:bg-[#00e676] active:scale-95 text-white font-black text-xs flex items-center gap-1 transition-all shadow-md shadow-emerald-950/50 cursor-pointer"
                    >
                      <span>{isBn ? 'বিনিয়োগ করুন' : 'Invest Now'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────
          5. MODAL: INVEST CONFIRMATION
      ─────────────────────────────────────────────────────────── */}
      {activeInvestModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#063328] border border-emerald-500/40 rounded-3xl p-5 text-white space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveInvestModal(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00e676]/15 border border-[#00e676]/30 text-[#00e676] text-[10px] font-bold uppercase mb-1">
                {renderBadgeIcon(activeInvestModal.badgeIconType)}
                <span>{isBn ? activeInvestModal.badgeCategoryBn : activeInvestModal.badgeCategoryEn}</span>
              </div>
              <h3 className="text-lg font-black text-white leading-tight">
                {isBn ? activeInvestModal.nameBn : activeInvestModal.nameEn}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {isBn ? 'পরিচ্ছন্ন জ্বালানি বিনিয়োগ চুক্তি নিশ্চিতকরণ' : 'Clean Energy Investment Activation'}
              </p>
            </div>

            {/* Financial Details Box */}
            <div className="p-3.5 rounded-2xl bg-[#04211a] border border-emerald-500/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">{isBn ? 'প্যাকেজের মূল্য' : 'Plan Price'}:</span>
                <span className="text-white font-mono font-bold text-sm">
                  ৳{activeInvestModal.minInvestmentBdt.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">{isBn ? 'দৈনিক লাভ' : 'Daily Yield'} ({activeInvestModal.dailyReturnPercent}%):</span>
                <span className="text-[#00e676] font-mono font-bold">
                  +৳{((activeInvestModal.minInvestmentBdt * activeInvestModal.dailyReturnPercent) / 100).toFixed(2)} / দিন
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">{isBn ? 'মেয়াদকাল' : 'Duration'}:</span>
                <span className="text-white font-mono font-medium">
                  {activeInvestModal.durationDays} {isBn ? 'দিন' : 'Days'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-emerald-500/20 pt-2">
                <span className="text-slate-200 font-bold">{isBn ? 'মোট লাভ' : 'Total Profit'}:</span>
                <span className="text-[#00e676] font-mono font-black text-sm">
                  +৳{((activeInvestModal.minInvestmentBdt * activeInvestModal.dailyReturnPercent * activeInvestModal.durationDays) / 100).toFixed(2)} ({activeInvestModal.totalReturnPercent}%)
                </span>
              </div>
            </div>

            {/* User Balance Check */}
            <div className="p-2.5 rounded-xl bg-[#04211a] border border-emerald-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300">{isBn ? 'আপনার ওয়ালেট ব্যালেন্স' : 'Your Balance'}:</span>
              <span
                className={`font-mono font-bold ${
                  userBalance >= activeInvestModal.minInvestmentBdt ? 'text-[#00e676]' : 'text-rose-400'
                }`}
              >
                ৳{userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Insufficient balance notice */}
            {insufficientError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                <p>{insufficientError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveInvestModal(null);
                    setInsufficientError(null);
                    onOpenRecharge();
                  }}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
                >
                  {isBn ? 'ওয়ালেট রিচার্জ করুন' : 'Recharge Wallet'}
                </button>
              </div>
            )}

            {/* Confirm Activation Button */}
            <button
              type="button"
              onClick={handleConfirmInvest}
              className="w-full py-3.5 rounded-xl bg-[#00c853] hover:bg-[#00e676] text-white font-black text-sm shadow-lg shadow-emerald-950/50 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {isBn
                  ? `বিনিয়োগ নিশ্চিত করুন (৳${activeInvestModal.minInvestmentBdt.toLocaleString()})`
                  : `Confirm Invest (৳${activeInvestModal.minInvestmentBdt.toLocaleString()})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          6. MODAL: VIP 1 LOCK SYSTEM NOTIFICATION
      ─────────────────────────────────────────────────────────── */}
      {vipLockModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#063328] border border-amber-400/50 rounded-3xl p-5 text-white space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setVipLockModal(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center pt-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg mb-3">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black text-white">
                {isBn ? 'VIP 1 মেম্বারশিপ লক' : 'VIP 1 Level Required'}
              </h3>
              <p className="text-xs text-amber-300 font-semibold mt-1">
                {isBn
                  ? `"${vipLockModal.nameBn}" প্ল্যানটি শুধুমাত্র VIP 1 ও তদূর্ধ্ব গ্রাহকদের জন্য সংরক্ষিত।`
                  : `"${vipLockModal.nameEn}" is reserved exclusively for VIP 1 members.`}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#04211a] border border-amber-400/20 text-xs space-y-2 text-slate-200">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">1.</span>
                <p>
                  {isBn
                    ? 'প্রথম ২টি প্যাকেজ (Basic Plan অথবা Standard Plan) কিনলে আপনার অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে VIP 1 স্তরে উন্নীত হবে।'
                    : 'Investing in either Basic Plan or Standard Plan will automatically upgrade your account to VIP 1.'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">2.</span>
                <p>
                  {isBn
                    ? 'অথবা ওয়ালেট রিচার্জ করে আপনার VIP র‍্যাংক বৃদ্ধি করুন।'
                    : 'Alternatively, recharge your wallet to level up your VIP rank.'}
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setVipLockModal(null);
                  setSelectedCategory('solar'); // show basic plan
                }}
                className="w-full py-3 rounded-xl bg-[#00c853] hover:bg-[#00e676] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <span>{isBn ? 'Basic Plan কিনুন (Limit 0/2)' : 'Buy Basic Plan (Limit 0/2)'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setVipLockModal(null);
                  onOpenRecharge();
                }}
                className="w-full py-2.5 rounded-xl bg-[#072d24] hover:bg-[#0a3b30] border border-emerald-500/30 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400" />
                <span>{isBn ? 'ওয়ালেট রিচার্জ করুন' : 'Recharge Wallet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          7. MODAL: MY INVESTMENTS LIST
      ─────────────────────────────────────────────────────────── */}
      {showMyInvestmentsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-[#063328] border border-emerald-500/40 rounded-3xl p-5 text-white space-y-4 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00c853]/20 border border-[#00c853]/30 flex items-center justify-center text-[#00c853]">
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {isBn ? 'আমার সক্রিয় বিনিয়োগসমূহ' : 'My Active Investments'}
                  </h3>
                  <span className="text-[10px] text-slate-300">
                    {isBn
                      ? `মোট সক্রিয় চুক্তি: ${userInvestments.length} টি`
                      : `Total Active Contracts: ${userInvestments.length}`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMyInvestmentsModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2.5 pr-1">
              {userInvestments.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Coins className="w-10 h-10 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    {isBn
                      ? 'আপনার এখনো কোনো সক্রিয় বিনিয়োগ নেই।'
                      : 'You do not have any active investments yet.'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {isBn
                      ? 'উপরের প্যাকেজ থেকে আপনার প্রথম প্ল্যান শুরু করুন!'
                      : 'Start earning daily profits by choosing a plan above!'}
                  </p>
                </div>
              ) : (
                userInvestments.map((inv: any, idx: number) => (
                  <div
                    key={inv.id || idx}
                    className="p-3 rounded-2xl bg-[#04211a] border border-emerald-500/20 flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white">{inv.name}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span>{inv.date || 'Active'}</span>
                        <span>•</span>
                        <span className="text-[#00e676]">+{inv.dailyYield || 0} ৳/দিন</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-white font-mono">
                        ৳{inv.amount?.toLocaleString()}
                      </span>
                      <span className="block text-[10px] text-emerald-400 font-bold">
                        সক্রিয় (Active)
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowMyInvestmentsModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#00c853] hover:bg-[#00e676] text-white font-bold text-xs cursor-pointer shadow-md"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          8. SIDEBAR NAVIGATION DRAWER (FOR HAMBURGER BUTTON)
      ─────────────────────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#05271e] border-r border-emerald-500/30 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200 text-white">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00c853] flex items-center justify-center p-0.5 text-black">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-white text-sm">AI ENERGY</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Switcher inside Drawer */}
              {onToggleLang && (
                <div className="p-2.5 rounded-xl bg-[#073327] border border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#00e676]" />
                    Language / ভাষা
                  </span>
                  <div className="flex items-center gap-1 bg-[#041e17] p-0.5 rounded-lg border border-emerald-500/30">
                    <button
                      type="button"
                      onClick={() => onToggleLang('en')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        currentLang === 'en' ? 'bg-[#00c853] text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLang('bn')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        currentLang === 'bn' ? 'bg-[#00c853] text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenRecharge();
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#073327] hover:bg-[#0a4233] border border-emerald-500/20 flex items-center gap-2.5 text-xs font-bold text-slate-200"
                >
                  <Wallet className="w-4 h-4 text-amber-400" />
                  <span>{isBn ? 'ওয়ালেট রিচার্জ' : 'Wallet Recharge'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsDrawerOpen(false);
                    if (onOpenMyInvestments) {
                      onOpenMyInvestments();
                    } else {
                      setShowMyInvestmentsModal(true);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#073327] hover:bg-[#0a4233] border border-emerald-500/20 flex items-center gap-2.5 text-xs font-bold text-slate-200"
                >
                  <Coins className="w-4 h-4 text-[#00e676]" />
                  <span>{isBn ? 'আমার সক্রিয় বিনিয়োগসমূহ' : 'My Active Investments'}</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-500/20 text-[11px] text-slate-400 text-center">
              AI Energy © 2026. Clean Energy for Better Tomorrow.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
