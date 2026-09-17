import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  FileCheck,
  AlertCircle,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { Language } from '../types';
import { downloadNvtApk } from '../utils/appDownloader';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: Language;
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  currentLang = 'en',
}) => {
  const isBn = currentLang === 'bn';
  const [downloadCount, setDownloadCount] = useState(1);
  const [hasTriggered, setHasTriggered] = useState(false);

  // Automatically trigger APK download upon opening
  useEffect(() => {
    if (isOpen && !hasTriggered) {
      setHasTriggered(true);
      downloadNvtApk();
    }
    if (!isOpen) {
      setHasTriggered(false);
    }
  }, [isOpen, hasTriggered]);

  if (!isOpen) return null;

  const handleManualDownload = () => {
    downloadNvtApk();
    setDownloadCount((prev) => prev + 1);
  };

  return (
    <div
      id="app-download-page"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#041b14] flex flex-col text-slate-100 animate-in fade-in duration-200 font-sans"
    >
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>{isBn ? 'NVT এনার্জি মোবাইল অ্যাপ ডাউনলোড' : 'NVT Energy Mobile App Download'}</span>
            </h1>
            <p className="text-[11px] text-emerald-300/80">
              {isBn ? 'অফিসিয়াল অ্যান্ড্রয়েড APK ফাইল সরাসরি ডাউনলোড' : 'Official Android APK Package Direct Download'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
          v2.4.2 APK
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-5">
        {/* Top App Card */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-6 text-center shadow-xl space-y-4">
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/30">
            <div className="w-full h-full bg-[#042018] rounded-3xl flex items-center justify-center text-emerald-400 p-3">
              <svg viewBox="0 0 192 192" className="w-full h-full">
                <path d="M106 24 L52 106 L94 106 L86 168 L140 86 L98 86 Z" fill="#00e676" />
              </svg>
            </div>
            <span className="absolute -top-1.5 -right-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-black text-slate-950 shadow">
              OFFICIAL
            </span>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              <span>NVT ENERGY OFFICIAL APK</span>
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </h2>
            <p className="text-xs text-emerald-300/90 mt-1 font-mono">
              NVT_Energy_v2.4.2.apk (1.6 MB)
            </p>
          </div>

          {/* Download Trigger Status Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{isBn ? 'APK ফাইল ডাউনলোড শুরু হয়েছে' : 'APK File Download Started'}</span>
          </div>
        </div>

        {/* Action Button: Re-Download / Direct Download */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-200 font-semibold flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'অ্যান্ড্রয়েড ইনস্টলেশন ফাইল (APK)' : 'Android Package (APK)'}</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold text-xs">1.6 MB • v2.4.2</span>
          </div>

          <button
            id="download-apk-direct-btn"
            type="button"
            onClick={handleManualDownload}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00e676] to-[#00b0ff] hover:brightness-110 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-98 transition-all"
          >
            <Download className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <span>
              {isBn
                ? downloadCount > 1
                  ? 'পুনরায় APK ডাউনলোড করুন'
                  : 'ডাউনলোড APK (সরাসরি ডাউনলোড)'
                : downloadCount > 1
                ? 'Download APK Again'
                : 'Download APK Now'}
            </span>
          </button>

          <p className="text-[11px] text-center text-slate-400">
            {isBn
              ? 'ডাউনলোড স্বয়ংক্রিয়ভাবে শুরু না হলে উপরের সবুজ বাটনে চাপুন।'
              : 'If download does not begin automatically, tap the button above.'}
          </p>
        </div>

        {/* How to Install APK on Phone Guide */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-3.5">
          <h3 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>{isBn ? 'ফোনে APK ফাইল ইনস্টল করার সহজ নিয়ম:' : 'How to Install APK on Android:'}</span>
          </h3>

          <div className="space-y-2.5 text-xs text-slate-200">
            <div className="p-3 rounded-xl bg-[#042018] border border-emerald-500/20 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                ১
              </span>
              <div>
                <p className="font-semibold text-white">
                  {isBn ? 'ডাউনলোড ফাইল ওপেন করুন' : 'Open Downloaded File'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isBn
                    ? 'ডাউনলোড শেষ হলে ফোনের নোটিফিকেশন বার থেকে NVT_Energy_v2.4.2.apk ফাইলে ক্লিক করুন।'
                    : 'When download completes, tap the notification or open NVT_Energy_v2.4.2.apk from Downloads.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#042018] border border-emerald-500/20 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                ২
              </span>
              <div>
                <p className="font-semibold text-white">
                  {isBn ? 'অনুমতি দিন (Allow Permission)' : 'Allow Unknown Sources'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isBn
                    ? 'যদি "Blocked by Play Protect" বা "Install unknown apps" চায়, Settings-এ গিয়ে "Allow from this source" চালু করুন।'
                    : 'If prompted, enable "Allow from this source" in your phone Settings.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#042018] border border-emerald-500/20 flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                ৩
              </span>
              <div>
                <p className="font-semibold text-white">
                  {isBn ? 'ইনস্টল সম্পন্ন করুন' : 'Complete Installation'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isBn
                    ? '"Install" বাটনে চাপুন। সফলভাবে ইনস্টল হওয়ার পর অ্যাপটি ওপেন করে লগইন করুন।'
                    : 'Tap "Install". Once finished, open the official app and log in.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Verification Details */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center text-slate-400">
          <div className="p-2.5 rounded-2xl bg-[#062c22] border border-emerald-500/20">
            <span className="block text-slate-400 text-[11px]">{isBn ? 'ফাইল সাইজ' : 'Size'}</span>
            <span className="font-semibold text-slate-100 font-mono">1.6 MB</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#062c22] border border-emerald-500/20">
            <span className="block text-slate-400 text-[11px]">{isBn ? 'ভার্সন' : 'Version'}</span>
            <span className="font-semibold text-slate-100 font-mono">v2.4.2 Official</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#062c22] border border-emerald-500/20">
            <span className="block text-slate-400 text-[11px]">{isBn ? 'নিরাপত্তা' : 'Security'}</span>
            <span className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isBn ? '১০০% নিরাপদ' : '100% Safe'}</span>
            </span>
          </div>
        </div>

        {/* Return Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#042018] hover:bg-[#072c21] text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
        >
          {isBn ? 'ফিরে যান' : 'Close'}
        </button>
      </main>
    </div>
  );
};
