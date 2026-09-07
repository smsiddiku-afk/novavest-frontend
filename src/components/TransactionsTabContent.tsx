import React, { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Zap, Gift, CheckCircle2, Clock, X, Copy, Check, FileText } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface TransactionsTabContentProps {
  userBalance: number;
  currentLang?: Language;
  userTransactions?: any[];
}

export const TransactionsTabContent: React.FC<TransactionsTabContentProps> = ({
  userBalance,
  currentLang = 'en',
  userTransactions = [],
}) => {
  const isBn = currentLang === 'bn';
  const t = translations[currentLang];
  const [activeFilter, setActiveFilter] = useState<'all' | 'recharge' | 'yield' | 'withdraw'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [copiedTrx, setCopiedTrx] = useState(false);

  const defaultTransactions = [
    {
      id: 'TRX-98214',
      type: 'yield',
      title: isBn ? 'সোলার সাবস্টেশন দৈনিক উৎপাদন আয়' : 'Solar Substation Daily Yield',
      desc: isBn ? 'এআই পাওয়ার জেনারেশন ডিভিডেন্ড' : 'AI generation dividend',
      amount: '+৳473.10',
      time: isBn ? 'আজ, ১২:৩০ পিএম' : 'Today, 12:30 PM',
      date: '04 Sep 2026',
      status: isBn ? 'সফল' : 'Completed',
      channel: 'Solar Grid Unit #04',
      isCredit: true,
    },
    {
      id: 'TRX-97812',
      type: 'bonus',
      title: isBn ? 'দৈনিক এআই গ্রিড বোনাস' : 'Daily AI Grid Reward',
      desc: isBn ? 'লগইন পুরস্কার বোনাস' : 'Platform login dividend',
      amount: '+৳50.00',
      time: isBn ? 'আজ, ০৮:১৫ এএম' : 'Today, 08:15 AM',
      date: '04 Sep 2026',
      status: isBn ? 'সফল' : 'Completed',
      channel: 'Daily Node Check-in',
      isCredit: true,
    },
    {
      id: 'TRX-96541',
      type: 'recharge',
      title: isBn ? 'ওয়ালেট রিচার্জ (বিকাশ)' : 'Wallet Recharge (bKash)',
      desc: isBn ? 'ডিপোজিট TrxID: BK762910' : 'Deposit via TrxID: BK762910',
      amount: '+৳5,000.00',
      time: isBn ? 'গতকাল, ০৪:২০ পিএম' : 'Yesterday, 04:20 PM',
      date: '03 Sep 2026',
      status: isBn ? 'সফল' : 'Completed',
      channel: 'bKash Merchant Gateway',
      isCredit: true,
    },
    {
      id: 'TRX-95112',
      type: 'withdraw',
      title: isBn ? 'ব্যালেন্স উত্তোলন (নগদ)' : 'Balance Withdrawal (Nagad)',
      desc: isBn ? 'প্রেরিত +880 1712-345678' : 'Sent to +880 1712-345678',
      amount: '-৳2,000.00',
      time: '02 Sep 2026, 06:14 PM',
      date: '02 Sep 2026',
      status: isBn ? 'সফল' : 'Completed',
      channel: 'Nagad Payout Engine',
      isCredit: false,
    },
    {
      id: 'TRX-94883',
      type: 'yield',
      title: isBn ? 'বিইএসএস ব্যাটারি ফ্রিকোয়েন্সি লভ্যাংশ' : 'BESS Battery Frequency Dividend',
      desc: isBn ? 'গ্রিড লোড ব্যালেন্সিং আয়' : 'Grid load balancing yield',
      amount: '+৳620.00',
      time: '01 Sep 2026, 11:00 AM',
      date: '01 Sep 2026',
      status: isBn ? 'সফল' : 'Completed',
      channel: 'BESS Matrix Node #2',
      isCredit: true,
    },
  ];

  // Combine user's real Firestore transactions with defaults
  const transactions = [
    ...userTransactions.map((tx: any) => ({
      id: tx.id || tx.hash || `TRX-${Date.now()}`,
      type: tx.type || (tx.amount > 0 || (typeof tx.amount === 'string' && tx.amount.startsWith('+')) ? 'recharge' : 'withdraw'),
      title: tx.title || (tx.type === 'withdrawal' ? 'ব্যালেন্স উত্তোলন' : 'ওয়ালেট ডিপোজিট'),
      desc: tx.desc || tx.description || `TrxID: ${tx.id || tx.hash || 'Verified'}`,
      amount: typeof tx.amount === 'number'
        ? (tx.amount > 0 ? `+৳${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `-৳${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`)
        : String(tx.amount || '+৳0.00'),
      time: tx.time || tx.timestamp || 'আজ, সম্প্রতি',
      date: tx.date || new Date().toLocaleDateString('en-GB'),
      status: isBn ? 'সফল' : 'Completed',
      channel: tx.channel || 'NVT Cloud Settlement',
      isCredit: tx.isCredit ?? (typeof tx.amount === 'number' ? tx.amount > 0 : !String(tx.amount).startsWith('-')),
    })),
    ...defaultTransactions,
  ];

  const filtered = transactions.filter((trx) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'recharge') return trx.type === 'recharge';
    if (activeFilter === 'yield') return trx.type === 'yield' || trx.type === 'bonus';
    if (activeFilter === 'withdraw') return trx.type === 'withdraw';
    return true;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrx(true);
    setTimeout(() => setCopiedTrx(false), 2000);
  };

  return (
    <div className="w-full space-y-4 pb-4 text-slate-100 animate-in fade-in">
      {/* Balance Summary Header */}
      <div className="p-4 sm:p-5 rounded-[24px] bg-gradient-to-r from-[#09152D] via-[#0D1E3F] to-[#071126] border border-cyan-500/30 flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] text-cyan-300 font-bold tracking-wider uppercase block">
            {isBn ? 'ব্যালেন্স রেকর্ড' : 'Balance Settlement'}
          </span>
          <span className="text-2xl font-black text-white font-mono tracking-tight">
            ৳{userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isBn ? 'স্বয়ংক্রিয়ভাবে ক্লিয়ারড' : 'Instant Settled'}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#091325] border border-slate-800">
        {[
          { id: 'all' as const, label: isBn ? 'সকল' : 'All' },
          { id: 'recharge' as const, label: isBn ? 'রিচার্জ' : 'Recharge' },
          { id: 'yield' as const, label: isBn ? 'আয়' : 'Yields' },
          { id: 'withdraw' as const, label: isBn ? 'উত্তোলন' : 'Withdraw' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeFilter === tab.id
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction List (Responsive: 1 col on mobile, 2 cols on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {filtered.map((trx) => (
          <div
            key={trx.id}
            onClick={() => setSelectedReceipt(trx)}
            className="p-3.5 rounded-2xl bg-[#081224] border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${
                  trx.type === 'recharge'
                    ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                    : trx.type === 'withdraw'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : trx.type === 'bonus'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                }`}
              >
                {trx.type === 'recharge' && <ArrowDownToLine className="w-5 h-5" />}
                {trx.type === 'withdraw' && <ArrowUpFromLine className="w-5 h-5" />}
                {trx.type === 'bonus' && <Gift className="w-5 h-5" />}
                {trx.type === 'yield' && <Zap className="w-5 h-5 fill-current" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight group-hover:text-cyan-300 transition-colors">
                  {trx.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{trx.desc}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">{trx.time}</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-500/20">
                    {trx.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`text-sm font-extrabold font-mono ${
                  trx.isCredit ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trx.amount}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                {trx.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Details Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0C152B] border border-cyan-500/40 rounded-3xl p-5 text-white space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center pt-2 space-y-1">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">{isBn ? 'লেনদেনের ভাউচার বিবরণী' : 'Official Transaction Voucher'}</h3>
              <p className="text-xs text-slate-400">{selectedReceipt.channel}</p>
            </div>

            <div className="text-center py-2 bg-[#060D1A] rounded-2xl border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400">{isBn ? 'লেনদেনের পরিমাণ' : 'Transferred Amount'}</span>
              <div className={`text-2xl font-black font-mono ${selectedReceipt.isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {selectedReceipt.amount}
              </div>
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                ● {selectedReceipt.status}
              </span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-800/80">
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">{isBn ? 'ট্রানজেকশন আইডি' : 'Transaction ID'}:</span>
                <button
                  type="button"
                  onClick={() => handleCopy(selectedReceipt.id)}
                  className="inline-flex items-center gap-1 font-mono text-cyan-300 font-bold bg-slate-800/80 px-2 py-0.5 rounded hover:bg-slate-700 transition-colors"
                >
                  <span>{selectedReceipt.id}</span>
                  {copiedTrx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">{isBn ? 'তারিখ ও সময়' : 'Timestamp'}:</span>
                <span className="text-white font-medium">{selectedReceipt.time}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">{isBn ? 'বিবরণ' : 'Description'}:</span>
                <span className="text-white font-medium">{selectedReceipt.desc}</span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400">{isBn ? 'নিরাপত্তা প্রোটোকল' : 'Security Protocol'}:</span>
                <span className="text-cyan-300 font-mono">TLS-256 / SHA-256</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {isBn ? 'বন্ধ করুন' : 'Close Voucher'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

