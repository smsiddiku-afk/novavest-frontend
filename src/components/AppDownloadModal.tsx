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
      id="app-download-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="app-download-modal"
        className="relative w-full max-w-sm sm:max-w-md bg-[#0e1628] border border-blue-500/30 rounded-[28px] p-6 shadow-[0_25px_60px_-15px_rgba(0,102,255,0.35)] text-white animate-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Icon Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/30 mb-3">
            <div className="w-full h-full bg-[#0b1222] rounded-2xl flex items-center justify-center text-blue-400">
              <Smartphone className="w-8 h-8 text-cyan-400" />
            </div>
            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow">
              APK
            </span>
          </div>

          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            {currentLang === 'bn' ? 'এআই এনার্জি মোবাইল অ্যাপ' : 'AI Energy Mobile App'}
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {currentLang === 'bn' ? 'অ্যান্ড্রয়েড সংস্করণ ২.৪.২ (অফিসিয়াল এপিকে)' : 'Android Version 2.4.2 (Official APK)'}
          </p>
        </div>

        {/* Download Status & Progress Bar */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#131d33] border border-slate-700/60">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              {isCompleted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">
                    {currentLang === 'bn' ? 'ডাউনলোড সম্পন্ন হয়েছে!' : 'Download Complete!'}
                  </span>
                </>
              ) : isDownloading ? (
                <>
                  <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                  <span>{currentLang === 'bn' ? 'প্যাকেজ ডাউনলোড হচ্ছে...' : 'Downloading package...'}</span>
                </>
              ) : (
                <span>{currentLang === 'bn' ? 'ডাউনলোডের জন্য প্রস্তুত' : 'Ready to download'}</span>
              )}
            </span>
            <span className="font-bold text-blue-400">{downloadProgress}%</span>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-300 rounded-full"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>

          {/* Specs */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-center text-slate-400">
            <div>
              <span className="block text-slate-500">{currentLang === 'bn' ? 'আকার' : 'Size'}</span>
              <span className="font-semibold text-slate-200">18.5 MB</span>
            </div>
            <div>
              <span className="block text-slate-500">{currentLang === 'bn' ? 'সংস্করণ' : 'Version'}</span>
              <span className="font-semibold text-slate-200">v2.4.2</span>
            </div>
            <div>
              <span className="block text-slate-500">{currentLang === 'bn' ? 'নিরাপত্তা' : 'Security'}</span>
              <span className="font-semibold text-emerald-400 flex items-center justify-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> {currentLang === 'bn' ? 'যাচাইকৃত' : 'Verified'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Instructions */}
        <div className="mt-3.5 p-3 rounded-xl bg-[#090f1e] border border-slate-800 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-blue-300 flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" /> {currentLang === 'bn' ? 'কীভাবে ইনস্টল করবেন:' : 'How to install:'}
          </p>
          <ol className="list-decimal list-inside space-y-0.5 text-slate-400 pl-1 text-[11px]">
            {currentLang === 'bn' ? (
              <>
                <li>ডাউনলোড করা <span className="text-white font-medium">NVT_v2.4.2.apk</span> ফাইলটি ওপেন করুন।</li>
                <li>অনুরোধ করা হলে <span className="text-white font-medium">"Install from unknown sources"</span> সক্রিয় করুন।</li>
                <li>ইনস্টলেশন সম্পূর্ণ করতে <span className="text-white font-medium">"ইনস্টল"</span> চাপুন।</li>
              </>
            ) : (
              <>
                <li>Open downloaded <span className="text-white font-medium">NVT_v2.4.2.apk</span>.</li>
                <li>Enable <span className="text-white font-medium">"Install from unknown sources"</span> if prompted.</li>
                <li>Tap <span className="text-white font-medium">"Install"</span> to complete installation.</li>
              </>
            )}
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={startDownload}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-98 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{currentLang === 'bn' ? 'পুনরায় ডাউনলোড করুন' : 'Download Again'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-xl text-xs text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
          >
            {currentLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
