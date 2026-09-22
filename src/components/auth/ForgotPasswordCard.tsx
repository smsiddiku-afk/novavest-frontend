import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Language } from '../../types';

interface ForgotPasswordCardProps {
  currentLang?: Language;
  onBack?: () => void;
  showToast?: (msg: string) => void;
}

export const ForgotPasswordCard: React.FC<ForgotPasswordCardProps> = ({
  currentLang = 'en',
  onBack,
  showToast,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      if (showToast) showToast(currentLang === 'bn' ? 'অনুগ্রহ করে আপনার ইমেল দিন' : 'Please enter your email');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      if (showToast) showToast(currentLang === 'bn' ? 'রিসেট লিংক পাঠানো হয়েছে' : 'Password reset link sent');
    }, 1000);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto p-4 sm:p-6 font-sans text-white">
      <div className="flex items-center mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-[#042018] border border-emerald-500/30 flex items-center justify-center text-emerald-300 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black ml-4">
          {currentLang === 'bn' ? 'পাসওয়ার্ড পুনরুদ্ধার' : 'Reset Password'}
        </h1>
      </div>

      <div className="bg-[#062c22] border border-emerald-500/30 rounded-3xl p-6 shadow-xl space-y-5">
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-emerald-200/80">
              {currentLang === 'bn'
                ? 'আপনার অ্যাকাউন্ট রেজিস্টার্ড ইমেল ঠিকানাটি লিখুন, আমরা পাসওয়ার্ড রিসেট লিংক পাঠিয়ে দেব।'
                : 'Enter your account registered email address and we will send you a reset link.'}
            </p>
            <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-4 py-3">
              <Mail className="w-5 h-5 text-emerald-400 mr-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-transparent text-white text-sm font-bold focus:outline-none placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-lg transition-all"
            >
              {isLoading ? (currentLang === 'bn' ? 'অপেক্ষা করুন...' : 'Processing...') : (currentLang === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link')}
            </button>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">
              {currentLang === 'bn' ? 'লিংক পাঠানো হয়েছে!' : 'Link Sent!'}
            </h3>
            <p className="text-sm text-emerald-200/80">
              {currentLang === 'bn' ? 'আপনার ইমেল ইনবক্স চেক করুন।' : 'Please check your email inbox.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
