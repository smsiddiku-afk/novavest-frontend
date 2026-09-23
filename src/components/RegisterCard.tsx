import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, Mail, Lock, Phone, ArrowLeft, AlertCircle } from 'lucide-react';
import { Language } from '../types';

interface RegisterCardProps {
  currentLang?: Language;
  onBack?: () => void;
  onSuccess?: () => void;
  showToast?: (msg: string) => void;
}

export const RegisterCard: React.FC<RegisterCardProps> = ({
  currentLang = 'en',
  onBack,
  onSuccess,
  showToast,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !email || !phone || !password) {
      const msg = currentLang === 'bn' ? 'সবগুলো ফিল্ড পূরণ করুন' : 'Please fill in all fields';
      setErrorMsg(msg);
      if (showToast) showToast(msg);
      return;
    }

    setIsLoading(true);
    try {
      // ফায়ারবেস অথ তৈরি
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // ইউনিক রেফারেল কোড জেনरेट
      const generatedRefCode = 'NVT' + Math.floor(100000 + Math.random() * 900000);

      // ফায়ারস্টোরে ইউজারের ডাটা সেভ
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        phone: phone,
        referralCode: generatedRefCode,
        referredBy: referralCode.trim() || '',
        walletBalance: 0,
        balance: 0,
        vipLevel: 0,
        createdAt: new Date().toISOString(),
      });

      if (showToast) {
        showToast(currentLang === 'bn' ? 'রেজিস্ট্রেশন সফল হয়েছে!' : 'Registration successful!');
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Registration error:', err);
      let errMsg = err.message || 'Registration failed';
      if (err.code === 'auth/email-already-in-use') {
        errMsg = currentLang === 'bn' ? 'এই ইমেলটি ইতিমধ্যে ব্যবহৃত হয়েছে' : 'Email already in use';
      } else if (err.code === 'auth/weak-password') {
        errMsg = currentLang === 'bn' ? 'পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে' : 'Password should be at least 6 characters';
      }
      setErrorMsg(errMsg);
      if (showToast) showToast(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto p-4 sm:p-6 font-sans text-white">
      <div className="flex items-center mb-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-[#042018] border border-emerald-500/30 flex items-center justify-center text-emerald-300 hover:text-white mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-black">
          {currentLang === 'bn' ? 'নতুন অ্যাকাউন্ট তৈরি করুন' : 'Create Account'}
        </h1>
      </div>

      <div className="bg-[#062c22] border border-emerald-500/30 rounded-3xl p-6 shadow-xl">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 mr-2 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-emerald-200/80 mb-1">
              {currentLang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}
            </label>
            <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-4 py-3">
              <User className="w-5 h-5 text-emerald-400 mr-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={currentLang === 'bn' ? 'আপনার নাম লিখুন' : 'Enter your name'}
                className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-200/80 mb-1">
              {currentLang === 'bn' ? 'ইমেল ঠিকানা' : 'Email Address'}
            </label>
            <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-4 py-3">
              <Mail className="w-5 h-5 text-emerald-400 mr-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-200/80 mb-1">
              {currentLang === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
            </label>
            <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-4 py-3">
              <Phone className="w-5 h-5 text-emerald-400 mr-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-200/80 mb-1">
              {currentLang === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
            </label>
            <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-4 py-3">
              <Lock className="w-5 h-5 text-emerald-400 mr-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-200/80 mb-1">
              {currentLang === 'bn' ? 'রেফারেল কোড (ঐচ্ছিক)' : 'Referral Code (Optional)'}
            </label>
            <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-4 py-3">
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="NVT123456"
                className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-lg transition-all mt-4 cursor-pointer"
          >
            {isLoading
              ? (currentLang === 'bn' ? 'অ্যাকাউন্ট তৈরি হচ্ছে...' : 'Creating Account...')
              : (currentLang === 'bn' ? 'রেজিস্ট্রার করুন' : 'Register')}
          </button>
        </form>
      </div>
    </div>
  );
};
