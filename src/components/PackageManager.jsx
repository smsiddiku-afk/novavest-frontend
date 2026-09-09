import React, { useState, useEffect } from 'react';
import { getLivePackages, updatePackageInFirestore } from '../utils/packageService';

export const PackageManager = () => {
  const [packages, setPackages] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getLivePackages().then(setPackages);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setLoading(true);
    const success = await updatePackageInFirestore(editing);
    if (success) {
      setPackages(prev => prev.map(p => p.id === editing.id ? editing : p));
      setMsg('Update Successful!');
      setEditing(null);
    } else {
      setMsg('Update Failed!');
    }
    setLoading(false);
    setTimeout(() => setMsg(''), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 my-6 text-white shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-emerald-400">Package Control (Edit Packages)</h3>
          <p className="text-xs text-slate-400">Update price, return percentage, and duration live</p>
        </div>
        {msg && <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full">{msg}</span>}
      </div>

      {editing && (
        <form onSubmit={handleSave} className="bg-slate-800/90 border border-emerald-500/40 p-5 rounded-xl mb-6 space-y-4">
          <h4 className="font-bold text-emerald-300 text-sm">Edit: {editing.nameEn} ({editing.id})</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Name (English)</label>
              <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                value={editing.nameEn} onChange={e => setEditing({...editing, nameEn: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Name (Bangla)</label>
              <input className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                value={editing.nameBn} onChange={e => setEditing({...editing, nameBn: e.target.value})} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Price (BDT)</label>
              <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                value={editing.minInvestment} onChange={e => setEditing({...editing, minInvestment: Number(e.target.value)})} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Daily Return (%)</label>
              <input type="number" step="0.1" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                value={editing.dailyReturnPercent} onChange={e => setEditing({...editing, dailyReturnPercent: Number(e.target.value)})} required />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Duration (Days)</label>
              <input type="number" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none"
                value={editing.durationDays} onChange={e => setEditing({...editing, durationDays: Number(e.target.value)})} required />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 px-5 py-2 rounded-lg text-sm font-bold text-white transition">
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="bg-slate-700 px-4 py-2 rounded-lg text-sm text-white">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase">
            <tr>
              <th className="p-3">Package</th>
              <th className="p-3">Price (BDT)</th>
              <th className="p-3">Daily Return</th>
              <th className="p-3">Duration</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {packages.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/50 transition">
                <td className="p-3">
                  <div className="font-semibold text-white">{p.nameEn}</div>
                  <div className="text-xs text-slate-400">{p.nameBn}</div>
                </td>
                <td className="p-3 text-emerald-400 font-bold">BDT {p.minInvestment?.toLocaleString()}</td>
                <td className="p-3 text-amber-400 font-medium">{p.dailyReturnPercent}%</td>
                <td className="p-3 text-slate-300">{p.durationDays} Days</td>
                <td className="p-3 text-right">
                  <button onClick={() => setEditing(p)} className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
