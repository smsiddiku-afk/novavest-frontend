import React, { useState, useEffect } from 'react';
import { scrollAppToTop } from '../utils/scrollHelper';
import {
  ChevronLeft,
  Bell,
  User,
  ShieldCheck,
  Copy,
  Check,
  Pencil,
  Wallet,
  ChevronRight,
  Shield,
  CreditCard,
  Package,
  LogOut,
  Home,
  TrendingUp,
  ArrowLeftRight,
  X,
  Wifi,
  Battery,
  QrCode,
  KeyRound,
  Users,
  Radio,
  Calendar,
  Sparkles,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowDownToLine,
  ArrowUpFromLine,
  Smartphone,
  Building2,
  Award,
  Zap,
  Leaf,
  Headphones,
  Info,
  MapPin,
  PhoneCall,
  Mail,
  Globe,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw,
  Sun,
  Moon,
  Mic,
  Gift,
  Crown,
  Coins,
  ChevronDown,
} from 'lucide-react';
import { AppDownloadModal } from './AppDownloadModal';
import { EnergyHomeTab } from './EnergyHomeTab';
import { InvestTabContent, INVESTMENT_PLANS } from './InvestTabContent';
import { TransactionsTabContent } from './TransactionsTabContent';
import { WalletTabContent } from './WalletTabContent';
import { ReferralPage } from './ReferralPage';
import { AddWalletPaymentModal } from './AddWalletPaymentModal';
import { SecuritySettingsPage } from './SecuritySettingsPage';
import { WithdrawModal } from './WithdrawModal';
import { CompanyProfileModal } from './CompanyProfileModal';
import { DepositModal } from './DepositModal';
import { SpinningLogo } from './SpinningLogo';
import { UserProfile, Language } from '../types';
import { ENERGY_PACKAGES_7 } from '../data/energyPackages';
import { translations } from '../utils/translations';
import { persistAuthUser, isSameUser } from '../utils/authService';
import { distributeReferralDepositCommissions } from '../utils/referralService';
import {
  recordFirestoreDeposit,
  updateFirestoreDepositStatus,
  isValidRealTrxId,
  getFirestoreUserTransactions,
  subscribeToUserTransactions,
  recordInvestmentInFirestore,
  getFirestoreUserInvestments,
  updateFirestoreWalletBalance,
  auth,
} from '../lib/firebase';
import { ManualDepositDetails, PaymentChannelType } from './CleanWalletScreen';

