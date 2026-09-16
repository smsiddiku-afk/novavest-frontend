import React, { useState } from 'react';
import {
  Download,
  CheckCircle2,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  Share,
  PlusSquare,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import { Language } from '../types';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  const { isInstalled, isIOS, canInstall, triggerInstall } = usePWAInstall();
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'manual'>('idle');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  if (!isOpen) return null;

  const handleOneClickInstall = async () => {
    setInstallStatus('installing');
    if (canInstall) {
      const accepted = await triggerInstall();
      if (accepted) {
        setInstallStatus('success');
        return;
      }
    }
    // If browser didn't prompt or was dismissed, show guided instant setup
    setInstallStatus('manual');
  };

  return (
    <div
      id="app-download-page"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#041b14] flex flex-col text-slate-100 animate-in fade-in duration-200 font-sans"
    >
      {/* Sticky Header */}
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
              <span>{isBn ? 'NVT মোবাইল অ্যাপ ইনস্টলার' : 'NVT Mobile App Installer'}</span>
            </h1>
            <p className="text-[11px] text-emerald-300/80">
              {isBn ? 'সরাসরি ফোনে ইনস্টল করুন (কোন ফাইল ফেইল্ড এরর ছাড়া)' : 'Install Directly to Home Screen (100% Error-Free)'}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
          v2.4.2 Official
        </span>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-5">
        {/* Top App Card */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-6 text-center shadow-xl space-y-3">
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

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>NVT ENERGY OFFICIAL APP</span>
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </h2>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {isBn
              ? 'মোবাইল ব্রাউজার বা ফোনে কোনো ফাইল ডাউনলোড ফেইল্ড সমস্যা ছাড়া সরাসরি আপনার হোম স্ক্রিনে অফিসিয়াল অ্যাপ যুক্ত করুন।'
              : 'Add the official certified mobile app straight to your phone home screen without any APK download or parse error issues.'}
          </p>
        </div>

        {/* Why Install Failed Notice & Solution Banner */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{isBn ? '“App not installed” বা “Install Failed” সমস্যার সমাধান:' : 'Why APK install fails & Easy Solution:'}</span>
          </div>
          <p className="text-[12px] text-slate-200 leading-relaxed">
            {isBn
              ? 'সাধারণ ব্রাউজারে নিরাপত্তা বিধিনিষেধ ও আনঅথরাইজড সোর্স ব্লকের কারণে এপিকে ইনস্টলেশন ফেইল্ড হতে পারে। নিচে দেওয়া "সরাসরি অ্যাপ ইনস্টল করুন" বাটনে চাপলে স্বয়ংক্রিয়ভাবে অফিসিয়াল অ্যাপটি ফোনে ইনস্টল হয়ে যাবে।'
              : 'Due to Android security blocks on raw unsigned APKs, direct installation often fails. Use the instant "Install to Phone" button below for verified 1-click home screen installation.'}
          </p>
        </div>

        {/* Status Card & Action Button */}
        <div className="rounded-3xl bg-[#062c22] border border-emerald-500/30 p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-200 font-medium flex items-center gap-2">
              {isInstalled ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">
                    {isBn ? 'অ্যাপটি ইতিমধ্যেই ইনস্টল করা আছে!' : 'App is Already Installed!'}
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-semibold">
                    {isBn ? 'যাচাইকৃত নিরাপদ প্যাকেজ' : 'Verified Secure Application'}
                  </span>
                </>
              )}
            </span>
            <span className="font-mono font-bold text-emerald-400 text-xs">v2.4.2</span>
          </div>

          {/* Primary Install Button */}
          <button
            type="button"
            onClick={handleOneClickInstall}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#00e676] to-[#00b0ff] hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-98 transition-all"
          >
            <Download className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            <span>{isBn ? 'সরাসরি অ্যাপ ইনস্টল করুন (১-ক্লিক)' : 'Install App to Phone (1-Click)'}</span>
          </button>

          {/* Device Specific Easy Steps */}
          <div className="pt-3 border-t border-emerald-500/20 space-y-3">
            <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'যদি বাটনে কাজ না করে, ১ সেকেন্ডে ইনস্টল করার নিয়ম:' : 'Manual 1-Second Setup Guide:'}</span>
            </h4>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="p-3.5 rounded-2xl bg-[#042018] border border-emerald-500/25 space-y-2 text-xs text-slate-200">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Share className="w-4 h-4" />
                  <span>{isBn ? 'আইফোন / সাফারি ইউজারদের জন্য:' : 'For iPhone / iOS Users:'}</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                  <li>{isBn ? 'সাফারি ব্রাউজারের নিচে থাকা "Share" (শেয়ার) আইকনে চাপ দিন।' : 'Tap the "Share" icon at bottom of Safari.'}</li>
                  <li>
                    {isBn ? (
                      <>
                        তালিকায় নিচে স্ক্রল করে <span className="text-white font-bold">"Add to Home Screen" (হোম স্ক্রিনে যোগ করুন)</span> সিলেক্ট করুন।
                      </>
                    ) : (
                      <>
                        Scroll down and tap <span className="text-white font-bold">"Add to Home Screen"</span>.
                      </>
                    )}
                  </li>
                  <li>{isBn ? 'উপরে "Add" চাপলেই আপনার আইফোনে অ্যাপ তৈরি হয়ে যাবে!' : 'Tap "Add" at the top right to complete.'}</li>
                </ol>
              </div>
            ) : (
              /* Android Chrome Instructions */
              <div className="p-3.5 rounded-2xl bg-[#042018] border border-emerald-500/25 space-y-2 text-xs text-slate-200">
                <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <MoreVertical className="w-4 h-4" />
                  <span>{isBn ? 'অ্যান্ড্রয়েড / ক্রোম ইউজারদের জন্য:' : 'For Android / Chrome Users:'}</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-300">
                  <li>
                    {isBn ? (
                      <>
                        ক্রোম ব্রাউজারের উপরে ডানদিকের <span className="text-white font-bold">তিনটি ডট (⋮) মেনু</span> আইকনে চাপ দিন।
                      </>
                    ) : (
                      <>
                        Tap the <span className="text-white font-bold">three dots (⋮) menu</span> at top right of Chrome.
                      </>
                    )}
                  </li>
                  <li>
                    {isBn ? (
                      <>
                        মেনু থেকে <span className="text-white font-bold">"Install app"</span> অথবা <span className="text-white font-bold">"Add to Home screen"</span> চাপুন।
                      </>
                    ) : (
                      <>
                        Select <span className="text-white font-bold">"Install app"</span> or <span className="text-white font-bold">"Add to Home screen"</span>.
                      </>
                    )}
                  </li>
                  <li>{isBn ? 'কনফার্ম করলেই কোনো ফেইল্ড এরর ছাড়াই অ্যাপটি সরাসরি ফোনে ইনস্টল হয়ে যাবে।' : 'Confirm and the app is installed directly on your home screen!'}</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Specs & Security */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center text-slate-400">
          <div className="p-2.5 rounded-2xl bg-[#062c22] border border-emerald-500/20">
            <span className="block text-slate-400 text-[11px]">{isBn ? 'আকার' : 'Size'}</span>
            <span className="font-semibold text-slate-100 font-mono">1.2 MB (Ultra Fast)</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#062c22] border border-emerald-500/20">
            <span className="block text-slate-400 text-[11px]">{isBn ? 'সংস্করণ' : 'Version'}</span>
            <span className="font-semibold text-slate-100 font-mono">v2.4.2 Official</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-[#062c22] border border-emerald-500/20">
            <span className="block text-slate-400 text-[11px]">{isBn ? 'নিরাপত্তা' : 'Security'}</span>
            <span className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isBn ? 'যাচাইকৃত' : 'Certified'}</span>
            </span>
          </div>
        </div>

        {/* Back button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-[#042018] hover:bg-[#072c21] text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer"
        >
          {isBn ? 'প্রোফাইলে ফিরে যান' : 'Return to Profile'}
        </button>
      </main>
    </div>
  );
};
