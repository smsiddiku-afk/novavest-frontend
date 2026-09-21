import React, { useState, useEffect, useMemo } from 'react';
import {
  Briefcase,
  Clock,
  TrendingUp,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Wallet,
  Coins,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  Flame,
  Layers,
  Activity,
} from 'lucide-react';
import { Language, UserProfile } from '../types';

interface PositionsTabContentProps {
  user: UserProfile;
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  onNavigateToInvest?: () => void;
  onNavigateToWallet?: () => void;
  onClaimPositionProfit?: (positionId: string) => void;
}

export const PositionsTabContent: React.FC<PositionsTabContentProps> = ({
  user,
  currentLang = 'bn',
  themeMode = 'night',
  onNavigateToInvest,
  onNavigateToWallet,
  onClaimPositionProfit,
}) => {
  const isBn = currentLang === 'bn';
  const isDay = themeMode === 'day';

  // Current timestamp updated every second for real-time live 24h countdown
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [filter, setFilter] = useState<'all' | 'active' | 'ready'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const rawInvestments = Array.isArray(user.activeInvestments) ? user.activeInvestments : [];

  // Normalize positions with countdown metadata
  const positions = useMemo(() => {
    return rawInvestments.map((inv: any, idx: number) => {
      const id = inv.id || `POS-${idx + 1}`;
      const amount = Number(inv.amount) || 0;
      const dailyYield = Number(inv.dailyYield) || Math.round(amount * 0.025);
      const vipLevel = Number(inv.vipLevel) || 1;
      const totalEarned = Number(inv.totalEarned) || 0;

      // Extract or calculate creation timestamp
      let createdAt = inv.createdAt;
      if (!createdAt) {
        if (inv.id && inv.id.startsWith('INV-')) {
          const parsed = parseInt(inv.id.replace('INV-', ''), 10);
          if (!isNaN(parsed) && parsed > 1600000000000) createdAt = parsed;
        }
      }
      if (!createdAt) createdAt = Date.now() - (idx * 3600000);

      // 24 hour cycle tracking
      const lastProfitClaimAt = inv.lastProfitClaimAt || createdAt;
      let nextProfitAt = inv.nextProfitAt;
      if (!nextProfitAt) {
        nextProfitAt = lastProfitClaimAt + 24 * 60 * 60 * 1000;
      }

      const timeRemainingMs = Math.max(0, nextProfitAt - currentTime);
      const isReadyToClaim = timeRemainingMs <= 0;

      // Calculate cycle progress (0% to 100%)
      const totalCycleMs = 24 * 60 * 60 * 1000;
      const elapsedMs = Math.min(totalCycleMs, Math.max(0, totalCycleMs - timeRemainingMs));
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalCycleMs) * 100)));

      // Format remaining time into HH:MM:SS
      const totalSeconds = Math.floor(timeRemainingMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const countdownFormatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

      return {
        ...inv,
        id,
        amount,
        dailyYield,
        vipLevel,
        totalEarned,
        createdAt,
        lastProfitClaimAt,
        nextProfitAt,
        timeRemainingMs,
        isReadyToClaim,
        progressPercent,
        countdownFormatted,
        category: inv.category || (inv.name?.includes('বায়োগ্যাস') || inv.name?.includes('Biogas') ? 'Biogas' : 'Solar'),
      };
    });
  }, [rawInvestments, currentTime]);

  // Aggregate summary metrics
  const totalPositions = positions.length;
  const totalPrincipal = positions.reduce((acc, p) => acc + p.amount, 0);
  const totalDailyYield = positions.reduce((acc, p) => acc + p.dailyYield, 0);
  const totalRealizedProfit = positions.reduce((acc, p) => acc + p.totalEarned, 0);
  const readyCount = positions.filter((p) => p.isReadyToClaim).length;

  const filteredPositions = positions.filter((p) => {
    if (filter === 'ready') return p.isReadyToClaim;
    if (filter === 'active') return !p.isReadyToClaim;
    return true;
  });

  const handleCopyId = (posId: string) => {
    navigator.clipboard.writeText(posId);
    setCopiedId(posId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClaim = (posId: string) => {
    setClaimingId(posId);
    if (onClaimPositionProfit) {
      onClaimPositionProfit(posId);
    }
    setTimeout(() => {
      setClaimingId(null);
    }, 800);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & LIVE METRICS DASHBOARD
      ───────────────────────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-3xl p-4 sm:p-6 border transition-all duration-300 shadow-xl ${
          isDay
            ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-200'
            : 'bg-gradient-to-br from-[#06241b] via-[#041a13] to-[#02100b] border-emerald-500/30'
        }`}
      >
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#031510] rounded-[14px] flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  className={`text-xl sm:text-2xl font-black tracking-tight ${
                    isDay ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {isBn ? 'আমার প্যাকেজ পজিশন' : 'Active Package Positions'}
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isBn ? 'লাইভ গ্রিড' : 'Live Grid'}
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isDay ? 'text-slate-600' : 'text-emerald-200/70'
                }`}
              >
                {isBn
                  ? 'প্রতিটি প্যাকেজে ২৪ ঘণ্টার লাইভ কাউন্টডাউন টাইমার ও প্রতিদিন নিশ্চিত প্রফিট জমা'
                  : 'Real-time 24-hour countdown & daily guaranteed profit accumulation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onNavigateToInvest && (
              <button
                type="button"
                onClick={onNavigateToInvest}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isBn ? '+ নতুন প্যাকেজ কিনুন' : '+ Buy Package'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Metrics Bento Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 pt-4">
          <div
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-white/80 border-slate-200 shadow-xs'
                : 'bg-[#031510]/80 border-emerald-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? 'মোট সক্রিয় পজিশন' : 'Active Positions'}
              </span>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className={`text-lg sm:text-xl font-black mt-1 ${isDay ? 'text-slate-900' : 'text-white'}`}>
              {totalPositions} <span className="text-xs font-normal text-slate-400">{isBn ? 'টি' : 'Units'}</span>
            </p>
          </div>

          <div
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-white/80 border-slate-200 shadow-xs'
                : 'bg-[#031510]/80 border-emerald-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? 'মোট বিনিয়োগকৃত মূলধন' : 'Total Capital'}
              </span>
              <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <p className={`text-lg sm:text-xl font-black mt-1 ${isDay ? 'text-slate-900' : 'text-cyan-300'}`}>
              ৳{totalPrincipal.toLocaleString('en-US')}
            </p>
          </div>

          <div
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-white/80 border-slate-200 shadow-xs'
                : 'bg-[#031510]/80 border-emerald-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? '২৪ ঘণ্টার মোট প্রফিট' : '24h Total Yield'}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-lg sm:text-xl font-black mt-1 text-emerald-400">
              +৳{totalDailyYield.toLocaleString('en-US')}{' '}
              <span className="text-[10px] font-medium text-emerald-500/80">/{isBn ? 'দিন' : 'day'}</span>
            </p>
          </div>

          <div
            className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
              isDay
                ? 'bg-white/80 border-slate-200 shadow-xs'
                : 'bg-[#031510]/80 border-emerald-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? 'সর্বমোট আহরিত লাভ' : 'Total Realized Profit'}
              </span>
              <Coins className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className={`text-lg sm:text-xl font-black mt-1 ${isDay ? 'text-amber-600' : 'text-amber-400'}`}>
              ৳{totalRealizedProfit.toLocaleString('en-US')}
            </p>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. FILTER TABS & SUB-ACTIONS
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div
          className={`flex items-center gap-1.5 p-1 rounded-2xl border ${
            isDay ? 'bg-slate-100 border-slate-200' : 'bg-[#041d15] border-emerald-500/20'
          }`}
        >
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? isDay
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-sm'
                : isDay
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? 'সকল পজিশন' : 'All Positions'} ({totalPositions})
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filter === 'active'
                ? isDay
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-sm'
                : isDay
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? 'চলমান' : 'Counting Down'} ({totalPositions - readyCount})
          </button>
          {readyCount > 0 && (
            <button
              type="button"
              onClick={() => setFilter('ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filter === 'ready'
                  ? isDay
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-sm'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              {isBn ? 'প্রফিট প্রস্তুত' : 'Profit Ready'} ({readyCount})
            </button>
          )}
        </div>

        {onNavigateToWallet && (
          <button
            type="button"
            onClick={onNavigateToWallet}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              isDay
                ? 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                : 'text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>{isBn ? 'ওয়ালেট ব্যালেন্স ও ট্রানজেকশন' : 'View Wallet & History'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. POSITIONS LIST / CARDS
      ───────────────────────────────────────────────────────────── */}
      {filteredPositions.length === 0 ? (
        /* Empty State */
        <div
          className={`rounded-3xl p-8 sm:p-12 text-center border transition-all ${
            isDay
              ? 'bg-white border-slate-200 shadow-xs'
              : 'bg-[#041c14] border-emerald-500/20'
          }`}
        >
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <Zap className="w-8 h-8" />
          </div>
          <h3
            className={`text-lg sm:text-xl font-black ${
              isDay ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isBn ? 'আপনার কোনো সক্রিয় প্যাকেজ বা পজিশন নেই' : 'No Active Positions Yet'}
          </h3>
          <p
            className={`text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed ${
              isDay ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {isBn
              ? 'আমাদের জাতীয় ফুয়েল, গ্যাস ও সোলার পাওয়ার গ্রিড প্রজেক্টে আজই ইনভেস্ট করুন এবং প্রতি ২৪ ঘণ্টায় নিশ্চিত প্রফিট উপভোগ করুন।'
              : 'Invest in Nova Terra Energy national fuel, gas & solar grid projects to earn daily guaranteed yields every 24 hours.'}
          </p>

          {onNavigateToInvest && (
            <button
              type="button"
              onClick={onNavigateToInvest}
              className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isBn ? 'প্যাকেজসমূহ দেখুন ও ইনভেস্ট করুন' : 'Explore Packages & Invest'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        /* Active Positions Cards */
        <div className="space-y-4">
          {filteredPositions.map((pos) => {
            const isReady = pos.isReadyToClaim;
            const isClaiming = claimingId === pos.id;

            return (
              <div
                key={pos.id}
                className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                  isReady
                    ? isDay
                      ? 'bg-emerald-50/90 border-emerald-400 shadow-md ring-2 ring-emerald-400/30'
                      : 'bg-gradient-to-b from-[#083023] to-[#041a13] border-emerald-400 shadow-xl shadow-emerald-500/15 ring-2 ring-emerald-400/40'
                    : isDay
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    : 'bg-[#041a13] border-emerald-500/25 hover:border-emerald-500/40'
                }`}
              >
                {/* Status Bar */}
                <div
                  className={`px-4 sm:px-6 py-3 flex items-center justify-between border-b ${
                    isReady
                      ? isDay
                        ? 'bg-emerald-100/60 border-emerald-300'
                        : 'bg-emerald-500/15 border-emerald-500/30'
                      : isDay
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#031510] border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black ${
                        isReady
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isReady ? 'bg-slate-950' : 'bg-emerald-400 animate-ping'
                        }`}
                      />
                      {isReady
                        ? isBn
                          ? '২৪ ঘণ্টা সম্পন্ন • প্রফিট প্রস্তুত!'
                          : '24h Completed • Profit Ready!'
                        : isBn
                        ? '২৪ ঘণ্টা কাউন্টডাউন চলছে'
                        : '24h Cycle In Progress'}
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {pos.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyId(pos.id)}
                      className="p-1 hover:text-emerald-400 text-slate-400 transition-colors cursor-pointer"
                      title="Copy Position ID"
                    >
                      {copiedId === pos.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      VIP {pos.vipLevel}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {pos.date || 'Active'}
                    </span>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Title & Yield Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-base sm:text-lg font-black tracking-tight ${
                            isDay ? 'text-slate-900' : 'text-white'
                          }`}
                        >
                          {pos.name || (isBn ? 'এনার্জি প্যাকেজ' : 'Energy Package')}
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                          {pos.category}
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-0.5 ${
                          isDay ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        {isBn ? 'ইনভেস্টমেন্ট মূলধন: ' : 'Invested Capital: '}
                        <strong className={isDay ? 'text-slate-900' : 'text-emerald-300'}>
                          ৳{pos.amount.toLocaleString('en-US')}
                        </strong>
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <div className="flex items-center sm:justify-end gap-1.5">
                        <span className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                          {isBn ? 'দৈনিক প্রফিট:' : 'Daily Profit:'}
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-400">
                          +৳{pos.dailyYield.toLocaleString('en-US')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {isBn ? 'প্রতিদিন ২৪ ঘণ্টা পর পর' : 'Every 24 Hours'}
                      </p>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      24-HOUR REAL-TIME COUNTDOWN TIMER DISPLAY
                  ───────────────────────────────────────────────────────────── */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                      isReady
                        ? isDay
                          ? 'bg-emerald-100/80 border-emerald-300'
                          : 'bg-[#032017] border-emerald-400/50 shadow-inner'
                        : isDay
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#02130e] border-emerald-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                            isReady
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          <Clock className={`w-4 h-4 ${!isReady ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                        </div>
                        <div>
                          <p
                            className={`text-xs font-bold ${
                              isDay ? 'text-slate-800' : 'text-slate-200'
                            }`}
                          >
                            {isReady
                              ? isBn
                                ? '২৪ ঘণ্টা পূর্ণ হয়েছে!'
                                : '24 Hours Completed!'
                              : isBn
                              ? 'পরবর্তী প্রফিট যোগ হওয়ার বাকি সময়'
                              : 'Next Profit Credit In'}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {isReady
                              ? isBn
                                ? 'আপনার ওয়ালেটে প্রফিট যুক্ত করতে নিচের বাটনে ক্লিক করুন'
                                : 'Click the button below to credit profit to wallet'
                              : isBn
                              ? 'কাউন্টডাউন শূন্য হলে স্বয়ংক্রিয়ভাবে প্রফিট রেডি হবে'
                              : 'Profit automatically activates when countdown completes'}
                          </p>
                        </div>
                      </div>

                      {/* Live Ticking Digits */}
                      <div className="text-right">
                        <div
                          className={`text-lg sm:text-2xl font-mono font-black tracking-wider ${
                            isReady
                              ? 'text-emerald-400 animate-pulse'
                              : isDay
                              ? 'text-slate-900'
                              : 'text-cyan-300'
                          }`}
                        >
                          {isReady ? '00:00:00' : pos.countdownFormatted}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {pos.progressPercent}% {isBn ? 'সম্পন্ন' : 'Elapsed'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-emerald-500/20">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isReady
                            ? 'bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_10px_#00e676]'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                        }`}
                        style={{ width: `${isReady ? 100 : pos.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer & Claim Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <div>
                        {isBn ? 'মোট অর্জিত:' : 'Total Earned:'}{' '}
                        <strong className="text-emerald-400">
                          ৳{pos.totalEarned.toLocaleString('en-US')}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isBn ? 'গ্রিড গ্যারান্টিযুক্ত' : 'Grid Verified'}</span>
                      </div>
                    </div>

                    <div>
                      {isReady ? (
                        <button
                          type="button"
                          disabled={isClaiming}
                          onClick={() => handleClaim(pos.id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                        >
                          {isClaiming ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>{isBn ? 'প্রফিট জমা হচ্ছে...' : 'Crediting...'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-current" />
                              <span>
                                {isBn
                                  ? `প্রফিট গ্রহণ করুন (+৳${pos.dailyYield})`
                                  : `Claim Profit (+৳${pos.dailyYield})`}
                              </span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-300">
                          <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                          <span>
                            {isBn
                              ? `২৪ ঘণ্টায় প্রফিট স্বয়ংক্রিয়ভাবে জমা হবে`
                              : `Auto-generates every 24 hours`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
