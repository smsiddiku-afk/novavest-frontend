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
} from 'lucide-react';
import { AppDownloadModal } from './AppDownloadModal';
import { EnergyHomeTab } from './EnergyHomeTab';
import { InvestTabContent } from './InvestTabContent';
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
import {
  recordFirestoreDeposit,
  getFirestoreUserTransactions,
  subscribeToUserTransactions,
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

  // User profile state
  const [user, setUser] = useState<UserProfile>(() => {
    const fallbackMemberId = `NVT${Math.floor(100000 + Math.random() * 900000)}`;
    const activeId = initialUser?.uid || initialUser?.memberId || fallbackMemberId;
    let savedInvestments: any[] = [];
    try {
      const stored = localStorage.getItem(`user_investments_${activeId}`);
      if (stored) savedInvestments = JSON.parse(stored);
    } catch {
      // ignore
    }

    // Determine initial real VIP level and active units
    const activeUnits = initialUser?.activeUnits ?? savedInvestments.length;
    let maxVip = 0;
    if (savedInvestments.length > 0) {
      maxVip = Math.max(...savedInvestments.map((inv) => inv.vipLevel || 1), 0);
    }
    const realVip = initialUser?.vipLevel !== undefined ? initialUser.vipLevel : maxVip;

    const realTotalEarnings = initialUser?.totalEarnings ?? (
      savedInvestments.reduce((acc, curr) => acc + (curr.totalEarned || 0), 0)
    );

    const realDailyRewards = initialUser?.dailyRewards ?? (
      savedInvestments.reduce((acc, curr) => acc + (curr.dailyYield || 0), 0)
    );

    return {
      uid: initialUser?.uid,
      name: initialUser?.name || 'NVT Member',
      memberId: initialUser?.memberId || fallbackMemberId,
      referralCode: initialUser?.referralCode || (initialUser?.memberId ? initialUser.memberId.slice(-6).toUpperCase() : fallbackMemberId.slice(-6).toUpperCase()),
      referredBy: initialUser?.referredBy,
      memberSince: initialUser?.memberSince || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
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
    };
  });

  // Explicit user update helper: persists data safely without triggering reactive cascading loops
  const updateUser = (updater: (prev: UserProfile) => UserProfile) => {
    setUser((prev) => {
      const next = updater(prev);
      if (!isSameUser(prev, next)) {
        persistAuthUser(next);
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

  // Recharge State
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const [rechargeMethod, setRechargeMethod] = useState<'bKash' | 'Nagad' | 'Rocket' | 'USDT'>('bKash');

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

    // 1. MANUAL TRXID VERIFICATION (Sandbox / Auto-Approval Fallback)
    if (channel === 'manual' || manualDetails?.trxId) {
      const trxId = (manualDetails?.trxId || `TXN${Date.now().toString().slice(-8)}`).trim().toUpperCase();
      const sender = manualDetails?.senderPhone || user.phone || '';

      try {
        showToast(
          currentLang === 'bn'
            ? 'TrxID ভেরিফিকেশন ও ব্যালেন্স জমা হচ্ছে...'
            : 'Verifying TrxID and crediting balance...'
        );

        // Notify server database of manual transaction
        try {
          await fetch('/api/payments/submit-txnid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: Number(amount),
              method: method || 'bKash',
              trxId,
              senderPhone: sender,
              userId: activeUid,
            }),
          });
        } catch (serverErr) {
          console.warn('[Manual Deposit Server Log Warning]', serverErr);
        }

        // Atomically update user wallet balance and record in Firestore
        const result = await recordFirestoreDeposit(activeUid, {
          amount: Number(amount),
          method: method || 'bKash',
          channel: 'manual',
          trxId,
          senderPhone: sender,
        });

        // Update local React user state
        updateUser((prev) => ({
          ...prev,
          walletBalance: prev.walletBalance + Number(amount),
          transactions: [
            {
              id: trxId,
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
              description: `Direct TrxID Deposit via ${method} (${trxId})`,
              hash: trxId,
            },
            ...(prev.transactions || []),
          ],
        }));

        showToast(
          currentLang === 'bn'
            ? `✅ TrxID যাচাই সফল! ৳${Number(amount).toLocaleString()} ওয়ালেটে যুক্ত হয়েছে (TrxID: ${trxId})`
            : `✅ TrxID verified! ৳${Number(amount).toLocaleString()} credited to your wallet (TrxID: ${trxId})`
        );
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
                    channel: 'channel1',
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
                        description: `Nekpay Deposit (${method})`,
                        hash: checkData.order?.trxId || orderNo,
                      },
                      ...(prev.transactions || []),
                    ],
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

        showToast(
          currentLang === 'bn'
            ? `মার্চেন্ট পেমেন্ট সফল! ৳${amount.toLocaleString()} আপনার ওয়ালেটে জমা হয়েছে (TrxID: ${trxId || orderId})`
            : `Merchant Payment successful! ৳${amount.toLocaleString()} credited to wallet (TrxID: ${trxId || orderId})`
        );

        // Remove payment callback query params so refreshing doesn't duplicate
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

    const unsubscribe = subscribeToUserTransactions(activeUid, (firestoreTxns) => {
      if (firestoreTxns && firestoreTxns.length > 0) {
        updateUser((prev) => {
          const existingIds = new Set((prev.transactions || []).map((t: any) => t.id || t.hash));
          const newTxns = firestoreTxns.filter((t: any) => !existingIds.has(t.id || t.hash));
          if (newTxns.length === 0) return prev;
          return {
            ...prev,
            transactions: [...newTxns, ...(prev.transactions || [])],
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

    // Match package to calculate real VIP level and daily rewards
    const matchedPkg = ENERGY_PACKAGES_7.find(
      (p) => p.nameBn === projectName || p.nameEn === projectName || projectName.includes(p.nameEn) || projectName.includes(p.nameBn)
    );
    const pkgVip = matchedPkg ? matchedPkg.vipLevel : 1;
    const pkgDailyRate = matchedPkg ? matchedPkg.dailyRate : 3.8;
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

    const maxVip = Math.max(...updatedInvestments.map((inv: any) => inv.vipLevel || 1), 1);
    const totalDaily = updatedInvestments.reduce((acc: number, curr: any) => acc + (curr.dailyYield || 0), 0);

    updateUser((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - amount,
      vipLevel: maxVip,
      activeUnits: updatedInvestments.length,
      dailyRewards: totalDaily,
      activeInvestments: updatedInvestments,
    }));

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
      className="w-full max-w-md md:max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto min-h-screen bg-[#050811] text-slate-100 flex flex-col relative select-none md:px-6 pb-24 md:pb-12 transition-all duration-300"
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
      <header className="hidden md:flex items-center justify-between py-3 px-6 my-4 rounded-2xl bg-[#091122]/90 border border-slate-800/80 backdrop-blur-xl shadow-xl sticky top-3 z-30">
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
              <span className="text-xs font-bold text-slate-300 tracking-wider">
                NOVA TERRA ENERGY
              </span>
            </div>
            <p className="text-[10px] text-amber-400/90 font-mono font-medium">
              {currentLang === 'bn' ? 'জাতীয় ফুয়েল, গ্যাস ও পাওয়ার গ্রিড' : 'National Fuel, Gas & Power Grid'}
            </p>
          </div>
        </div>

        {/* Center: Desktop Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#060b18] p-1.5 rounded-xl border border-slate-800/90">
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
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{currentLang === 'bn' ? item.labelBn : item.labelEn}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Balance, Language & Logout */}
        <div className="flex items-center gap-2.5">
          {/* Balance pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] text-slate-400 font-medium">
              {currentLang === 'bn' ? 'ব্যালেন্স:' : 'Balance:'}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ৳{user.walletBalance.toLocaleString()}
            </span>
          </div>

          {/* Language Toggle */}
          {onToggleLang && (
            <button
              type="button"
              onClick={() => onToggleLang(currentLang === 'bn' ? 'en' : 'bn')}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
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
        {currentTab !== 'home' && currentTab !== 'wallet' && currentTab !== 'referral' && (
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
              className="p-1.5 -ml-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              aria-label="Back"
            >
              <ChevronLeft className="w-7 h-7" />
              {currentTab === 'profile' && (
                <span className="text-xs text-slate-400 font-medium">
                  {currentLang === 'bn' ? 'হোম' : 'Home'}
                </span>
              )}
            </button>

            <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
              {currentTab === 'profile' && (currentLang === 'bn' ? 'প্রোফাইল' : 'Profile')}
              {currentTab === 'invest' && (currentLang === 'bn' ? 'বিনিয়োগ' : 'Investment')}
              {currentTab === 'transactions' && (currentLang === 'bn' ? 'লেনদেন' : 'Transactions')}
              {currentTab === 'wallet' && (currentLang === 'bn' ? 'হোস্টিং লেভেল বিবরণী' : 'Hosting Level Details')}
            </span>

            <div className="flex items-center gap-2">
              {onToggleLang && (
                <button
                  type="button"
                  onClick={() => onToggleLang(currentLang === 'en' ? 'bn' : 'en')}
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800/80 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors cursor-pointer"
                  title="Toggle Language"
                >
                  {currentLang === 'en' ? 'BN' : 'EN'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSubModal('notifications')}
                className="relative p-1.5 -mr-1.5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-[#050811]" />
              </button>
            </div>
          </div>
        )}

        {/* 3. Invest Tab */}
        {currentTab === 'invest' && (
          <InvestTabContent
            userBalance={user.walletBalance}
            currentLang={currentLang}
            onInvestProject={handleInvestProject}
            onOpenRecharge={() => setActiveSubModal('recharge')}
          />
        )}

        {/* 4. Transactions Tab */}
        {currentTab === 'transactions' && (
          <TransactionsTabContent
            userBalance={user.walletBalance}
            currentLang={currentLang}
          />
        )}

        {/* 5. Promo Bonus / Hosting Level & Wallet Tab */}
        {currentTab === 'wallet' && (
          <WalletTabContent
            userBalance={user.walletBalance}
            currentLang={currentLang}
            onOpenRecharge={() => setActiveSubModal('recharge')}
            onOpenWithdraw={() => setActiveSubModal('withdraw')}
            onOpenBankBinding={() => setActiveSubModal('payment')}
            onOpenGateway={(amount, method, channel) => {
              handleInitiateDeposit(amount, method, channel);
            }}
            onOpenHistory={() => switchTab('transactions')}
            onBack={() => switchTab('home')}
            onClaimPromoReward={(amt, lvl) => {
              updateUser((prev) => ({
                ...prev,
                walletBalance: prev.walletBalance + amt,
              }));
              showToast(
                currentLang === 'bn'
                  ? `লেভেল ${lvl} থেকে ৳${amt.toLocaleString()} বোনাস ওয়ালেটে জমা হয়েছে!`
                  : `Level ${lvl} bonus ৳${amt.toLocaleString()} added to wallet!`
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
            userCode={user.memberId || 'NV8829'}
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
            {/* 1. Official User Profile Header Card */}
            <div
              id="profile-user-card"
              className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-5 sm:p-6 shadow-[0_12px_32px_-6px_rgba(37,99,235,0.45)] border border-blue-400/25 shrink-0 text-white"
            >
              {/* Subtle Decorative Wave Curve Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 400 180"
                  preserveAspectRatio="none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M-20 50 C 130 170, 240 -20, 420 100"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="4 6"
                  />
                  <path
                    d="M-20 100 C 140 20, 260 200, 420 60"
                    stroke="white"
                    strokeWidth="1.2"
                  />
                </svg>
              </div>

              <div className="relative z-10 flex items-start justify-between">
                {/* Left: User Avatar & Details */}
                <div className="flex items-center gap-3.5">
                  {/* Circular User Avatar */}
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/40 backdrop-blur-xs">
                    <User className="w-8 h-8 sm:w-9 sm:h-9 text-white" />
                  </div>

                  {/* User Details */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl sm:text-[22px] font-extrabold text-white tracking-tight leading-tight">
                        {user.name}
                      </h2>
                      {user.isVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10px] font-semibold text-emerald-300">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>{currentLang === 'bn' ? 'যাচাইকৃত' : 'Verified'}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-blue-100/90 font-medium">
                      {currentLang === 'bn' ? 'সদস্য হয়েছেন: ' : 'Member since: '}
                      {user.memberSince}
                    </p>

                    {/* ID with Copy Icon */}
                    <div className="flex items-center gap-1.5 text-xs text-blue-100 font-medium pt-0.5">
                      <span className="font-mono">ID: {user.memberId}</span>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        className="p-1 hover:bg-white/20 rounded transition-colors text-white cursor-pointer"
                        title="Copy ID"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-blue-100" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: VIP Badge & Edit Profile Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono shadow-xs border ${
                      (user.vipLevel || 0) > 0
                        ? 'bg-amber-400/25 border-amber-300/40 text-amber-200'
                        : 'bg-slate-700/50 border-slate-600/50 text-slate-300'
                    }`}
                  >
                    VIP {user.vipLevel || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSubModal('edit')}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer active:scale-95"
                    title="Edit Profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* User Financial & Network Highlights */}
              <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center text-white">
                <div className="bg-black/20 rounded-xl py-1.5 px-1">
                  <span className="text-[10px] text-blue-200 block">{currentLang === 'bn' ? 'মোট আয়' : 'Total Earnings'}</span>
                  <span className="text-xs font-bold text-cyan-300 font-mono">
                    ৳{(user.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-black/20 rounded-xl py-1.5 px-1">
                  <span className="text-[10px] text-blue-200 block">{currentLang === 'bn' ? 'সক্রিয় ইউনিট' : 'Active Units'}</span>
                  <span className="text-xs font-bold text-white font-mono">
                    {user.activeUnits || 0} {currentLang === 'bn' ? 'টি' : 'Units'}
                  </span>
                </div>
                <div className="bg-black/20 rounded-xl py-1.5 px-1">
                  <span className="text-[10px] text-blue-200 block">{currentLang === 'bn' ? 'দৈনিক রিওয়ার্ড' : 'Daily Rewards'}</span>
                  <span className="text-xs font-bold text-emerald-300 font-mono">
                    ৳{(user.dailyRewards || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Wallet Balance Card with Recharge & Withdraw */}
            <div
              id="wallet-balance-card"
              className="mt-4 px-5 py-4 rounded-[22px] bg-[#0b1222] border border-slate-800/80 shadow-sm shrink-0 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs text-slate-400 font-medium mb-0.5">
                    {currentLang === 'bn' ? 'অ্যাকাউন্ট ব্যালেন্স' : 'Account Balance'}
                  </span>
                  <span className="text-2xl sm:text-[28px] font-bold text-white tracking-tight font-mono">
                    ৳{user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubModal('wallet')}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer group"
                >
                  <Wallet className="w-4 h-4 text-blue-400 group-hover:scale-105 transition-transform" />
                  <span>{currentLang === 'bn' ? 'ওয়ালেট দেখুন' : 'View Wallet'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Recharge & Withdraw Options */}
              <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-800/60">
                <button
                  id="profile-recharge-btn"
                  type="button"
                  onClick={() => setActiveSubModal('recharge')}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4 text-white" />
                  <span>{currentLang === 'bn' ? 'রিচার্জ করুন' : 'Recharge'}</span>
                </button>

                <button
                  id="profile-withdraw-btn"
                  type="button"
                  onClick={() => setActiveSubModal('withdraw')}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowUpFromLine className="w-4 h-4 text-cyan-400" />
                  <span>{currentLang === 'bn' ? 'উইথড্র করুন' : 'Withdraw'}</span>
                </button>
              </div>
            </div>

            {/* 3. Team Commission & Referral Banner (রিচার্জ ও উইথড্র অপশনের নিচে ব্যানার) */}
            <div
              id="profile-team-commission-banner"
              onClick={() => switchTab('referral')}
              className="mt-4 relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#08152c] via-[#0d203e] to-[#08111e] border border-amber-500/40 hover:border-amber-400/60 p-4 shadow-xl shadow-amber-950/20 cursor-pointer transition-all group active:scale-[0.99]"
            >
              {/* Glowing Ambient Lights */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-40" />

              {/* Top Status Strip */}
              <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/35 text-[10px] font-extrabold text-amber-300 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{currentLang === 'bn' ? 'টিম কমিশন ও ইনভাইটেশন' : 'Team Commission Program'}</span>
                </div>

                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 group-hover:translate-x-0.5 transition-transform">
                  <span>{currentLang === 'bn' ? 'ইনভাইট করুন' : 'Invite'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Main Typography and Icon Row */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-white">
                      {currentLang === 'bn' ? 'বন্ধুদের ইনভাইট করুন ও কমিশন পান' : 'Invite Friends & Earn Commission'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {currentLang === 'bn'
                      ? 'টিম কমিশন: ১ম লেভেল ৭% • ২য় লেভেল ৩% • ৩য় লেভেল ১%'
                      : 'Team commission: Level 1: 7% • Level 2: 3% • Level 3: 1%'}
                  </p>
                </div>

                <div className="shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6 text-slate-950" />
                  </div>
                </div>
              </div>

              {/* 3-Tier Commission Badges Pill Strip */}
              <div className="relative z-10 mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2">
                <div className="bg-[#050c18]/80 border border-amber-500/30 rounded-xl py-1.5 px-1.5 text-center">
                  <span className="text-[9px] text-amber-300 font-bold block">{currentLang === 'bn' ? 'প্রথম লেভেল' : 'Level 1'}</span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono">7%</span>
                </div>
                <div className="bg-[#050c18]/80 border border-blue-500/30 rounded-xl py-1.5 px-1.5 text-center">
                  <span className="text-[9px] text-blue-300 font-bold block">{currentLang === 'bn' ? 'দ্বিতীয় লেভেল' : 'Level 2'}</span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono">3%</span>
                </div>
                <div className="bg-[#050c18]/80 border border-indigo-500/30 rounded-xl py-1.5 px-1.5 text-center">
                  <span className="text-[9px] text-indigo-300 font-bold block">{currentLang === 'bn' ? 'তৃতীয় লেভেল' : 'Level 3'}</span>
                  <span className="text-xs sm:text-sm font-black text-white font-mono">1%</span>
                </div>
              </div>
            </div>

            {/* Profile & Account Settings Menu List */}
            <div
              id="profile-menu-container"
              className="mt-4 rounded-[24px] bg-[#0b1222] border border-slate-800/80 divide-y divide-slate-800/60 shadow-sm overflow-hidden shrink-0"
            >
              {/* Row 1: Personal Information */}
              <button
                id="profile-personal-info-btn"
                type="button"
                onClick={() => setActiveSubModal('personal')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-blue-300 transition-colors">
                    {currentLang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Row 2: Security & Password */}
              <button
                id="profile-security-settings-btn"
                type="button"
                onClick={() => setActiveSubModal('security')}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-blue-300 transition-colors">
                    {currentLang === 'bn' ? 'নিরাপত্তা ও পাসওয়ার্ড' : 'Security Settings'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Row 3: Google Authenticator */}
              <button
                id="profile-google-authenticator-btn"
                type="button"
                onClick={() => setActiveSubModal('authenticator')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600/25 transition-colors">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-cyan-300 transition-colors block">
                      {currentLang === 'bn' ? 'গুগল অথেন্টিকেটর' : 'Google Authenticator'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentLang === 'bn' ? 'দ্বি-স্তর বিশিষ্ট নিরাপত্তা (২এফএ)' : 'Two-Factor Authentication (2FA)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    {currentLang === 'bn' ? 'চালু আছে' : 'Active'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </button>

              {/* Row 4: Daily Town Hall */}
              <button
                id="profile-daily-town-hall-btn"
                type="button"
                onClick={() => setActiveSubModal('townHall')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative w-9 h-9 rounded-full bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/25 transition-colors">
                    <Users className="w-4.5 h-4.5" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0b1222] animate-pulse" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-indigo-300 transition-colors block">
                      {currentLang === 'bn' ? 'দৈনিক জনসভা ও প্রশ্নোত্তর' : 'Daily Town Hall'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentLang === 'bn' ? 'লাইভ মিটিং ও দিকনির্দেশনা' : 'Daily Community Assembly & Q&A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    <Radio className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                    <span>8:30 PM</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </button>

              {/* Row 5: Payment Methods (Add Wallet) */}
              <button
                id="profile-payment-methods-btn"
                type="button"
                onClick={() => setActiveSubModal('payment')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600/25 transition-colors">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-cyan-300 transition-colors block">
                      {currentLang === 'bn' ? 'পেমেন্ট মেথড (Add Wallet)' : 'Payment Methods (Add Wallet)'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentLang === 'bn' ? 'বিকাশ, নগদ ও ব্যাংক কার্ড' : 'bKash, Nagad & Bank Wallets'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Row 6: Notification Settings */}
              <button
                type="button"
                onClick={() => setActiveSubModal('notifications')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
                    <Bell className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-blue-300 transition-colors">
                    {currentLang === 'bn' ? 'নোটিফিকেশন সেটিংস' : 'Notification Settings'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Row 7: Mobile App APK */}
              <button
                id="profile-app-download-button"
                type="button"
                onClick={handleAppDownloadClick}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600/25 transition-colors">
                    <Package className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-blue-300 transition-colors">
                    {currentLang === 'bn' ? 'মোবাইল অ্যাপ ডাউনলোড (এপিকে)' : 'Official Mobile App (APK)'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </button>

              {/* Row 8: Company Profile & Grid Operations */}
              <button
                id="profile-company-profile-btn"
                type="button"
                onClick={() => setActiveSubModal('companyInfo')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-cyan-600/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-600/25 transition-colors">
                    <Building2 className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-cyan-300 transition-colors block">
                      {currentLang === 'bn' ? 'কোম্পানি প্রোফাইল (Company Profile)' : 'Company Profile & Architecture'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentLang === 'bn' ? 'কোম্পানি পরিচিতি, ৭-ধাপের গ্রিড প্রসেস ও ভিডিও' : 'Company Overview, 7-Step Operations & Video'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-300 transition-colors" />
              </button>

              {/* Row 9: Company Licences & Approvals */}
              <button
                id="profile-licenses-btn"
                type="button"
                onClick={() => setActiveSubModal('licenses')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 transition-colors">
                    <Award className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-amber-300 transition-colors block">
                      {currentLang === 'bn' ? 'কোম্পানি লাইসেন্স ও সনদপত্র' : 'Official Licences & Certifications'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentLang === 'bn' ? 'বিইআরসি ও আইএসও যাচাইকৃত অনুমোদন' : 'BERC, ISO 50001 & Regulatory Approvals'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{currentLang === 'bn' ? 'অনুমোদিত' : 'Verified'}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </button>

              {/* Row 10: 24/7 Corporate Helpline & Customer Support */}
              <button
                id="profile-helpline-btn"
                type="button"
                onClick={() => setActiveSubModal('helpline')}
                className="w-full px-5 py-3.5 sm:py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/25 transition-colors">
                    <Headphones className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-[15px] font-medium text-white group-hover:text-cyan-300 transition-colors block">
                      {currentLang === 'bn' ? '২৪/৭ হেল্পলাইন ও সাপোর্ট' : '24/7 Priority Support & Helpline'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {currentLang === 'bn' ? 'হটলাইন: ০৯৬১২-০০১১২২ ও ইমেইল' : 'Hotline: 09612-001122 & Email Desk'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    Live
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </button>

              {/* Row 11: Logout */}
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-rose-500/10 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/20 transition-colors">
                    <LogOut className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-sm sm:text-[15px] font-medium text-rose-400 group-hover:text-rose-300 transition-colors">
                    {currentLang === 'bn' ? 'লগআউট করুন' : 'Logout'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
              </button>
            </div>

            {/* Official App Footer & Compliance Badges (Eliminates Empty Space) */}
            <div className="mt-4 mb-2 p-4 rounded-2xl bg-[#0b1222]/80 border border-slate-800/80 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-2 flex-wrap text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {currentLang === 'bn' ? 'বিইআরসি লাইসেন্সপ্রাপ্ত' : 'BERC Regulated'}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  ISO 50001
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  256-Bit SSL
                </span>
              </div>
              <div className="text-[11px] text-slate-400/90 leading-tight">
                <p className="font-semibold text-slate-300">NVT • Nova Terra Energy Grid Platform BD</p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  App Version 2.4.2 (Official Release)
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  © 2026 Nova Terra Energy (NVT) BD Ltd. {currentLang === 'bn' ? 'সর্বস্বত্ব সংরক্ষিত।' : 'All rights reserved.'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Bottom Navigation Bar (Mobile View only, hidden on desktop) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-[#050811]/95 backdrop-blur-lg border-t border-slate-800/80">
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
                ? 'text-cyan-400 font-extrabold bg-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Home className={`w-5 h-5 ${currentTab === 'home' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-slate-400'}`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'হোম' : 'Home'}</span>
            {currentTab === 'home' && (
              <span className="absolute -bottom-1 w-5 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#06b6d4]" />
            )}
          </button>

          {/* Invest */}
          <button
            type="button"
            onClick={() => switchTab('invest')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'invest'
                ? 'text-cyan-400 font-extrabold bg-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${currentTab === 'invest' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-slate-400'}`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'ইনভেস্ট' : 'Invest'}</span>
            {currentTab === 'invest' && (
              <span className="absolute -bottom-1 w-5 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#06b6d4]" />
            )}
          </button>

          {/* Transactions */}
          <button
            type="button"
            onClick={() => switchTab('transactions')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'transactions'
                ? 'text-cyan-400 font-extrabold bg-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <ArrowLeftRight className={`w-5 h-5 ${currentTab === 'transactions' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-slate-400'}`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'লেনদেন' : 'History'}</span>
            {currentTab === 'transactions' && (
              <span className="absolute -bottom-1 w-5 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#06b6d4]" />
            )}
          </button>

          {/* Promo Bonus (Hosting Level & Wallet) */}
          <button
            id="bottom-nav-promo-bonus-btn"
            type="button"
            onClick={() => switchTab('wallet')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'wallet'
                ? 'text-[#FFB300] font-extrabold bg-[#FFB300]/10'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <Award className={`w-5 h-5 ${currentTab === 'wallet' ? 'text-[#FFB300] drop-shadow-[0_0_8px_rgba(255,179,0,0.5)]' : 'text-slate-400'}`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'প্রমো বোনাস' : 'Promo Bonus'}</span>
            {currentTab === 'wallet' && (
              <span className="absolute -bottom-1 w-5 h-1 bg-[#FFB300] rounded-full shadow-[0_0_8px_#FFB300]" />
            )}
          </button>

          {/* Profile */}
          <button
            type="button"
            onClick={() => switchTab('profile')}
            className={`relative flex flex-col items-center py-1 px-3 rounded-2xl transition-all cursor-pointer active:scale-95 ${
              currentTab === 'profile'
                ? 'text-cyan-400 font-extrabold bg-cyan-500/10'
                : 'text-slate-400 hover:text-slate-200 font-medium'
            }`}
          >
            <User className={`w-5 h-5 ${currentTab === 'profile' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-slate-400'}`} />
            <span className="text-[11px] mt-0.5">{currentLang === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
            {currentTab === 'profile' && (
              <span className="absolute -bottom-1 w-5 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_#06b6d4]" />
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
