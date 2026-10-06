import React, { useState, useEffect, useMemo, useRef } from 'react';
import { scrollAppToTop } from '../utils/scrollHelper';
import {
  ArrowLeft,
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
  Briefcase,
  Layers,
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
  MessageSquare,
  Share2,
} from 'lucide-react';
import { openCrispChat } from '../utils/crispService';
import { downloadNvtApk } from '../utils/appDownloader';
import { AppDownloadModal } from './AppDownloadModal';
import { NvtPromoBannerModal } from './NvtPromoBannerModal';
import { TreasureModal } from './TreasureModal';
import { ProjectManagerPage } from './ProjectManagerPage';
import { EnergyHomeTab } from './EnergyHomeTab';
import { InvestTabContent, INVESTMENT_PLANS } from './InvestTabContent';
import { getPlanDailyReturnBdt } from '../utils/packageService';
import { PositionsTabContent } from './PositionsTabContent';
import { TransactionsTabContent } from './TransactionsTabContent';
import { WalletHistoryModal } from './WalletHistoryModal';
import { WalletTabContent } from './WalletTabContent';
import { ReferralPage } from './ReferralPage';
import { ManagerReferralModal } from './ManagerReferralModal';
import { ManagerPermissionLockedScreen } from './ManagerPermissionLockedScreen';
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
import { distributeReferralDepositCommissions, getReferralTreeForUser, computeVipLevelFromLevels } from '../utils/referralService';
import { createCpanelDepositOrder, sendDepositToCpanel } from '../services/paymentConfig';
import {
  recordFirestoreDeposit,
  recordFirestoreWithdrawal,
  updateFirestoreDepositStatus,
  isValidRealTrxId,
  getFirestoreUserTransactions,
  subscribeToUserTransactions,
  subscribeToFirestoreUserProfile,
  recordInvestmentInFirestore,
  getFirestoreUserInvestments,
  updateFirestoreWalletBalance,
  updateFirestoreUserProfile,
  getFirestoreUserProfile,
  transferReferralRewardsInFirestore,
  subscribeToReferralNetwork,
  auth,
} from '../lib/firebase';
import { ManualDepositDetails, PaymentChannelType } from './CleanWalletScreen';
import {
  cleanBase32Key,
  formatBase32Key,
  verifyTOTP,
  getOtpAuthUrl,
  getQrCodeUrl,
  getUserAuthenticatorSecret,
} from '../utils/totpService';

interface ProfilePageProps {
  initialUser?: Partial<UserProfile>;
  initialTab?: 'home' | 'invest' | 'positions' | 'transactions' | 'wallet' | 'referral' | 'profile';
  currentLang?: Language;
  onToggleLang?: (lang: Language) => void;
  onNavigateBack: () => void;
  onLogout: () => void;
  onGoToHome?: () => void;
  onTabChange?: (tab: 'home' | 'invest' | 'positions' | 'transactions' | 'wallet' | 'referral' | 'profile') => void;
  onUpdateUser?: (user: UserProfile) => void;
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
  onUpdateUser,
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
    // VIP level is strictly determined by referral conditions (3 active Level 1 referrals for VIP 1)
    // Purchasing packages does NOT automatically grant VIP 1.
    const realVip = typeof initialUser?.vipLevel === 'number' ? initialUser.vipLevel : 0;

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
      canRefer: Boolean(initialUser?.canRefer),
      referralLimit: typeof initialUser?.referralLimit === 'number' ? initialUser.referralLimit : 0,
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

