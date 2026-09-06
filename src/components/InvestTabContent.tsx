import React, { useState } from 'react';
import {
  Sparkles,
  MapPin,
  Grid,
  Calendar,
  CreditCard,
  CheckCircle2,
  X,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { Language } from '../types';
import { ENERGY_PACKAGES_7, EnergyPackage, toBengaliNumber } from '../data/energyPackages';

interface InvestTabContentProps {
  userBalance: number;
  currentLang?: Language;
  onInvestProject: (name: string, amount: number) => void;
  onOpenRecharge: () => void;
}

export const InvestTabContent: React.FC<InvestTabContentProps> = ({
  userBalance,
  currentLang = 'en',
  onInvestProject,
  onOpenRecharge,
}) => {
  const isBn = currentLang === 'bn';
  const packages = ENERGY_PACKAGES_7;

  const [activeInvestModal, setActiveInvestModal] = useState<EnergyPackage | null>(null);
  const [successCelebration, setSuccessCelebration] = useState<string | null>(null);

  const handleOpenInvest = (pkg: EnergyPackage) => {
    setActiveInvestModal(pkg);
  };

  const handleConfirmInvest = () => {
    if (!activeInvestModal) return;
    const requiredAmount = activeInvestModal.minInvestment;

    if (userBalance < requiredAmount) {
      alert(
        isBn
          ? `অপর্যাপ্ত ব্যালেন্স! আপনার ব্যালেন্স ৳${userBalance.toLocaleString()}, প্রয়োজন ৳${requiredAmount.toLocaleString()}। অনুগ্রহ করে আগে রিচার্জ করুন।`
          : `Insufficient balance! You have ৳${userBalance.toLocaleString()}, required ৳${requiredAmount.toLocaleString()}. Please recharge first.`
      );
      onOpenRecharge();
      setActiveInvestModal(null);
      return;
    }

    const pkgName = isBn ? activeInvestModal.nameBn : activeInvestModal.nameEn;
    onInvestProject(pkgName, requiredAmount);
    setSuccessCelebration(
      isBn
        ? `অভিনন্দন! "${pkgName}" চুক্তি সফলভাবে গ্রহণ করা হয়েছে। প্রতিদিনের লাভ আপনার ওয়ালেটে জমা হবে।`
        : `Congratulations! "${pkgName}" contract activated successfully. Daily yields will credit to your wallet.`
    );
    setActiveInvestModal(null);

    setTimeout(() => {
      setSuccessCelebration(null);
    }, 4500);
  };

  return (
    <div className="w-full space-y-4 pb-6 text-slate-100 animate-in fade-in max-w-xl mx-auto">
      {/* Top Header Card with User Balance & Quick Recharge */}
      <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0a1428] via-[#0d1a36] to-[#081022] border border-cyan-500/30 p-4 sm:p-5 shadow-xl shadow-cyan-950/30">
        <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-bold text-cyan-300">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{isBn ? 'জাতীয় গ্রিড পাওয়ার পুল' : 'NATIONAL GRID POWER POOL'}</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {isBn ? 'বিদ্যুৎ উৎপাদন চুক্তি' : 'Power Generation Contracts'}
            </h2>
            <p className="text-xs text-slate-300 max-w-xs">
              {isBn
                ? '৭টি অফিসিয়াল ভিআইপি গ্রিড নোড থেকে আপনার উপযুক্ত চুক্তি নির্বাচন করুন।'
                : 'Choose from 7 official VIP grid node packages for daily guaranteed yields.'}
            </p>
          </div>

          <div className="text-right shrink-0 bg-[#060D1A]/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">
              {isBn ? 'ওয়ালেট ব্যালেন্স' : 'Wallet Balance'}
            </span>
            <span className="text-base sm:text-lg font-black text-cyan-300 font-mono">
              ৳{userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <button
              type="button"
              onClick={onOpenRecharge}
              className="mt-1 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[11px] font-bold block w-full transition-all cursor-pointer text-center shadow-md shadow-cyan-500/20"
            >
              + {isBn ? 'রিচার্জ' : 'Recharge'}
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successCelebration && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{successCelebration}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          7 PACKAGES LIST (Responsive: 1 col on mobile, 2-3 cols on desktop)
      ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {packages.map((pkg) => {
          const dailyYield = (pkg.minInvestment * pkg.dailyRate) / 100;
          const totalProfit = (pkg.minInvestment * pkg.dailyRate * pkg.cycleDays) / 100;
          const totalReturnPercent = Math.round(pkg.dailyRate * pkg.cycleDays);

          const formattedMinInvest = isBn ? toBengaliNumber(pkg.minInvestment) : pkg.minInvestment.toLocaleString();
          const formattedDailyYield = isBn ? toBengaliNumber(Math.round(dailyYield)) : Math.round(dailyYield).toLocaleString();
          const formattedDailyRate = isBn ? toBengaliNumber(pkg.dailyRate) : pkg.dailyRate.toString();
          const formattedDays = isBn ? toBengaliNumber(pkg.cycleDays) : pkg.cycleDays.toString();
          const formattedTotalProfit = isBn ? toBengaliNumber(Math.round(totalProfit)) : Math.round(totalProfit).toLocaleString();
          const formattedTotalPercent = isBn ? toBengaliNumber(totalReturnPercent) : totalReturnPercent.toString();
          const formattedFunded = isBn ? toBengaliNumber(pkg.fundedPercent) : pkg.fundedPercent.toString();
          const vipLabel = isBn ? `ভিআইপি নোড ${toBengaliNumber(pkg.vipLevel)}` : `VIP Node #${pkg.vipLevel}`;

          return (
            <div
              key={pkg.id}
              className="rounded-[26px] bg-[#070e1d] border border-slate-800/90 hover:border-cyan-500/40 p-4 sm:p-4.5 space-y-3.5 transition-all shadow-xl relative overflow-hidden"
            >
              {/* 1. TOP BADGES ROW (3 BADGES) */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                {/* Badge 1: Operational & Delivering */}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#08261e] border border-emerald-500/30 text-[11px] font-bold text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{pkg.statusBn}</span>
                </span>

                {/* Badge 2: VIP Node */}
                <span className="px-3 py-1 rounded-full bg-[#13203c] border border-blue-500/30 text-[11px] font-bold text-blue-300 font-mono">
                  {vipLabel}
                </span>

                {/* Badge 3: +X.X% Daily Profit */}
                <span className="px-3 py-1 rounded-full bg-[#0c2f24] border border-emerald-400/40 text-[11px] font-bold text-emerald-300 font-mono">
                  +{formattedDailyRate}% {isBn ? 'দৈনিক লাভ' : 'Daily Profit'}
                </span>
              </div>

              {/* 2. HEADER ROW (THUMBNAIL + TITLE + LOCATION) */}
              <div className="flex items-start gap-3 pt-0.5">
                {/* Thumbnail image */}
                <div className="w-[74px] h-[74px] sm:w-[82px] sm:h-[82px] rounded-2xl overflow-hidden border border-slate-700/70 shrink-0 bg-slate-900 shadow-md">
                  <img
                    src={pkg.image}
                    alt={isBn ? pkg.nameBn : pkg.nameEn}
                    className="w-full h-full object-cover object-center"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Title and location */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-white leading-snug tracking-tight">
                    {isBn ? pkg.nameBn : pkg.nameEn}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5 flex-wrap">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="truncate">{isBn ? pkg.locationBn : pkg.locationEn}</span>
                    <Grid className="w-3 h-3 text-slate-500 shrink-0 ml-0.5" />
                  </div>
                </div>
              </div>

              {/* 3. PROGRESS BAR ROW */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">
                    {isBn ? 'গ্রিড বরাদ্দ সম্পন্ন' : 'Grid Allocation Complete'}{' '}
                    <span className="font-bold text-cyan-300">{formattedFunded}%</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0f192e] overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-cyan-300 transition-all duration-700 shadow-sm shadow-cyan-400/50"
                    style={{ width: `${pkg.fundedPercent}%` }}
                  />
                </div>
              </div>

              {/* 4. "তথ্য প্যানেল" (INFO PANEL - GLOWING NEON BORDER & PRESERVED EMPTY MIDDLE SLOT) */}
              <div className="rounded-2xl border border-emerald-400/60 bg-[#070f1e] p-3.5 sm:p-4 shadow-[0_0_18px_rgba(52,211,153,0.18)] space-y-3 relative">
                {/* Panel Header */}
                <div className="text-sm font-bold text-white tracking-wide">
                  {isBn ? 'তথ্য প্যানেল' : 'Info Panel'}
                </div>

                {/* 3 Columns x 2 Rows Grid Layout */}
                <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-left">
                  {/* Row 1 - Col 1: বিনিয়োগ */}
                  <div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                      <span>💰</span>
                      <span>{isBn ? 'বিনিয়োগ' : 'Investment'}</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5 tracking-tight">
                      ৳{formattedMinInvest}
                    </div>
                  </div>

                  {/* Row 1 - Col 2: দৈনিক আয় */}
                  <div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                      <span>📈</span>
                      <span>{isBn ? 'দৈনিক আয়' : 'Daily Profit'}</span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-white font-mono mt-0.5 tracking-tight">
                      ৳{formattedDailyYield}
                    </div>
                  </div>

                  {/* Row 1 - Col 3: % দৈনিক লাভের */}
                  <div className="text-left">
                    <div className="text-[11px] text-slate-300 font-medium">
                      {isBn ? '% দৈনিক লাভের' : '% Daily Return'}
                    </div>
                    <div className="mt-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#08261e] border border-emerald-500/40 text-[11px] font-bold text-emerald-400 font-mono inline-block">
                        +{formattedDailyRate}%
                      </span>
                    </div>
                  </div>

                  {/* Row 2 - Col 1: মেয়াদ */}
                  <div>
                    <div className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isBn ? 'মেয়াদ' : 'Duration'}</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-white font-mono mt-0.5">
                      {formattedDays} {isBn ? 'দিন' : 'Days'}
                    </div>
                  </div>

                  {/* Row 2 - Col 2: EMPTY MIDDLE SLOT (মাঝখানে ফাকা ঘর টা যেনো বুজ্জা না যায়) */}
                  <div className="invisible select-none" aria-hidden="true">
                    {/* Intentionally left blank to match screenshot layout exactly */}
                  </div>

                  {/* Row 2 - Col 3: মোট লাভ */}
                  <div className="text-left">
                    <div className="text-[11px] text-slate-300 flex items-center gap-1 font-medium">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>{isBn ? 'মোট লাভ' : 'Total Profit'}</span>
                    </div>
                    <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-0.5">
                      ৳{formattedTotalProfit}
                    </div>
                    <div className="mt-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-[#08261e] border border-emerald-500/40 text-[10px] font-bold text-emerald-400 font-mono inline-block">
                        +{formattedTotalPercent}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. BOTTOM ACTION BUTTONS */}
              <div className="flex items-center gap-2.5 pt-1">
                {/* Primary Button */}
                <button
                  type="button"
                  onClick={() => handleOpenInvest(pkg)}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-98 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4 fill-current text-cyan-200" />
                  <span>
                    {isBn
                      ? `চুক্তি গ্রহণ করুন ${formattedMinInvest}৳`
                      : `Activate Contract ৳${pkg.minInvestment.toLocaleString()}`}
                  </span>
                </button>

                {/* Secondary Recharge Button */}
                <button
                  type="button"
                  onClick={onOpenRecharge}
                  className="py-3.5 px-4 sm:px-5 rounded-2xl bg-[#0e172a] hover:bg-[#15233f] border border-slate-700/80 text-slate-200 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer relative flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isBn ? 'রিচার্জ' : 'Recharge'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────
          MODAL: CONTRACT CONFIRMATION
      ─────────────────────────────────────────────────────────── */}
      {activeInvestModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0a1224] border border-cyan-500/40 rounded-3xl p-5 text-white space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveInvestModal(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold uppercase mb-1">
                {isBn ? `ভিআইপি নোড #${toBengaliNumber(activeInvestModal.vipLevel)}` : `VIP Node #${activeInvestModal.vipLevel}`}
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                {isBn ? activeInvestModal.nameBn : activeInvestModal.nameEn}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBn ? 'দৈনিক বিদ্যুৎ উৎপাদন চুক্তি নিশ্চিতকরণ' : 'Power Generation Contract Activation'}
              </p>
            </div>

            {/* Financial Details Box */}
            <div className="p-3.5 rounded-2xl bg-[#060D1A] border border-cyan-500/20 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'চুক্তি মূল্য' : 'Contract Price'}:</span>
                <span className="text-white font-mono font-bold text-sm">
                  ৳{activeInvestModal.minInvestment.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'দৈনিক আয়' : 'Daily Yield'} (+{activeInvestModal.dailyRate}%):</span>
                <span className="text-emerald-400 font-mono font-bold">
                  ৳{((activeInvestModal.minInvestment * activeInvestModal.dailyRate) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'চুক্তির মেয়াদ' : 'Cycle Duration'}:</span>
                <span className="text-white font-mono font-medium">
                  {activeInvestModal.cycleDays} {isBn ? 'দিন' : 'Days'}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-300 font-semibold">{isBn ? 'মোট লভ্যাংশ' : 'Total Net Profit'}:</span>
                <span className="text-cyan-300 font-mono font-extrabold text-sm">
                  ৳{((activeInvestModal.minInvestment * activeInvestModal.dailyRate * activeInvestModal.cycleDays) / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* User Balance Check */}
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">{isBn ? 'আপনার ওয়ালেট ব্যালেন্স' : 'Your Wallet Balance'}:</span>
              <span
                className={`font-mono font-bold ${
                  userBalance >= activeInvestModal.minInvestment ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ৳{userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Confirm Activation Button */}
            <button
              type="button"
              onClick={handleConfirmInvest}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-400 hover:opacity-95 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {isBn
                  ? `বিনিয়োগ নিশ্চিত করুন (৳${activeInvestModal.minInvestment.toLocaleString()})`
                  : `Confirm Activation (৳${activeInvestModal.minInvestment.toLocaleString()})`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
