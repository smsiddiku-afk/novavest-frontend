import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, increment } from "firebase/firestore";
import { db, updateFirestoreDepositStatus, sanitizeFirestoreData, cleanDocId } from "./lib/firebase";
import { distributeReferralDepositCommissions } from "./utils/referralService";
import {
  getLivePackages,
  updatePackageInFirestore,
  deletePackageFromFirestore,
  resetPackagesToDefault,
  DEFAULT_INVESTMENT_PACKAGES
} from "./utils/packageService";

const ADMIN_SECRET_KEY = "123456"; 

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // অ্যাক্টিভ ট্যাব স্টেট ('deposits' | 'withdrawals' | 'investments' | 'balance' | 'support' | 'users')
  const [activeTab, setActiveTab] = useState("deposits");

  const [users, setUsers] = useState([]);
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

      const settingsDoc = await getDoc(doc(db, "settings", "support"));
      if (settingsDoc.exists()) {
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
      await setDoc(doc(db, "settings", "support"), supportData, { merge: true });

      setStatusMsg("✅ কাস্টমার সাপোর্ট ও Crisp সেটিংস সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      console.error("সাপোর্ট সেভ এরর:", error);
      setStatusMsg("❌ সেটিংস সেভ করা যায়নি।");
    }
  };

  const handleWithdrawAction = async (withdrawId, userId, amount, action) => {
    const cleanWId = cleanDocId(withdrawId, '');
    if (!cleanWId) return;
    try {
      const withdrawRef = doc(db, "withdrawals", cleanWId);
      if (action === "approve") {
        await setDoc(withdrawRef, sanitizeFirestoreData({ status: "Approved", updatedAt: new Date().toISOString() }), { merge: true });
        const cleanUId = cleanDocId(userId, '');
        if (cleanUId && !Number.isNaN(Number(amount))) {
          const userRef = doc(db, "users", cleanUId);
          await setDoc(userRef, sanitizeFirestoreData({
            walletBalance: increment(-Number(amount)),
            balance: increment(-Number(amount)),
            updatedAt: new Date().toISOString(),
          }), { merge: true });
        }
        setStatusMsg("✅ উইথড্র সফলভাবে অ্যাপ্রুভ করা হয়েছে!");
      } else {
        await setDoc(withdrawRef, sanitizeFirestoreData({ status: "Rejected", updatedAt: new Date().toISOString() }), { merge: true });
        setStatusMsg("❌ উইথড্র রিজেক্ট করা হয়েছে।");
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
      const depositRef = doc(db, "deposits", cleanDId);
      const isApprove = action === "approve";
      const newStatus = isApprove ? "Approved" : "Rejected";

      await setDoc(depositRef, sanitizeFirestoreData({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }), { merge: true });

      // Synchronize with user's transactions and balance in Firestore
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

      // Also notify backend server so any live polling updates instantly
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
      const userDocRef = doc(db, "users", cleanUId);
      const safeAmount = Number(newAmount) || 0;
      await setDoc(userDocRef, sanitizeFirestoreData({
        walletBalance: safeAmount,
        balance: safeAmount,
        updatedAt: new Date().toISOString()
      }), { merge: true });

      setStatusMsg("✅ সফলভাবে ইউজারের ব্যালেন্স আপডেট হয়েছে!");
      setNewAmount("");
      fetchAllData();
    } catch (error) {
      console.error("আপডেট এরর:", error);
      setStatusMsg("❌ অ্যামাউন্ট আপডেট করা যায়নি।");
    }
  };

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
        <button onClick={() => setActiveTab("users")} style={{ padding: "10px 18px", borderRadius: "6px", border: "none", cursor: "pointer", fontWeight: "bold", background: activeTab === "users" ? "#00d2ff" : "#161d2f", color: activeTab === "users" ? "#000" : "#fff" }}>👥 ইউজার ও নেটওয়ার্ক</button>
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
                      <th style={{ padding: "10px" }}>ইউজার নাম</th>
                      <th style={{ padding: "10px" }}>মোবাইল নম্বর</th>
                      <th style={{ padding: "10px" }}>অ্যামাউন্ট</th>
                      <th style={{ padding: "10px" }}>স্ট্যাটাস</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px" }}>{w.userName || w.name || "N/A"}</td>
                        <td style={{ padding: "10px" }}>{w.mobile || w.phone || w.walletNumber || "N/A"}</td>
                        <td style={{ padding: "10px", color: "#22c55e", fontWeight: "bold" }}>৳ {w.amount || 0}</td>
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
                          src={packageFormData.image}
                          alt="preview"
                          style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "6px", border: "1px solid #334155" }}
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
                        onClick={() => setPackageFormData({ ...packageFormData, image: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80" })}
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
                              src={pkg.image || "/images/apex-helios-solar.jpg"}
                              alt={pkg.nameEn}
                              style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1px solid #334155" }}
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

        {/* ৪. সাপোর্ট লিংক ও Crisp লাইভ চ্যাট ট্যাব */}
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

        {/* ৫. ইউজার ও নেটওয়ার্ক ট্যাব */}
        {activeTab === "users" && (
          <div>
            <h3>👥 User Network & Referrals</h3>
            {loading ? <p>লোড হচ্ছে...</p> : (
              <ul style={{ listStyle: "none", padding: 0, margin: "15px 0 0 0", maxHeight: "400px", overflowY: "auto" }}>
                {users.map((u) => (
                  <li key={u.id} style={{ padding: "12px", borderBottom: "1px solid #2e3856", fontSize: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong style={{ color: "#00d2ff" }}>{u.name || u.phone || u.email || "User"}</strong>
                      <span>৳ {u.walletBalance ?? u.balance ?? 0}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "#facc15", marginTop: "4px" }}>
                      রেফার করেছে / কার নিচে: {u.referredBy || u.upliner || u.sponsor || "কেউ না (Direct)"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