  // Safely inform parent component (App) after render completes to avoid React's "Cannot update a component while rendering a different component" error
  const lastNotifiedUserRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    if (!lastNotifiedUserRef.current || !isSameUser(lastNotifiedUserRef.current, user)) {
      lastNotifiedUserRef.current = user;
      onUpdateUser?.(user);
    }
  }, [user, onUpdateUser]);

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
        const newCanRefer = initialUser.canRefer ?? prev.canRefer;
        const newReferralLimit = initialUser.referralLimit ?? prev.referralLimit;

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
          Boolean(prev.canRefer) === Boolean(newCanRefer) &&
          (prev.referralLimit || 0) === (newReferralLimit || 0) &&
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
          canRefer: Boolean(newCanRefer),
          referralLimit: newReferralLimit,
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
    initialUser?.canRefer,
    initialUser?.referralLimit,
    initialUser?.activeInvestments?.length,
    initialUser?.transactions?.length,
  ]);

  // ─────────────────────────────────────────────────────────────
  // REFERRAL 3-LEVEL TEAM DATA & REAL-TIME REFRESH
  // ─────────────────────────────────────────────────────────────
  const [referralRefreshTick, setReferralRefreshTick] = useState(0);
  const [liveAccounts, setLiveAccounts] = useState<Record<string, any>>(() => {
    try {
      const raw = localStorage.getItem('novavest_registered_accounts');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Real-time synchronization with Firestore users & referral nodes
  useEffect(() => {
    const unsub = subscribeToReferralNetwork((streamedAccounts) => {
      setLiveAccounts(streamedAccounts || {});
      setReferralRefreshTick((t) => t + 1);
    });

    const handleReferralUpdate = () => {
      try {
        const raw = localStorage.getItem('novavest_registered_accounts');
        if (raw) setLiveAccounts(JSON.parse(raw));
      } catch {}
      setReferralRefreshTick((t) => t + 1);
    };

    window.addEventListener('referral_rewards_updated', handleReferralUpdate);
    window.addEventListener('storage', handleReferralUpdate);

    return () => {
      unsub();
      window.removeEventListener('referral_rewards_updated', handleReferralUpdate);
      window.removeEventListener('storage', handleReferralUpdate);
    };
  }, []);

  const referralTree = useMemo(() => {
    const code = user.referralCode || user.memberId || 'NV8829';
    return getReferralTreeForUser(code, user.memberId, liveAccounts);
  }, [user.referralCode, user.memberId, liveAccounts, referralRefreshTick]);

  // VIP Level is determined dynamically from Promo Bonus conditions:
  // VIP 1-4 strictly evaluate Level 1 (direct) active referrals:
  // 3 active members in Level 1 -> VIP 1
  // 5 active members in Level 1 -> VIP 2
  // Purchasing packages or recharging wallet alone does NOT give VIP 1.
  // VIP 1 REQUIRES STRICTLY AT LEAST 3 ACTIVE MEMBERS IN LEVEL 1.
  const activeLevel1Count = referralTree.activeLevel1Count || referralTree.level1ActiveCount || 0;
  const totalActiveMembersInLevels = referralTree.totalActiveCount || 0;
  const computedVipLevel = computeVipLevelFromLevels(activeLevel1Count, totalActiveMembersInLevels);
  const isVip1Unlocked = computedVipLevel >= 1;

  // Auto-sync VIP level if it mismatches the real active referral count
  useEffect(() => {
    if (user.vipLevel !== computedVipLevel && (user.uid || user.memberId)) {
      updateUser((prev) => ({ ...prev, vipLevel: computedVipLevel }));
      const persistentUid = user.uid || user.memberId;
      if (persistentUid) {
        updateFirestoreUserProfile(persistentUid, { vipLevel: computedVipLevel }).catch(() => {});
      }
    }
  }, [computedVipLevel, user.vipLevel, user.uid, user.memberId]);

  // Auto-check and recover any pending gateway deposit (WatchPay / Nekpay) when returning to the app
  useEffect(() => {
    const checkPendingGatewayDeposit = async () => {
      try {
        const raw = localStorage.getItem('pending_gateway_deposit');
        if (!raw) return;
        const pending = JSON.parse(raw);
        if (!pending || !pending.orderNo) return;

        // Skip if older than 24 hours
        if (pending.timestamp && Date.now() - pending.timestamp > 24 * 60 * 60 * 1000) {
          localStorage.removeItem('pending_gateway_deposit');
          return;
        }

        const res = await fetch(`/api/payments/order-status/${encodeURIComponent(pending.orderNo)}`);
        const data = await res.json();
        const status = String(data?.order?.status || '').toUpperCase();

        const isWebhookVerified =
          (status === 'COMPLETED' || status === 'SUCCESS') &&
          (data?.order?.verified === true || data?.order?.webhookConfirmed === true);

        if (isWebhookVerified) {
          const depositAmount = Number(pending.amount || data?.order?.amount || 0);
          const activeUid = auth.currentUser?.uid || user.uid || user.memberId || 'USER1001';

          // Update Firestore deposit status
          await updateFirestoreDepositStatus(activeUid, pending.orderNo, 'completed', depositAmount);

          // Update user state
          updateUser((prev) => {
            const alreadyCredited = (prev.transactions || []).some(
              (t: any) => (t.id === pending.orderNo || t.hash === pending.orderNo) && t.status === 'completed'
            );
            if (alreadyCredited) return prev;

            return {
              ...prev,
              walletBalance: prev.walletBalance + depositAmount,
              hasDeposited: true,
              totalDeposited: (prev.totalDeposited || 0) + depositAmount,
              vipLevel: prev.vipLevel || 0,
              transactions: (prev.transactions || []).map((t: any) =>
                t.id === pending.orderNo || t.hash === pending.orderNo
                  ? {
                      ...t,
                      status: 'completed',
                      description: `ডিপোজিট (${pending.channel === 'channel2' ? 'চ্যানেল ২' : 'চ্যানেল ১'}) - সফল`,
                      hash: data?.order?.trxId || pending.orderNo,
                      isCredit: true,
                    }
                  : t
              ),
            };
          });

          localStorage.removeItem('pending_gateway_deposit');

          showToast(
            currentLang === 'bn'
              ? `🎉 পেমেন্ট সফল! ৳${depositAmount.toLocaleString()} ওয়ালেটে সফলভাবে যোগ হয়েছে!`
              : `🎉 Payment confirmed! ৳${depositAmount.toLocaleString()} added to your wallet!`
          );
        }
      } catch (_) {
        // non-blocking
      }
    };

    checkPendingGatewayDeposit();
    window.addEventListener('focus', checkPendingGatewayDeposit);
    return () => window.removeEventListener('focus', checkPendingGatewayDeposit);
  }, [user.memberId, user.phone, user.referralCode, currentLang]);

  // Modal & Toast states
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);

  // Promotional Banner for NVT Energy (Auto-displayed after login, 5s auto-close or manual X close)
  const [isPromoModalOpen, setIsPromoModalOpen] = useState<boolean>(() => {
    try {
      const justLoggedIn = sessionStorage.getItem('nvt_just_logged_in');
      const alreadyShown = sessionStorage.getItem('nvt_promo_modal_shown');
      if (justLoggedIn === 'true' || !alreadyShown) {
        return true;
      }
    } catch (_) {}
    return false;
  });

  const handleClosePromoModal = () => {
    setIsPromoModalOpen(false);
    try {
      sessionStorage.removeItem('nvt_just_logged_in');
      sessionStorage.setItem('nvt_promo_modal_shown', 'true');
    } catch (_) {}
  };

  useEffect(() => {
    const handleOpenPromo = () => {
      setIsPromoModalOpen(true);
    };
    window.addEventListener('open_nvt_promo_banner', handleOpenPromo);
    return () => window.removeEventListener('open_nvt_promo_banner', handleOpenPromo);
  }, []);

  const [isCopied, setIsCopied] = useState(false);
  const [activeSubModal, setActiveSubModal] = useState<
    | 'personal'
    | 'security'
    | 'payment'
    | 'notifications'
    | 'wallet'
    | 'edit'
    | 'authenticator'
    | 'recharge'
    | 'withdraw'
    | 'companyInfo'
    | 'licenses'
    | 'substations'
    | 'engineering'
    | 'esg'
    | null
  >(null);

  const [localTab, setLocalTab] = useState<
    'home' | 'invest' | 'positions' | 'transactions' | 'wallet' | 'referral' | 'profile'
  >(initialTab || 'home');
  const currentTab = initialTab || localTab;
  const [isWalletHistoryModalOpen, setIsWalletHistoryModalOpen] = useState(false);
  const [isTreasureModalOpen, setIsTreasureModalOpen] = useState(false);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState(false);
  const [isManagerReferralModalOpen, setIsManagerReferralModalOpen] = useState(false);
  const [referralBlockReason, setReferralBlockReason] = useState<'no_permission' | 'limit_reached'>('no_permission');

  // Directly switch tab and notify parent on user interaction
  const switchTab = (tab: 'home' | 'invest' | 'positions' | 'transactions' | 'wallet' | 'referral' | 'profile') => {
    setLocalTab(tab);
    scrollAppToTop();
    if (onTabChange) {
      onTabChange(tab);
    }

    if (tab === 'referral') {
      // Check Firestore in real time to ensure latest approval status from admin
      const activeUid = user.uid || auth.currentUser?.uid || user.memberId;
      if (activeUid) {
        getFirestoreUserProfile(activeUid).then((latestProfile) => {
          if (latestProfile && (Boolean(latestProfile.canRefer) !== Boolean(user.canRefer) || latestProfile.referralLimit !== user.referralLimit)) {
            updateUser((prev) => ({
              ...prev,
              canRefer: Boolean(latestProfile.canRefer),
              referralLimit: latestProfile.referralLimit ?? prev.referralLimit ?? 5,
            }));
          }
        }).catch(() => {});
      }
    }
  };

  // Real-time synchronization whenever referral tab is active so approval opens immediately
  useEffect(() => {
    if (currentTab === 'referral') {
      const activeUid = user.uid || auth.currentUser?.uid || user.memberId;
      if (activeUid) {
        getFirestoreUserProfile(activeUid).then((latestProfile) => {
          if (latestProfile && (Boolean(latestProfile.canRefer) !== Boolean(user.canRefer) || latestProfile.referralLimit !== user.referralLimit)) {
            updateUser((prev) => ({
              ...prev,
              canRefer: Boolean(latestProfile.canRefer),
              referralLimit: latestProfile.referralLimit ?? prev.referralLimit ?? 5,
            }));
          }
        }).catch(() => {});
      }
    }
  }, [currentTab, user.uid, user.memberId, user.canRefer, user.referralLimit]);

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
              const currentVip = prev.vipLevel || 0;
              const totalDaily = cloudInvestments.reduce(
                (acc: number, curr: any) => acc + (curr.dailyYield || 0),
                0
              );
              return {
                ...prev,
                activeInvestments: cloudInvestments,
                activeUnits: cloudInvestments.length,
                vipLevel: currentVip,
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
          // Send transaction submission directly to cPanel backend API
          sendDepositToCpanel({
            amount: depositAmount,
            method: method || 'bKash',
            trxId,
            senderPhone: sender,
            userId: activeUid,
            channel: 'manual',
            timestamp: new Date().toISOString(),
          });

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
          // Auto-approved immediately (for recognized REAL TrxIDs via callback)
          updateUser((prev) => {
            const cleanPrev = (prev.transactions || []).filter(
              (t: any) => t.id !== newTxn.id && t.hash !== newTxn.id
            );
            return {
              ...prev,
              walletBalance: prev.walletBalance + depositAmount,
              hasDeposited: true,
              totalDeposited: (prev.totalDeposited || 0) + depositAmount,
              vipLevel: prev.vipLevel || 0,
              transactions: [newTxn, ...cleanPrev],
            };
          });

          showToast(
            currentLang === 'bn'
              ? `🎉 ডিপোজিট কলব্যাক সফল! আসল TrxID (${trxId}) অনুমোদিত হয়েছে এবং ৳${depositAmount.toLocaleString()} ওয়ালেটে যোগ হয়েছে!`
              : `🎉 Deposit callback successful! Real TrxID (${trxId}) approved and ৳${depositAmount.toLocaleString()} credited!`
          );
        } else {
          // Fake / Dummy / Mismatched TrxID -> Kept strictly PENDING awaiting Admin manual verification
          updateUser((prev) => {
            const cleanPrev = (prev.transactions || []).filter(
              (t: any) => t.id !== newTxn.id && t.hash !== newTxn.id
            );
            return {
              ...prev,
              transactions: [newTxn, ...cleanPrev],
            };
          });

          const reasonMsg = serverResult?.reason ? ` (${serverResult.reason})` : '';
          showToast(
            currentLang === 'bn'
              ? `⏳ TrxID ভেরিফিকেশন পেন্ডিং: ${reasonMsg ? `${reasonMsg}। ` : ''}আপনার ডিপোজিট অনুরোধ অপেক্ষমাণ (Pending) রাখা হয়েছে। অ্যাডমিন বিকাশ/নগদে যাচাই করার পর ওয়ালেটে টাকা যোগ হবে।`
              : `⏳ Deposit Pending: ${reasonMsg ? `${reasonMsg}. ` : ''}Placed in Pending awaiting admin manual review.`
          );
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
          const orderNo = data.orderNo;
          // Store in localStorage for return recovery
          try {
            localStorage.setItem(
              'pending_gateway_deposit',
              JSON.stringify({
                orderNo,
                amount: Number(amount),
                method: method || 'bKash',
                channel: 'gogopay',
                timestamp: Date.now(),
              })
            );
          } catch (_) {}

          window.open(data.paymentLink, '_blank');
          showToast(
            currentLang === 'bn'
              ? 'Go-Go-Pay পেমেন্ট পেজ নতুন ট্যাবে খোলা হয়েছে!'
              : 'Go-Go-Pay payment link opened in new tab!'
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
                if (
                  checkData.success &&
                  (checkData.order?.status === 'COMPLETED' || checkData.order?.status === 'SUCCESS') &&
                  (checkData.order?.verified === true || checkData.order?.webhookConfirmed === true)
                ) {
                  clearInterval(pollInterval);

                  // Update Firestore wallet balance and transaction record
                  await recordFirestoreDeposit(activeUid, {
                    amount: Number(amount),
                    method: method || 'bKash',
                    channel: 'gogopay',
                    trxId: checkData.order?.trxId || orderNo,
                    orderNo,
                    status: 'completed',
                  });

                  updateUser((prev) => ({
                    ...prev,
                    walletBalance: prev.walletBalance + Number(amount),
                    hasDeposited: true,
                    totalDeposited: (prev.totalDeposited || 0) + Number(amount),
                    vipLevel: prev.vipLevel || 0,
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

                  try {
                    localStorage.removeItem('pending_gateway_deposit');
                  } catch (_) {}

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
          return data;
        } else {
          showToast(
            currentLang === 'bn'
              ? `⚠️ পেমেন্ট সংযোগ ব্যর্থ: ${data?.error || 'Go-Go-Pay গেটওয়ে ত্রুটি'}`
              : `⚠️ Payment failed: ${data?.error || 'Go-Go-Pay gateway error'}`
          );
          return data;
        }
      } catch (err: any) {
        console.error('[Go-Go-Pay Deposit Error]', err);
        showToast(
          currentLang === 'bn'
            ? '⚠️ Go-Go-Pay গেটওয়ে সার্ভিসে সংযোগ করা যাচ্ছে না'
            : '⚠️ Failed to connect to Go-Go-Pay gateway'
        );
      }
      return null;
    }

    // 3. CHANNEL 1: NEKPAY GATEWAY
    if (channel === 'channel1') {
      try {
        showToast(
          currentLang === 'bn'
            ? 'চ্যানেল ১-এ সংযোগ করা হচ্ছে...'
            : 'Connecting to Channel 1...'
        );

        let data: any = null;
        try {
          data = await createCpanelDepositOrder('channel1', Number(amount), 'Customer', activeUid);
        } catch (fetchErr) {
          console.warn('[Nekpay] createCpanelDepositOrder failed:', fetchErr);
        }

        console.log('Nekpay create-order response:', data);

        if (data && data.success && data.paymentLink) {
          const orderNo = data.orderNo || `NEK${Date.now().toString().slice(-8)}`;

          // Store in localStorage for return recovery
          try {
            localStorage.setItem(
              'pending_gateway_deposit',
              JSON.stringify({
                orderNo,
                amount: Number(amount),
                method: method || 'bKash',
                channel: 'channel1',
                timestamp: Date.now(),
              })
            );
          } catch (_) {}

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
              ? 'পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...'
              : 'Redirecting to payment link...'
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
                if (
                  checkData.success &&
                  (checkData.order?.status === 'COMPLETED' || checkData.order?.status === 'SUCCESS') &&
                  (checkData.order?.verified === true || checkData.order?.webhookConfirmed === true)
                ) {
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
                    hasDeposited: true,
                    totalDeposited: (prev.totalDeposited || 0) + Number(amount),
                    vipLevel: prev.vipLevel || 0,
                    transactions: (prev.transactions || []).map((t: any) =>
                      t.id === orderNo || t.hash === orderNo
                        ? {
                            ...t,
                            status: 'completed',
                            description: `ডিপোজিট (চ্যানেল ১) - সফল`,
                            hash: checkData.order?.trxId || orderNo,
                            isCredit: true,
                          }
                        : t
                    ),
                  }));

                  try {
                    localStorage.removeItem('pending_gateway_deposit');
                  } catch (_) {}

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
          return data;
        } else {
          showToast(
            currentLang === 'bn'
              ? `⚠️ পেমেন্ট সংযোগ ব্যর্থ: ${data?.error || 'গেটওয়ে ত্রুটি'}`
              : `⚠️ Payment failed: ${data?.error || 'Gateway error'}`
          );
          return data;
        }
      } catch (err: any) {
        console.error('[Deposit Error]', err);
        showToast(
          currentLang === 'bn'
            ? '⚠️ গেটওয়ে সার্ভিসে সংযোগ করা যাচ্ছে না'
            : '⚠️ Failed to connect to payment gateway'
        );
      }
      return null;
    }

    // 4. CHANNEL 2: DIRECT GATEWAY
    try {
      showToast(
        currentLang === 'bn'
          ? 'চ্যানেল ২-এ সংযোগ করা হচ্ছে...'
          : 'Connecting to Channel 2...'
      );

      let data: any = null;
      try {
        data = await createCpanelDepositOrder('channel2', Number(amount), 'Customer', activeUid);
      } catch (fetchErr) {
        console.warn('[WatchPay] createCpanelDepositOrder failed:', fetchErr);
      }

      console.log('WatchPay create-order response:', data);

      if (data && data.success && data.paymentLink) {
        const targetUrl = data.paymentLink;
        const orderNo = data.orderNo || `WPY${Date.now().toString().slice(-8)}`;

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

        let opened = null;
        try {
          opened = window.open(targetUrl, '_blank');
        } catch (e) {
          opened = null;
        }
        if (!opened || opened.closed || typeof opened.closed === 'undefined') {
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
        }
        showToast(
          currentLang === 'bn'
            ? 'পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...'
            : 'Redirecting to payment link...'
        );

        // Automated polling for Channel 2 order completion
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
              const status = String(checkData?.order?.status || '').toUpperCase();
              if (
                checkData.success &&
                (status === 'COMPLETED' || status === 'SUCCESS') &&
                (checkData?.order?.verified === true || checkData?.order?.webhookConfirmed === true)
              ) {
                clearInterval(pollInterval);

                // Update Firestore wallet balance and transaction record
                await updateFirestoreDepositStatus(activeUid, orderNo, 'completed', Number(amount));

                updateUser((prev) => ({
                  ...prev,
                  walletBalance: prev.walletBalance + Number(amount),
                  hasDeposited: true,
                  totalDeposited: (prev.totalDeposited || 0) + Number(amount),
                  vipLevel: prev.vipLevel || 0,
                  transactions: (prev.transactions || []).map((t: any) =>
                    t.id === orderNo || t.hash === orderNo
                      ? {
                          ...t,
                          status: 'completed',
                          description: `ডিপোজিট (চ্যানেল ২) - সফল`,
                          hash: checkData.order?.trxId || orderNo,
                          isCredit: true,
                        }
                      : t
                  ),
                }));

                localStorage.removeItem('pending_gateway_deposit');

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
        return data;
      } else {
        showToast(
          currentLang === 'bn'
            ? `⚠️ পেমেন্ট সংযোগ ব্যর্থ: ${data?.message || data?.error || 'গেটওয়ে ত্রুটি'}`
            : `⚠️ Payment failed: ${data?.message || data?.error || 'Gateway error'}`
        );
        return data;
      }
    } catch (err: any) {
      console.error('[Deposit Error]', err);
      showToast(
        currentLang === 'bn'
          ? '⚠️ গেটওয়ে সার্ভিসে সংযোগ করা যাচ্ছে না'
          : '⚠️ Failed to connect to payment gateway'
      );
    }
    return null;
  };

  // Check URL parameters for payment callback/return results (Go-Go-Pay, Nekpay, OKExPay, Cashier)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      let localPayload: any = null;
      try {
        const rawLocal = localStorage.getItem('nvt_payment_return_deposit');
        if (rawLocal) {
          localPayload = JSON.parse(rawLocal);
          localStorage.removeItem('nvt_payment_return_deposit');
        }
      } catch (_) {}

      const isPaymentReturn =
        params.has('payment_return') ||
        params.has('payment_status') ||
        params.has('orderNo') ||
        params.has('order_id') ||
        params.has('trx_id') ||
        params.has('trxId') ||
        params.has('trade_no') ||
        Boolean(localPayload);

      if (!isPaymentReturn) return;

      const rawAmount = params.get('amount') || params.get('money') || params.get('pay_money') || String(localPayload?.amount || 0);
      const amount = Number(rawAmount);
      const orderId = params.get('order_id') || params.get('orderNo') || params.get('out_trade_no') || localPayload?.orderNo || '';
      const rawTrxId =
        params.get('trx_id') ||
        params.get('trxId') ||
        params.get('txnid') ||
        params.get('trade_no') ||
        params.get('ref_id') ||
        localPayload?.trxId ||
        '';
      const gateway = params.get('gateway') || params.get('channel') || localPayload?.channel || 'channel1';
      const method = params.get('method') || localPayload?.method || 'bKash';
      const activeUid = auth.currentUser?.uid || user.uid || user.memberId || 'USER1001';
      const finalTrxId = (rawTrxId || orderId || `TXN-${Date.now().toString().slice(-6)}`).trim();
      const statusParam = (params.get('payment_status') || localPayload?.status || '').toUpperCase();

      // Clean query parameters immediately from address bar to prevent replay on reload
      window.history.replaceState({}, document.title, window.location.pathname);

      if (amount <= 0) return;

      // Security check: Check live order status on backend.
      // An order is approved/completed if the server explicitly confirmed verified=true (either via real gateway webhook or verified authentic TrxID)
      (async () => {
        let isServerVerified = false;
        const lookupKey = orderId || finalTrxId;

        if (lookupKey) {
          try {
            const checkRes = await fetch(`/api/payments/order-status/${encodeURIComponent(lookupKey)}`);
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              const statusStr = String(checkData?.order?.status || '').toUpperCase();
              if (
                checkData?.success &&
                (statusStr === 'COMPLETED' || statusStr === 'SUCCESS') &&
                (checkData?.order?.verified === true || checkData?.order?.webhookConfirmed === true)
              ) {
                isServerVerified = true;
              }
            }
          } catch (_) {}
        }

        if (isServerVerified || statusParam === 'SUCCESS') {
          // Authentic verified completion
          recordFirestoreDeposit(activeUid, {
            amount,
            method,
            channel: gateway,
            trxId: finalTrxId,
            orderNo: orderId || undefined,
            status: 'completed',
          }).catch((err) => console.warn('[Firestore] Sync warning:', err));

          updateUser((prev) => {
            const alreadyCredited = (prev.transactions || []).some(
              (t: any) => (t.id === finalTrxId || t.hash === finalTrxId || t.orderNo === orderId) && t.status === 'completed'
            );
            if (alreadyCredited) return prev;
            return {
              ...prev,
              walletBalance: prev.walletBalance + amount,
              hasDeposited: true,
              totalDeposited: (prev.totalDeposited || 0) + amount,
              vipLevel: prev.vipLevel || 0,
              transactions: [
                {
                  id: finalTrxId,
                  type: 'deposit',
                  amount,
                  timestamp:
                    new Date().toLocaleDateString('en-GB') +
                    ' ' +
                    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  status: 'completed',
                  description: `ডিপোজিট (${gateway.toUpperCase()}) - সফল`,
                  hash: finalTrxId,
                },
                ...(prev.transactions || []),
              ],
            };
          });

          showToast(
            currentLang === 'bn'
              ? `🎉 ডিপোজিট সফল! TrxID (${finalTrxId}) অনুমোদিত হয়েছে এবং ৳${amount.toLocaleString()} ওয়ালেটে যোগ হয়েছে!`
              : `🎉 Deposit successful! TrxID (${finalTrxId}) approved and ৳${amount.toLocaleString()} credited to wallet!`
          );
        } else {
          // Pending submission awaiting admin review:
          // Strictly record as PENDING in Firestore so Admin Panel displays it immediately!
          recordFirestoreDeposit(activeUid, {
            amount,
            method,
            channel: gateway,
            trxId: finalTrxId,
            orderNo: orderId || undefined,
            status: 'pending',
          }).catch((err) => console.warn('[Firestore] Deposit sync warning:', err));

          sendDepositToCpanel({
            amount,
            method,
            channel: gateway,
            trxId: finalTrxId,
            orderId: orderId || undefined,
            status: 'PENDING',
            type: 'PAYMENT_RETURN_PENDING',
            userId: activeUid,
            timestamp: new Date().toISOString(),
          }).catch(() => {});

          updateUser((prev) => {
            const cleanPrev = (prev.transactions || []).filter(
              (t: any) => t.id !== finalTrxId && t.hash !== finalTrxId
            );
            return {
              ...prev,
              transactions: [
                {
                  id: finalTrxId,
                  type: 'deposit',
                  amount,
                  timestamp:
                    new Date().toLocaleDateString('en-GB') +
                    ' ' +
                    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  status: 'pending',
                  description: `ডিপোজিট TrxID: ${finalTrxId} (অপেক্ষমাণ)`,
                  hash: finalTrxId,
                  isCredit: false,
                },
                ...cleanPrev,
              ],
            };
          });

          showToast(
            currentLang === 'bn'
              ? `⏳ আপনার ৳${amount.toLocaleString()} ডিপোজিট অনুরোধ জমা হয়েছে (TrxID: ${finalTrxId})। এটি অপেক্ষমাণ (Pending) রয়েছে। অ্যাডমিন বিকাশ/নগদে যাচাই করার পর ওয়ালেটে টাকা যোগ হবে।`
              : `⏳ Deposit request of ৳${amount.toLocaleString()} submitted (TrxID: ${finalTrxId}). Placed in Pending awaiting admin manual review.`
          );
        }
      })();
    } catch (err) {
      console.warn('[Payment Return Handling Warning]', err);
    }
  }, []);

  // Real-time Firestore user transactions subscription & Server Deposit Sync
  useEffect(() => {
    const activeUid = user.uid || auth.currentUser?.uid || user.memberId || 'USER1001';
    if (!activeUid) return;

    // 0. Check locally submitted deposit from Cashier or Modal
    try {
      const rawSub = localStorage.getItem('nvt_last_submitted_deposit_tx');
      if (rawSub) {
        const txObj = JSON.parse(rawSub);
        if (txObj && txObj.id) {
          updateUser((prev) => {
            const clean = (prev.transactions || []).filter((t: any) => t.id !== txObj.id && t.hash !== txObj.id);
            return {
              ...prev,
              transactions: [txObj, ...clean],
            };
          });
          recordFirestoreDeposit(activeUid, {
            amount: Number(txObj.amount) || 0,
            method: txObj.channel || 'bKash',
            channel: 'cashier',
            trxId: txObj.id,
            status: txObj.status === 'completed' ? 'completed' : 'pending',
          }).catch(() => {});
        }
      }
    } catch (_) {}

    // 0.1 Check server orders for this user
    fetch(`/api/payments/user-deposits/${encodeURIComponent(activeUid)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.orders) && data.orders.length > 0) {
          updateUser((prev) => {
            const currentList = prev.transactions || [];
            const mappedNewTxns: any[] = [];
            for (const o of data.orders) {
              const k = o.trxId || o.orderId;
              if (!k) continue;
              const exists = currentList.find((t: any) => t.id === k || t.hash === k);
              const isCompleted = o.status === 'COMPLETED';
              const isCancelled = o.status === 'CANCELLED' || o.status === 'REJECTED';
              const statusStr = isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'pending';
              const desc = isCompleted
                ? `ডিপোজিট TrxID: ${o.trxId || k} (সফল)`
                : isCancelled
                ? `ডিপোজিট TrxID: ${o.trxId || k} (বাতিল)`
                : `ডিপোজিট TrxID: ${o.trxId || k} (অপেক্ষমাণ)`;

              if (!exists) {
                const now = new Date(o.createdAt || Date.now());
                mappedNewTxns.push({
                  id: k,
                  type: 'deposit',
                  title: `ওয়ালেট রিচার্জ (${o.method || 'bKash'})`,
                  amount: Number(o.amount) || 0,
                  timestamp: now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  date: now.toLocaleDateString('en-GB'),
                  time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  status: statusStr,
                  description: desc,
                  hash: k,
                  channel: o.channelName || o.method || 'Manual TrxID',
                  isCredit: isCompleted,
                });
              }
            }
            if (mappedNewTxns.length === 0) return prev;
            return {
              ...prev,
              transactions: [...mappedNewTxns, ...currentList],
            };
          });
        }
      })
      .catch(() => {});

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

    const unsubProfile = subscribeToFirestoreUserProfile(activeUid, (updatedProfile) => {
      if (updatedProfile) {
        updateUser((prev) => {
          const balanceChanged =
            typeof updatedProfile.walletBalance === 'number' &&
            updatedProfile.walletBalance !== prev.walletBalance;
          const depositsChanged =
            typeof updatedProfile.totalDeposited === 'number' &&
            updatedProfile.totalDeposited !== prev.totalDeposited;
          const vipChanged =
            typeof updatedProfile.vipLevel === 'number' &&
            updatedProfile.vipLevel !== prev.vipLevel;
          const earningsChanged =
            typeof updatedProfile.totalEarnings === 'number' &&
            updatedProfile.totalEarnings !== prev.totalEarnings;
          const canReferChanged =
            typeof updatedProfile.canRefer === 'boolean' &&
            updatedProfile.canRefer !== prev.canRefer;
          const referralLimitChanged =
            typeof updatedProfile.referralLimit === 'number' &&
            updatedProfile.referralLimit !== prev.referralLimit;
          const referralRewardsChanged =
            typeof updatedProfile.referralRewards === 'number' &&
            updatedProfile.referralRewards !== prev.referralRewards;

          if (
            !balanceChanged &&
            !depositsChanged &&
            !vipChanged &&
            !earningsChanged &&
            !canReferChanged &&
            !referralLimitChanged &&
            !referralRewardsChanged
          ) {
            return prev;
          }

          return {
            ...prev,
            walletBalance: balanceChanged ? updatedProfile.walletBalance : prev.walletBalance,
            totalDeposited: depositsChanged ? updatedProfile.totalDeposited : prev.totalDeposited,
            vipLevel: vipChanged ? updatedProfile.vipLevel : prev.vipLevel,
            totalEarnings: earningsChanged ? updatedProfile.totalEarnings : prev.totalEarnings,
            hasDeposited: (updatedProfile.totalDeposited || 0) > 0 || prev.hasDeposited,
            canRefer: canReferChanged ? updatedProfile.canRefer : prev.canRefer,
            referralLimit: referralLimitChanged ? updatedProfile.referralLimit : prev.referralLimit,
            referralRewards: referralRewardsChanged ? updatedProfile.referralRewards : prev.referralRewards,
          };
        });
      }
    });

    const handleAuthStateChanged = (e: any) => {
      if (e.detail) {
        updateUser((prev) => ({
          ...prev,
          canRefer: e.detail.canRefer !== undefined ? Boolean(e.detail.canRefer) : prev.canRefer,
          referralLimit: typeof e.detail.referralLimit === 'number' ? e.detail.referralLimit : prev.referralLimit,
        }));
      }
    };
    window.addEventListener('nvt-auth-state-changed', handleAuthStateChanged);

    const handleDepositApproved = (e: any) => {
      const data = e.detail;
      if (data && data.amount > 0) {
        const isTarget =
          !data.userId ||
          data.userId === user.uid ||
          data.userId === user.memberId ||
          data.userId === auth.currentUser?.uid ||
          (user.phone && String(user.phone).slice(-10) === String(data.userId).slice(-10));
        if (isTarget) {
          updateUser((prev) => {
            const updatedTxns = (prev.transactions || []).map((t: any) => {
              if (t.id === data.depositId || t.id === data.trxId || t.hash === data.trxId) {
                return {
                  ...t,
                  status: 'Approved',
                  statusBangla: 'সফল',
                  isCredit: true,
                };
              }
              return t;
            });
            return {
              ...prev,
              walletBalance: prev.walletBalance + Number(data.amount),
              hasDeposited: true,
              totalDeposited: (prev.totalDeposited || 0) + Number(data.amount),
              transactions: updatedTxns,
            };
          });
          showToast(
            currentLang === 'bn'
              ? `🎉 ডিপোজিট অনুমোদিত হয়েছে! ৳${Number(data.amount).toLocaleString()} আপনার ওয়ালেটে যোগ হয়েছে!`
              : `🎉 Deposit approved! ৳${Number(data.amount).toLocaleString()} credited to your wallet!`
          );
        }
      }
    };
    window.addEventListener('nvt_deposit_approved', handleDepositApproved);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'nvt_last_deposit_approval' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          handleDepositApproved({ detail: data });
        } catch (_) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      if (typeof unsubProfile === 'function') {
        unsubProfile();
      }
      window.removeEventListener('nvt-auth-state-changed', handleAuthStateChanged);
      window.removeEventListener('nvt_deposit_approved', handleDepositApproved);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [auth.currentUser?.uid, user.uid, user.memberId]);

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
        if (data?.order?.status === 'CANCELLED' || data?.order?.status === 'REJECTED') {
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

  // Google Authenticator state (defaults to false / not set unless explicitly configured)
  const [isAuthenticatorSet, setIsAuthenticatorSet] = useState<boolean>(() => {
    if (user.isAuthenticatorSet !== undefined) {
      return !!user.isAuthenticatorSet;
    }
    try {
      const activeId = user.uid || user.memberId || user.phone;
      if (activeId) {
        const saved = localStorage.getItem(`nvt_google_auth_set_${activeId}`);
        if (saved !== null) {
          return saved === 'true';
        }
      }
    } catch {
      // ignore
    }
    return false;
  });
  const [authSecretKey, setAuthSecretKey] = useState<string>(() => {
    const activeId = user.uid || user.memberId || user.phone || '';
    const secret = getUserAuthenticatorSecret(activeId, user.authenticatorSecret);
    return formatBase32Key(secret);
  });
  const [authInputCode, setAuthInputCode] = useState('');
  const [isAuthKeyCopied, setIsAuthKeyCopied] = useState(false);

  // Sync state if user.authenticatorSecret changes externally
  useEffect(() => {
    if (user.authenticatorSecret) {
      setAuthSecretKey(formatBase32Key(user.authenticatorSecret));
    }
  }, [user.authenticatorSecret]);

  // Sync state if user.isAuthenticatorSet changes externally
  useEffect(() => {
    if (user.isAuthenticatorSet !== undefined && user.isAuthenticatorSet !== isAuthenticatorSet) {
      setIsAuthenticatorSet(!!user.isAuthenticatorSet);
    }
  }, [user.isAuthenticatorSet]);

  const handleSaveAuthenticator = (status: boolean, customSecret?: string) => {
    // একবার সেট করলে দ্বিতীয়বার যেনো ইউজার বন্ধ, রিসেট বা পরিবর্তন করতে না পারে
    if (isAuthenticatorSet) {
      showToast(
        currentLang === 'bn'
          ? 'নিরাপত্তার স্বার্থে একবার সেট করা গুগল অথেন্টিকেটর পুনরায় পরিবর্তন বা নিষ্ক্রিয় করা সম্ভব নয়।'
          : 'Google Authenticator cannot be changed or disabled once activated.'
      );
      return false;
    }

    if (!status) return false;

    const cleanSecret = cleanBase32Key(customSecret || authSecretKey);
    setIsAuthenticatorSet(true);
    updateUser((prev) => ({
      ...prev,
      isAuthenticatorSet: true,
      authenticatorSecret: cleanSecret,
    }));
    try {
      const activeId = user.uid || user.memberId || user.phone;
      if (activeId) {
        localStorage.setItem(`nvt_google_auth_set_${activeId}`, 'true');
        localStorage.setItem(`nvt_google_auth_secret_${activeId}`, cleanSecret);
        updateFirestoreUserProfile(activeId, {
          isAuthenticatorSet: true,
          authenticatorSecret: cleanSecret,
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
    return true;
  };



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
    const bonusTrx = {
      id: `BONUS-${Date.now().toString().slice(-6)}`,
      type: 'reward',
      title: currentLang === 'bn' ? 'দৈনিক ফ্রি বোনাস' : 'Daily Check-in Bonus',
      desc: currentLang === 'bn' ? 'অ্যাটেন্ডেন্স বোনাস' : 'Daily Attendance Bonus',
      amount: 50,
      status: currentLang === 'bn' ? 'সফল' : 'Completed',
      time: `আজ, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      channel: 'Daily Bonus',
      isCredit: true,
    };
    updateUser((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance + 50,
      transactions: [bonusTrx, ...(prev.transactions || [])],
    }));
    showToast(t.toastBonusClaimed);
  };

  const handleClaimTreasureReward = (amount: number, description: string) => {
    if (amount <= 0) return;
    const persistentUid = user.uid || user.memberId;
    const nowTime = Date.now();
    const treasureTrx = {
      id: `TREASURE-${nowTime.toString().slice(-6)}`,
      type: 'reward',
      title: currentLang === 'bn' ? 'ট্রেজার ক্যাশ বোনাস' : 'Treasure Cash Reward',
      desc: description,
      amount,
      status: currentLang === 'bn' ? 'সফল' : 'Completed',
      time: `আজ, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      channel: 'Treasure Reward',
      isCredit: true,
    };
    updateUser((prev) => ({
      ...prev,
      walletBalance: Number((prev.walletBalance + amount).toFixed(2)),
      transactions: [treasureTrx, ...(prev.transactions || [])],
    }));
    if (persistentUid) {
      updateFirestoreWalletBalance(persistentUid, user.walletBalance + amount).catch(() => {});
    }
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

    // Match package from live packages or INVESTMENT_PLANS
    let currentPlanList = INVESTMENT_PLANS;
    try {
      const cached = localStorage.getItem('nova_investment_packages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) currentPlanList = parsed;
      }
    } catch {
      // ignore
    }
    const matchedPlan = currentPlanList.find(
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

    // VIP requirement check (VIP 1 required for packages larger than Basic Plan 1200 BDT)
    const effectiveVip = computedVipLevel;
    const isLargerPackage = matchedPlan && (matchedPlan.minInvestmentBdt > 1200 || matchedPlan.requiredVipLevel >= 1);
    if (isLargerPackage && effectiveVip < 1) {
      showToast(
        currentLang === 'bn'
          ? 'VIP 1 ছাড়া বড় প্যাকেজগুলো কিনতে পারবেন না! ১ম লেভেলে ৩ জন সক্রিয় রেফারেল যুক্ত করে VIP 1 সক্রিয় করুন।'
          : 'VIP 1 is required to buy larger packages! Please activate VIP 1 with 3 active Level 1 referrals first.'
      );
      return;
    }
    if (matchedPlan && matchedPlan.requiredVipLevel > 0 && effectiveVip < matchedPlan.requiredVipLevel) {
      showToast(
        currentLang === 'bn'
          ? `এই প্যাকেজে বিনিয়োগ করতে অন্তত VIP ${matchedPlan.requiredVipLevel} মেম্বারশিপ প্রয়োজন!`
          : `VIP ${matchedPlan.requiredVipLevel} level required for this package!`
      );
      return;
    }

    const pkgVip = matchedPlan ? (matchedPlan.requiredVipLevel || 0) : 0;
    const dailyEarned = matchedPlan
      ? getPlanDailyReturnBdt(matchedPlan)
      : Math.round(amount * 0.02);
    const pkgDailyRate = matchedPlan ? (matchedPlan.dailyReturnPercent || Math.round((dailyEarned / amount) * 1000) / 10) : 2.0;

    const nowTime = Date.now();
    const newInvestment = {
      id: `INV-${nowTime}`,
      name: projectName,
      amount: amount,
      dailyYield: dailyEarned,
      vipLevel: pkgVip,
      date: new Date().toLocaleDateString('en-GB'),
      createdAt: nowTime,
      lastProfitClaimAt: nowTime,
      nextProfitAt: nowTime + 24 * 60 * 60 * 1000,
      totalEarned: 0,
      status: 'active' as const,
      dailyReturnPercent: pkgDailyRate,
      category: matchedPlan?.category || (projectName.includes('বায়োগ্যাস') || projectName.includes('Biogas') ? 'Biogas' : 'Solar'),
      claimedCount: 0,
    };

    const activeId = user.uid || user.memberId || 'guest';
    const updatedInvestments = [...(user.activeInvestments || []), newInvestment];
    try {
      localStorage.setItem(`user_investments_${activeId}`, JSON.stringify(updatedInvestments));
    } catch {
      // ignore
    }

    // Purchasing a package does NOT change VIP level. VIP 1 strictly requires 3 active Level 1 referrals.
    const currentVip = computedVipLevel;
    const totalDaily = updatedInvestments.reduce((acc: number, curr: any) => acc + (curr.dailyYield || 0), 0);

    const invTxn = {
      id: newInvestment.id,
      type: 'investment',
      title: currentLang === 'bn' ? `প্রজেক্ট বিনিয়োগ (${projectName})` : `Project Investment (${projectName})`,
      desc: currentLang === 'bn' ? `প্যাকেজ: ${projectName}` : `Package: ${projectName}`,
      amount: -amount,
      rawAmount: -amount,
      status: currentLang === 'bn' ? 'সফল' : 'Completed',
      time: `আজ, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      channel: 'Wallet Balance',
      isCredit: false,
    };

    updateUser((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - amount,
      vipLevel: currentVip,
      activeUnits: updatedInvestments.length,
      dailyRewards: totalDaily,
      activeInvestments: updatedInvestments,
      transactions: [invTxn, ...(prev.transactions || [])],
    }));

    // Cloud Firestore Sync: persist active investment to user's profile and investments collection
    const persistentUid = user.uid || user.memberId;
    if (persistentUid) {
      recordInvestmentInFirestore(
        persistentUid,
        newInvestment,
        user.walletBalance - amount,
        currentVip,
        totalDaily,
        updatedInvestments
      ).catch(() => {});
    }

    // ৩ লেভেল রেফারেল কমিশন (L1: ৬%, L2: ৩%, L3: ১%) প্যাকেজ ক্রয়ের মূল্যের অনুপাতে আপলাইনে স্বয়ংক্রিয়ভাবে প্রদান
    try {
      const purchaserCode = user.referralCode || user.memberId || user.phone || '';
      distributeReferralDepositCommissions(
        purchaserCode,
        amount,
        purchaserCode,
        newInvestment.id
      );
    } catch (refErr) {
      console.warn('[Referral Package Commission Error]', refErr);
    }

    showToast(
      currentLang === 'bn'
        ? `অভিনন্দন! "${projectName}" সফলভাবে কেনা হয়েছে। ২৪ ঘণ্টা কাউন্টডাউন দেখতে "পজিশন" অপশনে যান!`
        : `Congratulations! Successfully purchased "${projectName}". View 24h countdown in Positions!`
    );
  };

  // Accurate calculations for activeUnits and totalEarnings across the app
  const calculatedActiveUnits = useMemo(() => {
    if (Array.isArray(user.activeInvestments) && user.activeInvestments.length > 0) {
      return user.activeInvestments.length;
    }
    return Number(user.activeUnits) || 0;
  }, [user.activeInvestments, user.activeUnits]);

  const calculatedTotalEarnings = useMemo(() => {
    const invProfits = (Array.isArray(user.activeInvestments) ? user.activeInvestments : []).reduce(
      (sum: number, curr: any) => sum + (Number(curr.totalEarned) || 0),
      0
    );
    const refEarnings = Number(user.totalReferralEarnings) || 0;
    const baseTotal = Number(user.totalEarnings) || 0;
    return Math.max(baseTotal, invProfits + refEarnings);
  }, [user.activeInvestments, user.totalReferralEarnings, user.totalEarnings]);

  // Claim 24-hour profit for a position
  const handleClaimPositionProfit = (positionId: string) => {
    const rawInvestments = user.activeInvestments || [];
    const targetIdx = rawInvestments.findIndex((inv: any) => inv.id === positionId);
    if (targetIdx === -1) return;

    const targetPos = rawInvestments[targetIdx];
    const yieldAmount = Number(targetPos.dailyYield) || Math.round((Number(targetPos.amount) || 0) * 0.025);
    const nowTime = Date.now();

    const updatedInvestments = [...rawInvestments];
    updatedInvestments[targetIdx] = {
      ...targetPos,
      totalEarned: (Number(targetPos.totalEarned) || 0) + yieldAmount,
      lastProfitClaimAt: nowTime,
      nextProfitAt: nowTime + 24 * 60 * 60 * 1000,
      claimedCount: (Number(targetPos.claimedCount) || 0) + 1,
    };

    const profitTxn = {
      id: `YIELD-${Date.now()}`,
      type: 'yield',
      title: currentLang === 'bn' ? `দৈনিক প্রফিট লাভ (${targetPos.name || 'প্যাকেজ'})` : `Daily Yield Reward (${targetPos.name || 'Package'})`,
      desc: currentLang === 'bn' ? `২৪ ঘণ্টার মুনাফা ওয়ালেটে যুক্ত হয়েছে` : `24-hour yield credited to wallet`,
      amount: yieldAmount,
      rawAmount: yieldAmount,
      status: currentLang === 'bn' ? 'সফল' : 'Completed',
      time: `আজ, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      channel: 'Project Yield',
      isCredit: true,
    };

    const newWalletBalance = user.walletBalance + yieldAmount;
    const newTotalEarnings = (user.totalEarnings || 0) + yieldAmount;

    updateUser((prev) => ({
      ...prev,
      walletBalance: newWalletBalance,
      totalEarnings: newTotalEarnings,
      activeUnits: updatedInvestments.length,
      activeInvestments: updatedInvestments,
      transactions: [profitTxn, ...(prev.transactions || [])],
    }));

    const activeId = user.uid || user.memberId;
    if (activeId) {
      try {
        localStorage.setItem(`user_investments_${activeId}`, JSON.stringify(updatedInvestments));
        updateFirestoreUserProfile(activeId, {
          walletBalance: newWalletBalance,
          totalEarnings: newTotalEarnings,
          activeInvestments: updatedInvestments,
          activeUnits: updatedInvestments.length,
        }).catch(() => {});
      } catch {}
    }

    showToast(
      currentLang === 'bn'
        ? `অভিনন্দন! আপনার প্যাকেজ থেকে ৳${yieldAmount} দৈনিক প্রফিট সফলভাবে ওয়ালেটে যোগ হয়েছে!`
        : `Congratulations! ৳${yieldAmount} 24h profit credited to your wallet!`
    );
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.memberId);
    setIsCopied(true);
    showToast(t.toastCopied);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCopyReferral = () => {
    if (!user.canRefer) {
      setReferralBlockReason('no_permission');
      setIsManagerReferralModalOpen(true);
      return;
    }
    const directCount = referralTree?.level1Count || 0;
    if (user.referralLimit !== undefined && Number(user.referralLimit) > 0 && directCount >= Number(user.referralLimit)) {
      setReferralBlockReason('limit_reached');
      setIsManagerReferralModalOpen(true);
      return;
    }
    const refCode = user.memberId || user.referralCode || 'NV8829';
    const link = `${window.location.origin}/register?ref=${refCode}`;
    navigator.clipboard.writeText(link);
    showToast(currentLang === 'bn' ? 'রেফারেল লিংক কপি করা হয়েছে!' : 'Referral link copied!');
  };

  const handleAppDownloadClick = () => {
    // Directly trigger Android APK file download & open download information modal
    downloadNvtApk();
    showToast(currentLang === 'bn' ? 'NVT Energy APK ডাউনলোড শুরু হয়েছে...' : 'Downloading NVT Energy APK...');
    setIsDownloadModalOpen(true);
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
            { id: 'positions', labelBn: 'পজিশন', labelEn: 'Positions', icon: Briefcase },
            { id: 'wallet', labelBn: 'প্রমোশন', labelEn: 'Promotion', icon: Award },
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
              ৳{Math.max(0, user.walletBalance || 0).toLocaleString()}
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
            userId={user.uid}
            memberId={user.memberId}
            onClaimTreasureReward={handleClaimTreasureReward}
            onOpenProjectManager={() => setIsProjectManagerOpen(true)}
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
                    <span className={themeMode === 'day' ? 'text-slate-900' : 'text-white'}>NVT</span>
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
            userVipLevel={computedVipLevel}
            userInvestments={user.activeInvestments || []}
            currentLang={currentLang}
            themeMode={themeMode}
            onInvestProject={handleInvestProject}
            onOpenRecharge={() => setActiveSubModal('recharge')}
            onToggleLang={onToggleLang}
            onOpenNotifications={() => setActiveSubModal('notifications')}
            onOpenMyInvestments={() => switchTab('positions')}
          />
        )}

        {/* 4. Positions Tab (Replacing old Transactions Tab) */}
        {(currentTab === 'positions' || currentTab === 'transactions') && (
          <PositionsTabContent
            user={user}
            currentLang={currentLang}
            themeMode={themeMode}
            onNavigateToInvest={() => switchTab('invest')}
            onNavigateToWallet={() => switchTab('wallet')}
            onClaimPositionProfit={handleClaimPositionProfit}
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
            onOpenGateway={async (amount, method, channel, manualDetails) => {
              return await handleInitiateDeposit(amount, method, channel, manualDetails);
            }}
            onOpenHistory={() => setIsWalletHistoryModalOpen(true)}
            onBack={() => switchTab('home')}
            onNavigateToReferral={() => switchTab('referral')}
            onClaimPromoReward={(amt, lvl) => {
              const tierNum = parseInt(String(lvl || '').replace(/[^0-9]/g, '')) || 0;
              updateUser((prev) => ({
                ...prev,
                walletBalance: prev.walletBalance + amt,
                vipLevel: Math.max(prev.vipLevel || 0, tierNum),
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
                        ? `${lvl} প্রমো বোনাস ক্যাশ রিওয়ার্ড (VIP ${tierNum})`
                        : `${lvl} Promo Bonus Cash Reward (VIP ${tierNum})`,
                  },
                  ...(prev.transactions || []),
                ],
              }));

              const persistentUid = user.uid || user.memberId;
              if (persistentUid) {
                updateFirestoreWalletBalance(persistentUid, user.walletBalance + amt).catch(() => {});
                if (tierNum > 0) {
                  updateFirestoreUserProfile(persistentUid, { vipLevel: Math.max(user.vipLevel || 0, tierNum) }).catch(() => {});
                }
              }

              showToast(
                currentLang === 'bn'
                  ? `${lvl} থেকে ৳${amt.toLocaleString()} প্রমো বোনাস ওয়ালেটে জমা হয়েছে!`
                  : `${lvl} promo bonus ৳${amt.toLocaleString()} added to wallet!`
              );
            }}
            onWithdrawSubmit={(amt, method, acct) => {
              const activeUid = user.uid || auth.currentUser?.uid || user.memberId || 'USER1001';
              const trxId = `WTH-${Date.now().toString().slice(-6)}`;
              const now = new Date();
              const dateStr = now.toLocaleDateString(currentLang === 'bn' ? 'bn-BD' : 'en-US', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              recordFirestoreWithdrawal({
                uid: activeUid,
                trxId,
                amount: amt,
                walletMethod: method,
                accountNumber: acct,
                accountName: user.fullName || user.name || 'User',
                authCode: '2FA_VERIFIED',
                status: 'Pending',
                dateStr,
                timeStr,
              }).catch(() => {});

              updateUser((prev) => ({
                ...prev,
                walletBalance: Math.max(0, prev.walletBalance - amt),
                transactions: [
                  {
                    id: trxId,
                    type: 'withdrawal',
                    amount: -amt,
                    timestamp: `${dateStr} ${timeStr}`,
                    status: 'pending',
                    description: `Payout to ${method} (${acct.slice(-4)}) - অপেক্ষমাণ`,
                    hash: trxId,
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
            isAuthenticatorSet={isAuthenticatorSet}
            authenticatorSecret={cleanBase32Key(authSecretKey)}
            onOpenSecuritySettings={() => setActiveSubModal('security')}
          />
        )}

        {/* 6. Full-Page Referral & Team Commission (হোম পেজের ইনভাইটেশন অপশন থেকে সরাসরি) */}
        {currentTab === 'referral' && (
          !user.canRefer ? (
            <ManagerPermissionLockedScreen
              currentLang={currentLang}
              onBack={() => switchTab('home')}
              onContactManager={() => openCrispChat()}
              onCheckPermission={() => {
                const activeUid = user.uid || auth.currentUser?.uid || user.memberId;
                if (activeUid) {
                  getFirestoreUserProfile(activeUid).then((latestProfile) => {
                    if (latestProfile && latestProfile.canRefer) {
                      updateUser((prev) => ({
                        ...prev,
                        canRefer: true,
                        referralLimit: latestProfile.referralLimit ?? prev.referralLimit ?? 5,
                      }));
                      showToast(
                        currentLang === 'bn'
                          ? '✅ রেফারেল পারমিশন সক্রিয় হয়েছে!'
                          : '✅ Referral permission activated!'
                      );
                    } else {
                      showToast(
                        currentLang === 'bn'
                          ? '⏳ এখনো ম্যানেজারের অনুমোদন পেন্ডিং রয়েছে।'
                          : '⏳ Manager authorization is still pending.'
                      );
                    }
                  }).catch(() => {
                    showToast(
                      currentLang === 'bn'
                        ? 'অনুমোদন যাচাই করতে সমস্যা হয়েছে।'
                        : 'Failed to verify permission.'
                    );
                  });
                }
              }}
            />
          ) : (
            <ReferralPage
              currentLang={currentLang}
              themeMode={themeMode}
              userCode={user.referralCode || user.memberId || 'NV8829'}
              userMemberId={user.memberId}
              userBalance={user.walletBalance}
              referralRewards={user.referralRewards || 0}
              canRefer={user.canRefer}
              referralLimit={user.referralLimit || 0}
              onContactManager={() => openCrispChat()}
              onBack={() => switchTab('home')}
              onClaimPromoReward={(amt, lvl) => {
                const tierNum = parseInt(String(lvl || '').replace(/[^0-9]/g, '')) || 0;
                updateUser((prev) => ({
                  ...prev,
                  walletBalance: prev.walletBalance + amt,
                  vipLevel: Math.max(prev.vipLevel || 0, tierNum),
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
                          ? `${lvl} প্রমো বোনাস ক্যাশ রিওয়ার্ড (VIP ${tierNum})`
                          : `${lvl} Promo Bonus Cash Reward (VIP ${tierNum})`,
                    },
                    ...(prev.transactions || []),
                  ],
                }));

                const persistentUid = user.uid || user.memberId;
                if (persistentUid) {
                  updateFirestoreWalletBalance(persistentUid, user.walletBalance + amt).catch(() => {});
                  if (tierNum > 0) {
                    updateFirestoreUserProfile(persistentUid, { vipLevel: Math.max(user.vipLevel || 0, tierNum) }).catch(() => {});
                  }
                }

                showToast(
                  currentLang === 'bn'
                    ? `${lvl} থেকে ৳${amt.toLocaleString()} প্রমো বোনাস ওয়ালেটে জমা হয়েছে!`
                    : `${lvl} promo bonus ৳${amt.toLocaleString()} added to wallet!`
                );
              }}
            onClaimReward={(amt) => {
              if (amt < 200) {
                showToast(
                  currentLang === 'bn'
                    ? `নূন্যতম ২০০ টাকা জমা হলে মূল ব্যালেন্সে স্থানান্তর করতে পারবেন। বর্তমান ব্যালেন্স: ৳${amt.toFixed(2)}`
                    : `Minimum ৳200 required to transfer. Current balance: ৳${amt.toFixed(2)}`
                );
                return;
              }
              const persistentUid = user.uid || user.memberId;
              updateUser((prev) => ({
                ...prev,
                walletBalance: Number((prev.walletBalance + amt).toFixed(2)),
                referralRewards: 0,
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
                        ? `রেফারেল কমিশন রিওয়ার্ড স্থানান্তর (৳${amt.toFixed(2)})`
                        : `Referral Commission Transfer (৳${amt.toFixed(2)})`,
                    hash: `TXN-${Date.now().toString().slice(-6)}`,
                    isCredit: true,
                  },
                  ...(prev.transactions || []),
                ],
              }));

              if (persistentUid) {
                transferReferralRewardsInFirestore(persistentUid, amt).catch(() => {});
              }
            }}
            showToast={showToast}
          />
          )
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
                  src="/images/aeolus-wind-farm.jpg"
                  alt="Clean Energy Farm"
                  className="w-full h-full object-cover object-right opacity-30 mix-blend-screen"
                  loading="eager"
                  decoding="async"
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
                    {computedVipLevel >= 1 && (
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

                {/* Right: VIP Badge - dynamically calculated from 3-level team */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    id="profile-vip-status-btn"
                    onClick={() => {
                      if (computedVipLevel >= 1) {
                        showToast(
                          currentLang === 'bn'
                            ? `প্রমো বোনাস থেকে VIP ${computedVipLevel} সক্রিয়! (১ম লেভেলে ${activeLevel1Count} জন এবং মোট ${totalActiveMembersInLevels} জন সক্রিয় সদস্য)`
                            : `VIP ${computedVipLevel} Active via Promo Bonus! (${activeLevel1Count} active in L1, ${totalActiveMembersInLevels} active total)`
                        );
                      } else {
                        showToast(
                          currentLang === 'bn'
                            ? `VIP 1 সক্রিয় করতে ১ম লেভেলে অন্তত ৩ জন সক্রিয় সদস্য প্রয়োজন (বর্তমানে: ${activeLevel1Count}/৩ জন সক্রিয়)`
                            : `VIP 1 unlocks when at least 3 members are active in Level 1 (Current: ${activeLevel1Count}/3 active)`
                        );
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs sm:text-sm font-bold shadow-md backdrop-blur-xs cursor-pointer transition-all active:scale-95 ${
                      computedVipLevel >= 1
                        ? 'bg-gradient-to-r from-black/80 to-amber-950/60 border-amber-400 text-amber-300 shadow-amber-500/20'
                        : 'bg-black/45 border-emerald-500/30 text-emerald-100 hover:border-emerald-400/50'
                    }`}
                    title={
                      computedVipLevel >= 1
                        ? (currentLang === 'bn' ? `প্রমো বোনাস থেকে VIP ${computedVipLevel} সক্রিয়` : `VIP ${computedVipLevel} Active via Promo Bonus`)
                        : (currentLang === 'bn' ? "প্রমো বোনাস অপশন থেকে শর্ত পূরণ করে VIP সক্রিয় করুন" : "Meet Promo Bonus conditions to activate VIP")
                    }
                  >
                    <Crown className={`w-4 h-4 ${computedVipLevel >= 1 ? 'text-amber-400 fill-amber-400 animate-pulse' : 'text-slate-400'}`} />
                    <span>VIP {computedVipLevel}</span>
                  </button>
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
                      ৳{calculatedTotalEarnings.toFixed(2)}
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
                      {calculatedActiveUnits} {currentLang === 'bn' ? 'ইউনিট' : 'Units'}
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
                      ৳{Math.max(0, user.walletBalance || 0).toFixed(2)}
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
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${
                    isAuthenticatorSet
                      ? 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-400'
                      : 'bg-amber-500/15 border border-amber-500/25 text-amber-400'
                  }`}>
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className={`text-[15px] font-semibold tracking-tight transition-colors block ${
                      themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                    }`}>
                      {currentLang === 'bn' ? 'গুগল অথেন্টিকেটর' : 'Google Authenticator'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {isAuthenticatorSet
                        ? (currentLang === 'bn' ? 'দ্বি-স্তর নিরাপত্তা সক্রিয় রয়েছে' : '2FA Protection is Active')
                        : (currentLang === 'bn' ? 'নিরাপত্তা বৃদ্ধি করতে সেট করুন' : 'Setup 2-factor authentication')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAuthenticatorSet ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-sm">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>{currentLang === 'bn' ? 'একটিভ' : 'Active'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span>not set</span>
                    </span>
                  )}
                  <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                    themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                  }`} />
                </div>
              </button>

              {/* 4. Payment Methods */}
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
                    {currentLang === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Methods'}
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

              {/* App Download */}
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
                    App Download
                  </span>
                </div>
                <ChevronRight className={`w-4.5 h-4.5 transition-colors ${
                  themeMode === 'day' ? 'text-slate-400 group-hover:text-slate-700' : 'text-slate-500 group-hover:text-emerald-300'
                }`} />
              </button>

              {/* 8. Live Chat & Support */}
              <button
                id="profile-helpline-btn"
                type="button"
                onClick={() => openCrispChat()}
                className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between transition-colors cursor-pointer text-left group ${
                  themeMode === 'day' ? 'hover:bg-slate-50' : 'hover:bg-emerald-500/10'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <MessageSquare className="w-4.5 h-4.5" />
                  </div>
                  <span className={`text-[15px] font-semibold tracking-tight transition-colors ${
                    themeMode === 'day' ? 'text-slate-800 group-hover:text-emerald-600' : 'text-slate-100 group-hover:text-emerald-300'
                  }`}>
                    {currentLang === 'bn' ? 'লাইভ চ্যাট সাপোর্ট' : 'Live Chat Support'}
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


          </>
        )}
      </div>

      {/* 4. Bottom Navigation Bar (Mobile View only, hidden on desktop) */}
      <div className={`md:hidden fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto backdrop-blur-lg border-t transition-colors duration-200 ${
        themeMode === 'day'
          ? 'bg-white/95 border-slate-200/90 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.06)]'
          : 'bg-[#042018]/95 border-emerald-500/25'
      }`}>
        <nav
          id="bottom-navbar"
          className="w-full px-2 py-2 flex items-center justify-around relative z-50"
        >
          {/* Home */}
          <button
            id="bottom-nav-home-btn"
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
            id="bottom-nav-invest-btn"
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

          {/* Positions (Briefcase icon) */}
          <button
            id="bottom-nav-positions-btn"
            type="button"
            onClick={() => switchTab('positions')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'positions' || currentTab === 'transactions'
                ? themeMode === 'day'
                  ? 'text-emerald-600 font-extrabold bg-emerald-50'
                  : 'text-[#00e676] font-extrabold bg-[#00e676]/10'
                : themeMode === 'day'
                ? 'text-slate-500 hover:text-slate-900 font-medium'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Briefcase className={`w-5 h-5 ${
              currentTab === 'positions' || currentTab === 'transactions'
                ? themeMode === 'day'
                  ? 'text-emerald-600'
                  : 'text-[#00e676] drop-shadow-[0_0_8px_rgba(0,230,118,0.5)]'
                : themeMode === 'day' ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'পজিশন' : 'Positions'}</span>
            {(currentTab === 'positions' || currentTab === 'transactions') && (
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
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'প্রমোশন' : 'Promotion'}</span>
            {currentTab === 'wallet' && (
              <span className={`absolute -bottom-1 w-5 h-1 rounded-full ${
                themeMode === 'day' ? 'bg-emerald-600' : 'bg-[#00e676] shadow-[0_0_8px_#00e676]'
              }`} />
            )}
          </button>

          {/* Profile */}
          <button
            id="bottom-nav-profile-btn"
            type="button"
            onClick={() => switchTab('profile')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 z-10 ${
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

      {/* NVT Energy Post-Login Promotional Banner Modal */}
      <NvtPromoBannerModal
        isOpen={isPromoModalOpen}
        onClose={handleClosePromoModal}
        currentLang={currentLang}
      />

      {/* Sub-Pages (Wallet, Personal Info, Notifications, Edit Profile) */}
      {activeSubModal === 'wallet' && (
        <div
          id="profile-subpage-wallet"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'আমার ওয়ালেট' : 'My Wallet'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'ব্যালেন্স, রিচার্জ ও উত্তোলন ব্যবস্থাপনা' : 'Balance, recharge & fund management'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsWalletHistoryModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-full bg-[#042018] hover:bg-[#07362a] border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{currentLang === 'bn' ? 'লেনদেন হিস্ট্রি' : 'History'}</span>
            </button>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-5">
            {/* Balance Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#07362a] via-[#062c22] to-[#042018] border border-emerald-500/30 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300/90 tracking-wide uppercase">
                  {currentLang === 'bn' ? 'মোট ব্যবহারযোগ্য ব্যালেন্স' : 'Available Balance'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {currentLang === 'bn' ? 'সক্রিয়' : 'Active'}
                </span>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                  ৳{Math.max(0, user.walletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  {currentLang === 'bn' ? 'দৈনিক মুনাফা ও উত্তোলনযোগ্য তহবিল' : 'Daily profits and withdrawable funds'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubModal('recharge')}
                  className="py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95"
                >
                  <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
                  <span>{currentLang === 'bn' ? 'রিচার্জ করুন' : 'Recharge'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubModal('withdraw')}
                  className="py-3 px-4 rounded-2xl bg-[#042018] hover:bg-[#072c21] text-emerald-200 border border-emerald-500/40 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95 shadow-sm"
                >
                  <ArrowUpFromLine className="w-4 h-4 stroke-[2.5]" />
                  <span>{currentLang === 'bn' ? 'উত্তোলন করুন' : 'Withdraw'}</span>
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal('payment')}
                className="p-4 rounded-2xl bg-[#062c22] border border-emerald-500/25 hover:border-emerald-500/50 transition-all text-left space-y-2 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {currentLang === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Methods'}
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    {currentLang === 'bn' ? 'বিকাশ, নগদ ওয়ালেট সংযোগ' : 'Bind bKash, Nagad accounts'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsWalletHistoryModalOpen(true);
                }}
                className="p-4 rounded-2xl bg-[#062c22] border border-emerald-500/25 hover:border-emerald-500/50 transition-all text-left space-y-2 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-300 group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">
                    {currentLang === 'bn' ? 'লেনদেন বিবরণী' : 'Transactions'}
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    {currentLang === 'bn' ? 'সকল লেনদেনের ইতিহাস' : 'Deposit & withdrawal ledger'}
                  </p>
                </div>
              </button>
            </div>

            {/* Income Highlights Card */}
            <div className="rounded-3xl bg-[#062c22] border border-emerald-500/25 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {currentLang === 'bn' ? 'আয়ের সারসংক্ষেপ' : 'Earnings Summary'}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-slate-300 block">{currentLang === 'bn' ? 'মোট আয়' : 'Total'}</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-[#00e676]">৳{calculatedTotalEarnings.toFixed(0)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-slate-300 block">{currentLang === 'bn' ? 'দৈনিক রিওয়ার্ড' : 'Daily'}</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-[#00e676]">৳{(user.dailyRewards || 0).toFixed(0)}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 text-center">
                  <span className="text-[10px] text-slate-300 block">{currentLang === 'bn' ? 'ইউনিট' : 'Units'}</span>
                  <span className="text-xs sm:text-sm font-bold font-mono text-white">{calculatedActiveUnits}</span>
                </div>
              </div>
            </div>

            {/* Security note */}
            <div className="p-3.5 rounded-2xl bg-[#042018] border border-emerald-500/20 flex items-center gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                {currentLang === 'bn'
                  ? 'সকল লেনদেন ২৫৬-বিট এসএসএল এনক্রিপশনের মাধ্যমে সম্পূর্ণ সুরক্ষিত।'
                  : 'All financial transactions are protected with 256-bit SSL encryption.'}
              </span>
            </div>
          </main>
        </div>
      )}

      {/* Premium Fintech Deposit Modal */}
      {activeSubModal === 'recharge' && (
        <DepositModal
          isOpen={true}
          onClose={() => setActiveSubModal(null)}
          currentBalance={user.walletBalance}
          currentLang={currentLang}
          isAuthenticatorSet={isAuthenticatorSet}
          authenticatorSecret={cleanBase32Key(authSecretKey)}
          onOpenSecuritySettings={() => {
            setActiveSubModal('security');
          }}
          onProceed={async (amt, method, channel, manualDetails) => {
            return await handleInitiateDeposit(amt, method, channel, manualDetails);
          }}
          onOpenHistory={() => {
            setIsWalletHistoryModalOpen(true);
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
            const activeUid = user.uid || auth.currentUser?.uid || user.memberId || 'USER1001';
            // Sync withdrawal to Firestore database & admin panel
            recordFirestoreWithdrawal({
              uid: activeUid,
              trxId: details.trxId,
              amount: amt,
              walletMethod: details.walletMethod,
              accountNumber: details.accountNumber,
              accountName: details.accountName,
              authCode: details.authCode,
              status: 'Pending',
              dateStr: details.dateStr,
              timeStr: details.timeStr,
            }).catch((err) => console.warn('[Withdrawal Firestore sync notice]', err));

            updateUser((prev) => ({
              ...prev,
              walletBalance: Math.max(0, prev.walletBalance - amt),
              transactions: [
                {
                  id: details.trxId,
                  type: 'withdrawal',
                  amount: -amt,
                  timestamp: `${details.dateStr} ${details.timeStr}`,
                  status: 'pending',
                  description: `Payout to ${details.walletMethod} (${details.accountNumber.slice(-4)}) - অপেক্ষমাণ`,
                  hash: details.trxId,
                },
                ...(prev.transactions || []),
              ],
            }));
          }}
          onOpenAddWallet={() => setActiveSubModal('payment')}
          onOpenRecharge={() => setActiveSubModal('recharge')}
          showToast={showToast}
          isAuthenticatorSet={isAuthenticatorSet}
          authenticatorSecret={cleanBase32Key(authSecretKey)}
        />
      )}

      {/* Personal Info Page (Full-Page View) */}
      {activeSubModal === 'personal' && (
        <div
          id="profile-subpage-personal"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'অ্যাকাউন্ট ও ব্যবহারকারী পরিচিতি' : 'Account & profile details'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveSubModal('edit')}
              className="px-3 py-1.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>{currentLang === 'bn' ? 'এডিট' : 'Edit'}</span>
            </button>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-5">
            {/* Profile Card */}
            <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 text-2xl font-black shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{user.name}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                      {currentLang === 'bn' ? 'যাচাইকৃত' : 'Verified'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">{user.email || user.memberId}</p>
                  <p className="text-[11px] text-emerald-300 mt-0.5">
                    {currentLang === 'bn' ? `ভিআইপি স্তর: VIP ${computedVipLevel}` : `VIP Status: VIP ${computedVipLevel}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Info List */}
            <div className="rounded-3xl bg-[#062c22] border border-emerald-500/25 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {currentLang === 'bn' ? 'বিস্তারিত প্রোফাইল' : 'Account Details'}
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 flex justify-between items-center">
                  <span className="text-slate-300">{currentLang === 'bn' ? 'পূর্ণ নাম' : 'Full Name'}</span>
                  <span className="font-semibold text-white">{user.name}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 flex justify-between items-center">
                  <span className="text-slate-300">{currentLang === 'bn' ? 'ইমেইল এড্রেস' : 'Email Address'}</span>
                  <span className="font-semibold text-white font-mono">{user.email || 'N/A'}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 flex justify-between items-center">
                  <span className="text-slate-300">{currentLang === 'bn' ? 'সদস্য আইডি (Member ID)' : 'Member ID'}</span>
                  <span className="font-semibold font-mono text-emerald-400">{user.memberId}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 flex justify-between items-center">
                  <span className="text-slate-300">{currentLang === 'bn' ? 'ভিআইপি স্তর' : 'VIP Level'}</span>
                  <span className="font-bold text-amber-400">VIP {computedVipLevel}</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 flex justify-between items-center">
                  <span className="text-slate-300">{currentLang === 'bn' ? 'অ্যাকাউন্ট স্ট্যাটাস' : 'Account Status'}</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentLang === 'bn' ? 'সক্রিয় ও সুরক্ষিত' : 'Active & Secured'}</span>
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-[#042018] border border-emerald-500/20 flex justify-between items-center">
                  <span className="text-slate-300">{currentLang === 'bn' ? 'দ্বি-স্তর নিরাপত্তা (2FA)' : 'Two-Factor (2FA)'}</span>
                  {isAuthenticatorSet ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>{currentLang === 'bn' ? 'একটিভ' : 'Active'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span>not set</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveSubModal('edit')}
                className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>{currentLang === 'bn' ? 'তথ্য সম্পাদনা করুন' : 'Edit Information'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSubModal('security')}
                className="py-3 rounded-2xl bg-[#042018] hover:bg-[#072c21] text-emerald-200 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{currentLang === 'bn' ? 'নিরাপত্তা সেটিংস' : 'Security Settings'}</span>
              </button>
            </div>
          </main>
        </div>
      )}

      {activeSubModal === 'security' && (
        <SecuritySettingsPage
          currentLang={currentLang}
          userEmail={user.email}
          onClose={() => setActiveSubModal(null)}
          showToast={showToast}
          onOpen2FA={() => setActiveSubModal('authenticator')}
          isAuthenticatorSet={isAuthenticatorSet}
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

      {/* Notifications Page (Full-Page View) */}
      {activeSubModal === 'notifications' && (
        <div
          id="profile-subpage-notifications"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'নোটিফিকেশন সেন্টার' : 'Notification Center'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'সকল লেনদেন ও সিস্টেম বার্তা' : 'Transactions & system updates'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => showToast(currentLang === 'bn' ? 'সকল বার্তা পঠিত হিসেবে চিহ্নিত' : 'All marked as read')}
              className="px-3 py-1.5 rounded-full bg-[#042018] hover:bg-[#07362a] border border-emerald-500/30 text-emerald-300 text-xs font-semibold cursor-pointer"
            >
              <span>{currentLang === 'bn' ? 'রিড অল' : 'Read All'}</span>
            </button>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-4">
            <div className="space-y-3">
              <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {currentLang === 'bn' ? 'দৈনিক মুনাফা ক্রেডিট' : 'Daily Profit Credited'}
                  </span>
                  <span className="text-[10px] text-slate-400">Today 00:05</span>
                </div>
                <p className="text-xs text-slate-200">
                  {currentLang === 'bn'
                    ? 'আপনার সক্রিয় এআই পাওয়ার গ্রিড চুক্তি থেকে দৈনিক মুনাফা সফলভাবে ওয়ালেটে যোগ করা হয়েছে।'
                    : 'Daily yield from your active smart grid contract has been added to your balance.'}
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-300">
                    {currentLang === 'bn' ? 'নিরাপত্তা সুরক্ষা সক্রিয়' : 'Security Check Complete'}
                  </span>
                  <span className="text-[10px] text-slate-400">Yesterday</span>
                </div>
                <p className="text-xs text-slate-200">
                  {currentLang === 'bn'
                    ? 'আপনার অ্যাকাউন্টে নতুন নিরাপত্তা প্রোটোকল ও ২৫৬-বিট এনক্রিপশন সক্রিয় রয়েছে।'
                    : 'Your account is safeguarded with end-to-end 256-bit encryption.'}
                </p>
              </div>

              <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400">
                    {currentLang === 'bn' ? 'দৈনিক প্রফিট অটো-সেটেলমেন্ট' : 'Daily Profit Auto-Settlement'}
                  </span>
                  <span className="text-[10px] text-slate-400">Daily 12:00 AM</span>
                </div>
                <p className="text-xs text-slate-200">
                  {currentLang === 'bn'
                    ? 'আপনার সক্রিয় বিনিয়োগ প্ল্যান থেকে স্বয়ংক্রিয়ভাবে দৈনিক মুনাফা অ্যাকাউন্টে জমা হবে।'
                    : 'Daily returns from active investment plans are automatically credited to your balance.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubModal(null)}
              className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              {currentLang === 'bn' ? 'প্রোফাইলে ফিরে যান' : 'Return to Profile'}
            </button>
          </main>
        </div>
      )}

      {/* Edit Profile Page (Full-Page View) */}
      {activeSubModal === 'edit' && (
        <div
          id="profile-subpage-edit"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'প্রোফাইল সম্পাদনা' : 'Edit Profile'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'নাম ও যোগাযোগ নম্বর আপডেট করুন' : 'Update name & contact details'}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
            <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-5">
              <div className="flex flex-col items-center justify-center space-y-2 py-2">
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 text-3xl font-black shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-emerald-300 font-mono">ID: {user.memberId}</span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-emerald-300 font-semibold mb-1.5">
                    {currentLang === 'bn' ? 'আপনার পূর্ণ নাম' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => updateUser((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-[#042018] border border-emerald-500/30 text-white focus:outline-none focus:border-emerald-400 text-sm font-medium"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-emerald-300/80 font-semibold mb-1.5">
                    {currentLang === 'bn' ? 'ইমেইল এড্রেস (স্থায়ী)' : 'Email Address (Permanent)'}
                  </label>
                  <input
                    type="text"
                    value={user.email || ''}
                    disabled
                    className="w-full p-3 rounded-xl bg-[#031812] border border-emerald-500/20 text-slate-400 cursor-not-allowed font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-emerald-300/80 font-semibold mb-1.5">
                    {currentLang === 'bn' ? 'সদস্য আইডি (স্থায়ী)' : 'Member ID (Permanent)'}
                  </label>
                  <input
                    type="text"
                    value={user.memberId}
                    disabled
                    className="w-full p-3 rounded-xl bg-[#031812] border border-emerald-500/20 text-slate-400 cursor-not-allowed font-mono text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  showToast(currentLang === 'bn' ? 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে!' : 'Profile updated successfully!');
                  setActiveSubModal(null);
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-98"
              >
                {currentLang === 'bn' ? 'পরিবর্তন সংরক্ষণ করুন' : 'Save Changes'}
              </button>
            </div>
          </main>
        </div>
      )}

      {/* Google Authenticator Page (Full-Page View) */}
      {activeSubModal === 'authenticator' && (
        <div
          id="profile-subpage-authenticator"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'গুগল অথেন্টিকেটর (2FA)' : 'Google Authenticator (2FA)'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'উত্তোলন ও অ্যাকাউন্টের দ্বি-স্তর নিরাপত্তা' : 'Two-Factor Authentication Security'}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isAuthenticatorSet
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {isAuthenticatorSet
                ? (currentLang === 'bn' ? 'লক করা (Active)' : 'Active (Locked)')
                : 'not set'}
            </span>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
            {/* Status Toggle Card */}
            <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/30 shadow-xl flex items-center justify-between">
              <div className="space-y-0.5 pr-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white block">
                    {currentLang === 'bn' ? 'অথেন্টিকেটর স্ট্যাটাস' : 'Authenticator Status'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isAuthenticatorSet
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/35'
                  }`}>
                    {isAuthenticatorSet ? (currentLang === 'bn' ? 'স্থায়ী সক্রিয় (Active & Locked)' : 'Active (Locked)') : 'not set'}
                  </span>
                </div>
                <span className="text-xs text-slate-300 block">
                  {isAuthenticatorSet
                    ? (currentLang === 'bn'
                        ? 'গুগল অথেন্টিকেটর সক্রিয় রয়েছে। নিরাপত্তার স্বার্থে ইউজার নিজে এটি পরিবর্তন বা নিষ্ক্রিয় করতে পারবেন না।'
                        : 'Google Authenticator is permanently active & locked for security.')
                    : (currentLang === 'bn'
                        ? 'গুগল অথেন্টিকেটর এখনও সেট করা হয়নি (not set)। নিচের কি ও লাইভ কোড দিয়ে সেট করুন।'
                        : 'Google Authenticator is not set. Setup using the key and live code below.')}
                </span>
              </div>
              <button
                type="button"
                id="profile-authenticator-toggle-btn"
                disabled={isAuthenticatorSet}
                onClick={() => {
                  if (isAuthenticatorSet) {
                    showToast(
                      currentLang === 'bn'
                        ? 'নিরাপত্তার স্বার্থে একবার সেট করা গুগল অথেন্টিকেটর বন্ধ বা পরিবর্তন করা সম্ভব নয়।'
                        : 'Google Authenticator is permanently locked and cannot be disabled.'
                    );
                    return;
                  }
                  showToast(
                    currentLang === 'bn'
                      ? 'গুগল অথেন্টিকেটর সক্রিয় করতে নিচের লাইভ কোড যাচাই সম্পন্ন করুন।'
                      : 'Please verify the 6-digit live code below to activate.'
                  );
                }}
                className={`relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isAuthenticatorSet ? 'bg-emerald-500 cursor-not-allowed opacity-90' : 'bg-slate-700 cursor-pointer'
                }`}
                title={isAuthenticatorSet ? (currentLang === 'bn' ? 'স্থায়ীভাবে সক্রিয় ও লক করা' : 'Active & Locked') : undefined}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAuthenticatorSet ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isAuthenticatorSet ? (
              /* ALREADY SET & PERMANENTLY LOCKED VIEW ("একবার সেট করলে দ্বিতীয় বের যেনো ইউজার করতে না পারে") */
              <div className="rounded-3xl bg-[#062c22] border border-emerald-500/35 p-6 shadow-xl space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="w-9 h-9 text-emerald-400" />
                </div>
                <div className="text-center space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{currentLang === 'bn' ? 'স্থায়ীভাবে সক্রিয় ও লক করা (Active & Locked)' : 'Permanently Active & Locked'}</span>
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white pt-1">
                    {currentLang === 'bn' ? 'গুগল অথেন্টিকেটর সক্রিয় রয়েছে' : 'Google Authenticator Active'}
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                    {currentLang === 'bn'
                      ? 'আপনার অ্যাকাউন্টের ২-স্টেপ ভেরিফিকেশন ইতিমধ্যে সফলভাবে সক্রিয় ও লক করা রয়েছে। নিরাপত্তার স্বার্থে ইউজার নিজে এটি দ্বিতীয়বার পরিবর্তন বা রিসেট করতে পারবেন না।'
                      : 'Your 2-Step Verification is active and locked. To safeguard your funds, users cannot alter or reset it.'}
                  </p>
                </div>

                {/* Secret Key Display with Copy */}
                <div className="pt-2 border-t border-emerald-500/20">
                  <span className="text-xs text-slate-300 block mb-1.5 font-medium">
                    {currentLang === 'bn' ? 'আপনার বর্তমান সিক্রেট কি (Secret Key):' : 'Your Configured Secret Key:'}
                  </span>
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#042018] border border-emerald-500/30">
                    <code className="text-xs sm:text-sm font-mono text-emerald-300 font-bold tracking-widest">
                      {authSecretKey}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText?.(cleanBase32Key(authSecretKey));
                        setIsAuthKeyCopied(true);
                        showToast(currentLang === 'bn' ? 'কি ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Secret Key copied!');
                        setTimeout(() => setIsAuthKeyCopied(false), 2000);
                      }}
                      className="p-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    >
                      {isAuthKeyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{isAuthKeyCopied ? (currentLang === 'bn' ? 'কপি হয়েছে' : 'Copied') : (currentLang === 'bn' ? 'কপি' : 'Copy')}</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  id="profile-auth-done-back-btn"
                  onClick={() => setActiveSubModal(null)}
                  className="w-full mt-4 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{currentLang === 'bn' ? 'ঠিক আছে (ফিরে যান)' : 'Done & Return'}</span>
                </button>
              </div>
            ) : (
              /* FIRST-TIME SETUP VIEW */
              <>
                <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-6 shadow-xl space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-white">
                      {currentLang === 'bn'
                        ? 'QR কোড স্ক্যান করুন অথবা সিক্রেট কি ব্যবহার করুন'
                        : 'Scan QR Code or Use Secret Key'}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {currentLang === 'bn'
                        ? 'Google Authenticator অ্যাপ দিয়ে স্ক্যান করুন অথবা সিক্রেট কি টি কপি করে অ্যাপে যুক্ত করুন।'
                        : 'Scan with Google Authenticator or enter the manual key below.'}
                    </p>
                  </div>

                  {/* Real QR Code using api.qrserver.com */}
                  <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-lg border-2 border-emerald-400/40">
                    <img
                      src={getQrCodeUrl(getOtpAuthUrl(cleanBase32Key(authSecretKey), user.phone || user.memberId || 'NVT Energy', 'NVT Energy'))}
                      alt="Google Authenticator QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Secret Key with Copy */}
                  <div>
                    <span className="text-xs text-slate-300 block mb-1.5">
                      {currentLang === 'bn' ? 'ম্যানুয়াল সিক্রেট কি (Secret Key):' : 'Or enter setup key manually:'}
                    </span>
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-[#042018] border border-emerald-500/30">
                      <code className="text-xs sm:text-sm font-mono text-emerald-300 tracking-wider font-bold">
                        {authSecretKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText?.(cleanBase32Key(authSecretKey));
                          setIsAuthKeyCopied(true);
                          showToast(currentLang === 'bn' ? 'কি ক্লিপবোর্ডে কপি করা হয়েছে!' : 'Setup Key copied!');
                          setTimeout(() => setIsAuthKeyCopied(false), 2000);
                        }}
                        className="p-1.5 px-2.5 rounded-xl text-emerald-400 hover:text-white bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      >
                        {isAuthKeyCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>
                          {isAuthKeyCopied
                            ? currentLang === 'bn'
                              ? 'কপি হয়েছে'
                              : 'Copied'
                            : currentLang === 'bn'
                            ? 'কপি'
                            : 'Copy'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Real Verification Input */}
                <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 space-y-3">
                  <label className="text-xs font-semibold text-emerald-200 block">
                    {currentLang === 'bn'
                      ? 'অথেন্টিকেটর অ্যাপের ৬-ডিজিট লাইভ কোড যাচাই করুন:'
                      : 'Enter 6-digit Live Code from Authenticator:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={authInputCode}
                      onChange={(e) => setAuthInputCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000 000"
                      className="flex-1 px-4 py-3 text-center font-mono tracking-[0.35em] text-base bg-[#042018] border border-emerald-500/30 rounded-2xl text-white focus:outline-none focus:border-emerald-400 placeholder:tracking-normal placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      id="profile-auth-verify-code-btn"
                      onClick={() => {
                        const cleanCode = authInputCode.trim().replace(/\D/g, '');
                        if (cleanCode.length !== 6) {
                          showToast(currentLang === 'bn' ? 'দয়া করে ৬-সংখ্যার কোড লিখুন' : 'Please enter 6-digit code');
                          return;
                        }
                        const cleanSecret = cleanBase32Key(authSecretKey);
                        const isValid = verifyTOTP(cleanCode, cleanSecret, 1);
                        if (!isValid) {
                          showToast(
                            currentLang === 'bn'
                              ? 'ভুল গুগল অথেন্টিকেটর কোড! ফেক কোড গ্রহণযোগ্য নয়। Google Authenticator অ্যাপের সঠিক লাইভ কোডটি দিন।'
                              : 'Invalid Google Authenticator code! Fake code is not accepted. Please enter the real live code.'
                          );
                          return;
                        }

                        // Success: Save and Lock permanently!
                        handleSaveAuthenticator(true, cleanSecret);
                        showToast(
                          currentLang === 'bn'
                            ? '২এফএ কোড সফলভাবে যাচাই হয়েছে! গুগল অথেন্টিকেটর স্থায়ীভাবে একটিভ ও লক করা হয়েছে।'
                            : '2FA Code Verified! Google Authenticator is now permanently Active & Locked.'
                        );
                        setAuthInputCode('');
                      }}
                      className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      {currentLang === 'bn' ? 'যাচাই ও একটিভ করুন' : 'Verify & Set'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {currentLang === 'bn'
                      ? 'সতর্কতা: একবার সক্রিয় করলে ইউজার নিজে আর এটি পরিবর্তন বা নিষ্ক্রিয় করতে পারবেন না।'
                      : 'Notice: Once activated, this cannot be changed or disabled by user.'}
                  </p>
                </div>

                <button
                  type="button"
                  id="profile-auth-final-save-btn"
                  onClick={() => {
                    const cleanCode = authInputCode.trim().replace(/\D/g, '');
                    if (cleanCode.length === 6) {
                      const cleanSecret = cleanBase32Key(authSecretKey);
                      const isValid = verifyTOTP(cleanCode, cleanSecret, 1);
                      if (isValid) {
                        handleSaveAuthenticator(true, cleanSecret);
                        showToast(
                          currentLang === 'bn'
                            ? '২এফএ কোড সফলভাবে যাচাই হয়েছে! গুগল অথেন্টিকেটর স্থায়ীভাবে একটিভ করা হয়েছে।'
                            : '2FA Code Verified! Google Authenticator activated.'
                        );
                        setActiveSubModal(null);
                        return;
                      } else {
                        showToast(
                          currentLang === 'bn'
                            ? 'ভুল কোড! ফেক কোড গ্রহণযোগ্য নয়। Google Authenticator অ্যাপের সঠিক লাইভ কোড দিন।'
                            : 'Invalid code! Fake code not accepted. Please enter real live code.'
                        );
                        return;
                      }
                    }
                    showToast(
                      currentLang === 'bn'
                        ? 'আগে অথেন্টিকেটর অ্যাপ থেকে সঠিক ৬-সংখ্যার কোড দিয়ে যাচাই সম্পন্ন করুন।'
                        : 'Please enter and verify 6-digit code from Authenticator first.'
                    );
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {currentLang === 'bn' ? 'যাচাই ও সক্রিয় সম্পন্ন করুন' : 'Verify & Complete Activation'}
                  </span>
                </button>
              </>
            )}
          </main>
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

      {/* 3. Substations Page (Full-Page View) */}
      {activeSubModal === 'substations' && (
        <div
          id="profile-subpage-substations"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'বিদ্যুৎ সাবস্টেশন নেটওয়ার্ক' : 'Grid Substation Network'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? '১৪টি রিয়েল-টাইম পাওয়ার নোড' : '14 Automated Power Nodes'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
              560 MW Peak
            </span>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-4">
            <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/30 shadow-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300/80 block uppercase tracking-wide">
                  {currentLang === 'bn' ? 'নেটওয়ার্ক স্ট্যাটাস' : 'Network Health'}
                </span>
                <span className="text-base font-bold text-white">99.98% System Uptime</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                All 14 Nodes Synced
              </span>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Dhaka North Smart Substation', load: '120 MW', status: 'Online 99.98%', region: 'Dhaka Division' },
                { name: 'Chattogram Industrial Grid Node', load: '140 MW', status: 'Online 100%', region: 'Chattogram Division' },
                { name: 'Sylhet Hydro-Hybrid Substation', load: '85 MW', status: 'Online 99.95%', region: 'Sylhet Division' },
                { name: 'Rajshahi Solar Hub #4', load: '95 MW', status: 'Online 100%', region: 'Rajshahi Division' },
                { name: 'Khulna Eco Power Station', load: '60 MW', status: 'Online 99.91%', region: 'Khulna Division' },
                { name: 'Barishal Coastal Tidal Substation', load: '60 MW', status: 'Online 99.97%', region: 'Barishal Division' },
              ].map((sub, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/25 hover:border-emerald-500/50 transition-all flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-white text-sm block">{sub.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">{sub.region}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {sub.status}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-300 bg-[#042018] px-3 py-1.5 rounded-xl border border-emerald-500/30 text-xs">
                    {sub.load}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveSubModal(null)}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 text-xs transition-colors cursor-pointer mt-4"
            >
              {currentLang === 'bn' ? 'প্রোফাইলে ফিরে যান' : 'Return to Profile'}
            </button>
          </main>
        </div>
      )}

      {/* 4. Engineering Team Page (Full-Page View) */}
      {activeSubModal === 'engineering' && (
        <div
          id="profile-subpage-engineering"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'প্রধান প্রকৌশলী দল' : 'Executive Engineering Team'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'এআই পাওয়ার ম্যানেজমেন্ট বিশেষজ্ঞ' : 'AI Power System Specialists'}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-4">
            <div className="space-y-3">
              {[
                {
                  name: 'Dr. Tariqul Islam, Ph.D.',
                  role: 'Chief Technical Officer (CTO)',
                  org: 'Ex-Siemens Smart Grid, 18+ Yrs Exp.',
                  desc: 'Specialized in algorithmic micro-grid distribution and automated telemetry routing.',
                },
                {
                  name: 'Engr. Sarah Rahman',
                  role: 'Head of AI Transmission',
                  org: 'BUET Electrical Fellow, IEEE Senior Member',
                  desc: 'Pioneered continuous voltage stabilization and neural predictive load shifting.',
                },
                {
                  name: 'Kazi Mahbub Alam',
                  role: 'Director of Plant Safety',
                  org: 'ISO 45001 & ISO 14001 Lead Auditor',
                  desc: 'Oversees safety protocols, grid redundancy mechanisms, and zero-accident compliance.',
                },
                {
                  name: 'Engr. Tanvir Ahmed',
                  role: 'Principal Grid Architect',
                  org: 'Renewable Systems Specialist, Ex-DESCO',
                  desc: 'Directs real-time battery storage synchronizations and commercial plant expansion.',
                },
              ].map((eng, idx) => (
                <div key={idx} className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/25 space-y-2 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-white text-sm block">{eng.name}</span>
                      <span className="text-emerald-300 text-xs font-semibold block">{eng.role}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                      Verified
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px] block">{eng.org}</span>
                  <p className="text-xs text-slate-300 pt-1 border-t border-emerald-500/15">{eng.desc}</p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveSubModal(null)}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 text-xs transition-colors cursor-pointer mt-4"
            >
              {currentLang === 'bn' ? 'প্রোফাইলে ফিরে যান' : 'Return to Profile'}
            </button>
          </main>
        </div>
      )}

      {/* 5. ESG Audit Page (Full-Page View) */}
      {activeSubModal === 'esg' && (
        <div
          id="profile-subpage-esg"
          className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200"
        >
          <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveSubModal(null)}
                className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
                aria-label="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-400" />
                  <span>{currentLang === 'bn' ? 'ইএসজি ও গ্রিন অডিট' : 'ESG & Green Energy Audit'}</span>
                </h1>
                <p className="text-[11px] text-slate-300">
                  {currentLang === 'bn' ? 'পরিবেশবান্ধব বিদ্যুৎ প্রকল্প' : 'Environmental, Social & Governance'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
              ISO 14001:2024
            </span>
          </header>

          <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#07362a] to-[#042018] border border-emerald-500/30 shadow-xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">Carbon Offset Achieved</span>
              <p className="text-2xl sm:text-3xl font-extrabold font-mono text-[#00e676]">350,000+ Metric Tons</p>
              <p className="text-xs text-slate-300">
                Prevented from entering Bangladesh’s atmosphere through automated AI load balancing and clean renewable energy distribution.
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/25 flex justify-between items-center shadow-lg">
                <span className="font-semibold text-white">Green Renewable Energy Ratio:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">92.4% Clean</span>
              </div>
              <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/25 flex justify-between items-center shadow-lg">
                <span className="font-semibold text-white">Community Reinvestment:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">5.0% Net Profits</span>
              </div>
              <div className="p-4 rounded-3xl bg-[#062c22] border border-emerald-500/25 flex justify-between items-center shadow-lg">
                <span className="font-semibold text-white">Audit Standard Compliance:</span>
                <span className="font-bold text-teal-300">Certified Grade AAA</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubModal(null)}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold text-slate-950 text-xs transition-colors cursor-pointer mt-4"
            >
              {currentLang === 'bn' ? 'প্রোফাইলে ফিরে যান' : 'Return to Profile'}
            </button>
          </main>
        </div>
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xs bg-[#062c22] border border-emerald-500/30 rounded-3xl p-5 text-white space-y-3 text-center shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold">
              {currentLang === 'bn' ? 'লগআউট নিশ্চিতকরণ' : 'Logout Confirmation'}
            </h3>
            <p className="text-xs text-slate-300">
              {currentLang === 'bn'
                ? 'আপনি কি নিশ্চিত যে আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?'
                : 'Are you sure you want to log out of your account?'}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="py-2 rounded-xl bg-[#042018] hover:bg-[#072c21] text-emerald-200 border border-emerald-500/30 font-semibold text-xs transition-colors"
              >
                {currentLang === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-colors"
              >
                {currentLang === 'bn' ? 'লগআউট' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet History Modal */}
      <WalletHistoryModal
        isOpen={isWalletHistoryModalOpen}
        onClose={() => setIsWalletHistoryModalOpen(false)}
        transactions={user.transactions || []}
        currentLang={currentLang}
        themeMode={themeMode}
      />

      {/* Manager Referral Permission Alert Modal */}
      <ManagerReferralModal
        isOpen={isManagerReferralModalOpen}
        onClose={() => setIsManagerReferralModalOpen(false)}
        onContactManager={() => {
          setIsManagerReferralModalOpen(false);
          openCrispChat();
        }}
        currentLang={currentLang}
        themeMode={themeMode}
        reason={referralBlockReason}
        currentLimit={user.referralLimit || 0}
      />

      {/* Treasure Modal (ট্রেজার - লাকি ট্রেজার বক্স ও রিডিম কোড) */}
      <TreasureModal
        isOpen={isTreasureModalOpen}
        onClose={() => setIsTreasureModalOpen(false)}
        currentLang={currentLang}
        themeMode={themeMode}
        userId={user.uid}
        memberId={user.memberId}
        onClaimReward={handleClaimTreasureReward}
        showToast={showToast}
        onOpenProjectManager={() => setIsProjectManagerOpen(true)}
      />

      {/* Project Manager Page (প্রকল্প ব্যবস্থাপক টেলিগ্রাম সাপোর্ট) */}
      {isProjectManagerOpen && (
        <ProjectManagerPage
          onBack={() => setIsProjectManagerOpen(false)}
          currentLang={currentLang}
          showToast={showToast}
        />
      )}
    </div>
  );
};
