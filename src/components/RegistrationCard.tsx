import React, { useState, useEffect } from 'react';
import {
  Phone,
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  Mail,
  Send,
  KeyRound,
  ChevronDown,
  Globe,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { LegalDocType, RegisterFormData, Language } from '../types';
import { registerWithFirebase } from '../utils/authService';
import { registerUserInReferralNetwork, generateUniqueReferralCode } from '../utils/referralService';

interface RegistrationCardProps {
  onSwitchToLogin: () => void;
  onOpenLegal: (type: LegalDocType) => void;
  onRegistrationSuccess: (data: RegisterFormData) => void;
  currentLang?: Language;
  onToggleLang?: (lang: Language) => void;
}

interface FormErrors {
  phone?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  verificationCode?: string;
}

export const RegistrationCard: React.FC<RegistrationCardProps> = ({
  onSwitchToLogin,
  onRegistrationSuccess,
  currentLang = 'bn',
  onToggleLang,
}) => {
  const [lang, setLang] = useState<Language>(currentLang);
  const [countryCode, setCountryCode] = useState('+880');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || urlParams.get('referral');
      if (ref) return ref.trim();
    }
    return 'IZC4NR';
  });

  // OTP State
  const [sentOtpCode, setSentOtpCode] = useState<string | null>(null);
  const [sendCooldown, setSendCooldown] = useState(0);
  const [codeNotification, setCodeNotification] = useState<{ code: string; email: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form State
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Countdown timer for Email OTP send
  useEffect(() => {
    if (sendCooldown <= 0) return;
    const timer = setInterval(() => {
      setSendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [sendCooldown]);

  // Handle email OTP generation & sending
  const handleSendEmailCode = () => {
    if (sendCooldown > 0) return;

    if (!email.trim()) {
      setErrors((prev) => ({
        ...prev,
        email: lang === 'bn' ? 'প্রথমে আপনার ইমেল লিখুন' : 'Please enter your email first',
      }));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrors((prev) => ({
        ...prev,
        email: lang === 'bn' ? 'সঠিক ইমেল ঠিকানা লিখুন' : 'Please enter a valid email address',
      }));
      return;
    }

    // Clear email error
    setErrors((prev) => ({ ...prev, email: undefined, verificationCode: undefined }));

    // Generate random 6-digit verification code
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setSentOtpCode(generatedCode);
    setSendCooldown(60);
    setCodeNotification({
      code: generatedCode,
      email: email.trim(),
    });
  };

  const handleAutoFillCode = () => {
    if (codeNotification) {
      setEmailVerificationCode(codeNotification.code);
      setIsCopied(true);
      if (errors.verificationCode) {
        setErrors((prev) => ({ ...prev, verificationCode: undefined }));
      }
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleLangToggle = () => {
    const nextLang = lang === 'bn' ? 'en' : 'bn';
    setLang(nextLang);
    if (onToggleLang) onToggleLang(nextLang);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!phone.trim()) {
      newErrors.phone = lang === 'bn' ? 'আপনার ফোন নম্বর লিখুন' : 'Please enter your phone number';
    } else if (phone.trim().length < 8) {
      newErrors.phone = lang === 'bn' ? 'সঠিক ফোন নম্বর দিন' : 'Enter a valid phone number';
    }

    if (!username.trim()) {
      newErrors.username = lang === 'bn' ? 'আপনার ডাকনাম লিখুন' : 'Please enter your nickname';
    }

    if (!password) {
      newErrors.password = lang === 'bn' ? 'পাসওয়ার্ড তৈরি করুন' : 'Please create a password';
    } else if (password.length < 6) {
      newErrors.password =
        lang === 'bn'
          ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে'
          : 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword =
        lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword =
        lang === 'bn' ? 'দুটি পাসওয়ার্ড মেলেনি' : 'Passwords do not match';
    }

    if (!email.trim()) {
      newErrors.email = lang === 'bn' ? 'আপনার ইমেল ঠিকানা লিখুন' : 'Please enter your email';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email =
          lang === 'bn' ? 'সঠিক ইমেল ঠিকানা লিখুন' : 'Enter a valid email address';
      }
    }

    if (!emailVerificationCode.trim()) {
      newErrors.verificationCode =
        lang === 'bn' ? 'ইমেলে আসা কোডটি লিখুন' : 'Please enter the email verification code';
    } else if (!sentOtpCode) {
      newErrors.verificationCode =
        lang === 'bn'
          ? 'প্রথমে "সেন্ড" বাটনে ক্লিক করে কোড আনুন'
          : 'Please click "Send" to get the code';
    } else if (emailVerificationCode.trim() !== sentOtpCode) {
      newErrors.verificationCode =
        lang === 'bn' ? 'যাচাইকরণ কোডটি ভুল' : 'Verification code is incorrect';
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
      const result = await registerWithFirebase(
        {
          email: email.trim(),
          phone: `${countryCode} ${phone}`,
          username: username.trim(),
          password,
          referralCode: referralCode.trim(),
        },
        lang
      );

      setIsSubmitting(false);
      if (result.success && result.user) {
        // নতুন ইউজারের ইউনিক রেফারেল কোড জেনারেট করে লোকাল রেফারেল নেটওয়ার্কে যুক্ত করা
        const newUserCode = generateUniqueReferralCode(username.trim());
        registerUserInReferralNetwork(
          result.user.uid || 'user_' + Date.now(),
          newUserCode,
          referralCode.trim(),
          `${countryCode} ${phone}`,
          username.trim()
        );

        onRegistrationSuccess({
          phone: `${countryCode} ${phone}`,
          username: username.trim(),
          password,
          confirmPassword,
          referralCode: referralCode.trim(),
          email: email.trim(),
        });
      } else {
        setGeneralError(
          result.error ||
            (lang === 'bn' ? 'নিবন্ধন সম্পন্ন করতে সমস্যা হয়েছে।' : 'Registration failed.')
        );
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setGeneralError(
        err?.message ||
          (lang === 'bn' ? 'নিবন্ধন সম্পন্ন করতে সমস্যা হয়েছে।' : 'Registration failed.')
      );
    }
  };

  // Text strings based on language
  const t = {
    signIn: lang === 'bn' ? 'সাইন ইন' : 'Sign In',
    signUp: lang === 'bn' ? 'সাইন আপ' : 'Sign Up',
    langLabel: lang === 'bn' ? 'English' : 'বাংলা',
    phonePlaceholder: lang === 'bn' ? 'আপনার ফোন নম্বর লিখুন' : 'Enter your phone number',
    nicknamePlaceholder: lang === 'bn' ? 'আপনার ডাকনাম লিখুন' : 'Enter your nickname',
    passwordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড তৈরি করুন' : 'Create password',
    confirmPasswordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm password',
    emailPlaceholder: lang === 'bn' ? 'আপনার ইমেল লিখুন' : 'Enter your email',
    sendBtn: lang === 'bn' ? 'সেন্ড' : 'Send',
    emailCodePlaceholder:
      lang === 'bn' ? 'ইমেল যাচাইকরণ কোড লিখুন' : 'Enter email verification code',
    registerBtn: lang === 'bn' ? 'নিবন্ধন করুন' : 'Register Now',
  };

  const isCodeCorrect = sentOtpCode && emailVerificationCode.trim() === sentOtpCode;

  return (
    <div
      id="registration-card"
      className="w-full max-w-[460px] mx-auto bg-[#11192e]/95 backdrop-blur-2xl rounded-[22px] sm:rounded-[26px] p-4 sm:p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6),0_0_30px_rgba(37,99,235,0.12)] border border-slate-700/60 transition-all duration-300"
    >
      {/* Top Bar: Tabs & Language Pill */}
      <div className="flex items-center justify-between pb-2 sm:pb-3 mb-1.5 sm:mb-2 border-b border-slate-700/60">
        {/* Left: Sign In / Sign Up Tabs */}
        <div className="flex items-center gap-5 sm:gap-7">
          <button
            type="button"
            id="tab-sign-in"
            onClick={onSwitchToLogin}
            className="relative pb-1 text-base sm:text-lg font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            {t.signIn}
          </button>

          <button
            type="button"
            id="tab-sign-up"
            className="relative pb-1 text-base sm:text-lg font-bold text-blue-500 transition-colors"
          >
            {t.signUp}
            {/* Active vibrant blue underline bar */}
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
          </button>
        </div>

        {/* Right: Language Pill */}
        <button
          type="button"
          id="lang-toggle-btn"
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/80 transition-all shadow-sm active:scale-95"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span>{t.langLabel}</span>
        </button>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5 pt-0.5" noValidate>
        {generalError && (
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* 1. Phone Input Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[44px] sm:min-h-[48px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.phone
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            {/* Country code prefix with phone icon */}
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

              {/* Country Code Dropdown */}
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

            {/* Subtle vertical divider */}
            <div className="h-6 w-px bg-slate-700/70 mr-3 shrink-0" />

            {/* Phone input */}
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

        {/* 2. Nickname / Username Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.username
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <User className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
              }}
              placeholder={t.nicknamePlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>
          {errors.username && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.username}
            </p>
          )}
        </div>

        {/* 3. Create Password Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border transition-all duration-200 ${
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

        {/* 4. Confirm Password Room */}
        <div>
          <div
            className={`relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.confirmPassword
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <Shield className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              id="confirm-password-input"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              placeholder={t.confirmPasswordPlaceholder}
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-medium focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-slate-400 hover:text-slate-200 p-1 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* 5. Email Room with "সেন্ড" (Send) button */}
        <div>
          <div
            className={`relative flex items-center justify-between min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.email
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <div className="flex items-center flex-1 mr-2">
              <Mail className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder={t.emailPlaceholder}
                className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-medium focus:outline-none"
              />
            </div>

            {/* "সেন্ড" (Send) button */}
            <button
              id="send-email-otp-btn"
              type="button"
              onClick={handleSendEmailCode}
              disabled={sendCooldown > 0}
              className={`shrink-0 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                sendCooldown > 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sendCooldown > 0 ? `${sendCooldown}s` : t.sendBtn}
              </span>
            </button>
          </div>
          {errors.email && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
            </p>
          )}

          {/* Email OTP sent banner with quick tap-to-fill */}
          {codeNotification && (
            <div className="mt-2 p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-slate-300 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {lang === 'bn' ? 'ইমেলে কোড পাঠানো হয়েছে:' : 'Verification code sent:'}{' '}
                  <strong className="font-mono text-sm text-blue-400 font-bold tracking-wider">
                    {codeNotification.code}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleAutoFillCode}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/30 text-blue-300 font-semibold flex items-center gap-1 text-[11px] shadow-xs active:scale-95 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{lang === 'bn' ? 'বসানো হয়েছে' : 'Pasted'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'কোড বসান' : 'Paste'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 6. Email Verification Code Room */}
        <div>
          <div
            className={`relative flex items-center justify-between min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border transition-all duration-200 ${
              errors.verificationCode
                ? 'border-rose-500 bg-rose-950/20'
                : isCodeCorrect
                ? 'border-emerald-500 bg-emerald-950/15'
                : 'border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20'
            }`}
          >
            <div className="flex items-center flex-1 mr-2">
              <KeyRound className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
              <input
                id="email-verification-code-input"
                type="text"
                maxLength={6}
                value={emailVerificationCode}
                onChange={(e) => {
                  setEmailVerificationCode(e.target.value.trim());
                  if (errors.verificationCode) {
                    setErrors((prev) => ({ ...prev, verificationCode: undefined }));
                  }
                }}
                placeholder={t.emailCodePlaceholder}
                className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-medium tracking-wider focus:outline-none"
              />
            </div>

            {isCodeCorrect && (
              <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? 'সঠিক' : 'Verified'}</span>
              </span>
            )}
          </div>
          {errors.verificationCode && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.verificationCode}
            </p>
          )}
        </div>

        {/* 7. Referral Code Room */}
        <div>
          <div className="relative flex items-center min-h-[48px] sm:min-h-[54px] px-3.5 sm:px-4 rounded-xl sm:rounded-2xl bg-[#152037] border border-slate-700/70 hover:border-slate-600 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
            <UserPlus className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
            <input
              id="referral-code-input"
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Referral Code"
              className="w-full h-full bg-transparent text-sm sm:text-base text-white placeholder-slate-400 font-semibold tracking-wider focus:outline-none"
            />
          </div>
        </div>

        {/* Big Bright Blue Submit Button: "নিবন্ধন করুন" */}
        <div className="pt-1 sm:pt-1.5">
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] sm:min-h-[52px] flex items-center justify-center rounded-xl sm:rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white text-base sm:text-lg font-bold shadow-lg shadow-blue-600/30 transition-all duration-200 cursor-pointer disabled:opacity-75"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{lang === 'bn' ? 'অপেক্ষা করুন...' : 'Processing...'}</span>
              </div>
            ) : (
              <span>{t.registerBtn}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
