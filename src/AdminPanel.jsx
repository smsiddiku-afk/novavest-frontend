import React, { useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const ADMIN_SECRET_KEY = "123456"; 

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_SECRET_KEY) {
      setIsAuthenticated(true);
      setErrorMsg("");
      fetchUsers();
    } else {
      setErrorMsg("ভুল পাসওয়ার্ড! আবার লিখুন।");
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = [];
      querySnapshot.forEach((docSnap) => {
        userList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setUsers(userList);
    } catch (error) {
      console.error("ডেটা লোড সমস্যা:", error);
      setStatusMsg("Firestore থেকে ডেটা আনতে সমস্যা হয়েছে।");
    }
    setLoading(false);
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

      setStatusMsg("✅ সফলভাবে ব্যালেন্স আপডেট হয়েছে!");
      setNewAmount("");
      fetchUsers();
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
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif", color: "#fff", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2e3856", paddingBottom: "12px", marginBottom: "20px" }}>
        <h2>⚙️ Admin Control Panel</h2>
        <button onClick={() => setIsAuthenticated(false)} style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>লগআউট</button>
      </div>

      {statusMsg && <p style={{ padding: "10px", background: "#1b4332", color: "#d8f3dc", borderRadius: "6px", border: "1px solid #2d6a4f" }}>{statusMsg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
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

        <div style={{ background: "#161d2f", padding: "20px", borderRadius: "10px", border: "1px solid #2e3856" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3>👥 Users List</h3>
            <button onClick={fetchUsers} style={{ padding: "6px 12px", backgroundColor: "#2e3856", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>🔄 রিফ্রেশ</button>
          </div>
          {loading ? <p>লোড হচ্ছে...</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: "350px", overflowY: "auto" }}>
              {users.map((u) => (
                <li key={u.id} style={{ padding: "10px", borderBottom: "1px solid #2e3856", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "14px" }}>{u.name || u.email || u.phone || u.id}</span>
                  <strong style={{ color: "#00d2ff" }}>৳ {u.walletBalance ?? u.balance ?? 0}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
