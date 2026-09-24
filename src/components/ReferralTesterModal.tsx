import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  CheckCircle2,
  AlertCircle,
  Crown,
  Sparkles,
  ArrowRight,
  TrendingUp,
  UserPlus,
  RefreshCw,
  Trash2,
  Zap,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  getReferralTreeForUser,
  addTestReferralMember,
  addThreeActiveTestMembers,
  clearTestReferralMembers,
  ReferralTreeSummary,
} from '../utils/referralService';
import { Language } from '../types';

interface ReferralTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCode: string;
  userMemberId?: string;
  currentLang?: Language;
  onUpdated?: () => void;
  showToast?: (msg: string) => void;
}

export const ReferralTesterModal: React.FC<ReferralTesterModalProps> = ({
  isOpen,
  onClose,
  userCode,
  userMemberId,
  currentLang = 'bn',
  onUpdated,
  showToast,
}) => {
  const isBn = currentLang === 'bn';
  const [refreshTick, setRefreshTick] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<'all' | '1' | '2' | '3'>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Custom Form state
  const [customPhone, setCustomPhone] = useState('');
  const [customName, setCustomName] = useState('');
  const [customLevel, setCustomLevel] = useState<1 | 2 | 3>(1);
  const [customIsActive, setCustomIsActive] = useState(true);

  // Compute live referral tree
  const tree: ReferralTreeSummary = useMemo(() => {
    return getReferralTreeForUser(userCode, userMemberId);
  }, [userCode, userMemberId, refreshTick]);

  if (!isOpen) return null;

  const totalActive = tree.totalActiveCount || 0;
  const isVip1Unlocked = totalActive >= 3;

  const handleAddLevelMember = async (level: 1 | 2 | 3, isActive: boolean = true) => {
    setIsProcessing(true);
    try {
      const res = await addTestReferralMember({
        rootCode: userCode,
        rootMemberId: userMemberId,
        level,
        isActive,
        depositAmount: isActive ? 1200 : 0,
      });
      setRefreshTick((t) => t + 1);
      if (onUpdated) onUpdated();
      if (showToast) {
        showToast(
          isBn
            ? `${level}ম লেভেলে ${isActive ? 'সক্রিয়' : 'অপেক্ষমাণ'} সদস্য সফলভাবে যুক্ত হয়েছে!`
            : `Level ${level} ${isActive ? 'Active' : 'Pending'} member added!`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddThreeActive = async () => {
    setIsProcessing(true);
    try {
      await addThreeActiveTestMembers(userCode, userMemberId);
      setRefreshTick((t) => t + 1);
      if (onUpdated) onUpdated();
      if (showToast) {
        showToast(
          isBn
            ? '৩ লেভেলে ৩ জন সক্রিয় সদস্য যুক্ত হয়েছে! VIP 1 সফলভাবে আনলক হয়েছে।'
            : '3 active members added across levels! VIP 1 unlocked!'
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearTestMembers = () => {
    clearTestReferralMembers(userCode, userMemberId);
    setRefreshTick((t) => t + 1);
    if (onUpdated) onUpdated();
    if (showToast) {
      showToast(isBn ? 'সব টেস্ট সদস্য রিসেট করা হয়েছে।' : 'Test members cleared.');
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await addTestReferralMember({
        rootCode: userCode,
        rootMemberId: userMemberId,
        level: customLevel,
        isActive: customIsActive,
        phone: customPhone.trim() || undefined,
        username: customName.trim() || undefined,
        depositAmount: customIsActive ? 1200 : 0,
      });
      setCustomPhone('');
      setCustomName('');
      setShowCustomForm(false);
      setRefreshTick((t) => t + 1);
      if (onUpdated) onUpdated();
      if (showToast) {
        showToast(
          isBn
            ? `${customLevel}ম লেভেলে সদস্য সফলভাবে যুক্ত হয়েছে!`
            : `Level ${customLevel} member registered successfully!`
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMembers = tree.members.filter((m) => {
    if (selectedLevelFilter === 'all') return true;
    return m.level === Number(selectedLevelFilter);
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-[#042018] border border-emerald-500/40 shadow-2xl shadow-emerald-950/60 overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-emerald-500/20 bg-gradient-to-r from-[#063327] to-[#042018] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isBn ? '৩ লেভেল রেফার চেকার' : '3-Level Referral Checker'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Preview Test
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {isBn ? 'লেভেল ১, ২ ও ৩ এবং VIP 1 যাচাই করুন' : 'Verify Level 1, 2, 3 & VIP 1 status'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 no-scrollbar text-xs sm:text-sm">
          {/* 1. VIP 1 Requirement Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isVip1Unlocked
                ? 'bg-gradient-to-r from-[#073629] to-[#0a4d3b] border-amber-400/50 shadow-lg shadow-amber-900/20'
                : 'bg-[#062c22] border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  isVip1Unlocked
                    ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                    : 'bg-slate-700/50 border border-slate-600/40 text-slate-400'
                }`}>
                  <Crown className={`w-4 h-4 ${isVip1Unlocked ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">
                    {isBn ? 'ভিআইপি ১ (VIP 1) স্ট্যাটাস' : 'VIP 1 Status'}
                  </span>
                  <span className="text-[11px] text-slate-300">
                    {isBn
                      ? 'শর্ত: প্রমোশন অপশন থেকে ৩ জন লেভেলে সক্রিয় থাকতে হবে'
                      : 'Rule: Requires 3 active members across promotion levels'}
                  </span>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black border tracking-wide uppercase ${
                  isVip1Unlocked
                    ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-sm animate-pulse'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
              >
                {isVip1Unlocked ? (isBn ? 'VIP 1 সক্রিয় 🎉' : 'VIP 1 ACTIVE') : (isBn ? 'VIP 0 (লক)' : 'VIP 0 (LOCKED)')}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  {isBn ? 'সক্রিয় সদস্য সংখ্যা:' : 'Active members in levels:'}
                </span>
                <span className="font-mono font-bold text-emerald-300">
                  {totalActive} / 3 {isBn ? 'জন' : 'members'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-[#021810] overflow-hidden border border-emerald-500/20 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isVip1Unlocked
                      ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min((totalActive / 3) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5">
                {isVip1Unlocked
                  ? (isBn
                      ? '✓ অভিনন্দন! আপনার ৩ জন সদস্য সক্রিয় থাকায় প্রোফাইল ও ইনভেস্টে VIP 1 দৃশ্যমান হয়েছে।'
                      : '✓ Goal met! VIP 1 is now visible in your Profile & Invest tabs.')
                  : (isBn
                      ? `⚠️ ভিআইপি ১ শো হওয়ার জন্য এখনও ${Math.max(3 - totalActive, 0)} জন সক্রিয় সদস্য বাকি রয়েছে।`
                      : `⚠️ Need ${Math.max(3 - totalActive, 0)} more active member(s) to unlock VIP 1.`)}
              </p>
            </div>
          </div>

          {/* 2. 3-Level Quick Status Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Level 1 */}
            <div className="p-3 rounded-2xl bg-[#062c22] border border-emerald-500/30 text-center space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 block">
                {isBn ? '১ম লেভেল' : 'Level 1'}
              </span>
              <span className="text-[10px] text-slate-400 block">{isBn ? 'সরাসরি (৬%)' : 'Direct (6%)'}</span>
              <div className="font-mono text-lg font-black text-white">
                {tree.level1Count} <span className="text-xs font-normal text-slate-400">জন</span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                {isBn ? `সক্রিয়: ${tree.activeLevel1Count}` : `Active: ${tree.activeLevel1Count}`}
              </span>
            </div>

            {/* Level 2 */}
            <div className="p-3 rounded-2xl bg-[#062c22] border border-emerald-500/30 text-center space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 block">
                {isBn ? '২য় লেভেল' : 'Level 2'}
              </span>
              <span className="text-[10px] text-slate-400 block">{isBn ? 'সাব-টিম (৩%)' : 'Sub-team (3%)'}</span>
              <div className="font-mono text-lg font-black text-white">
                {tree.level2Count} <span className="text-xs font-normal text-slate-400">জন</span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                {isBn ? `সক্রিয়: ${tree.activeLevel2Count}` : `Active: ${tree.activeLevel2Count}`}
              </span>
            </div>

            {/* Level 3 */}
            <div className="p-3 rounded-2xl bg-[#062c22] border border-emerald-500/30 text-center space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 block">
                {isBn ? '৩য় লেভেল' : 'Level 3'}
              </span>
              <span className="text-[10px] text-slate-400 block">{isBn ? 'নেটওয়ার্ক (১%)' : 'Network (1%)'}</span>
              <div className="font-mono text-lg font-black text-white">
                {tree.level3Count} <span className="text-xs font-normal text-slate-400">জন</span>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/25">
                {isBn ? `সক্রিয়: ${tree.activeLevel3Count}` : `Active: ${tree.activeLevel3Count}`}
              </span>
            </div>
          </div>

          {/* 3. Fast Test Buttons */}
          <div className="p-3.5 rounded-2xl bg-[#031d16] border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isBn ? 'তাৎক্ষণিক টেস্ট অ্যাকশন' : 'Instant Test Actions'}</span>
              </span>
              <button
                type="button"
                onClick={handleClearTestMembers}
                className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Clear Test Referrals"
              >
                <Trash2 className="w-3 h-3" />
                <span>{isBn ? 'টেস্ট রিসেট' : 'Reset Tests'}</span>
              </button>
            </div>

            {/* 1-Click VIP 1 Unlock Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleAddThreeActive}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-teal-400 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 cursor-pointer active:scale-98 transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>
                {isBn
                  ? '⚡ ১-ক্লিকে ৩ জন সক্রিয় মেম্বার যোগ (VIP 1 টেস্ট)'
                  : '⚡ 1-Click: Add 3 Active Members (Test VIP 1)'}
              </span>
            </button>

            {/* Individual Level Add Buttons */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAddLevelMember(1, true)}
                className="py-2 px-2 rounded-xl bg-[#063327] hover:bg-[#084534] border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              >
                <span>+ ১ম লেভেল</span>
                <span className="text-[9px] text-slate-400 font-normal">সক্রিয় (৳১২০০)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAddLevelMember(2, true)}
                className="py-2 px-2 rounded-xl bg-[#063327] hover:bg-[#084534] border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              >
                <span>+ ২য় লেভেল</span>
                <span className="text-[9px] text-slate-400 font-normal">সক্রিয় (৳১২০০)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAddLevelMember(3, true)}
                className="py-2 px-2 rounded-xl bg-[#063327] hover:bg-[#084534] border border-emerald-500/30 text-emerald-300 font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              >
                <span>+ ৩য় লেভেল</span>
                <span className="text-[9px] text-slate-400 font-normal">সক্রিয় (৳১২০০)</span>
              </button>
            </div>

            {/* Add Pending Member Button */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleAddLevelMember(1, false)}
              className="w-full py-1.5 px-3 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {isBn
                  ? '+ নিষ্ক্রিয় (Pending) মেম্বার যোগ (যাচাই করুন এটি VIP 1-এ যুক্ত হয় না)'
                  : '+ Add Inactive (Pending) Member (Verify it does NOT count towards VIP 1)'}
              </span>
            </button>
          </div>

          {/* 4. Custom Member Generator Toggle */}
          <div className="rounded-2xl border border-emerald-500/25 bg-[#031d16] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="w-full p-3 flex items-center justify-between text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span>{isBn ? 'কাস্টম সদস্য নিবন্ধন টেস্ট ফর্ম' : 'Custom Member Register Form'}</span>
              </span>
              {showCustomForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showCustomForm && (
              <form onSubmit={handleCustomSubmit} className="p-3 pt-0 space-y-2.5 border-t border-emerald-500/15">
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1">
                      {isBn ? 'টার্গেট লেভেল:' : 'Target Level:'}
                    </label>
                    <select
                      value={customLevel}
                      onChange={(e) => setCustomLevel(Number(e.target.value) as 1 | 2 | 3)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#04241b] border border-emerald-500/30 text-white text-xs"
                    >
                      <option value={1}>{isBn ? '১ম লেভেল (Direct)' : 'Level 1 (Direct)'}</option>
                      <option value={2}>{isBn ? '২য় লেভেল (Sub-team)' : 'Level 2 (Sub-team)'}</option>
                      <option value={3}>{isBn ? '৩য় লেভেল (Network)' : 'Level 3 (Network)'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-300 block mb-1">
                      {isBn ? 'স্ট্যাটাস:' : 'Status:'}
                    </label>
                    <select
                      value={customIsActive ? 'active' : 'pending'}
                      onChange={(e) => setCustomIsActive(e.target.value === 'active')}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#04241b] border border-emerald-500/30 text-white text-xs"
                    >
                      <option value="active">{isBn ? 'সক্রিয় (৳১২০০ ইনভেস্ট)' : 'Active (৳1200 deposit)'}</option>
                      <option value="pending">{isBn ? 'অপেক্ষমাণ (৳০)' : 'Pending (৳0)'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">
                    {isBn ? 'মোবাইল নম্বর (ঐচ্ছিক):' : 'Phone Number (Optional):'}
                  </label>
                  <input
                    type="text"
                    placeholder="01712345678"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#04241b] border border-emerald-500/30 text-white text-xs font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer active:scale-98 transition-all"
                >
                  {isBn ? 'নেটওয়ার্কে যুক্ত করুন' : 'Register to Network'}
                </button>
              </form>
            )}
          </div>

          {/* 5. Live Members List by Level */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                {isBn ? 'টিম সদস্যদের তালিকা' : 'Team Members List'} ({tree.members.length})
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('all')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    selectedLevelFilter === 'all'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('1')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    selectedLevelFilter === '1'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  L1
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('2')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    selectedLevelFilter === '2'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  L2
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLevelFilter('3')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    selectedLevelFilter === '3'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  L3
                </button>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="py-6 text-center text-slate-400 bg-[#031d16] rounded-xl border border-emerald-500/20 space-y-1">
                <Users className="w-6 h-6 mx-auto text-slate-500 opacity-60" />
                <p className="text-xs">
                  {isBn ? 'এই লেভেলে কোনো সদস্য যুক্ত হয়নি।' : 'No members found in this level.'}
                </p>
                <p className="text-[11px] text-emerald-400">
                  {isBn ? 'উপরের বাটন দিয়ে টেস্ট সদস্য যোগ করুন!' : 'Use test buttons above to add members!'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1 no-scrollbar">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-[#031d16] border border-emerald-500/20 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          m.level === 1
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : m.level === 2
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        L{m.level}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-white truncate">{m.phone}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({m.referralCode || 'N/A'})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {m.referredByName ? `আমন্ত্রক: ${m.referredByName}` : `আমন্ত্রক কোড: ${m.referredBy || 'Direct'}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {m.status === 'active' ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'অপেক্ষমাণ' : 'Pending')}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {isBn ? `কমিশন: ৳${m.commissionEarned}` : `Comm: ৳${m.commissionEarned}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-emerald-500/20 bg-[#031d16] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-300">
            <span>{isBn ? 'মোট সদস্য:' : 'Total Team:'} </span>
            <span className="font-bold text-white">{tree.totalTeamCount}</span>
            <span className="mx-1.5">|</span>
            <span>{isBn ? 'সক্রিয়:' : 'Active:'} </span>
            <span className="font-bold text-emerald-300">{tree.totalActiveCount}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer active:scale-95 transition-all"
          >
            {isBn ? 'সম্পন্ন / বন্ধ করুন' : 'Done / Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
