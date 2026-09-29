import React from 'react';
import { ShieldAlert, Headphones, X, MessageCircle, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { Language } from '../types';

interface ManagerReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContactManager: () => void;
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  reason?: 'no_permission' | 'limit_reached';
  currentLimit?: number;
}

export const ManagerReferralModal: React.FC<ManagerReferralModalProps> = ({
  isOpen,
  onClose,
  onContactManager,
  currentLang = 'bn',
  themeMode = 'night',
  reason = 'no_permission',
  currentLimit = 0,
}) => {
  if (!isOpen) return null;

  const isBn = currentLang === 'bn';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border transition-all duration-300 relative overflow-hidden ${
          themeMode === 'day'
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-gradient-to-b from-[#063327] to-[#042018] border-emerald-500/30 text-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]">
              {reason === 'limit_reached' ? (
                <UserCheck className="w-8 h-8 text-amber-400" />
              ) : (
                <Lock className="w-8 h-8 text-amber-400" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#063327] flex items-center justify-center text-white">
              <Headphones className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
              {reason === 'limit_reached'
                ? isBn
                  ? 'রেফারেল সীমা পূর্ণ হয়েছে'
                  : 'Referral Limit Reached'
                : isBn
                ? 'অনুমোদন প্রয়োজন'
                : 'Manager Permission Required'}
            </h3>
            <p className="text-xs text-slate-300">
              {reason === 'limit_reached'
                ? isBn
                  ? `আপনার বর্তমান রেফারেল লিমিট (${currentLimit} জন) সমাপ্ত হয়েছে`
                  : `Your referral quota (${currentLimit} members) has been completed`
                : isBn
                ? 'রেফার অপশন ও লিংক ব্যবহারের বিশেষ নির্দেশনা'
                : 'Official Referral Program Policy'}
            </p>
          </div>

          {/* Golden Amber Notice Box strictly matching user brief */}
          <div className="w-full p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-center shadow-inner">
            <p className="font-bold text-sm sm:text-base leading-snug">
              {isBn
                ? 'দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।'
                : 'Please contact the manager representative.'}
            </p>
          </div>

          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed text-center px-1">
            {reason === 'limit_reached'
              ? isBn
                ? `আপনি সফলভাবে ${currentLimit} জন রেফার করেছেন। আপনার রেফারেল কোটা বা লিমিট বৃদ্ধি করতে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।`
                : `You have successfully referred ${currentLimit} users. To increase your referral quota, please contact your manager representative.`
              : isBn
              ? 'ব্যবস্থাপক বা অ্যাডমিনের পূর্বানুমতি ব্যতীত রেফারেল অপশনে প্রবেশ কিংবা রেফারেল লিংক শেয়ার করা যাবে না। আপনার অ্যাকাউন্ট যাচাই ও রেফার পারমিশন পেতে আমাদের অফিসিয়াল প্রতিনিধির সাথে এখনই যোগাযোগ করুন।'
              : 'Access to the referral program and invitation link is restricted without prior manager authorization. Please reach out to your manager representative to verify and activate your referral privileges.'}
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onContactManager();
              }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Headphones className="w-4 h-4 text-slate-950" />
              <span>
                {isBn ? 'ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন' : 'Contact Manager Representative'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
