import React, { useState } from 'react';
import {
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Globe,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '../types';
import { signInWithFirebase } from '../utils/authService';

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
  const [loginMode, setLoginMode] = useState<'phone' | 'email'>('phone');
  const [countryCode, setCountryCode] = useState('+880');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const handleLangToggle = () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    if (onToggleLang) onToggleLang(nextLang);
  };

  const validateForm = (): boolean => {
    const newErrors: { phone?: string; email?: string; password?: string } = {};

    if (loginMode === 'phone') {
      if (!phone.trim()) {
        newErrors.phone = lang === 'bn' ? 'আপনার ফোন নম্বর লিখুন' : 'Enter your phone number';
      } else if (phone.trim().length < 8) {
        newErrors.phone = lang === 'bn' ? 'সঠিক ফোন নম্বর দিন' : 'Enter a valid phone number';
      }
    } else {
      if (!email.trim()) {
        newErrors.email = lang === 'bn' ? 'আপনার ইমেল ঠিকানা লিখুন' : 'Enter your email address';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        newErrors.email = lang === 'bn' ? 'সঠিক ইমেল ঠিকানা লিখুন' : 'Enter a valid email address';
      }
    }

    if (!password) {
      newErrors.password = lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter password';
    } else if (password.length < 6) {
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
      let identifier = email.trim();
      if (loginMode === 'phone') {
        const cleanPhone = phone.trim().replace(/\s+/g, '');
        // If user typed leading 0 with +880, normalize cleanly
        if (countryCode === '+880' && cleanPhone.startsWith('0')) {
          identifier = `+880 ${cleanPhone.replace(/^0+/, '')}`;
        } else {
          identifier = `${countryCode} ${cleanPhone}`;
        }
      }

      const result = await signInWithFirebase(identifier, password, lang);

      setIsSubmitting(false);
      if (result.success && result.user) {
        onLoginSuccess(identifier);
      } else {
        setGeneralError(
          result.error || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Login failed. Please try again.')
        );
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError(
        err?.message || (lang === 'bn' ? 'লগইন ব্যর্থ হয়েছে।' : 'Login failed. Please try again.')
      );
    }
  };

  const t = {
    signIn: lang === 'bn' ? 'সাইন ইন' : 'Sign In',
    signUp: lang === 'bn' ? 'সাইন আপ' : 'Sign Up',
    langLabel: lang === 'bn' ? 'English' : 'বাংলা',
    byPhone: lang === 'bn' ? 'ফোন নম্বর' : 'Phone Number',
    byEmail: lang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address',
    phonePlaceholder: lang === 'bn' ? 'আপনার ফোন নম্বর লিখুন' : 'Enter your phone number',
    emailPlaceholder: lang === 'bn' ? 'আপনার ইমেল এড্রেস লিখুন' : 'Enter your email address',
    passwordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter password',
    loginBtn: lang === 'bn' ? 'সাইন ইন করুন' : 'Sign In',
    forgotPassword: lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?',
  };

  return (
    <div
      id="login-card"
      className="w-full max-w-[460px] mx-auto bg-[#062a1f]/95 backdrop-blur-2xl rounded-[22px] sm:rounded-[26px] p-3.5 sm:p-5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7),0_0_30px_rgba(16,185,129,0.14)] border border-emerald-500/30 transition-all duration-300"
    >
      {/* Top Bar: Tabs & Language Pill */}
      <div className="flex items-center justify-between pb-2 sm:pb-3 mb-1.5 sm:mb-2 border-b border-emerald-500/20">
        <div className="flex items-center gap-5 sm:gap-7">
          <button
            type="button"
            id="tab-sign-in"
            className="relative pb-1 text-base sm:text-lg font-bold text-emerald-400 transition-colors"
          >
            {t.signIn}
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          </button>

          <button
            type="button"
            id="tab-sign-up"
            onClick={onSwitchToRegister}
            className="relative pb-1 text-base sm:text-lg font-medium text-emerald-100/60 hover:text-emerald-200 transition-colors"
          >
            {t.signUp}
          </button>
        </div>

        <button
          type="button"
          id="lang-toggle-btn"
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#041c14] hover:bg-[#06241b] text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-all shadow-sm active:scale-95"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.langLabel}</span>
        </button>
      </div>

      {/* Login Mode Toggle: Phone vs Email */}
      <div className="flex items-center p-1 mb-3 rounded-xl bg-[#031812] border border-emerald-500/20">
        <button
          type="button"
          onClick={() => {
            setLoginMode('phone');
            setGeneralError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            loginMode === 'phone'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
              : 'text-emerald-100/60 hover:text-emerald-100'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>{t.byPhone}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMode('email');
            setGeneralError(null);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
            loginMode === 'email'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm shadow-emerald-500/30'
              : 'text-emerald-100/60 hover:text-emerald-100'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>{t.byEmail}</span>
        </button>
      </div>

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-1" noValidate>
        {/* Error message banner */}
        {generalError && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* 1. Phone or Email Input */}
        {loginMode === 'phone' ? (
          <div>
            <div
              className={`relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#031c15]/90 border transition-all duration-200 ${
                errors.phone
                  ? 'border-rose-500 bg-rose-950/20'
                  : 'border-emerald-500/30 hover:border-emerald-500/50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20'
              }`}
            >
              <div className="relative flex items-center gap-2 pr-3 shrink-0">
                <Phone className="w-5 h-5 text-emerald-400" />
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center gap-1 text-sm sm:text-base font-semibold text-emerald-200 hover:text-emerald-100"
                >
                  <span>{countryCode}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-400/80" />
                </button>

                {showCountryDropdown && (
                  <div className="absolute top-12 left-0 z-30 w-36 bg-[#062a1f] rounded-xl shadow-2xl border border-emerald-500/40 py-1 text-sm font-medium">
                    {['+880', '+91', '+1', '+44', '+971', '+966', '+60'].map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setCountryCode(code);
                          setShowCountryDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#08382a] text-emerald-100 flex items-center justify-between"
                      >
                        <span>{code}</span>
                        {countryCode === code && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-6 w-px bg-emerald-500/20 mr-3 shrink-0" />

              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder={t.phonePlaceholder}
                className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder:text-emerald-200/40 font-medium focus:outline-none"
              />
            </div>
            {errors.phone && (
              <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
              </p>
            )}
          </div>
        ) : (
          <div>
            <div
              className={`relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#031c15]/90 border transition-all duration-200 ${
                errors.email
                  ? 'border-rose-500 bg-rose-950/20'
                  : 'border-emerald-500/30 hover:border-emerald-500/50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20'
              }`}
            >
              <Mail className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder={t.emailPlaceholder}
                className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder:text-emerald-200/40 font-medium focus:outline-none"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
              </p>
            )}
          </div>
        )}

        {/* 2. Password Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#031c15]/90 border transition-all duration-200 ${
              errors.password
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-emerald-500/30 hover:border-emerald-500/50 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20'
            }`}
          >
            <Lock className="w-5 h-5 text-emerald-400 mr-3 shrink-0" />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder={t.passwordPlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder:text-emerald-200/40 font-medium focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-emerald-400/80 hover:text-emerald-300 p-1 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.password}
            </p>
          )}
        </div>

        {/* Forgot password link */}
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            className="text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            {t.forgotPassword}
          </button>
        </div>

        {/* Glowing Emerald Action Button */}
        <div className="pt-1 sm:pt-1.5">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-slate-950 text-base sm:text-lg font-bold shadow-lg shadow-emerald-500/30 transition-all duration-200 cursor-pointer disabled:opacity-75"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>{lang === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Authenticating...'}</span>
              </div>
            ) : (
              <span>{t.loginBtn}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
