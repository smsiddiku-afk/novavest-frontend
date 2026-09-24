import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, increment, deleteDoc } from "firebase/firestore";
import { db, updateFirestoreDepositStatus, sanitizeFirestoreData, cleanDocId, safeDoc, safeSetDoc, safeDeleteDoc, deleteFirestoreUserProfile } from "./lib/firebase";
import {
  distributeReferralDepositCommissions,
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

const ADMIN_SECRET_KEY = "123456"; 

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // অ্যাক্টিভ ট্যাব স্টেট ('deposits' | 'withdrawals' | 'investments' | 'balance' | 'support' | 'users')
  const [activeTab, setActiveTab] = useState("deposits");

  const [users, setUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState(""); // ইউজার সার্চ স্টেট
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

  // রেফার বোনাস / কমিশন রেট স্টেট (টায়ার ১, ২, ৩)
  const [tier1Percent, setTier1Percent] = useState(6);
  const [tier2Percent, setTier2Percent] = useState(3);
  const [tier3Percent, setTier3Percent] = useState(1);
  const [referralSaving, setReferralSaving] = useState(false);

  // ইউজার আইডি রিমুভ ও ম্যানেজমেন্ট স্টেট
  const [manualUserIdToDelete, setManualUserIdToDelete] = useState("");
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [copiedId, setCopiedId] = useState("");

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

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const userSnapshot = await getDocs(collection(db, "users"));
      const userList = [];
      userSnapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(userList);

      try {
        const withdrawQuery = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"));
        const withdrawSnap = await getDocs(withdrawQuery);
        const withdrawList = [];
        withdrawSnap.forEach((docSnap) => {
          withdrawList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setWithdrawals(withdrawList);
      } catch (err) {
        const fallbackSnap = await getDocs(collection(db, "withdrawals"));
        const withdrawList = [];
        fallbackSnap.forEach((docSnap) => {
          withdrawList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setWithdrawals(withdrawList);
      }

      try {
        const depositQuery = query(collection(db, "deposits"), orderBy("createdAt", "desc"));
        const depositSnap = await getDocs(depositQuery);
        const depositList = [];
        depositSnap.forEach((docSnap) => {
          depositList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDeposits(depositList);
      } catch (err) {
        const fallbackDepositSnap = await getDocs(collection(db, "deposits"));
        const depositList = [];
        fallbackDepositSnap.forEach((docSnap) => {
          depositList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setDeposits(depositList);
      }

      const sRef = safeDoc("settings", "support");
      const settingsDoc = sRef ? await getDoc(sRef) : null;
      if (settingsDoc && settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSupportLink(data.whatsapp || "");
        setTelegramLink(data.telegram || "");
        if (data.crispWebsiteId) setCrispWebsiteId(data.crispWebsiteId);
        if (data.crispEnabled !== undefined) setCrispEnabled(data.crispEnabled);
        if (data.hotline) setHotline(data.hotline);
        if (data.supportEmail) setSupportEmail(data.supportEmail);
      }

      // ইনভেস্ট প্যাকেজ লোড
      try {
        const pkgList = await getLivePackages();
        setPackages(pkgList);
      } catch (pkgErr) {
        console.warn("প্যাকেজ লোডে সমস্যা:", pkgErr);
      }

      // রেফারেল কমিশন রেট লোড
      try {
        const rates = await loadCommissionRatesFromFirestore();
        if (rates) {
          setTier1Percent(Math.round(rates.tier1 * 100));
          setTier2Percent(Math.round(rates.tier2 * 100));
          setTier3Percent(Math.round(rates.tier3 * 100));
        }
      } catch (rateErr) {
        console.warn("রেফার কমিশন লোডে সমস্যা:", rateErr);
      }

    } catch (error) {
      console.error("ডেটা লোড সমস্যা:", error);
      setStatusMsg("Firestore থেকে ডেটা আনতে সমস্যা হয়েছে।");
    }
    setLoading(false);
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
      dailyReturnPercent: 1.5,
      totalReturnPercent: 45,
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
    const daily = Number(pkg.dailyReturnPercent || 1.5);
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
      dailyReturnPercent: daily,
      totalReturnPercent: Number(pkg.totalReturnPercent || Math.round(daily * days)),
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
      const daily = Number(packageFormData.dailyReturnPercent) || 1.5;
      const total = Number(packageFormData.totalReturnPercent) || Math.round(daily * days);

      const pkgToSave = {
        ...packageFormData,
        id: packageFormData.id.trim() || `plan-${Date.now()}`,
        minInvestmentBdt: bdt,
        minInvestment: bdt,
        minInvestmentUsd: Number(packageFormData.minInvestmentUsd) || Math.round(bdt / 120),
        durationDays: days,
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
      const withdrawRef = safeDoc("withdrawals", cleanWId);
      const cleanUId = cleanDocId(userId, '');
      const numAmount = Number(amount) || 0;

      if (action === "approve") {
        if (withdrawRef) await safeSetDoc(withdrawRef, { status: "Approved", updatedAt: new Date().toISOString() }, { merge: true });
        if (cleanUId) {
          const userWRef = safeDoc("users", cleanUId, "withdrawals", cleanWId);
          if (userWRef) await safeSetDoc(userWRef, { status: "Approved", updatedAt: new Date().toISOString() }, { merge: true });
        }
        setStatusMsg("✅ উইথড্র সফলভাবে অ্যাপ্রুভ করা হয়েছে!");
      } else {
        if (withdrawRef) await safeSetDoc(withdrawRef, { status: "Rejected", updatedAt: new Date().toISOString() }, { merge: true });
        // When rejected, refund the deducted amount back to user's wallet balance
        if (cleanUId && numAmount > 0) {
          const userRef = safeDoc("users", cleanUId);
          if (userRef) {
            await safeSetDoc(userRef, {
              walletBalance: increment(numAmount),
              balance: increment(numAmount),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
          }
          const userWRef = safeDoc("users", cleanUId, "withdrawals", cleanWId);
          if (userWRef) await safeSetDoc(userWRef, { status: "Rejected", updatedAt: new Date().toISOString() }, { merge: true });
        }
        setStatusMsg("❌ উইথড্র রিজেক্ট করা হয়েছে এবং ব্যালেন্স ব্যবহারকারীর ওয়ালেটে ফেরত দেওয়া হয়েছে।");
      }
      fetchAllData();
    } catch (error) {
      console.error("উইথড্র আপডেট এরর:", error);
      setStatusMsg("উইথড্র স্ট্যাটাস পরিবর্তন করা যায়নি।");
    }
  };

  const handleDepositAction = async (depositId, userId, amount, action, trxId) => {
    const cleanDId = cleanDocId(depositId, '');
    if (!cleanDId) return;
    try {
      const depositRef = safeDoc("deposits", cleanDId);
      const isApprove = action === "approve";
      const newStatus = isApprove ? "Approved" : "Rejected";

      if (depositRef) {
        await safeSetDoc(depositRef, {
          status: newStatus,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }

      const cleanUId = cleanDocId(userId, '');
      if (cleanUId) {
        await updateFirestoreDepositStatus(
          cleanUId,
          trxId || cleanDId,
          isApprove ? "completed" : "cancelled",
          Number(amount) || 0
        );

        if (isApprove) {
          try {
            const targetUser = users.find((u) => u.id === userId || u.uid === userId);
            const userRefCode = targetUser?.referralCode || targetUser?.memberId || targetUser?.phone || userId;
            distributeReferralDepositCommissions(userRefCode, Number(amount));
          } catch (commErr) {
            console.warn("Commission distribution notice:", commErr);
          }
        }
      }

      try {
        if (isApprove) {
          await fetch('/api/payments/gateway-callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderNo: depositId,
              trxId: trxId || depositId,
              amount: Number(amount),
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
        setStatusMsg("✅ ডিপোজিট সফলভাবে অনুমোদন (Approve) করা হয়েছে এবং ইউজারের একাউন্টে ব্যালেন্স যোগ হয়েছে!");
      } else {
        setStatusMsg("❌ ভুয়া/ভুল ডিপোজিট বাতিল (Reject) করা হয়েছে এবং ট্রানজেকশনে 'বাতিল' স্ট্যাটাস সেট হয়েছে।");
      }
      fetchAllData();
    } catch (error) {
      console.error("ডিপোজিট আপডেট এরর:", error);
      setStatusMsg("ডিপোজিট স্ট্যাটাস পরিবর্তন করা যায়নি।");
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
  const handleDeleteUser = async (targetUserId, targetUserName = "") => {
    const cleanId = cleanDocId(targetUserId, "");
    if (!cleanId) {
      alert("দয়া করে সঠিক ইউজার আইডি দিন!");
      return;
    }

    const displayName = targetUserName ? `"${targetUserName}" (ID: ${cleanId})` : `ID: "${cleanId}"`;
    const confirmed = window.confirm(
      `⚠️ সতর্কতা!\n\nআপনি কি নিশ্চিতভাবে ইউজার ${displayName}-কে সিস্টেম থেকে রিমুভ (মুছে ফেলতে) চান?\n\nইউজারের একাউন্ট ও ডেটা সম্পূর্ণভাবে ডাটাবেজ থেকে স্থায়ীভাবে মুছে যাবে। এই কাজটি আর পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়!`
    );

    if (!confirmed) return;

    setDeletingUserId(cleanId);
    setStatusMsg("");

    try {
      // ১. Firestore থেকে ইউজার প্রোফাইল ও সংশ্লিষ্ট রেফারেল নোড ডিলিট
      await deleteFirestoreUserProfile(cleanId);

      // ২. সরাসরি fallback হিসেবে users doc ডিলিট কল
      const userRef = safeDoc("users", cleanId);
      if (userRef) {
        await safeDeleteDoc(userRef);
      }

      // ৩. স্টেট থেকে ইউজারটি অবিলম্বে রিমুভ
      setUsers((prev) => prev.filter((u) => u.id !== cleanId && u.uid !== cleanId));

      // ৪. লোকাল স্টোরেজ ক্যাশ থেকে মুছে ফেলা (যদি থাকে)
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const raw = localStorage.getItem("novavest_registered_accounts");
          if (raw) {
            const accs = JSON.parse(raw);
            let updated = false;
            for (const key of Object.keys(accs)) {
              if (accs[key]?.userId === cleanId || accs[key]?.id === cleanId) {
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

      setStatusMsg(`✅ ইউজার ID (${cleanId}) সফলভাবে ডাটাবেজ থেকে রিমুভ (মুছে ফেলা) হয়েছে!`);
      setManualUserIdToDelete("");
    } catch (err) {
      console.error("ইউজার রিমুভ এরর:", err);
      setStatusMsg(`❌ ইউজার মুছে ফেলতে সমস্যা হয়েছে: ${err?.message || "ত্রুটি"}`);
    } finally {
      setDeletingUserId(null);
    }
  };

  // ইউজার ফিল্টার বা সার্চ করার জন্য লজিক
  const filteredUsers = users.filter((u) => {
    const queryStr = userSearchQuery.toLowerCase();
    const name = (u.name || "").toLowerCase();
    const phone = (u.phone || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const id = (u.id || "").toLowerCase();
    return name.includes(queryStr) || phone.includes(queryStr) || email.includes(queryStr) || id.includes(queryStr);
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
        <button onClick={() => setIsAuthenticated(false)} style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>লগআউট</button>
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
                    {deposits.map((d) => (
                      <tr key={d.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px" }}>{d.userName || d.name || d.email || "N/A"}</td>
                        <td style={{ padding: "10px" }}>{d.method || "N/A"} ({d.senderNumber || d.phone || "N/A"})</td>
                        <td style={{ padding: "10px", fontFamily: "monospace", color: "#38bdf8" }}>{d.trxId || d.transactionId || "N/A"}</td>
                        <td style={{ padding: "10px", color: "#22c55e", fontWeight: "bold" }}>৳ {d.amount || 0}</td>
                        <td style={{ padding: "10px" }}>
                          <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px", background: d.status === "Approved" ? "#14532d" : d.status === "Rejected" ? "#7f1d1d" : "#713f12" }}>
                            {d.status || "Pending"}
                          </span>
                        </td>
                        <td style={{ padding: "10px", textAlign: "center" }}>
                          {(!d.status || d.status === "Pending") ? (
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
                          <span style={{ padding: "4px 8px", borderRadius: "4px", fontSize: "12px", background: w.status === "Approved" ? "#14532d" : w.status === "Rejected" ? "#7f1d1d" : "#713f12" }}>
                            {w.status || "Pending"}
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
                      <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#cbd5e1" }}>দৈনিক রিটার্ন (% Daily Return):</label>
                      <input
                        type="number"
                        step="0.05"
                        value={packageFormData.dailyReturnPercent}
                        onChange={(e) => {
                          const daily = Number(e.target.value);
                          const days = Number(packageFormData.durationDays || 30);
                          setPackageFormData({
                            ...packageFormData,
                            dailyReturnPercent: daily,
                            totalReturnPercent: Math.round(daily * days * 10) / 10,
                          });
                        }}
                        placeholder="উদা: 2.5"
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
                    ৳ {packageFormData.minInvestmentBdt} বিনিয়োগে দৈনিক লাভ ৳ {Math.round((Number(packageFormData.minInvestmentBdt) * Number(packageFormData.dailyReturnPercent)) / 100)} টাকা | 
                    মোট {packageFormData.durationDays} দিনে লাভ ৳ {Math.round((Number(packageFormData.minInvestmentBdt) * Number(packageFormData.totalReturnPercent)) / 100)} টাকা 
                    (মোট রিটার্ন: ৳ {Math.round(Number(packageFormData.minInvestmentBdt) + (Number(packageFormData.minInvestmentBdt) * Number(packageFormData.totalReturnPercent)) / 100)})
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
                      const daily = Number(pkg.dailyReturnPercent || 1.5);
                      const days = Number(pkg.durationDays || 30);
                      const total = Number(pkg.totalReturnPercent || Math.round(daily * days));
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
                            <div style={{ color: "#facc15", fontWeight: "bold" }}>{daily}% / দিন</div>
                            <div style={{ fontSize: "12px", color: "#cbd5e1" }}>{days} দিন</div>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ color: "#38bdf8", fontWeight: "bold" }}>{total}%</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>৳ {Math.round((bdt * total) / 100)} লাভ</div>
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
                  <option key={u.id} value={u.id}>{u.name || u.email || u.phone || u.id} (ব্যালেন্স: {u.walletBalance ?? u.balance ?? 0})</option>
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

        {/* ৭. ইউজার ও নেটওয়ার্ক ট্যাব (সার্চ এবং ইউজার আইডি রিমুভ অপশন সহ) */}
        {activeTab === "users" && (
          <div>
            {/* সরাসরি ইউজার আইডি দিয়ে রিমুভ করার কার্ড */}
            <div style={{ background: "rgba(220, 38, 38, 0.08)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "18px" }}>🗑️</span>
                <h4 style={{ margin: 0, color: "#f87171", fontSize: "15px" }}>ইউজার আইডি দিয়ে সরাসরি রিমুভ করুন (User ID Remover)</h4>
              </div>
              <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.5" }}>
                নিচের বক্সে যেকোনো ইউজার আইডি (Firebase UID বা Member ID) পেস্ট করে <strong>&ldquo;ইউজার রিমুভ করুন&rdquo;</strong> বাটনে ক্লিক করলে ইউজারের সম্পূর্ণ ডেটা ডাটাবেজ থেকে স্থায়ীভাবে রিমুভ হয়ে যাবে।
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!manualUserIdToDelete.trim()) {
                    alert("দয়া করে একটি ইউজার আইডি লিখুন বা পেস্ট করুন!");
                    return;
                  }
                  const targetUser = users.find(
                    (u) => u.id === manualUserIdToDelete.trim() || u.uid === manualUserIdToDelete.trim() || u.memberId === manualUserIdToDelete.trim()
                  );
                  handleDeleteUser(manualUserIdToDelete.trim(), targetUser?.name || "");
                }}
                style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}
              >
                <input
                  type="text"
                  placeholder="ইউজার আইডি পেস্ট করুন (যেমন: 8t9Xz1... বা NVT123456)"
                  value={manualUserIdToDelete}
                  onChange={(e) => setManualUserIdToDelete(e.target.value)}
                  style={{
                    flex: "1",
                    minWidth: "260px",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #ef4444",
                    backgroundColor: "#0b0f19",
                    color: "#fff",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="submit"
                  disabled={deletingUserId !== null || !manualUserIdToDelete.trim()}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: deletingUserId ? "#4b5563" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: deletingUserId ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {deletingUserId ? "মুছে ফেলা হচ্ছে..." : "🗑️ ইউজার রিমুভ করুন"}
                </button>
                {manualUserIdToDelete && (
                  <button
                    type="button"
                    onClick={() => setManualUserIdToDelete("")}
                    style={{
                      padding: "10px 14px",
                      background: "#334155",
                      color: "#cbd5e1",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "13px"
                    }}
                  >
                    ক্লিয়ার
                  </button>
                )}
              </form>
            </div>

            {/* ইউজার সার্চ ও হেডার বার */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ margin: 0 }}>👥 ইউজার তালিকা ও নেটওয়ার্ক</h3>
                <span style={{ fontSize: "12px", padding: "3px 8px", background: "#1e293b", color: "#38bdf8", borderRadius: "12px", border: "1px solid #334155" }}>
                  মোট: {users.length} জন
                </span>
              </div>
              <input
                type="text"
                placeholder="🔍 নাম, ফোন বা আইডি দিয়ে সার্চ করুন..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", width: "260px", fontSize: "13px" }}
              />
            </div>

            {loading ? <p>লোড হচ্ছে...</p> : filteredUsers.length === 0 ? (
              <p style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>কোনো ইউজার পাওয়া যায়নি।</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #2e3856", color: "#94a3b8" }}>
                      <th style={{ padding: "10px" }}>নাম / ফোন</th>
                      <th style={{ padding: "10px" }}>ব্যালেন্স</th>
                      <th style={{ padding: "10px" }}>রেফার / আপলাইনার</th>
                      <th style={{ padding: "10px" }}>ইউজার আইডি (UID)</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isBeingDeleted = deletingUserId === u.id;
                      const isIdCopied = copiedId === u.id;

                      return (
                        <tr key={u.id} style={{ borderBottom: "1px solid #1e293b", backgroundColor: isBeingDeleted ? "rgba(220, 38, 38, 0.15)" : "transparent" }}>
                          <td style={{ padding: "10px" }}>
                            <div style={{ fontWeight: "bold", color: "#00d2ff" }}>{u.name || "N/A"}</div>
                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>{u.phone || u.email || "N/A"}</div>
                            {u.memberId && (
                              <div style={{ fontSize: "11px", color: "#64748b" }}>মেম্বার আইডি: {u.memberId}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px", color: "#22c55e", fontWeight: "bold" }}>
                            ৳ {u.walletBalance ?? u.balance ?? 0}
                          </td>
                          <td style={{ padding: "10px", color: "#facc15", fontSize: "13px" }}>
                            {u.referredBy || u.upliner || u.sponsor || "কেউ না (Direct)"}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "12px", fontFamily: "monospace", color: "#94a3b8", wordBreak: "break-all" }}>
                                {u.id}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyId(u.id)}
                                style={{
                                  padding: "2px 6px",
                                  fontSize: "11px",
                                  backgroundColor: isIdCopied ? "#166534" : "#1e293b",
                                  color: isIdCopied ? "#4ade80" : "#94a3b8",
                                  border: "1px solid #334155",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap"
                                }}
                                title="ইউজার আইডি কপি করুন"
                              >
                                {isIdCopied ? "✓ কপিড" : "কপি"}
                              </button>
                            </div>
                          </td>
                          <td style={{ padding: "10px", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id, u.name || u.phone || "")}
                                disabled={isBeingDeleted || deletingUserId !== null}
                                style={{
                                  backgroundColor: isBeingDeleted ? "#475569" : "#dc2626",
                                  color: "#fff",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "4px",
                                  cursor: isBeingDeleted || deletingUserId !== null ? "not-allowed" : "pointer",
                                  fontSize: "12px",
                                  fontWeight: "bold",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.2s ease"
                                }}
                                title="এই ইউজারকে ডাটাবেজ থেকে সম্পূর্ণ মুছে ফেলুন"
                              >
                                {isBeingDeleted ? "মুছছে..." : "🗑️ রিমুভ"}
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

      </div>
    </div>
  );
}
