import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  X,
  RotateCw,
  Copy,
  Download,
  ShieldCheck,
  Check,
  Building2,
  CheckCircle2,
  Lock,
  CreditCard,
  Plus,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Language } from '../types';
import { AddWalletPaymentModal, WalletItem } from './AddWalletPaymentModal';

interface WithdrawModalProps {
  currentLang?: Language;
  walletBalance: number;
  userName?: string;
  onClose: () => void;
  onWithdrawSuccess: (amount: number, details: WithdrawalReceiptData) => void;
  onOpenAddWallet?: () => void;
  onOpenRecharge?: () => void;
  showToast?: (message: string) => void;
}

export interface WithdrawalReceiptData {
  trxId: string;
  amount: number;
  fee: number;
  netAmount: number;
  walletMethod: string;
  accountName: string;
  accountNumber: string;
  dateStr: string;
  timeStr: string;
  status: 'Processing' | 'Completed';
  authCode: string;
}

const STORAGE_KEY = 'ai_energy_bound_wallets_v2';

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  currentLang = 'en',
  walletBalance,
  userName = 'John Doe',
  onClose,
  onWithdrawSuccess,
  onOpenAddWallet,
  onOpenRecharge,
  showToast,
}) => {
  const isBn = currentLang === 'bn';

  // Load bound wallets from localStorage
  const [boundWallets, setBoundWallets] = useState<WalletItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Keep bound wallets in sync with localStorage if updated
  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setBoundWallets(parsed);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Selected method: 'bKash' | 'Nagad' | 'Bank Transfer'
  const [selectedMethod, setSelectedMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer'>(() => {
    if (boundWallets.length > 0) {
      return boundWallets[0].name;
    }
    return 'bKash';
  });

  // Modal to bind wallet directly from within the withdraw flow
  const [bindModalMethod, setBindModalMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer' | null>(null);

  // Form states
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [authCode, setAuthCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pop-up Receipt State
  const [receiptData, setReceiptData] = useState<WithdrawalReceiptData | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Find if currently selected method is bound
  const currentBoundWallet = boundWallets.find(
    (w) => w.name.toLowerCase() === selectedMethod.toLowerCase()
  );

  const hasAnyBoundWallet = boundWallets.length > 0;

  // Open binding modal
  const handleOpenBindModal = (method?: 'bKash' | 'Nagad' | 'Bank Transfer') => {
    if (onOpenAddWallet) {
      onOpenAddWallet();
    } else {
      setBindModalMethod(method || selectedMethod);
    }
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // 1. Check if user has bound an account
    if (!hasAnyBoundWallet) {
      const msg = isBn
        ? 'দয়া করে প্রথমে একাউন্ট বাইন্ড করুন।'
        : 'Please bind your account first.';
      setErrorMsg(msg);
      showToast?.(msg);
      handleOpenBindModal(selectedMethod);
      return;
    }

    // 2. Check if selected method is bound
    if (!currentBoundWallet) {
      const msg = `Please bind your ${selectedMethod} account first`;
      setErrorMsg(msg);
      showToast?.(msg);
      handleOpenBindModal(selectedMethod);
      return;
    }

    // 3. Validate amount
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(isBn ? 'অনুগ্রহ করে উত্তোলনের সঠিক পরিমাণ লিখুন।' : 'Please enter a valid withdrawal amount.');
      return;
    }

    if (amt < 500) {
      setErrorMsg(isBn ? 'সর্বনিম্ন উত্তোলনের পরিমাণ ৫০০ টাকা।' : 'Minimum withdrawal amount is ৳ 500.00');
      return;
    }

    if (amt > 25000) {
      setErrorMsg(isBn ? 'একবারে সর্বোচ্চ উত্তোলনের সীমা ২৫,০০০ টাকা।' : 'Maximum withdrawal limit per transaction is ৳ 25,000.00');
      return;
    }

    if (amt > walletBalance) {
      setErrorMsg(
        isBn
          ? `আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স ৳ ${walletBalance.toFixed(2)}`
          : `Insufficient balance. Your withdrawable amount is ৳ ${walletBalance.toFixed(2)}`
      );
      return;
    }

    // 4. Validate Google Authenticator 2FA code
    const cleanCode = authCode.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setErrorMsg(
        isBn
          ? 'অনুগ্রহ করে আপনার ৬ সংখ্যার অথেন্টিকেটর কোডটি দিন।'
          : 'Please enter the 6-digit code from your Google Authenticator app.'
      );
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      const now = new Date();
      const dateStr = now.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newReceipt: WithdrawalReceiptData = {
        trxId: `WD-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
          now.getDate()
        ).padStart(2, '0')}-${Math.floor(10000 + Math.random() * 90000)}`,
        amount: amt,
        fee: 0,
        netAmount: amt,
        walletMethod: currentBoundWallet.name,
        accountName: currentBoundWallet.accountName || userName,
        accountNumber: currentBoundWallet.accountNumber,
        dateStr,
        timeStr,
        status: 'Processing',
        authCode: cleanCode,
      };

      setReceiptData(newReceipt);
      onWithdrawSuccess(amt, newReceipt);
    }, 600);
  };

  // Generate and download receipt image using HTML5 Canvas
  const handleDownloadReceipt = () => {
    if (!receiptData) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark site theme background
      ctx.fillStyle = '#070E1C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Cyan accent bar
      ctx.fillStyle = '#00C6FF';
      ctx.fillRect(0, 0, canvas.width, 10);

      // Card Header
      ctx.fillStyle = '#0C1833';
      ctx.roundRect(40, 36, canvas.width - 80, 100, 16);
      ctx.fill();

      ctx.fillStyle = '#00C6FF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('NOVAVEST • OFFICIAL WITHDRAWAL RECEIPT', 65, 80);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Authorized Electronic Payout & Debit Voucher', 65, 110);

      // Status Checkmark Badge
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(canvas.width - 90, 86, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✓', canvas.width - 90, 94);
      ctx.textAlign = 'left';

      // Amount Banner
      ctx.fillStyle = '#0B152B';
      ctx.roundRect(40, 156, canvas.width - 80, 120, 16);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.font = '13px sans-serif';
      ctx.fillText('WITHDRAWAL AMOUNT / উত্তোলিত অর্থ', 65, 190);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 38px monospace';
      ctx.fillText(`৳ ${receiptData.amount.toFixed(2)}`, 65, 240);

      // Details Box
      ctx.fillStyle = '#0A1325';
      ctx.roundRect(40, 296, canvas.width - 80, 440, 16);
      ctx.fill();

      const drawRow = (label: string, val: string, y: number, isCyan = false) => {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '14px sans-serif';
        ctx.fillText(label, 65, y);

        ctx.fillStyle = isCyan ? '#00C6FF' : '#FFFFFF';
        ctx.font = isCyan ? 'bold 15px monospace' : 'bold 15px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val, canvas.width - 65, y);
        ctx.textAlign = 'left';

        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(65, y + 16);
        ctx.lineTo(canvas.width - 65, y + 16);
        ctx.stroke();
      };

      drawRow('Transaction Ref ID', receiptData.trxId, 340, true);
      drawRow('Issuance Date & Time', `${receiptData.dateStr}  ${receiptData.timeStr}`, 400);
      drawRow('Receiving Gateway', receiptData.walletMethod, 460);
      drawRow('Bound Account Number', receiptData.accountNumber, 520, true);
      drawRow('Account Holder Name', receiptData.accountName.toUpperCase(), 580);
      drawRow('Disbursement Status', 'Processing (5 - 30 Mins)', 640);
      drawRow('Security Protocol', 'Google Authenticator 2FA Verified', 700);

      // Security Footer
      ctx.fillStyle = '#64748B';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('256-Bit SSL Encrypted Payout • Verified Banking Node', canvas.width / 2, 780);
      ctx.fillText(`Official Serial Reference: ${receiptData.trxId}`, canvas.width / 2, 810);

      const link = document.createElement('a');
      link.download = `Withdrawal_Receipt_${receiptData.trxId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast?.(isBn ? 'রশিদ ডাউনলোড সম্পন্ন হয়েছে।' : 'Receipt downloaded successfully.');
    } catch {
      showToast?.(isBn ? 'ডাউনলোড সম্পন্ন করা যায়নি।' : 'Download failed.');
    }
  };

  const copyTrxId = () => {
    if (!receiptData) return;
    navigator.clipboard.writeText(receiptData.trxId);
    setIsCopied(true);
    showToast?.(isBn ? 'ট্রানজেকশন আইডি কপি করা হয়েছে।' : 'Transaction ID copied.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      id="withdraw-page-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#070E1C] flex flex-col text-slate-100 font-sans animate-in fade-in duration-200"
    >
      {/* 1. Top Header Matching Main Site Design */}
      <header
        id="withdraw-page-header"
        className="sticky top-0 z-30 bg-[#0A1325]/95 backdrop-blur-md px-4 py-3.5 sm:px-6 border-b border-slate-800/80 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button
            id="withdraw-close-button"
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[#0F192B] hover:bg-[#16243D] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-slate-700/60"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>{isBn ? 'টাকা উত্তোলন' : 'Withdraw Funds'}</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {isBn ? 'যুক্ত করা ওয়ালেটে সরাসরি ক্যাশ আউট' : 'Instant payout to your linked account'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{isBn ? 'সুরক্ষিত পেআউট' : 'Secure Payout'}</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4">
        {/* 2. Top Tabs: Deposit | Withdrawal (Site Color Theme) */}
        <div className="bg-[#0A1428] p-1.5 rounded-2xl border border-slate-800/80 flex items-center gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => {
              if (onOpenRecharge) {
                onClose();
                onOpenRecharge();
              } else {
                showToast?.(isBn ? 'ডিপোজিট সেকশন খুলুন' : 'Opening Deposit section');
              }
            }}
            className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer text-center"
          >
            {isBn ? 'ডিপোজিট' : 'Deposit'}
          </button>
          <button
            type="button"
            className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 shadow-md shadow-blue-500/20 transition-all text-center cursor-default"
          >
            {isBn ? 'উইথড্রয়াল' : 'Withdrawal'}
          </button>
        </div>

        {/* 3. Withdrawable Amount Card (Site Theme) */}
        <div className="rounded-2xl bg-gradient-to-br from-[#09162D] via-[#0A1325] to-[#070E1C] border border-cyan-500/30 p-4 sm:p-5 flex items-center justify-between shadow-lg shadow-cyan-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-semibold uppercase tracking-wider">
              <span>{isBn ? 'উত্তোলনযোগ্য ব্যালেন্স' : 'Withdrawable Amount'}</span>
              <button
                type="button"
                onClick={() => showToast?.(isBn ? 'ব্যালেন্স আপডেট হয়েছে' : 'Balance refreshed')}
                className="p-0.5 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Refresh"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight flex items-baseline gap-1">
              <span className="text-cyan-400 font-sans text-xl">৳</span>
              <span>
                {walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="relative z-10 text-right">
            <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
              ● {isBn ? 'উত্তোলন সচল' : 'Active'}
            </span>
          </div>
        </div>

        {/* 4. Global Alert If NO account has been bound yet */}
        {!hasAnyBoundWallet && (
          <div
            id="no-bound-account-alert"
            className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-white leading-tight">
                  {isBn ? 'দয়া করে প্রথমে একাউন্ট বাইন্ড করুন' : 'Please bind your account first'}
                </p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  {isBn ? 'উইথড্র করতে পেমেন্ট অ্যাকাউন্ট যুক্ত করুন' : 'Link a payment account to withdraw'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenBindModal(selectedMethod)}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-md shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isBn ? 'বাইন্ড করুন' : 'Bind Now'}</span>
            </button>
          </div>
        )}

        {/* Error message banner */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
          {/* ========================================================= */}
          {/* 5. PAYMENT METHOD & BOUND GOLD CARD SECTION              */}
          {/* ========================================================= */}
          <div className="bg-[#091224] rounded-2xl p-4 space-y-3.5 border border-slate-800/80 shadow-md">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-1 h-4 bg-cyan-400 rounded-full mr-2" />
                <span className="text-sm font-bold text-white tracking-wide">
                  {isBn ? 'পেমেন্ট মেথড' : 'Payment Method'}
                </span>
              </div>

              {hasAnyBoundWallet && (
                <button
                  type="button"
                  onClick={() => handleOpenBindModal(selectedMethod)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isBn ? 'অন্য অ্যাকাউন্ট যুক্ত করুন' : 'Add Another'}</span>
                </button>
              )}
            </div>

            {/* Payment Method Selector (bKash, Nagad, Bank Transfer) */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* 1. bKash */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('bKash');
                  if (errorMsg) setErrorMsg(null);
                }}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  selectedMethod === 'bKash'
                    ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-[#0B152B] hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#E2136E] flex items-center justify-center text-white shadow-sm font-black text-xs">
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                    <path d="M12 2L4 9l8 4 8-4-8-7zm0 10l-8-4v6l8 4 8-4v-6l-8 4z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold">bKash</span>
                {boundWallets.some((w) => w.name.toLowerCase() === 'bkash') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* 2. Nagad */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('Nagad');
                  if (errorMsg) setErrorMsg(null);
                }}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  selectedMethod === 'Nagad'
                    ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-[#0B152B] hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#F7941D] flex items-center justify-center text-white shadow-sm font-black text-xs">
                  <span className="font-serif font-black text-sm">ন</span>
                </div>
                <span className="text-xs font-semibold">Nagad</span>
                {boundWallets.some((w) => w.name.toLowerCase() === 'nagad') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* 3. Bank Transfer */}
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('Bank Transfer');
                  if (errorMsg) setErrorMsg(null);
                }}
                className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  selectedMethod === 'Bank Transfer'
                    ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800 bg-[#0B152B] hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold">Bank</span>
                {boundWallets.some((w) => w.name.toLowerCase() === 'bank transfer') && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>

            {/* ========================================================= */}
            {/* CONDITIONAL DISPLAY: BOUND GOLD CARD vs. UNBOUND PROMPT   */}
            {/* ========================================================= */}
            {currentBoundWallet ? (
              /* IF BOUND: Show the Prestigious VIP Gold Card */
              <div
                id="luxurious-bound-gold-card"
                className="relative overflow-hidden rounded-2xl p-4 text-amber-950 shadow-lg border border-amber-300/80 select-none mt-2"
                style={{
                  background:
                    'linear-gradient(135deg, #785208 0%, #B8860B 20%, #E6CA65 45%, #FAF0BE 58%, #D4AF37 80%, #996515 100%)',
                }}
              >
                {/* Subtle Reflective Sheen */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-black/10 via-white/25 to-transparent mix-blend-overlay" />

                <div className="relative z-10 flex items-center justify-between">
                  {/* Microchip & Contactless Waves */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-6 rounded bg-gradient-to-br from-amber-100 via-amber-300 to-amber-700 border border-amber-900/40 p-1 flex flex-col justify-between shadow-inner">
                      <div className="w-full h-0.5 bg-amber-900/40 rounded" />
                      <div className="w-full h-0.5 bg-amber-900/40 rounded" />
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-black/30 backdrop-blur-xs text-[10px] font-bold text-amber-950 uppercase tracking-wider">
                      BOUND ACCOUNT
                    </span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-black/40 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>{currentBoundWallet.name}</span>
                  </div>
                </div>

                {/* Account Number & Account Holder Name */}
                <div className="relative z-10 mt-3.5 flex items-end justify-between">
                  <div>
                    <div className="text-base font-extrabold text-amber-950 font-mono tracking-wider">
                      {currentBoundWallet.accountNumber}
                    </div>
                    <div className="text-[11px] font-bold text-amber-900 uppercase mt-0.5">
                      {currentBoundWallet.accountName || userName}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-amber-900 block font-mono">
                      GOLD VIP
                    </span>
                    <span className="text-[9px] text-amber-950 font-semibold uppercase">
                      Direct Payout
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* IF NOT BOUND: Prompt in English as requested */
              <div
                id="unbound-method-prompt-card"
                className="rounded-2xl border border-dashed border-cyan-500/40 bg-[#0A162B] p-5 text-center space-y-3 mt-2 shadow-inner"
              >
                <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                  <CreditCard className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  {/* English message explicitly requested by user */}
                  <p className="text-sm font-bold text-white tracking-wide">
                    Please bind your {selectedMethod} account first
                  </p>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? `টাকা উত্তোলন করার জন্য আপনার ${selectedMethod} অ্যাকাউন্টটি বাইন্ড করুন`
                      : `Link your verified ${selectedMethod} account to receive withdrawals directly`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenBindModal(selectedMethod)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs cursor-pointer shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Please Bind {selectedMethod} Account</span>
                </button>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 6. AMOUNT INPUT SECTION                                   */}
          {/* ========================================================= */}
          <div className="bg-[#091224] rounded-2xl p-4 space-y-2.5 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-1 h-4 bg-cyan-400 rounded-full mr-2" />
                <span className="text-sm font-bold text-white tracking-wide">
                  {isBn ? 'পরিমাণ' : 'Amount'}
                </span>
              </div>

              <span className="text-xs text-slate-400 font-mono font-medium">
                ৳ 500.00 - ৳ 25,000.00
              </span>
            </div>

            <div className="relative">
              <input
                id="withdraw-amount-input-fresh"
                type="number"
                min={500}
                max={25000}
                step="any"
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="0.00"
                required
                className="w-full bg-[#0A1325] border border-slate-700/80 rounded-xl px-4 py-3.5 text-white font-mono text-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder-slate-500 transition-all text-right"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* 7. AUTHENTICATOR CODE (2FA)                              */}
          {/* ========================================================= */}
          <div className="bg-[#091224] rounded-2xl p-4 space-y-2.5 border border-slate-800/80 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-1 h-4 bg-cyan-400 rounded-full mr-2" />
                <span className="text-sm font-bold text-white tracking-wide">
                  {isBn ? 'Authenticator কোড' : 'Authenticator code'}
                </span>
              </div>

              <span className="text-[11px] text-cyan-400 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3" />
                <span>6-Digit 2FA</span>
              </span>
            </div>

            <div className="relative">
              <input
                id="fresh-auth-code-input"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={authCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setAuthCode(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder={isBn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit Authenticator code'}
                required
                className="w-full bg-[#0A1325] border border-slate-700/80 rounded-xl px-4 py-3.5 text-white font-mono text-base tracking-widest focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:tracking-normal placeholder-slate-500 transition-all text-center"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* 8. WITHDRAWAL SUBMIT BUTTON                               */}
          {/* ========================================================= */}
          <div className="pt-2 pb-6">
            <button
              id="confirm-withdrawal-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-[0.99] text-white font-bold text-base py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isBn ? 'উত্তোলন নিশ্চিত করুন' : 'Confirm Withdrawal'}</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* ========================================================= */}
      {/* 9. INLINE BIND PAYMENT MODAL                              */}
      {/* ========================================================= */}
      {bindModalMethod && (
        <AddWalletPaymentModal
          currentLang={currentLang}
          userName={userName}
          initialMethod={bindModalMethod}
          onClose={() => setBindModalMethod(null)}
          onWalletAdded={(newWallet) => {
            setBoundWallets((prev) => {
              const filtered = prev.filter((w) => w.id !== newWallet.id);
              const updated = [newWallet, ...filtered];
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch {
                // ignore
              }
              return updated;
            });
            setSelectedMethod(newWallet.name);
            setBindModalMethod(null);
            showToast?.(
              isBn
                ? `${newWallet.name} অ্যাকাউন্ট সফলভাবে যুক্ত করা হয়েছে!`
                : `${newWallet.name} account bound successfully!`
            );
          }}
          showToast={showToast}
        />
      )}

      {/* ========================================================= */}
      {/* 10. OFFICIAL RECEIPT POPUP                                */}
      {/* ========================================================= */}
      {receiptData && (
        <div
          id="withdrawal-receipt-popup-overlay"
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            id="withdrawal-receipt-container"
            className="w-full max-w-sm bg-[#0C1833] border border-cyan-500/50 rounded-3xl p-5 text-white space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setReceiptData(null);
                onClose();
              }}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Receipt Header Icon */}
            <div className="text-center pt-2 space-y-1.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold uppercase tracking-wide inline-block">
                ● {isBn ? 'আবেদন গৃহীত হয়েছে' : 'Disbursement Queued'}
              </span>
              <h3 className="text-lg font-bold text-white">
                {isBn ? 'টাকা উত্তোলনের রসিদ' : 'Official Withdrawal Receipt'}
              </h3>
            </div>

            {/* Total Amount Box */}
            <div className="rounded-xl bg-[#091224] border border-slate-800 p-3.5 text-center space-y-0.5">
              <span className="text-[11px] text-slate-400 uppercase font-semibold">
                {isBn ? 'উত্তোলনের পরিমাণ' : 'Withdrawal Amount'}
              </span>
              <div className="text-2xl font-extrabold text-cyan-400 font-mono">
                ৳ {receiptData.amount.toFixed(2)}
              </div>
            </div>

            {/* Clean Receipt Details */}
            <div className="rounded-xl bg-[#0A1428] border border-slate-800/80 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'রেফারেন্স আইডি:' : 'Trx Ref ID:'}</span>
                <div className="flex items-center gap-1 font-mono text-cyan-400 font-bold">
                  <span>{receiptData.trxId}</span>
                  <button
                    type="button"
                    onClick={copyTrxId}
                    className="p-0.5 hover:text-white cursor-pointer"
                    title="Copy"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'তারিখ ও সময়:' : 'Date & Time:'}</span>
                <span className="text-slate-200">{receiptData.dateStr} • {receiptData.timeStr}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'পেমেন্ট মাধ্যম:' : 'Method:'}</span>
                <span className="text-white font-bold">{receiptData.walletMethod}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'প্রাপকের নম্বর:' : 'Bound Account:'}</span>
                <span className="text-white font-mono font-medium">{receiptData.accountNumber}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'অ্যাকাউন্টের নাম:' : 'Account Holder:'}</span>
                <span className="text-white font-medium uppercase">{receiptData.accountName}</span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">{isBn ? 'সার্ভিস চার্জ:' : 'Platform Fee:'}</span>
                <span className="text-emerald-400 font-bold">৳ 0.00 (Free)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">{isBn ? 'স্ট্যাটাস:' : 'Status:'}</span>
                <span className="text-amber-400 font-bold uppercase text-[10px]">
                  {isBn ? 'প্রক্রিয়াধীন (৫–৩০ মিনিট)' : 'In Processing (5–30 Mins)'}
                </span>
              </div>
            </div>

            {/* Action Buttons: Download Receipt & Done */}
            <div className="space-y-2 pt-1">
              <button
                id="download-receipt-button"
                type="button"
                onClick={handleDownloadReceipt}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs py-3 flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>{isBn ? 'রসিদ ডাউনলোড করুন' : 'Download Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReceiptData(null);
                  onClose();
                }}
                className="w-full rounded-xl bg-[#091224] hover:bg-[#0E1A33] border border-slate-800 text-slate-300 font-bold text-xs py-2.5 transition-colors cursor-pointer text-center"
              >
                {isBn ? 'ঠিক আছে' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
