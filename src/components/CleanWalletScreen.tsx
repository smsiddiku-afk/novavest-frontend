import React, { useState } from 'react';
import {
  ArrowLeft,
  History,
  Check,
  Zap,
  ShieldCheck,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Sparkles,
} from 'lucide-react';
import { Language } from '../types';

export type PaymentMethodType = 'bKash' | 'Nagad';
export type PaymentChannelType = 'channel1' | 'channel2';

interface CleanWalletScreenProps {
  currentBalance: number;
  currentLang?: Language;
  initialTab?: 'recharge' | 'withdraw';
  onBack?: () => void;
  onOpenHistory?: () => void;
  onConfirmRecharge: (amount: number, method: PaymentMethodType, channel?: PaymentChannelType) => void;
  onConfirmWithdraw?: (amount: number, method: PaymentMethodType, account: string) => void;
  showToast?: (msg: string) => void;
}

const RECHARGE_PRESETS = [100, 300, 500, 1000, 2000, 5000];
const WITHDRAW_PRESETS = [500, 1000, 2000, 5000, 10000];

export const CleanWalletScreen: React.FC<CleanWalletScreenProps> = ({
  currentBalance,
  currentLang = 'en',
  initialTab = 'recharge',
  onBack,
  onOpenHistory,
  onConfirmRecharge,
  onConfirmWithdraw,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'recharge' | 'withdraw'>(initialTab);
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannelType>('channel1');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('bKash');
  const [amount, setAmount] = useState<string>('100');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('');
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const displayToast = (msg: string) => {
    if (showToast) {
      showToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3000);
    }
  };

  const handleRechargeSubmit = async () => {
    const num = Number(amount);
    if (!amount || isNaN(num) || num <= 0) {
      displayToast(currentLang === 'bn' ? 'অনুগ্রহ করে রিচার্জের পরিমাণ লিখুন' : 'Please enter recharge amount');
      return;
    }
    if (num < 100) {
      displayToast(currentLang === 'bn' ? 'সর্বনিম্ন রিচার্জের পরিমাণ ১০০.০০ টাকা' : 'Minimum recharge amount is 100.00 BDT');
      return;
    }
    if (num > 50000) {
      displayToast(currentLang === 'bn' ? 'সর্বোচ্চ রিচার্জের পরিমাণ ৫০,০০০.০০ টাকা' : 'Maximum recharge amount is 50,000.00 BDT');
      return;
    }
    try {
      setIsSubmitting(true);
      await Promise.resolve(onConfirmRecharge(num, selectedMethod, selectedChannel));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawSubmit = () => {
    const num = Number(amount);
    if (!withdrawAccount.trim()) {
      displayToast(
        currentLang === 'bn'
          ? `অনুগ্রহ করে আপনার ${selectedMethod} নম্বর লিখুন`
          : `Please enter your ${selectedMethod} wallet number`
      );
      return;
    }
    if (!amount || isNaN(num) || num <= 0) {
      displayToast(currentLang === 'bn' ? 'অনুগ্রহ করে উত্তোলনের পরিমাণ লিখুন' : 'Please enter withdrawal amount');
      return;
    }
    if (num < 500) {
      displayToast(currentLang === 'bn' ? 'সর্বনিম্ন উত্তোলনের পরিমাণ ৫০০.০০ টাকা' : 'Minimum withdrawal amount is 500.00 BDT');
      return;
    }
    if (num > currentBalance) {
      displayToast(currentLang === 'bn' ? 'অপর্যাপ্ত ব্যালেন্স' : 'Insufficient wallet balance');
      return;
    }
    if (onConfirmWithdraw) {
      onConfirmWithdraw(num, selectedMethod, withdrawAccount);
    } else {
      displayToast(
        currentLang === 'bn'
          ? `৳${num.toLocaleString()} উত্তোলনের অনুরোধ সফল হয়েছে`
          : `Withdrawal request of ৳${num.toLocaleString()} submitted`
      );
    }
  };

  return (
    <div
      id="clean-wallet-screen"
      className="w-full max-w-[440px] mx-auto min-h-screen bg-[#050c14] text-white flex flex-col p-4 sm:p-5 relative overflow-y-auto font-sans select-none"
    >
      {/* Background ambient teal glows */}
      <div className="absolute -top-16 -left-16 w-56 h-56 bg-[#18c4e6]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-64 h-64 bg-[#0a3548]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Local Toast Alert */}
      {localToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in">
          {localToast}
        </div>
      )}

      {/* TOP BAR */}
      <div className="w-full relative z-10">
        <div className="flex items-center justify-between pt-1 pb-2">
          {/* Back circular button */}
          <button
            id="wallet-top-back-btn"
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-[#0d1c28] border border-slate-800/80 hover:border-slate-700 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Centered Title */}
          <h1 className="text-lg font-bold text-white tracking-wide">
            {currentLang === 'bn' ? (activeTab === 'recharge' ? 'রিচার্জ ওয়ালেট' : 'উইথড্র ওয়ালেট') : 'Wallet'}
          </h1>

          {/* Action buttons: History */}
          <div className="flex items-center gap-2">
            <button
              id="wallet-top-history-btn"
              type="button"
              onClick={onOpenHistory}
              className="w-10 h-10 rounded-full bg-[#0d1c28] border border-slate-800/80 hover:border-slate-700 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-sm"
              title={currentLang === 'bn' ? 'লেনদেনের ইতিহাস' : 'Transaction History'}
            >
              <History className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Segmented Pill Tabs: Recharge | Withdraw */}
        <div className="p-1 rounded-2xl bg-[#091520] border border-slate-800/80 flex items-center gap-1 shadow-inner my-2">
          <button
            id="wallet-tab-recharge-btn"
            type="button"
            onClick={() => {
              setActiveTab('recharge');
              setAmount('100');
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'recharge'
                ? 'bg-[#18c4e6] text-[#051119] shadow-[0_2px_12px_rgba(24,196,230,0.35)] font-extrabold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
            <span>{currentLang === 'bn' ? 'রিচার্জ' : 'Recharge'}</span>
          </button>
          <button
            id="wallet-tab-withdraw-btn"
            type="button"
            onClick={() => {
              setActiveTab('withdraw');
              setAmount('500');
            }}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'withdraw'
                ? 'bg-[#18c4e6] text-[#051119] shadow-[0_2px_12px_rgba(24,196,230,0.35)] font-extrabold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            <ArrowUpFromLine className="w-4 h-4 stroke-[2.5]" />
            <span>{currentLang === 'bn' ? 'উইথড্র' : 'Withdraw'}</span>
          </button>
        </div>
      </div>

      {/* MAIN FORM SECTION */}
      <div className="w-full space-y-3.5 relative z-10 flex-1 pt-1">
        {activeTab === 'recharge' ? (
          <>
            {/* 1. AMOUNT INPUT & PRESET CHIPS (PROMINENT AT TOP) */}
            <div className="rounded-2xl bg-[#07141f] border border-slate-800/90 p-3.5 sm:p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 text-xs font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#18c4e6]" />
                  <span>{currentLang === 'bn' ? 'রিচার্জের পরিমাণ (টাকা)' : 'Recharge Amount (BDT)'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  {currentLang === 'bn' ? 'মিনিমাম ১০০৳' : 'Min ৳100'}
                </span>
              </div>

              {/* Amount Input Box */}
              <div className="relative flex items-center bg-[#050e17] border-2 border-slate-700/90 rounded-2xl px-4 py-3 focus-within:border-[#18c4e6] focus-within:ring-2 focus-within:ring-[#18c4e6]/30 transition-all">
                <span className="text-[#18c4e6] text-xl font-black mr-2 select-none font-mono">
                  ৳
                </span>
                <input
                  id="wallet-recharge-amount-input"
                  type="number"
                  min="100"
                  max="50000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={currentLang === 'bn' ? 'পরিমাণ লিখুন (মিনিমাম ১০০৳)' : 'Enter amount (min ৳100)'}
                  className="w-full bg-transparent text-white font-mono text-xl sm:text-2xl font-black placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              {/* Quick Preset Buttons (100, 300, 500, 1000, 2000, 5000) */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
                {RECHARGE_PRESETS.map((preset) => {
                  const isSelected = Number(amount) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`py-1.5 px-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-[#18c4e6] text-[#051119] shadow-md shadow-[#18c4e6]/30 scale-[1.02]'
                          : 'bg-[#0b1b2a] hover:bg-[#102438] text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      {preset === 100 && (
                        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black tracking-tighter uppercase leading-none">
                          Min
                        </span>
                      )}
                      ৳{preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. RECHARGE BUTTON - PLACED HIGH UP (NO SCROLLING REQUIRED) */}
            <div className="pt-0.5">
              <button
                id="wallet-confirm-recharge-btn"
                type="button"
                disabled={isSubmitting}
                onClick={handleRechargeSubmit}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-[#18c4e6] via-[#22d3ee] to-[#0ea5e9] hover:from-[#15b3d2] hover:to-[#0284c7] active:scale-[0.98] text-[#051119] font-bold text-base sm:text-lg tracking-wide shadow-[0_4px_24px_rgba(24,196,230,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    {currentLang === 'bn' ? 'পেমেন্ট গেটওয়েতে নেওয়া হচ্ছে...' : 'Connecting to Gateway...'}
                  </span>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    <span>
                      {currentLang === 'bn'
                        ? `রিচার্জ করুন • ৳${amount || '১০০'}`
                        : `Confirm Recharge • ৳${amount || '100'}`}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* 3. PAYMENT METHOD SELECTOR (COMPACT HORIZONTAL CARDS) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-slate-400 text-xs font-semibold block">
                {currentLang === 'bn' ? 'পেমেন্ট মেথড নির্বাচন' : 'Payment Method'}
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {/* bKash Card */}
                <div
                  id="payment-method-bkash"
                  onClick={() => setSelectedMethod('bKash')}
                  className={`rounded-xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all border-2 ${
                    selectedMethod === 'bKash'
                      ? 'bg-[#081e2e] border-[#18c4e6] shadow-[0_0_14px_rgba(24,196,230,0.25)]'
                      : 'bg-[#07141f] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#e2136e] flex items-center justify-center shadow-md shadow-[#e2136e]/20 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none">
                        <path d="M54 12L85 30L63 46L54 12Z" fill="white" />
                        <path d="M54 12L20 54L48 50L54 12Z" fill="white" fillOpacity="0.95" />
                        <path d="M48 50L18 80L48 64L63 46L48 50Z" fill="white" fillOpacity="0.9" />
                        <path d="M48 64L42 90L58 72L48 64Z" fill="white" />
                        <path d="M58 72L78 68L63 46L58 72Z" fill="white" fillOpacity="0.95" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm block leading-none">bKash</span>
                      <span className="text-[10px] text-emerald-400 font-medium">Auto Gateway</span>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedMethod === 'bKash' ? 'border-[#18c4e6] bg-[#18c4e6]' : 'border-slate-600'
                    }`}
                  >
                    {selectedMethod === 'bKash' && <Check className="w-2.5 h-2.5 text-[#051119] stroke-[3]" />}
                  </div>
                </div>

                {/* Nagad Card */}
                <div
                  id="payment-method-nagad"
                  onClick={() => setSelectedMethod('Nagad')}
                  className={`rounded-xl p-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-all border-2 ${
                    selectedMethod === 'Nagad'
                      ? 'bg-[#081e2e] border-[#18c4e6] shadow-[0_0_14px_rgba(24,196,230,0.25)]'
                      : 'bg-[#07141f] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#ed1c24] via-[#f7941d] to-[#f9a01b] flex items-center justify-center shadow-md shadow-[#f7941d]/20 shrink-0 p-1">
                      <svg viewBox="0 0 100 100" className="w-5 h-5" fill="none">
                        <circle cx="58" cy="24" r="7.5" fill="white" />
                        <path
                          d="M30 42C34 32 46 28 56 34L50 46C44 42 38 44 36 50C33 57 37 64 44 67C50 69 57 66 61 58L72 64C66 78 50 84 38 78C23 72 18 56 30 42Z"
                          fill="white"
                        />
                        <path d="M48 42L66 32L62 44L78 52L68 62L58 52L48 42Z" fill="white" fillOpacity="0.95" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm block leading-none">Nagad</span>
                      <span className="text-[10px] text-orange-400 font-medium">Instant Pay</span>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedMethod === 'Nagad' ? 'border-[#18c4e6] bg-[#18c4e6]' : 'border-slate-600'
                    }`}
                  >
                    {selectedMethod === 'Nagad' && <Check className="w-2.5 h-2.5 text-[#051119] stroke-[3]" />}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PAYMENT CHANNEL SELECTOR (SLEEK 2-COLUMN) */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-[#18c4e6]" />
                  <span>{currentLang === 'bn' ? 'পেমেন্ট চ্যানেল' : 'Payment Channel'}</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {selectedChannel === 'channel1' ? 'Channel 1 Active' : 'Channel 2 Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Channel 1 Card */}
                <div
                  id="payment-channel-1-nekpay"
                  onClick={() => setSelectedChannel('channel1')}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                    selectedChannel === 'channel1'
                      ? 'bg-[#082236] border-[#18c4e6] text-white'
                      : 'bg-[#07141f] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#18c4e6]" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block leading-tight">চ্যানেল ১</span>
                      <span className="text-[9px] text-emerald-400">Nekpay Auto</span>
                    </div>
                  </div>
                  {selectedChannel === 'channel1' && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[#18c4e6] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-[#051119] stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Channel 2 Card */}
                <div
                  id="payment-channel-2-okexpay"
                  onClick={() => setSelectedChannel('channel2')}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all border ${
                    selectedChannel === 'channel2'
                      ? 'bg-[#082236] border-[#18c4e6] text-white'
                      : 'bg-[#07141f] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#18c4e6]" />
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block leading-tight">চ্যানেল ২</span>
                      <span className="text-[9px] text-cyan-400">OKExPay / WPay</span>
                    </div>
                  </div>
                  {selectedChannel === 'channel2' && (
                    <div className="w-3.5 h-3.5 rounded-full bg-[#18c4e6] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-[#051119] stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. RECHARGE TIPS (AT BOTTOM) */}
            <div className="rounded-xl bg-[#06101a] border border-slate-800/80 p-3 space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <span className="text-white text-xs font-bold block mb-1">
                {currentLang === 'bn' ? 'রিচার্জের নিয়মাবলী:' : 'Recharge Guidelines:'}
              </span>
              <p>• {currentLang === 'bn' ? 'সর্বনিম্ন রিচার্জ ১০০.০০ টাকা' : 'Minimum recharge amount is 100.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'সর্বোচ্চ রিচার্জ ৫০,০০০.০০ টাকা' : 'Maximum recharge amount is 50,000.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'কোনো সার্ভিস ফি বা চার্জ নেই (০%)' : 'Zero transaction fee (0%)'}</p>
              <p>• {currentLang === 'bn' ? 'পেমেন্ট সম্পন্ন হলে স্বয়ংক্রিয়ভাবে ব্যালেন্সে যোগ হবে' : 'Automated instant wallet settlement'}</p>
            </div>
          </>
        ) : (
          /* WITHDRAW FORM */
          <>
            <div className="rounded-2xl bg-[#07141f] border border-slate-800/90 p-4 space-y-3.5 shadow-md">
              {/* Available Balance Strip */}
              <div className="p-3 rounded-xl bg-[#050e17] border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">{currentLang === 'bn' ? 'বর্তমান ব্যালেন্স:' : 'Available Balance:'}</span>
                <span className="text-sm font-mono font-black text-emerald-400">
                  ৳{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Account Input */}
              <div className="space-y-1">
                <span className="text-xs text-slate-300 font-medium">
                  {selectedMethod} {currentLang === 'bn' ? 'ওয়ালেট একাউন্ট নম্বর:' : 'Account Number:'}
                </span>
                <div className="relative flex items-center bg-[#050e17] border border-slate-700/80 rounded-xl px-4 py-3 focus-within:border-[#18c4e6] transition-all">
                  <input
                    id="wallet-withdraw-account-input"
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full bg-transparent text-white font-mono text-sm placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Withdraw Amount Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">
                    {currentLang === 'bn' ? 'উইথড্র পরিমাণ:' : 'Withdraw Amount:'}
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">
                    {currentLang === 'bn' ? 'মিনিমাম ৫০০৳' : 'Min ৳500'}
                  </span>
                </div>
                <div className="relative flex items-center bg-[#050e17] border border-slate-700/80 rounded-xl px-4 py-3 focus-within:border-[#18c4e6] transition-all">
                  <span className="text-[#18c4e6] text-lg font-bold mr-2 select-none font-mono">৳</span>
                  <input
                    id="wallet-withdraw-amount-input"
                    type="number"
                    min="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-transparent text-white font-mono text-lg font-bold placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Withdraw Presets */}
              <div className="grid grid-cols-5 gap-1.5 pt-0.5">
                {WITHDRAW_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`py-1.5 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      Number(amount) === preset
                        ? 'bg-[#18c4e6] text-[#051119]'
                        : 'bg-[#0b1b2a] hover:bg-[#102438] text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* WITHDRAW SUBMIT BUTTON (PLACED RIGHT UNDER FORM) */}
            <div className="pt-1">
              <button
                id="wallet-confirm-withdraw-btn"
                type="button"
                onClick={handleWithdrawSubmit}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#18c4e6] via-[#22d3ee] to-[#0ea5e9] hover:from-[#15b3d2] hover:to-[#0284c7] active:scale-[0.98] text-[#051119] font-bold text-base tracking-wide shadow-[0_4px_22px_rgba(24,196,230,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ArrowUpFromLine className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {currentLang === 'bn'
                    ? `উইথড্র নিশ্চিত করুন • ৳${amount || '৫০০'}`
                    : `Confirm Withdrawal • ৳${amount || '500'}`}
                </span>
              </button>
            </div>

            {/* Withdrawal Tips */}
            <div className="rounded-xl bg-[#06101a] border border-slate-800/80 p-3 space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <span className="text-white text-xs font-bold block mb-1">
                {currentLang === 'bn' ? 'উইথড্রর নিয়মাবলী:' : 'Withdrawal Guidelines:'}
              </span>
              <p>• {currentLang === 'bn' ? 'সর্বনিম্ন উত্তোলন ৫০০.০০ টাকা' : 'Minimum withdrawal amount is 500.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'সর্বোচ্চ উত্তোলন ২৫,০০০.০০ টাকা' : 'Maximum withdrawal amount is 25,000.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'প্রসেসিং সময়: ৫ থেকে ৩০ মিনিট' : 'Processing Time: 5 - 30 minutes'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
