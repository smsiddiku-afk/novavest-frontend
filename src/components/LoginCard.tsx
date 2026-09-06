import React, { useState } from 'react';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Globe,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Language } from '../types';

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
  const [countryCode, setCountryCode] = useState('+880');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const handleLangToggle = () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    if (onToggleLang) onToggleLang(nextLang);
  };

  const validateForm = (): boolean => {
    const newErrors: { phone?: string; password?: string } = {};

    if (!phone.trim()) {
      newErrors.phone = lang === 'bn' ? 'আপনার ফোন নম্বর লিখুন' : 'Enter your phone number';
    } else if (phone.trim().length < 8) {
      newErrors.phone = lang === 'bn' ? 'সঠিক ফোন নম্বর দিন' : 'Enter a valid phone number';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(`${countryCode} ${phone}`);
    }, 800);
  };

  const t = {
    signIn: lang === 'bn' ? 'সাইন ইন' : 'Sign In',
    signUp: lang === 'bn' ? 'সাইন আপ' : 'Sign Up',
    langLabel: lang === 'bn' ? 'English' : 'বাংলা',
    phonePlaceholder: lang === 'bn' ? 'আপনার ফোন নম্বর লিখুন' : 'Enter your phone number',
    passwordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড লিখুন' : 'Enter password',
    loginBtn: lang === 'bn' ? 'সাইন ইন করুন' : 'Sign In',
    forgotPassword: lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?',
  };

  return (
    <div
      id="login-card"
      className="w-full max-w-[460px] mx-auto bg-[#11192e]/95 backdrop-blur-2xl rounded-[28px] sm:rounded-[32px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65),0_0_35px_rgba(37,99,235,0.12)] border border-slate-700/60 transition-all duration-300"
    >
      {/* Top Bar: Tabs & Language Pill */}
      <div className="flex items-center justify-between pb-6 mb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            type="button"
            id="tab-sign-in"
            className="relative pb-2 text-lg sm:text-xl font-bold text-blue-500 transition-colors"
          >
            {t.signIn}
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          </button>

          <button
            type="button"
            id="tab-sign-up"
            onClick={onSwitchToRegister}
            className="relative pb-2 text-lg sm:text-xl font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t.signUp}
          </button>
        </div>

        <button
          type="button"
          id="lang-toggle-btn"
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-medium border border-slate-700/80 transition-all shadow-sm active:scale-95"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.langLabel}</span>
        </button>
      </div>

      {/* Main Login Form with Extra-Large Rooms */}
      <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
        {/* 1. Phone Input Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[58px] sm:min-h-[62px] px-4 rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.phone
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <div className="relative flex items-center gap-2 pr-3 shrink-0">
              <Phone className="w-5 h-5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="flex items-center gap-1 text-sm sm:text-base font-semibold text-slate-200 hover:text-blue-400"
              >
                <span>{countryCode}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showCountryDropdown && (
                <div className="absolute top-12 left-0 z-30 w-36 bg-[#11192e] rounded-xl shadow-2xl border border-slate-700 py-1 text-sm font-medium">
                  {['+880', '+91', '+1', '+44', '+971', '+966', '+60'].map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        setCountryCode(code);
                        setShowCountryDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                    >
                      <span>{code}</span>
                      {countryCode === code && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-700/70 mr-3 shrink-0" />

            <input
              id="phone-input"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
              }}
              placeholder={t.phonePlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.phone}
            </p>
          )}
        </div>

        {/* 2. Password Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[58px] sm:min-h-[62px] px-4 rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.password
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <Lock className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder={t.passwordPlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-medium focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
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
        <div className="flex justify-end pt-1">
          <button
            type="button"
            className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            {t.forgotPassword}
          </button>
        </div>

        {/* Big Bright Blue Submit Button */}
        <div className="pt-2">
          <button
            id="login-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[56px] sm:min-h-[60px] flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-base sm:text-lg font-bold shadow-lg shadow-blue-600/30 transition-all duration-200 cursor-pointer disabled:opacity-75"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{lang === 'bn' ? 'অপেক্ষা করুন...' : 'Logging in...'}</span>
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
