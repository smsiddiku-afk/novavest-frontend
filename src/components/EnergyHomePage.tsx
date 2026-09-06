import React, { useState, useEffect } from 'react';
import {
  Zap,
  ShieldCheck,
  Building2,
  FileText,
  Share2,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  Play,
  TrendingUp,
  Activity,
  Cpu,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertTriangle,
  Download,
  Eye,
  X,
  User,
  Menu,
  Sun,
  BatteryCharging,
  Flame,
  Wind,
  BarChart3,
  Award,
  Globe
} from 'lucide-react';
import { ENERGY_SYSTEMS, HOURLY_GENERATION_DATA, MONTHLY_PRODUCTION_DATA, ENERGY_FAQS } from '../data/energyData';
import { EnergySystem } from '../types';
import { WithdrawModal } from './WithdrawModal';

interface EnergyHomePageProps {
  onGoToProfile: () => void;
  onOpenRecharge?: () => void;
  onOpenWithdraw?: () => void;
  userBalance?: number;
  userName?: string;
  currentLang?: 'en' | 'bn';
}

export function EnergyHomePage({
  onGoToProfile,
  onOpenRecharge,
  onOpenWithdraw,
  userBalance = 12450.0,
  userName = 'John Doe',
  currentLang = 'en',
}: EnergyHomePageProps) {
  // Mobile Nav State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'recharge' | 'withdraw' | 'company' | 'employee' | 'video' | 'system-details' | null
  >(null);
  const [selectedSystem, setSelectedSystem] = useState<EnergySystem | null>(null);

  // Performance Chart State
  const [activePerfTab, setActivePerfTab] = useState<'hourly' | 'monthly'>('hourly');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // FAQ Accordion State
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Referral Copy State
  const [referralCopied, setReferralCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Telemetry Simulation
  const [liveGeneration, setLiveGeneration] = useState(1482.6);
  const [liveEfficiency, setLiveEfficiency] = useState(98.4);
  const [liveFrequency, setLiveFrequency] = useState(50.02);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Ticker simulation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveGeneration((prev) => +(prev + (Math.random() * 0.4 - 0.15)).toFixed(1));
      setLiveFrequency((prev) => +(50.0 + (Math.random() * 0.04 - 0.02)).toFixed(2));
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleCopyReferral = () => {
    const link = 'https://novavest.io/portal/ref?code=SDRL123456';
    navigator.clipboard.writeText(link);
    setReferralCopied(true);
    showToast('ইনভিটেশন লিঙ্ক সফলভাবে কপি করা হয়েছে! (Link Copied)');
    setTimeout(() => setReferralCopied(false), 2500);
  };

  const handleOpenSystem = (sys: EnergySystem) => {
    setSelectedSystem(sys);
    setActiveModal('system-details');
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0d0f] text-slate-100 font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 border border-cyan-500/40 text-cyan-300 text-xs sm:text-sm font-medium rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Glass Navigation Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0b0d0f]/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          {/* Logo & Grid Status Indicator */}
          <div className="flex items-center gap-3">
            <a href="#hero" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 p-[1.5px] shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow">
                <div className="w-full h-full bg-[#0b0d0f] rounded-[10px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/20" />
                </div>
              </div>
              <div>
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  NovaVest <span className="text-cyan-400 font-semibold text-xs tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">ENERGY</span>
                </span>
                <span className="hidden sm:block text-[10px] text-slate-400 font-medium">
                  AI Power Infrastructure
                </span>
              </div>
            </a>

            {/* Grid Node Telemetry Badge */}
            <div className="hidden lg:flex items-center gap-2 ml-4 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Grid Node: <strong className="text-emerald-300 font-mono">{liveFrequency} Hz</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">132kV Substation Online</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-300">
            <a href="#overview" className="hover:text-cyan-400 transition-colors">Overview</a>
            <a href="#energy-systems" className="hover:text-cyan-400 transition-colors">Energy Systems</a>
            <a href="#live-dashboard" className="hover:text-cyan-400 transition-colors">Live Dashboard</a>
            <a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a>
            <a href="#performance" className="hover:text-cyan-400 transition-colors">Analytics</a>
            <a href="#transparency" className="hover:text-cyan-400 transition-colors">Transparency</a>
            <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setActiveModal('recharge')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Recharge</span>
            </button>

            <button
              type="button"
              onClick={onGoToProfile}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{userName}</span>
              <span className="sm:hidden">Profile</span>
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 py-4 bg-[#0b0d0f]/95 border-b border-slate-800 space-y-3 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-xs text-slate-400">
              <span>Grid Synchronization</span>
              <span className="font-mono text-emerald-400">{liveFrequency} Hz Active</span>
            </div>
            <div className="flex flex-col gap-2.5 text-sm font-medium text-slate-200">
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                Overview
              </a>
              <a
                href="#energy-systems"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                Energy Systems
              </a>
              <a
                href="#live-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                Live Dashboard
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                How It Works
              </a>
              <a
                href="#performance"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                Analytics & Performance
              </a>
              <a
                href="#transparency"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                Trust & Transparency
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 px-2 rounded hover:bg-slate-800/50 hover:text-cyan-400"
              >
                FAQ
              </a>
            </div>

            <div className="pt-2 flex gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveModal('recharge');
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 text-center"
              >
                Recharge
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setActiveModal('withdraw');
                }}
                className="flex-1 py-2 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 text-center"
              >
                Withdraw
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 1. Hero Section */}
      <section id="hero" className="relative w-full pt-6 pb-12 sm:pt-10 sm:pb-20 overflow-hidden">
        {/* Subtle cyan ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[350px] bg-gradient-to-b from-cyan-600/10 via-blue-600/5 to-transparent blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-[28px] overflow-hidden border border-slate-800/80 bg-gradient-to-b from-[#111622]/90 to-[#0c1017]/95 shadow-2xl shadow-cyan-950/20">
            {/* Background AI Visualization Image */}
            <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[540px]">
              <img
                src="/src/assets/images/energy_hero_facility_1788465969350.jpg"
                alt="AI-powered electricity generation facility and smart power grid"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center brightness-[0.78] contrast-[1.08]"
              />

              {/* Gradient Overlay for Pristine Readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d0f] via-[#0b0d0f]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d0f]/90 via-[#0b0d0f]/40 to-transparent sm:w-3/4" />

              {/* AI-Generated Visualization Label */}
              <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
                <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-mono font-medium tracking-wide bg-black/60 text-slate-300 border border-white/10 backdrop-blur-md">
                  AI-Generated Visualization
                </span>
              </div>

              {/* Hero Content Overlay */}
              <div className="absolute inset-0 p-6 sm:p-10 lg:p-14 flex flex-col justify-end max-w-3xl">
                {/* Tech Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold w-fit mb-3 sm:mb-4 backdrop-blur-md">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Next-Generation Grid Automation</span>
                </div>

                {/* Main Headline */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-3 sm:mb-4">
                  Powering the Future with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">Intelligent Energy</span>
                </h1>

                {/* Subtitle */}
                <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-2xl mb-6 sm:mb-8 font-normal">
                  Discover AI-powered energy infrastructure and explore modern electricity generation projects.
                </p>

                {/* Call to Actions */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <a
                    href="#energy-systems"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                  >
                    <span>Explore Projects</span>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('how-it-works');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm border border-slate-700/80 hover:border-cyan-500/40 backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Live Infrastructure Telemetry Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 sm:p-5 bg-[#0f131a]/95 border-t border-slate-800/80">
              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Grid Frequency</div>
                  <div className="text-sm font-bold text-white font-mono">{liveFrequency} Hz</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Peak Substation</div>
                  <div className="text-sm font-bold text-white font-mono">132 kV Grid Core</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Carbon Offset</div>
                  <div className="text-sm font-bold text-white font-mono">18,450 MT CO₂e</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">AI Dispatch Latency</div>
                  <div className="text-sm font-bold text-white font-mono">&lt; 18 ms Telemetry</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Quick Action Section (6 modern cards) */}
      <section id="quick-actions" className="w-full py-6 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Portal Navigation</span>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Quick Action Center</h2>
            </div>
            <span className="text-xs text-slate-400 hidden sm:block">Direct operational & management shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* 1. Recharge */}
            <button
              type="button"
              onClick={() => setActiveModal('recharge')}
              className="group p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 hover:bg-[#161c28] border border-slate-800/80 hover:border-cyan-500/40 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 group-hover:border-cyan-400 group-hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 transition-colors">
                <ArrowDownToLine className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Recharge
              </span>
              <span className="text-[11px] text-slate-400 mt-1">Add Allocation</span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* 2. Withdraw */}
            <button
              type="button"
              onClick={() => setActiveModal('withdraw')}
              className="group p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 hover:bg-[#161c28] border border-slate-800/80 hover:border-blue-500/40 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 group-hover:border-blue-400 group-hover:bg-blue-500/20 flex items-center justify-center text-blue-400 mb-3 transition-colors">
                <ArrowUpFromLine className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                Withdraw
              </span>
              <span className="text-[11px] text-slate-400 mt-1">Payout Earnings</span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* 3. Company Profile */}
            <button
              type="button"
              onClick={() => setActiveModal('company')}
              className="group p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 hover:bg-[#161c28] border border-slate-800/80 hover:border-emerald-500/40 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 group-hover:border-emerald-400 group-hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 transition-colors">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Company Profile
              </span>
              <span className="text-[11px] text-slate-400 mt-1">Corporate & Legal</span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* 4. Employee Guidelines */}
            <button
              type="button"
              onClick={() => setActiveModal('employee')}
              className="group p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 hover:bg-[#161c28] border border-slate-800/80 hover:border-amber-500/40 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 group-hover:border-amber-400 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-400 mb-3 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                Employee Guidelines
              </span>
              <span className="text-[11px] text-slate-400 mt-1">SOP & Ethics</span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* 5. New Projects */}
            <a
              href="#energy-systems"
              className="group p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 hover:bg-[#161c28] border border-slate-800/80 hover:border-purple-500/40 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center text-center relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 group-hover:border-purple-400 group-hover:bg-purple-500/20 flex items-center justify-center text-purple-400 mb-3 transition-colors">
                <Layers className="w-6 h-6" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                New Projects
              </span>
              <span className="text-[11px] text-slate-400 mt-1">4 Active Systems</span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>

            {/* 6. Invitation Link */}
            <button
              type="button"
              onClick={handleCopyReferral}
              className="group p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 hover:bg-[#161c28] border border-slate-800/80 hover:border-pink-500/40 shadow-lg shadow-black/40 transition-all duration-300 flex flex-col items-center text-center cursor-pointer relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 group-hover:border-pink-400 group-hover:bg-pink-500/20 flex items-center justify-center text-pink-400 mb-3 transition-colors">
                {referralCopied ? <Check className="w-6 h-6 text-emerald-400" /> : <Share2 className="w-6 h-6" />}
              </div>
              <span className="text-xs sm:text-sm font-bold text-white group-hover:text-pink-300 transition-colors">
                Invitation Link
              </span>
              <span className="text-[11px] text-slate-400 mt-1">
                {referralCopied ? 'Copied!' : 'Copy Code'}
              </span>
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Live Energy Dashboard */}
      <section id="live-dashboard" className="w-full py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Real-Time SCADA Telemetry</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Live Energy Dashboard
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-1">
              Synchronized operational telemetry from all regional electricity generation facilities and storage substations.
            </p>
          </div>

          {/* 5 Core Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
            {/* Metric 1 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Electricity Generated Today</span>
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono flex items-baseline gap-1">
                {liveGeneration} <span className="text-xs font-sans text-cyan-400">MWh</span>
              </div>
              <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>+6.4% above baseline</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Active Energy Systems</span>
                <Cpu className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                18 <span className="text-xs font-sans text-blue-400">Plants</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                100% interconnected
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Total Generation Capacity</span>
                <Activity className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                3.4 <span className="text-xs font-sans text-indigo-400">GW</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Grid rated maximum
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Active Projects</span>
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                14 <span className="text-xs font-sans text-purple-400">Sites</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                4 expansion phases
              </div>
            </div>

            {/* Metric 5 */}
            <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">System Efficiency</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {liveEfficiency}%
              </div>
              <div className="mt-2 text-[11px] text-emerald-400">
                Optimal heat & inverter rate
              </div>
            </div>
          </div>

          {/* Interactive Production Line Chart */}
          <div className="p-5 sm:p-7 rounded-2xl bg-[#12161f]/90 border border-slate-800/90 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <span>24-Hour Electricity Generation & Load Dispatch</span>
                </h3>
                <p className="text-xs text-slate-400">Hourly output in Megawatt-hours (MWh) vs Grid Load Curve</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-cyan-400 rounded-full" />
                  <span className="text-slate-300">Generation (MWh)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-blue-500 rounded-full border border-dashed" />
                  <span className="text-slate-400">Grid Demand</span>
                </div>
              </div>
            </div>

            {/* SVG Visualized Chart Container */}
            <div className="relative w-full h-56 sm:h-64 mt-4">
              <svg viewBox="0 0 800 220" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                <line x1="0" y1="30" x2="800" y2="30" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="800" y2="80" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="130" x2="800" y2="130" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="180" x2="800" y2="180" stroke="#1e293b" />

                {/* Y-Axis Labels */}
                <text x="10" y="26" fill="#64748b" fontSize="10" fontFamily="monospace">1,500 MWh</text>
                <text x="10" y="76" fill="#64748b" fontSize="10" fontFamily="monospace">1,000 MWh</text>
                <text x="10" y="126" fill="#64748b" fontSize="10" fontFamily="monospace">500 MWh</text>

                {/* Area Fill */}
                <polygon
                  points="30,180 30,120 100,126 170,130 240,110 310,80 380,45 450,32 520,30 590,48 660,68 730,86 780,110 780,180"
                  fill="url(#cyanGradient)"
                />

                {/* Main Generation Line */}
                <polyline
                  points="30,120 100,126 170,130 240,110 310,80 380,45 450,32 520,30 590,48 660,68 730,86 780,110"
                  fill="none"
                  stroke="url(#lineGlow)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Demand Line (dashed) */}
                <polyline
                  points="30,130 100,134 170,138 240,118 310,88 380,56 450,42 520,38 590,54 660,65 730,82 780,116"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Data points */}
                {HOURLY_GENERATION_DATA.map((item, idx) => {
                  const x = 30 + (idx * (750 / (HOURLY_GENERATION_DATA.length - 1)));
                  // normalized y based on generation (scale 0-1600 MWh to 180-25)
                  const y = 180 - (item.generation / 1600) * 155;
                  const isHovered = hoveredHour === idx;
                  return (
                    <g key={item.hour}>
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? 6 : 4}
                        fill={isHovered ? '#00f0ff' : '#0b0d0f'}
                        stroke="#06b6d4"
                        strokeWidth={isHovered ? 3 : 2}
                        className="cursor-pointer transition-all duration-200"
                        onMouseEnter={() => setHoveredHour(idx)}
                        onMouseLeave={() => setHoveredHour(null)}
                      />
                      {/* X-axis time label */}
                      <text
                        x={x}
                        y="202"
                        textAnchor="middle"
                        fill={isHovered ? '#00f0ff' : '#64748b'}
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {item.hour}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip Overlay */}
              {hoveredHour !== null && (
                <div className="absolute top-2 right-4 bg-slate-900/95 border border-cyan-500/40 p-2.5 rounded-xl shadow-2xl text-xs backdrop-blur-md">
                  <div className="text-cyan-400 font-bold font-mono">
                    Time: {HOURLY_GENERATION_DATA[hoveredHour].hour}
                  </div>
                  <div className="text-white font-mono">
                    Output: <strong>{HOURLY_GENERATION_DATA[hoveredHour].generation} MWh</strong>
                  </div>
                  <div className="text-slate-400 font-mono">
                    Efficiency: {HOURLY_GENERATION_DATA[hoveredHour].efficiency}%
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Peak generation reached at 14:00 (1,482 MWh / 98.9% efficiency).</span>
              </span>
              <span className="italic text-[11px] text-slate-400">
                *Verified SCADA telemetry synced every 60 seconds
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Video Section */}
      <section id="video" className="w-full py-12 sm:py-16 bg-[#0e121a]/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Cinematic Technology Showcase</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
              How Our Energy Technology Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              A comprehensive walkthrough of our automated smart grid telemetry, turbine predictive maintenance, and distribution algorithms.
            </p>
          </div>

          {/* Large Cinematic Video Placeholder */}
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0b0d0f] group">
            <div className="relative w-full aspect-video max-h-[500px]">
              <img
                src="/src/assets/images/smart_turbine_plant_1788466039952.jpg"
                alt="Inside modern smart power facility and turbine systems"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d0f] via-black/40 to-transparent" />

              {/* Play Button & Waves */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <button
                  type="button"
                  onClick={() => setActiveModal('video')}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 hover:border-cyan-300 flex items-center justify-center text-cyan-300 hover:text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-md transition-all hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Play Energy Technology Video"
                >
                  <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />
                </button>
                <span className="mt-4 text-xs sm:text-sm font-semibold text-white tracking-wider uppercase bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                  Watch Video (03:45 • HD)
                </span>
              </div>

              {/* Technical specs pill */}
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-black/70 border border-slate-700 text-xs font-mono text-cyan-300 backdrop-blur-md">
                  SCADA V4.2 Protocol
                </span>
                <span className="hidden sm:inline-block px-3 py-1 rounded-lg bg-black/70 border border-slate-700 text-xs font-mono text-slate-300 backdrop-blur-md">
                  Grid Code Compliant
                </span>
              </div>
            </div>
          </div>

          {/* Under video: 3 Steps (Explore → Participate → Track Performance) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mt-10">
            {/* Step 1 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 hover:border-cyan-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold mb-4 font-mono">
                01
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Explore</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Review industrial electricity generation assets, technical power curves, location geography, and certified utility interconnect agreements.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 hover:border-blue-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold mb-4 font-mono">
                02
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Participate</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Allocate energy capital into operating and vetted facilities with clear minimums and real physical electricity purchase contracts.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 sm:p-6 rounded-2xl bg-[#12161f]/80 border border-slate-800/80 hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold mb-4 font-mono">
                03
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Track Performance</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Monitor live generation feeds, sub-second frequency metrics, and daily energy yield distributions right on your personal dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Energy Systems Section */}
      <section id="energy-systems" className="w-full py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Active Fleet & Facilities</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Our Energy Systems
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl mt-1">
                Explore real industrial electricity generation plants, utility-grade battery reserves, and cogeneration assets.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">All systems grid synchronized</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {ENERGY_SYSTEMS.map((system) => (
              <div
                key={system.id}
                className="group rounded-2xl sm:rounded-3xl overflow-hidden bg-[#12161f]/90 border border-slate-800 hover:border-cyan-500/40 shadow-xl shadow-black/60 transition-all duration-300 flex flex-col"
              >
                {/* Image Header with Badge */}
                <div className="relative w-full h-56 sm:h-64 overflow-hidden">
                  <img
                    src={system.image}
                    alt={system.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12161f] via-transparent to-black/30" />

                  {/* Top Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${system.statusColor}`}>
                      {system.status}
                    </span>
                  </div>

                  {/* Capacity Tag */}
                  <div className="absolute bottom-3 right-4">
                    <span className="px-3 py-1 rounded-lg bg-black/80 border border-white/10 text-xs font-mono font-bold text-cyan-300 backdrop-blur-md">
                      {system.capacity}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-medium text-cyan-400 tracking-wide uppercase">
                      {system.category}
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-white mt-1 group-hover:text-cyan-300 transition-colors">
                      {system.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                      {system.description}
                    </p>

                    {/* Quick Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Annual Output:</span>
                        <span className="font-semibold text-white font-mono">{system.annualOutput}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">System Efficiency:</span>
                        <span className="font-semibold text-emerald-400 font-mono">{system.efficiency}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{system.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Min. Participation</span>
                      <span className="text-sm font-bold text-white font-mono">{system.minParticipation}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSystem(system)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-white text-xs font-bold border border-slate-700 hover:border-cyan-400 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>View Details</span>
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. How It Works (Horizontal 4-Step Process) */}
      <section id="how-it-works" className="w-full py-12 sm:py-20 bg-[#0e121a]/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Operational Roadmap</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
              How It Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Four streamlined steps to participate in modern industrial electricity generation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800/90 relative group hover:border-cyan-500/40 transition-colors">
              <div className="text-2xl font-black text-cyan-400/30 group-hover:text-cyan-400/60 font-mono mb-3 transition-colors">
                01
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Explore Projects</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Browse our portfolio of active solar arrays, battery storage plants, and combined-cycle turbines with full engineering audits.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800/90 relative group hover:border-blue-500/40 transition-colors">
              <div className="text-2xl font-black text-blue-400/30 group-hover:text-blue-400/60 font-mono mb-3 transition-colors">
                02
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Review Information</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Examine technical power purchase agreements (PPAs), regional grid interconnect nodes, and real-time generation capacity.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800/90 relative group hover:border-emerald-500/40 transition-colors">
              <div className="text-2xl font-black text-emerald-400/30 group-hover:text-emerald-400/60 font-mono mb-3 transition-colors">
                03
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Participate</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Subscribe allocation shares through verified mobile wallets or direct bank transfer into institutional infrastructure assets.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800/90 relative group hover:border-purple-500/40 transition-colors">
              <div className="text-2xl font-black text-purple-400/30 group-hover:text-purple-400/60 font-mono mb-3 transition-colors">
                04
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-2">Monitor Performance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track daily physical kilowatt production live on your portal, with automated revenue crediting and on-demand withdrawals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Performance Section */}
      <section id="performance" className="w-full py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Analytics & Production</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Performance Analytics
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Comprehensive historical generation logs, system availability, and uptime performance.
              </p>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActivePerfTab('hourly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePerfTab === 'hourly'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Daily Generation
              </button>
              <button
                type="button"
                onClick={() => setActivePerfTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activePerfTab === 'monthly'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly Output (GWh)
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activePerfTab === 'hourly' ? (
            <div className="p-5 sm:p-7 rounded-2xl bg-[#12161f]/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-white">Daily 24-Hour Production Cycle</span>
                <span className="text-xs font-mono text-cyan-400 font-semibold">Average: 98.4% Efficiency</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {HOURLY_GENERATION_DATA.map((h) => (
                  <div key={h.hour} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="text-[11px] font-mono text-slate-400">{h.hour}</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{h.generation} MWh</div>
                    <div className="text-[10px] text-emerald-400 mt-1">{h.efficiency}% eff.</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7 rounded-2xl bg-[#12161f]/90 border border-slate-800 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-white">2026 Monthly Power Generation (GWh)</span>
                <span className="text-xs font-mono text-emerald-400 font-semibold">99.4% Plant Uptime Avg</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {MONTHLY_PRODUCTION_DATA.map((m) => (
                  <div key={m.month} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-cyan-400">{m.month}</span>
                      <div className="text-base font-extrabold text-white font-mono mt-1">{m.outputGWh}</div>
                      <span className="text-[10px] text-slate-400 font-mono">GWh produced</span>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-emerald-400">
                      {m.uptime}% uptime
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Efficiency & Comparison Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Inverter & Transformer Efficiency</span>
              <div className="text-xl font-bold text-white font-mono">98.6%</div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: '98.6%' }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">SCADA Uptime & Telemetry Link</span>
              <div className="text-xl font-bold text-white font-mono">99.98%</div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '99.98%' }} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#12161f]/80 border border-slate-800">
              <span className="text-xs text-slate-400 block mb-1">Battery Storage Round-Trip</span>
              <div className="text-xl font-bold text-white font-mono">94.2%</div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: '94.2%' }} />
              </div>
            </div>
          </div>

          {/* Live Operational Grid Telemetry Notice */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>অফিসিয়াল গ্রিড পারফরম্যান্স রিপোর্ট:</strong> প্রদর্শিত সমস্ত পাওয়ার লোড ও সিস্টেম দক্ষতা সরাসরি জাতীয় গ্রিড সাবস্টেশন ও রিয়েল-টাইম টেলিমিতি থেকে সম্প্রচারিত।
            </span>
          </div>
        </div>
      </section>

      {/* 8. Trust & Transparency */}
      <section id="transparency" className="w-full py-12 sm:py-20 bg-[#0e121a]/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Governance & Compliance</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
              Trust & Transparency
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Strict adherence to industrial energy safety standards, transparent audit trails, and non-speculative physical power distribution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1: Corporate & Reg */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Corporate & Regulatory Proof</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                NovaVest operates under certified infrastructure charters, compliant with national energy regulatory commissions and industrial grid codes.
              </p>
              <ul className="text-xs space-y-2 text-slate-300">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ISO 50001 Certified Energy Management</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Licensed 132kV Grid Interconnection</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quarterly PwC Environmental Audit</span>
                </li>
              </ul>
            </div>

            {/* Box 2: Risk Disclosure */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Formal Risk Disclosure</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Energy infrastructure yields are tied directly to actual electricity produced and dispatched to the national transmission grid.
              </p>
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200/90 leading-relaxed">
                <strong>No Guaranteed Profit Claims:</strong> We strictly avoid speculative trading promises. Fluctuations in seasonal solar irradiation, wind velocity, and grid maintenance may alter generation yields.
              </div>
            </div>

            {/* Box 3: Documentation & Verification */}
            <div className="p-6 rounded-2xl bg-[#12161f]/90 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Project Documentation</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Access public whitepapers, grid interconnection pacts, and environmental impact assessments directly.
              </p>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => showToast('Downloading 2026 Grid Infrastructure Whitepaper PDF...')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Grid Whitepaper 2026.pdf</span>
                  </span>
                  <span className="text-[10px] text-slate-400">4.2 MB</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast('Opening SCADA Telemetry Protocol Documentation...')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-between border border-slate-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>SCADA Interconnect Protocol.pdf</span>
                  </span>
                  <span className="text-[10px] text-slate-400">2.1 MB</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Referral Section */}
      <section id="referral" className="w-full py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#111726] via-[#121b2d] to-[#0d1424] border border-cyan-500/20 p-6 sm:p-10 shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs font-semibold text-cyan-400 mb-3">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Advocate Community</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Invite & Grow Together
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Join our energy acceleration initiative. Invite peers to explore intelligent clean power generation and earn recurring green community bonuses.
                </p>

                {/* Invitation Link Input Box */}
                <div className="mt-6">
                  <label className="text-xs text-slate-400 block mb-2 font-medium">Your Unique Invitation Link:</label>
                  <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-700 max-w-md">
                    <input
                      type="text"
                      readOnly
                      value="https://novavest.io/portal/ref?code=SDRL123456"
                      className="w-full bg-transparent px-3 text-xs sm:text-sm text-cyan-300 font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                    >
                      {referralCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Referral Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Total Active Invitations</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">12 Members</div>
                  <span className="text-[11px] text-emerald-400 mt-1 block">Level 2 Green Advocate</span>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <span className="text-xs text-slate-400 block">Community Power Shared</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono mt-1">142.5 MWh</div>
                  <span className="text-[11px] text-slate-400 mt-1 block">Equivalent Generation</span>
                </div>

                <div className="col-span-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                  <div className="font-semibold text-white mb-1">Referral Rewards Tier:</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Direct Referrals: <strong className="text-cyan-400">3.0%</strong></span>
                    <span>Secondary Network: <strong className="text-blue-400">1.5%</strong></span>
                    <span>Territory Node: <strong className="text-emerald-400">0.5%</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ Section */}
      <section id="faq" className="w-full py-12 sm:py-20 bg-[#0e121a]/60 border-y border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Common Inquiries</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Everything you need to know about our electricity infrastructure, telemetry monitoring, and returns.
            </p>
          </div>

          <div className="space-y-3">
            {ENERGY_FAQS.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="rounded-2xl bg-[#12161f]/90 border border-slate-800/90 overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
                  >
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {faq.question}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-400 leading-relaxed border-t border-slate-800/60 animate-in fade-in">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="w-full bg-[#0b0d0f] border-t border-slate-800/80 pt-14 pb-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800/80">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[1.5px]">
                  <div className="w-full h-full bg-[#0b0d0f] rounded-[10px] flex items-center justify-center">
                    <Zap className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <span className="text-lg font-bold text-white tracking-tight">NovaVest Energy</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Next-generation utility infrastructure platform pioneering AI-orchestrated electricity generation, battery energy storage systems, and real-time SCADA telemetry.
              </p>
              <div className="text-[11px] text-slate-500 font-mono">
                Reg: #NV-2024-ENG • ISO 50001 Certified • Power Division Permitted
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-3">Navigation</h4>
              <ul className="space-y-2">
                <li><a href="#overview" className="hover:text-cyan-400 transition-colors">Overview</a></li>
                <li><a href="#energy-systems" className="hover:text-cyan-400 transition-colors">Energy Systems</a></li>
                <li><a href="#live-dashboard" className="hover:text-cyan-400 transition-colors">Live Dashboard</a></li>
                <li><a href="#how-it-works" className="hover:text-cyan-400 transition-colors">How It Works</a></li>
                <li><a href="#performance" className="hover:text-cyan-400 transition-colors">Performance Analytics</a></li>
              </ul>
            </div>

            {/* Col 3: Legal & Governance */}
            <div>
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-3">Governance</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal('company')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Company Information
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveModal('employee')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Employee Guidelines
                  </button>
                </li>
                <li>
                  <a href="#transparency" className="hover:text-cyan-400 transition-colors">
                    Risk Disclosure
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showToast('Displaying Terms & Conditions...')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Terms & Conditions
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => showToast('Displaying Privacy Policy...')}
                    className="hover:text-cyan-400 transition-colors cursor-pointer text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Contact & Support */}
            <div>
              <h4 className="text-xs font-bold text-white tracking-wider uppercase mb-3">Contact Operations</h4>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>ops@novavest-energy.io</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>+880 9612-ENERGY (3637)</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Gulshan Power Tower, Level 18, Dhaka</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>24/7 Grid Control Center</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>
              © {new Date().getFullYear()} NovaVest Intelligent Energy Platform. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Substation Telemetry Nominal
              </span>
              <span>132kV Synchronized</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* Interactive Modals */}
      {/* ========================================================================= */}

      {/* 1. Quick Recharge Modal */}
      {activeModal === 'recharge' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#121620] border border-slate-800 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recharge Energy Capital</h3>
                <p className="text-xs text-slate-400">Current Wallet: ৳{userBalance.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3 my-4">
              <label className="text-xs text-slate-400 block font-medium">Select Amount (BDT)</label>
              <div className="grid grid-cols-3 gap-2">
                {[1000, 5000, 10000, 25000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      showToast(`৳${amt.toLocaleString()} রিচার্জ রিকোয়েস্ট তৈরি করা হচ্ছে...`);
                      setActiveModal(null);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-cyan-500/20 hover:border-cyan-500/40 border border-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    ৳{amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Supported Gateways:</span>
                <span className="font-semibold text-white">bKash, Nagad, Rocket, Bank</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Crediting Time:</span>
                <span className="font-semibold text-emerald-400">Instant (SCADA Synced)</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  onGoToProfile();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                Go to Full Wallet
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Quick Withdraw Modal */}
      {activeModal === 'withdraw' && (
        <WithdrawModal
          currentLang={currentLang}
          walletBalance={userBalance}
          userName={userName}
          onClose={() => setActiveModal(null)}
          onOpenRecharge={onOpenRecharge}
          onWithdrawSuccess={(amt) => {
            showToast(
              currentLang === 'bn'
                ? `অর্থ উত্তোলনের আবেদন সফলভাবে সম্পন্ন হয়েছে! ৳${amt.toLocaleString()} প্রক্রিয়াকরণ শুরু হয়েছে।`
                : `Withdrawal request submitted! ৳${amt.toLocaleString()} is being processed.`
            );
          }}
          showToast={showToast}
        />
      )}

      {/* 3. Company Profile Modal */}
      {activeModal === 'company' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#121620] border border-slate-800 p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">NovaVest Infrastructure Ltd.</h3>
                <p className="text-xs text-slate-400">Registered Energy Generation & Grid Telemetry Operator</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>
                Founded in 2021, NovaVest Energy is a specialized clean-energy technology company co-developing utility-scale renewable generation, battery storage systems (BESS), and digital grid balancing networks across South Asia.
              </p>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Corporate Registration:</span>
                  <span className="font-semibold text-white">#NV-2024-ENG-772</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Authorized Capital:</span>
                  <span className="font-semibold text-white">৳ 500,000,000 BDT</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Grid Node License:</span>
                  <span className="font-semibold text-emerald-400">132kV / 230kV Active</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Headquarters:</span>
                  <span className="font-semibold text-white">Gulshan-2, Dhaka</span>
                </div>
              </div>

              <h4 className="text-sm font-bold text-white pt-2">Our Mission</h4>
              <p>
                To eliminate brownouts and accelerate transition to sustainable base load power by combining advanced AI predictive telemetry with direct public infrastructure participation.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Employee Guidelines Modal */}
      {activeModal === 'employee' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#121620] border border-slate-800 p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Operational & Employee Guidelines</h3>
                <p className="text-xs text-slate-400">Internal SCADA Security, Field Safety & Regulatory SOP</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-1">1. High-Voltage Substation Protocol</h4>
                <p className="text-xs text-slate-400">
                  All personnel entering 132kV switchyards must be outfitted with certified Class 4 arc-flash PPE, grounding probes, and biometric RFID credentials.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-1">2. Data Integrity & SCADA Logging</h4>
                <p className="text-xs text-slate-400">
                  Megawatt generation telemetry, frequency adjustments, and inverter states are logged immutably. Any manual override requires dual-key supervisory sign-off.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <h4 className="font-bold text-white text-xs mb-1">3. Non-Speculative Representation</h4>
                <p className="text-xs text-slate-400">
                  Employees and partners are strictly prohibited from marketing energy allocations as guaranteed or risk-free financial investments. Real physical production facts must always be transparent.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. System Details Modal */}
      {activeModal === 'system-details' && selectedSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-[#121620] border border-slate-800 p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative rounded-xl overflow-hidden h-48 sm:h-60 mb-5">
              <img
                src={selectedSystem.image}
                alt={selectedSystem.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121620] via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <span className="text-xs font-mono text-cyan-400 bg-black/70 px-2.5 py-1 rounded-md">
                  {selectedSystem.capacity}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">{selectedSystem.name}</h3>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300">
              <p className="leading-relaxed">{selectedSystem.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">System Status:</span>
                  <span className="font-semibold text-emerald-400">{selectedSystem.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Grid Node:</span>
                  <span className="font-semibold text-white font-mono">{selectedSystem.gridFrequency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Annual Output:</span>
                  <span className="font-semibold text-white font-mono">{selectedSystem.annualOutput}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Efficiency:</span>
                  <span className="font-semibold text-cyan-400 font-mono">{selectedSystem.efficiency}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Min. Participation:</span>
                  <span className="font-semibold text-white font-mono">{selectedSystem.minParticipation}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Yield Expectation:</span>
                  <span className="font-semibold text-purple-400 font-mono text-[11px]">{selectedSystem.expectedAnnualYield}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Technical Engineering Highlights</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedSystem.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setActiveModal('recharge');
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
              >
                Participate in {selectedSystem.name.split(' ')[0]}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Video Preview Modal */}
      {activeModal === 'video' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl rounded-2xl bg-[#121620] border border-slate-800 p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-4">
              <span className="text-xs font-mono text-cyan-400">Documentary Preview</span>
              <h3 className="text-lg font-bold text-white">How Our Energy Technology Works</h3>
            </div>

            {/* Video Player Mockup with Animated Waves */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black flex flex-col items-center justify-center border border-slate-800">
              <img
                src="/src/assets/images/smart_turbine_plant_1788466039952.jpg"
                alt="Plant preview"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
              <div className="relative z-10 flex flex-col items-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 animate-pulse">
                  <Play className="w-6 h-6 fill-current ml-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Telemetry & AI Distribution Engine (Live Transmission)</p>
                  <p className="text-xs text-slate-400">Real-time sub-second frequency control and turbine dispatching</p>
                </div>
              </div>

              {/* Fake player scrubber */}
              <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent flex items-center gap-3 text-[11px] font-mono text-slate-300">
                <span>01:24</span>
                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 w-1/3" />
                </div>
                <span>03:45</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
