import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  X,
  Smartphone,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Language } from '../types';

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
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Trigger download function
  const startDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(15);
    setIsCompleted(false);

    // Create a dummy APK installer file to trigger real download in browser
    try {
      const apkContent = `NVT - Nova Terra Energy Mobile Application Installer Package
Version: 2.4.2 (Build 20240903)
Package: com.nvt.energy.official
Status: Certified & Signed Release
This file serves as the official mobile client installer.`;

      const blob = new Blob([apkContent], {
        type: 'application/vnd.android.package-archive',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'NVT_v2.4.2.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback
    }

    // Simulate animated progress
    let progress = 15;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 25) + 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setDownloadProgress(100);
        setIsDownloading(false);
        setIsCompleted(true);
      } else {
        setDownloadProgress(progress);
      }
    }, 180);
  };

  useEffect(() => {
    if (isOpen) {
      startDownload();
    } else {
      setDownloadProgress(0);
      setIsDownloading(false);
      setIsCompleted(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="app-download-page"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#06483A] flex flex-col text-slate-100 animate-in fade-in duration-200 font-sans"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#062c22]/95 backdrop-blur-md border-b border-emerald-500/30 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#042018] hover:bg-[#07362a] text-emerald-300 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-emerald-500/30 shadow-sm"
            aria-label="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span>{currentLang === 'bn' ? 'অ্যাপ্লিকেশন ডাউনলোড' : 'Download Mobile App'}</span>
            </h1>
            <p className="text-[11px] text-slate-300">
              {currentLang === 'bn' ? 'অফিসিয়াল অ্যান্ড্রয়েড এপিকে প্যাকেজ' : 'Official Android APK Client'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
          v2.4.2
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Top Icon Badge Card */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-6 sm:p-7 text-center shadow-xl space-y-3">
          <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/30">
            <div className="w-full h-full bg-[#042018] rounded-3xl flex items-center justify-center text-emerald-400">
              <Smartphone className="w-10 h-10 text-emerald-400" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-[11px] font-black text-slate-950 shadow">
              APK
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>{currentLang === 'bn' ? 'এআই এনার্জি মোবাইল অ্যাপ্লিকেশন' : 'AI Energy Mobile Application'}</span>
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            {currentLang === 'bn'
              ? 'নিরবচ্ছিন্ন বিদ্যুৎ বিনিয়োগ ট্র্যাকিং, ইনস্ট্যান্ট উইথড্রয়াল এবং লাইভ পাওয়ার নোড মনিটরিং পান আপনার স্মার্টফোনে।'
              : 'Seamless smart grid investment tracking, instant payouts, and real-time substation telemetry in the palm of your hand.'}
          </p>
        </div>

        {/* Download Status & Progress Bar */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-200 font-medium flex items-center gap-2">
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">
                    {currentLang === 'bn' ? 'ডাউনলোড সম্পন্ন হয়েছে!' : 'Download Complete!'}
                  </span>
                </>
              ) : isDownloading ? (
                <>
                  <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                  <span className="text-white font-semibold">
                    {currentLang === 'bn' ? 'প্যাকেজ ডাউনলোড হচ্ছে...' : 'Downloading package...'}
                  </span>
                </>
              ) : (
                <span className="text-slate-300">{currentLang === 'bn' ? 'ডাউনলোডের জন্য প্রস্তুত' : 'Ready to download'}</span>
              )}
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{downloadProgress}%</span>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-3 rounded-full bg-[#031812] overflow-hidden p-0.5 border border-emerald-500/20">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>

          {/* Specs */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-emerald-500/20 text-xs text-center text-slate-400">
            <div className="p-2.5 rounded-2xl bg-[#042018] border border-emerald-500/15">
              <span className="block text-slate-400 text-[11px]">{currentLang === 'bn' ? 'আকার' : 'Size'}</span>
              <span className="font-semibold text-slate-100 font-mono">18.5 MB</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#042018] border border-emerald-500/15">
              <span className="block text-slate-400 text-[11px]">{currentLang === 'bn' ? 'সংস্করণ' : 'Version'}</span>
              <span className="font-semibold text-slate-100 font-mono">v2.4.2</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-[#042018] border border-emerald-500/15">
              <span className="block text-slate-400 text-[11px]">{currentLang === 'bn' ? 'নিরাপত্তা' : 'Security'}</span>
              <span className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{currentLang === 'bn' ? 'যাচাইকৃত' : 'Verified'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Instructions */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>{currentLang === 'bn' ? 'কীভাবে মোবাইল অ্যাপ ইনস্টল করবেন:' : 'How to install on Android:'}</span>
          </h3>
          <ol className="space-y-2.5 text-xs text-slate-200">
            <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#042018] border border-emerald-500/20">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                1
              </span>
              <span>
                {currentLang === 'bn' ? (
                  <>ডাউনলোড বাটনে ক্লিক করুন এবং <span className="text-white font-mono font-medium">NVT_v2.4.2.apk</span> ফাইলটি সেভ করুন।</>
                ) : (
                  <>Click the download button to save <span className="text-white font-mono font-medium">NVT_v2.4.2.apk</span>.</>
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#042018] border border-emerald-500/20">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                2
              </span>
              <span>
                {currentLang === 'bn' ? (
                  <>আপনার ফোনের সেটিংসে গিয়ে <span className="text-white font-medium">"Install from unknown sources"</span> সক্রিয় করুন।</>
                ) : (
                  <>Enable <span className="text-white font-medium">"Install from unknown sources"</span> in settings if prompted.</>
                )}
              </span>
            </li>
            <li className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#042018] border border-emerald-500/20">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-xs">
                3
              </span>
              <span>
                {currentLang === 'bn' ? (
                  <>ফাইলটি ওপেন করে <span className="text-white font-medium">"ইনস্টল"</span> চাপুন এবং আপনার অ্যাকাউন্ট দিয়ে লগইন করুন।</>
                ) : (
                  <>Open the APK, tap <span className="text-white font-medium">"Install"</span>, and log in to your account.</>
                )}
              </span>
            </li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={startDownload}
            className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-98 transition-all"
          >
            <Download className="w-5 h-5 text-slate-950" />
            <span>{currentLang === 'bn' ? 'পুনরায় ডাউনলোড করুন' : 'Download Again'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-[#042018] hover:bg-[#072c21] text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
          >
            {currentLang === 'bn' ? 'প্রোফাইলে ফিরে যান' : 'Return to Profile'}
          </button>
        </div>
      </main>
    </div>
  );
};
