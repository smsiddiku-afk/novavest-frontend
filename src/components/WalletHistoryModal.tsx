import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Coins,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
} from 'lucide-react';
import { Language } from '../types';

interface WalletHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: any[];
  currentLang?: Language;
  themeMode?: 'night' | 'day';
}

export const WalletHistoryModal: React.FC<WalletHistoryModalProps> = ({
  isOpen,
  onClose,
  transactions = [],
  currentLang = 'bn',
  themeMode = 'night',
}) => {
  if (!isOpen) return null;

  const isBn = currentLang === 'bn';
  const isDay = themeMode === 'day';

  const [activeFilter, setActiveFilter] = useState<'all' | 'recharge' | 'withdraw' | 'invest' | 'profit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter and deduplicate transactions
  const filteredList = transactions.filter((tx: any) => {
    const rawType = String(tx.type || '').toLowerCase();
    const isInvest = rawType === 'investment' || rawType === 'invest' || rawType.includes('package');
    const isWithdraw = rawType === 'withdrawal' || rawType === 'withdraw' || rawType === 'payout';
    const isProfit = rawType === 'yield' || rawType === 'bonus' || rawType === 'reward' || rawType === 'profit';
    const isRecharge = !isInvest && !isWithdraw && !isProfit;

    // User requirement: "Pending recharge dekhasse eta dekhabe na" -> Do not display pending recharge records
    const rawStatus = String(tx.status || '').toLowerCase();
    const isPending = rawStatus === 'pending' || rawStatus === 'অপেক্ষমাণ' || rawStatus === 'processing';
    if (isRecharge && isPending) return false;

    if (activeFilter === 'recharge' && !isRecharge) return false;
    if (activeFilter === 'withdraw' && !isWithdraw) return false;
    if (activeFilter === 'invest' && !isInvest) return false;
    if (activeFilter === 'profit' && !isProfit) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const idMatch = String(tx.id || tx.hash || '').toLowerCase().includes(q);
      const titleMatch = String(tx.title || tx.desc || '').toLowerCase().includes(q);
      return idMatch || titleMatch;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
          isDay
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#041a13] border-emerald-500/30 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between border-b ${
            isDay ? 'bg-slate-50 border-slate-200' : 'bg-[#031510] border-emerald-500/20'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                {isBn ? 'ওয়ালেট ট্রানজেকশন হিস্ট্রি' : 'Wallet Transaction History'}
              </h3>
              <p className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? 'আপনার সকল রিচার্জ, উইথড্র ও প্যাকেজ রেকর্ড' : 'All deposits, withdrawals & records'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              isDay
                ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className={`p-3 border-b flex items-center gap-1.5 overflow-x-auto ${
          isDay ? 'border-slate-200 bg-white' : 'border-emerald-500/15 bg-[#02130e]'
        }`}>
          {[
            { id: 'all', labelBn: 'সকল রেকর্ড', labelEn: 'All' },
            { id: 'recharge', labelBn: 'রিচার্জ/ডিপোজিট', labelEn: 'Deposit' },
            { id: 'withdraw', labelBn: 'উইথড্র', labelEn: 'Withdraw' },
            { id: 'invest', labelBn: 'প্যাকেজ/বিনিয়োগ', labelEn: 'Invest' },
            { id: 'profit', labelBn: 'প্রফিট/বোনাস', labelEn: 'Profit/Bonus' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black shadow-xs'
                  : isDay
                  ? 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  : 'bg-[#042017] text-slate-400 hover:text-white border border-emerald-500/20'
              }`}
            >
              {isBn ? tab.labelBn : tab.labelEn}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className={`px-4 py-2 border-b flex items-center gap-2 ${
          isDay ? 'border-slate-200 bg-slate-50/50' : 'border-emerald-500/15 bg-[#031510]'
        }`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isBn ? 'TrxID বা বিবরণ দিয়ে সার্চ করুন...' : 'Search by TrxID or note...'}
            className="w-full bg-transparent text-xs outline-hidden placeholder:text-slate-400"
          />
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[55vh]">
          {filteredList.length === 0 ? (
            <div className="text-center py-10">
              <History className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-50" />
              <p className="text-xs text-slate-400">
                {isBn ? 'কোনো ট্রানজেকশন পাওয়া যায়নি' : 'No transactions found'}
              </p>
            </div>
          ) : (
            filteredList.map((tx: any, idx: number) => {
              const rawType = String(tx.type || '').toLowerCase();
              const isInvest = rawType === 'investment' || rawType === 'invest' || rawType.includes('package');
              const isWithdraw = rawType === 'withdrawal' || rawType === 'withdraw' || rawType === 'payout';
              const isProfit = rawType === 'yield' || rawType === 'bonus' || rawType === 'reward' || rawType === 'profit';
              const isRecharge = !isInvest && !isWithdraw && !isProfit;

              const isDebit = isInvest || isWithdraw || (typeof tx.amount === 'number' ? tx.amount < 0 : String(tx.amount || '').startsWith('-'));
              const rawAmount = typeof tx.amount === 'number' ? Math.abs(tx.amount) : Math.abs(parseFloat(String(tx.amount || '0').replace(/[^\d.]/g, '')) || 0);

              const rawStatus = String(tx.status || '').toLowerCase();
              const isPending = rawStatus === 'pending' || rawStatus === 'অপেক্ষমাণ' || rawStatus === 'processing';
              const isCancelled = rawStatus === 'cancelled' || rawStatus === 'rejected' || rawStatus === 'failed';

              const txId = tx.id || tx.hash || `TRX-${idx}`;

              return (
                <div
                  key={txId + idx}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isDay
                      ? 'bg-slate-50 hover:bg-white border-slate-200'
                      : 'bg-[#031510] hover:bg-[#042017] border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isRecharge
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : isWithdraw
                          ? 'bg-amber-500/15 text-amber-400'
                          : isInvest
                          ? 'bg-cyan-500/15 text-cyan-400'
                          : 'bg-teal-500/15 text-teal-400'
                      }`}
                    >
                      {isRecharge ? (
                        <ArrowDownToLine className="w-5 h-5" />
                      ) : isWithdraw ? (
                        <ArrowUpFromLine className="w-5 h-5" />
                      ) : isInvest ? (
                        <TrendingUp className="w-5 h-5" />
                      ) : (
                        <Coins className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold truncate ${isDay ? 'text-slate-900' : 'text-white'}`}>
                          {tx.title || (isRecharge ? (isBn ? 'ওয়ালেট রিচার্জ' : 'Wallet Deposit') : isWithdraw ? (isBn ? 'উইথড্র' : 'Withdrawal') : (isBn ? 'প্যাকেজ বিনিয়োগ' : 'Package Invest'))}
                        </p>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                            isPending
                              ? 'bg-amber-500/20 text-amber-400'
                              : isCancelled
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {isPending ? (isBn ? 'অপেক্ষমাণ' : 'Pending') : isCancelled ? (isBn ? 'বাতিল' : 'Cancelled') : (isBn ? 'সফল' : 'Completed')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>{tx.time || tx.date || tx.timestamp || 'Recent'}</span>
                        <span>•</span>
                        <span className="font-mono">ID: {txId.slice(-8)}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(txId)}
                          className="hover:text-emerald-400 transition-colors"
                          title="Copy ID"
                        >
                          {copiedId === txId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-black font-mono ${
                        isDebit ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isDebit ? '-' : '+'}৳{rawAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {tx.channel || 'Wallet Balance'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3.5 border-t text-center ${
            isDay ? 'bg-slate-50 border-slate-200' : 'bg-[#031510] border-emerald-500/20'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
