import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sun,
  Send,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Language } from '../types';
import { fetchSupportSettings, DEFAULT_SUPPORT_SETTINGS } from '../utils/crispService';

interface NvtPromoBannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: Language;
}

export const NvtPromoBannerModal: React.FC<NvtPromoBannerModalProps> = ({
  isOpen,
  onClose,
  currentLang = 'bn',
}) => {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [telegramUrl, setTelegramUrl] = useState<string>(DEFAULT_SUPPORT_SETTINGS.telegram);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load latest Telegram official channel from Firestore settings if available
  useEffect(() => {
    let isMounted = true;
    fetchSupportSettings().then((settings) => {
      if (isMounted && settings?.telegram) {
        setTelegramUrl(settings.telegram);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // 10-second automatic countdown timer
  useEffect(() => {
    if (!isOpen) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSecondsLeft(10);
      return;
    }

    setSecondsLeft(10);

    // Decrement seconds every 1000ms
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Auto-close exactly after 10,000ms (10 seconds)
    timerRef.current = setTimeout(() => {
      onClose();
    }, 10000);

    // Escape key listener to close manually
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleJoinChannel = () => {
    const targetUrl = telegramUrl || 'https://t.me/+Bb9xFhOlIithYzQx';
    try {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (_) {
      window.location.href = targetUrl;
    }
  };

  return (
    <div
      id="nvt-promo-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-banner-heading"
    >
      {/* Centered Modal Card Container */}
      <div
        id="nvt-promo-modal-card"
        className="relative w-full max-w-[460px] my-auto mx-auto bg-gradient-to-b from-[#063326] via-[#04241b] to-[#021812] border-2 border-emerald-400/60 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.35),0_25px_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Top Header Bar with Auto-close Timer and Close (X) Button */}
        <div className="relative z-20 flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#021a13]/95 border-b border-emerald-500/30">
          {/* 10-Second Auto-close Timer Badge */}
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-200 tracking-wide">
              {currentLang === 'bn' ? (
                <>
                  <span className="font-mono font-black text-white text-sm sm:text-base mr-0.5">
                    {secondsLeft}
                  </span>{' '}
                  সেকেন্ডে বন্ধ হবে
                </>
              ) : (
                <>
                  Auto-closing in{' '}
                  <span className="font-mono font-black text-white text-sm sm:text-base">
                    {secondsLeft}s
                  </span>
                </>
              )}
            </span>
          </div>

          {/* Close (X) Button */}
          <button
            id="close-promo-banner-btn"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-emerald-900/90 hover:bg-emerald-700 text-white border border-emerald-400/50 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            aria-label="Close promotion banner"
            title={currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          >
            <X className="w-5 h-5 stroke-[3]" />
          </button>

          {/* 10-second animated countdown progress line */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-emerald-950 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 shadow-[0_0_8px_#34d399] transition-all duration-1000 ease-linear"
              style={{ width: `${(secondsLeft / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable Modal Body - Centered, Fresh, and Concise */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar text-center flex flex-col items-center">
          {/* Fresh Solar Energy Image Card */}
          <div className="relative w-full rounded-2xl overflow-hidden border-2 border-emerald-400/40 shadow-2xl bg-gradient-to-br from-[#073d2e] via-[#04241b] to-[#02140f]">
            {/* Solar Energy Farm Image */}
            <div className="relative w-full h-48 sm:h-56 overflow-hidden">
              <img
                src="/images/solar_ai_substation_1788465992131.jpg"
                alt="NVT Solar Energy Power Grid"
                className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-110 transform hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.src = '/images/apex-helios-solar.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#021812] via-[#021812]/30 to-transparent" />

              {/* Floating Solar Verified Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 backdrop-blur-md border border-emerald-400/60 text-emerald-300 text-xs font-black shadow-lg">
                <Sun className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>NVT SOLAR ENERGY</span>
              </div>
            </div>

            {/* Banner Heading & Few Bold Lines */}
            <div className="p-4 sm:p-5 pt-2 text-center flex flex-col items-center">
              <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-black tracking-widest uppercase text-amber-300">
                  {currentLang === 'bn' ? 'সৌর বিদ্যুৎ উৎপাদন কেন্দ্র' : 'SOLAR POWER GRID'}
                </span>
              </div>

              <h2
                id="promo-banner-heading"
                className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug drop-shadow-sm"
              >
                {currentLang === 'bn'
                  ? 'স্বাগতম NVT সোলার এনার্জি প্রকল্পে!'
                  : 'Welcome to NVT Solar Energy Grid!'}
              </h2>

              {/* Just a few clean, bold, impactful lines */}
              <div className="mt-3 space-y-2 text-center max-w-sm">
                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-emerald-100 font-extrabold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                  <span>
                    {currentLang === 'bn'
                      ? 'সরাসরি জাতীয় গ্রিডে মেগা সৌর বিদ্যুৎ সরবরাহ কার্যক্রম'
                      : 'Supplying mega clean solar energy into national grids'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-emerald-100 font-extrabold leading-snug">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                  <span>
                    {currentLang === 'bn'
                      ? 'স্বয়ংক্রিয় দৈনিক রিটার্ন ও নিরাপদ গ্রিন ইনভেস্টমেন্ট'
                      : 'Automated daily returns & reliable green investments'}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-emerald-200 font-bold leading-snug">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0 fill-amber-300" />
                  <span>
                    {currentLang === 'bn'
                      ? 'সর্বশেষ আপডেট ও অফিশিয়াল নোটিশ পেতে এখনই যুক্ত হোন'
                      : 'Join our official community for daily updates & bonuses'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar - Centered & Prominent */}
        <div className="p-4 sm:p-5 bg-[#021812] border-t border-emerald-500/30 flex flex-col items-center gap-2.5">
          {/* "Join Official Group" button as requested */}
          <button
            id="join-official-group-btn"
            type="button"
            onClick={handleJoinChannel}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-[#00e676] to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-base sm:text-lg tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-[0_8px_30px_rgba(0,230,118,0.45)] active:scale-[0.98] cursor-pointer"
          >
            <Send className="w-5 h-5 fill-slate-950 stroke-none" />
            <span>
              {currentLang === 'bn'
                ? 'অফিসিয়াল গ্রুপে যুক্ত হোন (Join Group)'
                : 'Join Official Group'}
            </span>
            <ExternalLink className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Dismiss / Close Button */}
          <button
            id="dismiss-promo-banner-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 rounded-xl bg-transparent hover:bg-emerald-950/60 text-emerald-300 hover:text-white font-bold text-xs sm:text-sm transition-all cursor-pointer text-center"
          >
            {currentLang === 'bn' ? 'বন্ধ করুন (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
