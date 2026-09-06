import React, { useState } from 'react';
import { ArrowLeft, History, Check, Zap, ShieldCheck, Layers } from 'lucide-react';
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
  const [amount, setAmount] = useState<string>('');
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
      displayToast('Please enter recharge amount');
      return;
    }
    if (num < 350) {
      displayToast('Minimum recharge amount is 350.00 BDT');
      return;
    }
    if (num > 50000) {
      displayToast('Maximum recharge amount is 50,000.00 BDT');
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
      displayToast(`Please enter your ${selectedMethod} wallet number`);
      return;
    }
    if (!amount || isNaN(num) || num <= 0) {
      displayToast('Please enter withdrawal amount');
      return;
    }
    if (num < 500) {
      displayToast('Minimum withdrawal amount is 500.00 BDT');
      return;
    }
    if (num > currentBalance) {
      displayToast('Insufficient wallet balance');
      return;
    }
    if (onConfirmWithdraw) {
      onConfirmWithdraw(num, selectedMethod, withdrawAccount);
    } else {
      displayToast(`Withdrawal request of ৳${num.toLocaleString()} submitted`);
    }
  };

  return (
    <div
      id="clean-wallet-screen"
      className="w-full max-w-[440px] mx-auto min-h-screen bg-[#050c14] text-white flex flex-col justify-between p-4 sm:p-5 relative overflow-hidden font-sans select-none"
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

      {/* TOP SECTION: Header & Controls */}
      <div className="w-full space-y-4 relative z-10">
        {/* 1. Top App Bar */}
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
            Wallet
          </h1>

          {/* Action buttons: History */}
          <div className="flex items-center gap-2">
            <button
              id="wallet-top-history-btn"
              type="button"
              onClick={onOpenHistory}
              className="w-10 h-10 rounded-full bg-[#0d1c28] border border-slate-800/80 hover:border-slate-700 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Transaction History"
            >
              <History className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* 2. Segmented Pill Tabs: Recharge | Withdraw */}
        <div className="p-1 rounded-2xl bg-[#091520] border border-slate-800/80 flex items-center gap-1 shadow-inner">
          <button
            id="wallet-tab-recharge-btn"
            type="button"
            onClick={() => setActiveTab('recharge')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer ${
              activeTab === 'recharge'
                ? 'bg-[#18c4e6] text-[#051119] shadow-[0_2px_12px_rgba(24,196,230,0.35)] font-extrabold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            Recharge
          </button>
          <button
            id="wallet-tab-withdraw-btn"
            type="button"
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-[#18c4e6] text-[#051119] shadow-[0_2px_12px_rgba(24,196,230,0.35)] font-extrabold'
                : 'text-slate-400 hover:text-white font-medium'
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* 3. Payment Channel Selector (Recharge Tab Only) */}
        {activeTab === 'recharge' && (
          <div className="pt-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#18c4e6]" />
                <span>{currentLang === 'bn' ? 'পেমেন্ট চ্যানেল নির্বাচন করুন' : 'Select Payment Channel'}</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {selectedChannel === 'channel1' ? 'Channel 1 Active' : 'Channel 2 Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Channel 1 Card: Nekpay */}
              <div
                id="payment-channel-1-nekpay"
                onClick={() => setSelectedChannel('channel1')}
                className={`relative rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 border-2 ${
                  selectedChannel === 'channel1'
                    ? 'bg-gradient-to-r from-[#071f30] via-[#08263a] to-[#0a293d] border-[#18c4e6] shadow-[0_0_20px_rgba(24,196,230,0.25)] ring-1 ring-[#18c4e6]/40'
                    : 'bg-[#07141f] border-slate-800/90 hover:border-slate-700 hover:bg-[#091824]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      selectedChannel === 'channel1'
                        ? 'bg-[#18c4e6]/20 text-[#18c4e6] border border-[#18c4e6]/50 shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    <Zap className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm tracking-wide">
                        চ্যানেল ১ (Nekpay)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        স্বয়ংক্রিয় (Auto)
                      </span>
                    </div>
                    <span className="text-slate-400 text-xs block mt-0.5">
                      bKash / Nagad Auto Gateway
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    selectedChannel === 'channel1'
                      ? 'border-[#18c4e6] bg-[#18c4e6]'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {selectedChannel === 'channel1' && (
                    <Check className="w-3.5 h-3.5 text-[#051119] stroke-[3]" />
                  )}
                </div>
              </div>

              {/* Channel 2 Card: OKExPay / WPay */}
              <div
                id="payment-channel-2-okexpay"
                onClick={() => setSelectedChannel('channel2')}
                className={`relative rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-all duration-200 border-2 ${
                  selectedChannel === 'channel2'
                    ? 'bg-gradient-to-r from-[#071f30] via-[#08263a] to-[#0a293d] border-[#18c4e6] shadow-[0_0_20px_rgba(24,196,230,0.25)] ring-1 ring-[#18c4e6]/40'
                    : 'bg-[#07141f] border-slate-800/90 hover:border-slate-700 hover:bg-[#091824]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      selectedChannel === 'channel2'
                        ? 'bg-[#18c4e6]/20 text-[#18c4e6] border border-[#18c4e6]/50 shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                    }`}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-bold text-sm tracking-wide">
                        চ্যানেল ২ (OKExPay / WPay)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/15 text-cyan-400 border border-cyan-500/35 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        Instant
                      </span>
                    </div>
                    <span className="text-slate-400 text-xs block mt-0.5">
                      Direct Auto Pay (Fast Checkout)
                    </span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    selectedChannel === 'channel2'
                      ? 'border-[#18c4e6] bg-[#18c4e6]'
                      : 'border-slate-600 bg-transparent'
                  }`}
                >
                  {selectedChannel === 'channel2' && (
                    <Check className="w-3.5 h-3.5 text-[#051119] stroke-[3]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Section Title: Payment Method */}
        <div className="pt-2">
          <span className="text-slate-400 text-sm font-medium">
            {currentLang === 'bn' ? 'পেমেন্ট মেথড নির্বাচন করুন' : 'Select Payment Method'}
          </span>
        </div>

        {/* 5. Payment Method Cards (Grid: bKash & Nagad) */}
        <div className="grid grid-cols-2 gap-3.5">
          {/* bKash Card */}
          <div
            id="payment-method-bkash"
            onClick={() => setSelectedMethod('bKash')}
            className={`rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 border-2 ${
              selectedMethod === 'bKash'
                ? 'bg-[#071926] border-[#18c4e6] shadow-[0_0_18px_rgba(24,196,230,0.25)]'
                : 'bg-[#07141f] border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* bKash Official Magenta Round Icon */}
            <div className="w-14 h-14 rounded-full bg-[#e2136e] flex items-center justify-center shadow-lg shadow-[#e2136e]/25">
              <svg
                viewBox="0 0 100 100"
                className="w-8 h-8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Origami Bird */}
                <path d="M54 12L85 30L63 46L54 12Z" fill="white" />
                <path d="M54 12L20 54L48 50L54 12Z" fill="white" fillOpacity="0.95" />
                <path d="M48 50L18 80L48 64L63 46L48 50Z" fill="white" fillOpacity="0.9" />
                <path d="M48 64L42 90L58 72L48 64Z" fill="white" />
                <path d="M58 72L78 68L63 46L58 72Z" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">
              bKash
            </span>
          </div>

          {/* Nagad Card */}
          <div
            id="payment-method-nagad"
            onClick={() => setSelectedMethod('Nagad')}
            className={`rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 border-2 ${
              selectedMethod === 'Nagad'
                ? 'bg-[#071926] border-[#18c4e6] shadow-[0_0_18px_rgba(24,196,230,0.25)]'
                : 'bg-[#07141f] border-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Nagad Official Orange Round Icon */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#ed1c24] via-[#f7941d] to-[#f9a01b] flex items-center justify-center shadow-lg shadow-[#f7941d]/25 p-1">
              <svg
                viewBox="0 0 100 100"
                className="w-8 h-8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="58" cy="24" r="7.5" fill="white" />
                <path
                  d="M30 42C34 32 46 28 56 34L50 46C44 42 38 44 36 50C33 57 37 64 44 67C50 69 57 66 61 58L72 64C66 78 50 84 38 78C23 72 18 56 30 42Z"
                  fill="white"
                />
                <path
                  d="M48 42L66 32L62 44L78 52L68 62L58 52L48 42Z"
                  fill="white"
                  fillOpacity="0.95"
                />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm tracking-wide">
              Nagad
            </span>
          </div>
        </div>

        {/* 5. Main Content Box (Input & Tips) */}
        {activeTab === 'recharge' ? (
          <div className="rounded-2xl bg-[#07141f] border border-slate-800/90 p-4 space-y-4 shadow-md">
            {/* Recharge Amount Input */}
            <div className="relative flex items-center bg-[#050e17] border border-slate-700/80 rounded-xl px-4 py-3.5 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all">
              <span className="text-slate-400 text-base font-semibold mr-2 select-none font-mono">
                ৳
              </span>
              <input
                id="wallet-recharge-amount-input"
                type="number"
                min="350"
                max="50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter recharge amount"
                className="w-full bg-transparent text-white font-mono text-base placeholder:text-slate-500 focus:outline-none"
              />
            </div>

            {/* Subtle Divider Line */}
            <div className="border-b border-emerald-950/40" />

            {/* Recharge Tips */}
            <div className="space-y-2">
              <span className="text-white text-xs font-semibold block">
                Recharge Tips:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400 font-normal leading-relaxed">
                <li>• Minimum recharge amount is 350.00 BDT</li>
                <li>• Maximum recharge amount is 50,000.00 BDT</li>
                <li>• No handling fee</li>
                <li>• Processing Time: Instant arrival</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Withdraw View */
          <div className="rounded-2xl bg-[#07141f] border border-slate-800/90 p-4 space-y-4 shadow-md">
            {/* Wallet Account Number */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">
                {selectedMethod} Account Number:
              </span>
              <div className="relative flex items-center bg-[#050e17] border border-slate-700/80 rounded-xl px-4 py-3 focus-within:border-cyan-400 transition-all">
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
              <span className="text-[11px] text-slate-400 font-medium">
                Withdraw Amount:
              </span>
              <div className="relative flex items-center bg-[#050e17] border border-slate-700/80 rounded-xl px-4 py-3.5 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all">
                <span className="text-slate-400 text-base font-semibold mr-2 select-none font-mono">
                  ৳
                </span>
                <input
                  id="wallet-withdraw-amount-input"
                  type="number"
                  min="500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter withdrawal amount"
                  className="w-full bg-transparent text-white font-mono text-base placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Subtle Divider Line */}
            <div className="border-b border-emerald-950/40" />

            {/* Withdrawal Tips */}
            <div className="space-y-2">
              <span className="text-white text-xs font-semibold block">
                Withdrawal Tips:
              </span>
              <ul className="space-y-1.5 text-xs text-slate-400 font-normal leading-relaxed">
                <li>• Minimum withdrawal amount is 500.00 BDT</li>
                <li>• Maximum withdrawal amount is 25,000.00 BDT</li>
                <li>• Available Balance: ৳{currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</li>
                <li>• Processing Time: 5 - 30 minutes</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ACTION BUTTON: Confirm Recharge / Confirm Withdrawal */}
      <div className="w-full pt-6 pb-2 relative z-10">
        {activeTab === 'recharge' ? (
          <button
            id="wallet-confirm-recharge-btn"
            type="button"
            disabled={isSubmitting}
            onClick={handleRechargeSubmit}
            className="w-full py-4 rounded-2xl bg-[#18c4e6] hover:bg-[#15b3d2] active:scale-[0.98] text-[#051119] font-mono font-bold text-base tracking-wider shadow-[0_4px_22px_rgba(24,196,230,0.35)] transition-all cursor-pointer flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                Connecting to Gateway...
              </span>
            ) : (
              'Confirm Recharge'
            )}
          </button>
        ) : (
          <button
            id="wallet-confirm-withdraw-btn"
            type="button"
            onClick={handleWithdrawSubmit}
            className="w-full py-4 rounded-2xl bg-[#18c4e6] hover:bg-[#15b3d2] active:scale-[0.98] text-[#051119] font-mono font-bold text-base tracking-wider shadow-[0_4px_22px_rgba(24,196,230,0.35)] transition-all cursor-pointer flex items-center justify-center"
          >
            Confirm Withdrawal
          </button>
        )}
      </div>
    </div>
  );
};
