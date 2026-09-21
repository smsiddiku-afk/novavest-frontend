import React, { useState, useEffect } from 'react';
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
  Copy,
  CreditCard,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Language } from '../types';

export type PaymentMethodType = 'bKash' | 'Nagad' | 'Rocket';
export type PaymentChannelType = 'channel1' | 'channel2' | 'gogopay' | 'manual';

export interface ManualDepositDetails {
  trxId?: string;
  senderPhone?: string;
}

interface CleanWalletScreenProps {
  currentBalance: number;
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  initialTab?: 'recharge' | 'withdraw';
  onBack?: () => void;
  onOpenHistory?: () => void;
  onConfirmRecharge: (
    amount: number,
    method: PaymentMethodType,
    channel?: PaymentChannelType,
    manualDetails?: ManualDepositDetails
  ) => void | Promise<any>;
  onConfirmWithdraw?: (amount: number, method: PaymentMethodType, account: string) => void;
  showToast?: (msg: string) => void;
}

const RECHARGE_PRESETS = [100, 300, 500, 1000, 2000, 5000];
const WITHDRAW_PRESETS = [500, 1000, 2000, 5000, 10000];

export const CleanWalletScreen: React.FC<CleanWalletScreenProps> = ({
  currentBalance,
  currentLang = 'en',
  themeMode = 'night',
  initialTab = 'recharge',
  onBack,
  onOpenHistory,
  onConfirmRecharge,
  onConfirmWithdraw,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'recharge' | 'withdraw'>(initialTab);
  const [selectedChannel, setSelectedChannel] = useState<PaymentChannelType | null>('channel1');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('bKash');
  const [amount, setAmount] = useState<string>('100');
  const [withdrawAccount, setWithdrawAccount] = useState<string>('');
  const [localToast, setLocalToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  const displayToast = (msg: string) => {
    if (showToast) {
      showToast(msg);
    } else {
      setLocalToast(msg);
      setTimeout(() => setLocalToast(null), 3000);
    }
  };

  const handleRechargeSubmit = async () => {
    if (!selectedChannel) {
      displayToast(
        currentLang === 'bn'
          ? 'অনুগ্রহ করে প্রথমে একটি পেমেন্ট চ্যানেল নির্বাচন করুন'
          : 'Please select a payment channel first'
      );
      return;
    }

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
      setLoadingStep(1);
      
      await new Promise(r => setTimeout(r, 400));
      setLoadingStep(2);

      await Promise.resolve(
        onConfirmRecharge(num, selectedMethod, selectedChannel)
      );

      displayToast(
        currentLang === 'bn'
          ? 'পেমেন্ট গেটওয়েতে রিডাইরেক্ট করা হচ্ছে...'
          : 'Redirecting to payment gateway...'
      );
    } catch (err) {
      console.error(err);
      displayToast(
        currentLang === 'bn'
          ? 'পেমেন্ট সংযোগে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Payment connection error. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setLoadingStep(0);
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
      className={`w-full max-w-[540px] mx-auto min-h-screen flex flex-col p-4 sm:p-6 relative overflow-y-auto font-sans select-none transition-colors duration-200 ${
        themeMode === 'day' ? 'bg-[#f4f6fb] text-slate-800' : 'bg-[#06483A] text-white'
      }`}
    >
      {themeMode === 'night' && (
        <>
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/4 -right-20 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        </>
      )}

      {localToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-[#062c22]/95 border-2 border-emerald-500/60 text-emerald-300 text-sm font-bold shadow-2xl backdrop-blur-md animate-in fade-in">
          {localToast}
        </div>
      )}

      <div className="w-full relative z-10">
        <div className="flex items-center justify-between pt-2 pb-3">
          <button
            id="wallet-top-back-btn"
            type="button"
            onClick={onBack}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
              themeMode === 'day'
                ? 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                : 'bg-[#042018] border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <h1 className={`text-xl sm:text-2xl font-black tracking-wide ${
            themeMode === 'day' ? 'text-slate-900' : 'text-white'
          }`}>
            {currentLang === 'bn' ? (activeTab === 'recharge' ? 'রিচার্জ ওয়ালেট' : 'উইথড্র ওয়ালেট') : 'Wallet'}
          </h1>

          <div className="flex items-center gap-2">
            <button
              id="wallet-top-history-btn"
              type="button"
              onClick={onOpenHistory}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm ${
                themeMode === 'day'
                  ? 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm'
                  : 'bg-[#042018] border border-emerald-500/30 hover:border-emerald-400 text-emerald-300 hover:text-white'
              }`}
              title={currentLang === 'bn' ? 'লেনদেনের ইতিহাস' : 'Transaction History'}
            >
              <History className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <div className={`p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner my-2.5 ${
          themeMode === 'day'
            ? 'bg-slate-200/90 border border-slate-300'
            : 'bg-[#042018] border border-emerald-500/20'
        }`}>
          <button
            id="wallet-tab-recharge-btn"
            type="button"
            onClick={() => {
              setActiveTab('recharge');
              setAmount('100');
            }}
            className={`flex-1 py-3 sm:py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'recharge'
                ? themeMode === 'day'
                  ? 'bg-emerald-600 text-white shadow-md font-black scale-[1.01]'
                  : 'bg-emerald-400 text-slate-950 shadow-[0_4px_16px_rgba(16,185,129,0.35)] font-black scale-[1.01]'
                : themeMode === 'day'
                ? 'text-slate-600 hover:text-slate-900 font-bold'
                : 'text-emerald-200/70 hover:text-white font-semibold'
            }`}
          >
            <ArrowDownToLine className="w-5 h-5 stroke-[2.5]" />
            <span>{currentLang === 'bn' ? 'রিচার্জ (Deposit)' : 'Recharge'}</span>
          </button>
          <button
            id="wallet-tab-withdraw-btn"
            type="button"
            onClick={() => {
              setActiveTab('withdraw');
              setAmount('500');
            }}
            className={`flex-1 py-3 sm:py-3.5 rounded-xl font-black text-sm sm:text-base tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'withdraw'
                ? themeMode === 'day'
                  ? 'bg-emerald-600 text-white shadow-md font-black scale-[1.01]'
                  : 'bg-emerald-400 text-slate-950 shadow-[0_4px_16px_rgba(16,185,129,0.35)] font-black scale-[1.01]'
                : themeMode === 'day'
                ? 'text-slate-600 hover:text-slate-900 font-bold'
                : 'text-emerald-200/70 hover:text-white font-semibold'
            }`}
          >
            <ArrowUpFromLine className="w-5 h-5 stroke-[2.5]" />
            <span>{currentLang === 'bn' ? 'উইথড্র (Withdraw)' : 'Withdraw'}</span>
          </button>
        </div>
      </div>

      <div className="w-full space-y-4 sm:space-y-5 relative z-10 flex-1 pt-1.5">
        {activeTab === 'recharge' ? (
          <>
            <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-slate-100 text-sm sm:text-base font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'রিচার্জের পরিমাণ (টাকা)' : 'Recharge Amount (BDT)'}</span>
                </span>
                <span className="px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                  {currentLang === 'bn' ? 'মিনিমাম ১০০৳' : 'Min ৳100'}
                </span>
              </div>

              <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-5 py-4 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/25 transition-all">
                <span className="text-emerald-400 text-2xl sm:text-3xl font-black mr-3 select-none font-mono">
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
                  className="w-full bg-transparent text-white font-mono text-2xl sm:text-3xl font-black placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                {RECHARGE_PRESETS.map((preset) => {
                  const isSelected = Number(amount) === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`py-2.5 sm:py-3 px-2 rounded-2xl text-sm sm:text-base font-mono font-black transition-all cursor-pointer relative flex items-center justify-center ${
                        isSelected
                          ? 'bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 scale-[1.03]'
                          : 'bg-[#042018] hover:bg-[#072c21] text-emerald-100 border border-emerald-500/25 hover:border-emerald-500/40'
                      }`}
                    >
                      {preset === 100 && (
                        <span className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black tracking-tight uppercase leading-none shadow-sm">
                          Min
                        </span>
                      )}
                      ৳{preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-100 text-sm sm:text-base font-extrabold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>{currentLang === 'bn' ? '১. পেমেন্ট চ্যানেল নির্বাচন করুন' : '1. Select Payment Channel'}</span>
                </span>
                <span className="text-xs sm:text-sm text-emerald-400 font-mono font-bold">
                  {selectedChannel === 'channel1' && 'NEKpay Auto'}
                  {selectedChannel === 'channel2' && 'WatchPay'}
                  {!selectedChannel && (currentLang === 'bn' ? 'চ্যানেল সিলেক্ট করুন' : 'Select channel')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  id="payment-channel-1-nekpay"
                  onClick={() => setSelectedChannel('channel1')}
                  className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 border-2 group ${
                    selectedChannel === 'channel1'
                      ? 'bg-gradient-to-br from-[#063b2f] to-[#042018] border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)] text-white scale-[1.01]'
                      : 'bg-[#042018] border-emerald-500/25 text-slate-300 hover:border-emerald-500/40 hover:bg-[#062c22]'
                  }`}
                >
                  {selectedChannel === 'channel1' && (
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
                  )}

                  <div className="flex items-center gap-3.5">
                    <div
                      className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        selectedChannel === 'channel1'
                          ? 'bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                          : 'bg-[#031812] border border-emerald-500/20 group-hover:border-emerald-500/40'
                      }`}
                    >
                      {selectedChannel === 'channel1' && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      )}
                      <Zap
                        className={`w-6 h-6 transition-transform duration-300 ${
                          selectedChannel === 'channel1'
                            ? 'text-amber-300 fill-amber-300/60 scale-110 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)] animate-pulse'
                            : 'text-emerald-400 group-hover:scale-110'
                        }`}
                      />
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm sm:text-base font-black text-white block leading-tight">চ্যানেল ১</span>
                      </div>
                      <span className="text-xs sm:text-sm text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        NEKpay Auto (সুপারফাস্ট)
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                      selectedChannel === 'channel1'
                        ? 'border-emerald-400 bg-emerald-400 scale-110'
                        : 'border-slate-700 bg-slate-900/50'
                    }`}
                  >
                    {selectedChannel === 'channel1' ? (
                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                </div>

                <div
                  id="payment-channel-2-watchpay"
                  onClick={() => setSelectedChannel('channel2')}
                  className={`relative overflow-hidden p-4 sm:p-5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-300 border-2 group ${
                    selectedChannel === 'channel2'
                      ? 'bg-gradient-to-br from-[#063b2f] to-[#042018] border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)] text-white scale-[1.01]'
                      : 'bg-[#042018] border-emerald-500/25 text-slate-300 hover:border-emerald-500/40 hover:bg-[#062c22]'
                  }`}
                >
                  {selectedChannel === 'channel2' && (
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />
                  )}

                  <div className="flex items-center gap-3.5">
                    <div
                      className={`relative w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                        selectedChannel === 'channel2'
                          ? 'bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.4)]'
                          : 'bg-[#031812] border border-emerald-500/20 group-hover:border-emerald-500/40'
                      }`}
                    >
                      {selectedChannel === 'channel2' && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                      )}
                      <ShieldCheck
                        className={`w-6 h-6 transition-transform duration-300 ${
                          selectedChannel === 'channel2'
                            ? 'text-emerald-300 scale-110 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse'
                            : 'text-emerald-400 group-hover:scale-110'
                        }`}
                      />
                    </div>

                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm sm:text-base font-black text-white block leading-tight">চ্যানেল ২</span>
                      </div>
                      <span className="text-xs sm:text-sm text-emerald-300 font-bold flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        WatchPay (অটো গেটওয়ে)
                      </span>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
                      selectedChannel === 'channel2'
                        ? 'border-emerald-400 bg-emerald-400 scale-110'
                        : 'border-slate-700 bg-slate-900/50'
                    }`}
                  >
                    {selectedChannel === 'channel2' ? (
                      <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {selectedChannel ? (
              <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-100 text-sm sm:text-base font-extrabold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>{currentLang === 'bn' ? '২. পেমেন্ট মেথড নির্বাচন করুন' : '2. Select Payment Method'}</span>
                  </span>
                  <span className="text-xs sm:text-sm text-emerald-400 font-mono font-bold">
                    {selectedChannel === 'channel1' && 'চ্যানেল ১ সক্রিয়'}
                    {selectedChannel === 'channel2' && 'চ্যানেল ২ সক্রিয়'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  <div
                    id="payment-method-bkash"
                    onClick={() => setSelectedMethod('bKash')}
                    className={`rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer transition-all border-2 min-h-[110px] ${
                      selectedMethod === 'bKash'
                        ? 'bg-[#062c22] border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.3)] scale-[1.02]'
                        : 'bg-[#042018] border-emerald-500/25 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e2136e] flex items-center justify-center shadow-md shadow-[#e2136e]/30 shrink-0">
                        <svg viewBox="0 0 100 100" className="w-5 h-5 sm:w-6 sm:h-6" fill="none">
                          <path d="M54 12L85 30L63 46L54 12Z" fill="white" />
                          <path d="M54 12L20 54L48 50L54 12Z" fill="white" fillOpacity="0.95" />
                          <path d="M48 50L18 80L48 64L63 46L48 50Z" fill="white" fillOpacity="0.9" />
                          <path d="M48 64L42 90L58 72L48 64Z" fill="white" />
                          <path d="M58 72L78 68L63 46L58 72Z" fill="white" fillOpacity="0.95" />
                        </svg>
                      </div>
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedMethod === 'bKash' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                        }`}
                      >
                        {selectedMethod === 'bKash' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-white font-black text-sm sm:text-base block leading-tight">bKash</span>
                      <span className="text-xs text-emerald-400 font-bold mt-1 block">বিকাশ পে</span>
                    </div>
                  </div>

                  <div
                    id="payment-method-nagad"
                    onClick={() => setSelectedMethod('Nagad')}
                    className={`rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer transition-all border-2 min-h-[110px] ${
                      selectedMethod === 'Nagad'
                        ? 'bg-[#062c22] border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.3)] scale-[1.02]'
                        : 'bg-[#042018] border-emerald-500/25 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#ed1c24] via-[#f7941d] to-[#f9a01b] flex items-center justify-center shadow-md shadow-[#f7941d]/30 shrink-0 p-1">
                        <svg viewBox="0 0 100 100" className="w-5 h-5 sm:w-6 sm:h-6" fill="none">
                          <circle cx="58" cy="24" r="7.5" fill="white" />
                          <path
                            d="M30 42C34 32 46 28 56 34L50 46C44 42 38 44 36 50C33 57 37 64 44 67C50 69 57 66 61 58L72 64C66 78 50 84 38 78C23 72 18 56 30 42Z"
                            fill="white"
                          />
                        </svg>
                      </div>
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedMethod === 'Nagad' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                        }`}
                      >
                        {selectedMethod === 'Nagad' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-white font-black text-sm sm:text-base block leading-tight">Nagad</span>
                      <span className="text-xs text-orange-400 font-bold mt-1 block">নগদ পে</span>
                    </div>
                  </div>

                  <div
                    id="payment-method-rocket"
                    onClick={() => setSelectedMethod('Rocket')}
                    className={`rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between cursor-pointer transition-all border-2 min-h-[110px] ${
                      selectedMethod === 'Rocket'
                        ? 'bg-[#062c22] border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.3)] scale-[1.02]'
                        : 'bg-[#042018] border-emerald-500/25 hover:border-emerald-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#8c3494] flex items-center justify-center shadow-md shadow-[#8c3494]/30 shrink-0">
                        <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedMethod === 'Rocket' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'
                        }`}
                      >
                        {selectedMethod === 'Rocket' && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <span className="text-white font-black text-sm sm:text-base block leading-tight">Rocket</span>
                      <span className="text-xs text-purple-400 font-bold mt-1 block">রকেট পে</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#042018] border border-dashed border-emerald-500/30 text-center text-emerald-300/80 text-xs sm:text-sm flex items-center justify-center gap-2.5">
                <Layers className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  {currentLang === 'bn'
                    ? 'উপরে চ্যানেল ১ অথবা চ্যানেল ২ নির্বাচন করুন।'
                    : 'Select Channel 1 or Channel 2 above.'}
                </span>
              </div>
            )}

            <div className="pt-3 sm:pt-4 pb-2">
              <button
                id="wallet-confirm-recharge-btn"
                type="button"
                disabled={isSubmitting || !selectedChannel}
                onClick={handleRechargeSubmit}
                className={`w-full py-4.5 sm:py-5 rounded-2xl font-black text-base sm:text-xl tracking-wide transition-all cursor-pointer flex items-center justify-center gap-3 relative overflow-hidden ${
                  isSubmitting
                    ? 'bg-emerald-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)] cursor-wait'
                    : 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 shadow-[0_8px_32px_rgba(16,185,129,0.35)]'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-3 text-base sm:text-lg font-black text-slate-950">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="animate-pulse">
                      {currentLang === 'bn'
                        ? 'পেমেন্ট গেটওয়েতে সংযোগ হচ্ছে...'
                        : 'Connecting to Gateway...'}
                    </span>
                  </span>
                ) : !selectedChannel ? (
                  <>
                    <Layers className="w-6 h-6 stroke-[2.5]" />
                    <span>{currentLang === 'bn' ? 'প্রথমে চ্যানেল নির্বাচন করুন' : 'Select Channel First'}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-6 h-6 fill-current animate-pulse" />
                    <span>
                      {selectedChannel === 'channel2'
                        ? `WatchPay (${selectedMethod}) • ৳${amount || '100'}`
                        : currentLang === 'bn'
                        ? `রিচার্জ করুন (${selectedMethod}) • ৳${amount || '১০০'}`
                        : `Proceed to Pay (${selectedMethod}) • ৳${amount || '100'}`}
                    </span>
                  </>
                )}
              </button>

              {redirectUrl && (
                <div className="mt-3.5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center animate-fade-in">
                  <p className="text-sm text-emerald-400 mb-2 font-bold">
                    {currentLang === 'bn'
                      ? 'স্বয়ংক্রিয়ভাবে ওপেন না হলে নিচের বাটনে ট্যাপ করুন:'
                      : 'If the cashier did not open automatically, tap below:'}
                  </p>
                  <a
                    href={redirectUrl}
                    target="_top"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-xl shadow-lg transition-all"
                  >
                    <ExternalLink className="w-4 h-4 stroke-[2.5]" />
                    <span>{currentLang === 'bn' ? 'ক্যাশিয়ার পেজ খুলুন' : 'Open Payment Cashier'}</span>
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-[#042018] border border-emerald-500/25 p-4 sm:p-5 space-y-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <span className="text-white text-sm sm:text-base font-black block mb-1">
                {currentLang === 'bn' ? 'রিচার্জের নিয়মাবলী:' : 'Recharge Guidelines:'}
              </span>
              <p>• {currentLang === 'bn' ? 'সর্বনিম্ন রিচার্জ ১০০.০০ টাকা' : 'Minimum recharge amount is 100.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'সর্বোচ্চ রিচার্জ ৫০,০০০.০০ টাকা' : 'Maximum recharge amount is 50,000.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'কোনো অতিরিক্ত সার্ভিস চার্জ নেই (০% ফি)' : 'Zero transaction fee (0%)'}</p>
              <p>• {currentLang === 'bn' ? 'পেমেন্ট সম্পন্ন হলে স্বয়ংক্রিয়ভাবে অ্যাকাউন্টে যোগ হবে' : 'Automated instant wallet settlement'}</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="p-4 rounded-2xl bg-[#042018] border border-emerald-500/20 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">{currentLang === 'bn' ? 'বর্তমান ব্যালেন্স:' : 'Available Balance:'}</span>
                <span className="text-base sm:text-lg font-mono font-black text-emerald-400">
                  ৳{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="text-sm font-bold text-slate-200">
                  {selectedMethod} {currentLang === 'bn' ? 'ওয়ালেট একাউন্ট নম্বর:' : 'Account Number:'}
                </span>
                <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-5 py-3.5 focus-within:border-emerald-400 transition-all">
                  <input
                    id="wallet-withdraw-account-input"
                    type="text"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full bg-transparent text-white font-mono text-base font-bold placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-200">
                    {currentLang === 'bn' ? 'উইথড্র পরিমাণ:' : 'Withdraw Amount:'}
                  </span>
                  <span className="text-xs text-amber-400 font-mono font-bold">
                    {currentLang === 'bn' ? 'মিনিমাম ৫০০৳' : 'Min ৳500'}
                  </span>
                </div>
                <div className="relative flex items-center bg-[#031812] border-2 border-emerald-500/30 rounded-2xl px-5 py-3.5 focus-within:border-emerald-400 transition-all">
                  <span className="text-emerald-400 text-xl font-black mr-2 select-none font-mono">৳</span>
                  <input
                    id="wallet-withdraw-amount-input"
                    type="number"
                    min="500"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500"
                    className="w-full bg-transparent text-white font-mono text-xl font-black placeholder:text-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-1">
                {WITHDRAW_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(String(preset))}
                    className={`py-2.5 px-2 rounded-xl text-sm font-mono font-black transition-all cursor-pointer ${
                      Number(amount) === preset
                        ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-[#042018] hover:bg-[#072c21] text-emerald-100 border border-emerald-500/25'
                    }`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                id="wallet-confirm-withdraw-btn"
                type="button"
                onClick={handleWithdrawSubmit}
                className="w-full py-4.5 sm:py-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-base sm:text-lg tracking-wide shadow-[0_6px_28px_rgba(16,185,129,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2.5"
              >
                <ArrowUpFromLine className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {currentLang === 'bn'
                    ? `উইথড্র নিশ্চিত করুন • ৳${amount || '৫০০'}`
                    : `Confirm Withdrawal • ৳${amount || '500'}`}
                </span>
              </button>
            </div>

            <div className="rounded-2xl bg-[#042018] border border-emerald-500/25 p-4 sm:p-5 space-y-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <span className="text-white text-sm sm:text-base font-black block mb-1">
                {currentLang === 'bn' ? 'উইথড্রর নিয়মাবলী:' : 'Withdrawal Guidelines:'}
              </span>
              <p>• {currentLang === 'bn' ? 'সর্বনিম্ন উত্তোলন ৫০০.০০ টাকা' : 'Minimum withdrawal amount is 500.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'সর্বোচ্চ উত্তোলন ২৫,০০০.০০ টাকা' : 'Maximum withdrawal amount is 25,000.00 BDT'}</p>
              <p>• {currentLang === 'bn' ? 'প্রসেসিং সময়: ৫ থেকে ৩০ মিনিট' : 'Processing Time: 5 - 30 minutes'}</p>
            </div>
          </>
        )}
      </div>

      {isSubmitting && (
        <div
          id="deposit-gateway-loading-overlay"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md px-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-3xl bg-[#062c22] border-2 border-emerald-500/50 p-6 sm:p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative overflow-hidden space-y-5">
            <div className="absolute -top-16 -left-16 w-36 h-36 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-36 h-36 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />

            <div className="relative w-24 h-24 mx-auto flex items-center justify-center pt-2">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-400/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-emerald-500/40 animate-pulse" />
              <div className="w-20 h-20 rounded-full border-4 border-emerald-950 border-t-emerald-400 border-r-emerald-500 animate-spin" />
              <div className="absolute inset-0 m-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                <Zap className="w-6 h-6 text-slate-950 fill-slate-950 animate-bounce" />
              </div>
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-wide">
                {currentLang === 'bn' ? 'পেমেন্ট গেটওয়ে প্রস্তুত হচ্ছে...' : 'Connecting to Gateway...'}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-300 font-semibold mt-1">
                {selectedMethod} • ৳{amount || '100'} • {selectedChannel === 'channel2' ? 'WatchPay' : 'NEKpay'}
              </p>
            </div>

            <div className="space-y-2.5 bg-[#042018] border border-emerald-500/25 rounded-2xl p-3.5 text-left text-xs">
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <div className={`w-2.5 h-2.5 rounded-full ${loadingStep >= 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className={loadingStep >= 0 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                  {currentLang === 'bn' ? '১. নিরাপদ পেমেন্ট অর্ডার তৈরি' : '1. Generating Secure Payment Order'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <div className={`w-2.5 h-2.5 rounded-full ${loadingStep >= 1 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className={loadingStep >= 1 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                  {currentLang === 'bn' ? '২. সিকিউর ক্যাশিয়ার গেটওয়ে সংযোগ' : '2. Connecting Secure Cashier Gateway'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-200 font-medium">
                <div className={`w-2.5 h-2.5 rounded-full ${loadingStep >= 2 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
                <span className={loadingStep >= 2 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                  {currentLang === 'bn' ? '৩. ক্যাশিয়ার পেজে প্রবেশ করা হচ্ছে...' : '3. Redirecting to Payment Cashier...'}
                </span>
              </div>
            </div>

            <div className="w-full bg-[#042018] rounded-full h-2.5 overflow-hidden border border-emerald-500/30">
              <div
                className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(16,185,129,0.8)]"
                style={{
                  width: loadingStep === 0 ? '35%' : loadingStep === 1 ? '70%' : loadingStep === 2 ? '92%' : '100%',
                }}
              />
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {currentLang === 'bn'
                  ? '২৫৬-বিট এনক্রিপশনে সম্পূর্ণ সুরক্ষিত। অনুগ্রহ করে অপেক্ষা করুন...'
                  : 'Protected by 256-bit SSL encryption. Please wait...'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
