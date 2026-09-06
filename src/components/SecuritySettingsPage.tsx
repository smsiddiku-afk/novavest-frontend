import React, { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Check,
  Smartphone,
  Info,
} from 'lucide-react';
import { Language } from '../types';

interface SecuritySettingsPageProps {
  currentLang?: Language;
  userPhone?: string;
  onClose: () => void;
  showToast?: (message: string) => void;
  onOpen2FA?: () => void;
}

export const SecuritySettingsPage: React.FC<SecuritySettingsPageProps> = ({
  currentLang = 'en',
  userPhone = '+880 1712-345678',
  onClose,
  showToast,
  onOpen2FA,
}) => {
  const isBn = currentLang === 'bn';

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form error & success states
  const [errors, setErrors] = useState<{
    oldPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Password Strength calculation
  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) || /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return score;
  };

  const strengthScore = calculateStrength(newPassword);

  const getStrengthLabel = () => {
    if (!newPassword) return '';
    if (strengthScore <= 1) return isBn ? 'দুর্বল' : 'Weak';
    if (strengthScore <= 3) return isBn ? 'মাঝারি' : 'Medium';
    if (strengthScore === 4) return isBn ? 'ভালো' : 'Good';
    return isBn ? 'শক্তিশালী' : 'Strong';
  };

  const getStrengthColor = () => {
    if (strengthScore <= 1) return 'bg-rose-500 text-rose-400';
    if (strengthScore <= 3) return 'bg-amber-500 text-amber-400';
    if (strengthScore === 4) return 'bg-cyan-500 text-cyan-400';
    return 'bg-emerald-500 text-emerald-400';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    // 1. Old password validation
    if (!oldPassword.trim()) {
      newErrors.oldPassword = isBn
        ? 'আপনার বর্তমান পাসওয়ার্ড প্রদান করুন'
        : 'Please enter your current password';
    }

    // 2. New password validation
    if (!newPassword.trim()) {
      newErrors.newPassword = isBn
        ? 'নতুন পাসওয়ার্ড প্রদান করুন'
        : 'Please enter a new password';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = isBn
        ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'
        : 'New password must be at least 6 characters';
    } else if (oldPassword && newPassword === oldPassword) {
      newErrors.newPassword = isBn
        ? 'নতুন পাসওয়ার্ড পুরনোটির মতো হতে পারবে না'
        : 'New password cannot be identical to current password';
    }

    // 3. Confirm password validation
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = isBn
        ? 'নতুন পাসওয়ার্ডটি নিশ্চিত করুন'
        : 'Please re-enter your new password to confirm';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = isBn
        ? 'পাসওয়ার্ড দুটি মেলেনি'
        : 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    // Simulate safe API update
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      showToast?.(
        isBn
          ? 'লগইন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!'
          : 'Login password successfully updated!'
      );

      // Save record in localStorage if applicable
      try {
        localStorage.setItem('user_last_password_change', new Date().toISOString());
      } catch {
        // ignore
      }

      // Reset form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setIsSuccess(false);
      }, 3500);
    }, 600);
  };

  return (
    <div
      id="security-settings-page-wrapper"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#070D18] flex flex-col text-slate-100 animate-in fade-in duration-200"
    >
      {/* Top Mobile App Bar Header */}
      <header
        id="security-settings-header"
        className="sticky top-0 z-20 bg-[#08101E]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            id="security-page-back-button"
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#101B2E] hover:bg-[#182844] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-700/60 shadow-sm"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              <span>{isBn ? 'নিরাপত্তা সেটিংস' : 'Security Settings'}</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {isBn ? 'লগইন পাসওয়ার্ড ও সুরক্ষা ব্যবস্থাপনা' : 'Login password & account protection'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>256-bit SSL</span>
          </span>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Account Security Status Banner */}
        <div
          id="security-status-card"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0C192E] to-[#0A1424] border border-cyan-500/20 p-4 sm:p-5 shadow-lg shadow-black/40"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isBn ? 'অ্যাকাউন্ট নিরাপত্তা স্ট্যাটাস' : 'Account Security Level'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    {isBn ? 'উচ্চ সুরক্ষিত' : 'HIGH'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {userPhone ? `${isBn ? 'সংযুক্ত ফোন' : 'Linked Phone'}: ${userPhone}` : 'ID Protected'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Success Alert if just updated */}
        {isSuccess && (
          <div
            id="password-change-success-banner"
            className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-emerald-300 text-sm animate-in fade-in duration-200"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">
                {isBn
                  ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!'
                  : 'Password updated successfully!'}
              </p>
              <p className="text-xs text-emerald-400/80">
                {isBn
                  ? 'পরবর্তী লগইনে আপনার নতুন পাসওয়ার্ড ব্যবহার করুন।'
                  : 'Please use your new password next time you sign in.'}
              </p>
            </div>
          </div>
        )}

        {/* Login Password Change Form Card */}
        <section
          id="login-password-change-section"
          className="rounded-3xl bg-[#091220] border border-slate-800/90 p-5 sm:p-7 shadow-xl space-y-6"
        >
          {/* Section Header */}
          <div className="border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  {isBn ? 'লগইন পাসওয়ার্ড পরিবর্তন' : 'Login Password Change'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isBn
                    ? 'আপনার অ্যাকাউন্টের নিরাপত্তা বজায় রাখতে নিয়মিত পাসওয়ার্ড আপডেট করুন'
                    : 'Update your login credentials regularly to keep your account safe'}
                </p>
              </div>
            </div>
          </div>

          {/* Change Password Form */}
          <form id="password-change-form" onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Old Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="old-password-input"
                  className="block text-sm font-medium text-slate-300"
                >
                  {isBn ? 'পুরনো পাসওয়ার্ড (Old Password)' : 'Old Password'}{' '}
                  <span className="text-rose-500 font-bold">*</span>
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="old-password-input"
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value);
                    if (errors.oldPassword) setErrors((prev) => ({ ...prev, oldPassword: undefined }));
                  }}
                  placeholder={isBn ? 'বর্তমান পাসওয়ার্ড লিখুন' : 'Enter current login password'}
                  className={`w-full rounded-xl bg-[#0C1728] border ${
                    errors.oldPassword
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-400'
                  } pl-10 pr-11 py-3.5 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-1 ${
                    errors.oldPassword ? 'focus:ring-rose-500' : 'focus:ring-cyan-400'
                  } transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                >
                  {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errors.oldPassword && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.oldPassword}</span>
                </p>
              )}
            </div>

            {/* 2. New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="new-password-input"
                className="block text-sm font-medium text-slate-300"
              >
                {isBn ? 'নতুন পাসওয়ার্ড (New Password)' : 'New Password'}{' '}
                <span className="text-rose-500 font-bold">*</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }}
                  placeholder={
                    isBn
                      ? 'নতুন পাসওয়ার্ড দিন (কমপক্ষে ৬ অক্ষর)'
                      : 'Enter new password (min. 6 characters)'
                  }
                  className={`w-full rounded-xl bg-[#0C1728] border ${
                    errors.newPassword
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-400'
                  } pl-10 pr-11 py-3.5 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-1 ${
                    errors.newPassword ? 'focus:ring-rose-500' : 'focus:ring-cyan-400'
                  } transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {isBn ? 'পাসওয়ার্ডের শক্তি:' : 'Password strength:'}
                    </span>
                    <span className={`font-bold ${getStrengthColor().split(' ')[1]}`}>
                      {getStrengthLabel()}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full rounded-full transition-all duration-300 ${
                          strengthScore >= step ? getStrengthColor().split(' ')[0] : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {errors.newPassword && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.newPassword}</span>
                </p>
              )}
            </div>

            {/* 3. Confirm New Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirm-password-input"
                className="block text-sm font-medium text-slate-300"
              >
                {isBn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}{' '}
                <span className="text-rose-500 font-bold">*</span>
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder={
                    isBn
                      ? 'নতুন পাসওয়ার্ড পুনরায় লিখুন'
                      : 'Re-enter your new password'
                  }
                  className={`w-full rounded-xl bg-[#0C1728] border ${
                    errors.confirmPassword
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-800 focus:border-cyan-400'
                  } pl-10 pr-11 py-3.5 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:ring-1 ${
                    errors.confirmPassword ? 'focus:ring-rose-500' : 'focus:ring-cyan-400'
                  } transition-all`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password Match Badge */}
              {confirmPassword.length > 0 && newPassword.length > 0 && (
                <div className="pt-0.5 flex items-center gap-1.5 text-xs">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <Check className="w-3.5 h-3.5" />
                      {isBn ? 'পাসওয়ার্ড মিলেছে' : 'Passwords match'}
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {isBn ? 'পাসওয়ার্ড এখনও মেলেনি' : 'Passwords do not match yet'}
                    </span>
                  )}
                </div>
              )}

              {errors.confirmPassword && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            {/* Security Checklist Pills */}
            <div className="pt-2 p-3.5 rounded-2xl bg-[#0B1526] border border-slate-800/80 space-y-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 block">
                {isBn ? 'পাসওয়ার্ড সুরক্ষা নির্দেশিকা:' : 'Password Security Rules:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      newPassword.length >= 6
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>{isBn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      /\d/.test(newPassword)
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                  </div>
                  <span>{isBn ? 'সংখ্যা অন্তর্ভুক্ত করুন (০-৯)' : 'Contains number (0-9)'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3">
              <button
                id="update-password-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-gradient-to-r from-[#00A3FF] to-[#0066FF] hover:from-[#0092e6] hover:to-[#0055e6] text-white font-bold text-base py-3.5 px-6 flex items-center justify-center gap-2.5 shadow-[0_0_24px_rgba(0,140,255,0.4)] active:scale-[0.99] transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-5 h-5" />
                    <span>
                      {isBn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Update Password'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="sm:w-32 rounded-2xl bg-[#101C30] hover:bg-[#162744] text-slate-300 hover:text-white font-bold text-sm py-3.5 px-5 transition-all border border-slate-800 cursor-pointer text-center"
              >
                {isBn ? 'বাতিল' : 'Cancel'}
              </button>
            </div>
          </form>
        </section>

        {/* Extra Security Options Card (2FA & Safety Note) */}
        <section
          id="secondary-security-settings-card"
          className="rounded-3xl bg-[#091220] border border-slate-800/90 p-5 sm:p-6 space-y-4"
        >
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>{isBn ? 'দ্বি-স্তর বিশিষ্ট নিরাপত্তা (২এফএ)' : 'Two-Factor Authentication'}</span>
          </h3>

          <div className="p-4 rounded-2xl bg-[#0C1728] border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-white block">
                {isBn ? 'গুগল অথেন্টিকেটর (Google Authenticator)' : 'Google Authenticator'}
              </span>
              <span className="text-xs text-slate-400 block">
                {isBn
                  ? 'উইথড্রয়াল ও সংবেদনশীল কাজের অতিরিক্ত নিরাপত্তা কোড'
                  : 'Extra verification code for withdrawals and sensitive actions'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpen2FA?.();
              }}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ml-3"
            >
              {isBn ? 'সেটআপ করুন' : 'Configure'}
            </button>
          </div>

          {/* Security Notice Box */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-amber-300/90 leading-relaxed">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              {isBn
                ? 'সতর্কতা: আপনার পাসওয়ার্ড কাউকে জানাবেন না। অ্যাডমিন বা সাপোর্ট টিম কখনই আপনার লগইন পাসওয়ার্ড জানতে চাইবে না।'
                : 'Security Tip: Never share your login password with anyone. Official customer support will never ask for your password.'}
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};
