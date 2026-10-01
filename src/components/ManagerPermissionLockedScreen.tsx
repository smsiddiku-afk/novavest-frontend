import React, { useState } from 'react';
import { ChevronLeft, Lock, Headphones, ArrowRight, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { Language } from '../types';

interface ManagerPermissionLockedScreenProps {
  currentLang?: Language;
  onBack: () => void;
  onContactManager: () => void;
  onCheckPermission?: () => void;
}

export const ManagerPermissionLockedScreen: React.FC<ManagerPermissionLockedScreenProps> = ({
  currentLang = 'bn',
  onBack,
  onContactManager,
  onCheckPermission,
}) => {
  const isBn = currentLang === 'bn';
  const [checking, setChecking] = useState(false);

  const handleRefresh = () => {
    if (onCheckPermission) {
      setChecking(true);
      onCheckPermission();
      setTimeout(() => setChecking(false), 800);
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col justify-between p-4 sm:p-6 text-white select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-300 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm tracking-wide text-amber-300 uppercase">
          {isBn ? 'টিম ও রেফারেল নেটওয়ার্ক' : 'Team & Referral Network'}
        </span>
        <div className="w-10" />
      </div>

      {/* Main Lock Card */}
      <div className="my-auto py-8 flex flex-col items-center text-center space-y-5 max-w-md mx-auto">
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.25)]">
            <Lock className="w-10 h-10 text-amber-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-[#063327] flex items-center justify-center text-slate-950 shadow-md">
            <ShieldCheck className="w-4 h-4 text-slate-950" />
          </div>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {isBn ? 'রেফারেল এক্সেস লক করা' : 'Referral Access Locked'}
          </h2>
          <p className="text-xs text-slate-300">
            {isBn
              ? 'ম্যানেজার বা অ্যাডমিনের অনুমতি প্রয়োজন'
              : 'Manager or Administrator authorization required'}
          </p>
        </div>

        {/* Primary Alert Banner */}
        <div className="w-full p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-inner">
          <p className="font-bold text-base sm:text-lg">
            {isBn
              ? 'দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।'
              : 'Please contact the manager representative.'}
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed px-2">
          {isBn
            ? 'ম্যানেজার বা অফিসিয়াল প্রতিনিধির অনুমোদন ছাড়া আপনার অ্যাকাউন্টের রেফারেল লিংক তৈরি ও ব্যবহারের অনুমতি দেওয়া হয়নি। আপনার অ্যাকাউন্ট যাচাই ও রেফার পারমিশন এক্টিভ করতে অনুগ্রহ করে আমাদের কাস্টমার সার্ভিসের সাথে যোগাযোগ করুন।'
            : 'Access to invitation links and the referral program is currently restricted for your account. Please contact our official manager representative to review and activate your referral privileges.'}
        </p>

        <div className="w-full pt-4 space-y-3">
          {onCheckPermission && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={checking}
              className="w-full py-3 px-5 rounded-2xl font-bold text-sm bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>
                {isBn ? 'অনুমোদন রিফ্রেশ করুন' : 'Refresh Permission Status'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onContactManager}
            className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Headphones className="w-4.5 h-4.5 text-slate-950" />
            <span>
              {isBn ? 'ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন' : 'Contact Manager Representative'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onBack}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/80 transition-colors"
          >
            {isBn ? 'হোম পেজে ফিরে যান' : 'Back to Home'}
          </button>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-400 py-2">
        {isBn
          ? 'নিরাপত্তা প্রোটোকল • অনুমোদিত পার্টনার নেটওয়ার্ক'
          : 'Security Protocol • Authorized Partner Network'}
      </div>
    </div>
  );
};
