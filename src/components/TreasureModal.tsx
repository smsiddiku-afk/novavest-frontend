import React, { useState, useEffect } from 'react';
import {
  X,
  Gift,
  Sparkles,
  Coins,
  Check,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  KeyRound,
  LockOpen,
} from 'lucide-react';
import { Language } from '../types';
import { db, safeDoc, safeSetDoc } from '../lib/firebase';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';

interface TreasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  userId?: string;
  memberId?: string;
  onClaimReward: (amount: number, description: string) => void;
  showToast: (msg: string) => void;
  onOpenProjectManager?: () => void;
}

export const TreasureModal: React.FC<TreasureModalProps> = ({
  isOpen,
  onClose,
  currentLang = 'bn',
  themeMode = 'night',
  userId = '',
  memberId = '',
  onClaimReward,
  showToast,
  onOpenProjectManager,
}) => {
  const isBn = currentLang === 'bn';
  const isDay = themeMode === 'day';

  const [activeTab, setActiveTab] = useState<'chest' | 'code'>('chest');
  const [isOpening, setIsOpening] = useState(false);
  const [openedReward, setOpenedReward] = useState<number | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Envelope (খাম) Bonus State
  const [unlockedEnvelope, setUnlockedEnvelope] = useState<{
    code: string;
    amount: number;
    description?: string;
  } | null>(null);
  const [isClaimingEnvelope, setIsClaimingEnvelope] = useState(false);

  // Daily Free Treasure State
  const activeUserKey = userId || memberId || 'guest_user';
  const todayKey = new Date().toISOString().split('T')[0];

  const [canOpenDaily, setCanOpenDaily] = useState<boolean>(() => {
    try {
      const claimedDate = localStorage.getItem(`nvt_treasure_daily_${activeUserKey}`);
      return claimedDate !== todayKey;
    } catch {
      return true;
    }
  });

  const [claimedCodes, setClaimedCodes] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`nvt_treasure_codes_${activeUserKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Check Firestore for user's treasure claims
  useEffect(() => {
    if (!activeUserKey) return;
    try {
      const userClaimRef = safeDoc('treasure_claims', `${activeUserKey}_${todayKey}`);
      if (userClaimRef) {
        getDoc(userClaimRef).then((snap) => {
          if (snap.exists()) {
            setCanOpenDaily(false);
          }
        }).catch(() => {});
      }
    } catch {}
  }, [activeUserKey, todayKey]);

  if (!isOpen) return null;

  // 1. Handle Daily Treasure Chest Open
  const handleOpenChest = () => {
    if (!canOpenDaily) {
      showToast(
        isBn
          ? 'আজকের দৈনিক ফ্রি ট্রেজার ইতিমধ্যে খোলা হয়েছে! আগামী কাল পুনরায় চেষ্টা করুন।'
          : 'Today\'s daily free treasure already claimed! Try again tomorrow.'
      );
      return;
    }

    setIsOpening(true);
    setOpenedReward(null);

    // Random reward strictly between ৳2 and ৳7
    const rewards = [2, 3, 4, 5, 6, 7];
    const winAmt = rewards[Math.floor(Math.random() * rewards.length)];

    setTimeout(() => {
      setIsOpening(false);
      setOpenedReward(winAmt);
      setCanOpenDaily(false);

      try {
        localStorage.setItem(`nvt_treasure_daily_${activeUserKey}`, todayKey);
      } catch {}

      // Cloud Firestore save
      try {
        const claimRef = safeDoc('treasure_claims', `${activeUserKey}_${todayKey}`);
        if (claimRef) {
          safeSetDoc(claimRef, {
            userId: activeUserKey,
            rewardAmount: winAmt,
            dateKey: todayKey,
            claimedAt: serverTimestamp(),
            type: 'daily_chest',
          }, { merge: true }).catch(() => {});
        }
      } catch {}

      // Credit wallet
      onClaimReward(
        winAmt,
        isBn
          ? `দৈনিক ফ্রি ট্রেজার ড্র রিওয়ার্ড (৳${winAmt})`
          : `Daily Free Treasure Reward (৳${winAmt})`
      );

      showToast(
        isBn
          ? `🎉 অভিনন্দন! ট্রেজার বক্স থেকে ৳${winAmt} ওয়ালেটে যোগ হয়েছে!`
          : `🎉 Congratulations! ৳${winAmt} from Treasure Box added to wallet!`
      );
    }, 1200);
  };

  // 2. Handle Treasure Promo / Gift Code Redeem
  const handleRedeemCode = async () => {
    const clean = redeemCode.trim().toUpperCase();
    if (!clean) {
      showToast(
        isBn
          ? 'দয়া করে একটি সঠিক রিডিম কোড লিখুন।'
          : 'Please enter a valid redeem code.'
      );
      return;
    }

    if (claimedCodes[clean]) {
      showToast(
        isBn
          ? 'এই রিডিম কোডটি আপনি ইতিমধ্যে ব্যবহার করেছেন!'
          : 'This redeem code has already been claimed by you!'
      );
      return;
    }

    setIsRedeeming(true);

    try {
      // 1. Check if user already claimed this code in Firestore
      const redRef = safeDoc('treasure_redemptions', `${activeUserKey}_${clean}`);
      if (redRef) {
        const redSnap = await getDoc(redRef).catch(() => null);
        if (redSnap && redSnap.exists()) {
          setIsRedeeming(false);
          const updated = { ...claimedCodes, [clean]: true };
          setClaimedCodes(updated);
          try {
            localStorage.setItem(`nvt_treasure_codes_${activeUserKey}`, JSON.stringify(updated));
          } catch {}
          showToast(
            isBn
              ? 'এই রিডিম কোডটি আপনি ইতিমধ্যে ব্যবহার করেছেন!'
              : 'This redeem code has already been claimed by you!'
          );
          return;
        }
      }

      // 2. Read live dynamic code from Firestore (No hardcoded codes so deleting from Admin Panel immediately disables the code)
      const codeDoc = safeDoc('treasure_codes', clean);
      let codeData: any = null;
      if (codeDoc) {
        const snap = await getDoc(codeDoc).catch(() => null);
        if (snap && snap.exists()) {
          codeData = snap.data();
        }
      }

      setIsRedeeming(false);

      if (!codeData || codeData.isActive === false) {
        showToast(
          isBn
            ? 'ভুল বা মেয়াদোত্তীর্ণ রিডিম কোড! সঠিক কোড পেতে প্রজেক্ট ম্যানেজারের সাথে যোগাযোগ করুন।'
            : 'Invalid or expired redeem code! Please contact project manager.'
        );
        return;
      }

      // 3. Calculate reward amount strictly in 10-12 Taka range (১০-১২ টাকা)
      let calculatedAmt = 11;
      const min = Number(codeData.minAmount) || 10;
      const max = Number(codeData.maxAmount) || 12;

      if (codeData.isRange || (codeData.minAmount && codeData.maxAmount)) {
        // Guaranteed random bonus strictly between 10 and 12 Taka
        const choices = [10, 11, 12].filter((n) => n >= min && n <= max);
        calculatedAmt =
          choices.length > 0
            ? choices[Math.floor(Math.random() * choices.length)]
            : Math.floor(Math.random() * (max - min + 1)) + min;
      } else if (Number(codeData.amount) > 0) {
        calculatedAmt = Number(codeData.amount);
      } else {
        const choices = [10, 11, 12];
        calculatedAmt = choices[Math.floor(Math.random() * choices.length)];
      }

      // 4. Open the beautiful Gift Envelope (খাম) with "ক্লাইম" button!
      setUnlockedEnvelope({
        code: clean,
        amount: calculatedAmt,
        description: codeData.description || (isBn ? 'দৈনিক লাকি রিডিম বোনাস' : 'Daily Lucky Redeem Bonus'),
      });
    } catch (err) {
      setIsRedeeming(false);
      console.error('[TreasureModal] Redeem error:', err);
      showToast(isBn ? 'কোড যাচাই করতে সমস্যা হয়েছে।' : 'Error verifying redeem code.');
    }
  };

  // 3. Handle Claiming the Envelope Bonus
  const handleClaimEnvelope = () => {
    if (!unlockedEnvelope || isClaimingEnvelope) return;

    setIsClaimingEnvelope(true);
    const { code, amount, description } = unlockedEnvelope;

    setTimeout(() => {
      const updated = { ...claimedCodes, [code]: true };
      setClaimedCodes(updated);
      try {
        localStorage.setItem(`nvt_treasure_codes_${activeUserKey}`, JSON.stringify(updated));
      } catch {}

      // Cloud record in Firestore
      try {
        const redRef = safeDoc('treasure_redemptions', `${activeUserKey}_${code}`);
        if (redRef) {
          safeSetDoc(
            redRef,
            {
              userId: activeUserKey,
              code,
              rewardAmount: amount,
              redeemedAt: serverTimestamp(),
            },
            { merge: true }
          ).catch(() => {});
        }
      } catch {}

      // Credit wallet balance
      onClaimReward(
        amount,
        isBn
          ? `ট্রেজার খাম বোনাস [${code}] (৳${amount})`
          : `Treasure Envelope Bonus [${code}] (৳${amount})`
      );

      setIsClaimingEnvelope(false);
      setUnlockedEnvelope(null);
      setRedeemCode('');

      showToast(
        isBn
          ? `🎉 অভিনন্দন! খাম থেকে ৳${amount} সফলভাবে ক্লাইম হয়েছে এবং আপনার ওয়ালেটে যোগ হয়েছে!`
          : `🎉 Congratulations! ৳${amount} from the gift envelope successfully added to your wallet!`
      );
    }, 700);
  };

  const fakeWinners = [
    { id: '1', user: 'NVT127***', amount: 5, time: isBn ? '২ মিনিট আগে' : '2m ago' },
    { id: '2', user: 'NVT809***', amount: 7, time: isBn ? '৫ মিনিট আগে' : '5m ago' },
    { id: '3', user: 'NVT160***', amount: 3, time: isBn ? '৯ মিনিট আগে' : '9m ago' },
    { id: '4', user: 'NVT442***', amount: 6, time: isBn ? '১২ মিনিট আগে' : '12m ago' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDay
            ? 'bg-white border-amber-200 text-slate-800'
            : 'bg-gradient-to-b from-[#063f33] via-[#042d24] to-[#021f18] border-amber-500/40 text-white shadow-emerald-950/60'
        }`}
      >
        {/* Top Header Bar */}
        <div className="relative px-5 pt-5 pb-3 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/30">
              <Gift className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
                  {isBn ? 'ট্রেজার বক্স ও লাকি রিওয়ার্ড' : 'Treasure Box & Rewards'}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[9px] font-bold text-amber-300">
                  HOT
                </span>
              </div>
              <p className="text-[10px] text-emerald-200/80">
                {isBn
                  ? 'দৈনিক ফ্রি ট্রেজার খুলুন অথবা রিডিম কোড দিন'
                  : 'Open daily free chest or redeem promo codes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-5 pt-3.5 pb-2">
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/40 border border-amber-500/25">
            <button
              type="button"
              onClick={() => setActiveTab('chest')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'chest'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'text-emerald-200/70 hover:text-white'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{isBn ? 'দৈনিক ট্রেজার বক্স' : 'Daily Chest'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 font-extrabold'
                  : 'text-emerald-200/70 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isBn ? 'ট্রেজার রিডিম কোড' : 'Redeem Code'}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="px-5 py-3 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'chest' ? (
            /* TAB 1: DAILY TREASURE CHEST */
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              {/* Animated 3D Treasure Chest Illustration */}
              <div className="relative w-40 h-40 flex items-center justify-center group">
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-yellow-400/30 rounded-full blur-xl animate-pulse pointer-events-none" />

                <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-[0_10px_20px_rgba(245,158,11,0.4)]">
                  <defs>
                    <linearGradient id="chestWood" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#78350f" />
                      <stop offset="50%" stopColor="#92400e" />
                      <stop offset="100%" stopColor="#451a03" />
                    </linearGradient>
                    <linearGradient id="chestGold" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fef08a" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#b45309" />
                    </linearGradient>
                  </defs>

                  {/* Golden Aura Glow */}
                  <circle cx="80" cy="85" r="50" fill="url(#chestGold)" opacity="0.15" />

                  {/* Chest Body Base */}
                  <rect x="35" y="75" width="90" height="50" rx="10" fill="url(#chestWood)" stroke="url(#chestGold)" strokeWidth="3" />
                  <rect x="42" y="80" width="76" height="40" rx="6" fill="#451a03" opacity="0.4" />

                  {/* Chest Lid / Cover */}
                  <path
                    d={
                      isOpening || openedReward !== null
                        ? "M 32 50 C 32 30, 128 30, 128 50 L 132 65 L 28 65 Z"
                        : "M 30 75 C 30 50, 130 50, 130 75 Z"
                    }
                    fill="url(#chestWood)"
                    stroke="url(#chestGold)"
                    strokeWidth="3.5"
                    className="transition-all duration-500"
                  />

                  {/* Golden Metal Bands */}
                  <rect x="48" y="75" width="10" height="50" fill="url(#chestGold)" />
                  <rect x="102" y="75" width="10" height="50" fill="url(#chestGold)" />

                  {/* Gold Lock Mechanism */}
                  <circle cx="80" cy="82" r="10" fill="url(#chestGold)" stroke="#78350f" strokeWidth="1.5" />
                  <circle cx="80" cy="82" r="4" fill="#451a03" />
                  <rect x="78" y="82" width="4" height="6" fill="#451a03" />

                  {/* Sparkles Floating */}
                  {(isOpening || openedReward !== null) && (
                    <>
                      <circle cx="45" cy="40" r="3" fill="#fef08a" className="animate-ping" />
                      <circle cx="115" cy="45" r="2.5" fill="#fef08a" className="animate-ping" />
                      <circle cx="80" cy="30" r="4" fill="#fef08a" className="animate-bounce" />
                    </>
                  )}
                </svg>
              </div>

              {/* Status or Reward Display */}
              {openedReward !== null ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-center animate-in zoom-in duration-300 w-full">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                    {isBn ? '🎉 আপনি জিতেছেন' : '🎉 You Won'}
                  </span>
                  <div className="text-3xl font-black text-amber-400 font-mono my-1">
                    ৳{openedReward.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-300 font-medium">
                    {isBn
                      ? 'টাকা সরাসরি আপনার ওয়ালেট ব্যালেন্সে যুক্ত হয়েছে!'
                      : 'Cash added directly to your main balance!'}
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-white">
                    {canOpenDaily
                      ? (isBn ? '🎁 দৈনিক ফ্রি ট্রেজার প্রস্তুত!' : '🎁 Daily Free Chest Ready!')
                      : (isBn ? '⏳ আজকের ড্র সম্পন্ন হয়েছে' : '⏳ Claimed for Today')}
                  </h4>
                  <p className="text-[11px] text-emerald-200/80 max-w-xs">
                    {canOpenDaily
                      ? (isBn
                          ? 'প্রতিদিন ১টি ফ্রি ট্রেজার ড্র করুন এবং জিতে নিন ২ থেকে ৭ টাকা পর্যন্ত নিশ্চিত ক্যাশ বোনাস।'
                          : 'Draw 1 free treasure chest daily to win ৳2 to ৳7 guaranteed cash rewards.')
                      : (isBn
                          ? 'আপনি আজকের ফ্রি ট্রেজার ইতিমধ্যে পেয়েছেন। পরবর্তী ড্র আগামী কাল আনলক হবে।'
                          : 'You have already opened today\'s free chest. Unlock next draw tomorrow.')}
                  </p>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                id="open-treasure-chest-btn"
                onClick={handleOpenChest}
                disabled={!canOpenDaily || isOpening}
                className={`w-full py-3 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 cursor-pointer ${
                  canOpenDaily && !isOpening
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/30 animate-pulse'
                    : 'bg-[#03261f] text-emerald-400/50 border border-[#0d614f] cursor-not-allowed opacity-80'
                }`}
              >
                {isOpening ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                    <span>{isBn ? 'ট্রেজার বক্স খোলা হচ্ছে...' : 'Opening Chest...'}</span>
                  </>
                ) : canOpenDaily ? (
                  <>
                    <LockOpen className="w-4 h-4 text-slate-950" />
                    <span>{isBn ? 'ট্রেজার বক্স খুলুন (ফ্রি)' : 'Open Treasure Box (Free)'}</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>{isBn ? 'আজকে ইতিমধ্যে ড্র করা হয়েছে' : 'Already Claimed Today'}</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* TAB 2: REDEEM PROMO / TREASURE CODE */
            <div className="space-y-4 py-2">
              {/* UNLOCKED GIFT ENVELOPE (🧧 সুন্দর খাম আকারে বোনাস ও ক্লাইম বাটন) */}
              {unlockedEnvelope ? (
                <div className="p-4 rounded-3xl bg-gradient-to-b from-[#7f1d1d] via-[#991b1b] to-[#450a0a] border-2 border-amber-400/80 shadow-2xl shadow-red-950/80 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
                  {/* Shimmering Aura */}
                  <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-400/25 rounded-full blur-2xl pointer-events-none animate-pulse" />
                  <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-yellow-500/25 rounded-full blur-2xl pointer-events-none animate-pulse" />

                  {/* Header Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isBn ? '🧧 লাকি গিফট খাম আনলক হয়েছে!' : '🧧 Lucky Gift Envelope Unlocked!'}</span>
                  </div>

                  {/* SVG Envelope Graphic (খাম) */}
                  <div className="relative w-44 h-36 mx-auto my-1 flex items-center justify-center">
                    <svg viewBox="0 0 160 130" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">
                      <defs>
                        <linearGradient id="envRed" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#dc2626" />
                          <stop offset="100%" stopColor="#991b1b" />
                        </linearGradient>
                        <linearGradient id="envGold" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#b45309" />
                        </linearGradient>
                      </defs>

                      {/* Envelope Back Body */}
                      <rect x="15" y="30" width="130" height="90" rx="8" fill="url(#envRed)" stroke="url(#envGold)" strokeWidth="2.5" />

                      {/* Cash Voucher sliding out of flap */}
                      <rect x="25" y="14" width="110" height="60" rx="6" fill="#fef08a" stroke="#f59e0b" strokeWidth="2" className="animate-bounce" />
                      <circle cx="80" cy="40" r="14" fill="#f59e0b" />
                      <text x="80" y="45" textAnchor="middle" fill="#78350f" fontSize="13" fontWeight="900" fontFamily="sans-serif">৳</text>

                      {/* Envelope Bottom Triangle Flaps */}
                      <path d="M 15 120 L 80 75 L 145 120 Z" fill="#b91c1c" opacity="0.9" />
                      <path d="M 15 30 L 80 75 L 145 30" fill="none" stroke="url(#envGold)" strokeWidth="2" />

                      {/* Golden Seal Emblem */}
                      <circle cx="80" cy="75" r="14" fill="url(#envGold)" stroke="#78350f" strokeWidth="1.5" />
                      <text x="80" y="80" textAnchor="middle" fill="#451a03" fontSize="12" fontWeight="900" fontFamily="sans-serif">NVT</text>
                    </svg>
                  </div>

                  {/* Bonus Amount Display */}
                  <div className="space-y-1 mb-3">
                    <span className="text-[11px] font-bold text-amber-200 uppercase tracking-widest block">
                      {isBn ? 'আপনার প্রাপ্ত খাম বোনাস:' : 'Your Envelope Reward:'}
                    </span>
                    <div className="text-3xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      ৳{unlockedEnvelope.amount}.00
                    </div>
                    <p className="text-[11px] text-emerald-200/90 font-medium max-w-xs mx-auto">
                      {isBn
                        ? `কোড [${unlockedEnvelope.code}] থেকে বরাদ্দকৃত বোনাস। এখনই ক্লাইম করে মূল ব্যালেন্সে যুক্ত করুন!`
                        : `Bonus assigned from code [${unlockedEnvelope.code}]. Claim now to add to your main balance!`}
                    </p>
                  </div>

                  {/* CLAIM BUTTON (ক্লাইম বাটন) */}
                  <button
                    type="button"
                    id="claim-envelope-btn"
                    onClick={handleClaimEnvelope}
                    disabled={isClaimingEnvelope}
                    className="w-full py-3 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-500/30 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 cursor-pointer active:scale-95 animate-pulse"
                  >
                    {isClaimingEnvelope ? (
                      <>
                        <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                        <span>{isBn ? 'ক্লাইম হচ্ছে...' : 'Claiming...'}</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 text-slate-950" />
                        <span>{isBn ? '🎁 ক্লাইম করুন (Claim Now)' : '🎁 Claim Now'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setUnlockedEnvelope(null)}
                    className="mt-2 text-[10px] text-amber-200/70 hover:text-white underline cursor-pointer"
                  >
                    {isBn ? 'বাতিল করুন' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-black/30 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-400/20 flex items-center justify-center text-amber-300">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white">
                      {isBn ? 'ট্রেজার রিডিম কোড দিন' : 'Enter Treasure Code'}
                    </h4>
                  </div>
                  <p className="text-[10px] text-emerald-200/80 leading-relaxed">
                    {isBn
                      ? 'আমাদের অফিসিয়াল টেলিগ্রাম চ্যানেল বা প্রজেক্ট ম্যানেজারের দেওয়া ট্রেজার কোড দিয়ে সাথে সাথে নগদ বোনাস লুফে নিন।'
                      : 'Enter official promo codes distributed by management to claim instant wallet cash.'}
                  </p>

                  {/* Input box */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={redeemCode}
                      onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                      placeholder={isBn ? 'ট্রেজার রিডিম কোড লিখুন' : 'Enter treasure code'}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#021f18] border border-emerald-500/40 text-amber-300 placeholder-slate-500 font-mono text-xs sm:text-sm font-bold tracking-widest focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    id="redeem-treasure-code-btn"
                    onClick={handleRedeemCode}
                    disabled={isRedeeming || !redeemCode.trim()}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer ${
                      redeemCode.trim() && !isRedeeming
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold shadow-amber-500/25'
                        : 'bg-[#03261f] text-emerald-400/40 border border-[#0d614f] cursor-not-allowed opacity-75'
                    }`}
                  >
                    {isRedeeming ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>{isBn ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        <span>{isBn ? 'ট্রেজার রিডিম করুন' : 'Redeem Treasure'}</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Manager Assistance Link */}
              {onOpenProjectManager && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenProjectManager();
                    }}
                    className="text-[11px] text-emerald-300 hover:text-amber-300 underline font-medium cursor-pointer"
                  >
                    {isBn
                      ? 'ট্রেজার কোড পেতে প্রজেক্ট ম্যানেজারের সাথে কথা বলুন'
                      : 'Contact Project Manager for exclusive Treasure codes'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live Recent Winners Feed */}
          <div className="p-3 rounded-2xl bg-black/40 border border-[#0d614f]/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{isBn ? 'লাইভ ট্রেজার বিজয়ী' : 'Live Winners Feed'}</span>
              </span>
              <span className="text-[9px] text-emerald-400/70 font-mono">
                {isBn ? 'সরাসরি ওয়ালেটে' : 'Paid to Wallet'}
              </span>
            </div>

            <div className="space-y-1.5">
              {fakeWinners.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between text-[10px] py-0.5 border-b border-white/5 last:border-b-0"
                >
                  <span className="font-mono text-slate-300 font-semibold">{w.user}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 font-mono">+৳{w.amount}</span>
                    <span className="text-[9px] text-slate-400">{w.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Footer Close */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
