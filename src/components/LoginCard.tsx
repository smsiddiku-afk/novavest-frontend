import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Globe,
  AlertCircle,
  CheckCircle2,
  X,
  KeyRound,
  LogIn,
} from 'lucide-react';
import { Language } from '../types';
import { signInWithFirebase, sendFirebasePasswordReset } from '../utils/authService';

interface LoginCardProps {
  onSwitchToRegister: () => void;
  onLoginSuccess: (identifier: string) => void;
  currentLang?: Language;
  onToggleLang?: (lang: Language) => void;
}

export const LoginCard: React.FC<LoginCardProps> = ({
  onSwitchToRegister,
  onLoginSuccess,
  currentLang = 'bn',
  onToggleLang,
}) => {
  const [lang, setLang] = useState<Language>(currentLang);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('nvt_remembered_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleLangToggle = () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    if (onToggleLang) onToggleLang(nextLang);
  };

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      newErrors.email = lang === 'bn' ? 'আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন' : 'Please enter your registered email address';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = lang === 'bn' ? 'সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter password';
    } else if (password.trim().length < 6) {
      newErrors.password =
        lang === 'bn'
          ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে'
          : 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();
      const result = await signInWithFirebase(cleanEmail, cleanPassword, lang);

      if (result.success && result.user) {
        try {
          localStorage.setItem('nvt_remembered_email', cleanEmail);
        } catch (_) {}
        setGeneralError(null);
        setIsSubmitting(false);
        onLoginSuccess(cleanEmail);
      } else {
        setIsSubmitting(false);
        setGeneralError(
          result.error ||
            (lang === 'bn'
              ? 'ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। অনুগ্রহ করে পুনরায় চেষ্টা করুন।'
              : 'Invalid email or password. Please try again.')
        );
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError(
        err?.message || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Login failed. Please try again.')
      );
    }
  };

  const handleOpenForgotModal = () => {
    setResetInput(email.trim());
    setResetStatus(null);
    setShowForgotModal(true);
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = resetInput.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setResetStatus({
        type: 'error',
        message:
          lang === 'bn'
            ? 'পাসওয়ার্ড রিসেট করতে অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন।'
            : 'Please enter a valid email address to reset password.',
      });
      return;
    }

    setResetLoading(true);
    setResetStatus(null);

    const res = await sendFirebasePasswordReset(cleanEmail, lang);
    setResetLoading(false);
    if (res.success) {
      setResetStatus({ type: 'success', message: res.message });
    } else {
      setResetStatus({ type: 'error', message: res.message });
    }
  };

  const t = {
    signIn: lang === 'bn' ? 'ইমেইল লগইন' : 'Email Sign In',
    signUp: lang === 'bn' ? 'সাইন আপ' : 'Sign Up',
    langLabel: lang === 'bn' ? 'English' : 'বাংলা',
    emailLabel: lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address',
    emailPlaceholder: lang === 'bn' ? 'আপনার ইমেইল লিখুন' : 'Enter your email',
    passwordLabel: lang === 'bn' ? 'পাসওয়ার্ড' : 'Password',
    passwordPlaceholder: lang === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password',
    loginBtn: lang === 'bn' ? 'লগইন করুন' : 'Sign In',
    forgotPassword: lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?',
  };

  return (
    <div
      id="login-card"
      className="w-full max-w-[440px] mx-auto bg-[#08362b]/95 backdrop-blur-2xl rounded-[22px] sm:rounded-[26px] p-4 sm:p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.12)] border border-emerald-500/25 transition-all duration-300"
    >
      {/* Top Bar: Tabs & Language Pill */}
      <div className="flex items-center justify-between pb-2 sm:pb-3 mb-3 border-b border-emerald-500/20">
        <div className="flex items-center gap-5 sm:gap-7">
          <button
            type="button"
            id="tab-sign-in"
            onClick={() => setGeneralError(null)}
            className="relative pb-1 text-base sm:text-lg font-black text-emerald-400 transition-colors cursor-pointer flex items-center gap-2"
          >
            <LogIn className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
            <span>{t.signIn}</span>
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          </button>

          <button
            type="button"
            id="tab-sign-up"
            onClick={onSwitchToRegister}
            className="relative pb-1 text-base sm:text-lg font-bold text-emerald-100/60 hover:text-emerald-200 transition-colors cursor-pointer"
          >
            {t.signUp}
          </button>
        </div>

        <button
          type="button"
          id="lang-toggle-btn"
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.langLabel}</span>
        </button>
      </div>

      {/* Main Email Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-0.5" noValidate>
        {generalError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-medium flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* Email Address Input Room (হাল্কা ও পরিচ্ছন্ন) */}
        <div>
          <label className="block text-xs font-semibold text-emerald-300 mb-1 px-1">
            {t.emailLabel}
          </label>
          <div
            className={`relative flex items-center min-h-[46px] sm:min-h-[48px] px-3.5 rounded-xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.email
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <Mail className="w-4.5 h-4.5 text-emerald-400/90 mr-2.5 shrink-0" />
            <input
              id="email-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder={t.emailPlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder:text-emerald-100/50 font-normal focus:outline-none"
            />
          </div>
          {errors.email && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.email}
            </p>
          )}
        </div>

        {/* Password Input Room (হাল্কা ও পরিচ্ছন্ন) */}
        <div>
          <label className="block text-xs font-semibold text-emerald-300 mb-1 px-1">
            {t.passwordLabel}
          </label>
          <div
            className={`relative flex items-center min-h-[46px] sm:min-h-[48px] px-3.5 rounded-xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.password
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <Lock className="w-4.5 h-4.5 text-emerald-400/90 mr-2.5 shrink-0" />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder={t.passwordPlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder:text-emerald-100/50 font-normal focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 text-emerald-400/70 hover:text-emerald-300 p-1 focus:outline-none cursor-pointer transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.password}
            </p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={handleOpenForgotModal}
            className="text-xs sm:text-sm font-bold text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer transition-colors"
          >
            {t.forgotPassword}
          </button>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            id="login-submit-btn"
            disabled={isSubmitting}
            className="w-full min-h-[50px] sm:min-h-[54px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 via-[#00e676] to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg tracking-wide shadow-lg shadow-emerald-500/30 transition-all duration-200 active:scale-[0.98] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Authenticating...'}</span>
              </div>
            ) : (
              <span>{t.loginBtn}</span>
            )}
          </button>
        </div>

        {/* Bottom Link: Don't have an account? Sign Up */}
        <div className="text-center pt-2 pb-1">
          <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
            {lang === 'bn' ? 'অ্যাকাউন্ট নেই? ' : "Don't have an account? "}
            <button
              type="button"
              id="switch-to-register-btn-bottom"
              onClick={onSwitchToRegister}
              className="font-black text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer transition-colors ml-1"
            >
              {lang === 'bn' ? 'ইমেইল দিয়ে নিবন্ধন করুন' : 'Register with Email'}
            </button>
          </p>
        </div>
      </form>

      {/* Forgot Password Modal (Sends reset link to email) */}
      {showForgotModal && (
        <div
          id="forgot-password-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-[#05241b] border border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl relative text-white">
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setResetStatus(null);
              }}
              className="absolute top-4 right-4 text-emerald-300/70 hover:text-white p-1 rounded-lg hover:bg-emerald-900/30 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {lang === 'bn' ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password'}
                </h3>
                <p className="text-xs text-emerald-300/70">
                  {lang === 'bn'
                    ? 'আপনার রেজিস্টার্ড ইমেইল এড্রেস লিখুন'
                    : 'Enter your registered email address'}
                </p>
              </div>
            </div>

            {resetStatus && (
              <div
                className={`p-3 mb-4 rounded-xl border text-xs sm:text-sm flex items-start gap-2 ${
                  resetStatus.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                }`}
              >
                {resetStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{resetStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleSendReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-300 mb-1.5">
                  {lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}
                </label>
                <input
                  type="email"
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder={
                    lang === 'bn' ? 'উদাহরণ: user@mail.com' : 'e.g. user@mail.com'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#031812] border border-emerald-500/30 text-white placeholder:text-emerald-200/30 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetStatus(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-75 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {resetLoading ? (
                    <span className="w-4 h-4 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <span>{lang === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