interface ProfilePageProps {
  initialUser?: Partial<UserProfile>;
  initialTab?: 'home' | 'invest' | 'transactions' | 'wallet' | 'referral' | 'profile';
  currentLang?: Language;
  onToggleLang?: (lang: Language) => void;
  onNavigateBack: () => void;
  onLogout: () => void;
  onGoToHome?: () => void;
  onTabChange?: (tab: 'home' | 'invest' | 'transactions' | 'wallet' | 'referral' | 'profile') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  initialUser,
  initialTab = 'home',
  currentLang = 'en',
  onToggleLang,
  onNavigateBack,
  onLogout,
  onGoToHome,
  onTabChange,
}) => {
  const t = translations[currentLang];

  // Day / Night Theme Mode ('night' | 'day')
  const [themeMode, setThemeMode] = useState<'night' | 'day'>(() => {
    try {
      const saved = localStorage.getItem('app_theme_mode');
      return saved === 'day' ? 'day' : 'night';
    } catch {
      return 'night';
    }
  });

  const handleToggleTheme = (mode: 'night' | 'day') => {
    setThemeMode(mode);
    try {
      localStorage.setItem('app_theme_mode', mode);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    try {
      const rootShell = document.getElementById('app-root-shell');
      if (themeMode === 'day') {
        document.documentElement.classList.add('day-mode');
        document.body.style.backgroundColor = '#f4f6fb';
        if (rootShell) {
          rootShell.style.backgroundColor = '#f4f6fb';
        }
      } else {
        document.documentElement.classList.remove('day-mode');
        document.body.style.backgroundColor = '#050811';
        if (rootShell) {
          rootShell.style.backgroundColor = '#050811';
        }
      }
    } catch {
      // ignore
    }
  }, [themeMode]);

  // User profile state
  const [user, setUser] = useState<UserProfile>(() => {
    const fallbackMemberId = 'NVT440912';
    const activeId = initialUser?.uid || initialUser?.memberId || fallbackMemberId;
    let savedInvestments: any[] = [];
    try {
      const stored = localStorage.getItem(`user_investments_${activeId}`);
      if (stored) savedInvestments = JSON.parse(stored);
    } catch {
      // ignore
    }

    let savedTransactions: any[] = [];
    try {
      const storedTx = localStorage.getItem(`user_transactions_${activeId}`);
      if (storedTx) savedTransactions = JSON.parse(storedTx);
    } catch {
      // ignore
    }

    // Determine initial real VIP level and active units
    const activeUnits = initialUser?.activeUnits ?? savedInvestments.length;
    let maxVip = 0;
    if (savedInvestments.length > 0) {
      maxVip = Math.max(...savedInvestments.map((inv) => inv.vipLevel || 0), 0);
    }
    // VIP is strictly VIP 0 until VIP 1 is unlocked
    const hasVip1OrHigher = (initialUser?.vipLevel !== undefined && initialUser.vipLevel >= 1) || maxVip >= 1;
    const realVip = hasVip1OrHigher ? (initialUser?.vipLevel !== undefined && initialUser.vipLevel >= 1 ? initialUser.vipLevel : maxVip) : 0;

    const realTotalEarnings = initialUser?.totalEarnings ?? (
      savedInvestments.reduce((acc, curr) => acc + (curr.totalEarned || 0), 0)
    );

    const realDailyRewards = initialUser?.dailyRewards ?? (
      savedInvestments.length > 0
        ? savedInvestments.reduce((acc, curr) => acc + (curr.dailyYield || 0), 0)
        : 0.0
    );

    const rawName = initialUser?.name || '';
    const cleanName = rawName && rawName !== 'NVT Member' ? rawName : 'Rased';

    return {
      uid: initialUser?.uid,
      name: cleanName,
      memberId: initialUser?.memberId || fallbackMemberId,
      referralCode: initialUser?.referralCode || (initialUser?.memberId ? initialUser.memberId.slice(-6).toUpperCase() : fallbackMemberId.slice(-6).toUpperCase()),
      referredBy: initialUser?.referredBy,
      memberSince: initialUser?.memberSince || 'Sep 2026',
      isVerified: initialUser?.isVerified ?? true,
      walletBalance:
        typeof initialUser?.walletBalance === 'number' && initialUser.walletBalance !== 12450.0
          ? initialUser.walletBalance
          : 0.0,
      phone: initialUser?.phone || '',
      email: initialUser?.email || '',
      vipLevel: realVip,
      totalEarnings: realTotalEarnings,
      activeUnits: activeUnits,
      dailyRewards: realDailyRewards,
      activeInvestments: initialUser?.activeInvestments || savedInvestments,
      transactions: (initialUser?.transactions && initialUser.transactions.length > 0)
        ? initialUser.transactions
        : savedTransactions,
    };
  });

  // Explicit user update helper: persists data safely without triggering reactive cascading loops
  const updateUser = (updater: (prev: UserProfile) => UserProfile) => {
    setUser((prev) => {
      const next = updater(prev);
      if (!isSameUser(prev, next)) {
        persistAuthUser(next);
      }
      try {
        const activeId = next.uid || next.memberId;
        if (activeId && next.transactions) {
          localStorage.setItem(`user_transactions_${activeId}`, JSON.stringify(next.transactions));
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keep user profile state in sync with initialUser prop only when actually changed,
  // scheduled on animation frame / microtask to prevent concurrent render-phase collision
  useEffect(() => {
    if (!initialUser) return;

    let isMounted = true;
    const handle = requestAnimationFrame(() => {
      if (!isMounted) return;
      setUser((prev) => {
        const newName = initialUser.name ?? prev.name;
        const newPhone = initialUser.phone ?? prev.phone;
        const newEmail = initialUser.email ?? prev.email;
        const newMemberId = initialUser.memberId ?? prev.memberId;
        const newBalance = initialUser.walletBalance ?? prev.walletBalance;
        const newMemberSince = initialUser.memberSince ?? prev.memberSince;
        const newIsVerified = initialUser.isVerified ?? prev.isVerified;
        const newTransactions = initialUser.transactions ?? prev.transactions;
        const newVipLevel = initialUser.vipLevel ?? prev.vipLevel;
        const newTotalEarnings = initialUser.totalEarnings ?? prev.totalEarnings;
        const newActiveUnits = initialUser.activeUnits ?? prev.activeUnits;
        const newDailyRewards = initialUser.dailyRewards ?? prev.dailyRewards;
        const newInvestments = initialUser.activeInvestments ?? prev.activeInvestments;

        if (
          prev.name === newName &&
          prev.phone === newPhone &&
          prev.email === newEmail &&
          prev.memberId === newMemberId &&
          prev.walletBalance === newBalance &&
          prev.memberSince === newMemberSince &&
          prev.isVerified === newIsVerified &&
          prev.vipLevel === newVipLevel &&
          prev.totalEarnings === newTotalEarnings &&
          prev.activeUnits === newActiveUnits &&
          prev.dailyRewards === newDailyRewards &&
          prev.activeInvestments?.length === newInvestments?.length &&
          prev.transactions?.length === newTransactions?.length
        ) {
          return prev;
        }

        return {
          ...prev,
          name: newName,
          phone: newPhone,
          email: newEmail,
          memberId: newMemberId,
          walletBalance: newBalance,
          memberSince: newMemberSince,
          isVerified: newIsVerified,
          vipLevel: newVipLevel,
          totalEarnings: newTotalEarnings,
          activeUnits: newActiveUnits,
          dailyRewards: newDailyRewards,
          activeInvestments: newInvestments,
          transactions: newTransactions,
        };
      });
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(handle);
    };
  }, [
    initialUser?.name,
    initialUser?.phone,
    initialUser?.email,
    initialUser?.memberId,
    initialUser?.walletBalance,
    initialUser?.memberSince,
    initialUser?.isVerified,
    initialUser?.vipLevel,
    initialUser?.totalEarnings,
    initialUser?.activeUnits,
    initialUser?.dailyRewards,
    initialUser?.activeInvestments?.length,
    initialUser?.transactions?.length,
  ]);

  // Modal & Toast states
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState<
    | 'personal'
    | 'security'
    | 'payment'
    | 'notifications'
    | 'wallet'
    | 'edit'
    | 'authenticator'
    | 'townHall'
    | 'recharge'
    | 'withdraw'
    | 'companyInfo'
    | 'licenses'
    | 'substations'
    | 'engineering'
    | 'esg'
    | 'helpline'
    | null
  >(null);

  const [localTab, setLocalTab] = useState<
    'home' | 'invest' | 'transactions' | 'wallet' | 'referral' | 'profile'
  >(initialTab || 'home');
  const currentTab = initialTab || localTab;

  // Directly switch tab and notify parent on user interaction
  const switchTab = (tab: 'home' | 'invest' | 'transactions' | 'wallet' | 'referral' | 'profile') => {
    setLocalTab(tab);
    scrollAppToTop();
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Auto-scroll window to top whenever currentTab changes (ensures user always lands at the top of Profile, Promo Bonus, etc.)
  useEffect(() => {
    scrollAppToTop();
  }, [currentTab]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const [hasClaimedBonus, setHasClaimedBonus] = useState<boolean>(() => {
    try {
      const activeId = initialUser?.uid || initialUser?.memberId || 'guest';
      return localStorage.getItem(`daily_bonus_claimed_${activeId}_${todayKey}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showGatewaySettings, setShowGatewaySettings] = useState(false);

  // Cloud Firestore Sync: Load active investments on initial profile load
  useEffect(() => {
    const activeUid = user.uid || initialUser?.uid;
    if (activeUid) {
      getFirestoreUserInvestments(activeUid)
        .then((cloudInvestments) => {
          if (cloudInvestments && cloudInvestments.length > 0) {
            updateUser((prev) => {
              if ((prev.activeInvestments || []).length >= cloudInvestments.length) {
                return prev;
              }
              const maxVip = Math.max(
                prev.vipLevel || 0,
                1,
                ...cloudInvestments.map((inv: any) => inv.vipLevel || 1)
              );
              const totalDaily = cloudInvestments.reduce(
                (acc: number, curr: any) => acc + (curr.dailyYield || 0),
                0
              );
              return {
                ...prev,
                activeInvestments: cloudInvestments,
                activeUnits: cloudInvestments.length,
                vipLevel: maxVip,
                dailyRewards: totalDaily,
              };
            });
          }
        })
        .catch(() => {});
    }
  }, [user.uid, initialUser?.uid]);

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const [rechargeMethod, setRechargeMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Multi-Channel Hosted Gateway & Manual Deposit Handler (Nekpay, OKExPay, Go-Go-Pay, Manual TrxID)
  const handleInitiateDeposit = async (
    amount: number,
    method: 'bKash' | 'Nagad' | 'Rocket' | 'Card' | string,
    channel: PaymentChannelType = 'channel1',
    manualDetails?: ManualDepositDetails
  ) => {
    const activeUid = auth.currentUser?.uid || user.memberId || 'USER1001';

    // 1. MANUAL TRXID VERIFICATION (Gateway Callback / Pending Flow)
    if (channel === 'manual') {
      const trxId = (manualDetails?.trxId || `TXN${Date.now().toString().slice(-8)}`).trim().toUpperCase();
      const sender = manualDetails?.senderPhone || user.phone || '';
      const depositAmount = Number(amount);

      try {
        showToast(
          currentLang === 'bn'
            ? 'TrxID যাচাইকরণ প্রক্রিয়া চলছে...'
            : 'Submitting TrxID for verification...'
        );

        let serverResult: any = null;
        try {
          const sRes = await fetch('/api/payments/submit-txnid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: depositAmount,
              method: method || 'bKash',
              trxId,
              senderPhone: sender,
              userId: activeUid,
            }),
          });
          serverResult = await sRes.json();
        } catch (serverErr) {
          console.warn('[Manual Deposit Server Log Warning]', serverErr);
        }

        // Security fix: NEVER auto-approve based on client-side regex.
        // A deposit is ONLY approved if the server gateway explicitly confirmed 'COMPLETED'.
        // Any unverified or fake manual TrxID will stay 'pending' and reject if invalid.
        const isAutoApproved = Boolean(serverResult && serverResult.success && serverResult.status === 'COMPLETED');
        const initialStatus: 'completed' | 'pending' = isAutoApproved ? 'completed' : 'pending';

        // Record in Firestore with appropriate status:
        // 'completed' will credit wallet balance in Firestore, while 'pending' will NOT credit balance yet!
        await recordFirestoreDeposit(activeUid, {
          amount: depositAmount,
          method: method || 'bKash',
          channel: 'manual',
          trxId,
          senderPhone: sender,
          status: initialStatus,
        });

        const formattedTime =
          new Date().toLocaleDateString('en-GB') +
          ' ' +
          new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          });

        const newTxn = {
          id: trxId,
          type: 'recharge',
          title: currentLang === 'bn' ? `ওয়ালেট রিচার্জ (${method})` : `Wallet Recharge (${method})`,
          amount: depositAmount,
          timestamp: formattedTime,
          date: new Date().toLocaleDateString('en-GB'),
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: initialStatus,
          description: isAutoApproved
            ? `Direct TrxID Deposit via ${method} (${trxId})`
            : `TrxID Deposit via ${method} - অপেক্ষমাণ (${trxId})`,
          hash: trxId,
          channel: `${method} (Manual TrxID)`,
          isCredit: isAutoApproved,
        };

        if (isAutoApproved) {
          // Auto-approved immediately (for recognized REAL TrxIDs)
          updateUser((prev) => {
            const cleanPrev = (prev.transactions || []).filter(
              (t: any) => t.id !== newTxn.id && t.hash !== newTxn.id
            );
            return {
              ...prev,
              walletBalance: prev.walletBalance + depositAmount,
              transactions: [newTxn, ...cleanPrev],
            };
          });

          showToast(
            currentLang === 'bn'
              ? `✅ TrxID যাচাই সফল! ৳${depositAmount.toLocaleString()} ওয়ালেটে যুক্ত হয়েছে (TrxID: ${trxId})`
              : `✅ TrxID verified! ৳${depositAmount.toLocaleString()} credited to your wallet (TrxID: ${trxId})`
          );
        } else {
          // Kept PENDING awaiting banking / gateway verification
          updateUser((prev) => {
            const cleanPrev = (prev.transactions || []).filter(
              (t: any) => t.id !== newTxn.id && t.hash !== newTxn.id
            );
            return {
              ...prev,
              transactions: [newTxn, ...cleanPrev],
            };
          });

          showToast(
            currentLang === 'bn'
              ? `⏳ TrxID জমা হয়েছে! ব্যাংকিং ও গেটওয়ে সিস্টেমে যাচাই চলছে (১৫ সেকেন্ড অপেক্ষা করুন)...`
              : `⏳ TrxID submitted! Verifying with banking & payment gateway records (please wait ~15s)...`
          );

          // Verification countdown for fake / unverified TrxIDs (7 polls of 2s = ~14s)
          const orderNo = serverResult?.order?.orderId || trxId;
          let pollCount = 0;
          const maxPolls = 7;
          const pollTimer = setInterval(async () => {
            pollCount++;

            try {
              let latestStatus: string | undefined;
              try {
                const checkRes = await fetch(`/api/payments/order-status/${encodeURIComponent(orderNo)}`);
                const checkData = await checkRes.json();
                latestStatus = checkData?.order?.status?.toUpperCase();
              } catch (_) {}

              if (latestStatus === 'COMPLETED' || latestStatus === 'SUCCESS') {
                clearInterval(pollTimer);

                // Update Firestore to completed and add balance
                await updateFirestoreDepositStatus(activeUid, trxId, 'completed', depositAmount);

                // Update local user state
                updateUser((prev) => {
                  const alreadyApproved = (prev.transactions || []).some(
                    (t: any) => (t.id === trxId || t.hash === trxId) && t.status === 'completed'
                  );
                  if (alreadyApproved) return prev;

                  return {
                    ...prev,
                    walletBalance: prev.walletBalance + depositAmount,
                    transactions: (prev.transactions || []).map((t: any) =>
                      t.id === trxId || t.hash === trxId
                        ? {
                            ...t,
                            status: 'completed',
                            description: `Direct TrxID Deposit via ${method} - সফল (${trxId})`,
                          }
                        : t
                    ),
                  };
                });

                showToast(
                  currentLang === 'bn'
                    ? `🎉 গেটওয়ে যাচাই সফল! ৳${depositAmount.toLocaleString()} ওয়ালেটে সফলভাবে যোগ হয়েছে!`
                    : `🎉 Gateway confirmed deposit! ৳${depositAmount.toLocaleString()} credited successfully!`
                );
                return;
              }

              if (pollCount >= maxPolls) {
                clearInterval(pollTimer);
                // Keep the deposit safely as PENDING in Firestore and state awaiting gateway/admin review
                return;
              }

              if (latestStatus === 'CANCELLED' || latestStatus === 'FAILED' || latestStatus === 'REJECTED') {
                clearInterval(pollTimer);

                // Mark as cancelled in Firestore only if gateway explicitly confirmed rejection
                await updateFirestoreDepositStatus(activeUid, trxId, 'cancelled');

                updateUser((prev) => ({
                  ...prev,
                  transactions: (prev.transactions || []).map((t: any) =>
                    t.id === trxId || t.hash === trxId
                      ? {
                          ...t,
                          status: 'cancelled',
                          description: `TrxID Deposit via ${method} - বাতিল (${trxId})`,
                        }
                      : t
                  ),
                }));

                showToast(
                  currentLang === 'bn'
                    ? `❌ TrxID যাচাই ব্যর্থ: গেটওয়েতে কোনো পেমেন্ট রেকর্ড মেলেনি। ডিপোজিটটি বাতিল করা হয়েছে।`
                    : `❌ TrxID verification failed: No matching banking records found. Deposit rejected.`
                );
                return;
              }
            } catch (pErr) {
              console.warn('[Deposit Status Polling Warn]', pErr);
            }
          }, 2000);
        }
      } catch (err: any) {
        console.error('[Manual Deposit Error]', err);
        showToast(
          currentLang === 'bn'
            ? '⚠️ TrxID ভেরিফিকেশন প্রক্রিয়ায় সমস্যা হয়েছে, পুনরায় চেষ্টা করুন'
            : '⚠️ Failed to verify TrxID, please try again'
        );
      } finally {
        setActiveSubModal(null);
      }
      return;
    }

    // 2. GO-GO-PAY GATEWAY
    if (channel === 'gogopay') {
      try {
        showToast(
          currentLang === 'bn'
            ? 'Go-Go-Pay গেটওয়েতে সংযোগ করা হচ্ছে...'
            : 'Connecting to Go-Go-Pay Gateway...'
        );

        const res = await fetch('/api/v1/gogopay/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Number(amount),
            method: method || 'bKash',
            userId: activeUid,
          }),
        });

        const data = await res.json();
        console.log('Go-Go-Pay create-order response:', data);

        if (data.success && data.paymentLink) {
          window.open(data.paymentLink, '_blank');
          showToast(
            currentLang === 'bn'
              ? 'Go-Go-Pay পেমেন্ট পেজ নতুন ট্যাবে খোলা হয়েছে!'
              : 'Go-Go-Pay payment link opened in new tab!'
          );

          // Automated polling for order completion
          const orderNo = data.orderNo;
          if (orderNo) {
            let attempts = 0;
            const pollInterval = setInterval(async () => {
              attempts++;
              if (attempts > 40) {
                clearInterval(pollInterval);
                return;
              }
              try {
                const checkRes = await fetch(`/api/payments/order-status/${orderNo}`);
                const checkData = await checkRes.json();
                if (checkData.success && checkData.order?.status === 'COMPLETED') {
                  clearInterval(pollInterval);

                  // Update Firestore wallet balance and transaction record
                  await recordFirestoreDeposit(activeUid, {
                    amount: Number(amount),
                    method: method || 'bKash',
                    channel: 'gogopay',
                    trxId: checkData.order?.trxId || orderNo,
                    orderNo,
                  });

                  updateUser((prev) => ({
                    ...prev,
                    walletBalance: prev.walletBalance + Number(amount),
                    transactions: [
                      {
                        id: checkData.order?.trxId || orderNo,
                        type: 'deposit',
                        amount: Number(amount),
                        timestamp:
                          new Date().toLocaleDateString('en-GB') +
                          ' ' +
                          new Date().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }),
                        status: 'completed',
                        description: `Go-Go-Pay Deposit (${method})`,
                        hash: checkData.order?.trxId || orderNo,
                      },
                      ...(prev.transactions || []),
                    ],
                  }));

                  showToast(
                    currentLang === 'bn'
                      ? `Go-Go-Pay রিচার্জ সফল! ৳${Number(amount).toLocaleString()} ওয়ালেটে জমা হয়েছে।`
                      : `Go-Go-Pay recharge successful! ৳${Number(amount).toLocaleString()} added to wallet.`
                  );
                }
              } catch (e) {
                // ignore polling errors
              }
            }, 3000);
          }
        } else {
          showToast(
            currentLang === 'bn'
              ? `⚠️ পেমেন্ট সংযোগ ব্যর্থ: ${data.error || 'Go-Go-Pay গেটওয়ে ত্রুটি'}`
              : `⚠️ Payment failed: ${data.error || 'Go-Go-Pay gateway error'}`
          );
        }
      } catch (err: any) {
        console.error('[Go-Go-Pay Deposit Error]', err);
        showToast(
          currentLang === 'bn'
            ? '⚠️ Go-Go-Pay গেটওয়ে সার্ভিসে সংযোগ করা যাচ্ছে না'
            : '⚠️ Failed to connect to Go-Go-Pay gateway'
        );
      } finally {
        setActiveSubModal(null);
      }
      return;
    }

    // 3. CHANNEL 1: NEKPAY GATEWAY
    if (channel === 'channel1') {
      try {
        showToast(
          currentLang === 'bn'
            ? 'চ্যানেল ১ (Nekpay)-এ সংযোগ করা হচ্ছে...'
            : 'Connecting to Channel 1 (Nekpay Gateway)...'
        );

        let data: any = null;
        try {
          const res = await fetch('/api/v1/nekpay/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Number(amount),
              payerName: 'Customer',
              userId: activeUid,
            }),
          });
          data = await res.json();
        } catch (proxyErr) {
          console.warn('[Nekpay] Proxy fetch attempt failed, trying direct Render backend:', proxyErr);
          const directRes = await fetch('https://nekpay-backend.onrender.com/api/v1/nekpay/create-order', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: Number(amount),
              payerName: 'Customer',
              userId: activeUid,
            }),
          });
          data = await directRes.json();
        }

        console.log('Nekpay create-order response:', data);

        if (data.success && data.paymentLink) {
          const orderNo = data.orderNo || `NEK${Date.now().toString().slice(-8)}`;

          // Immediately record pending deposit in Firestore so it shows in transaction history
          await recordFirestoreDeposit(activeUid, {
            amount: Number(amount),
            method: method || 'bKash',
            channel: 'channel1',
            trxId: orderNo,
            orderNo,
            status: 'pending',
          });

          const formattedTime =
            new Date().toLocaleDateString('en-GB') +
            ' ' +
            new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

          updateUser((prev) => {
            const cleanPrev = (prev.transactions || []).filter(
              (t: any) => t.id !== orderNo && t.hash !== orderNo
            );
            return {
              ...prev,
              transactions: [
                {
                  id: orderNo,
                  type: 'recharge',
                  title: currentLang === 'bn' ? `ওয়ালেট রিচার্জ (${method || 'bKash'})` : `Wallet Recharge (${method || 'bKash'})`,
                  amount: Number(amount),
                  timestamp: formattedTime,
                  date: new Date().toLocaleDateString('en-GB'),
                  time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  status: 'pending',
                  description: `Nekpay Order: ${orderNo} - অপেক্ষমাণ`,
                  hash: orderNo,
                  channel: `${method || 'bKash'} (Nekpay)`,
                  isCredit: false,
                },
                ...cleanPrev,
              ],
            };
          });

          let opened = null;
          try {
            opened = window.open(data.paymentLink, '_blank');
          } catch (e) {
            opened = null;
          }
          if (!opened || opened.closed || typeof opened.closed === 'undefined') {
            window.location.href = data.paymentLink;
          }
          showToast(
            currentLang === 'bn'
              ? 'Nekpay পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...'
              : 'Redirecting to Nekpay payment link...'
          );

          // Automated polling for order completion
          if (orderNo) {
            let attempts = 0;
            const pollInterval = setInterval(async () => {
              attempts++;
              if (attempts > 40) {
                clearInterval(pollInterval);
                return;
              }
              try {
                const checkRes = await fetch(`/api/payments/order-status/${orderNo}`);
                const checkData = await checkRes.json();
                if (checkData.success && checkData.order?.status === 'COMPLETED') {
                  clearInterval(pollInterval);

                  // Update Firestore wallet balance and transaction record
                  await recordFirestoreDeposit(activeUid, {
                    amount: Number(amount),
                    method: method || 'bKash',
                    channel: 'channel1',
                    trxId: checkData.order?.trxId || orderNo,
                    orderNo,
                    status: 'completed',
                  });

                  updateUser((prev) => ({
                    ...prev,
                    walletBalance: prev.walletBalance + Number(amount),
                    transactions: (prev.transactions || []).map((t: any) =>
                      t.id === orderNo || t.hash === orderNo
                        ? {
                            ...t,
                            status: 'completed',
                            description: `Nekpay Deposit (${method || 'bKash'}) - সফল`,
                            hash: checkData.order?.trxId || orderNo,
                            isCredit: true,
                          }
                        : t
                    ),
                  }));

                  showToast(
                    currentLang === 'bn'
                      ? `রিচার্জ সফল! ৳${Number(amount).toLocaleString()} আপনার ওয়ালেটে জমা হয়েছে।`
                      : `Recharge successful! ৳${Number(amount).toLocaleString()} added to your wallet.`
                  );
                }
              } catch (e) {
                // ignore polling errors
              }
            }, 3000);
          }
        } else {
          showToast(
            currentLang === 'bn'
              ? `⚠️ পেমেন্ট সংযোগ ব্যর্থ: ${data.error || 'Nekpay গেটওয়ে ত্রুটি'}`
              : `⚠️ Payment failed: ${data.error || 'Nekpay gateway error'}`
          );
        }
      } catch (err: any) {
        console.error('[Nekpay Deposit Error]', err);
        showToast(
          currentLang === 'bn'
            ? '⚠️ গেটওয়ে সার্ভিসে সংযোগ করা যাচ্ছে না'
            : '⚠️ Failed to connect to payment gateway'
        );
      } finally {
        setActiveSubModal(null);
      }
      return;
    }

    // 4. CHANNEL 2: WATCHPAY GATEWAY
    try {
      showToast(
        currentLang === 'bn'
          ? 'চ্যানেল ২ (WatchPay)-এ সংযোগ করা হচ্ছে...'
          : 'Connecting to Channel 2 (WatchPay)...'
      );

      let data: any = null;
      try {
        // Prioritize server proxy to unpack inner iframe and prevent browser SAMEORIGIN errors
        const proxyRes = await fetch('/api/v1/watchpay/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Number(amount),
            payerName: 'Customer',
          }),
        });
        data = await proxyRes.json();
      } catch (proxyErr) {
        console.warn('[WatchPay] Proxy fetch failed, trying direct:', proxyErr);
        const directRes = await fetch('https://nekpay-backend.onrender.com/create-order-watchpay', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Number(amount),
            payerName: 'Customer',
          }),
        });
        data = await directRes.json();
      }

      console.log('WatchPay create-order response:', data);

      if (data && data.success && data.paymentLink) {
        const targetUrl = data.paymentLink;
        const orderNo = data.orderNo || `WPY${Date.now().toString().slice(-8)}`;

        // Record pending deposit in Firestore so it immediately shows in transaction history
        await recordFirestoreDeposit(activeUid, {
          amount: Number(amount),
          method: method || 'Nagad',
          channel: 'channel2',
          trxId: orderNo,
          orderNo,
          status: 'pending',
        });

        // Store in localStorage for easy return recovery
        try {
          localStorage.setItem(
            'pending_gateway_deposit',
            JSON.stringify({
              orderNo,
              amount: Number(amount),
              method: method || 'Nagad',
              channel: 'channel2',
              timestamp: Date.now(),
            })
          );
        } catch (_) {}

        const formattedTime =
          new Date().toLocaleDateString('en-GB') +
          ' ' +
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        updateUser((prev) => {
          const cleanPrev = (prev.transactions || []).filter(
            (t: any) => t.id !== orderNo && t.hash !== orderNo
          );
          return {
            ...prev,
            transactions: [
              {
                id: orderNo,
                type: 'recharge',
                title: currentLang === 'bn' ? `ওয়ালেট রিচার্জ (${method || 'Nagad'})` : `Wallet Recharge (${method || 'Nagad'})`,
                amount: Number(amount),
                timestamp: formattedTime,
                date: new Date().toLocaleDateString('en-GB'),
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                status: 'pending',
                description: `WatchPay Order: ${orderNo} - অপেক্ষমাণ`,
                hash: orderNo,
                channel: `${method || 'Nagad'} (WatchPay)`,
                isCredit: false,
              },
              ...cleanPrev,
            ],
          };
        });

        try {
          if (window.top && window.top !== window) {
            window.top.location.href = targetUrl;
          } else {
            window.location.href = targetUrl;
          }
        } catch (navErr) {
          console.warn('[WatchPay] Top navigation failed, fallback to location.href:', navErr);
          window.location.href = targetUrl;
        }
      } else {
        showToast(
          currentLang === 'bn'
            ? `⚠️ পেমেন্ট সংযোগ ব্যর্থ: ${data?.message || data?.error || 'WatchPay গেটওয়ে ত্রুটি'}`
            : `⚠️ Payment failed: ${data?.message || data?.error || 'WatchPay gateway error'}`
        );
      }
    } catch (err: any) {
      console.error('[WatchPay Deposit Error]', err);
      showToast(
        currentLang === 'bn'
          ? '⚠️ WatchPay গেটওয়ে সার্ভিসে সংযোগ করা যাচ্ছে না'
          : '⚠️ Failed to connect to WatchPay gateway'
      );
    } finally {
      setActiveSubModal(null);
    }
  };

  // Check URL parameters for payment callback/return results (Go-Go-Pay, Nekpay, OKExPay)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus =
        params.get('payment_status') ||
        params.get('status') ||
        params.get('trade_status') ||
        params.get('result');
      const rawAmount = params.get('amount') || params.get('money') || params.get('pay_money');
      const amount = Number(rawAmount);
      const orderId = params.get('order_id') || params.get('orderNo') || params.get('out_trade_no');
      const trxId =
        params.get('trx_id') ||
        params.get('txnid') ||
        params.get('trade_no') ||
        params.get('ref_id') ||
        orderId;
      const gateway = params.get('gateway') || params.get('channel') || 'gateway';
      const method = params.get('method') || 'bKash';

      const isSuccess =
        paymentStatus &&
        ['SUCCESS', 'COMPLETED', 'PAID', '1', 'TRUE', 'OK'].includes(paymentStatus.toUpperCase());

      if (isSuccess && amount > 0) {
        const activeUid = auth.currentUser?.uid || user.memberId || 'USER1001';

        // 1. Immediately update user wallet balance and record in Firestore
        recordFirestoreDeposit(activeUid, {
          amount,
          method,
          channel: gateway,
          trxId: trxId || `TXN-${Date.now().toString().slice(-6)}`,
          orderNo: orderId || undefined,
        }).then(() => {
          console.log('[Firestore] Callback deposit successfully synchronized');
        }).catch((syncErr) => {
          console.warn('[Firestore] Callback deposit sync warning:', syncErr);
        });

        // 2. Immediately update local state
        updateUser((prev) => ({
          ...prev,
          walletBalance: prev.walletBalance + amount,
          transactions: [
            {
              id: trxId || `TXN-${Date.now().toString().slice(-6)}`,
              type: 'deposit',
              amount,
              timestamp:
                new Date().toLocaleDateString('en-GB') +
                ' ' +
                new Date().toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              status: 'completed',
              description: `Payment Return Deposit (${gateway.toUpperCase()})`,
              hash: trxId || orderId || '',
            },
            ...(prev.transactions || []),
          ],
        }));

        try {
          distributeReferralDepositCommissions(
            user.referralCode || user.memberId,
            amount,
            user.referralCode || user.memberId
          );
        } catch (e) {
          // ignore
        }

        showToast(
          currentLang === 'bn'
            ? `মার্চেন্ট পেমেন্ট সফল! ৳${amount.toLocaleString()} আপনার ওয়ালেটে জমা হয়েছে (TrxID: ${trxId || orderId})`
            : `Merchant Payment successful! ৳${amount.toLocaleString()} credited to wallet (TrxID: ${trxId || orderId})`
        );

        // Remove payment callback query params so refreshing doesn't duplicate
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (orderId && !isSuccess) {
        // Returned from gateway with pending or unverified status
        showToast(
          currentLang === 'bn'
            ? 'পেমেন্ট যাচাই প্রক্রিয়াধীন রয়েছে। আপনার ট্রানজেকশন হিস্ট্রিতে রেকর্ডটি অপেক্ষমাণ রয়েছে।'
            : 'Payment verification is pending. The transaction is listed as pending in your history.'
        );
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.warn('[Payment Return Handling Warning]', err);
    }
  }, []);

  // Real-time Firestore user transactions subscription
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || user.memberId;
    if (!activeUid) return;

    // Immediate one-time load on mount
    getFirestoreUserTransactions(activeUid).then((fsTxns) => {
      if (fsTxns && fsTxns.length > 0) {
        updateUser((prev) => {
          const prevTxns = prev.transactions || [];
          const existingIds = new Set(prevTxns.map((t: any) => t.id || t.hash));
          const newTxns = fsTxns.filter((t: any) => !existingIds.has(t.id || t.hash));
          if (newTxns.length === 0) return prev;
          return {
            ...prev,
            transactions: [...newTxns, ...prevTxns],
          };
        });
      }
    });

    const unsubscribe = subscribeToUserTransactions(activeUid, (firestoreTxns) => {
      if (firestoreTxns && firestoreTxns.length > 0) {
        updateUser((prev) => {
          const prevTxns = prev.transactions || [];
          const firestoreMap = new Map<string, any>();
          firestoreTxns.forEach((ft: any) => {
            if (ft.id) firestoreMap.set(ft.id, ft);
            if (ft.hash) firestoreMap.set(ft.hash, ft);
          });

          // Merge updated statuses for existing transactions
          const updatedExisting = prevTxns.map((t: any) => {
            const match = firestoreMap.get(t.id) || firestoreMap.get(t.hash);
            if (match && match.status && match.status !== t.status) {
              return {
                ...t,
                status: match.status,
                description: match.description || t.description,
              };
            }
            return t;
          });

          // Append any brand new transactions
          const existingIds = new Set(prevTxns.map((t: any) => t.id || t.hash));
          const brandNewTxns = firestoreTxns.filter((t: any) => !existingIds.has(t.id || t.hash));

          const combined = [...brandNewTxns, ...updatedExisting];
          const seen = new Set<string>();
          const dedupedTransactions = combined.filter((t: any) => {
            const key = t.id || t.hash;
            if (!key) return true;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          return {
            ...prev,
            transactions: dedupedTransactions,
          };
        });
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [user.memberId]);

  // Automated background verification / cleanup for pending manual deposit transactions
  useEffect(() => {
    const activeUid = auth.currentUser?.uid || user.memberId;
    if (!activeUid) return;

    const pendingDeposits = (user.transactions || []).filter(
      (t: any) => (t.status === 'pending' || t.status === 'অপেক্ষমাণ') && (t.type === 'deposit' || t.type === 'recharge')
    );

    if (pendingDeposits.length === 0) return;

    pendingDeposits.forEach(async (pTx: any) => {
      const trxKey = pTx.id || pTx.hash;
      if (!trxKey) return;
      try {
        const res = await fetch(`/api/payments/check-txnid/${encodeURIComponent(trxKey)}`);
        const data = await res.json();
        if (data?.order?.status === 'CANCELLED') {
          // Sync cancellation to Firestore & local state
          await updateFirestoreDepositStatus(activeUid, trxKey, 'cancelled');
          updateUser((prev) => ({
            ...prev,
            transactions: (prev.transactions || []).map((t: any) =>
              t.id === trxKey || t.hash === trxKey
                ? { ...t, status: 'cancelled', description: `${t.description || 'Deposit'} - বাতিল` }
                : t
            ),
          }));
        } else if (data?.order?.status === 'COMPLETED') {
          // Sync completed to Firestore & local state
          await updateFirestoreDepositStatus(activeUid, trxKey, 'completed', pTx.amount);
          updateUser((prev) => ({
            ...prev,
            walletBalance: prev.walletBalance + (Number(pTx.amount) || 0),
            transactions: (prev.transactions || []).map((t: any) =>
              t.id === trxKey || t.hash === trxKey
                ? { ...t, status: 'completed', description: `${t.description || 'Deposit'} - সফল` }
                : t
            ),
          }));
        }
      } catch (err) {
        console.warn('[Pending Check Error]', err);
      }
    });
  }, [user.transactions?.length]);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('2000');
  const [withdrawMethod, setWithdrawMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Bank'>('bKash');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawPin, setWithdrawPin] = useState('');

  // Google Authenticator state
  const [isAuthenticatorEnabled, setIsAuthenticatorEnabled] = useState(true);
  const [authSecretKey] = useState('NB2W 45DF OIZX E33N');
  const [authInputCode, setAuthInputCode] = useState('');
  const [isAuthKeyCopied, setIsAuthKeyCopied] = useState(false);

  // Daily Town Hall state
  const [isTownHallReminderSet, setIsTownHallReminderSet] = useState(false);
  const [isTownHallJoined, setIsTownHallJoined] = useState(false);

  const handleClaimDailyBonus = () => {
    if (hasClaimedBonus) {
      showToast(t.toastBonusAlready);
      return;
    }
    setHasClaimedBonus(true);
    try {
      const activeId = user.uid || user.memberId || 'guest';
      localStorage.setItem(`daily_bonus_claimed_${activeId}_${todayKey}`, 'true');
    } catch {
      // ignore
    }
    updateUser((prev) => ({ ...prev, walletBalance: prev.walletBalance + 50 }));
    showToast(t.toastBonusClaimed);
  };

  const handleInvestProject = (projectName: string, amount: number) => {
    if (user.walletBalance < amount) {
      showToast(
        currentLang === 'bn'
          ? `অপর্যাপ্ত ব্যালেন্স! আপনার ওয়ালেটে ৳${user.walletBalance.toLocaleString()} আছে, প্রয়োজন ৳${amount.toLocaleString()}। দয়া করে রিচার্জ করুন।`
          : `Insufficient balance! You have ৳${user.walletBalance.toLocaleString()}, required ৳${amount.toLocaleString()}. Please recharge.`
      );
      setActiveSubModal('recharge');
      return;
    }

    // Match package from new INVESTMENT_PLANS
    const matchedPlan = INVESTMENT_PLANS.find(
      (p) =>
        p.nameBn === projectName ||
        p.nameEn === projectName ||
        projectName.includes(p.nameEn) ||
        projectName.includes(p.nameBn)
    );

    // Limit check for plans with maxPurchaseLimit (e.g. 0/2 for first 2 packages)
    if (matchedPlan && matchedPlan.maxPurchaseLimit !== undefined) {
      const alreadyPurchasedCount = (user.activeInvestments || []).filter(
        (inv: any) =>
          inv.name === matchedPlan.nameEn ||
          inv.name === matchedPlan.nameBn ||
          inv.name.includes(matchedPlan.nameEn) ||
          inv.name.includes(matchedPlan.nameBn)
      ).length;
      if (alreadyPurchasedCount >= matchedPlan.maxPurchaseLimit) {
        showToast(
          currentLang === 'bn'
            ? `দুঃখিত! এই প্যাকেজের সর্বোচ্চ ক্রয়ের সীমা (${matchedPlan.maxPurchaseLimit}/${matchedPlan.maxPurchaseLimit}) পূর্ণ হয়েছে।`
            : `Maximum purchase limit reached (${matchedPlan.maxPurchaseLimit}/${matchedPlan.maxPurchaseLimit}) for this plan.`
        );
        return;
      }
    }

    // VIP requirement check (VIP 1 required for packages other than first 2)
    if (matchedPlan && matchedPlan.requiredVipLevel > 0 && (user.vipLevel || 0) < matchedPlan.requiredVipLevel) {
      showToast(
        currentLang === 'bn'
          ? 'এই প্যাকেজে বিনিয়োগ করতে অন্তত VIP 1 মেম্বারশিপ প্রয়োজন! অনুগ্রহ করে প্রথম দুটি প্যাকেজ কিনুন অথবা রিচার্জ করুন।'
          : 'VIP 1 level required for this package! Please invest in the first two packages or recharge.'
      );
      return;
    }

    const pkgVip = matchedPlan ? Math.max(matchedPlan.requiredVipLevel, 1) : 1;
    const pkgDailyRate = matchedPlan ? matchedPlan.dailyReturnPercent : 2.5;
    const dailyEarned = Math.round((amount * pkgDailyRate) / 100);

    const newInvestment = {
      id: `INV-${Date.now()}`,
      name: projectName,
      amount: amount,
      dailyYield: dailyEarned,
      vipLevel: pkgVip,
      date: new Date().toLocaleDateString('en-GB'),
      totalEarned: 0,
    };

    const activeId = user.uid || user.memberId || 'guest';
    const updatedInvestments = [...(user.activeInvestments || []), newInvestment];
    try {
      localStorage.setItem(`user_investments_${activeId}`, JSON.stringify(updatedInvestments));
    } catch {
      // ignore
    }

    // Purchasing any plan upgrades the user to at least VIP 1
    const maxVip = Math.max(user.vipLevel || 0, 1, ...updatedInvestments.map((inv: any) => inv.vipLevel || 1));
    const totalDaily = updatedInvestments.reduce((acc: number, curr: any) => acc + (curr.dailyYield || 0), 0);

    updateUser((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - amount,
      vipLevel: maxVip,
      activeUnits: updatedInvestments.length,
      dailyRewards: totalDaily,
      activeInvestments: updatedInvestments,
    }));

    // Cloud Firestore Sync: persist active investment to user's profile and investments collection
    const persistentUid = user.uid || user.memberId;
    if (persistentUid) {
      recordInvestmentInFirestore(
        persistentUid,
        newInvestment,
        user.walletBalance - amount,
        maxVip,
        totalDaily,
        updatedInvestments
      ).catch(() => {});
    }

    // ৩ লেভেল রেফারেল কমিশন (L1: ৭%, L2: ৩%, L3: ১%) আপলাইনে স্বয়ংক্রিয়ভাবে প্রদান
    try {
      distributeReferralDepositCommissions(
        user.referralCode || user.memberId,
        amount,
        user.referralCode || user.memberId
      );
    } catch (refErr) {
      console.warn('[Referral Commission Distribution Error]', refErr);
    }

    showToast(
      currentLang === 'bn'
        ? `অভিনন্দন! "${projectName}" প্রজেক্টে ৳${amount.toLocaleString()} সফলভাবে বিনিয়োগ করা হয়েছে!`
        : `Congratulations! Successfully invested ৳${amount.toLocaleString()} in "${projectName}"!`
    );
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.memberId);
    setIsCopied(true);
    showToast(t.toastCopied);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyReferral = () => {
    const refCode = user.memberId || 'NV8829';
    const link = `${window.location.origin}/register?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    showToast(currentLang === 'bn' ? 'রেফারেল লিংক কপি করা হয়েছে!' : 'Referral link copied!');
  };

  const handleAppDownloadClick = () => {
    // "Profile page help বাটন এপ ডাউনলোড হবে"
    // Triggers direct APK download & opens download status modal
    setIsDownloadModalOpen(true);
    showToast('Downloading NVT APK...');
  };

  return (
    <div
      id="profile-phone-frame"
      className={`w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto min-h-screen flex flex-col relative select-none md:px-6 pb-24 md:pb-12 transition-colors duration-300 ${
        themeMode === 'day' ? 'bg-[#f4f6fb] text-slate-900' : 'bg-[#06483A] text-slate-100'
      }`}
    >
      {/* Top scroll anchor to guarantee instant scroll to top on tab changes */}
      <div id="profile-top-anchor" className="w-full h-0 pointer-events-none opacity-0" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-lg shadow-blue-600/40 border border-blue-400/40 animate-in fade-in slide-from-top-2 duration-150 flex items-center gap-1.5 whitespace-nowrap">
          <Check className="w-3.5 h-3.5 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          DESKTOP DASHBOARD TOP NAVIGATION (Computer / Laptop Full Screen)
      ─────────────────────────────────────────────────────────── */}
      <header className={`hidden md:flex items-center justify-between py-3 px-6 my-4 rounded-2xl backdrop-blur-xl shadow-xl sticky top-3 z-30 transition-colors duration-200 ${
        themeMode === 'day'
          ? 'bg-white/95 border border-slate-200 text-slate-800 shadow-md'
          : 'bg-[#091122]/90 border border-slate-800/80 text-slate-100'
      }`}>
        {/* Left: Brand Logo & Title with Smooth Spinning Core */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => switchTab('home')}
        >
          <SpinningLogo size="sm" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-cyan-300">
                NVT
              </span>
              <span className={`text-xs font-bold tracking-wider ${themeMode === 'day' ? 'text-slate-800' : 'text-slate-300'}`}>
                NOVA TERRA ENERGY
              </span>
            </div>
            <p className="text-[10px] text-amber-500 font-mono font-medium">
              {currentLang === 'bn' ? 'জাতীয় ফুয়েল, গ্যাস ও পাওয়ার গ্রিড' : 'National Fuel, Gas & Power Grid'}
            </p>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className={`flex items-center gap-1 p-1.5 rounded-xl border ${
          themeMode === 'day' ? 'bg-slate-100 border-slate-200' : 'bg-[#060b18] border-slate-800/90'
        }`}>
          {[
            { id: 'home', labelBn: 'হোম', labelEn: 'Home', icon: Home },
            { id: 'invest', labelBn: 'ইনভেস্ট', labelEn: 'Invest', icon: TrendingUp },
            { id: 'transactions', labelBn: 'লেনদেন', labelEn: 'History', icon: ArrowLeftRight },
            { id: 'wallet', labelBn: 'প্রমো বোনাস', labelEn: 'Promo Bonus', icon: Award },
            { id: 'referral', labelBn: 'রেফারেল', labelEn: 'Team', icon: Users },
            { id: 'profile', labelBn: 'প্রোফাইল', labelEn: 'Profile', icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => switchTab(item.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? themeMode === 'day'
                      ? 'bg-white text-blue-600 border border-slate-200 shadow-xs'
                      : 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : themeMode === 'day'
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? (themeMode === 'day' ? 'text-blue-600' : 'text-cyan-400') : 'text-slate-400'}`} />
                <span>{currentLang === 'bn' ? item.labelBn : item.labelEn}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Balance, Day/Night Mode, Language & Logout */}
        <div className="flex items-center gap-2.5">
          {/* Day / Night Switcher */}
          <div className={`flex items-center p-0.5 rounded-xl border ${
            themeMode === 'day' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => handleToggleTheme('day')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                themeMode === 'day'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Day Mode (Light White)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>{currentLang === 'bn' ? 'ডে' : 'Day'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleToggleTheme('night')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                themeMode === 'night'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
              title="Night Mode (Dark)"
            >
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span>{currentLang === 'bn' ? 'নাইট' : 'Night'}</span>
            </button>
          </div>

          {/* Balance pill */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
            themeMode === 'day' ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <span className={`text-[10px] font-medium ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>
              {currentLang === 'bn' ? 'ব্যালেন্স:' : 'Balance:'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-500">
              ৳{user.walletBalance.toLocaleString()}
            </span>
          </div>

          {/* Language Toggle */}
          {onToggleLang && (
            <button
              type="button"
              onClick={() => onToggleLang(currentLang === 'bn' ? 'en' : 'bn')}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                themeMode === 'day'
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              <span>{currentLang === 'bn' ? 'English' : 'বাংলা'}</span>
            </button>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
            title={currentLang === 'bn' ? 'লগআউট' : 'Log Out'}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`w-full ${currentTab === 'wallet' ? 'px-0' : 'px-4 sm:px-5 md:px-0'} flex flex-col`}>
        {/* 1. Home Tab: Premium AI Electricity Generation & Investment */}
        {currentTab === 'home' && (
          <EnergyHomeTab
            userBalance={user.walletBalance}
            userName={user.name}
            currentLang={currentLang}
            onToggleLang={onToggleLang}
            themeMode={themeMode}
            onToggleTheme={handleToggleTheme}
            onOpenRecharge={() => setActiveSubModal('recharge')}
            onOpenWithdraw={() => setActiveSubModal('withdraw')}
            onOpenRobotLogin={() => setActiveSubModal('authenticator')}
            onOpenNotifications={() => setActiveSubModal('notifications')}
            onGoToInvest={() => switchTab('invest')}
            onGoToProfile={() => switchTab('profile')}
            onOpenInvite={() => switchTab('referral')}
            onInvestProject={handleInvestProject}
            onClaimDailyBonus={handleClaimDailyBonus}
            hasClaimedBonus={hasClaimedBonus}
            showToast={showToast}
          />
        )}

        {/* 2. Top Header Row for Non-Home Screens */}
        {currentTab !== 'home' && currentTab !== 'invest' && currentTab !== 'wallet' && currentTab !== 'referral' && (
          currentTab === 'profile' ? (
            /* Profile Tab Header matching Reference Screenshot */
            <div className="flex items-center justify-between pt-4 pb-3 shrink-0">
              <button
                type="button"
                onClick={() => switchTab('home')}
                className={`p-1.5 -ml-1.5 rounded-xl transition-colors cursor-pointer ${
                  themeMode === 'day' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
                aria-label="Back"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Center: AI ENERGY Branding */}
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 36 36" fill="none">
                    <circle cx="18" cy="18" r="6.5" fill="#f59e0b" />
                    <path d="M18 4V7M18 29V32M4 18H7M29 18H32M8.1 8.1L10.5 10.5M25.5 25.5L27.9 27.9M8.1 27.9L10.5 25.5M25.5 10.5L27.9 8.1" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 28C12 28 14 17 25 14C25 14 26 23 15 27C13.8 27.4 12.8 27.8 12 28Z" fill="#00e676" />
                    <path d="M15 25C18 22 21 19 23 16" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-wider leading-none">
                    <span className={themeMode === 'day' ? 'text-slate-900' : 'text-white'}>AI</span>
                    <span className="text-[#00e676]">ENERGY</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
                    Clean Energy | Better Tomorrow
                  </span>
                </div>
              </div>

              {/* Right: Notifications & Language Toggle */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSubModal('notifications')}
                  className="relative p-1.5 text-white hover:text-emerald-200 transition-colors cursor-pointer"
                  aria-label="Notifications"
                >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#f43f5e] ring-2 ring-[#022119]" />
                </button>
                {onToggleLang && (
                  <button
                    type="button"
                    onClick={() => onToggleLang(currentLang === 'en' ? 'bn' : 'en')}
                    className="px-3 py-1.5 rounded-full bg-black/45 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-black/60 transition-all active:scale-98"
                  >
                    <Globe className="w-3.5 h-3.5 text-white" />
                    <span>{currentLang === 'en' ? 'English' : 'বাংলা'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-4 pb-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (currentTab !== 'profile') {
                    switchTab('profile');
                  } else {
                    switchTab('home');
                  }
                }}
                className={`p-1.5 -ml-1.5 transition-colors cursor-pointer flex items-center gap-1 ${
                  themeMode === 'day' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
                aria-label="Back"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>

              <span className={`text-xs font-bold tracking-wide uppercase ${themeMode === 'day' ? 'text-slate-800' : 'text-slate-400'}`}>
                {currentTab === 'transactions' && (currentLang === 'bn' ? 'লেনদেন' : 'Transactions')}
                {currentTab === 'wallet' && (currentLang === 'bn' ? 'হোস্টিং লেভেল বিবরণী' : 'Hosting Level Details')}
              </span>

              <div className="flex items-center gap-2">
                {/* Day / Night Switcher */}
                <button
                  type="button"
                  onClick={() => handleToggleTheme(themeMode === 'day' ? 'night' : 'day')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    themeMode === 'day'
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50 shadow-xs'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Toggle Theme"
                >
                  {themeMode === 'day' ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{themeMode === 'day' ? (currentLang === 'bn' ? 'ডে' : 'Day') : (currentLang === 'bn' ? 'নাইট' : 'Night')}</span>
                </button>

                {onToggleLang && (
                  <button
                    type="button"
                    onClick={() => onToggleLang(currentLang === 'en' ? 'bn' : 'en')}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      themeMode === 'day'
                        ? 'bg-white border-slate-300 text-blue-600 hover:bg-slate-50'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border-slate-700'
                    }`}
                    title="Toggle Language"
                  >
                    {currentLang === 'en' ? 'BN' : 'EN'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveSubModal('notifications')}
                  className={`relative p-1.5 -mr-1.5 transition-colors cursor-pointer ${
                    themeMode === 'day' ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                  }`}
                  aria-label="Notifications"
                >
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
                </button>
              </div>
            </div>
          )
        )}

        {/* 3. Invest Tab */}
        {currentTab === 'invest' && (
          <InvestTabContent
            userBalance={user.walletBalance}
            userVipLevel={user.vipLevel || 0}
            userInvestments={user.activeInvestments || []}
            currentLang={currentLang}
            themeMode={themeMode}
            onInvestProject={handleInvestProject}
            onOpenRecharge={() => setActiveSubModal('recharge')}
            onToggleLang={onToggleLang}
            onOpenNotifications={() => setActiveSubModal('notifications')}
            onOpenMyInvestments={() => switchTab('transactions')}
          />
        )}

        {/* 4. Transactions Tab */}
        {currentTab === 'transactions' && (
          <TransactionsTabContent
            userBalance={user.walletBalance}
            userTransactions={user.transactions || []}
            currentLang={currentLang}
            themeMode={themeMode}
          />
        )}

        {/* 5. Promo Bonus / Hosting Level & Wallet Tab */}
        {currentTab === 'wallet' && (
          <WalletTabContent
            userBalance={user.walletBalance}
            userCode={user.referralCode || user.memberId || 'NV8829'}
            userMemberId={user.memberId}
            currentLang={currentLang}
            themeMode={themeMode}
            onOpenRecharge={() => setActiveSubModal('recharge')}
            onOpenWithdraw={() => setActiveSubModal('withdraw')}
            onOpenBankBinding={() => setActiveSubModal('payment')}
            onOpenGateway={(amount, method, channel, manualDetails) => {
              handleInitiateDeposit(amount, method, channel, manualDetails);
            }}
            onOpenHistory={() => switchTab('transactions')}
            onBack={() => switchTab('home')}
            onClaimPromoReward={(amt, lvl) => {
              updateUser((prev) => ({
                ...prev,
                walletBalance: prev.walletBalance + amt,
                transactions: [
                  {
                    id: `PROMO-${Date.now().toString().slice(-6)}`,
                    type: 'reward',
                    amount: amt,
                    timestamp:
                      new Date().toLocaleDateString('en-GB') +
                      ' ' +
                      new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    status: 'completed',
                    description:
                      currentLang === 'bn'
                        ? `${lvl} প্রমো বোনাস ক্যাশ রিওয়ার্ড`
                        : `${lvl} Promo Bonus Cash Reward`,
                  },
                  ...(prev.transactions || []),
                ],
              }));

              const persistentUid = user.uid || user.memberId;
              if (persistentUid) {
                updateFirestoreWalletBalance(persistentUid, user.walletBalance + amt).catch(() => {});
              }

              showToast(
                currentLang === 'bn'
                  ? `${lvl} থেকে ৳${amt.toLocaleString()} প্রমো বোনাস ওয়ালেটে জমা হয়েছে!`
                  : `${lvl} promo bonus ৳${amt.toLocaleString()} added to wallet!`
              );
            }}
            onWithdrawSubmit={(amt, method, acct) => {
              updateUser((prev) => ({
                ...prev,
                walletBalance: Math.max(0, prev.walletBalance - amt),
                transactions: [
                  {
                    id: `WTH-${Date.now().toString().slice(-6)}`,
                    type: 'withdrawal',
                    amount: -amt,
                    timestamp:
                      new Date().toLocaleDateString('en-GB') +
                      ' ' +
                      new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    status: 'completed',
                    description: `Payout to ${method} (${acct.slice(-4)})`,
                    hash: `WTH-${Date.now().toString().slice(-6)}`,
                  },
                  ...(prev.transactions || []),
                ],
              }));
              showToast(
                currentLang === 'bn'
                  ? `${method} নম্বরে ৳${amt.toLocaleString()} উত্তোলন অনুরোধ সফল হয়েছে!`
                  : `Withdrawal request of ৳${amt.toLocaleString()} to ${method} submitted successfully!`
              );
            }}
            showToast={showToast}
          />
        )}

        {/* 6. Full-Page Referral & Team Commission (হোম পেজের ইনভাইটেশন অপশন থেকে সরাসরি) */}
        {currentTab === 'referral' && (
          <ReferralPage
            currentLang={currentLang}
            themeMode={themeMode}
            userCode={user.referralCode || user.memberId || 'NV8829'}
            userMemberId={user.memberId}
            userBalance={user.walletBalance}
            onBack={() => switchTab('home')}
            onClaimReward={(amt) => {
              updateUser((prev) => ({
                ...prev,
                walletBalance: prev.walletBalance + amt,
                transactions: [
                  {
                    id: `REF-${Date.now().toString().slice(-6)}`,
                    type: 'reward',
                    amount: amt,
                    timestamp:
                      new Date().toLocaleDateString('en-GB') +
                      ' ' +
                      new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }),
                    status: 'completed',
                    description:
                      currentLang === 'bn'
                        ? 'রেফারেল কমিশন রিওয়ার্ড স্থানান্তর'
                        : 'Referral Commission Claim',
                    hash: `TXN-${Date.now().toString().slice(-6)}`,
                  },
                  ...(prev.transactions || []),
                ],
              }));
            }}
            showToast={showToast}
          />
        )}

        {/* 6. Profile Tab */}
        {currentTab === 'profile' && (
          <>
            {/* 1. Official User Profile Header Card (Deep Emerald with Energy Landscape) */}
            <div
              id="profile-user-card"
              className="relative overflow-hidden rounded-[26px] bg-gradient-to-r from-[#032e22] via-[#043d2e] to-[#064a39] p-4.5 sm:p-5 shadow-2xl border border-emerald-500/30 shrink-0 text-white min-h-[250px] sm:min-h-[270px] flex flex-col justify-between"
            >
              {/* Energy Wind & Solar Farm Landscape Illustration with Sunrise & Hills */}
              <div className="absolute right-0 top-0 bottom-0 w-[68%] pointer-events-none overflow-hidden select-none">
                {/* Clean Energy Farm Photo */}
                <img
                  src="https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=800&q=80"
                  alt="Clean Energy Farm"
                  className="w-full h-full object-cover object-right opacity-30 mix-blend-screen"
                  referrerPolicy="no-referrer"
                />

                {/* SVG Landscape Vector Art with Bright Rising Sun, Rolling Hills, Wind Turbines & Solar Panels */}
                <svg
                  viewBox="0 0 400 200"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full opacity-85"
                >
                  <defs>
                    <radialGradient id="sunriseGlow" cx="72%" cy="28%" r="48%">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                      <stop offset="20%" stopColor="#fef08a" stopOpacity="0.95" />
                      <stop offset="45%" stopColor="#fbbf24" stopOpacity="0.65" />
                      <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#043d2e" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="hillBack" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0d684a" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#043d2e" stopOpacity="0.95" />
                    </linearGradient>
                    <linearGradient id="hillFront" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#032a1f" stopOpacity="0.98" />
                    </linearGradient>
                    <linearGradient id="solarBlue" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="50%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>

                  {/* Golden Sunrise Glow Raised in Upper Area so it's fully visible */}
                  <circle cx="290" cy="55" r="95" fill="url(#sunriseGlow)" />
                  <circle cx="290" cy="55" r="26" fill="#fef08a" opacity="0.85" />
                  <circle cx="290" cy="55" r="14" fill="#ffffff" opacity="0.98" />

                  {/* Radiating Sunbeams / Rays across Sky & Hills */}
                  <line x1="290" y1="55" x2="210" y2="25" stroke="#fef08a" strokeWidth="1.8" opacity="0.55" />
                  <line x1="290" y1="55" x2="235" y2="12" stroke="#fef08a" strokeWidth="1.8" opacity="0.6" strokeDasharray="5 3" />
                  <line x1="290" y1="55" x2="265" y2="5" stroke="#fef08a" strokeWidth="2.2" opacity="0.65" />
                  <line x1="290" y1="55" x2="290" y2="2" stroke="#fef08a" strokeWidth="2.5" opacity="0.75" />
                  <line x1="290" y1="55" x2="315" y2="5" stroke="#fef08a" strokeWidth="2.2" opacity="0.65" />
                  <line x1="290" y1="55" x2="345" y2="15" stroke="#fef08a" strokeWidth="1.8" opacity="0.6" strokeDasharray="5 3" />
                  <line x1="290" y1="55" x2="375" y2="35" stroke="#fef08a" strokeWidth="1.8" opacity="0.55" />
                  <line x1="290" y1="55" x2="220" y2="65" stroke="#fef08a" strokeWidth="1.5" opacity="0.4" strokeDasharray="4 2" />

                  {/* Back Rolling Mountains */}
                  <path d="M130,200 Q195,85 275,95 T400,105 L400,200 Z" fill="url(#hillBack)" />

                  {/* Wind Turbines on Mountain Ridge */}
                  {/* Turbine 1 (Left Ridge) */}
                  <line x1="215" y1="102" x2="215" y2="52" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="215" cy="52" r="2.5" fill="#ffffff" />
                  <line x1="215" y1="52" x2="215" y2="28" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="215" y1="52" x2="234" y2="64" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="215" y1="52" x2="196" y2="64" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Turbine 2 (Right Ridge near Sunrise) */}
                  <line x1="335" y1="104" x2="335" y2="56" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="335" cy="56" r="2.5" fill="#ffffff" />
                  <line x1="335" y1="56" x2="349" y2="38" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="335" y1="56" x2="349" y2="73" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="335" y1="56" x2="317" y2="58" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

                  {/* Turbine 3 (Far Right Ridge) */}
                  <line x1="380" y1="112" x2="380" y2="72" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
                  <circle cx="380" cy="72" r="2" fill="#ffffff" />
                  <line x1="380" y1="72" x2="380" y2="58" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="380" y1="72" x2="393" y2="82" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="380" y1="72" x2="367" y2="82" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />

                  {/* Foreground Rolling Emerald Hills */}
                  <path d="M110,200 Q195,120 285,125 Q345,130 400,118 L400,200 Z" fill="url(#hillFront)" />

                  {/* Photovoltaic Solar Panel Arrays in Foreground */}
                  <polygon points="215,148 255,141 265,158 220,166" fill="url(#solarBlue)" stroke="#e0f2fe" strokeWidth="0.8" />
                  <line x1="235" y1="145" x2="242" y2="162" stroke="#bae6fd" strokeWidth="0.5" />
                  <line x1="217" y1="157" x2="260" y2="149" stroke="#bae6fd" strokeWidth="0.5" />

                  <polygon points="268,138 310,132 322,150 278,158" fill="url(#solarBlue)" stroke="#e0f2fe" strokeWidth="0.8" />
                  <line x1="289" y1="135" x2="300" y2="154" stroke="#bae6fd" strokeWidth="0.5" />
                  <line x1="273" y1="148" x2="316" y2="141" stroke="#bae6fd" strokeWidth="0.5" />

                  <polygon points="325,130 368,124 380,142 335,149" fill="url(#solarBlue)" stroke="#e0f2fe" strokeWidth="0.8" />
                  <line x1="346" y1="127" x2="357" y2="146" stroke="#bae6fd" strokeWidth="0.5" />
                  <line x1="330" y1="140" x2="374" y2="133" stroke="#bae6fd" strokeWidth="0.5" />
                </svg>

                {/* Soft gradient fade into left card dark emerald background */}
                <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#043d2e]/55 to-[#032e22]" />

                {/* Ambient Warm Sunbeam Flare */}
                <div className="absolute right-14 top-1 w-44 h-44 rounded-full bg-amber-300/25 blur-2xl pointer-events-none" />
              </div>

              {/* Top Row: User Avatar & Details + VIP Badge */}
              <div className="relative z-10 flex items-start justify-between">
                {/* Left: User Avatar & Details */}
                <div className="flex items-center gap-3">
                  {/* Circular User Avatar with Crown only when VIP 1+ */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#022119] border-2 border-[#00e676] flex items-center justify-center text-white shadow-lg shadow-emerald-950/60">
                      <User className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    {/* Gold Crown only appears once user achieves VIP 1 or higher */}
                    {(user.vipLevel ?? 0) >= 1 && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 drop-shadow-md">
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </div>
                    )}
                  </div>

                  {/* User Details */}
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight">
                        {user.name}
                      </h2>
                      {user.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00c853]/25 border border-[#00e676]/40 text-[10.5px] font-bold text-[#00e676] leading-none">
                          <CheckCircle2 className="w-3 h-3 text-[#00e676]" />
                          <span>{currentLang === 'bn' ? 'যাচাইকৃত' : 'Verified'}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-emerald-100/80 font-medium">
                      {currentLang === 'bn' ? 'সদস্য হয়েছেন: ' : 'Member since: '}
                      {user.memberSince}
                    </p>

                    {/* ID with Copy Icon */}
                    <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-medium">
                      <span className="font-mono">ID: {user.memberId}</span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="p-0.5 hover:bg-white/20 rounded transition-colors text-white cursor-pointer"
                        title="Copy ID"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-emerald-200" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: VIP Badge - shows VIP 0 until VIP 1 is reached */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold shadow-md backdrop-blur-xs ${
                    (user.vipLevel ?? 0) >= 1
                      ? 'bg-black/55 border-amber-400/50 text-white'
                      : 'bg-black/45 border-emerald-500/30 text-emerald-100'
                  }`}>
                    <Crown className={`w-4 h-4 ${(user.vipLevel ?? 0) >= 1 ? 'text-amber-400 fill-amber-400' : 'text-slate-300 fill-slate-300'}`} />
                    <span>VIP {user.vipLevel ?? 0}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSubModal('edit')}
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer ml-1"
                    title="Edit Profile"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Bottom 3-Column Stats Container - Shifted down so the sunrise & landscape shine clearly */}
              <div className="relative z-10 mt-12 sm:mt-16 rounded-2xl bg-black/50 border border-emerald-500/25 backdrop-blur-md p-2.5 sm:p-3 grid grid-cols-3 divide-x divide-white/10 text-white shadow-lg">
                {/* 1. Total Earnings */}
                <div className="flex items-center gap-2 sm:gap-2.5 px-1 sm:px-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-[#00e676] shrink-0">
                    <Coins className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#00e676]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium leading-none mb-1 truncate">
                      {currentLang === 'bn' ? 'মোট আয়' : 'Total Earnings'}
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-black text-[#00e676] font-mono tracking-tight leading-none block">
                      ৳{(user.totalEarnings ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 2. Active Units */}
                <div className="flex items-center gap-2 sm:gap-2.5 px-1 sm:px-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                    <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-teal-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium leading-none mb-1 truncate">
                      {currentLang === 'bn' ? 'সক্রিয় ইউনিট' : 'Active Units'}
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-black text-white font-mono tracking-tight leading-none block">
                      {user.activeUnits ?? 0} {currentLang === 'bn' ? 'ইউনিট' : 'Units'}
                    </span>
                  </div>
                </div>

                {/* 3. Daily Rewards */}
                <div className="flex items-center gap-2 sm:gap-2.5 px-1 sm:px-2">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-[#00e676] shrink-0">
                    <Wallet className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#00e676]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium leading-none mb-1 truncate">
                      {currentLang === 'bn' ? 'দৈনিক রিওয়ার্ড' : 'Daily Rewards'}
                    </span>
                    <span className="text-xs sm:text-sm md:text-base font-black text-[#00e676] font-mono tracking-tight leading-none block">
                      ৳{(user.dailyRewards ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Account Balance Card with Recharge & Withdraw */}
            <div
              id="wallet-balance-card"
              className={`mt-4 px-5 py-4 rounded-[22px] transition-colors duration-200 shrink-0 space-y-3.5 ${
                themeMode === 'day'
                  ? 'bg-white border border-slate-200/90 shadow-sm'
                  : 'bg-[#062c22]/90 border border-emerald-500/25 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`block text-xs font-medium mb-0.5 ${
                      themeMode === 'day' ? 'text-slate-500' : 'text-slate-300'
                    }`}>
                      {currentLang === 'bn' ? 'অ্যাকাউন্ট ব্যালেন্স' : 'Account Balance'}
                    </span>
                    <span className={`text-2xl sm:text-[26px] font-bold tracking-tight font-mono ${
                      themeMode === 'day' ? 'text-slate-900' : 'text-white'
                    }`}>
                      ৳{(user.walletBalance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubModal('wallet')}
                  className={`flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer group ${
                    themeMode === 'day' ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-300'
                  }`}
                >
                  <span>{currentLang === 'bn' ? 'ওয়ালেট দেখুন' : 'View Wallet'}</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Recharge & Withdraw Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-emerald-500/15">
                <button
                  id="profile-recharge-btn"
                  type="button"
                  onClick={() => setActiveSubModal('recharge')}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4 text-slate-950" />
                  <span>{currentLang === 'bn' ? 'রিচার্জ' : 'Recharge'}</span>
                </button>

                <button
                  id="profile-withdraw-btn"
                  type="button"
                  onClick={() => setActiveSubModal('withdraw')}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer ${
                    themeMode === 'day'
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                      : 'bg-[#042018] hover:bg-[#072c21] text-white border border-emerald-500/30'
                  }`}
                >
                  <ArrowUpFromLine className="w-4 h-4 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'উইথড্র' : 'Withdraw'}</span>
                </button>
              </div>
            </div>

            {/* 3. Single Unified Profile Menu Container (All Subtitles Removed as Requested) */}
            <div
              id="profile-menu-container"
              className={`mt-4 rounded-[22px] overflow-hidden divide-y transition-colors border shadow-sm ${
                themeMode === 'day'
                  ? 'bg-white border-slate-200/90 divide-slate-100'
                  : 'bg-[#062c22]/90 border-emerald-500/25 divide-emerald-500/15'
              }`}
            >
              {/* 1. Personal Information */}
              <button
                id="profile-personal-info-btn"
                type="button"
                onClick={() => setActiveSubModal('personal')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 2. Security Settings */}
              <button
                id="profile-security-settings-btn"
                type="button"
                onClick={() => setActiveSubModal('security')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'নিরাপত্তা সেটিংস' : 'Security Settings'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 3. Google Authenticator */}
              <button
                id="profile-google-authenticator-btn"
                type="button"
                onClick={() => setActiveSubModal('authenticator')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'গুগল অথেন্টিকেটর' : 'Google Authenticator'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>{currentLang === 'bn' ? 'চালু আছে' : 'Active'}</span>
                  </span>
                  <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                    themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                </div>
              </button>

              {/* 4. Daily Town Hall */}
              <button
                id="profile-daily-town-hall-btn"
                type="button"
                onClick={() => setActiveSubModal('townHall')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Mic className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'দৈনিক টাউন হল' : 'Daily Town Hall'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>8:30 PM</span>
                  </span>
                  <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                    themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                </div>
              </button>

              {/* 5. Payment Methods (Add Wallet) */}
              <button
                id="profile-payment-methods-btn"
                type="button"
                onClick={() => setActiveSubModal('payment')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'পেমেন্ট মেথড (Add Wallet)' : 'Payment Methods (Add Wallet)'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 6. Notification Settings */}
              <button
                type="button"
                onClick={() => setActiveSubModal('notifications')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Bell className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'নোটিফিকেশন সেটিংস' : 'Notification Settings'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 7. Official Mobile App (APK) */}
              <button
                id="profile-app-download-button"
                type="button"
                onClick={handleAppDownloadClick}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Smartphone className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'অফিসিয়াল মোবাইল অ্যাপ (APK)' : 'Official Mobile App (APK)'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 8. Company Profile & Architecture */}
              <button
                id="profile-company-profile-btn"
                type="button"
                onClick={() => setActiveSubModal('companyInfo')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'কোম্পানি প্রোফাইল ও আর্কিটেকচার' : 'Company Profile & Architecture'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 9. Official Licences & Certifications */}
              <button
                id="profile-licenses-btn"
                type="button"
                onClick={() => setActiveSubModal('licenses')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'অফিসিয়াল লাইসেন্স ও সনদপত্র' : 'Official Licences & Certifications'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>{currentLang === 'bn' ? 'অনুমোদিত' : 'Verified'}</span>
                  </span>
                  <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                    themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                </div>
              </button>

              {/* 10. 24/7 Priority Support & Helpline */}
              <button
                id="profile-helpline-btn"
                type="button"
                onClick={() => setActiveSubModal('helpline')}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <Headphones className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? '২৪/৭ সাপোর্ট ও হেল্পলাইন' : '24/7 Priority Support & Helpline'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    <span>Live</span>
                  </span>
                  <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                    themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                </div>
              </button>

              {/* 11. Logout */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-rose-50' : 'hover:bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shrink-0">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[15px] font-semibold text-rose-400 group-hover:text-rose-300 transition-colors">
                    {currentLang === 'bn' ? 'লগআউট' : 'Logout'}
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-rose-500' : 'text-slate-500 group-hover:text-rose-400'
                }`} />
              </button>
            </div>

            {/* Theme Toggle Strip (Day / Night Switch) */}
            <div className="mt-3 flex items-center justify-center">
              <div className={`inline-flex items-center p-1 rounded-full border shadow-xs ${
                themeMode === 'day' ? 'bg-white border-slate-200' : 'bg-[#062c22]/90 border-emerald-500/25'
              }`}>
                <button
                  type="button"
                  onClick={() => handleToggleTheme('day')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    themeMode === 'day'
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>{currentLang === 'bn' ? 'ডে মোড' : 'Day Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTheme('night')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    themeMode === 'night'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-slate-950" />
                  <span>{currentLang === 'bn' ? 'নাইট মোড' : 'Night Mode'}</span>
                </button>
              </div>
            </div>

            {/* Official App Footer & Compliance Badges (Eliminates Empty Space) */}
            <div className={`mt-4 mb-2 p-4 rounded-2xl border text-center space-y-2.5 transition-colors duration-200 ${
              themeMode === 'day'
                ? 'bg-white border-slate-200/90 shadow-sm text-slate-600'
                : 'bg-[#0b1222]/80 border-slate-800/80 text-slate-400'
            }`}>
              <div className="flex items-center justify-center gap-2 flex-wrap text-[11px]">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  {currentLang === 'bn' ? 'বিইআরসি লাইসেন্সপ্রাপ্ত' : 'BERC Regulated'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                  ISO 50001
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  256-Bit SSL
                </span>
              </div>
              <div className="text-[11px] leading-tight">
                <p className={`font-semibold ${themeMode === 'day' ? 'text-slate-800' : 'text-slate-300'}`}>
                  NVT • Nova Terra Energy Grid Platform BD
                </p>
                <p className={`text-[10px] font-mono mt-0.5 ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>
                  App Version 2.4.2 (Official Release)
                </p>
                <p className={`text-[10px] mt-1 ${themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'}`}>
                  © 2026 Nova Terra Energy (NVT) BD Ltd. {currentLang === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Bottom Navigation Bar (Mobile View only, hidden on desktop) */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto backdrop-blur-lg border-t transition-colors duration-200 ${
        themeMode === 'day'
          ? 'bg-white/95 border-slate-200/90 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]'
          : 'bg-[#001228]/95 border-slate-800/80'
      }`}>
        <nav
          id="bottom-navbar"
          className="w-full px-2 py-2 flex items-center justify-around"
        >
          {/* Home */}
          <button
            type="button"
            onClick={() => switchTab('home')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'home'
                ? themeMode === 'day'
                  ? 'text-emerald-600 font-extrabold bg-emerald-50'
                  : 'text-[#00e676] font-extrabold bg-[#00e676]/10'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Home className={`w-5 h-5 ${
              currentTab === 'home'
                ? themeMode === 'day'
                  ? 'text-emerald-600'
                  : 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                : themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'হোম' : 'Home'}</span>
            {currentTab === 'home' && (
              <span className={`absolute -bottom-1 w-5 h-1 rounded-full ${
                themeMode === 'day' ? 'bg-emerald-600' : 'bg-[#00e676] shadow-[0_0_8px_#00e676]'
              }`} />
            )}
          </button>

          {/* Invest */}
          <button
            type="button"
            onClick={() => switchTab('invest')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'invest'
                ? themeMode === 'day'
                  ? 'text-emerald-600 font-extrabold bg-emerald-50'
                  : 'text-[#00e676] font-extrabold bg-[#00e676]/10'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${
              currentTab === 'invest'
                ? themeMode === 'day'
                  ? 'text-emerald-600'
                  : 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                : themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'ইনভেস্ট' : 'Invest'}</span>
            {currentTab === 'invest' && (
              <span className={`absolute -bottom-1 w-5 h-1 rounded-full ${
                themeMode === 'day' ? 'bg-emerald-600' : 'bg-[#00e676] shadow-[0_0_8px_#00e676]'
              }`} />
            )}
          </button>

          {/* History (Clock icon matching screenshot) */}
          <button
            type="button"
            onClick={() => switchTab('transactions')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'transactions'
                ? themeMode === 'day'
                  ? 'text-emerald-600 font-extrabold bg-emerald-50'
                  : 'text-[#00e676] font-extrabold bg-[#00e676]/10'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Clock className={`w-5 h-5 ${
              currentTab === 'transactions'
                ? themeMode === 'day'
                  ? 'text-emerald-600'
                  : 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                : themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'হিস্ট্রি' : 'History'}</span>
            {currentTab === 'transactions' && (
              <span className={`absolute -bottom-1 w-5 h-1 rounded-full ${
                themeMode === 'day' ? 'bg-emerald-600' : 'bg-[#00e676] shadow-[0_0_8px_#00e676]'
              }`} />
            )}
          </button>

          {/* Promo Bonus (Gift icon matching screenshot) */}
          <button
            id="bottom-nav-promo-bonus-btn"
            type="button"
            onClick={() => switchTab('wallet')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'wallet'
                ? themeMode === 'day'
                  ? 'text-emerald-600 font-extrabold bg-emerald-50'
                  : 'text-[#00e676] font-extrabold bg-[#00e676]/10'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Gift className={`w-5 h-5 ${
              currentTab === 'wallet'
                ? themeMode === 'day'
                  ? 'text-emerald-600'
                  : 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                : themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'প্রমো বোনাস' : 'Promo Bonus'}</span>
            {currentTab === 'wallet' && (
              <span className={`absolute -bottom-1 w-5 h-1 rounded-full ${
                themeMode === 'day' ? 'bg-emerald-600' : 'bg-[#00e676] shadow-[0_0_8px_#00e676]'
              }`} />
            )}
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => switchTab('profile')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'profile'
                ? themeMode === 'day'
                  ? 'text-emerald-600 font-extrabold bg-emerald-50'
                  : 'text-[#00e676] font-extrabold bg-[#00e676]/10'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <User className={`w-5 h-5 ${
              currentTab === 'profile'
                ? themeMode === 'day'
                  ? 'text-emerald-600'
                  : 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                : themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
            {currentTab === 'profile' && (
              <span className={`absolute -bottom-1 w-5 h-1 rounded-full ${
                themeMode === 'day' ? 'bg-emerald-600' : 'bg-[#00e676] shadow-[0_0_8px_#00e676]'
              }`} />
            )}
          </button>
        </nav>
      </div>

      {/* App Download Modal */}
      <AppDownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        currentLang={currentLang}
      />

      {/* Sub-Modals (Personal Info, Security, Wallet, Edit, Logout) */}
      {activeSubModal === 'wallet' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#0e1628] border border-slate-700 rounded-3xl p-5 text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-4 h-4 text-blue-400" /> My Wallet
              </h3>
              <button
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 rounded-xl bg-[#131e36] text-center">
              <span className="text-xs text-slate-400">Available Balance</span>
              <p className="text-2xl font-bold text-white font-mono mt-0.5">
                ৳{user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveSubModal('recharge');
                }}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>+ Recharge</span>
              </button>
              <button
                onClick={() => {
                  setActiveSubModal('withdraw');
                }}
                className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                <span>- Withdraw</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Fintech Deposit Modal */}
      {activeSubModal === 'recharge' && (
        <DepositModal
          isOpen={true}
          onClose={() => setActiveSubModal(null)}
          currentBalance={user.walletBalance}
          currentLang={currentLang}
          onProceed={(amt, method, channel, manualDetails) => {
            handleInitiateDeposit(amt, method, channel, manualDetails);
          }}
          onOpenHistory={() => {
            setActiveSubModal(null);
            switchTab('transactions');
          }}
        />
      )}

      {/* Withdraw Modal with Bound Payment Method, Authenticator Code, and Pop-up Receipt */}
      {activeSubModal === 'withdraw' && (
        <WithdrawModal
          currentLang={currentLang}
          walletBalance={user.walletBalance}
          userName={user.fullName || user.name}
          onClose={() => setActiveSubModal(null)}
          onWithdrawSuccess={(amt, details) => {
            updateUser((prev) => ({
              ...prev,
              walletBalance: Math.max(0, prev.walletBalance - amt),
              transactions: [
                {
                  id: details.trxId,
                  type: 'withdrawal',
                  amount: -amt,
                  timestamp: `${details.dateStr} ${details.timeStr}`,
                  status: 'completed',
                  description: `Payout to ${details.walletMethod} (${details.accountNumber.slice(-4)})`,
                  hash: details.trxId,
                },
                ...(prev.transactions || []),
              ],
            }));
          }}
          onOpenAddWallet={() => setActiveSubModal('payment')}
          onOpenRecharge={() => setActiveSubModal('recharge')}
          showToast={showToast}
        />
      )}

      {activeSubModal === 'personal' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#0e1628] border border-slate-700 rounded-3xl p-5 text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" /> Personal Info
              </h3>
              <button
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#131e36] flex justify-between">
                <span className="text-slate-400">Full Name</span>
                <span className="font-semibold text-white">{user.name}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#131e36] flex justify-between">
                <span className="text-slate-400">Phone Number</span>
                <span className="font-semibold text-white">{user.phone}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#131e36] flex justify-between">
                <span className="text-slate-400">Member ID</span>
                <span className="font-semibold text-blue-400">{user.memberId}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-full py-2 rounded-xl bg-blue-600 font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {activeSubModal === 'security' && (
        <SecuritySettingsPage
          currentLang={currentLang}
          userPhone={user.phone}
          onClose={() => setActiveSubModal(null)}
          showToast={showToast}
          onOpen2FA={() => setActiveSubModal('authenticator')}
        />
      )}

      {activeSubModal === 'payment' && (
        <AddWalletPaymentModal
          currentLang={currentLang}
          userName={user.name}
          onClose={() => setActiveSubModal(null)}
          showToast={showToast}
        />
      )}

      {activeSubModal === 'notifications' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#0e1628] border border-slate-700 rounded-3xl p-5 text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-400" /> Notifications
              </h3>
              <button
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#131e36]">
                <p className="font-semibold text-white">Daily Profit Credited</p>
                <p className="text-slate-400 text-[10px]">৳250.00 has been added to your wallet.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubModal(null)}
              className="w-full py-2 rounded-xl bg-blue-600 font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {activeSubModal === 'edit' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#0e1628] border border-slate-700 rounded-3xl p-5 text-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" /> Edit Profile
              </h3>
              <button
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => updateUser((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 rounded-xl bg-[#131e36] border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Phone</label>
                <input
                  type="text"
                  value={user.phone}
                  onChange={(e) => updateUser((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full p-2 rounded-xl bg-[#131e36] border border-slate-700 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => {
                showToast('Profile updated!');
                setActiveSubModal(null);
              }}
              className="w-full py-2 rounded-xl bg-blue-600 font-bold text-xs"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Google Authenticator Modal */}
      {activeSubModal === 'authenticator' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-[360px] bg-[#0c1324] border border-cyan-500/30 rounded-3xl p-5 text-white space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Google Authenticator</h3>
                  <p className="text-[11px] text-slate-400">Two-Factor Authentication (2FA)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Status Toggle Card */}
            <div className="p-3 rounded-2xl bg-[#131d36] border border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Authenticator Status</span>
                <span className="text-[10px] text-slate-400">Protects withdrawals & login</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextState = !isAuthenticatorEnabled;
                  setIsAuthenticatorEnabled(nextState);
                  showToast(nextState ? 'Google Authenticator Activated!' : 'Google Authenticator Deactivated');
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isAuthenticatorEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAuthenticatorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* QR Code Simulation */}
            <div className="bg-[#11182c] border border-slate-800 rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
              <div className="text-[11px] text-slate-300 font-medium">
                Scan QR Code with Google Authenticator
              </div>
              
              {/* Realistic SVG QR Matrix */}
              <div className="w-36 h-36 bg-white rounded-xl p-2 flex items-center justify-center shadow-inner relative group">
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-slate-900"
                  fill="currentColor"
                >
                  {/* Top-Left Finder */}
                  <rect x="5" y="5" width="28" height="28" fill="#0f172a" rx="3" />
                  <rect x="10" y="10" width="18" height="18" fill="white" rx="2" />
                  <rect x="14" y="14" width="10" height="10" fill="#0f172a" rx="1.5" />
                  
                  {/* Top-Right Finder */}
                  <rect x="67" y="5" width="28" height="28" fill="#0f172a" rx="3" />
                  <rect x="72" y="10" width="18" height="18" fill="white" rx="2" />
                  <rect x="76" y="14" width="10" height="10" fill="#0f172a" rx="1.5" />
                  
                  {/* Bottom-Left Finder */}
                  <rect x="5" y="67" width="28" height="28" fill="#0f172a" rx="3" />
                  <rect x="10" y="72" width="18" height="18" fill="white" rx="2" />
                  <rect x="14" y="76" width="10" height="10" fill="#0f172a" rx="1.5" />

                  {/* Matrix Patterns */}
                  <rect x="40" y="8" width="6" height="6" fill="#0f172a" />
                  <rect x="50" y="14" width="8" height="6" fill="#0f172a" />
                  <rect x="42" y="24" width="6" height="8" fill="#0f172a" />
                  <rect x="52" y="26" width="6" height="6" fill="#0f172a" />
                  
                  <rect x="8" y="40" width="6" height="8" fill="#0f172a" />
                  <rect x="18" y="44" width="8" height="6" fill="#0f172a" />
                  <rect x="28" y="40" width="6" height="6" fill="#0f172a" />
                  
                  {/* Center Key icon */}
                  <rect x="40" y="40" width="20" height="20" fill="#0f172a" rx="3" />
                  <circle cx="50" cy="50" r="5" fill="#38bdf8" />

                  {/* Lower Right Matrix */}
                  <rect x="68" y="42" width="8" height="6" fill="#0f172a" />
                  <rect x="80" y="40" width="6" height="8" fill="#0f172a" />
                  <rect x="68" y="54" width="6" height="6" fill="#0f172a" />
                  <rect x="80" y="52" width="8" height="6" fill="#0f172a" />
                  <rect x="40" y="68" width="6" height="8" fill="#0f172a" />
                  <rect x="52" y="74" width="8" height="6" fill="#0f172a" />
                  <rect x="42" y="82" width="6" height="6" fill="#0f172a" />
                  <rect x="68" y="72" width="8" height="6" fill="#0f172a" />
                  <rect x="82" y="70" width="6" height="8" fill="#0f172a" />
                  <rect x="74" y="84" width="8" height="6" fill="#0f172a" />
                </svg>
              </div>

              {/* Secret Key with Copy */}
              <div className="w-full">
                <span className="text-[10px] text-slate-400 block mb-1">Or enter setup key manually:</span>
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#090e1b] border border-slate-700/80">
                  <code className="text-xs font-mono text-cyan-300 tracking-wider">
                    {authSecretKey}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText?.(authSecretKey);
                      setIsAuthKeyCopied(true);
                      showToast('Setup Key copied to clipboard!');
                      setTimeout(() => setIsAuthKeyCopied(false), 2000);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Copy Key"
                  >
                    {isAuthKeyCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Verification Input */}
            <div className="space-y-2">
              <label className="text-[11px] text-slate-300 font-medium block">
                Enter 6-digit Code from Authenticator:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={authInputCode}
                  onChange={(e) => setAuthInputCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000 000"
                  className="flex-1 px-3 py-2 text-center font-mono tracking-[0.3em] text-sm bg-[#131d36] border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (authInputCode.length === 6) {
                      showToast('2FA Code Verified Successfully!');
                      setAuthInputCode('');
                    } else {
                      showToast('Please enter a 6-digit code');
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shrink-0 transition-colors"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Done / Close Button */}
            <button
              type="button"
              onClick={() => {
                showToast('Google Authenticator configuration saved!');
                setActiveSubModal(null);
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
            >
              Done & Save
            </button>
          </div>
        </div>
      )}

      {/* Daily Town Hall (দৈনিক জনসভা) Modal */}
      {activeSubModal === 'townHall' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-[360px] bg-[#0c1324] border border-indigo-500/30 rounded-3xl p-5 text-white space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Daily Town Hall</h3>
                  <p className="text-[11px] text-slate-400">Community Gathering & Briefing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Live Assembly Status Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Every Evening
                </span>
                <span className="text-[11px] font-semibold text-indigo-300">08:30 PM BST</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Daily Member Strategy & Yield Briefing</h4>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Connect live with senior portfolio analysts and top community leaders.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                <Users className="w-3 h-3 text-indigo-400" />
                <span>2,840+ Investors attending today</span>
              </div>
            </div>

            {/* Today's Agenda */}
            <div className="p-3 rounded-2xl bg-[#11182c] border border-slate-800/80 space-y-2">
              <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Today's Meeting Agenda:</span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-slate-300 pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Daily portfolio yields & bonus profit distribution breakdown</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>VIP referral contest leaderboard & instant reward rollout</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-400 font-bold">•</span>
                  <span>Open mic Q&A session with Chief Portfolio Director</span>
                </li>
              </ul>
            </div>

            {/* Interactive Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsTownHallJoined(true);
                  showToast('Connecting to Daily Town Hall live audio stream...');
                }}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isTownHallJoined
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/20'
                }`}
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{isTownHallJoined ? 'Connected to Live Session' : 'Join Live Assembly Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextState = !isTownHallReminderSet;
                  setIsTownHallReminderSet(nextState);
                  showToast(
                    nextState
                      ? 'Reminder set! You will be alerted at 08:15 PM'
                      : 'Meeting reminder turned off'
                  );
                }}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {isTownHallReminderSet ? 'Reminder Active (08:15 PM)' : 'Set Daily Session Reminder'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Modals */}
      {/* 1 & 2. Company Profile & Official Licenses */}
      {(activeSubModal === 'companyInfo' || activeSubModal === 'licenses') && (
        <CompanyProfileModal
          isOpen={true}
          onClose={() => setActiveSubModal(null)}
          currentLang={currentLang}
          initialTab={activeSubModal === 'licenses' ? 'licenses' : 'overview'}
        />
      )}

      {/* 3. Substations Modal */}
      {activeSubModal === 'substations' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#0e1628] border border-cyan-500/30 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentLang === 'bn' ? 'বিদ্যুৎ সাবস্টেশন নেটওয়ার্ক' : 'Grid Substation Network'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {currentLang === 'bn' ? '১৪টি রিয়েল-টাইম পাওয়ার নোড' : '14 Automated Power Nodes'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Dhaka North Smart Substation', load: '120 MW', status: 'Online 99.98%' },
                { name: 'Chattogram Industrial Grid Node', load: '140 MW', status: 'Online 100%' },
                { name: 'Sylhet Hydro-Hybrid Substation', load: '85 MW', status: 'Online 99.95%' },
                { name: 'Rajshahi Solar Hub #4', load: '95 MW', status: 'Online 100%' },
                { name: 'Khulna Eco Power Station', load: '60 MW', status: 'Online 99.91%' },
              ].map((sub, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#11182c] border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-white block">{sub.name}</span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {sub.status}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 text-[11px]">
                    {sub.load}
                  </span>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white text-xs transition-colors cursor-pointer mt-2"
              >
                {currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Engineering Team Modal */}
      {activeSubModal === 'engineering' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#0e1628] border border-indigo-500/30 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentLang === 'bn' ? 'প্রধান প্রকৌশলী দল' : 'Executive Engineering Team'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {currentLang === 'bn' ? 'এআই পাওয়ার ম্যানেজমেন্ট বিশেষজ্ঞ' : 'AI Power System Specialists'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Dr. Tariqul Islam, Ph.D.', role: 'Chief Technical Officer (CTO)', org: 'Ex-Siemens Smart Grid' },
                { name: 'Engr. Sarah Rahman', role: 'Head of AI Transmission', org: 'BUET Electrical Fellow' },
                { name: 'Kazi Mahbub Alam', role: 'Director of Plant Safety', org: 'ISO Lead Auditor' },
              ].map((eng, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-[#11182c] border border-slate-800 space-y-1">
                  <span className="font-bold text-white block">{eng.name}</span>
                  <span className="text-indigo-300 text-[11px] block">{eng.role}</span>
                  <span className="text-slate-400 text-[10px] block">{eng.org}</span>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white text-xs transition-colors cursor-pointer mt-2"
              >
                {currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ESG Audit Modal */}
      {activeSubModal === 'esg' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#0e1628] border border-emerald-500/30 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Leaf className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentLang === 'bn' ? 'ইএসজি ও গ্রিন অডিট' : 'ESG & Green Energy Audit'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {currentLang === 'bn' ? 'পরিবেশবান্ধব বিদ্যুৎ প্রকল্প' : 'Environmental, Social & Governance'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                <span className="font-bold text-emerald-300 block">Carbon Offset Achieved</span>
                <p className="text-[11px] text-slate-300">Over 350,000 Metric Tons of CO₂ emissions prevented through automated AI load balancing.</p>
              </div>

              <div className="p-2.5 rounded-xl bg-[#11182c] border border-slate-800 flex justify-between items-center">
                <span>Green Power Ratio:</span>
                <span className="font-bold text-emerald-400">92.4% Renewable</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#11182c] border border-slate-800 flex justify-between items-center">
                <span>Community Reinvestment:</span>
                <span className="font-bold text-cyan-400">5.0% of Net Profits</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs transition-colors cursor-pointer mt-2"
              >
                {currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Corporate Helpline 24/7 Modal */}
      {activeSubModal === 'helpline' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#0e1628] border border-rose-500/30 rounded-3xl p-5 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <Headphones className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {currentLang === 'bn' ? '২৪/৭ কর্পোরেট হেল্পলাইন' : '24/7 Priority Helpline'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {currentLang === 'bn' ? 'গ্রাহক সহায়তা ও জরুরি সেবা' : 'Customer Support & Dispatch'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <a
                href="tel:+8809612001122"
                className="p-3 rounded-2xl bg-[#11182c] hover:bg-[#162244] border border-slate-800 flex items-center justify-between transition-colors block"
              >
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="font-bold text-white block">Toll-Free Hotline</span>
                    <span className="text-[11px] text-slate-400">09612-001122</span>
                  </div>
                </div>
                <span className="text-[10px] text-rose-400 font-semibold">Call Now</span>
              </a>

              <a
                href="mailto:support@ai-energy.bd"
                className="p-3 rounded-2xl bg-[#11182c] hover:bg-[#162244] border border-slate-800 flex items-center justify-between transition-colors block"
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-bold text-white block">Official Support Desk</span>
                    <span className="text-[11px] text-slate-400">support@ai-energy.bd</span>
                  </div>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold">Email</span>
              </a>

              <div className="p-3 rounded-2xl bg-[#11182c] border border-slate-800 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Corporate Headquarters</span>
                  <span className="text-[11px] text-slate-400 leading-tight block">
                    Level 14, Silicon Energy Tower, Road 11, Gulshan-2, Dhaka-1212
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white text-xs transition-colors cursor-pointer mt-2"
              >
                {currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#0e1628] border border-rose-500/30 rounded-3xl p-5 text-white space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">
              {currentLang === 'bn' ? 'লগআউট নিশ্চিতকরণ' : 'Logout Confirmation'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentLang === 'bn'
                ? 'আপনি কি নিশ্চিত যে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?'
                : 'Are you sure you want to log out of your account?'}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                {currentLang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30"
              >
                {currentLang === 'bn' ? 'লগআউট' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
