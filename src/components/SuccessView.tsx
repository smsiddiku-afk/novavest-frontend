import React, { useState, useEffect } from 'react';
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { RegisterFormData } from '../types';

interface SuccessViewProps {
  userData: RegisterFormData;
  onReset: () => void;
  onGoToLogin: () => void;
  onGoToProfile?: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  userData,
  onReset,
  onGoToLogin,
  onGoToProfile,
}) => {
  return (
    <div
      id="success-card"
      className="w-full max-w-[460px] mx-auto bg-[#062a1f]/95 backdrop-blur-2xl rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_35px_rgba(16,185,129,0.15)] border border-emerald-500/30 text-center animate-in zoom-in-95 duration-300"
    >
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
          সফলভাবে সম্পন্ন হয়েছে / SUCCESS
        </span>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          স্বাগতম! WELCOME
        </h2>
        <p className="text-sm text-emerald-200/60 mt-1 max-w-xs">
          আপনার অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে
        </p>
      </div>

      {/* Account Info Box */}
      <div className="rounded-2xl p-4 bg-[#031c15]/90 border border-emerald-500/30 text-left space-y-3 mb-6 text-sm">
        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
          <span className="text-emerald-200/60">ডাকনাম / Name:</span>
          <span className="text-white font-semibold">{userData.username}</span>
        </div>
        {userData.email && (
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <span className="text-emerald-200/60">ইমেল / Email:</span>
            <span className="text-white font-medium">{userData.email}</span>
          </div>
        )}
        {userData.phone && (
          <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
            <span className="text-emerald-200/60">ফোন নম্বর / Phone:</span>
            <span className="text-white font-medium">{userData.phone}</span>
          </div>
        )}
        <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
          <span className="text-emerald-200/60">রেফার কোড / Referral:</span>
          <span className="text-emerald-400 font-bold">{userData.referralCode}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-emerald-200/60">স্ট্যাটাস / Status:</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> ভেরিফাইড (Verified)
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {onGoToProfile && (
          <button
            type="button"
            onClick={onGoToProfile}
            className="w-full min-h-[52px] rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer active:scale-98"
          >
            <span>প্রোফাইল পেজ দেখুন (View Profile Page)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onGoToLogin}
          className="w-full min-h-[48px] rounded-2xl bg-[#031c15] hover:bg-[#06241b] text-emerald-100 font-semibold flex items-center justify-center gap-2 border border-emerald-500/30 transition-all cursor-pointer active:scale-98 text-sm"
        >
          <span>সাইন ইন পেজে যান (Go to Sign In)</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 text-xs text-emerald-300/60 hover:text-emerald-200 font-medium cursor-pointer transition-colors"
        >
          নতুন অ্যাকাউন্ট তৈরি করুন (Register Another)
        </button>
      </div>
    </div>
  );
};
