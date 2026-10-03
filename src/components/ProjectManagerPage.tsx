import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Send,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  UserCheck,
  Clock,
  Award,
  MessageSquare,
} from 'lucide-react';
import { Language } from '../types';
import {
  fetchSupportSettings,
  DEFAULT_PROJECT_MANAGERS,
  ProjectManagerInfo,
} from '../utils/crispService';

interface ProjectManagerPageProps {
  onBack: () => void;
  currentLang?: Language;
  showToast?: (msg: string) => void;
}

export const ProjectManagerPage: React.FC<ProjectManagerPageProps> = ({
  onBack,
  currentLang = 'bn',
}) => {
  const isBn = currentLang === 'bn';
  const [managers, setManagers] = useState<ProjectManagerInfo[]>(DEFAULT_PROJECT_MANAGERS);

  // Load latest manager links from Firestore settings
  useEffect(() => {
    let isMounted = true;
    fetchSupportSettings().then((settings) => {
      if (!isMounted) return;
      setManagers([
        {
          ...DEFAULT_PROJECT_MANAGERS[0],
          telegram: settings.manager1Telegram || DEFAULT_PROJECT_MANAGERS[0].telegram,
        },
        {
          ...DEFAULT_PROJECT_MANAGERS[1],
          telegram: settings.manager2Telegram || DEFAULT_PROJECT_MANAGERS[1].telegram,
        },
        {
          ...DEFAULT_PROJECT_MANAGERS[2],
          telegram: settings.manager3Telegram || DEFAULT_PROJECT_MANAGERS[2].telegram,
        },
        {
          ...DEFAULT_PROJECT_MANAGERS[3],
          telegram: settings.manager4Telegram || DEFAULT_PROJECT_MANAGERS[3].telegram,
        },
      ]);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div
      id="project-manager-full-page"
      className="w-full min-h-screen bg-[#06483A] text-white pb-24 sm:pb-28 animate-in fade-in duration-200"
    >
      {/* ───────────────────────────────────────────────────────────
          1. TOP NAVIGATION & HEADER BAR (Matching Site Green Theme)
      ─────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 w-full bg-[#042c20]/95 backdrop-blur-md border-b border-emerald-500/35 px-4 py-3 sm:px-6 sm:py-3.5 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          {/* Back Button */}
          <button
            type="button"
            id="pm-page-back-btn"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-850 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>{isBn ? 'ফিরে যান' : 'Back'}</span>
          </button>

          {/* Centered Page Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-md">
              <UserCheck className="w-4 h-4 text-emerald-300" />
            </div>
            <h1 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
              {isBn ? 'প্রকল্প ব্যবস্থাপক' : 'Project Manager'}
            </h1>
          </div>

          {/* 4 Managers Verified Tag */}
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10px] sm:text-xs font-black text-emerald-300 uppercase tracking-wider shrink-0">
            {isBn ? '৪ জন সক্রিয়' : '4 ACTIVE'}
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* ───────────────────────────────────────────────────────────
            2. HERO BANNER CARD (Site Emerald Glow Palette)
        ─────────────────────────────────────────────────────────── */}
        <div className="relative w-full rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#063326] via-[#04241b] to-[#021812] border-2 border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.25)] overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>{isBn ? 'অফিসিয়াল টেলিগ্রাম হেল্পডেস্ক' : 'OFFICIAL TELEGRAM DESK'}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                {isBn
                  ? 'ডেডিকেটেড প্রকল্প ব্যবস্থাপক সহায়তা'
                  : 'Dedicated Project Manager Assistance'}
              </h2>
              <p className="text-xs sm:text-[13px] text-emerald-200/90 font-medium leading-relaxed max-w-xl">
                {isBn
                  ? 'ডিপোজিট, দ্রুত উত্তোলন অনুমোদন, দৈনিক লাভ ও সোলার প্রকল্প সংক্রান্ত যেকোনো সহায়তার জন্য সরাসরি আমাদের ৪ জন অভিজ্ঞ প্রকল্প ব্যবস্থাপকের সাথে চ্যাট করুন।'
                  : 'Connect with our 4 official Project Managers on Telegram for instant approvals, deposit verification, daily rewards, and grid operations.'}
              </p>
            </div>

            {/* Response Time Badge */}
            <div className="shrink-0 flex items-center gap-2 p-2.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/30">
              <Clock className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <div className="text-left">
                <span className="text-[10px] text-emerald-300/80 uppercase font-black tracking-wider block">
                  {isBn ? 'গড় রেসপন্স সময়' : 'Avg Response'}
                </span>
                <span className="text-xs font-black text-white font-mono">
                  {isBn ? '১-৩ মিনিট (২৪/৭)' : '1-3 Min (24/7)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            3. 4 PROJECT MANAGERS GRID (2x2 on Desktop, 1 Column on Mobile)
        ─────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
                {isBn ? 'ম্যানেজার তালিকা ও সরাসরি টেলিগ্রাম' : 'Managers List & Direct Telegram'}
              </span>
            </div>
            <span className="text-xs text-emerald-300 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{isBn ? 'অনলাইন ডেস্ক' : 'Live Online Desk'}</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {managers.map((pm, index) => {
              return (
                <div
                  key={pm.id}
                  className="rounded-3xl p-4 sm:p-4.5 bg-gradient-to-br from-[#063326] via-[#04241b] to-[#021812] border border-emerald-500/35 hover:border-emerald-400/70 shadow-lg hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] transition-all duration-300 flex flex-col justify-between gap-3.5 group"
                >
                  {/* Top Part: Animated Avatar, Name, Department & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Animated Avatar System with Live Radar Beacon & Breathing Halo */}
                      <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
                        {/* Ambient aura glow */}
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 opacity-60 blur-[3px] animate-pulse" />

                        {/* Main Avatar Container */}
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-emerald-400/90 shadow-[0_0_15px_rgba(16,185,129,0.4)] bg-[#04241b]">
                          <img
                            src={pm.avatarImg}
                            alt={isBn ? pm.personNameBn : pm.personNameEn}
                            className="w-full h-full object-cover object-top filter brightness-[1.03] contrast-105"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const next = e.currentTarget.nextElementSibling as HTMLElement;
                              if (next) next.style.display = 'flex';
                            }}
                          />
                          <div
                            style={{ display: 'none' }}
                            className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-800 items-center justify-center text-white text-2xl font-black"
                          >
                            {pm.avatar}
                          </div>
                        </div>

                        {/* Animated Live Green Radar Beacon */}
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-[#03241b] shadow-sm" />
                        </span>
                      </div>

                      {/* Name & Role Details */}
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                          {isBn ? pm.nameBn : pm.nameEn}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight mt-0.5 truncate">
                          {isBn ? pm.personNameBn : pm.personNameEn}
                        </h3>
                        <p className="text-xs text-emerald-200/90 font-medium leading-tight mt-1 line-clamp-2">
                          {isBn ? pm.roleBn : pm.roleEn}
                        </p>
                      </div>
                    </div>

                    {/* Online Badge & Animated Audio Equalizer */}
                    <div className="shrink-0 flex items-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                        {/* 3-bar animated live activity equalizer */}
                        <div className="flex items-end gap-0.5 h-2.5">
                          <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s] h-2.5" />
                          <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s] h-1.5" />
                          <span className="w-0.5 bg-emerald-400 rounded-full animate-bounce h-2" />
                        </div>
                        <span>{isBn ? pm.statusBn : pm.statusEn}</span>
                      </span>
                    </div>
                  </div>

                  {/* Single High-Converting Full-Width 1-Click Action Button */}
                  <a
                    href={pm.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00e676] to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_6px_25px_rgba(0,230,118,0.38)] active:scale-[0.98] transition-all cursor-pointer group/btn"
                  >
                    <div className="w-7 h-7 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
                      <Send className="w-4 h-4 fill-slate-950 stroke-none" />
                    </div>
                    <span className="tracking-wide font-extrabold text-sm sm:text-base">
                      {isBn ? 'টেলিগ্রামে সরাসরি মেসেজ করুন' : 'Direct Message on Telegram'}
                    </span>
                    <ExternalLink className="w-4 h-4 stroke-[2.5] ml-1 opacity-90 group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────
            4. OFFICIAL TELEGRAM GROUP & HELPLINE BAR
        ─────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-[#042c20] via-[#053829] to-[#042c20] border border-emerald-500/35 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">
                {isBn ? 'অফিসিয়াল টেলিগ্রাম গ্রুপ' : 'Official Telegram Group'}
              </h4>
              <p className="text-xs text-emerald-200/80 font-medium">
                {isBn
                  ? 'দৈনিক নোটিশ, অফার ও সকল মেম্বারদের লাইভ চ্যাট ফোরাম'
                  : 'Daily notices, promos & official community forum'}
              </p>
            </div>
          </div>

          <a
            href="https://t.me/+Bb9xFhOlIithYzQx"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-4 h-4 fill-slate-950 stroke-none" />
            <span>{isBn ? 'গ্রুপে যুক্ত হোন' : 'Join Official Group'}</span>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>

        {/* ───────────────────────────────────────────────────────────
            5. RETURN TO HOME BUTTON (At Bottom of Page)
        ─────────────────────────────────────────────────────────── */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#03241b] hover:bg-[#043326] text-emerald-300 hover:text-white border border-emerald-500/30 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'হোম পেজে ফিরে যান' : 'Return to Home Page'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
