import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  Building2,
  Sparkles,
  Lock,
  Trash2,
  CreditCard,
  Plus,
  X,
} from 'lucide-react';
import { Language } from '../types';

export interface WalletItem {
  id: string;
  name: 'bKash' | 'Nagad' | 'Bank Transfer';
  accountName: string;
  accountNumber: string;
  isDefault: boolean;
  addedAt: string;
}

interface AddWalletPaymentModalProps {
  currentLang?: Language;
  userName?: string;
  initialMethod?: 'bKash' | 'Nagad' | 'Bank Transfer';
  onClose: () => void;
  onWalletAdded?: (wallet: WalletItem) => void;
  showToast?: (message: string) => void;
}

const STORAGE_KEY = 'ai_energy_bound_wallets_v2';

export const AddWalletPaymentModal: React.FC<AddWalletPaymentModalProps> = ({
  currentLang = 'en',
  userName = 'John Doe',
  initialMethod,
  onClose,
  onWalletAdded,
  showToast,
}) => {
  const isBn = currentLang === 'bn';

  // Load saved wallets or start with empty list so initial state shows form
  const [wallets, setWallets] = useState<WalletItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return [];
  });

  // View mode: 'form' for Add Wallet form, 'card' for Bound Card view
  const [viewMode, setViewMode] = useState<'form' | 'card'>(() => {
    if (initialMethod) return 'form';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return 'card';
        }
      }
    } catch {
      // ignore
    }
    return 'form';
  });

  // Form states
  const [selectedMethod, setSelectedMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer' | ''>(
    initialMethod || ''
  );
  const [accountName, setAccountName] = useState(userName);
  const [walletNumber, setWalletNumber] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Method selector popup state
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Lock body scroll while modal is open to prevent background scrolling leakage
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  // Synchronize localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
    } catch {
      // ignore
    }
  }, [wallets]);

  const handleSelectMethod = (method: 'bKash' | 'Nagad' | 'Bank Transfer') => {
    setSelectedMethod(method);
    setIsPickerOpen(false);
  };

  const handleAddWalletSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMethod) {
      showToast?.(isBn ? 'অনুগ্রহ করে ওয়ালেট নির্বাচন করুন (বিকাশ বা নগদ)' : 'Please select a wallet (bKash or Nagad)');
      setIsPickerOpen(true);
      return;
    }

    if (!accountName.trim()) {
      showToast?.(isBn ? 'অনুগ্রহ করে অ্যাকাউন্টের নাম লিখুন' : 'Please enter account holder name');
      return;
    }

    const cleanNum = walletNumber.replace(/\D/g, '');
    if (cleanNum.length < 10 || cleanNum.length > 11) {
      showToast?.(
        isBn
          ? 'সঠিক ১০ বা ১১-সংখ্যার নম্বর প্রদান করুন'
          : 'Please enter a valid 10 or 11-digit wallet number'
      );
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newWallet: WalletItem = {
        id: `wallet-${Date.now()}`,
        name: selectedMethod,
        accountName: accountName.trim(),
        accountNumber: walletNumber.trim(),
        isDefault: isDefault || wallets.length === 0,
        addedAt: new Date().toLocaleDateString(),
      };

      const updated = isDefault
        ? [newWallet, ...wallets.map((w) => ({ ...w, isDefault: false }))]
        : [...wallets, newWallet];

      setWallets(updated);
      setIsSubmitting(false);

      // Transition to Card View as requested
      setViewMode('card');
      showToast?.(
        isBn
          ? 'ওয়ালেট সফলভাবে বাইন্ড করা হয়েছে!'
          : 'Wallet successfully bound!'
      );
      onWalletAdded?.(newWallet);
    }, 400);
  };

  const handleDeleteWallet = (id: string) => {
    const remaining = wallets.filter((w) => w.id !== id);
    setWallets(remaining);
    showToast?.(isBn ? 'ওয়ালেট মুছে ফেলা হয়েছে' : 'Wallet removed');
    if (remaining.length === 0) {
      setViewMode('form');
    }
  };

  const maskCardNumber = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.length >= 8) {
      return `${clean.slice(0, 4)}   ••••   ${clean.slice(-4)}`;
    }
    return `0171   ••••   ${clean.slice(-4) || '1234'}`;
  };

  const maskRowNumber = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.length >= 8) {
      return `${clean.slice(0, 4)} •••• ${clean.slice(-4)}`;
    }
    return `0171 •••• ${clean.slice(-4) || '1234'}`;
  };

  // Find current primary card to preview
  const activeCard = wallets.find((w) => w.isDefault) || wallets[0];

  return (
    <div
      id="add-wallet-screen-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[#070D18]/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 text-slate-100 animate-in fade-in"
    >
      {/* Mobile Frame Container */}
      <div
        id="add-wallet-mobile-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#08101E] border border-slate-800/90 rounded-[32px] shadow-[0_25px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col my-auto max-h-[96vh] relative overscroll-contain"
      >
        {/* Soft Background Radial Cyan Glow */}
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #00d2ff 0%, transparent 70%)' }}
        />

        {/* Top Header */}
        <header
          id="add-wallet-header"
          className="relative z-10 px-5 py-4 flex items-center justify-between border-b border-slate-800/60"
        >
          <button
            id="add-wallet-back-btn"
            type="button"
            onClick={() => {
              if (viewMode === 'card' && wallets.length > 0) {
                onClose();
              } else {
                onClose();
              }
            }}
            className="w-10 h-10 rounded-full bg-[#101B2E] hover:bg-[#182844] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-700/60 shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-lg font-bold text-white tracking-wide">
            {viewMode === 'card' ? (isBn ? 'ওয়ালেট বিবরণ' : 'My Wallet') : (isBn ? 'ওয়ালেট যুক্ত করুন' : 'Add Wallet')}
          </h1>

          {/* Right Action: If in card view, allow switching to Add New form */}
          {viewMode === 'card' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedMethod('');
                setWalletNumber('');
                setViewMode('form');
              }}
              className="px-2.5 py-1 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isBn ? 'যুক্ত' : 'New'}</span>
            </button>
          ) : (
            <div className="w-10" />
          )}
        </header>

        {/* Body Content */}
        <div className="relative z-10 p-5 overflow-y-auto space-y-5 scrollbar-thin">
          {/* ========================================================= */}
          {/* VIEW 1: ADD WALLET FORM (Screenshot 1 Exact Match)         */}
          {/* ========================================================= */}
          {viewMode === 'form' && (
            <form id="add-wallet-form" onSubmit={handleAddWalletSubmit} className="space-y-4">
              {/* Field 1: Wallet Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  {isBn ? 'ওয়ালেটের ধরন' : 'Wallet Type'}
                </label>

                <div
                  id="wallet-type-select-card"
                  onClick={() => setIsPickerOpen(true)}
                  className="w-full rounded-2xl border-2 border-[#00d2ff] bg-[#071322]/90 p-5 flex flex-col items-center justify-center gap-2 cursor-pointer shadow-[0_0_22px_rgba(0,210,255,0.22)] hover:border-cyan-300 transition-all active:scale-[0.99]"
                >
                  <CreditCard className="w-8 h-8 text-[#00d2ff]" />
                  <span className="text-sm font-bold text-[#00d2ff] tracking-wide">
                    {selectedMethod
                      ? selectedMethod
                      : isBn
                      ? 'ওয়ালেট (Wallet)'
                      : 'Wallet'}
                  </span>
                </div>
              </div>

              {/* Field 2: Wallet Name * */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  {isBn ? 'ওয়ালেটের নাম' : 'Wallet Name'}{' '}
                  <span className="text-rose-500 font-bold">*</span>
                </label>

                <div
                  id="wallet-name-select-box"
                  onClick={() => setIsPickerOpen(true)}
                  className="w-full rounded-xl border-2 border-[#00d2ff] bg-[#071322]/90 px-4 py-3.5 flex items-center justify-between text-white cursor-pointer shadow-[0_0_18px_rgba(0,210,255,0.18)] hover:border-cyan-300 transition-all active:scale-[0.99]"
                >
                  {selectedMethod ? (
                    <div className="flex items-center gap-2.5">
                      {selectedMethod === 'bKash' ? (
                        <div className="w-6 h-6 rounded-md bg-[#E2136E] flex items-center justify-center text-white text-xs font-black">
                          b
                        </div>
                      ) : selectedMethod === 'Nagad' ? (
                        <div className="w-6 h-6 rounded-md bg-[#F7941D] flex items-center justify-center text-white text-xs font-black">
                          ন
                        </div>
                      ) : (
                        <Building2 className="w-5 h-5 text-cyan-400" />
                      )}
                      <span className="text-sm font-bold text-white">{selectedMethod}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-slate-300">
                      {isBn ? 'ওয়ালেট নির্বাচন করুন' : 'Select Wallet'}
                    </span>
                  )}

                  <span className="text-xs font-semibold text-cyan-400">
                    {isBn ? 'পরিবর্তন' : 'Choose'}
                  </span>
                </div>
              </div>

              {/* Field 3: Account Name * */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  {isBn ? 'অ্যাকাউন্টের নাম' : 'Account Name'}{' '}
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="account-name-input"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder={isBn ? 'অ্যাকাউন্টধারীর নাম লিখুন' : 'Enter account holder name'}
                  required
                  className="w-full rounded-xl bg-[#091424] border border-slate-800 px-4 py-3.5 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
              </div>

              {/* Field 4: Wallet Number * */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-300">
                  {isBn ? 'ওয়ালেট নম্বর' : 'Wallet Number'}{' '}
                  <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  id="wallet-number-input"
                  type="tel"
                  value={walletNumber}
                  onChange={(e) => setWalletNumber(e.target.value)}
                  placeholder="Wallet number  (10-11 digits)"
                  required
                  className="w-full rounded-xl bg-[#091424] border border-slate-800 px-4 py-3.5 text-white placeholder-slate-500 text-sm font-mono tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <p className="text-xs text-slate-400 pl-1">
                  {isBn
                    ? '১০ ডিজিট (০ দিয়ে শুরু হবে না) অথবা ১১ ডিজিট (০ দিয়ে শুরু হবে)'
                    : '10 digits (cannot start with 0) or 11 digits (must start with 0)'}
                </p>
              </div>

              {/* Field 5: Set as Default Wallet */}
              <div className="rounded-xl bg-[#091424] border border-slate-800 px-4 py-3.5 flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  {isBn ? 'ডিফল্ট ওয়ালেট হিসেবে নির্ধারণ করুন' : 'Set as Default Wallet'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDefault}
                  onClick={() => setIsDefault(!isDefault)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
                    isDefault ? 'bg-[#00d2ff]' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      isDefault ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Field 6: Add Wallet Button */}
              <button
                id="add-wallet-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-[#00A3FF] to-[#0066FF] hover:from-[#0092e6] hover:to-[#0055e6] text-white font-bold text-base py-4 flex items-center justify-center gap-2.5 shadow-[0_0_28px_rgba(0,140,255,0.45)] active:scale-[0.99] transition-all cursor-pointer mt-3"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>{isBn ? 'ওয়ালেট যুক্ত করুন' : 'Add Wallet'}</span>
                  </>
                )}
              </button>

              {/* Quick toggle to view already bound cards if any exists */}
              {wallets.length > 0 && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer underline underline-offset-4"
                  >
                    {isBn ? 'পূর্বের সংরক্ষিত কার্ড দেখুন' : 'View Saved Bound Cards'}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: BOUND CARD VIEW (Screenshot 2 Exact Match)        */}
          {/* ========================================================= */}
          {viewMode === 'card' && activeCard && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Header Title Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span className="text-sm font-extrabold text-white uppercase tracking-wider">
                    {isBn ? 'সংরক্ষিত ওয়ালেট প্রিভিউ' : 'ADDED WALLET PREVIEW'}
                  </span>
                </div>
                <span className="px-3 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 font-bold text-xs font-mono">
                  GOLD VIP
                </span>
              </div>

              {/* Luxurious Golden Metallic Card */}
              <div
                id="luxurious-gold-card"
                className="relative overflow-hidden rounded-[26px] p-6 text-amber-950 shadow-[0_18px_40px_-6px_rgba(212,175,55,0.45)] border border-amber-300/70 select-none"
                style={{
                  background:
                    'linear-gradient(135deg, #785208 0%, #B8860B 20%, #E6CA65 45%, #FAF0BE 58%, #D4AF37 80%, #996515 100%)',
                }}
              >
                {/* Subtle Reflective Light Sheen Overlay */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/15 via-white/20 to-transparent mix-blend-overlay" />
                <div
                  className="absolute -top-20 -right-20 w-52 h-52 rounded-full pointer-events-none opacity-40 blur-2xl"
                  style={{ background: 'radial-gradient(circle, #FFF7D6 0%, transparent 70%)' }}
                />

                {/* Card Top Row: Chip, Waves, Default Badge & Method Pill */}
                <div className="relative z-10 flex items-center justify-between">
                  {/* Gold Smart Chip + Contactless Waves */}
                  <div className="flex items-center gap-3">
                    {/* Metallic Microchip */}
                    <div className="w-11 h-8 rounded-lg bg-gradient-to-br from-amber-100 via-amber-300 to-amber-600 border border-amber-900/40 shadow-inner flex flex-col justify-around p-1.5">
                      <div className="w-full h-0.5 bg-amber-900/30 rounded" />
                      <div className="w-full h-0.5 bg-amber-900/30 rounded" />
                      <div className="w-full h-0.5 bg-amber-900/30 rounded" />
                    </div>
                    {/* Contactless Waves */}
                    <svg
                      className="w-4 h-4 text-amber-950/80"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                      <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                      <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                    </svg>
                  </div>

                  {/* Badges: Default + bKash / Nagad */}
                  <div className="flex items-center gap-2">
                    {activeCard.isDefault && (
                      <span className="px-3 py-1 rounded-full bg-black/25 backdrop-blur-xs text-xs font-bold text-amber-950 border border-amber-950/20">
                        Default
                      </span>
                    )}

                    <div className="px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center gap-1.5 shadow-sm">
                      {activeCard.name === 'bKash' ? (
                        <>
                          <div className="w-3 h-3 rounded-full bg-[#E2136E]" />
                          <span className="text-xs font-black text-white tracking-wider">bKash</span>
                        </>
                      ) : activeCard.name === 'Nagad' ? (
                        <>
                          <div className="w-3 h-3 rounded-full bg-[#F7941D]" />
                          <span className="text-xs font-black text-white tracking-wider">Nagad</span>
                        </>
                      ) : (
                        <>
                          <Building2 className="w-3.5 h-3.5 text-cyan-300" />
                          <span className="text-xs font-black text-white tracking-wider">Bank</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Number Middle Row */}
                <div className="relative z-10 mt-6 mb-4">
                  <div className="text-[11px] text-amber-950 font-bold uppercase tracking-widest opacity-85">
                    {activeCard.name.toUpperCase()} ACCOUNT NO
                  </div>
                  <div className="text-xl sm:text-2xl font-mono font-bold tracking-[0.16em] text-amber-950 mt-1">
                    {maskCardNumber(activeCard.accountNumber)}
                  </div>
                </div>

                {/* Bottom Row: Account Holder & SSL badge */}
                <div className="relative z-10 flex items-end justify-between pt-2 border-t border-amber-900/20">
                  <div>
                    <span className="text-[10px] text-amber-950 font-bold uppercase tracking-wider block opacity-75">
                      ACCOUNT HOLDER
                    </span>
                    <span className="text-sm font-black uppercase tracking-wide text-amber-950">
                      {activeCard.accountName || userName}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-950">
                      <Lock className="w-3.5 h-3.5" />
                      <span>256–BIT SSL</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-950/80">Valid: 12/29</span>
                  </div>
                </div>
              </div>

              {/* Saved Wallet List Item (matching screenshot 2 bottom row) */}
              <div className="p-3.5 rounded-2xl bg-[#0F1B30] border border-slate-800 flex items-center justify-between text-xs shadow-sm">
                <div className="flex items-center gap-3">
                  {/* Pink 'b' or Orange 'n' Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm ${
                      activeCard.name === 'bKash'
                        ? 'bg-[#E2136E]'
                        : activeCard.name === 'Nagad'
                        ? 'bg-[#F7941D]'
                        : 'bg-cyan-600'
                    }`}
                  >
                    {activeCard.name === 'bKash' ? 'b' : activeCard.name === 'Nagad' ? 'ন' : 'B'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{activeCard.name}</span>
                      {activeCard.isDefault && (
                        <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {maskRowNumber(activeCard.accountNumber)}
                    </span>
                  </div>
                </div>

                {/* Delete / Unbind Action */}
                <button
                  type="button"
                  onClick={() => handleDeleteWallet(activeCard.id)}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Remove Wallet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Action: Done & Add Another Wallet */}
              <div className="pt-2 space-y-2">
                <button
                  id="wallet-card-done-btn"
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isBn ? 'সম্পন্ন হয়েছে (ঠিক আছে)' : 'Done / Return'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMethod('');
                    setWalletNumber('');
                    setViewMode('form');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#101F38] hover:bg-[#162A4D] border border-slate-700/70 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isBn ? 'নতুন ওয়ালেট যুক্ত / বাইন্ড করুন' : 'Add Another Wallet'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Fallback if in card view but no cards exist */}
          {viewMode === 'card' && !activeCard && (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-slate-400">
                {isBn ? 'কোন ওয়ালেট সংরক্ষিত নেই।' : 'No bound wallet found.'}
              </p>
              <button
                type="button"
                onClick={() => setViewMode('form')}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-900 font-bold text-xs cursor-pointer"
              >
                {isBn ? 'ওয়ালেট বাইন্ড করুন' : 'Bind Wallet'}
              </button>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* MODAL: WALLET SELECTION PICKER (নগদ / বিকাশ / ব্যাংক)      */}
        {/* ========================================================= */}
        {isPickerOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#0C1628] border border-slate-700 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isBn ? 'ওয়ালেট নির্বাচন করুন' : 'Select Wallet'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isBn ? 'বিকাশ বা নগদ সিলেক্ট করুন' : 'Choose bKash, Nagad or Bank'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Method Selection Options */}
              <div className="space-y-2.5">
                {/* 1. bKash */}
                <div
                  id="pick-method-bkash"
                  onClick={() => handleSelectMethod('bKash')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedMethod === 'bKash'
                      ? 'bg-pink-950/30 border-pink-500 shadow-[0_0_15px_rgba(226,19,110,0.3)] ring-1 ring-pink-500'
                      : 'bg-[#101D34] border-slate-800 hover:border-slate-700 hover:bg-[#152542]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E2136E] flex items-center justify-center text-white font-black shadow-md shadow-pink-900/40">
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="12,2 2,12 12,22 14,14 22,12 14,10" />
                      </svg>
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">bKash (বিকাশ)</span>
                      <span className="text-[11px] text-pink-300">
                        {isBn ? 'ইনস্ট্যান্ট ক্যাশআউট ওয়ালেট' : 'Instant Mobile Wallet'}
                      </span>
                    </div>
                  </div>

                  {selectedMethod === 'bKash' && (
                    <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* 2. Nagad */}
                <div
                  id="pick-method-nagad"
                  onClick={() => handleSelectMethod('Nagad')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedMethod === 'Nagad'
                      ? 'bg-orange-950/30 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] ring-1 ring-orange-500'
                      : 'bg-[#101D34] border-slate-800 hover:border-slate-700 hover:bg-[#152542]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F7941D] to-[#ED1C24] flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-900/40">
                      ন
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Nagad (নগদ)</span>
                      <span className="text-[11px] text-orange-300">
                        {isBn ? 'ডাক বিভাগ ডিজিটাল ওয়ালেট' : 'Postal Service Mobile Wallet'}
                      </span>
                    </div>
                  </div>

                  {selectedMethod === 'Nagad' && (
                    <div className="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* 3. Bank Transfer */}
                <div
                  id="pick-method-bank"
                  onClick={() => handleSelectMethod('Bank Transfer')}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedMethod === 'Bank Transfer'
                      ? 'bg-cyan-950/30 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400'
                      : 'bg-[#101D34] border-slate-800 hover:border-slate-700 hover:bg-[#152542]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">
                        Bank Transfer (ব্যাংক অ্যাকাউন্ট)
                      </span>
                      <span className="text-[11px] text-cyan-300">BEFTN / NPSB</span>
                    </div>
                  </div>

                  {selectedMethod === 'Bank Transfer' && (
                    <div className="w-6 h-6 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
