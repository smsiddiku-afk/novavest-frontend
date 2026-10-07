import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, increment, deleteDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { deleteUser, signOut } from "firebase/auth";
import { db, auth, updateFirestoreDepositStatus, updateFirestoreWithdrawalStatus, updateFirestoreReferralPermission, sanitizeFirestoreData, cleanDocId, safeDoc, safeSetDoc, safeDeleteDoc, deleteFirestoreUserProfile } from "./lib/firebase";
import {
  loadCommissionRatesFromFirestore,
  saveCommissionRatesToFirestore,
} from "./utils/referralService";
import {
  getLivePackages,
  updatePackageInFirestore,
  deletePackageFromFirestore,
  resetPackagesToDefault,
  DEFAULT_INVESTMENT_PACKAGES
} from "./utils/packageService";
import { resolveImageSrc } from "./utils/imageUtils";

const ADMIN_SECRET_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_SECRET_KEY) || "123456"; 

function ReferralLimitEditor({ userId, currentLimit, onSave }) {
  const [val, setVal] = useState(() => {
    try {
      const saved = localStorage.getItem(`nvt_admin_saved_limit_${userId}`);
      if (saved !== null && saved !== undefined && !isNaN(Number(saved))) {
        return Number(saved);
      }
    } catch (_) {}
    return currentLimit;
  });
  const [saved, setSaved] = useState(false);
  const isEditingRef = useRef(false);
  const localCommittedRef = useRef(null);

  useEffect(() => {
    if (!isEditingRef.current) {
      if (localCommittedRef.current !== null) {
        setVal(localCommittedRef.current);
      } else {
        try {
          const cached = localStorage.getItem(`nvt_admin_saved_limit_${userId}`);
          if (cached !== null && cached !== undefined && !isNaN(Number(cached))) {
            setVal(Number(cached));
            return;
          }
        } catch (_) {}
        setVal(currentLimit);
      }
    }
  }, [currentLimit, userId]);

  const handleCommit = (rawVal) => {
    const target = rawVal !== undefined ? rawVal : val;
    const num = Math.max(0, parseInt(target, 10) || 0);
    setVal(num);
    localCommittedRef.current = num;
    isEditingRef.current = false;
    try {
      localStorage.setItem(`nvt_admin_saved_limit_${userId}`, String(num));
    } catch (_) {}
    onSave(userId, num);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
      <input
        type="number"
        min="0"
        max="100000"
        value={val}
        onFocus={() => {
          isEditingRef.current = true;
        }}
        onChange={(e) => {
          isEditingRef.current = true;
          setVal(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleCommit(e.target.value);
          }
        }}
        onBlur={(e) => handleCommit(e.target.value)}
        style={{
          width: "48px",
          padding: "2px 4px",
          borderRadius: "3px",
          backgroundColor: "#0b0f19",
          border: saved ? "1px solid #10b981" : "1px solid #3b476c",
          color: saved ? "#10b981" : "#38bdf8",
          fontSize: "12px",
          fontWeight: "bold",
          textAlign: "center"
        }}
        title="লিমিট লিখে এন্টার বা সেভ বাটনে চাপুন"
      />
      <button
        type="button"
        onClick={() => handleCommit()}
        style={{
          padding: "2px 5px",
          borderRadius: "3px",
          fontSize: "10px",
          fontWeight: "bold",
          background: saved ? "#059669" : "#1e293b",
          color: saved ? "#fff" : "#94a3b8",
          border: saved ? "1px solid #10b981" : "1px solid #334155",
          cursor: "pointer"
        }}
        title="সেভ করতে ক্লিক করুন"
      >
        {saved ? "✓" : "সেভ"}
      </button>
    </div>
  );
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        return (
          localStorage.getItem("nvt_admin_authenticated") === "true" ||
          sessionStorage.getItem("nvt_admin_authenticated") === "true"
        );
      }
    } catch (_) {}
    return false;
  });
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // অ্যাক্টিভ ট্যাব স্টেট ('deposits' | 'withdrawals' | 'investments' | 'balance' | 'support' | 'users')
  const [activeTab, setActiveTab] = useState("deposits");

  const [users, setUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState(""); // ইউজার সার্চ স্টেট
  const [userFilterTab, setUserFilterTab] = useState("all"); // 'all' | 'active' | 'free' | 'referral'
  const [showIdRemover, setShowIdRemover] = useState(false); // কুইক আইডি রিমুভার ড্রপডাউন টগল
  const [withdrawals, setWithdrawals] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [packages, setPackages] = useState([]);
  const [editingPackage, setEditingPackage] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageFormData, setPackageFormData] = useState({
    id: "",
    nameEn: "",
    nameBn: "",
    category: "solar",
    badgeCategoryEn: "Solar Energy",
    badgeCategoryBn: "সোলার এনার্জি",
    badgeIconType: "sun",
    taglineEn: "",
    taglineBn: "",
    image: "/images/apex-helios-solar.jpg",
    minInvestmentBdt: 1200,
    minInvestmentUsd: 10,
    durationDays: 30,
    dailyReturnPercent: 1.5,
    totalReturnPercent: 45,
    requiredVipLevel: 0,
    maxPurchaseLimit: 0,
    isActive: true,
    order: 1,
  });
  const [loading, setLoading] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const [supportLink, setSupportLink] = useState("");
  const [telegramLink, setTelegramLink] = useState("");
  const [crispWebsiteId, setCrispWebsiteId] = useState("458178db-b2c7-4e37-b759-d377ae93554a");
  const [crispEnabled, setCrispEnabled] = useState(true);
  const [hotline, setHotline] = useState("+880 9612-345678");
  const [supportEmail, setSupportEmail] = useState("support@novaterraenergy.io");
  const [manager1Telegram, setManager1Telegram] = useState("https://t.me/NVT_ProjectManager1");
  const [manager2Telegram, setManager2Telegram] = useState("https://t.me/NVT_ProjectManager2");
  const [manager3Telegram, setManager3Telegram] = useState("https://t.me/NVT_ProjectManager3");
  const [manager4Telegram, setManager4Telegram] = useState("https://t.me/NVT_ProjectManager4");
  const [renderBackendUrl, setRenderBackendUrl] = useState("https://nvt-energy-otp-server.onrender.com");

  // রেফার বোনাস / কমিশন রেট স্টেট (টায়ার ১, ২, ৩)
  const [tier1Percent, setTier1Percent] = useState(6);
  const [tier2Percent, setTier2Percent] = useState(3);
  const [tier3Percent, setTier3Percent] = useState(1);
  const [referralSaving, setReferralSaving] = useState(false);

  // ইউজার আইডি রিমুভ ও ম্যানেজমেন্ট স্টেট
  const [manualUserIdToDelete, setManualUserIdToDelete] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [copiedId, setCopiedId] = useState("");

  // ব্যানার ও ছবি আপলোড স্টেট (Charity & Site Banners)
  const [charityBannersList, setCharityBannersList] = useState([]);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerTitleInput, setBannerTitleInput] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [bannerPreviewSrc, setBannerPreviewSrc] = useState("");
  const [bannerSelectedFile, setBannerSelectedFile] = useState(null);
  const [bannerDragActive, setBannerDragActive] = useState(false);
  const [previewingBannerImg, setPreviewingBannerImg] = useState(null);
  const bannerFileInputRef = useRef(null);

  // রিডিম কোড ম্যানেজমেন্ট স্টেট (১০-১২ টাকা দৈনিক বোনাস ও খাম)
  const [redeemCodes, setRedeemCodes] = useState([]);
  const [newRedeemCodeInput, setNewRedeemCodeInput] = useState("");
  const [newRedeemMode, setNewRedeemMode] = useState("range_10_12"); // "range_10_12" | "fixed"
  const [newRedeemFixedAmount, setNewRedeemFixedAmount] = useState(11);
  const [newRedeemDescription, setNewRedeemDescription] = useState("");
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_SECRET_KEY) {
      try {
        localStorage.setItem("nvt_admin_authenticated", "true");
        sessionStorage.setItem("nvt_admin_authenticated", "true");
      } catch (_) {}
      setIsAuthenticated(true);
      setErrorMsg("");
      fetchAllData();
    } else {
      setErrorMsg("ভুল পাসওয়ার্ড! আবার লিখুন।");
    }
  };

  // Helper to reliably detect payment method (bKash, Nagad, Rocket) from any field or language
  const resolveDepositMethod = (item) => {
    if (!item) return 'bKash';
    const methodStr = String(item.method || '').toLowerCase();
    if (methodStr.includes('nagad') || methodStr.includes('নগদ')) return 'Nagad';
    if (methodStr.includes('rocket') || methodStr.includes('রকেট')) return 'Rocket';
    if (methodStr.includes('bkash') || methodStr.includes('বিকাশ')) return 'bKash';

    const fullStr = `${item.channel || ''} ${item.channelName || ''} ${item.title || ''} ${item.walletMethod || ''} ${item.desc || ''} ${item.description || ''} ${item.gateway || ''}`.toLowerCase();
    if (fullStr.includes('nagad') || fullStr.includes('নগদ')) return 'Nagad';
    if (fullStr.includes('rocket') || fullStr.includes('রকেট')) return 'Rocket';
    if (fullStr.includes('bkash') || fullStr.includes('বিকাশ')) return 'bKash';

    return item.method || 'bKash';
  };

  // Real-time synchronization for instant deposits, withdrawals, and redeem codes
  // Helper to merge and synchronize deposits from both Firestore and the local server backend
  const mergeAndSyncDeposits = async (firestoreList = []) => {
    const mergedMap = new Map();
    // 1. First add Firestore deposits
    (firestoreList || []).forEach((d) => {
      const k = d.id || d.trxId || d.orderNo;
      if (k) {
        const resMethod = resolveDepositMethod(d);
        mergedMap.set(k, { ...d, method: resMethod });
      }
    });

    // 2. Safely merge server-side deposits if available (non-blocking with timeout and JSON check)
    try {
      const serverRes = await fetch('/api/admin/deposits', {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(2500),
      }).catch(() => null);

      if (serverRes && serverRes.ok) {
        const ct = serverRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const serverData = await serverRes.json();
          if (serverData && serverData.success && Array.isArray(serverData.deposits)) {
            for (const s of serverData.deposits) {
              const key = s.orderId || s.trxId || s.id;
              if (!key) continue;
              const sMethod = resolveDepositMethod(s);
              const existing =
                mergedMap.get(key) ||
                Array.from(mergedMap.values()).find(
                  (m) =>
                    (m.trxId && s.trxId && String(m.trxId).toUpperCase() === String(s.trxId).toUpperCase()) ||
                    (m.orderNo && s.orderId && String(m.orderNo).toUpperCase() === String(s.orderId).toUpperCase()) ||
                    (m.id && s.orderId && String(m.id).toUpperCase() === String(s.orderId).toUpperCase()) ||
                    (m.id && s.trxId && String(m.id).toUpperCase() === String(s.trxId).toUpperCase()) ||
                    (m.orderNo && s.trxId && String(m.orderNo).toUpperCase() === String(s.trxId).toUpperCase()) ||
                    (m.trxId && s.orderId && String(m.trxId).toUpperCase() === String(s.orderId).toUpperCase())
                );
              if (existing) {
                // Authoritatively update existing record with server method (Nagad/bKash), TrxID, and status
                const isNagad = sMethod === 'Nagad' || resolveDepositMethod(existing) === 'Nagad' || String(s.method || '').toLowerCase().includes('nagad') || String(existing.method || '').toLowerCase().includes('nagad');
                const isRocket = !isNagad && (sMethod === 'Rocket' || resolveDepositMethod(existing) === 'Rocket' || String(s.method || '').toLowerCase().includes('rocket'));
                const updatedMethod = isNagad ? 'Nagad' : isRocket ? 'Rocket' : (s.method || existing.method || 'bKash');
                existing.method = updatedMethod;
                if (s.trxId && s.trxId !== s.orderId) {
                  existing.trxId = s.trxId;
                }
                if (s.channelName || s.channel) {
                  existing.channel = isNagad ? 'চ্যানেল ১ (Nagad)' : (s.channelName || s.channel);
                }
                if (s.senderPhone) {
                  existing.senderNumber = s.senderPhone;
                  existing.senderPhone = s.senderPhone;
                }
                if (s.status === 'COMPLETED') {
                  existing.status = 'Approved';
                } else if (s.status === 'REJECTED') {
                  existing.status = 'Rejected';
                } else if (s.status === 'PENDING' && existing.status !== 'Approved') {
                  existing.status = 'Pending';
                }

                // Keep Firestore collection in sync with updated method and TrxID
                try {
                  const docId = existing.id || key;
                  const targetDoc = safeDoc('deposits', docId);
                  if (targetDoc) {
                    safeSetDoc(
                      targetDoc,
                      {
                        method: existing.method,
                        trxId: existing.trxId,
                        channel: existing.channel,
                        status: existing.status,
                        senderNumber: existing.senderNumber || '',
                        updatedAt: serverTimestamp(),
                      },
                      { merge: true }
                    ).catch(() => {});
                  }
                } catch (_) {}
              } else {
                const isNagad = sMethod === 'Nagad' || String(s.method || '').toLowerCase().includes('nagad');
                const isRocket = !isNagad && (sMethod === 'Rocket' || String(s.method || '').toLowerCase().includes('rocket'));
                const formattedItem = {
                  id: key,
                  userId: s.userId || 'USER1001',
                  userName: s.payerName || s.userId || 'Customer',
                  amount: Number(s.amount) || 0,
                  method: isNagad ? 'Nagad' : isRocket ? 'Rocket' : (s.method || 'bKash'),
                  channel: isNagad ? 'চ্যানেল ১ (Nagad)' : (s.channelName || s.channel || 'Nekpay (চ্যানেল ১)'),
                  trxId: s.trxId || key,
                  senderNumber: s.senderPhone || '',
                  senderPhone: s.senderPhone || '',
                  orderNo: s.orderId || key,
                  status: s.status === 'COMPLETED' ? 'Approved' : s.status === 'REJECTED' ? 'Rejected' : 'Pending',
                  createdAt: s.createdAt || new Date().toISOString(),
                };
                mergedMap.set(key, formattedItem);

                // Auto-sync missing deposit into Firestore collection so it stays permanently in database!
                try {
                  const targetDoc = safeDoc('deposits', key);
                  if (targetDoc) {
                    safeSetDoc(
                      targetDoc,
                      {
                        ...formattedItem,
                        serverCreatedAt: serverTimestamp(),
                      },
                      { merge: true }
                    ).catch(() => {});
                  }
                } catch (_) {}
              }
            }
          }
        }
      }
    } catch (_) {}

    const list = Array.from(mergedMap.values());
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return list;
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    let unsubDeposits = () => {};
    let unsubWithdrawals = () => {};
    let unsubCodes = () => {};
    try {
      unsubDeposits = onSnapshot(collection(db, "deposits"), async (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const merged = await mergeAndSyncDeposits(list);
        setDeposits(merged);
      }, (err) => console.warn("Admin deposits listener notice:", err));
    } catch (_) {}

    try {
      unsubWithdrawals = onSnapshot(collection(db, "withdrawals"), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setWithdrawals(list);
      }, (err) => console.warn("Admin withdrawals listener notice:", err));
    } catch (_) {}

    try {
      unsubCodes = onSnapshot(collection(db, "treasure_codes"), (snap) => {
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRedeemCodes(list);
      }, (err) => console.warn("Admin treasure codes listener notice:", err));
    } catch (_) {}

    return () => {
      unsubDeposits();
      unsubWithdrawals();
      unsubCodes();
    };
  }, [isAuthenticated]);

  const fetchAllData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [
        userSnapRes,
        withdrawRes,
        depositRes,
        settingsRes,
        packagesRes,
        ratesRes,
        bannersRes,
        codesRes
      ] = await Promise.allSettled([
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "withdrawals"), orderBy("createdAt", "desc"))).catch(() => getDocs(collection(db, "withdrawals"))),
        getDocs(query(collection(db, "deposits"), orderBy("createdAt", "desc"))).catch(() => getDocs(collection(db, "deposits"))),
        safeDoc("settings", "support") ? getDoc(safeDoc("settings", "support")) : null,
        getLivePackages(),
        loadCommissionRatesFromFirestore(),
        fetch('/api/admin/charity-banners').then(r => r.ok ? r.json() : null).catch(() => null),
        getDocs(collection(db, "treasure_codes")).catch(() => null),
      ]);

      if (userSnapRes.status === 'fulfilled' && userSnapRes.value) {
        const userList = [];
        userSnapRes.value.forEach((docSnap) => {
          userList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setUsers((prevUsers) => {
          const prevMap = new Map();
          (prevUsers || []).forEach((p) => {
            if (p.id) prevMap.set(p.id, p);
            if (p.uid) prevMap.set(p.uid, p);
            if (p.memberId) prevMap.set(p.memberId, p);
          });
          return userList.map((u) => {
            const prevU = prevMap.get(u.id) || prevMap.get(u.uid) || prevMap.get(u.memberId);
            const savedLimitStr =
              (typeof window !== 'undefined' &&
                (localStorage.getItem(`nvt_admin_saved_limit_${u.id}`) ||
                 (u.uid && localStorage.getItem(`nvt_admin_saved_limit_${u.uid}`)) ||
                 (u.memberId && localStorage.getItem(`nvt_admin_saved_limit_${u.memberId}`)))) ||
              null;
            const savedLimit = savedLimitStr !== null && !isNaN(Number(savedLimitStr)) ? Number(savedLimitStr) : null;

            if (savedLimit !== null) {
              return { ...u, referralLimit: savedLimit, canRefer: savedLimit > 0, _locallyEdited: Date.now() };
            }

            if (prevU && prevU.referralLimit !== undefined && prevU.referralLimit !== null) {
              return { ...u, referralLimit: prevU.referralLimit, canRefer: prevU.canRefer ?? u.canRefer, _locallyEdited: prevU._locallyEdited };
            }
            return u;
          });
        });
      }

      if (withdrawRes.status === 'fulfilled' && withdrawRes.value) {
        const withdrawList = [];
        withdrawRes.value.forEach((docSnap) => {
          withdrawList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setWithdrawals(withdrawList);
      }

      if (depositRes.status === 'fulfilled' && depositRes.value) {
        const depositList = [];
        depositRes.value.forEach((docSnap) => {
          depositList.push({ id: docSnap.id, ...docSnap.data() });
        });
        const mergedList = await mergeAndSyncDeposits(depositList);
        setDeposits(mergedList);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value && settingsRes.value.exists()) {
        const data = settingsRes.value.data();
        setSupportLink(data.whatsapp || "");
        setTelegramLink(data.telegram || "");
        if (data.crispWebsiteId) setCrispWebsiteId(data.crispWebsiteId);
        if (data.crispEnabled !== undefined) setCrispEnabled(data.crispEnabled);
        if (data.hotline) setHotline(data.hotline);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
        if (data.manager1Telegram) setManager1Telegram(data.manager1Telegram);
        if (data.manager2Telegram) setManager2Telegram(data.manager2Telegram);
        if (data.manager3Telegram) setManager3Telegram(data.manager3Telegram);
        if (data.manager4Telegram) setManager4Telegram(data.manager4Telegram);
        if (data.renderBackendUrl) setRenderBackendUrl(data.renderBackendUrl);
      }

      if (packagesRes.status === 'fulfilled' && Array.isArray(packagesRes.value)) {
        setPackages(packagesRes.value);
      }

      if (ratesRes.status === 'fulfilled' && ratesRes.value) {
        setTier1Percent(Math.round(ratesRes.value.tier1 * 100));
        setTier2Percent(Math.round(ratesRes.value.tier2 * 100));
        setTier3Percent(Math.round(ratesRes.value.tier3 * 100));
      }

      if (bannersRes.status === 'fulfilled' && bannersRes.value && Array.isArray(bannersRes.value.banners)) {
        setCharityBannersList(bannersRes.value.banners);
        if (typeof window !== 'undefined') {
          localStorage.setItem('nvt_charity_banners', JSON.stringify(bannersRes.value.banners.filter(b => b.isActive !== false)));
        }
      }

      if (codesRes.status === 'fulfilled' && codesRes.value) {
        const cList = [];
        codesRes.value.forEach((d) => {
          cList.push({ id: d.id, ...d.data() });
        });
        
        // Also fetch from server API
        try {
          const srvRes = await fetch('/api/treasure-codes');
          if (srvRes.ok) {
            const srvData = await srvRes.json();
            if (srvData && Array.isArray(srvData.codes)) {
              srvData.codes.forEach((sc) => {
                if (!cList.some((c) => c.code === sc.code || c.id === sc.code)) {
                  cList.push(sc);
                }
              });
            }
          }
        } catch (_) {}

        if (cList.length === 0) {
          const starter = {
            id: 'DAILY12',
            code: 'DAILY12',
            amount: 11,
            minAmount: 10,
            maxAmount: 12,
            isRange: true,
            isActive: true,
            description: 'দৈনিক স্পেশাল লাকি গিফট খাম (১০-১২ টাকা)',
            createdAt: new Date().toISOString(),
          };
          const ref = safeDoc('treasure_codes', 'DAILY12');
          if (ref) safeSetDoc(ref, starter).catch(() => {});
          fetch('/api/treasure-codes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(starter),
          }).catch(() => {});
          cList.push(starter);
        }
        cList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setRedeemCodes(cList);
        if (typeof window !== 'undefined') {
          localStorage.setItem('nvt_admin_redeem_codes', JSON.stringify(cList));
        }
      }
    } catch (error) {
      console.error("ডেটা লোড সমস্যা:", error);
      setStatusMsg("Firestore থেকে ডেটা আনতে সমস্যা হয়েছে।");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // রিডিম কোড সেভ, ডিলিট ও ম্যানেজমেন্ট ফাংশনস
  const generateRandomDailyCode = () => {
    const prefixes = ["DAILY", "NVT", "GIFT", "BONUS", "LUCKY"];
    const pre = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setNewRedeemCodeInput(`${pre}${num}`);
  };

  const handleSaveRedeemCode = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanCode = (newRedeemCodeInput || "").trim().toUpperCase();
    if (!cleanCode) {
      alert("দয়া করে একটি কোড লিখুন (যেমন: DAILY12 বা NVT11)");
      return;
    }

    setIsSavingCode(true);
    setStatusMsg("");
    try {
      const isRange = newRedeemMode === "range_10_12";
      const fixedVal = Number(newRedeemFixedAmount) || 11;
      const codeData = {
        id: cleanCode,
        code: cleanCode,
        amount: isRange ? 11 : fixedVal,
        minAmount: isRange ? 10 : fixedVal,
        maxAmount: isRange ? 12 : fixedVal,
        isRange: isRange,
        isActive: true,
        description: newRedeemDescription.trim() || (isRange ? "দৈনিক স্পেশাল লাকি গিফট খাম (১০-১২ টাকা)" : `রিডিম কোড (৳${fixedVal})`),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 1. Post to Express Server API for persistent multi-device access
      try {
        await fetch('/api/treasure-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(codeData),
        });
      } catch (srvErr) {
        console.warn('[AdminPanel] Server save code notice:', srvErr);
      }

      // 2. Save to Firestore
      const ref = safeDoc("treasure_codes", cleanCode);
      if (ref) {
        await safeSetDoc(ref, codeData, { merge: true });
      }

      // 3. Save to localStorage
      try {
        const rawExisting = localStorage.getItem('nvt_admin_redeem_codes');
        const existing = rawExisting ? JSON.parse(rawExisting) : [];
        const updated = [codeData, ...existing.filter((c) => c.code !== cleanCode && c.id !== cleanCode)];
        localStorage.setItem('nvt_admin_redeem_codes', JSON.stringify(updated));
      } catch (_) {}

      setRedeemCodes((prev) => {
        const without = prev.filter((c) => c.code !== cleanCode && c.id !== cleanCode);
        return [codeData, ...without];
      });

      setNewRedeemCodeInput("");
      setNewRedeemDescription("");
      setStatusMsg(`🎉 রিডিম কোড [${cleanCode}] সফলভাবে সংরক্ষণ করা হয়েছে! ইউজাররা কোড বসালে সুন্দর খাম আকারে ১০-১২ টাকার বোনাস পাবে।`);
    } catch (err) {
      console.error("কোড সেভ এরর:", err);
      setStatusMsg("রিডিম কোড সেভ করতে সমস্যা হয়েছে।");
    } finally {
      setIsSavingCode(false);
    }
  };

  const handleDeleteRedeemCode = async (codeId) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে কোড [${codeId}] মুছে ফেলতে চান?\n\nপ্যানেল থেকে ডিলিট করলে ইউজাররা আর এই কোড দিয়ে বোনাস নিতে পারবে না।`)) {
      return;
    }
    try {
      // 1. Delete on Express server
      try {
        await fetch(`/api/treasure-codes/${encodeURIComponent(codeId)}`, {
          method: 'DELETE',
        });
      } catch (srvErr) {
        console.warn('[AdminPanel] Server delete code notice:', srvErr);
      }

      // 2. Delete on Firestore
      const ref = safeDoc("treasure_codes", codeId);
      if (ref) {
        await deleteDoc(ref);
      }

      // 3. Delete from localStorage
      try {
        const rawExisting = localStorage.getItem('nvt_admin_redeem_codes');
        const existing = rawExisting ? JSON.parse(rawExisting) : [];
        const updated = existing.filter((c) => c.code !== codeId && c.id !== codeId);
        localStorage.setItem('nvt_admin_redeem_codes', JSON.stringify(updated));
      } catch (_) {}

      setRedeemCodes((prev) => prev.filter((c) => c.code !== codeId && c.id !== codeId));
      setStatusMsg(`কোড [${codeId}] সফলভাবে মুছে ফেলা হয়েছে! এখন আর কোনো ইউজার এটি দিয়ে রিডিম করতে পারবে না।`);
    } catch (err) {
      console.error("কোড ডিলিট করতে সমস্যা:", err);
      setStatusMsg("কোড ডিলিট করতে সমস্যা হয়েছে।");
    }
  };

  const handleToggleCodeStatus = async (item) => {
    try {
      const nextStatus = !item.isActive;
      const cleanCode = item.code || item.id;
      
      // Update server
      fetch('/api/treasure-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: nextStatus }),
      }).catch(() => {});

      const ref = safeDoc("treasure_codes", cleanCode);
      if (ref) {
        await safeSetDoc(ref, { isActive: nextStatus }, { merge: true });
      }

      setRedeemCodes((prev) =>
        prev.map((c) =>
          c.code === cleanCode || c.id === cleanCode ? { ...c, isActive: nextStatus } : c
        )
      );
      setStatusMsg(`কোড [${cleanCode}] এখন ${nextStatus ? "চালু (Active)" : "বন্ধ (Inactive)"}!`);
    } catch (err) {
      console.error("কোড স্ট্যাটাস পরিবর্তন এরর:", err);
    }
  };

  const fetchCharityBanners = async () => {
    try {
      const res = await fetch('/api/admin/charity-banners');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.banners)) {
          setCharityBannersList(data.banners);
          if (typeof window !== 'undefined') {
            localStorage.setItem('nvt_charity_banners', JSON.stringify(data.banners.filter(b => b.isActive !== false)));
          }
        }
      }
    } catch (err) {
      console.warn("ব্যানার লোডে সমস্যা:", err);
    }
  };

  const compressImage = (file, maxWidth = 1600, quality = 0.85) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleUploadCharityBanner = async (fileOrUrl, title) => {
    setBannerUploading(true);
    setStatusMsg("");
    try {
      let payload = { title: title || "" };
      if (typeof fileOrUrl === "string" && fileOrUrl.startsWith("http")) {
        payload.url = fileOrUrl;
      } else if (typeof fileOrUrl === "string" && fileOrUrl.startsWith("data:image/")) {
        payload.image = fileOrUrl;
      } else if (fileOrUrl instanceof File) {
        const base64 = await compressImage(fileOrUrl);
        payload.image = base64;
      } else {
        throw new Error("কোনো ছবি সিলেক্ট করা হয়নি");
      }

      const res = await fetch('/api/admin/upload-charity-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "আপলোড ব্যর্থ হয়েছে");
      }

      setStatusMsg("✅ ছবি সফলভাবে আপলোড হয়েছে এবং হোমপেজে যুক্ত হয়েছে!");
      setBannerTitleInput("");
      setBannerUrlInput("");
      setBannerPreviewSrc("");
      setBannerSelectedFile(null);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
      await fetchCharityBanners();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('charity_banners_updated'));
      }
    } catch (err) {
      console.error("ব্যানার আপলোড এরর:", err);
      setStatusMsg("❌ আপলোড ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setBannerUploading(false);
    }
  };

  const handleDeleteCharityBanner = async (bannerId) => {
    if (!window.confirm("আপনি কি নিশ্চিত এই ছবিটি মুছে ফেলতে চান?")) return;
    setStatusMsg("");
    try {
      const res = await fetch(`/api/admin/charity-banner/${bannerId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg("✅ ছবিটি সফলভাবে মুছে ফেলা হয়েছে!");
        await fetchCharityBanners();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('charity_banners_updated'));
        }
      } else {
        throw new Error(data.error || "মুছে ফেলা যায়নি");
      }
    } catch (err) {
      console.error("ব্যানার ডিলিট এরর:", err);
      setStatusMsg("❌ ডিলিট ব্যর্থ: " + err.message);
    }
  };

  const handleClearAllCharityBanners = async () => {
    if (!window.confirm("সতর্কতা: আপনি কি নিশ্চিত সব ছবি ও ব্যানার সম্পূর্ণরূপে রিমুভ করতে চান?")) return;
    setStatusMsg("");
    try {
      const res = await fetch('/api/admin/clear-all-charity-banners', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg("✅ সব ছবি সফলভাবে রিমুভ করা হয়েছে!");
        setCharityBannersList([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('nvt_charity_banners');
          window.dispatchEvent(new Event('charity_banners_updated'));
        }
      }
    } catch (err) {
      console.error("সব ব্যানার ক্লিয়ার এরর:", err);
      setStatusMsg("❌ ক্লিয়ার ব্যর্থ: " + err.message);
    }
  };

  const handleToggleCharityBannerActive = async (bannerId) => {
    try {
      const updated = charityBannersList.map(b => b.id === bannerId ? { ...b, isActive: b.isActive === false ? true : false } : b);
      const res = await fetch('/api/admin/save-charity-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners: updated }),
      });
      if (res.ok) {
        setCharityBannersList(updated);
        if (typeof window !== 'undefined') {
          localStorage.setItem('nvt_charity_banners', JSON.stringify(updated.filter(b => b.isActive !== false)));
          window.dispatchEvent(new Event('charity_banners_updated'));
        }
      }
    } catch (err) {
      console.error("স্ট্যাটাস পরিবর্তন এরর:", err);
    }
  };

  // ইনভেস্ট প্যাকেজ হ্যান্ডলারস
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageFormData({
      id: `plan-${Date.now().toString().slice(-6)}`,
      nameEn: "",
      nameBn: "",
      category: "solar",
      badgeCategoryEn: "Solar Energy",
      badgeCategoryBn: "সোলার এনার্জি",
      badgeIconType: "sun",
      taglineEn: "Stable returns | Clean Energy",
      taglineBn: "স্থির রিটার্ন | ক্লিন এনার্জি",
      image: "/images/apex-helios-solar.jpg",
      minInvestmentBdt: 1200,
      minInvestmentUsd: 10,
      durationDays: 30,
      dailyReturnBdt: 24,
      dailyReturnPercent: 2.0,
      totalReturnPercent: 60,
      requiredVipLevel: 0,
      maxPurchaseLimit: 0,
      isActive: true,
      order: packages.length + 1,
    });
    setIsCreatingNew(true);
  };

  const handleOpenEditPackage = (pkg) => {
    setIsCreatingNew(false);
    setEditingPackage(pkg);
    const bdt = Number(pkg.minInvestmentBdt || pkg.minInvestment || 1200);
    const dailyBdt = Number(pkg.dailyReturnBdt) || Math.round((bdt * Number(pkg.dailyReturnPercent || 2.0)) / 100);
    const daily = Number(pkg.dailyReturnPercent || (bdt > 0 ? Math.round((dailyBdt / bdt) * 1000) / 10 : 2.0));
    const days = Number(pkg.durationDays || 30);
    setPackageFormData({
      id: pkg.id || `plan-${Date.now()}`,
      nameEn: pkg.nameEn || "",
      nameBn: pkg.nameBn || "",
      category: pkg.category || "solar",
      badgeCategoryEn: pkg.badgeCategoryEn || "Solar Energy",
      badgeCategoryBn: pkg.badgeCategoryBn || "সোলার এনার্জি",
      badgeIconType: pkg.badgeIconType || "sun",
      taglineEn: pkg.taglineEn || "",
      taglineBn: pkg.taglineBn || "",
      image: pkg.image || "/images/apex-helios-solar.jpg",
      minInvestmentBdt: bdt,
      minInvestmentUsd: Number(pkg.minInvestmentUsd || Math.round(bdt / 120)),
      durationDays: days,
      dailyReturnBdt: dailyBdt,
      dailyReturnPercent: daily,
      totalReturnPercent: Number(pkg.totalReturnPercent || Math.round((dailyBdt * days / bdt) * 100)),
      requiredVipLevel: Number(pkg.requiredVipLevel || 0),
      maxPurchaseLimit: Number(pkg.maxPurchaseLimit || 0),
      isActive: pkg.isActive !== false,
      order: Number(pkg.order || 1),
    });
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    if (!packageFormData.nameEn.trim()) {
      alert("প্যাকেজের ইংরেজি নাম অবশ্যই দিতে হবে!");
      return;
    }
    setPackageSaving(true);
    try {
      const bdt = Number(packageFormData.minInvestmentBdt) || 1200;
      const days = Number(packageFormData.durationDays) || 30;
      const dailyBdt = Number(packageFormData.dailyReturnBdt) || Math.round((bdt * Number(packageFormData.dailyReturnPercent || 2.0)) / 100);
      const daily = Number(packageFormData.dailyReturnPercent) || (bdt > 0 ? Math.round((dailyBdt / bdt) * 1000) / 10 : 2.0);
      const total = Number(packageFormData.totalReturnPercent) || Math.round((dailyBdt * days / bdt) * 100);

      const pkgToSave = {
        ...packageFormData,
        id: packageFormData.id.trim() || `plan-${Date.now()}`,
        minInvestmentBdt: bdt,
        minInvestment: bdt,
        minInvestmentUsd: Number(packageFormData.minInvestmentUsd) || Math.round(bdt / 120),
        durationDays: days,
        dailyReturnBdt: dailyBdt,
        dailyReturnPercent: daily,
        totalReturnPercent: total,
        requiredVipLevel: Number(packageFormData.requiredVipLevel) || 0,
        maxPurchaseLimit: Number(packageFormData.maxPurchaseLimit) || 0,
        isActive: packageFormData.isActive !== false,
      };

      const success = await updatePackageInFirestore(pkgToSave);
      if (success) {
        setStatusMsg("✅ ইনভেস্ট প্যাকেজ সফলভাবে সেভ ও লাইভ আপডেট হয়েছে!");
        setIsCreatingNew(false);
        setEditingPackage(null);
        const updated = await getLivePackages();
        setPackages(updated);
      } else {
        setStatusMsg("❌ প্যাকেজ সেভ করা যায়নি।");
      }
    } catch (err) {
      console.error("প্যাকেজ সেভ এরর:", err);
      setStatusMsg("❌ সমস্যা: " + err.message);
    }
    setPackageSaving(false);
  };

  const handleDeletePackage = async (pkgId, pkgName) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${pkgName}" প্যাকেজটি স্থায়ীভাবে মুছে ফেলতে চান?`)) return;
    try {
      const ok = await deletePackageFromFirestore(pkgId);
      if (ok) {
        setStatusMsg("✅ ইনভেস্ট প্যাকেজ সফলভাবে মুছে ফেলা হয়েছে!");
        const updated = await getLivePackages();
        setPackages(updated);
      } else {
        setStatusMsg("❌ প্যাকেজ মুছতে ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      setStatusMsg("❌ এরর: " + err.message);
    }
  };

  const handleResetPackages = async () => {
    if (!window.confirm("ডিফল্ট ৬টি ইনভেস্টমেন্ট প্যাকেজ রিস্টোর করতে চান? এটি পূর্বের কাস্টম প্যাকেজগুলোর উপর মূল ৬টি প্ল্যান লোড করবে।")) return;
    try {
      await resetPackagesToDefault();
      const updated = await getLivePackages();
      setPackages(updated);
      setStatusMsg("✅ ডিফল্ট ৬টি ইনভেস্ট প্যাকেজ সফলভাবে রিস্টোর হয়েছে!");
    } catch (err) {
      setStatusMsg("❌ রিস্টোর এরর: " + err.message);
    }
  };

  const handleTogglePackageStatus = async (pkg) => {
    try {
      const updated = { ...pkg, isActive: !pkg.isActive };
      await updatePackageInFirestore(updated);
      const list = await getLivePackages();
      setPackages(list);
      setStatusMsg(`প্যাকেজ "${pkg.nameEn}" এখন ${updated.isActive ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}`);
    } catch (err) {
      setStatusMsg("❌ স্ট্যাটাস পরিবর্তন এরর: " + err.message);
    }
  };

  const handleSaveSupport = async (e) => {
    e.preventDefault();
    try {
      const supportData = sanitizeFirestoreData({
        whatsapp: (supportLink || "").trim(),
        telegram: (telegramLink || "").trim(),
        crispWebsiteId: (crispWebsiteId || "").trim(),
        crispEnabled: Boolean(crispEnabled),
        hotline: (hotline || "").trim(),
        supportEmail: (supportEmail || "").trim(),
        manager1Telegram: (manager1Telegram || "").trim(),
        manager2Telegram: (manager2Telegram || "").trim(),
        manager3Telegram: (manager3Telegram || "").trim(),
        manager4Telegram: (manager4Telegram || "").trim(),
        renderBackendUrl: (renderBackendUrl || "").trim(),
        updatedAt: new Date().toISOString()
      });
      const supportRef = safeDoc("settings", "support");
      if (supportRef) await safeSetDoc(supportRef, supportData, { merge: true });

      setStatusMsg("✅ কাস্টমার সাপোর্ট ও Crisp সেটিংস সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      console.error("সাপোর্ট সেভ এরর:", error);
      setStatusMsg("❌ সেটিংস সেভ করা যায়নি।");
    }
  };

  const handleSaveReferralSettings = async (e) => {
    e.preventDefault();
    setReferralSaving(true);
    try {
      const t1 = Number(tier1Percent) || 0;
      const t2 = Number(tier2Percent) || 0;
      const t3 = Number(tier3Percent) || 0;
      await saveCommissionRatesToFirestore(t1, t2, t3);
      setStatusMsg(`✅ রেফারেল বোনাস কমিশন রেট সফলভাবে আপডেট করা হয়েছে! (লেভেল ১: ${t1}%, লেভেল ২: ${t2}%, লেভেল ৩: ${t3}%)`);
    } catch (error) {
      console.error("রেফারেল সেটিংস সেভ এরর:", error);
      setStatusMsg("❌ রেফারেল বোনাস রেট সেভ করা যায়নি: " + error.message);
    } finally {
      setReferralSaving(false);
    }
  };

  const handleWithdrawAction = async (withdrawId, userId, amount, action) => {
    const cleanWId = cleanDocId(withdrawId, '');
    if (!cleanWId) return;
    try {
      const isApprove = action === "approve";
      const targetUser = users.find(
        (u) =>
          u.id === userId ||
          u.uid === userId ||
          u.memberId === userId ||
          (u.phone && String(u.phone).slice(-10) === String(userId).slice(-10))
      );
      const targetUserId = targetUser?.id || targetUser?.uid || userId;

      // Immediately update local state for instantaneous UI feedback
      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === cleanWId
            ? {
                ...w,
                status: isApprove ? "Approved" : "Rejected",
                statusBangla: isApprove ? "এপ্রুভ" : "বাতিল",
              }
            : w
        )
      );

      // Instant cross-tab broadcast for 0ms website sync
      try {
        const payload = {
          withdrawId: cleanWId,
          userId: targetUserId,
          amount: Number(amount) || 0,
          status: isApprove ? "Approved" : "Rejected",
          statusBangla: isApprove ? "এপ্রুভ" : "বাতিল",
          timestamp: Date.now(),
        };
        localStorage.setItem(`nvt_withdrawal_status_${cleanWId}`, isApprove ? "Approved" : "Rejected");
        localStorage.setItem('nvt_last_withdrawal_action', JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('nvt_withdrawal_action', { detail: payload }));
      } catch (_) {}

      await updateFirestoreWithdrawalStatus(
        targetUserId,
        cleanWId,
        isApprove ? "Approved" : "Rejected",
        Number(amount) || 0
      );

      // Server disk backup sync
      try {
        await fetch('/api/admin/withdrawal-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            withdrawId: cleanWId,
            userId: targetUserId,
            status: isApprove ? "Approved" : "Rejected",
            amount: Number(amount) || 0,
          }),
        }).catch(() => {});
      } catch (_) {}

      setStatusMsg(
        isApprove
          ? "✅ উইথড্র সফলভাবে এপ্রুভ করা হয়েছে! ইউজার হিস্ট্রিতে এটি 'এপ্রুভ' হিসেবে দেখাবে।"
          : "❌ উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ব্যবহারকারীর ওয়ালেটে ফেরত দেওয়া হয়েছে।"
      );
      fetchAllData(true);
    } catch (error) {
      console.error("উইথড্র আপডেট এরর:", error);
      setStatusMsg("উইথড্র স্ট্যাটাস পরিবর্তন করা যায়নি: " + error.message);
    }
  };

  const handleDepositAction = async (depositId, userId, amount, action, trxId) => {
    const cleanDId = cleanDocId(depositId, '');
    if (!cleanDId) return;
    const isApprove = action === "approve";
    const newStatus = isApprove ? "Approved" : "Rejected";
    const numAmount = Number(amount) || 0;

    // 1. Instant optimistic local UI update (zero latency)
    setDeposits((prev) =>
      prev.map((d) =>
        d.id === depositId || d.id === cleanDId || (d.trxId && d.trxId === (trxId || cleanDId))
          ? {
              ...d,
              status: newStatus,
            }
          : d
      )
    );

    try {
      // 2. Update status in global deposits collection
      const depositRef = safeDoc("deposits", cleanDId);
      if (depositRef) {
        await safeSetDoc(depositRef, {
          status: newStatus,
          isApproved: isApprove,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      // 3. Resolve target user document by multiple matching strategies
      const cleanUId = cleanDocId(userId, '');
      const targetUser = users.find(
        (u) =>
          u.id === cleanUId ||
          u.uid === cleanUId ||
          (u.memberId && String(u.memberId).toLowerCase() === String(cleanUId).toLowerCase()) ||
          (u.phone && String(u.phone).slice(-10) === String(cleanUId).slice(-10))
      );
      const effectiveDocId = targetUser?.id || targetUser?.uid || cleanUId;

      if (effectiveDocId) {
        // Update user deposit transaction record & user document balance
        await updateFirestoreDepositStatus(
          effectiveDocId,
          trxId || cleanDId,
          isApprove ? "completed" : "cancelled",
          numAmount,
          cleanDId
        );

        if (isApprove && numAmount > 0) {
          try {
            // Direct atomic credit to ensure balance reflects 100% on the user's profile
            const targetUserDoc = safeDoc("users", effectiveDocId);
            if (targetUserDoc) {
              await safeSetDoc(targetUserDoc, {
                walletBalance: increment(numAmount),
                balance: increment(numAmount),
                hasDeposited: true,
                totalDeposited: increment(numAmount),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }

            // Also update in user's deposits subcollection
            const uDep = safeDoc("users", effectiveDocId, "deposits", cleanDId);
            if (uDep) {
              await safeSetDoc(uDep, {
                status: "Approved",
                isApproved: true,
                updatedAt: new Date().toISOString(),
              }, { merge: true });
            }
          } catch (commErr) {
            console.warn("User deposit update notice:", commErr);
          }
        }
      }

      // 4. Notify open client tabs via custom event & localStorage for 0ms cross-tab reflection
      try {
        const payload = {
          depositId: cleanDId,
          userId: effectiveDocId,
          amount: numAmount,
          status: newStatus,
          trxId: trxId || cleanDId,
          timestamp: Date.now(),
        };
        localStorage.setItem('nvt_last_deposit_approval', JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent('nvt_deposit_approved', { detail: payload }));
      } catch (_) {}

      // 5. Server sync / webhook callback
      try {
        await fetch('/api/admin/deposit-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositId: cleanDId,
            action,
            amount: numAmount,
            userId: effectiveDocId || userId,
          }),
        }).catch(() => {});

        if (isApprove) {
          await fetch('/api/payments/gateway-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNo: depositId,
              trxId: trxId || depositId,
              amount: numAmount,
              status: 'COMPLETED',
            }),
          });
        } else {
          await fetch('/api/payments/cancel-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNo: depositId,
              trxId: trxId || depositId,
            }),
          });
        }
      } catch (srvErr) {
        console.warn('Server sync notice:', srvErr);
      }

      if (isApprove) {
        setStatusMsg(`✅ ডিপোজিট (৳${numAmount.toLocaleString()}) সফলভাবে অনুমোদন করা হয়েছে এবং ইউজারের একাউন্টে ব্যালেন্স যোগ হয়েছে!`);
      } else {
        setStatusMsg("❌ ভুয়া/ভুল ডিপোজিট বাতিল (Reject) করা হয়েছে এবং ট্রানজেকশনে 'বাতিল' স্ট্যাটাস সেট হয়েছে।");
      }
      fetchAllData(true);
    } catch (error) {
      console.error("ডিপোজিট আপডেট এরর:", error);
      setStatusMsg("ডিপোজিট স্ট্যাটাস পরিবর্তন করা যায়নি: " + error.message);
    }
  };

  const handleUpdateAmount = async (e) => {
    e.preventDefault();
    if (!selectedUser || newAmount === "") {
      alert("ইউজার সিলেক্ট করুন এবং অ্যামাউন্ট দিন!");
      return;
    }

    try {
      const cleanUId = cleanDocId(selectedUser, '');
      if (!cleanUId) return;
      const userDocRef = safeDoc("users", cleanUId);
      const safeAmount = Number(newAmount) || 0;
      if (userDocRef) {
        await safeSetDoc(userDocRef, {
          walletBalance: safeAmount,
          balance: safeAmount,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }

      setStatusMsg("✅ সফলভাবে ইউজারের ব্যালেন্স আপডেট হয়েছে!");
      setNewAmount("");
      fetchAllData();
    } catch (error) {
      console.error("আপডেট এরর:", error);
      setStatusMsg("❌ অ্যামাউন্ট আপডেট করা যায়নি।");
    }
  };

  // ইউজার আইডি কপি করার ফাংশন
  const handleCopyId = (id) => {
    if (!id) return;
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(id).catch(() => {});
      }
    } catch (_) {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 2500);
  };

  // ইউজার আইডি ও ডাটাবেজ থেকে অ্যাকাউন্ট রিমুভ করার হ্যান্ডলার
  const handleDeleteUser = async (targetUserId, targetUserName = "", extraUserObj = null) => {
    const cleanId = cleanDocId(targetUserId, "");
    if (!cleanId) {
      alert("দয়া করে সঠিক ইউজার আইডি দিন!");
      return;
    }

    const displayName = targetUserName ? `"${targetUserName}" (ID: ${cleanId})` : `ID: "${cleanId}"`;
    const confirmed = window.confirm(
      `⚠️ সতর্কতা!\n\nআপনি কি নিশ্চিতভাবে ইউজার ${displayName}-কে সিস্টেম থেকে রিমুভ (মুছে ফেলতে) চান?\n\nইউজারের একাউন্ট, সাব-কালেকশন, ফোন রেজিস্ট্রি ও রেফারেল ডেটা সম্পূর্ণভাবে ফায়ারবেস থেকে স্থায়ীভাবে মুছে যাবে। এই কাজটি আর পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়!`
    );

    if (!confirmed) return;

    setDeletingUserId(cleanId);
    setStatusMsg("");

    try {
      const extraDetails = {
        phone: extraUserObj?.phone,
        email: extraUserObj?.email,
        memberId: extraUserObj?.memberId,
        referralCode: extraUserObj?.referralCode,
      };

      // ১. Firestore থেকে ইউজার প্রোফাইল, সমস্ত সাব-কালেকশন, ফোন ইনডেক্স ও সংশ্লিষ্ট রেফারেল নোড ডিলিট
      await deleteFirestoreUserProfile(cleanId, extraDetails);

      // ২. সরাসরি fallback হিসেবে users doc ডিলিট কল
      const userRef = safeDoc("users", cleanId);
      if (userRef) {
        await safeDeleteDoc(userRef);
      }

      // ৩. স্টেট থেকে ইউজারটি অবিলম্বে রিমুভ
      setUsers((prev) => prev.filter((u) => u.id !== cleanId && u.uid !== cleanId && u.memberId !== cleanId));

      // ৪. লোকাল স্টোরেজ ক্যাশ থেকে মুছে ফেলা (যদি থাকে)
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const raw = localStorage.getItem("novavest_registered_accounts");
          if (raw) {
            const accs = JSON.parse(raw);
            let updated = false;
            for (const key of Object.keys(accs)) {
              if (
                accs[key]?.userId === cleanId ||
                accs[key]?.id === cleanId ||
                (extraUserObj?.memberId && accs[key]?.memberId === extraUserObj.memberId) ||
                (extraUserObj?.phone && accs[key]?.phone === extraUserObj.phone)
              ) {
                delete accs[key];
                updated = true;
              }
            }
            if (updated) {
              localStorage.setItem("novavest_registered_accounts", JSON.stringify(accs));
            }
          }
        } catch (e) {
          console.warn("Storage cleanup notice:", e);
        }
      }

      setStatusMsg(`✅ ইউজার ${displayName} সফলভাবে ফায়ারবেস ও ডাটাবেজ থেকে স্থায়ীভাবে রিমুভ (মুছে ফেলা) হয়েছে!`);
      setManualUserIdToDelete("");
    } catch (err) {
      console.error("ইউজার রিমুভ এরর:", err);
      setStatusMsg(`❌ ইউজার মুছে ফেলতে সমস্যা হয়েছে: ${err?.message || "ত্রুটি"}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  // ফায়ারবেস ও ডাটাবেজের সকল অ্যাকাউন্ট ও রেফারেল ডাটা সম্পূর্ণ রিমুভ করার হ্যান্ডলার
  const handlePurgeAllAccounts = async () => {
    const confirm1 = window.confirm(
      "⚠️ সতর্কবার্তা!\n\nআপনি কি নিশ্চিতভাবে ফায়ারবেস ও ডাটাবেজের সকল ইউজার অ্যাকাউন্ট, রেফারেল কোড ও ট্রানজেকশন সম্পূর্ণ মুছে ফেলতে চান?"
    );
    if (!confirm1) return;

    const confirm2 = window.prompt("নিশ্চিত করতে নিচের বক্সে হুবহু 'DELETE ALL' টাইপ করুন:");
    if (confirm2 !== "DELETE ALL") {
      alert("সঠিকভাবে কনফার্ম করেননি। অপারেশন বাতিল করা হয়েছে।");
      return;
    }

    setStatusMsg("ফায়ারবেস থেকে সকল একাউন্ট ও রেফারেল ডেটা রিমুভ করা হচ্ছে...");
    try {
      await fetch('/api/admin/purge-all-accounts', { method: 'POST' }).catch(() => {});

      const collectionsToPurge = [
        "users",
        "registered_phones",
        "phone_index",
        "referral_nodes",
        "referrals",
        "registered_accounts",
        "deposits",
        "transactions",
        "withdrawals",
        "investments",
        "promo_claims",
        "deleted_accounts"
      ];

      for (const col of collectionsToPurge) {
        try {
          const snap = await getDocs(collection(db, col));
          for (const d of snap.docs) {
            await deleteDoc(doc(db, col, d.id));
          }
        } catch (_) {}
      }

      // If active auth user exists, permanently delete from Firebase Auth
      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
        }
      } catch (_) {}
      try {
        await signOut(auth);
      } catch (_) {}

      try {
        localStorage.removeItem("novavest_registered_accounts");
        localStorage.removeItem("novaterra_referral_accounts_v3");
        localStorage.removeItem("novavest_user");
        localStorage.removeItem("nvt_user");
        localStorage.removeItem("nvt_auth_user");
        localStorage.removeItem("auth_user");
      } catch (_) {}

      setUsers([]);
      setStatusMsg("✅ ফায়ারবেসের সকল ইউজার একাউন্ট ও রেফারেল কোড সফলভাবে সম্পূর্ণ রিমুভ করা হয়েছে!");
      fetchAllData();
    } catch (err) {
      console.error("Purge error:", err);
      setStatusMsg(`❌ রিমুভ করতে ত্রুটি: ${err?.message || "ব্যর্থ"}`);
    }
  };

  // রেফার করার পারমিশন টগল ও লিমিট সেট করার হ্যান্ডলার
  const handleToggleReferralPermission = async (userId, currentStatus, currentLimit = 10) => {
    const cleanId = cleanDocId(userId, "");
    if (!cleanId) return;
    try {
      const newStatus = !currentStatus;
      const targetUser = users.find(
        (u) =>
          u.id === cleanId ||
          u.uid === cleanId ||
          u.memberId === cleanId ||
          (u.phone && String(u.phone).slice(-10) === String(cleanId).slice(-10))
      );
      const effectiveLimit = newStatus ? (Number(currentLimit) > 0 ? Number(currentLimit) : 10) : 0;

      // Instant optimistic update
      const now = Date.now();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === cleanId || u.uid === cleanId || u.memberId === cleanId || (targetUser && (u.id === targetUser.id || u.uid === targetUser.uid || u.memberId === targetUser.memberId))
            ? { ...u, canRefer: newStatus, referralLimit: effectiveLimit, _locallyEdited: now }
            : u
        )
      );

      await updateFirestoreReferralPermission(
        cleanId,
        targetUser,
        newStatus,
        effectiveLimit
      );

      // Also sync to server persistent storage
      try {
        await fetch('/api/admin/update-referral-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: cleanId,
            uid: targetUser?.uid || cleanId,
            memberId: targetUser?.memberId,
            phone: targetUser?.phone,
            referralCode: targetUser?.referralCode,
            canRefer: newStatus,
            referralLimit: effectiveLimit,
          }),
        });
      } catch (_) {}

      setStatusMsg(
        newStatus
          ? `✅ ইউজার "${cleanId}" কে সফলভাবে রেফার করার অনুমতি প্রদান করা হয়েছে (লিমিট: ${effectiveLimit} জন)!`
          : `🛑 ইউজার "${cleanId}" এর রেফার করার অনুমতি বাতিল করা হয়েছে!`
      );
    } catch (err) {
      console.error("Referral permission update error:", err);
      setStatusMsg("⚠️ রেফার পারমিশন পরিবর্তন করতে সমস্যা হয়েছে।");
    }
  };

  const handleUpdateReferralLimit = async (userId, newLimit) => {
    const cleanId = cleanDocId(userId, "");
    if (!cleanId) return;
    const numLimit = Math.max(0, parseInt(newLimit, 10) || 0);
    try {
      const targetUser = users.find(
        (u) =>
          u.id === cleanId ||
          u.uid === cleanId ||
          u.memberId === cleanId ||
          (u.phone && String(u.phone).slice(-10) === String(cleanId).slice(-10))
      );

      // Instant optimistic state update
      const now = Date.now();
      try {
        localStorage.setItem(`nvt_admin_saved_limit_${cleanId}`, String(numLimit));
        if (targetUser?.uid) localStorage.setItem(`nvt_admin_saved_limit_${targetUser.uid}`, String(numLimit));
        if (targetUser?.memberId) localStorage.setItem(`nvt_admin_saved_limit_${targetUser.memberId}`, String(numLimit));
        if (targetUser?.phone) localStorage.setItem(`nvt_admin_saved_limit_${targetUser.phone}`, String(numLimit));
      } catch (_) {}

      setUsers((prev) =>
        prev.map((u) =>
          u.id === cleanId || u.uid === cleanId || u.memberId === cleanId || (targetUser && (u.id === targetUser.id || u.uid === targetUser.uid || u.memberId === targetUser.memberId))
            ? { ...u, referralLimit: numLimit, canRefer: numLimit > 0, _locallyEdited: now }
            : u
        )
      );

      await updateFirestoreReferralPermission(
        cleanId,
        targetUser,
        numLimit > 0,
        numLimit
      );

      // Also sync to server persistent storage
      try {
        await fetch('/api/admin/update-referral-permission', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: cleanId,
            uid: targetUser?.uid || cleanId,
            memberId: targetUser?.memberId,
            phone: targetUser?.phone,
            referralCode: targetUser?.referralCode,
            canRefer: numLimit > 0,
            referralLimit: numLimit,
          }),
        });
      } catch (_) {}

      setStatusMsg(`✅ ইউজার "${cleanId}" এর রেফার লিমিট ${numLimit} জন সফলভাবে সংরক্ষণ করা হয়েছে!`);
    } catch (err) {
      console.error("Referral limit update error:", err);
      setStatusMsg("⚠️ রেফার লিমিট পরিবর্তন করতে সমস্যা হয়েছে।");
    }
  };

  // ইউজার ফিল্টার বা সার্চ করার জন্য লজিক
  const filteredUsers = users.filter((u) => {
    // ১. ট্যাব ফিল্টারিং
    const isUserActive = (Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) || Number(u.totalInvested || 0) > 0;
    if (userFilterTab === "active" && !isUserActive) return false;
    if (userFilterTab === "free" && isUserActive) return false;
    if (userFilterTab === "referral" && !u.canRefer) return false;

    // ২. সার্চ ফিল্টারিং
    if (!userSearchQuery.trim()) return true;
    const queryStr = userSearchQuery.toLowerCase().trim();
    const name = (u.name || "").toLowerCase();
    const phone = (u.phone || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const id = (u.id || "").toLowerCase();
    const memberId = (u.memberId || "").toLowerCase();
    const refCode = (u.referralCode || "").toLowerCase();
    return (
      name.includes(queryStr) ||
      phone.includes(queryStr) ||
      email.includes(queryStr) ||
      id.includes(queryStr) ||
      memberId.includes(queryStr) ||
      refCode.includes(queryStr)
    );
  });

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#0b0f19", color: "#fff" }}>
        <div style={{ background: "#161d2f", padding: "30px", borderRadius: "12px", border: "1px solid #2e3856", width: "100%", maxWidth: "360px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="পাসওয়ার্ড দিন"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ width: "100%", padding: "12px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", marginBottom: "12px" }}
              required
            />
            {errorMsg && <p style={{ color: "#ff5252", fontSize: "14px", margin: "0 0 10px 0" }}>{errorMsg}</p>}
            <button type="submit" style={{ width: "100%", padding: "12px", backgroundColor: "#00d2ff", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>লগইন</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", color: "#fff", minHeight: "100vh", backgroundColor: "#0b0f19" }}>
      {/* Header Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2e3856", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2>⚙️ Admin Control Panel</h2>
        <button
          onClick={() => {
            try {
              localStorage.removeItem("nvt_admin_authenticated");
              sessionStorage.removeItem("nvt_admin_authenticated");
            } catch (_) {}
            setIsAuthenticated(false);
          }}
          style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
        >
          লগআউট
        </button>
      </div>

      {statusMsg && <p style={{ padding: "10px", background: "#1b4332", color: "#d8f3dc", borderRadius: "6px", border: "1px solid #2d6a4f", marginBottom: "20px" }}>{statusMsg}</p>}

      {/* Menu / Tabs Navigation */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <button onClick={() => setActiveTab("deposits")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "deposits" ? "#00d2ff" : "#161d2f", color: activeTab === "deposits" ? "#000" : "#fff" }}>📥 ডিপোজিট ({deposits.filter(d => !d.status || d.status === "Pending").length})</button>
        <button onClick={() => setActiveTab("withdrawals")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "withdrawals" ? "#00d2ff" : "#161d2f", color: activeTab === "withdrawals" ? "#000" : "#fff" }}>💸 উইথড্র ({withdrawals.filter(w => !w.status || w.status === "Pending").length})</button>
        <button onClick={() => setActiveTab("investments")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "investments" ? "#00d2ff" : "#161d2f", color: activeTab === "investments" ? "#000" : "#fff" }}>⚡ ইনভেস্ট প্যাকেজ ({packages.length})</button>
        <button onClick={() => setActiveTab("balance")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "balance" ? "#00d2ff" : "#161d2f", color: activeTab === "balance" ? "#000" : "#fff" }}>💰 ব্যালেন্স কন্ট্রোল</button>
        <button onClick={() => setActiveTab("support")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "support" ? "#00d2ff" : "#161d2f", color: activeTab === "support" ? "#000" : "#fff" }}>📢 সাপোর্ট লিংক</button>
        <button onClick={() => setActiveTab("referral")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "referral" ? "#00d2ff" : "#161d2f", color: activeTab === "referral" ? "#000" : "#fff" }}>🎁 রেফার বোনাস সেটাপ</button>
        <button onClick={() => setActiveTab("users")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "users" ? "#00d2ff" : "#161d2f", color: activeTab === "users" ? "#000" : "#fff" }}>👥 ইউজার ও নেটওয়ার্ক ({users.length})</button>
        <button onClick={() => setActiveTab("banners")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "banners" ? "#00e676" : "#161d2f", color: activeTab === "banners" ? "#000" : "#fff" }}>🖼️ ছবি ও ব্যানার আপলোড ({charityBannersList.length})</button>
        <button onClick={() => setActiveTab("redeemCodes")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "redeemCodes" ? "#f59e0b" : "#161d2f", color: activeTab === "redeemCodes" ? "#000" : "#fff" }}>🎟️ রিডিম কোড ({redeemCodes.length})</button>
      </div>

      {/* Tab Content Area */}
      <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856" }}>
        
        {/* ১. ডিপোজিট ট্যাব */}
        {activeTab === "deposits" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3>📥 Deposit Requests</h3>
              <button onClick={fetchAllData} style={{ padding: "6px 12px", backgroundColor: "#2e3856", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>🔄 রিফ্রেশ</button>
            </div>
            {loading ? <p>লোড হচ্ছে...</p> : deposits.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>কোনো ডিপোজিট রিকোয়েস্ট নেই।</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2e3856", color: "#94a3b8" }}>
                      <th style={{ padding: "10px" }}>ইউজার / নাম</th>
                      <th style={{ padding: "10px" }}>মেথড / নম্বর</th>
                      <th style={{ padding: "10px" }}>ট্রানজাকশন আইডি (TrxID)</th>
                      <th style={{ padding: "10px" }}>অ্যামাউন্ট</th>
                      <th style={{ padding: "10px" }}>স্ট্যাটাস</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d) => {
                      const itemMethod = resolveDepositMethod(d);
                      const isNagad = itemMethod === 'Nagad';
                      const isRocket = itemMethod === 'Rocket';
                      const displayChannel =
                        String(d.channel || '').toLowerCase().includes('nekpay') || !d.channel
                          ? (isNagad ? "চ্যানেল ১ (Nagad)" : isRocket ? "চ্যানেল ১ (Rocket)" : "চ্যানেল ১ (bKash)")
                          : d.channel;

                      return (
                        <tr key={d.id || d.orderNo || d.trxId} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ padding: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#fff" }}>{d.userName || d.name || d.email || "Customer"}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>ID: {d.userId || d.id}</div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "3px" }}>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const nextMethod = isNagad ? 'bKash' : 'Nagad';
                                  const nextChannel = nextMethod === 'Nagad' ? 'চ্যানেল ১ (Nagad)' : 'চ্যানেল ১ (bKash)';
                                  setDeposits((prev) =>
                                    prev.map((item) =>
                                      (item.id === d.id || (item.orderNo && item.orderNo === d.orderNo))
                                        ? { ...item, method: nextMethod, channel: nextChannel }
                                        : item
                                    )
                                  );
                                  try {
                                    const tDoc = safeDoc('deposits', d.id);
                                    if (tDoc) {
                                      safeSetDoc(tDoc, { method: nextMethod, channel: nextChannel, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
                                    }
                                    fetch('/api/payments/update-method', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ orderNo: d.orderNo || d.id || d.trxId, method: nextMethod })
                                    }).catch(() => {});
                                  } catch (_) {}
                                }}
                                title="ক্লিক করে বিকাশ/নগদ পরিবর্তন করুন"
                                style={{
                                  padding: "3px 9px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  border: "none",
                                  cursor: "pointer",
                                  background: isNagad ? "#f7941d" : isRocket ? "#8c3494" : "#e2136e",
                                  color: isNagad ? "#000" : "#fff",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                }}
                              >
                                {isNagad ? 'Nagad (নগদ)' : isRocket ? 'Rocket (রকেট)' : 'bKash (বিকাশ)'}
                              </button>
                              <span style={{ fontSize: "11px", color: "#6ee7b7", background: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: "3px" }}>
                                {displayChannel}
                              </span>
                            </div>
                            <div style={{ fontSize: "12px", color: "#cbd5e1" }}>{d.senderNumber || d.senderPhone || d.phone || "N/A"}</div>
                          </td>
                        <td style={{ padding: "10px", fontFamily: "monospace", color: "#38bdf8", fontWeight: "bold" }}>
                          <div>{d.trxId || d.transactionId || d.orderNo || "N/A"}</div>
                          {d.orderNo && d.trxId && d.orderNo !== d.trxId && (
                            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "normal" }}>অর্ডার: {d.orderNo}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px", color: "#22c55e", fontWeight: "900", fontSize: "15px" }}>
                          ৳ {d.amount || 0}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              background:
                                d.status === "Approved" || d.status === "COMPLETED" || d.status === "completed" || String(d.status).toLowerCase() === "approved"
                                  ? "#14532d"
                                  : d.status === "Rejected" || d.status === "failed" || String(d.status).toLowerCase() === "rejected"
                                  ? "#7f1d1d"
                                  : "#713f12",
                              color:
                                d.status === "Approved" || d.status === "COMPLETED" || d.status === "completed" || String(d.status).toLowerCase() === "approved"
                                  ? "#4ade80"
                                  : d.status === "Rejected" || d.status === "failed" || String(d.status).toLowerCase() === "rejected"
                                  ? "#f87171"
                                  : "#fde047",
                            }}
                          >
                            {d.status === "Approved" || d.status === "COMPLETED" || d.status === "completed"
                              ? "✅ Approved"
                              : d.status === "Rejected" || d.status === "failed"
                              ? "❌ Rejected"
                              : "⏳ Pending"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          {(!d.status || d.status === "Pending" || d.status?.toLowerCase() === "pending") ? (
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <button onClick={() => handleDepositAction(d.id, d.userId, d.amount, "approve", d.trxId || d.transactionId || d.id)} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Approve</button>
                              <button onClick={() => handleDepositAction(d.id, d.userId, d.amount, "reject", d.trxId || d.transactionId || d.id)} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Reject</button>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>সম্পন্ন</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ২. উইথড্রল ট্যাব */}
        {activeTab === "withdrawals" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <h3>💸 Withdrawal Requests</h3>
              <button onClick={fetchAllData} style={{ padding: "6px 12px", backgroundColor: "#2e3856", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>🔄 রিফ্রেশ</button>
            </div>
            {loading ? <p>লোড হচ্ছে...</p> : withdrawals.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>কোনো উইথড্র রিকোয়েস্ট নেই।</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2e3856", color: "#94a3b8" }}>
                      <th style={{ padding: "10px" }}>ইউজার নাম / আইডি</th>
                      <th style={{ padding: "10px" }}>মেথড & অ্যাকাউন্ট</th>
                      <th style={{ padding: "10px" }}>অ্যামাউন্ট</th>
                      <th style={{ padding: "10px" }}>2FA অথেনটিকেশন</th>
                      <th style={{ padding: "10px" }}>স্ট্যাটাস</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: "bold", color: "#fff" }}>{w.userName || w.accountName || w.name || "N/A"}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>{w.userId || w.id}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: "4px", background: "#1e293b", color: "#38bdf8", fontSize: "11px", marginRight: "6px" }}>
                            {w.method || w.walletMethod || "bKash"}
                          </span>
                          <span style={{ fontWeight: "bold", color: "#e2e8f0" }}>
                            {w.accountNumber || w.walletNumber || w.mobile || w.phone || "N/A"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", color: "#22c55e", fontWeight: "bold" }}>৳ {w.amount || 0}</td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: "4px", fontSize: "11px", background: "#064e3b", color: "#34d399", border: "1px solid #059669" }}>
                            🔒 {w.authCode ? "যাচাইকৃত (Verified)" : "নিরাপদ"}
                          </span>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            background: w.status === "Approved" ? "#14532d" : w.status === "Rejected" ? "#7f1d1d" : "#713f12",
                            color: w.status === "Approved" ? "#4ade80" : w.status === "Rejected" ? "#f87171" : "#facc15"
                          }}>
                            {w.status === "Approved" ? "এপ্রুভ (Approved)" : w.status === "Rejected" ? "বাতিল (Rejected)" : "অপেক্ষমাণ (Pending)"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          {(!w.status || w.status === "Pending") ? (
                            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                              <button onClick={() => handleWithdrawAction(w.id, w.userId, w.amount, "approve")} style={{ background: "#22c55e", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Approve</button>
                              <button onClick={() => handleWithdrawAction(w.id, w.userId, w.amount, "reject")} style={{ background: "#dc3545", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Reject</button>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "12px" }}>সম্পন্ন</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ৩. ইনভেস্ট প্যাকেজ ম্যানেজমেন্ট ট্যাব */}
        {activeTab === "investments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "15px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#00d2ff" }}>⚡ Investment Packages Control</h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                  এখানে যেকোনো ইনভেস্টমেন্ট প্যাকেজ এডিট, নতুন তৈরি বা ডিলিট করতে পারবেন। ইউজারের Invest পেজে তাৎক্ষণিক লাইভ আপডেট হবে।
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={handleOpenCreatePackage}
                  style={{ backgroundColor: "#22c55e", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                >
                  ➕ নতুন প্যাকেজ যোগ করুন
                </button>
                <button
                  onClick={handleResetPackages}
                  style={{ backgroundColor: "#ca8a04", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
                >
                  🔄 ডিফল্ট ৬টি প্যাকেজ রিস্টোর
                </button>
                <button
                  onClick={fetchAllData}
                  style={{ backgroundColor: "#2e3856", color: "#fff", border: "none", padding: "8px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                >
                  🔄 রিফ্রেশ
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>মোট প্যাকেজ</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#00d2ff" }}>{packages.length} টি</div>
              </div>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>সক্রিয় প্যাকেজ</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#22c55e" }}>
                  {packages.filter(p => p.isActive !== false).length} টি
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>সর্বনিম্ন ইনভেস্ট</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#facc15" }}>
                  ৳ {packages.length > 0 ? Math.min(...packages.map(p => Number(p.minInvestmentBdt || p.minInvestment || 1200))) : 0}
                </div>
              </div>
              <div style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: "12px", color: "#94a3b8" }}>সর্বোচ্চ ইনভেস্ট</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#38bdf8" }}>
                  ৳ {packages.length > 0 ? Math.max(...packages.map(p => Number(p.minInvestmentBdt || p.minInvestment || 1200))) : 0}
                </div>
              </div>
            </div>

            {/* ফর্ম: নতুন তৈরি অথবা এডিট */}
            {(isCreatingNew || editingPackage) && (
              <div style={{ background: "#0f172a", padding: "20px", borderRadius: "10px", border: "2px solid #00d2ff", marginBottom: "25px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
                  <h4 style={{ margin: 0, color: "#00d2ff", fontSize: "16px" }}>
                    {editingPackage ? `✏️ প্যাকেজ এডিট: ${editingPackage.nameEn}` : "➕ নতুন ইনভেস্টমেন্ট প্যাকেজ তৈরি করুন"}
                  </h4>
                  <button
                    onClick={() => { setIsCreatingNew(false); setEditingPackage(null); }}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}
                  >
                    ✖
                  </button>
                </div>

                <form onSubmit={handleSavePackage}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "14px" }}>
                    
                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>প্যাকেজ আইডি (Unique ID):</label>
                      <input
                        type="text"
                        value={packageFormData.id}
                        disabled={!!editingPackage}
                        onChange={(e) => setPackageFormData({ ...packageFormData, id: e.target.value })}
                        placeholder="e.g. ultra-solar-plan"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: editingPackage ? "#1e293b" : "#020617", color: "#fff", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>নাম (English):</label>
                      <input
                        type="text"
                        value={packageFormData.nameEn}
                        onChange={(e) => setPackageFormData({ ...packageFormData, nameEn: e.target.value })}
                        placeholder="e.g. Mega Solar Array"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>নাম (বাংলা):</label>
                      <input
                        type="text"
                        value={packageFormData.nameBn}
                        onChange={(e) => setPackageFormData({ ...packageFormData, nameBn: e.target.value })}
                        placeholder="উদা: মেগা সোলার অ্যারে"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>ক্যাটাগরি:</label>
                      <select
                        value={packageFormData.category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          let badgeEn = "Solar Energy";
                          let badgeBn = "সোলার এনার্জি";
                          let icon = "sun";
                          if (cat === "wind") { badgeEn = "Wind Energy"; badgeBn = "উইন্ড এনার্জি"; icon = "wind"; }
                          else if (cat === "hydro") { badgeEn = "Hydro Energy"; badgeBn = "হাইড্রো এনার্জি"; icon = "droplet"; }
                          else if (cat === "combo") { badgeEn = "Hybrid Energy"; badgeBn = "হাইব্রিড এনার্জি"; icon = "crown"; }
                          setPackageFormData({
                            ...packageFormData,
                            category: cat,
                            badgeCategoryEn: badgeEn,
                            badgeCategoryBn: badgeBn,
                            badgeIconType: icon,
                          });
                        }}
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff" }}
                      >
                        <option value="solar">☀️ Solar (সোলার)</option>
                        <option value="wind">💨 Wind (উইন্ড)</option>
                        <option value="hydro">💧 Hydro (হাইড্রো)</option>
                        <option value="combo">👑 Combo / VIP (কম্বো)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>ব্যাজ ক্যাটাগরি (English):</label>
                      <input
                        type="text"
                        value={packageFormData.badgeCategoryEn}
                        onChange={(e) => setPackageFormData({ ...packageFormData, badgeCategoryEn: e.target.value })}
                        placeholder="e.g. Solar Energy"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>ব্যাজ ক্যাটাগরি (বাংলা):</label>
                      <input
                        type="text"
                        value={packageFormData.badgeCategoryBn}
                        onChange={(e) => setPackageFormData({ ...packageFormData, badgeCategoryBn: e.target.value })}
                        placeholder="e.g. সোলার এনার্জি"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>আইকন টাইপ:</label>
                      <select
                        value={packageFormData.badgeIconType}
                        onChange={(e) => setPackageFormData({ ...packageFormData, badgeIconType: e.target.value })}
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff" }}
                      >
                        <option value="sun">☀️ Sun (সূর্য)</option>
                        <option value="wind">💨 Wind (বায়ুপ্রবাহ)</option>
                        <option value="droplet">💧 Droplet (জলবিন্দু)</option>
                        <option value="crown">👑 Crown (মুকুট)</option>
                        <option value="gem">💎 Gem (রত্ন)</option>
                        <option value="star">⭐ Star (তারা)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>ইনভেস্ট পরিমাণ (টাকা / BDT):</label>
                      <input
                        type="number"
                        value={packageFormData.minInvestmentBdt}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setPackageFormData({
                            ...packageFormData,
                            minInvestmentBdt: val,
                            minInvestmentUsd: Math.round(val / 120),
                          });
                        }}
                        placeholder="উদা: 1200"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#22c55e", fontWeight: "bold", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>সমমান USD ($):</label>
                      <input
                        type="number"
                        value={packageFormData.minInvestmentUsd}
                        onChange={(e) => setPackageFormData({ ...packageFormData, minInvestmentUsd: Number(e.target.value) })}
                        placeholder="উদা: 10"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>দৈনিক লাভ (টাকায় / Daily Return in ৳):</label>
                      <input
                        type="number"
                        step="1"
                        value={packageFormData.dailyReturnBdt !== undefined ? packageFormData.dailyReturnBdt : Math.round((Number(packageFormData.minInvestmentBdt || 1200) * Number(packageFormData.dailyReturnPercent || 2.0)) / 100)}
                        onChange={(e) => {
                          const dailyBdt = Number(e.target.value);
                          const bdt = Number(packageFormData.minInvestmentBdt || 1200);
                          const days = Number(packageFormData.durationDays || 30);
                          const dailyPercent = bdt > 0 ? Math.round((dailyBdt / bdt) * 1000) / 10 : 2.0;
                          setPackageFormData({
                            ...packageFormData,
                            dailyReturnBdt: dailyBdt,
                            dailyReturnPercent: dailyPercent,
                            totalReturnPercent: Math.round((dailyBdt * days / bdt) * 100),
                          });
                        }}
                        placeholder="উদা: 24 (24৳)"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #22c55e", background: "#020617", color: "#22c55e", fontWeight: "bold", fontSize: "15px", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>দৈনিক রিটার্ন শতাংশ (% Daily Return):</label>
                      <input
                        type="number"
                        step="0.05"
                        value={packageFormData.dailyReturnPercent}
                        onChange={(e) => {
                          const daily = Number(e.target.value);
                          const bdt = Number(packageFormData.minInvestmentBdt || 1200);
                          const days = Number(packageFormData.durationDays || 30);
                          const dailyBdt = Math.round((bdt * daily) / 100);
                          setPackageFormData({
                            ...packageFormData,
                            dailyReturnPercent: daily,
                            dailyReturnBdt: dailyBdt,
                            totalReturnPercent: Math.round(daily * days * 10) / 10,
                          });
                        }}
                        placeholder="উদা: 2.0"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#facc15", fontWeight: "bold", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>মেয়াদকাল (দিন / Duration Days):</label>
                      <input
                        type="number"
                        value={packageFormData.durationDays}
                        onChange={(e) => {
                          const days = Number(e.target.value);
                          const daily = Number(packageFormData.dailyReturnPercent || 1.5);
                          setPackageFormData({
                            ...packageFormData,
                            durationDays: days,
                            totalReturnPercent: Math.round(daily * days * 10) / 10,
                          });
                        }}
                        placeholder="উদা: 30"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>মোট রিটার্ন (% Total Return):</label>
                      <input
                        type="number"
                        step="0.1"
                        value={packageFormData.totalReturnPercent}
                        onChange={(e) => setPackageFormData({ ...packageFormData, totalReturnPercent: Number(e.target.value) })}
                        placeholder="উদা: 75"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#38bdf8", fontWeight: "bold", boxSizing: "border-box" }}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>প্রয়োজনীয় VIP লেভেল:</label>
                      <select
                        value={packageFormData.requiredVipLevel}
                        onChange={(e) => setPackageFormData({ ...packageFormData, requiredVipLevel: Number(e.target.value) })}
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff" }}
                      >
                        <option value={0}>VIP 0 (সকল ইউজারের জন্য উন্মুক্ত)</option>
                        <option value={1}>VIP 1 প্রয়োজন (VIP 1 Required)</option>
                        <option value={2}>VIP 2 প্রয়োজন (VIP 2 Required)</option>
                        <option value={3}>VIP 3 প্রয়োজন (VIP 3 Required)</option>
                        <option value={4}>VIP 4 প্রয়োজন (VIP 4 Required)</option>
                        <option value={5}>VIP 5 প্রয়োজন (VIP 5 Required)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>সর্বোচ্চ ক্রয় সীমা (Purchase Limit):</label>
                      <select
                        value={packageFormData.maxPurchaseLimit}
                        onChange={(e) => setPackageFormData({ ...packageFormData, maxPurchaseLimit: Number(e.target.value) })}
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff" }}
                      >
                        <option value={0}>আনলিমিটেড (কোনো সীমা নেই)</option>
                        <option value={1}>সর্বোচ্চ ১ বার (Limit 0/1)</option>
                        <option value={2}>সর্বোচ্চ ২ বার (Limit 0/2)</option>
                        <option value={3}>সর্বোচ্চ ৩ বার</option>
                        <option value={5}>সর্বোচ্চ ৫ বার</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>ট্যাগলাইন (English):</label>
                      <input
                        type="text"
                        value={packageFormData.taglineEn}
                        onChange={(e) => setPackageFormData({ ...packageFormData, taglineEn: e.target.value })}
                        placeholder="e.g. Stable returns | 100% Renewable"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>ট্যাগলাইন (বাংলা):</label>
                      <input
                        type="text"
                        value={packageFormData.taglineBn}
                        onChange={(e) => setPackageFormData({ ...packageFormData, taglineBn: e.target.value })}
                        placeholder="e.g. স্থির রিটার্ন | ক্লিন এনার্জি"
                        style={{ width: "100%", padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                    </div>

                  </div>

                  {/* ইমেজ সিলেক্টর ও প্রিসেট বাটন */}
                  <div style={{ marginTop: "14px" }}>
                    <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>প্রজেক্ট ছবি URL:</label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                      <input
                        type="text"
                        value={packageFormData.image}
                        onChange={(e) => setPackageFormData({ ...packageFormData, image: e.target.value })}
                        placeholder="/images/apex-helios-solar.jpg বা ইমেজ লিংক"
                        style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "1px solid #334155", background: "#020617", color: "#fff", boxSizing: "border-box" }}
                      />
                      {packageFormData.image && (
                        <img
                          src={resolveImageSrc(packageFormData.image, 'solar')}
                          alt="preview"
                          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", border: "1px solid #334155" }}
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>ছবি প্রিসেট ক্লিক করুন:</span>
                      <button
                        type="button"
                        onClick={() => setPackageFormData({ ...packageFormData, image: "/images/apex-helios-solar.jpg" })}
                        style={{ padding: "4px 8px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        ☀️ Helios Solar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageFormData({ ...packageFormData, image: "/images/novawind-facility.jpg" })}
                        style={{ padding: "4px 8px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        💨 NovaWind
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageFormData({ ...packageFormData, image: "/images/smart_turbine_plant_1788466039952.jpg" })}
                        style={{ padding: "4px 8px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        💧 Hydro Plant
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageFormData({ ...packageFormData, image: "/images/smart_turbine_plant_1788466039952.jpg" })}
                        style={{ padding: "4px 8px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        ⚙️ Turbine
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageFormData({ ...packageFormData, image: "/images/solar_ai_substation_1788465992131.jpg" })}
                        style={{ padding: "4px 8px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        ⚡ Substation
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackageFormData({ ...packageFormData, image: "/images/vanguard-bess-storage.jpg" })}
                        style={{ padding: "4px 8px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}
                      >
                        🔋 Vanguard BESS
                      </button>
                    </div>
                  </div>

                  {/* প্যাকেজ স্ট্যাটাস অ্যাক্টিভ/ইনঅ্যাক্টিভ */}
                  <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="packageActiveCheckbox"
                      checked={packageFormData.isActive !== false}
                      onChange={(e) => setPackageFormData({ ...packageFormData, isActive: e.target.checked })}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <label htmlFor="packageActiveCheckbox" style={{ fontSize: "14px", cursor: "pointer", color: packageFormData.isActive !== false ? "#4ade80" : "#f87171" }}>
                      {packageFormData.isActive !== false ? "✅ সক্রিয় (ইউজারের Invest পেজে প্রদর্শিত হবে)" : "❌ নিষ্ক্রিয় (লুকিয়ে রাখা হয়েছে)"}
                    </label>
                  </div>

                  {/* লাইভ লাভ ক্যালকুলেশন প্রিভিউ */}
                  <div style={{ marginTop: "15px", padding: "12px", background: "#1e293b", borderRadius: "8px", border: "1px solid #334155", fontSize: "13px" }}>
                    <span style={{ color: "#38bdf8", fontWeight: "bold" }}>💡 প্রফিট প্রিভিউ: </span>
                    ৳ {packageFormData.minInvestmentBdt} বিনিয়োগে দৈনিক লাভ <strong style={{ color: "#22c55e" }}>{packageFormData.dailyReturnBdt || Math.round((Number(packageFormData.minInvestmentBdt) * Number(packageFormData.dailyReturnPercent || 2.0)) / 100)}৳</strong> টাকা ({packageFormData.dailyReturnPercent}%) | 
                    মোট {packageFormData.durationDays} দিনে লাভ <strong style={{ color: "#38bdf8" }}>৳ {((Number(packageFormData.dailyReturnBdt) || Math.round((Number(packageFormData.minInvestmentBdt) * Number(packageFormData.dailyReturnPercent || 2.0)) / 100)) * Number(packageFormData.durationDays || 30)).toLocaleString()}</strong> টাকা 
                    (মোট রিটার্ন: ৳ {(Number(packageFormData.minInvestmentBdt || 1200) + ((Number(packageFormData.dailyReturnBdt) || Math.round((Number(packageFormData.minInvestmentBdt) * Number(packageFormData.dailyReturnPercent || 2.0)) / 100)) * Number(packageFormData.durationDays || 30))).toLocaleString()})
                  </div>

                  {/* সাবমিট বাটন */}
                  <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
                    <button
                      type="submit"
                      disabled={packageSaving}
                      style={{ padding: "10px 24px", background: "#00d2ff", color: "#000", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
                    >
                      {packageSaving ? "সংরক্ষণ হচ্ছে..." : "💾 প্যাকেজ সেভ করুন"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsCreatingNew(false); setEditingPackage(null); }}
                      style={{ padding: "10px 18px", background: "#334155", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}
                    >
                      বাতিল
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* প্যাকেজ তালিকা টেবিল */}
            {packages.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", background: "#0f172a", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <p style={{ color: "#94a3b8", marginBottom: "15px" }}>কোনো ইনভেস্টমেন্ট প্যাকেজ পাওয়া যায়নি।</p>
                <button
                  onClick={handleResetPackages}
                  style={{ backgroundColor: "#00d2ff", color: "#000", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🔄 ডিফল্ট ৬টি প্যাকেজ লোড করুন
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2e3856", color: "#94a3b8", background: "#0f172a" }}>
                      <th style={{ padding: "10px" }}>ছবি</th>
                      <th style={{ padding: "10px" }}>প্যাকেজ নাম & ক্যাটাগরি</th>
                      <th style={{ padding: "10px" }}>মূল্য (BDT/USD)</th>
                      <th style={{ padding: "10px" }}>দৈনিক মুনাফা & মেয়াদ</th>
                      <th style={{ padding: "10px" }}>মোট লাভ</th>
                      <th style={{ padding: "10px" }}>VIP / লিমিট</th>
                      <th style={{ padding: "10px" }}>অবস্থা</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => {
                      const bdt = Number(pkg.minInvestmentBdt || pkg.minInvestment || 1200);
                      const days = Number(pkg.durationDays || 30);
                      const dailyBdt = Number(pkg.dailyReturnBdt) || Math.round((bdt * Number(pkg.dailyReturnPercent || 2.0)) / 100);
                      const daily = Number(pkg.dailyReturnPercent || Math.round((dailyBdt / bdt) * 1000) / 10);
                      const totalBdt = dailyBdt * days;
                      const total = Number(pkg.totalReturnPercent || Math.round((totalBdt / bdt) * 100));
                      const isActive = pkg.isActive !== false;

                      return (
                        <tr key={pkg.id} style={{ borderBottom: "1px solid #1e293b", opacity: isActive ? 1 : 0.65 }}>
                          <td style={{ padding: "10px" }}>
                            <img
                              src={resolveImageSrc(pkg.image, 'solar')}
                              alt={pkg.nameEn}
                              style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1px solid #334155" }}
                              referrerPolicy="no-referrer"
                              onError={(e) => { e.target.src = "/images/apex-helios-solar.jpg"; }}
                            />
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#fff" }}>{pkg.nameEn}</div>
                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>{pkg.nameBn}</div>
                            <span style={{ display: "inline-block", fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: "#1e293b", color: "#38bdf8", marginTop: "3px" }}>
                              {pkg.badgeCategoryEn || pkg.category}
                            </span>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ color: "#22c55e", fontWeight: "bold", fontSize: "14px" }}>৳ {bdt.toLocaleString()}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>${pkg.minInvestmentUsd || Math.round(bdt / 120)}</div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ color: "#22c55e", fontWeight: "bold", fontSize: "14px" }}>{dailyBdt}৳ / দিন</div>
                            <div style={{ fontSize: "12px", color: "#cbd5e1" }}>{days} দিন ({daily}%)</div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ color: "#38bdf8", fontWeight: "bold", fontSize: "14px" }}>৳ {totalBdt.toLocaleString()}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{total}% লাভ</div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ fontSize: "12px", color: (pkg.requiredVipLevel || 0) > 0 ? "#facc15" : "#a7f3d0" }}>
                              {(pkg.requiredVipLevel || 0) > 0 ? `VIP ${pkg.requiredVipLevel} প্রয়োজন` : `VIP 0 (সবার জন্য)`}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                              {(pkg.maxPurchaseLimit || 0) > 0 ? `লিমিট: ০/${pkg.maxPurchaseLimit}` : `আনলিমিটেড`}
                            </div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: isActive ? "#14532d" : "#7f1d1d", color: isActive ? "#4ade80" : "#fca5a5" }}>
                              {isActive ? "সক্রিয়" : "নিষ্ক্রিয়"}
                            </span>
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                              <button
                                onClick={() => handleOpenEditPackage(pkg)}
                                style={{ background: "#3b82f6", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                                title="প্যাকেজ এডিট করুন"
                              >
                                ✏️ এডিট
                              </button>
                              <button
                                onClick={() => handleTogglePackageStatus(pkg)}
                                style={{ background: isActive ? "#713f12" : "#15803d", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                                title={isActive ? "লুকিয়ে রাখুন" : "প্রকাশ করুন"}
                              >
                                {isActive ? "লুকান" : "সক্রিয়"}
                              </button>
                              <button
                                onClick={() => handleDeletePackage(pkg.id, pkg.nameEn)}
                                style={{ background: "#dc3545", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                                title="প্যাকেজ মুছুন"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ৪. ব্যালেন্স কন্ট্রোল ট্যাব */}
        {activeTab === "balance" && (
          <div style={{ maxWidth: "500px" }}>
            <h3>💰 Set User Balance</h3>
            <form onSubmit={handleUpdateAmount} style={{ marginTop: "15px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>ইউজার সিলেক্ট করুন:</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff" }} required>
                <option value="">-- ইউজার বেছে নিন --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email || u.phone || u.id} (ব্যালেন্স: {Math.max(0, Number(u.walletBalance ?? u.balance ?? 0))})</option>
                ))}
              </select>

              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>নতুন ব্যালেন্স / অ্যামাউন্ট:</label>
              <input type="number" placeholder="উদা: 5000" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} required />

              <button type="submit" style={{ width: "100%", padding: "12px", backgroundColor: "#00d2ff", color: "#000", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>সেভ করুন</button>
            </form>
          </div>
        )}

        {/* ৫. সাপোর্ট লিংক ও Crisp লাইভ চ্যাট ট্যাব */}
        {activeTab === "support" && (
          <div style={{ maxWidth: "580px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #2e3856", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#00d2ff" }}>📢 Customer Support & Crisp Live Chat</h3>
              <a 
                href="https://app.crisp.chat" 
                target="_blank" 
                rel="noreferrer" 
                style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: "#1e293b", color: "#38bdf8", textDecoration: "none", fontSize: "12px", fontWeight: "bold", border: "1px solid #0284c7" }}
              >
                📱 Crisp Inbox খুলুন ↗
              </a>
            </div>

            <div style={{ backgroundColor: "rgba(14, 165, 233, 0.1)", border: "1px solid rgba(14, 165, 233, 0.3)", borderRadius: "8px", padding: "12px", marginBottom: "18px", fontSize: "13px", lineHeight: "1.5", color: "#bae6fd" }}>
              💡 <strong>Crisp মোবাইল সাপোর্ট গাইড:</strong> ইউজার ওয়েবসাইটে মেসেজ দিলে সরাসরি আপনার ফোনে থাকা <strong>Crisp মোবাইল অ্যাপে</strong> নোটিফিকেশন আসবে। অ্যাপে ঢুকলে ইউজারের নাম, ফোন নম্বর ও মেম্বার আইডি দেখা যাবে এবং আপনি ফোন থেকেই মেসেজের উত্তর দিতে পারবেন।
            </div>

            <form onSubmit={handleSaveSupport}>
              {/* Crisp Chat Config */}
              <div style={{ backgroundColor: "#10182f", border: "1px solid #2e3856", borderRadius: "8px", padding: "14px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <label style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "14px" }}>💬 Crisp Website ID:</label>
                  <label style={{ fontSize: "13px", color: "#a5f3fc", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input 
                      type="checkbox" 
                      checked={crispEnabled} 
                      onChange={(e) => setCrispEnabled(e.target.checked)} 
                    />
                    লাইভ চ্যাট চালু রাখুন (Active)
                  </label>
                </div>
                <input 
                  type="text" 
                  placeholder="458178db-b2c7-4e37-b759-d377ae93554a" 
                  value={crispWebsiteId} 
                  onChange={(e) => setCrispWebsiteId(e.target.value)} 
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box", fontFamily: "monospace", fontSize: "13px" }} 
                />
              </div>

              {/* WhatsApp Link */}
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "bold" }}>🟢 WhatsApp Group / Support Link:</label>
              <input type="text" placeholder="https://chat.whatsapp.com/..." value={supportLink} onChange={(e) => setSupportLink(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} />

              {/* Telegram Link */}
              <label style={{ display: "block", marginBottom: "6px", fontSize: "14px", fontWeight: "bold" }}>✈️ Telegram Group / Channel Link:</label>
              <input type="text" placeholder="https://t.me/..." value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} />

              {/* Hotline & Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold" }}>📞 Hotline Phone:</label>
                  <input type="text" placeholder="+880 9612-345678" value={hotline} onChange={(e) => setHotline(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold" }}>✉️ Official Email:</label>
                  <input type="email" placeholder="support@novaterraenergy.io" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} />
                </div>
              </div>

              {/* Render Backend API URL for Real Email OTP */}
              <div style={{ backgroundColor: "#064e3b", border: "1px solid #059669", borderRadius: "8px", padding: "12px", marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "bold", color: "#6ee7b7" }}>
                  🚀 Render ব্যাকএন্ড API URL (রিয়েল ইমেইল OTP সার্ভার):
                </label>
                <input
                  type="url"
                  placeholder="https://nvt-energy-otp-server.onrender.com"
                  value={renderBackendUrl}
                  onChange={(e) => setRenderBackendUrl(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #10b981", backgroundColor: "#022c22", color: "#fff", boxSizing: "border-box", fontSize: "13px" }}
                />
                <span style={{ display: "block", marginTop: "5px", fontSize: "11px", color: "#a7f3d0" }}>
                  💡 রেন্ডারে (render.com) ব্যাকএন্ড ডিপ্লয় করে প্রাপ্ত URL এখানে বসালে সরাসরি গ্রাহকের ইমেইল ইনবক্সে আসল ওটিপি চলে যাবে।
                </span>
              </div>

              {/* ৪ জন প্রকল্প ব্যবস্থাপক টেলিগ্রাম লিংক */}
              <div style={{ backgroundColor: "#111827", border: "1px solid #374151", borderRadius: "8px", padding: "14px", marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#38bdf8", fontSize: "14px", fontWeight: "bold" }}>👔 ৪ জন প্রকল্প ব্যবস্থাপক টেলিগ্রাম লিংক (Project Managers):</h4>
                
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#93c5fd" }}>সিনিয়র প্রকল্প ব্যবস্থাপক (গ্রিড ও ডিপোজিট - ইঞ্জি. রাশেদুল ইসলাম):</label>
                  <input type="text" placeholder="https://t.me/..." value={manager1Telegram} onChange={(e) => setManager1Telegram(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box", fontSize: "13px" }} />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#6ee7b7" }}>প্রকল্প ব্যবস্থাপক (উইথড্রল ও অর্থায়ন - জ্যাক হ্যারিসন / Jack Harrison):</label>
                  <input type="text" placeholder="https://t.me/..." value={manager2Telegram} onChange={(e) => setManager2Telegram(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box", fontSize: "13px" }} />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#fcd34d" }}>টেকনিক্যাল প্রকল্প ব্যবস্থাপক (সোলার প্যাকেজ - তানভীর আহমেদ):</label>
                  <input type="text" placeholder="https://t.me/..." value={manager3Telegram} onChange={(e) => setManager3Telegram(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box", fontSize: "13px" }} />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "4px", fontSize: "12px", color: "#f472b6" }}>ভিআইপি ও টিম রিলেশনস ম্যানেজার (সাবরিনা চৌধুরী):</label>
                  <input type="text" placeholder="https://t.me/..." value={manager4Telegram} onChange={(e) => setManager4Telegram(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box", fontSize: "13px" }} />
                </div>
              </div>

              <button type="submit" style={{ width: "100%", padding: "12px", backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "15px" }}>সব সেটিংস সেভ করুন</button>
            </form>
          </div>
        )}

        {/* ৬. রেফার বোনাস / ৩-টায়ার কমিশন সেটাপ ট্যাব */}
        {activeTab === "referral" && (
          <div style={{ maxWidth: "600px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #2e3856", paddingBottom: "10px" }}>
              <h3 style={{ margin: 0, color: "#00d2ff" }}>🎁 ৩-লেভেল রেফারেল বোনাস ও কমিশন সেটাপ</h3>
              <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "4px", backgroundColor: "#1e293b", color: "#38bdf8", border: "1px solid #0284c7" }}>
                3-Tier Hierarchy
              </span>
            </div>

            <div style={{ backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "14px", marginBottom: "18px", fontSize: "13px", lineHeight: "1.6", color: "#d1fae5" }}>
              ℹ️ <strong>রেফারেল বোনাস কিভাবে কাজ করে:</strong><br />
              • <strong>Tier 1 (লেভেল ১):</strong> সরাসরি রেফার হওয়া ইউজার ডিপোজিট বা ইনভেস্ট করলে এই শতাংশ কমিশন তাদের আপলাইনার পাবে।<br />
              • <strong>Tier 2 (লেভেল ২):</strong> লেভেল ১ ইউজারের রেফার হওয়া দ্বিতীয় স্তরের সদস্যের ডিপোজিটের কমিশন।<br />
              • <strong>Tier 3 (লেভেল ৩):</strong> লেভেল ২ ইউজারের রেফার হওয়া তৃতীয় স্তরের সদস্যের ডিপোজিটের কমিশন।
            </div>

            <form onSubmit={handleSaveReferralSettings} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ backgroundColor: "#10182f", border: "1px solid #2e3856", borderRadius: "8px", padding: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#00e676", fontSize: "14px" }}>
                  🥇 Tier 1 (লেভেল ১ - সরাসরি রেফার) কমিশন (%):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tier1Percent}
                    onChange={(e) => setTier1Percent(Number(e.target.value))}
                    style={{ width: "120px", padding: "10px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", fontWeight: "bold", fontSize: "16px" }}
                    required
                  />
                  <span style={{ color: "#94a3b8", fontSize: "14px" }}>% (ডিফল্ট: 6%)</span>
                </div>
              </div>

              <div style={{ backgroundColor: "#10182f", border: "1px solid #2e3856", borderRadius: "8px", padding: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#38bdf8", fontSize: "14px" }}>
                  🥈 Tier 2 (লেভেল ২ - দ্বিতীয় স্তর) কমিশন (%):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tier2Percent}
                    onChange={(e) => setTier2Percent(Number(e.target.value))}
                    style={{ width: "120px", padding: "10px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", fontWeight: "bold", fontSize: "16px" }}
                    required
                  />
                  <span style={{ color: "#94a3b8", fontSize: "14px" }}>% (ডিফল্ট: 3%)</span>
                </div>
              </div>

              <div style={{ backgroundColor: "#10182f", border: "1px solid #2e3856", borderRadius: "8px", padding: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#facc15", fontSize: "14px" }}>
                  🥉 Tier 3 (লেভেল ৩ - তৃতীয় স্তর) কমিশন (%):
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tier3Percent}
                    onChange={(e) => setTier3Percent(Number(e.target.value))}
                    style={{ width: "120px", padding: "10px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", fontWeight: "bold", fontSize: "16px" }}
                    required
                  />
                  <span style={{ color: "#94a3b8", fontSize: "14px" }}>% (ডিফল্ট: 1%)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={referralSaving}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: referralSaving ? "#4b5563" : "#00d2ff",
                  color: "#000",
                  border: "none",
                  borderRadius: "6px",
                  cursor: referralSaving ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                  fontSize: "15px",
                  marginTop: "6px"
                }}
              >
                {referralSaving ? "সেভ হচ্ছে..." : "💾 রেফার কমিশন রেট সংরক্ষণ করুন"}
              </button>
            </form>
          </div>
        )}

        {/* ৭. ইউজার ও নেটওয়ার্ক ট্যাব (সার্চ, ফিল্টার এবং গোছানো কম্প্যাক্ট টেবিল) */}
        {activeTab === "users" && (
          <div>
            {/* Top KPI Metrics Bento Box */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "#0b1322", border: "1px solid #1e293b", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>👥</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "bold" }}>মোট রেজিস্টার্ড ইউজার</div>
                  <div style={{ fontSize: "17px", fontWeight: "bold", color: "#38bdf8" }}>{users.length} জন</div>
                </div>
              </div>

              <div style={{ background: "#062215", border: "1px solid #14532d", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>⚡</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#86efac", fontWeight: "bold" }}>সক্রিয় প্যাকেজ হোল্ডার</div>
                  <div style={{ fontSize: "17px", fontWeight: "bold", color: "#4ade80" }}>
                    {users.filter(u => (Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) || Number(u.totalInvested || 0) > 0).length} জন
                  </div>
                </div>
              </div>

              <div style={{ background: "#1f1807", border: "1px solid #713f12", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🆓</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#fde047", fontWeight: "bold" }}>ফ্রি অ্যাকাউন্ট</div>
                  <div style={{ fontSize: "17px", fontWeight: "bold", color: "#facc15" }}>
                    {users.filter(u => !(Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) && Number(u.totalInvested || 0) <= 0).length} জন
                  </div>
                </div>
              </div>

              <div style={{ background: "#180d26", border: "1px solid #581c87", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "20px" }}>🎁</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#d8b4fe", fontWeight: "bold" }}>রেফার পারমিশন প্রাপ্ত</div>
                  <div style={{ fontSize: "17px", fontWeight: "bold", color: "#c084fc" }}>
                    {users.filter(u => !!u.canRefer).length} জন
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions & Filter Pills */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
              {/* Filter Pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setUserFilterTab("all")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: userFilterTab === "all" ? "#38bdf8" : "#334155",
                    background: userFilterTab === "all" ? "#0284c7" : "#0f172a",
                    color: "#fff"
                  }}
                >
                  সকল ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterTab("active")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: userFilterTab === "active" ? "#4ade80" : "#334155",
                    background: userFilterTab === "active" ? "#15803d" : "#0f172a",
                    color: "#fff"
                  }}
                >
                  সক্রিয় ({users.filter(u => (Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) || Number(u.totalInvested || 0) > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterTab("free")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: userFilterTab === "free" ? "#facc15" : "#334155",
                    background: userFilterTab === "free" ? "#a16207" : "#0f172a",
                    color: "#fff"
                  }}
                >
                  ফ্রি আইডি ({users.filter(u => !(Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) && Number(u.totalInvested || 0) <= 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserFilterTab("referral")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: userFilterTab === "referral" ? "#c084fc" : "#334155",
                    background: userFilterTab === "referral" ? "#7e22ce" : "#0f172a",
                    color: "#fff"
                  }}
                >
                  রেফার অনুমোদিত ({users.filter(u => !!u.canRefer).length})
                </button>
              </div>

              {/* Utility Buttons */}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setShowIdRemover(!showIdRemover)}
                  style={{
                    padding: "6px 12px",
                    background: showIdRemover ? "#b91c1c" : "rgba(220, 38, 38, 0.15)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  🗑️ কুইক আইডি রিমুভার {showIdRemover ? "▲" : "▼"}
                </button>
                <button
                  type="button"
                  onClick={handlePurgeAllAccounts}
                  style={{
                    padding: "6px 12px",
                    background: "rgba(220, 38, 38, 0.1)",
                    color: "#fca5a5",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                  title="সকল অ্যাকাউন্ট রিসেট করুন"
                >
                  ⚠️ সকল রিসেট
                </button>
              </div>
            </div>

            {/* Collapsible Slim Quick Remover Form */}
            {showIdRemover && (
              <div style={{ background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(239, 68, 68, 0.35)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px" }}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!manualUserIdToDelete.trim()) {
                      alert("দয়া করে একটি ইউজার আইডি বা মেম্বার আইডি লিখুন!");
                      return;
                    }
                    const inputVal = manualUserIdToDelete.trim();
                    const targetUser = users.find(
                      (u) =>
                        u.id === inputVal ||
                        u.uid === inputVal ||
                        (u.memberId && u.memberId.toUpperCase() === inputVal.toUpperCase()) ||
                        (u.phone && (u.phone === inputVal || u.phone.includes(inputVal) || u.phone.replace(/\D/g, '').endsWith(inputVal.replace(/\D/g, '')))) ||
                        (u.email && u.email.toLowerCase() === inputVal.toLowerCase())
                    );
                    const actualId = targetUser ? (targetUser.id || targetUser.uid) : inputVal;
                    handleDeleteUser(actualId, targetUser?.name || targetUser?.phone || inputVal, targetUser);
                  }}
                  style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                >
                  <span style={{ fontSize: "13px", color: "#fca5a5", fontWeight: "bold" }}>আইডি দিয়ে মুছুন:</span>
                  <input
                    type="text"
                    placeholder="Firebase UID বা Member ID দিন (যেমন: NVT123456 বা 8t9Xz1...)"
                    value={manualUserIdToDelete}
                    onChange={(e) => setManualUserIdToDelete(e.target.value)}
                    style={{
                      flex: "1",
                      minWidth: "220px",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid #ef4444",
                      backgroundColor: "#0b0f19",
                      color: "#fff",
                      fontFamily: "monospace",
                      fontSize: "12px",
                      boxSizing: "border-box"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={deletingUserId !== null || !manualUserIdToDelete.trim()}
                    style={{
                      padding: "6px 14px",
                      backgroundColor: deletingUserId ? "#4b5563" : "#dc2626",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      fontSize: "12px",
                      cursor: deletingUserId ? "not-allowed" : "pointer"
                    }}
                  >
                    {deletingUserId ? "মুছে ফেলা হচ্ছে..." : "🗑️ নিশ্চিত রিমুভ"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setManualUserIdToDelete(""); setShowIdRemover(false); }}
                    style={{ padding: "6px 10px", background: "#334155", color: "#cbd5e1", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                  >
                    বন্ধ
                  </button>
                </form>
              </div>
            )}

            {/* Search Bar & Count */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                প্রদর্শন হচ্ছে: <strong style={{ color: "#38bdf8" }}>{filteredUsers.length}</strong> / {users.length} জন
              </div>
              <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
                <input
                  type="text"
                  placeholder="🔍 নাম, ইমেইল, মেম্বার আইডি বা UID দিয়ে সার্চ..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 30px 7px 12px",
                    borderRadius: "6px",
                    border: "1px solid #3b476c",
                    backgroundColor: "#0b0f19",
                    color: "#fff",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                {userSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setUserSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Compact, Organized Table */}
            {loading ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>লোড হচ্ছে...</p>
            ) : filteredUsers.length === 0 ? (
              <div style={{ color: "#94a3b8", textAlign: "center", padding: "30px 20px", background: "#0b0f19", borderRadius: "8px", border: "1px solid #1e293b" }}>
                <p style={{ margin: 0, fontSize: "14px" }}>কোনো ইউজার পাওয়া যায়নি।</p>
                {userSearchQuery && (
                  <button
                    type="button"
                    onClick={() => { setUserSearchQuery(""); setUserFilterTab("all"); }}
                    style={{ marginTop: "10px", padding: "5px 12px", background: "#1e293b", color: "#38bdf8", border: "1px solid #334155", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                  >
                    সার্চ ও ফিল্টার ক্লিয়ার করুন
                  </button>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #2e3856" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#0f172a", borderBottom: "1px solid #2e3856", color: "#94a3b8", whiteSpace: "nowrap" }}>
                      <th style={{ padding: "8px 10px", width: "40px", textAlign: "center" }}>#</th>
                      <th style={{ padding: "8px 10px", minWidth: "170px" }}>ইউজার / মেম্বার</th>
                      <th style={{ padding: "8px 10px", width: "110px" }}>ব্যালেন্স</th>
                      <th style={{ padding: "8px 10px", width: "110px" }}>আপলাইনার</th>
                      <th style={{ padding: "8px 10px", minWidth: "190px" }}>রেফার পারমিশন ও লিমিট</th>
                      <th style={{ padding: "8px 10px", width: "130px" }}>ইউজার আইডি (UID)</th>
                      <th style={{ padding: "8px 10px", width: "80px", textAlign: "center" }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, idx) => {
                      const isBeingDeleted = deletingUserId === u.id;
                      const isIdCopied = copiedId === u.id;
                      const userCanRefer = !!u.canRefer;
                      const userLimit = u.referralLimit !== undefined && u.referralLimit !== null ? Number(u.referralLimit) : (userCanRefer ? 10 : 0);
                      const isUserActive = (Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) || Number(u.totalInvested || 0) > 0;
                      const userReferredCount = users.filter((x) =>
                        x.referredBy &&
                        (x.referredBy === u.referralCode ||
                         x.referredBy === u.memberId ||
                         x.referredBy === u.id ||
                         (u.phone && x.referredBy === u.phone))
                      ).length;

                      const shortId = u.id ? (u.id.length > 12 ? `${u.id.slice(0, 5)}...${u.id.slice(-4)}` : u.id) : "N/A";

                      return (
                        <tr
                          key={u.id}
                          style={{
                            borderBottom: "1px solid #1e293b",
                            backgroundColor: isBeingDeleted ? "rgba(220, 38, 38, 0.15)" : idx % 2 === 0 ? "rgba(11, 15, 25, 0.4)" : "transparent",
                            verticalAlign: "middle"
                          }}
                        >
                          {/* 0. Index */}
                          <td style={{ padding: "7px 10px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "bold" }}>
                            {idx + 1}
                          </td>

                          {/* 1. Name & Contact */}
                          <td style={{ padding: "7px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", lineHeight: "1.2" }}>
                              <span style={{ fontWeight: "bold", color: "#38bdf8", fontSize: "13px" }}>
                                {u.name || "N/A"}
                              </span>
                              {isUserActive ? (
                                <span style={{ padding: "1px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: "bold", background: "#052e16", color: "#4ade80", border: "1px solid #166534" }}>
                                  সক্রিয়
                                </span>
                              ) : (
                                <span style={{ padding: "1px 5px", borderRadius: "3px", fontSize: "9px", fontWeight: "bold", background: "#2e2105", color: "#facc15", border: "1px solid #713f12" }}>
                                  ফ্রি
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px", display: "flex", flexDirection: "column", gap: "2px" }}>
                              {u.email && (
                                <span style={{ color: "#38bdf8", fontWeight: "500", fontSize: "11px" }}>
                                  ✉️ {u.email}
                                </span>
                              )}
                              {u.memberId && (
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
                                  <span style={{ color: "#64748b", background: "#0b0f19", padding: "0 4px", borderRadius: "3px", border: "1px solid #1e293b" }}>
                                    ID: {u.memberId}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 2. Balance */}
                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                            <span style={{ color: "#4ade80", fontWeight: "bold", fontFamily: "monospace", fontSize: "13px" }}>
                              ৳ {Math.max(0, Number(u.walletBalance ?? u.balance ?? 0)).toLocaleString("en-US")}
                            </span>
                          </td>

                          {/* 3. Upliner */}
                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                            {u.referredBy || u.upliner || u.sponsor ? (
                              <span style={{ color: "#fbbf24", fontSize: "12px", background: "rgba(251, 191, 36, 0.1)", padding: "2px 6px", borderRadius: "4px", border: "1px solid rgba(251, 191, 36, 0.2)" }}>
                                {u.referredBy || u.upliner || u.sponsor}
                              </span>
                            ) : (
                              <span style={{ color: "#64748b", fontSize: "11px" }}>Direct (সরাসরি)</span>
                            )}
                          </td>

                          {/* 4. Referral Permission & Limit (Streamlined Inline Row) */}
                          <td style={{ padding: "7px 10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleReferralPermission(u.id, userCanRefer, userLimit || 10)}
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "11px",
                                  fontWeight: "bold",
                                  cursor: "pointer",
                                  border: "none",
                                  backgroundColor: userCanRefer ? "#166534" : "#7f1d1d",
                                  color: userCanRefer ? "#86efac" : "#fca5a5"
                                }}
                                title={userCanRefer ? "ক্লিক করে পারমিশন বাতিল করুন" : "ক্লিক করে অনুমোদন দিন"}
                              >
                                {userCanRefer ? "✓ সক্রিয়" : "✕ বন্ধ"}
                              </button>

                              <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "11px", color: "#94a3b8" }}>
                                <span>লিমিট:</span>
                                <ReferralLimitEditor
                                  userId={u.id}
                                  currentLimit={userLimit}
                                  onSave={handleUpdateReferralLimit}
                                />
                                <span style={{ fontSize: "10px", color: userReferredCount >= userLimit && userLimit > 0 ? "#f87171" : "#4ade80" }}>
                                  ({userReferredCount}/{userLimit > 0 ? userLimit : "∞"})
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 5. UID (Compact Truncated with 1-Click Copy) */}
                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <span
                                title={u.id}
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  color: "#94a3b8",
                                  background: "#0b0f19",
                                  padding: "2px 5px",
                                  borderRadius: "4px",
                                  border: "1px solid #1e293b",
                                  cursor: "help"
                                }}
                              >
                                {shortId}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyId(u.id)}
                                style={{
                                  padding: "2px 5px",
                                  fontSize: "10px",
                                  backgroundColor: isIdCopied ? "#166534" : "#1e293b",
                                  color: isIdCopied ? "#4ade80" : "#94a3b8",
                                  border: "1px solid #334155",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap"
                                }}
                                title="সম্পূর্ণ আইডি কপি করুন"
                              >
                                {isIdCopied ? "✓" : "কপি"}
                              </button>
                            </div>
                          </td>

                          {/* 6. Action */}
                          <td style={{ padding: "7px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.name || u.phone || "", u)}
                              disabled={isBeingDeleted || deletingUserId !== null}
                              style={{
                                backgroundColor: isBeingDeleted ? "#475569" : "#b91c1c",
                                color: "#fff",
                                border: "none",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                cursor: isBeingDeleted || deletingUserId !== null ? "not-allowed" : "pointer",
                                fontSize: "11px",
                                fontWeight: "bold"
                              }}
                              title="ইউজার ডিলিট করুন"
                            >
                              {isBeingDeleted ? "..." : "🗑️ রিমুভ"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ৮. ব্যানার ও ছবি আপলোড ট্যাব */}
        {activeTab === "banners" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#00e676", fontSize: "18px" }}>
                  🖼️ দাতব্য প্রতিষ্ঠান ও হোমপেজ ব্যানার আপলোড (Charity & Site Banners)
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                  এখানে ছবি আপলোড করলে তা স্বয়ংক্রিয়ভাবে অ্যাপের হোমপেজে <strong>"দাতব্য প্রতিষ্ঠান"</strong> স্লাইডার ব্যানারে প্রদর্শিত হবে।
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={fetchCharityBanners}
                  style={{ padding: "8px 14px", backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🔄 রিফ্রেশ
                </button>
                {charityBannersList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllCharityBanners}
                    style={{ padding: "8px 14px", backgroundColor: "#7f1d1d", color: "#fca5a5", border: "1px solid #991b1b", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    🗑️ সব ছবি রিমুভ করুন
                  </button>
                )}
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  style={{ padding: "8px 14px", backgroundColor: "#065f46", color: "#a7f3d0", border: "1px solid #059669", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
                >
                  🔗 হোমপেজে দেখুন
                </a>
              </div>
            </div>

            {/* আপলোড কার্ড */}
            <div style={{ background: "#0b1329", border: "1px solid #1e293b", borderRadius: "10px", padding: "20px", marginBottom: "25px" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "#fff", fontSize: "15px" }}>
                ➕ নতুন ছবি আপলোড করুন
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "15px" }}>
                {/* ড্র্যাগ অ্যান্ড ড্রপ ফাইল পিকার */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setBannerDragActive(true); }}
                  onDragLeave={() => setBannerDragActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setBannerDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      const file = e.dataTransfer.files[0];
                      setBannerSelectedFile(file);
                      const preview = URL.createObjectURL(file);
                      setBannerPreviewSrc(preview);
                    }
                  }}
                  onClick={() => bannerFileInputRef.current && bannerFileInputRef.current.click()}
                  style={{
                    border: bannerDragActive ? "2px dashed #00e676" : "2px dashed #334155",
                    backgroundColor: bannerDragActive ? "rgba(0, 230, 118, 0.08)" : "#0f172a",
                    borderRadius: "10px",
                    padding: "30px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  <input
                    ref={bannerFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setBannerSelectedFile(file);
                        const preview = URL.createObjectURL(file);
                        setBannerPreviewSrc(preview);
                      }
                    }}
                  />
                  <div style={{ fontSize: "36px", marginBottom: "8px" }}>📁</div>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#e2e8f0" }}>
                    মোবাইল বা কম্পিউটার থেকে ছবি নির্বাচন করতে এখানে ক্লিক করুন
                  </p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                    সাপোর্টেড ফরম্যাট: JPG, PNG, WEBP (সর্বোচ্চ সাইজ স্বয়ংক্রিয়ভাবে অপটিমাইজ হবে)
                  </p>

                  {/* সিলেক্টেড ফাইল প্রিভিউ */}
                  {bannerPreviewSrc && (
                    <div style={{ marginTop: "15px", display: "inline-block", position: "relative" }} onClick={(e) => e.stopPropagation()}>
                      <img
                        src={bannerPreviewSrc}
                        alt="Preview"
                        style={{ maxHeight: "150px", maxWidth: "100%", borderRadius: "8px", border: "2px solid #00e676" }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setBannerSelectedFile(null);
                          setBannerPreviewSrc("");
                          if (bannerFileInputRef.current) bannerFileInputRef.current.value = "";
                        }}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          right: "-8px",
                          background: "#dc2626",
                          color: "#fff",
                          border: "none",
                          borderRadius: "50%",
                          width: "24px",
                          height: "24px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          lineHeight: "24px",
                          padding: 0
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* অপশনাল: ছবির শিরোনাম ও সরাসরি অনলাইন URL */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>
                      ছবির শিরোনাম / বিবরণ (ঐচ্ছিক):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: শীতবস্ত্র বিতরণ ও ত্রাণ সহায়তা"
                      value={bannerTitleInput}
                      onChange={(e) => setBannerTitleInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "5px" }}>
                      অথবা অনলাইন ইমেজ লিংক (URL):
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={bannerUrlInput}
                      onChange={(e) => setBannerUrlInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "6px",
                        color: "#fff",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {/* সাবমিট বাটন */}
                <div>
                  <button
                    type="button"
                    disabled={bannerUploading || (!bannerSelectedFile && !bannerUrlInput.trim())}
                    onClick={() => {
                      if (bannerSelectedFile) {
                        handleUploadCharityBanner(bannerSelectedFile, bannerTitleInput);
                      } else if (bannerUrlInput.trim()) {
                        handleUploadCharityBanner(bannerUrlInput.trim(), bannerTitleInput);
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px",
                      backgroundColor: bannerUploading || (!bannerSelectedFile && !bannerUrlInput.trim()) ? "#475569" : "#00c853",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: bannerUploading || (!bannerSelectedFile && !bannerUrlInput.trim()) ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                      fontSize: "14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      transition: "background 0.2s ease"
                    }}
                  >
                    {bannerUploading ? "⏳ আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন" : "📤 ছবি আপলোড ও হোমপেজে প্রকাশ করুন"}
                  </button>
                </div>
              </div>
            </div>

            {/* আপলোড করা ছবিসমূহের গ্যালারি */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, color: "#fff", fontSize: "15px" }}>
                  🖼️ বর্তমানে হোমপেজে সক্রিয় ছবি সমূহ ({charityBannersList.length}টি)
                </h4>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  হোমপেজের "দাতব্য প্রতিষ্ঠান" স্লাইডারে ক্রমানুসারে প্রদর্শিত হবে
                </span>
              </div>

              {charityBannersList.length === 0 ? (
                <div style={{ background: "#0b1329", border: "1px dashed #334155", borderRadius: "10px", padding: "40px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: "40px", marginBottom: "10px" }}>📷</div>
                  <h4 style={{ margin: "0 0 6px 0", color: "#e2e8f0" }}>এখনো কোনো ছবি আপলোড করা হয়নি</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                    উপরের আপলোড বক্স থেকে আপনার ছবি যুক্ত করুন। আপলোড করার সাথে সাথে হোমপেজে স্বয়ংক্রিয়ভাবে স্লাইডার চালু হবে।
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                  {charityBannersList.map((banner, index) => {
                    const isActive = banner.isActive !== false;
                    return (
                      <div
                        key={banner.id || index}
                        style={{
                          background: "#0f172a",
                          border: isActive ? "1px solid #10b981" : "1px solid #334155",
                          borderRadius: "10px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.3)"
                        }}
                      >
                        {/* ইমেজ প্রিভিউ ফ্রেম */}
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "170px",
                            backgroundColor: "#020617",
                            overflow: "hidden",
                            cursor: "pointer"
                          }}
                          onClick={() => setPreviewingBannerImg(banner.image)}
                          title="বড় আকারে প্রিভিউ দেখতে ক্লিক করুন"
                        >
                          <img
                            src={banner.image}
                            alt={banner.title || "Charity Banner"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              objectPosition: "center",
                              opacity: isActive ? 1 : 0.4
                            }}
                            onError={(e) => {
                              e.currentTarget.src = "/images/energy-hero.jpg";
                            }}
                          />
                          <div
                            style={{
                              position: "absolute",
                              top: "8px",
                              left: "8px",
                              background: "rgba(0,0,0,0.75)",
                              color: "#00e676",
                              fontSize: "11px",
                              fontWeight: "bold",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontFamily: "monospace"
                            }}
                          >
                            #{index + 1}
                          </div>
                          <div
                            style={{
                              position: "absolute",
                              top: "8px",
                              right: "8px",
                              background: isActive ? "rgba(16, 185, 129, 0.9)" : "rgba(100, 116, 139, 0.9)",
                              color: "#fff",
                              fontSize: "10px",
                              fontWeight: "bold",
                              padding: "2px 6px",
                              borderRadius: "4px"
                            }}
                          >
                            {isActive ? "✓ সক্রিয়" : "✕ নিষ্ক্রিয়"}
                          </div>
                        </div>

                        {/* কার্ড বডি ও কন্ট্রোল */}
                        <div style={{ padding: "12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                          <div style={{ marginBottom: "10px" }}>
                            <div style={{ fontWeight: "bold", fontSize: "14px", color: "#f8fafc", marginBottom: "4px" }}>
                              {banner.title || "শিরোনামহীন ছবি"}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              আপলোড: {banner.createdAt ? new Date(banner.createdAt).toLocaleDateString('en-GB') : "আজ"}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => setPreviewingBannerImg(banner.image)}
                              style={{
                                flex: 1,
                                padding: "6px",
                                backgroundColor: "#1e293b",
                                color: "#94a3b8",
                                border: "1px solid #334155",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold"
                              }}
                            >
                              👁️ প্রিভিউ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCharityBannerActive(banner.id)}
                              style={{
                                flex: 1,
                                padding: "6px",
                                backgroundColor: isActive ? "#064e3b" : "#334155",
                                color: isActive ? "#6ee7b7" : "#cbd5e1",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold"
                              }}
                            >
                              {isActive ? "অন" : "অফ"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCharityBanner(banner.id)}
                              style={{
                                padding: "6px 10px",
                                backgroundColor: "#dc2626",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "bold"
                              }}
                              title="ছবিটি সম্পূর্ণ মুছে ফেলুন"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ফুলস্ক্রিন ইমেজ প্রিভিউ পপআপ */}
            {previewingBannerImg && (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.85)",
                  backdropFilter: "blur(4px)",
                  zIndex: 9999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px"
                }}
                onClick={() => setPreviewingBannerImg(null)}
              >
                <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
                  <img
                    src={previewingBannerImg}
                    alt="Enlarged Banner"
                    style={{ maxWidth: "100%", maxHeight: "85vh", borderRadius: "10px", border: "2px solid #00e676" }}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewingBannerImg(null)}
                    style={{
                      position: "absolute",
                      top: "-12px",
                      right: "-12px",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: "32px",
                      height: "32px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ৯. রিডিম কোড ম্যানেজমেন্ট ও খাম বোনাস ট্যাব */}
        {activeTab === "redeemCodes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", color: "#f59e0b", fontSize: "18px" }}>
                  🎟️ রিডিম কোড ম্যানেজমেন্ট ও দৈনিক খাম বোনাস (Redeem Codes)
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
                  এখানে আপনি রিডিম কোড যুক্ত বা পরিবর্তন করতে পারবেন। ইউজাররা কোড বসালে সুন্দর খাম আকারে <strong>১০-১২ টাকার</strong> মধ্যে বোনাস পাবে এবং ক্লাইম করতে পারবে। প্যানেল থেকে কোনো কোড ডিলিট করলে তা আর কোনো ইউজার ব্যবহার করতে পারবে না।
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={fetchAllData}
                  style={{ padding: "8px 14px", backgroundColor: "#1e293b", color: "#fff", border: "1px solid #334155", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🔄 রিফ্রেশ
                </button>
              </div>
            </div>

            {/* কোড তৈরির ফর্ম কার্ড */}
            <div style={{ background: "#0b0f19", border: "1px solid #3b476c", borderRadius: "10px", padding: "18px", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 12px 0", color: "#fbbf24", fontSize: "15px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>✨ নতুন রিডিম কোড তৈরি / আপডেট করুন</span>
              </h4>

              <form onSubmit={handleSaveRedeemCode}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "14px" }}>
                  {/* কোড নাম */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "bold" }}>
                      রিডিম কোড (ইংরেজি বড় হাতের অক্ষরের কোড):
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        value={newRedeemCodeInput}
                        onChange={(e) => setNewRedeemCodeInput(e.target.value.toUpperCase())}
                        placeholder="যেমন: DAILY12, NVT10"
                        style={{ flex: 1, padding: "10px", borderRadius: "6px", border: "1px solid #475569", background: "#161d2f", color: "#fbbf24", fontWeight: "bold", fontSize: "14px", letterSpacing: "1px", outline: "none" }}
                        required
                      />
                      <button
                        type="button"
                        onClick={generateRandomDailyCode}
                        style={{ padding: "8px 12px", background: "#334155", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", whiteSpace: "nowrap" }}
                        title="র্যান্ডম কোড তৈরি করুন"
                      >
                        🎲 র‍্যান্ডম
                      </button>
                    </div>
                  </div>

                  {/* বোনাস টাইপ ও রেঞ্জ */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "bold" }}>
                      বোনাসের পরিমাণ নির্ধারণ:
                    </label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#fef08a", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="redeemMode"
                          checked={newRedeemMode === "range_10_12"}
                          onChange={() => setNewRedeemMode("range_10_12")}
                        />
                        <span>🎁 <strong>১০ - ১২ টাকা</strong> র‍্যান্ডম খাম বোনাস (১০, ১১ বা ১২ টাকা পাবে)</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#94a3b8", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="redeemMode"
                          checked={newRedeemMode === "fixed"}
                          onChange={() => setNewRedeemMode("fixed")}
                        />
                        <span>নির্দিষ্ট টাকার পরিমাণ (নিচে লিখুন)</span>
                      </label>
                    </div>
                  </div>

                  {/* ফিক্সড টাকা ইনপুট (যদি ফিক্সড সিলেক্ট থাকে) */}
                  {newRedeemMode === "fixed" && (
                    <div>
                      <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "bold" }}>
                        নির্দিষ্ট টাকা (৳):
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={newRedeemFixedAmount}
                        onChange={(e) => setNewRedeemFixedAmount(e.target.value)}
                        style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #475569", background: "#161d2f", color: "#fff", outline: "none" }}
                      />
                    </div>
                  )}

                  {/* বিবরণী বা নোট */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", color: "#cbd5e1", marginBottom: "6px", fontWeight: "bold" }}>
                      বিবরণী (অপশনাল):
                    </label>
                    <input
                      type="text"
                      value={newRedeemDescription}
                      onChange={(e) => setNewRedeemDescription(e.target.value)}
                      placeholder="যেমন: আজকের টেলিগ্রাম গ্রুপের রিডিম কোড"
                      style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "6px", border: "1px solid #475569", background: "#161d2f", color: "#fff", outline: "none" }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSavingCode}
                  style={{
                    padding: "10px 24px",
                    backgroundColor: isSavingCode ? "#64748b" : "#f59e0b",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    cursor: isSavingCode ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {isSavingCode ? "সেভ হচ্ছে..." : "💾 রিডিম কোড সেভ করুন"}
                </button>
              </form>
            </div>

            {/* বর্তমান সক্রিয় রিডিম কোড তালিকা */}
            <div style={{ background: "#0b0f19", border: "1px solid #3b476c", borderRadius: "10px", padding: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, color: "#fff", fontSize: "15px" }}>
                  📋 বর্তমান সক্রিয় ও সেভ করা রিডিম কোড ({redeemCodes.length}টি)
                </h4>
              </div>

              {redeemCodes.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
                  এখনো কোনো রিডিম কোড তৈরি করা হয়নি। উপরের ফর্ম থেকে কোড তৈরি করুন।
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2e3856", color: "#94a3b8" }}>
                        <th style={{ padding: "10px" }}>রিডিম কোড</th>
                        <th style={{ padding: "10px" }}>বোনাস রেঞ্জ</th>
                        <th style={{ padding: "10px" }}>বিবরণ</th>
                        <th style={{ padding: "10px" }}>স্ট্যাটাস</th>
                        <th style={{ padding: "10px", textAlign: "right" }}>অ্যাকশন</th>
                      </tr>
                    </thead>
                    <tbody>
                      {redeemCodes.map((item) => (
                        <tr key={item.id || item.code} style={{ borderBottom: "1px solid #1e293b" }}>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontFamily: "monospace", fontSize: "15px", fontWeight: "bold", color: "#fef08a", background: "#1e293b", padding: "3px 8px", borderRadius: "4px", border: "1px solid #475569" }}>
                                {item.code}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (navigator.clipboard) {
                                    navigator.clipboard.writeText(item.code);
                                    setCopiedCodeId(item.code);
                                    setTimeout(() => setCopiedCodeId(""), 2000);
                                  }
                                }}
                                style={{ padding: "3px 8px", background: copiedCodeId === item.code ? "#059669" : "#334155", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                              >
                                {copiedCodeId === item.code ? "✓ কপিড" : "📋 কপি"}
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: "10px", color: "#34d399", fontWeight: "bold" }}>
                            {item.isRange || (item.minAmount && item.maxAmount)
                              ? `১০ - ১২ টাকা (খাম বোনাস)`
                              : `৳${item.amount || 11}`}
                          </td>
                          <td style={{ padding: "10px", color: "#cbd5e1" }}>
                            {item.description || "দৈনিক স্পেশাল লাকি রিডিম কোড"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "12px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                background: item.isActive !== false ? "#064e3b" : "#450a0a",
                                color: item.isActive !== false ? "#a7f3d0" : "#fecaca",
                                border: `1px solid ${item.isActive !== false ? "#059669" : "#dc2626"}`
                              }}
                            >
                              {item.isActive !== false ? "🟢 চালু (Active)" : "🔴 বন্ধ (Inactive)"}
                            </span>
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => handleToggleCodeStatus(item)}
                                style={{ padding: "5px 10px", background: item.isActive !== false ? "#475569" : "#059669", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                              >
                                {item.isActive !== false ? "বন্ধ করুন" : "চালু করুন"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRedeemCode(item.code || item.id)}
                                style={{ padding: "5px 10px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}
                                title="প্যানেল থেকে মুছে ফেলুন (মুছে ফেললে ইউজাররা আর এটি ব্যবহার করতে পারবে না)"
                              >
                                🗑️ ডিলিট
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
