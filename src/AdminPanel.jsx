import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

// এখানে আপনার গোপন পাসওয়ার্ডটি লিখুন
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
        balance: Number(newAmount),
        updatedAt: new Date()
      });

      setStatusMsg("✅ সফলভাবে অ্যামাউন্ট আপডেট হয়েছে!");
      setNewAmount("");
      fetchUsers();
    } catch (error) {
      console.error("আপডেট এরর:", error);
      setStatusMsg("❌ অ্যামাউন্ট আপডেট করা যায়নি।");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f4f6f8" }}>
        <div style={{ background: "#fff", padding: "30px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)", width: "100%", maxWidth: "360px" }}>
          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>🔐 Admin Login</h2>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="পাসওয়ার্ড দিন"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              style={{ width: "100%", padding: "10px", boxSizing: "border-box", borderRadius: "5px", border: "1px solid #ccc", marginBottom: "10px" }}
              required
            />
            {errorMsg && <p style={{ color: "red", fontSize: "14px", margin: "0 0 10px 0" }}>{errorMsg}</p>}
            <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#007bff", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>লগইন</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "20px" }}>
        <h2>⚙️ Admin Control Panel</h2>
        <button onClick={() => setIsAuthenticated(false)} style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "5px", cursor: "pointer" }}>লগআউট</button>
      </div>

      {statusMsg && <p style={{ padding: "10px", background: "#e8f5e9", color: "#2e7d32", borderRadius: "5px" }}>{statusMsg}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}>
          <h3>💰 Set User Amount</h3>
          <form onSubmit={handleUpdateAmount} style={{ marginTop: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>ইউজার সিলেক্ট করুন:</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "15px", borderRadius: "4px", border: "1px solid #ccc" }} required>
              <option value="">-- ইউজার বেছে নিন --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email || u.id} (ব্যালেন্স: {u.balance ?? 0})</option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: "5px" }}>নতুন ব্যালেন্স / অ্যামাউন্ট:</label>
            <input type="number" placeholder="উদা: 5000" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} style={{ width: "100%", padding: "8px", marginBottom: "15px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }} required />

            <button type="submit" style={{ width: "100%", padding: "10px", backgroundColor: "#28a745", color: "#fff", border: "none", borderRadius: "5px", cursor: "pointer", fontWeight: "bold" }}>সেভ করুন</button>
          </form>
        </div>

        <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #ddd" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3>👥 Users List</h3>
            <button onClick={fetchUsers} style={{ padding: "5px 10px", cursor: "pointer" }}>🔄 রিফ্রেশ</button>
          </div>
          {loading ? <p>লোড হচ্ছে...</p> : (
            <ul style={{ listStyle: "none", padding: 0, maxHeight: "300px", overflowY: "auto" }}>
              {users.map((u) => (
                <li key={u.id} style={{ padding: "8px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
                  <span>{u.name || u.email || u.id}</span>
                  <strong>৳ {u.balance ?? 0}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
