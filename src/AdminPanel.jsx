import React, { useState, useEffect } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, getDoc, query, orderBy, increment } from "firebase/firestore";

const firebaseConfig = {
  authDomain: "novavest-a711c.firebaseapp.com",
  projectId: "novavest-a711c",
  storageBucket: "novavest-a711c.firebasestorage.app",
  messagingSenderId: "826750954477",
  appId: "1:826750954477:web:5cc28ef9c0331520855e4"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const ADMIN_SECRET_KEY = "123456"; 

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [users, setUsers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // সাপোর্ট লিংক স্টেট
  const [supportLink, setSupportLink] = useState("");
  const [telegramLink, setTelegramLink] = useState("");

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
      // ১. ইউজার লিস্ট ফেচ
      const userSnapshot = await getDocs(collection(db, "users"));
      const userList = [];
      userSnapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(userList);

      // ২. উইথড্রল রিকোয়েস্ট ফেচ
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

      // ৩. সাপোর্ট সেটিংস ফেচ
      const settingsDoc = await getDoc(doc(db, "settings", "support"));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        setSupportLink(data.whatsapp || "");
        setTelegramLink(data.telegram || "");
      }

    } catch (error) {
      console.error("ডেটা লোড সমস্যা:", error);
      setStatusMsg("Firestore থেকে ডেটা আনতে সমস্যা হয়েছে।");
    }
    setLoading(false);
  };

  // সাপোর্ট লিংক সেভ করা
  const handleSaveSupport = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "settings", "support"), {
        whatsapp: supportLink,
        telegram: telegramLink,
        updatedAt: new Date()
      }, { merge: true });

      setStatusMsg("✅ কাস্টমার সাপোর্ট লিংক সফলভাবে আপডেট করা হয়েছে!");
    } catch (error) {
      console.error("সাপোর্ট সেভ এরর:", error);
      setStatusMsg("❌ লিংক সেভ করা যায়নি।");
    }
  };

  // উইথড্র স্ট্যাটাস আপডেট (Approve / Reject)
  const handleWithdrawAction = async (withdrawId, userId, amount, action) => {
    try {
      const withdrawRef = doc(db, "withdrawals", withdrawId);
      
      if (action === "approve") {
        await updateDoc(withdrawRef, { status: "Approved" });

        if (userId) {
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, {
            walletBalance: increment(-Number(amount)),
            balance: increment(-Number(amount))
          });
        }
        setStatusMsg("✅ উইথড্র সফলভাবে অ্যাপ্রুভ করা হয়েছে!");
      } else {
        await updateDoc(withdrawRef, { status: "Rejected" });
        setStatusMsg("❌ উইথড্র রিজেক্ট করা হয়েছে।");
      }

      fetchAllData();
    } catch (error) {
      console.error("উইথড্র আপডেট এরর:", error);
      setStatusMsg("উইথড্র স্ট্যাটাস পরিবর্তন করা যায়নি।");
    }
  };

  const handleUpdateAmount = async (e) => {
    e.preventDefault();
    if (!selectedUser || newAmount === "") {
      alert("ইউজার সিলেক্ট করুন এবং অ্যামাউন্ট দিন!");
      return;
    }

    try {
      const userDocRef = doc(db, "users", selectedUser);
      await updateDoc(userDocRef, {
        walletBalance: Number(newAmount),
        balance: Number(newAmount),
        updatedAt: new Date()
      });

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
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto", fontFamily: "sans-serif", color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2e3856", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2>⚙️ Admin Control Panel & Support</h2>
        <button onClick={() => setIsAuthenticated(false)} style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>লগআউট</button>
      </div>

      {statusMsg && <p style={{ padding: "10px", background: "#1b4332", color: "#d8f3dc", borderRadius: "6px", border: "1px solid #2d6a4f", marginBottom: "20px" }}>{statusMsg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
        
        {/* ১. কাস্টমার সাপোর্ট লিংক সেটআপ ফর্ম */}
        <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856" }}>
          <h3>📢 Customer Support Group Links</h3>
          <form onSubmit={handleSaveSupport} style={{ marginTop: "15px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>WhatsApp / Support Group Link:</label>
            <input type="text" placeholder="https://chat.whatsapp.com/..." value={supportLink} onChange={(e) => setSupportLink(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "12px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} />

            <label style={{ display: "block", marginBottom: "6px", fontSize: "14px" }}>Telegram Group / Channel Link:</label>
            <input type="text" placeholder="https://t.me/..." value={telegramLink} onChange={(e) => setTelegramLink(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "6px", border: "1px solid #3b476c", backgroundColor: "#0b0f19", color: "#fff", boxSizing: "border-box" }} />

            <button type="submit" style={{ width: "100%", padding: "12px", backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>লিংক সেভ করুন</button>
          </form>
        </div>

        {/* ২. ইউজার ব্যালেন্স কন্ট্রোল */}
        <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856" }}>
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

        {/* ৩. উইথড্রল রিকোয়েস্ট ম্যানেজমেন্ট */}
        <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856", gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
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

        {/* ৪. ইউজার নেটওয়ার্ক বা রেফারেল ইনফো */}
        <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856", gridColumn: "1 / -1" }}>
          <h3>👥 User Network & Referrals</h3>
          {loading ? <p>লোড হচ্ছে...</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: "220px", overflowY: "auto" }}>
              {users.map((u) => (
                <li key={u.id} style={{ padding: "10px", borderBottom: "1px solid #2e3856", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ color: "#00d2ff" }}>{u.name || u.phone || u.email || "User"}</strong>
                    <span>৳ {u.walletBalance ?? u.balance ?? 0}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#facc15", marginTop: "3px" }}>
                    রেফার করেছে / কার নিচে: {u.referredBy || u.upliner || u.sponsor || "কেউ না (Direct)"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}
