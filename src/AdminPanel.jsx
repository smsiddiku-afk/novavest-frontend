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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [activeTab, setActiveTab] = useState("deposits");

  const [users, setUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState(""); 
  const [userFilterTab, setUserFilterTab] = useState("all"); 
  const [showIdRemover, setShowIdRemover] = useState(false); 
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

  const [tier1Percent, setTier1Percent] = useState(6);
  const [tier2Percent, setTier2Percent] = useState(3);
  const [tier3Percent, setTier3Percent] = useState(1);
  const [referralSaving, setReferralSaving] = useState(false);

  const [manualUserIdToDelete, setManualUserIdToDelete] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [copiedId, setCopiedId] = useState("");

  const [charityBannersList, setCharityBannersList] = useState([]);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerTitleInput, setBannerTitleInput] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [bannerPreviewSrc, setBannerPreviewSrc] = useState("");
  const [bannerSelectedFile, setBannerSelectedFile] = useState(null);
  const [bannerDragActive, setBannerDragActive] = useState(false);
  const [previewingBannerImg, setPreviewingBannerImg] = useState(null);
  const bannerFileInputRef = useRef(null);

  const [redeemCodes, setRedeemCodes] = useState([]);
  const [newRedeemCodeInput, setNewRedeemCodeInput] = useState("");
  const [newRedeemMode, setNewRedeemMode] = useState("range_10_12"); 
  const [newRedeemFixedAmount, setNewRedeemFixedAmount] = useState(11);
  const [newRedeemDescription, setNewRedeemDescription] = useState("");
  const [isSavingCode, setIsSavingCode] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_SECRET_KEY) {
      setIsAuthenticated(true);
      setErrorMsg("");
      fetchAllData();
    } else {
      setErrorMsg("ভুল পাসওয়ার্ড! আবার লিখুন।");
    }
  };

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

  const mergeAndSyncDeposits = async (firestoreList) => {
    try {
      const serverRes = await fetch('/api/admin/deposits');
      if (serverRes.ok) {
        const serverData = await serverRes.json();
        if (serverData && serverData.success && Array.isArray(serverData.deposits)) {
          const mergedMap = new Map();
          firestoreList.forEach((d) => {
            const k = d.id || d.trxId || d.orderNo;
            if (k) {
              const resMethod = resolveDepositMethod(d);
              mergedMap.set(k, { ...d, method: resMethod });
            }
          });
          for (const s of serverData.deposits) {
            const key = s.orderId || s.trxId || s.id;
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
          const list = Array.from(mergedMap.values());
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          return list;
        }
      }
    } catch (_) {}
    return firestoreList;
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

      try {
        await fetch('/api/treasure-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(codeData),
        });
      } catch (srvErr) {
        console.warn('[AdminPanel] Server save code notice:', srvErr);
      }

      const ref = safeDoc("treasure_codes", cleanCode);
      if (ref) {
        await safeSetDoc(ref, codeData, { merge: true });
      }

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
      try {
        await fetch(`/api/treasure-codes/${encodeURIComponent(codeId)}`, {
          method: 'DELETE',
        });
      } catch (srvErr) {
        console.warn('[AdminPanel] Server delete code notice:', srvErr);
      }

      const ref = safeDoc("treasure_codes", codeId);
      if (ref) {
        await deleteDoc(ref);
      }

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
      const depositRef = safeDoc("deposits", cleanDId);
      if (depositRef) {
        await safeSetDoc(depositRef, {
          status: newStatus,
          isApproved: isApprove,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

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
        await updateFirestoreDepositStatus(
          effectiveDocId,
          trxId || cleanDId,
          isApprove ? "completed" : "cancelled",
          numAmount,
          cleanDId
        );

        if (isApprove && numAmount > 0) {
          try {
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

      await deleteFirestoreUserProfile(cleanId, extraDetails);

      const userRef = safeDoc("users", cleanId);
      if (userRef) {
        await safeDeleteDoc(userRef);
      }

      setUsers((prev) => prev.filter((u) => u.id !== cleanId && u.uid !== cleanId && u.memberId !== cleanId));

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

  const filteredUsers = users.filter((u) => {
    const isUserActive = (Array.isArray(u.activeInvestments) && u.activeInvestments.length > 0) || Number(u.totalInvested || 0) > 0;
    if (userFilterTab === "active" && !isUserActive) return false;
    if (userFilterTab === "free" && isUserActive) return false;
    if (userFilterTab === "referral" && !u.canRefer) return false;

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2e3856", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2>⚙️ Admin Control Panel</h2>
        <button onClick={() => setIsAuthenticated(false)} style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>লগআউট</button>
      </div>

      {statusMsg && <p style={{ padding: "10px", background: "#1b4332", color: "#d8f3dc", borderRadius: "6px", border: "1px solid #2d6a4f", marginBottom: "20px" }}>{statusMsg}</p>}

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

      <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856" }}>
        
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
                    {deposits.map((d) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px" }}>
                          <div style={{ fontWeight: "bold", color: "#fff" }}>{d.userName || d.name || d.email || "Customer"}</div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>ID: {d.userId || d.id}</div>
                        </td>
                        <td style={{ padding: "10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "3px" }}>
                            {(() => {
                              const resolved = resolveDepositMethod(d);
                              const isNagad = resolved === 'Nagad';
                              const isRocket = resolved === 'Rocket';
                              return (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const nextMethod = isNagad ? 'bKash' : 'Nagad';
                                    const nextChannel = nextMethod === 'Nagad' ? 'চ্যানেল ১ (Nagad)' : 'চ্যানেল ১ (bKash)';
                                    setDeposits((prev) =>
                                      prev.map((item) =>
                                        item.id === d.id ? { ...item, method: nextMethod, channel: nextChannel } : item
                                      )
                                    );
                                    try {
                                      const tDoc = safeDoc('deposits', d.id);
                                      if (tDoc) {
                                        safeSetDoc(tDoc, { method: nextMethod, channel: nextChannel, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
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
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    border: "none",
                                    cursor: "pointer",
                                    background: isNagad ? "#f7941d" : isRocket ? "#8c3494" : "#e2136e",
                                    color: isNagad ? "#000" : "#fff",
                                  }}
                                >
                                  {isNagad ? 'Nagad (নগদ)' : isRocket ? 'Rocket (রকেট)' : 'bKash (বিকাশ)'}
                                </button>
                              );
                            })()}
                            <span style={{ fontSize: "11px", color: "#6ee7b7", background: "rgba(16, 185, 129, 0.15)", padding: "1px 6px", borderRadius: "3px" }}>
                              {String(d.channel || '').toLowerCase().includes('nekpay') || !d.channel
                                ? (resolveDepositMethod(d) === 'Nagad' ? "চ্যানেল ১ (Nagad)" : "চ্যানেল ১ (bKash)")
                                : d.channel}
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
                            padding
