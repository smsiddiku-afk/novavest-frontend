import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Shield,
  UserPlus,
  Mail,
  Send,
  KeyRound,
  Globe,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { LegalDocType, RegisterFormData, Language } from '../types';
import { registerWithFirebase } from '../utils/authService';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  registerUserInReferralNetwork,
  generateUniqueReferralCode,
  extractPendingReferralCode,
  clearPendingReferralCode,
} from '../utils/referralService';

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
  referralCode?: string;
}

export const RegistrationCard: React.FC<RegistrationCardProps> = ({
  onSwitchToLogin,
  onRegistrationSuccess,
  currentLang = 'bn',
  onToggleLang,
}) => {
  const [lang, setLang] = useState<Language>(currentLang);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [referralCode, setReferralCode] = useState(() => {
    return extractPendingReferralCode() || '';
  });

  useEffect(() => {
    const pending = extractPendingReferralCode();
    if (pending) {
      setReferralCode((prev) => prev || pending);
    }
  }, []);

  // OTP State
  const [sentOtpCode, setSentOtpCode] = useState<string | null>(null);
  const [sendCooldown, setSendCooldown] = useState(0);
  const [codeNotification, setCodeNotification] = useState<{ code: string; email: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Form State
  const [errors, setErrors] = useState<FormErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setEmailVerificationCode(generatedCode);
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

    if (!referralCode || !referralCode.trim()) {
      newErrors.referralCode =
        lang === 'bn'
          ? 'রেফার কোড দেওয়া বাধ্যতামূলক। রেফার কোড ছাড়া একাউন্ট তৈরি করা যাবে না।'
          : 'Referral code is mandatory. You cannot register without a referral code.';
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
      const inviterCode = (referralCode || extractPendingReferralCode() || '').trim().toUpperCase();

      if (!inviterCode) {
        setIsSubmitting(false);
        setErrors((prev) => ({
          ...prev,
          referralCode:
            lang === 'bn'
              ? 'রেফার কোড দেওয়া বাধ্যতামূলক। রেফার কোড ছাড়া একাউন্ট তৈরি করা যাবে না।'
              : 'Referral code is mandatory. You cannot register without a referral code.',
        }));
        setGeneralError(
          lang === 'bn'
            ? 'রেফার কোড দেওয়া বাধ্যতামূলক। অনুগ্রহ করে একটি সঠিক রেফার কোড লিখুন।'
            : 'Referral code is required. Please provide a valid referral code.'
        );
        return;
      }

      // Check manager permission for inviter if referral code is provided
      if (inviterCode) {
        try {
          const usersQuery = query(collection(db, 'users'), where('referralCode', '==', inviterCode));
          const inviterSnap = await getDocs(usersQuery);
          if (!inviterSnap.empty) {
            const inviterData = inviterSnap.docs[0].data();
            if (!inviterData.canRefer) {
              const permErr = lang === 'bn'
                ? 'এই রেফারেল কোডটির ব্যবহারের অনুমতি নেই। দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।'
                : 'This referral code requires manager permission. Please contact manager representative.';
              setGeneralError(permErr);
              setIsSubmitting(false);
              return;
            }

            if (inviterData.referralLimit !== undefined && Number(inviterData.referralLimit) > 0) {
              const qCount = query(collection(db, 'users'), where('referredBy', '==', inviterCode));
              const cSnap = await getDocs(qCount);
              if (cSnap.size >= Number(inviterData.referralLimit)) {
                const limitErr = lang === 'bn'
                  ? 'এই রেফারেল কোডের সর্বোচ্চ রেফার সীমা পূর্ণ হয়েছে। দয়া করে ব্যবস্থাপক প্রতিনিধির সঙ্গে যোগাযোগ করুন।'
                  : 'Referral limit reached for this code. Please contact manager representative.';
                setGeneralError(limitErr);
                setIsSubmitting(false);
                return;
              }
            }
          }
        } catch (vErr: any) {
          console.warn('[RegistrationCard] Inviter check warning:', vErr);
        }
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      const result = await registerWithFirebase(
        {
          email: cleanEmail,
          phone: '',
          username: username.trim(),
          password: cleanPassword,
          referralCode: inviterCode,
        },
        lang
      );

      setIsSubmitting(false);
      if (result.success && result.user) {
        clearPendingReferralCode();

        onRegistrationSuccess({
          phone: '',
          username: username.trim(),
          password: cleanPassword,
          confirmPassword: cleanPassword,
          referralCode: inviterCode || result.user.referredBy || '',
          email: cleanEmail,
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
    signUp: lang === 'bn' ? 'ইমেইল সাইন আপ' : 'Register with Mail',
    langLabel: lang === 'bn' ? 'English' : 'বাংলা',
    emailLabel: lang === 'bn' ? 'ইমেইল (মেইন)' : 'Email (Main)',
    emailPlaceholder: lang === 'bn' ? 'ইমেইল' : 'Email',
    sendBtn: lang === 'bn' ? 'সেন্ড' : 'Send',
    emailCodePlaceholder: lang === 'bn' ? 'যাচাইকরণ কোড' : 'Verification code',
    nicknamePlaceholder: lang === 'bn' ? 'ডাকনাম' : 'Nickname',
    passwordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড' : 'Password',
    confirmPasswordPlaceholder: lang === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm password',
    referralPlaceholder: lang === 'bn' ? 'আমন্ত্রণ / রেফার কোড' : 'Referral code',
    registerBtn: lang === 'bn' ? 'ইমেইল দিয়ে নিবন্ধন করুন' : 'Register with Email',
  };

  const isCodeCorrect = sentOtpCode && emailVerificationCode.trim() === sentOtpCode;

  return (
    <div
      id="registration-card"
      className="w-full max-w-[460px] mx-auto bg-[#08362b]/95 backdrop-blur-2xl rounded-[22px] sm:rounded-[26px] p-4 sm:p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6),0_0_30px_rgba(16,185,129,0.12)] border border-emerald-500/25 transition-all duration-300"
    >
      {/* Top Bar: Tabs & Language Pill */}
      <div className="flex items-center justify-between pb-2 sm:pb-3 mb-2 border-b border-emerald-500/20">
        {/* Left: Sign In / Sign Up Tabs */}
        <div className="flex items-center gap-5 sm:gap-7">
          <button
            type="button"
            id="tab-sign-in"
            onClick={onSwitchToLogin}
            className="relative pb-1 text-base sm:text-lg font-medium text-emerald-100/60 hover:text-emerald-200 transition-colors cursor-pointer py-1 select-none"
          >
            {t.signIn}
          </button>

          <button
            type="button"
            id="tab-sign-up"
            className="relative pb-1 text-base sm:text-lg font-bold text-emerald-400 transition-colors"
          >
            {t.signUp}
            <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          </button>
        </div>

        {/* Right: Language Pill */}
        <button
          type="button"
          id="lang-toggle-btn"
          onClick={handleLangToggle}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.langLabel}</span>
        </button>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5 pt-1" noValidate>
        {generalError && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        {/* 1. EMAIL ROOM (MAIN) - হাল্কা ও পরিচ্ছন্ন, কোনো উদাহরণ নেই */}
        <div>
          <div
            className={`relative flex items-center justify-between min-h-[46px] sm:min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.email
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <div className="flex items-center flex-1 mr-2">
              <Mail className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder={t.emailPlaceholder}
                className="w-full h-full bg-transparent text-[15px] sm:text-base text-white placeholder:text-emerald-100/50 font-normal focus:outline-none"
              />
            </div>

            {/* "সেন্ড" (Send) button */}
            <button
              id="send-email-otp-btn"
              type="button"
              onClick={handleSendEmailCode}
              disabled={sendCooldown > 0}
              className={`shrink-0 px-3.5 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer min-h-[34px] ${
                sendCooldown > 0
                  ? 'bg-white/[0.05] text-emerald-400/50 cursor-not-allowed border border-emerald-500/20'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sendCooldown > 0 ? `${sendCooldown}s` : t.sendBtn}
              </span>
            </button>
          </div>
          {errors.email && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.email}
            </p>
          )}

          {/* Email OTP sent banner with quick tap-to-fill */}
          {codeNotification && (
            <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {lang === 'bn' ? 'ইমেলে কোড পাঠানো হয়েছে:' : 'Verification code sent:'}{' '}
                  <strong className="font-mono text-sm text-emerald-300 font-bold tracking-wider">
                    {codeNotification.code}
                  </strong>
                </span>
              </div>

              <button
                type="button"
                onClick={handleAutoFillCode}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-200 font-semibold flex items-center gap-1 text-xs shadow-xs active:scale-95 cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'bn' ? 'বসানো হয়েছে' : 'Pasted'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'bn' ? 'কোড বসান' : 'Paste'}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 2. EMAIL VERIFICATION CODE ROOM - হাল্কা ও পরিচ্ছন্ন */}
        <div>
          <div
            className={`relative flex items-center justify-between min-h-[46px] sm:min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.verificationCode
                ? 'border-rose-500 bg-rose-950/20'
                : isCodeCorrect
                ? 'border-emerald-500 bg-emerald-950/40'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <div className="flex items-center flex-1 mr-2">
              <KeyRound className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
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
                className="w-full h-full bg-transparent text-[15px] sm:text-base text-white placeholder:text-emerald-100/50 font-medium tracking-wider focus:outline-none"
              />
            </div>

            {isCodeCorrect && (
              <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{lang === 'bn' ? 'সঠিক' : 'Verified'}</span>
              </span>
            )}
          </div>
          {errors.verificationCode && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.verificationCode}
            </p>
          )}
        </div>

        {/* 3. NICKNAME / USERNAME ROOM - হাল্কা ও পরিচ্ছন্ন */}
        <div>
          <div
            className={`relative flex items-center min-h-[46px] sm:min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.username
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <User className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
            <input
              id="username-input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
              }}
              placeholder={t.nicknamePlaceholder}
              className="w-full h-full bg-transparent text-[15px] sm:text-base text-white placeholder:text-emerald-100/50 font-normal focus:outline-none"
            />
          </div>
          {errors.username && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.username}
            </p>
          )}
        </div>

        {/* 4. CREATE PASSWORD ROOM - হাল্কা ও পরিচ্ছন্ন */}
        <div>
          <div
            className={`relative flex items-center min-h-[46px] sm:min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.password
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <Lock className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
            <input
              id="password-input"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder={t.passwordPlaceholder}
              className="w-full h-full bg-transparent text-[15px] sm:text-base text-white placeholder:text-emerald-100/50 font-normal focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-emerald-400/80 hover:text-emerald-300 p-1.5 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.password}
            </p>
          )}
        </div>

        {/* 5. CONFIRM PASSWORD ROOM - হাল্কা ও পরিচ্ছন্ন */}
        <div>
          <div
            className={`relative flex items-center min-h-[46px] sm:min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.confirmPassword
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <Shield className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
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
              className="w-full h-full bg-transparent text-[15px] sm:text-base text-white placeholder:text-emerald-100/50 font-normal focus:outline-none pr-8"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-emerald-400/80 hover:text-emerald-300 p-1.5 transition-colors cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" /> {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* 6. REFERRAL CODE ROOM (MANDATORY) - হাল্কা ও পরিচ্ছন্ন */}
        <div>
          <div className="flex items-center justify-between mb-1 px-1">
            <label className="text-xs font-bold text-emerald-300">
              {lang === 'bn' ? 'রেফারেল / আমন্ত্রণ কোড' : 'Referral Code'} <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-rose-300 font-semibold px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-500/30">
              {lang === 'bn' ? 'বাধ্যতামূলক' : 'Required'}
            </span>
          </div>

          <div
            className={`relative flex items-center min-h-[46px] sm:min-h-[48px] px-3.5 sm:px-4 py-1.5 rounded-xl sm:rounded-2xl bg-white/[0.10] hover:bg-white/[0.14] focus-within:bg-white/[0.18] border transition-all duration-200 ${
              errors.referralCode
                ? 'border-rose-500 bg-rose-950/20'
                : 'border-white/15 hover:border-emerald-400/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/25'
            }`}
          >
            <UserPlus className="w-5 h-5 text-emerald-400 mr-3.5 shrink-0" />
            <input
              id="referral-code-input"
              type="text"
              required
              value={referralCode}
              onChange={(e) => {
                setReferralCode(e.target.value.toUpperCase());
                if (errors.referralCode) setErrors((prev) => ({ ...prev, referralCode: undefined }));
              }}
              placeholder={t.referralPlaceholder}
              className="w-full h-full bg-transparent text-[15px] sm:text-base text-white placeholder:text-emerald-100/50 font-semibold tracking-wider focus:outline-none"
            />
            {referralCode && (
              <span className="shrink-0 text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {lang === 'bn' ? 'সংযুক্ত' : 'Linked'}
              </span>
            )}
          </div>
          {errors.referralCode && (
            <p className="text-xs text-rose-400 mt-1 px-2 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.referralCode}
            </p>
          )}
          {referralCode && !errors.referralCode && (
            <p className="text-[11px] text-emerald-400/80 mt-1 px-2 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {lang === 'bn'
                ? `আপনি ${referralCode} কোডের আমন্ত্রণে যুক্ত হচ্ছেন`
                : `Joining with inviter code: ${referralCode}`}
            </p>
          )}
        </div>

        {/* Glowing Emerald Action Button: "নিবন্ধন করুন" */}
        <div className="pt-1.5 sm:pt-2">
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[52px] sm:min-h-[56px] flex items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] text-slate-950 text-base sm:text-lg font-black shadow-lg shadow-emerald-500/30 transition-all duration-200 cursor-pointer disabled:opacity-75"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                <span>{lang === 'bn' ? 'অপেক্ষা করুন...' : 'Processing...'}</span>
              </div>
            ) : (
              <span>{t.registerBtn}</span>
            )}
          </button>
        </div>

        {/* Bottom Link: Already have an account? Sign in with Email */}
        <div className="text-center pt-2">
          <p className="text-xs sm:text-sm text-emerald-200/80 font-medium">
            {lang === 'bn' ? 'ইতিমধ্যে একটি অ্যাকাউন্ট আছে? ' : 'Already have an account? '}
            <button
              type="button"
              id="switch-to-login-btn-bottom"
              onClick={onSwitchToLogin}
              className="font-black text-emerald-400 hover:text-emerald-300 underline underline-offset-4 cursor-pointer transition-colors ml-1"
            >
              {lang === 'bn' ? 'ইমেইল দিয়ে লগইন করুন' : 'Sign In with Email'}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
