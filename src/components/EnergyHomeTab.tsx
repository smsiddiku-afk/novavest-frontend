import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Zap,
  ShieldCheck,
  Building2,
  HardHat,
  Cpu,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  Share2,
  CheckCircle2,
  Activity,
  Sparkles,
  Sun,
  BatteryCharging,
  Wind,
  Award,
  Bell,
  Gauge,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Flame,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Copy,
  ExternalLink,
  Search,
  Headphones,
  Radio,
  FileText,
  Clock,
  Info,
  Phone,
  Mail,
  Check,
  BarChart3,
  Globe,
  Layers,
  HelpCircle,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { HOURLY_GENERATION_DATA } from '../data/energyData';
import { EnergySystem, Language } from '../types';
import {
  translations,
  getEnergySystems,
  getFaqItems,
  getHowItWorksSteps,
  getNewProjects,
} from '../utils/translations';
import { HowPowerGridWorksSection } from './HowPowerGridWorksSection';
import { CompanyProfileModal } from './CompanyProfileModal';

interface EnergyHomeTabProps {
  currentLang?: Language;
  onToggleLang?: (lang: Language) => void;
  userBalance: number;
  userName: string;
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onOpenRobotLogin?: () => void;
  onOpenNotifications: () => void;
  onGoToInvest?: () => void;
  onGoToProfile: () => void;
  onOpenInvite?: () => void;
  onInvestProject?: (projectName: string, amount: number) => void;
  onClaimDailyBonus: () => void;
  hasClaimedBonus: boolean;
  showToast: (msg: string) => void;
}

export const EnergyHomeTab: React.FC<EnergyHomeTabProps> = ({
  currentLang = 'en',
  onToggleLang,
  userBalance,
  userName,
  onOpenRecharge,
  onOpenWithdraw,
  onOpenNotifications,
  onGoToInvest,
  onGoToProfile,
  onOpenInvite,
  onInvestProject,
  onClaimDailyBonus,
  hasClaimedBonus,
  showToast,
}) => {
  const lang: Language = (currentLang as Language) || 'en';
  const t = translations[lang];
  const systems = getEnergySystems(lang);
  const faqList = getFaqItems(lang);
  const howItWorksList = getHowItWorksSteps(lang);
  const newProjectsList = getNewProjects(lang);

  // Navigation & Drawer
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    'company' | 'employee' | 'video' | 'system-details' | 'new-projects' | 'supply' | 'support' | null
  >(null);
  const [selectedSystem, setSelectedSystem] = useState<EnergySystem | null>(null);

  // Video player & Voice Narration State
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false); // strictly manual play: only plays when user clicks play
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Natural Human Speech Narration Queue & Voices
  const speechQueueRef = useRef<{
    sentences: string[];
    index: number;
    timeoutId: any;
    isActive: boolean;
  }>({
    sentences: [],
    index: 0,
    timeoutId: null,
    isActive: false,
  });

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load and cache browser voices when ready
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        try {
          const v = window.speechSynthesis.getVoices();
          if (v && v.length > 0) {
            setAvailableVoices(v);
          }
        } catch {}
      };
      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const videoEpisodes = useMemo(() => [
    {
      id: 'ep-1',
      title: lang === 'bn' ? 'সৌর বিদ্যুৎ পার্ক ও ১৩২কেভি গ্রিড সাবস্টেশন' : 'Apex Helios Solar Farm & Substation',
      subtitle: lang === 'bn' ? 'বাস্তব বিদ্যুৎ উৎপাদন ও জাতীয় গ্রিডে সরাসরি সরবরাহ' : 'Real-time solar power generation & 132kV transmission',
      duration: '00:30',
      totalSec: 30,
      image: '/src/assets/images/solar_ai_substation_1788465992131.jpg',
      videoSrc: '/company-profile/videos/solar-park-grid.mp4',
      narration: lang === 'bn'
        ? 'নোভা টেরা এনার্জি প্রকল্পে আপনাকে স্বাগতম। আমাদের চারশত পঞ্চাশ মেগাওয়াট সৌর বিদ্যুৎ কেন্দ্র এবং সাবস্টেশন সরাসরি জাতীয় গ্রিডের সাথে যুক্ত। সূর্যের আলো থেকে উৎপাদিত পরিবেশবান্ধব বিদ্যুৎ নিরবচ্ছিন্নভাবে জাতীয় গ্রিডে সরবরাহ করা হচ্ছে। এই বিদ্যুৎ বিক্রির নিশ্চিত রাজস্ব থেকে প্রতিদিন আপনার অ্যাকাউন্টে লভ্যাংশ যুক্ত হয়।'
        : 'Welcome to Nova Terra Energy infrastructure. Our four-hundred and fifty megawatt solar power park is interconnected directly to the national electric grid. Continuous clean electricity flows to the grid, generating dependable daily returns for all registered participants.',
      captions: lang === 'bn'
        ? [
            { start: 0, end: 6, text: '☀️ নোভা টেরা সোলার পার্ক: ৪৫০ মেগাওয়াট পিক উৎপাদন ক্ষমতা' },
            { start: 6, end: 12, text: '⚡ ১৩২কেভি গ্রিড সাবস্টেশন ও সার্বক্ষণিক রিয়েলটাইম মনিটরিং' },
            { start: 12, end: 18, text: '📈 জাতীয় গ্রিডে নিরবচ্ছিন্ন বিদ্যুৎ বিক্রির নিশ্চিত রাজস্ব' },
            { start: 18, end: 999, text: '🔒 পরিবেশবান্ধব গ্রিন এনার্জি ও সম্পূর্ণ সুরক্ষিত ফান্ড' },
          ]
        : [
            { start: 0, end: 6, text: '☀️ Nova Terra Solar Farm: 450 MW Peak Generation Capacity' },
            { start: 6, end: 12, text: '⚡ 132kV Substation Real-time Grid Interconnect' },
            { start: 12, end: 18, text: '📈 Revenue from national power sales credited daily to investors' },
            { start: 18, end: 999, text: '🔒 Certified Clean Infrastructure with Guaranteed Output Payouts' },
          ]
    },
    {
      id: 'ep-2',
      title: lang === 'bn' ? 'মেগা ব্যাটারি এনার্জি স্টোরেজ ও টারবাইন হাব' : 'Industrial Mega Battery Storage & Turbines',
      subtitle: lang === 'bn' ? '৮২০ মেগাওয়াট রিজার্ভ ও পিক-আওয়ার ব্যালেন্সিং' : '820 MWh Energy Reserve & Grid Balancing',
      duration: '00:30',
      totalSec: 30,
      image: '/src/assets/images/bess_storage_facility_1788466008161.jpg',
      videoSrc: '/company-profile/videos/battery-storage-hub.mp4',
      narration: lang === 'bn'
        ? 'এটি আমাদের আধুনিক মেগা ব্যাটারি স্টোরেজ প্রকল্প। সুবিশাল লিথিয়াম ব্যাটারির মাধ্যমে পিক আওয়ারে অতিরিক্ত বিদ্যুৎ সঞ্চয় এবং গ্রিডের ভারসাম্য রক্ষা করা হয়। এই আধুনিক প্রযুক্তির ফলে বিদ্যুৎ অপচয় শূন্যের কোঠায় নেমে এসেছে এবং সার্বক্ষণিক স্থিতিশীল বিদ্যুৎ প্রবাহ নিশ্চিত থাকে।'
        : 'This is our advanced Mega Battery Storage Facility. High-capacity lithium battery modules stabilize national grid frequency, capturing surplus daytime energy for peak evening dispatch with zero transmission loss.',
      captions: lang === 'bn'
        ? [
            { start: 0, end: 6, text: '🔋 মেগা স্টোরেজ: ৮২০ মেগাওয়াট হাই-ভোল্টেজ শক্তি সঞ্চয়' },
            { start: 6, end: 12, text: '⏱️ দ্রুত ফ্রিকোয়েন্সি ব্যালেন্সিং এবং পিক-আওয়ার সাপোর্ট' },
            { start: 12, end: 18, text: '❄️ আধুনিক সেল আর্কিটেকচার ও সার্বক্ষণিক তাপমাত্রা নিয়ন্ত্রণ' },
            { start: 18, end: 999, text: '💼 সর্বোচ্চ গ্রিড নির্ভরযোগ্যতা ও নিশ্চিত প্রজেক্ট ডিভিডেন্ড' },
          ]
        : [
            { start: 0, end: 6, text: '🔋 Vanguard Storage: 820 MWh High-Voltage Energy Reserve' },
            { start: 6, end: 12, text: '⏱️ Rapid Frequency Stabilization and Peak Load Shifting' },
            { start: 12, end: 18, text: '❄️ Advanced Liquid-Cooled Architecture with Thermal Telemetry' },
            { start: 18, end: 999, text: '💼 High-yield asset-backed infrastructure investments' },
          ]
    },
    {
      id: 'ep-3',
      title: lang === 'bn' ? 'দৈনিক আয় ও দ্রুত টাকা উত্তোলনের নিয়মাবলী' : 'Daily Yield Payout & Instant Cashout Guide',
      subtitle: lang === 'bn' ? 'বিকাশ, নগদ ও রকেটে ৫-৩০ মিনিটে সরাসরি ক্যাশআউট' : 'Cash out via bKash, Nagad & Rocket in 5-30 mins',
      duration: '00:30',
      totalSec: 30,
      image: '/src/assets/images/smart_turbine_plant_1788466039952.jpg',
      videoSrc: '/company-profile/videos/ppa-revenue-dispatch.mp4',
      narration: lang === 'bn'
        ? 'নোভা টেরা এনার্জিতে আপনার বিনিয়োগ সম্পূর্ণ সুরক্ষিত ও নির্ভরযোগ্য। এখানে যেকোনো প্রকল্প চুক্তির মাধ্যমে আপনি প্রতিদিন নিয়মিত ও নিশ্চিত লভ্যাংশ পেতে পারেন। আর আপনার অর্জিত অর্থ বিকাশ, নগদ অথবা রকেটের মাধ্যমে মাত্র পাঁচ থেকে ত্রিশ মিনিটের মধ্যেই খুব সহজে উত্তোলন করে নিতে পারবেন।'
        : 'Investing with Nova Terra Energy is fully secure and transparent. Activating a contract yields attractive daily returns credited to your wallet. You can withdraw your earnings quickly via bKash, Nagad, or Bank within five to thirty minutes.',
      captions: lang === 'bn'
        ? [
            { start: 0, end: 6, text: '💰 NVT এনার্জি: প্রতিদিন আকর্ষণীয় নিশ্চিত লভ্যাংশ' },
            { start: 6, end: 12, text: '📲 বিকাশ, নগদ ও রকেটের মাধ্যমে নিরাপদ ডিপোজিট ও উত্তোলন' },
            { start: 12, end: 18, text: '⚡ ৫ থেকে ৩০ মিনিটের মধ্যে সরাসরি আপনার অ্যাকাউন্টে টাকা পৌঁছে যায়' },
            { start: 18, end: 999, text: '✅ ২৪/৭ হেল্পলাইন সাপোর্ট ও ডাউনলোডযোগ্য সরকারি অফিসিয়াল রসিদ' },
          ]
        : [
            { start: 0, end: 6, text: '💰 NVT Energy: Daily Guaranteed Profit & Yield' },
            { start: 6, end: 12, text: '📲 Instant Deposits & Withdrawals via Mobile Banking' },
            { start: 12, end: 18, text: '⚡ Payout delivered to your verified wallet in 5 to 30 minutes' },
            { start: 18, end: 999, text: '✅ 24/7 Support Hotline & Downloadable Official Receipts' },
          ]
    }
  ], [lang]);

  // Audio synthesizer tone for user interactions
  const playAudioBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // Audio context may require user interaction
    }
  };

  // Stop voice narration and clear speech queues
  const stopVoiceNarration = () => {
    if (speechQueueRef.current.timeoutId) {
      clearTimeout(speechQueueRef.current.timeoutId);
      speechQueueRef.current.timeoutId = null;
    }
    speechQueueRef.current.isActive = false;
    speechQueueRef.current.sentences = [];
    speechQueueRef.current.index = 0;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  };

  // High-fidelity Human Voice Synthesizer (Calm, Slow & Natural Cadence)
  const speakEpisodeNarration = (idx: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      stopVoiceNarration();

      const ep = videoEpisodes[idx];
      if (!ep || !ep.narration) return;

      // Split into natural breath clauses (delimiter by ।, ?, !, or .)
      const rawSentences = ep.narration
        .split(/(?<=[।?!.])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

      if (rawSentences.length === 0) return;

      speechQueueRef.current = {
        sentences: rawSentences,
        index: 0,
        timeoutId: null,
        isActive: true,
      };

      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();

      // Find the highest quality, most natural human voice
      let chosenVoice: SpeechSynthesisVoice | null = null;
      if (lang === 'bn') {
        chosenVoice =
          voices.find(
            (v) =>
              (v.lang.toLowerCase().includes('bn') ||
                v.name.toLowerCase().includes('bangla') ||
                v.name.toLowerCase().includes('bengali')) &&
              (v.name.includes('Natural') ||
                v.name.includes('Neural') ||
                v.name.includes('Online') ||
                v.name.includes('Google') ||
                v.name.includes('Tanishaa') ||
                v.name.includes('Bashkar'))
          ) ||
          voices.find(
            (v) =>
              v.lang.toLowerCase().includes('bn') ||
              v.name.toLowerCase().includes('bangla') ||
              v.name.toLowerCase().includes('bengali')
          ) ||
          null;
      } else {
        chosenVoice =
          voices.find(
            (v) =>
              (v.lang.includes('en-US') || v.lang.includes('en-GB') || v.lang.startsWith('en')) &&
              (v.name.includes('Natural') ||
                v.name.includes('Neural') ||
                v.name.includes('Online') ||
                v.name.includes('Samantha') ||
                v.name.includes('Google'))
          ) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          null;
      }

      const speakSentenceAtIndex = (sentenceIdx: number) => {
        if (!speechQueueRef.current.isActive) return;
        if (sentenceIdx >= speechQueueRef.current.sentences.length) {
          speechQueueRef.current.isActive = false;
          return;
        }

        const sentenceText = speechQueueRef.current.sentences[sentenceIdx];
        const utterance = new SpeechSynthesisUtterance(sentenceText);
        utterance.lang = lang === 'bn' ? 'bn-BD' : 'en-US';

        if (chosenVoice) {
          utterance.voice = chosenVoice;
        }

        // Natural human presenter pacing:
        // Slow (0.80) to articulate every word clearly without rushed robotic tempo
        utterance.rate = 0.80;
        // Warm, grounded pitch (0.95) to remove tinny/mechanical squeakiness
        utterance.pitch = 0.95;
        utterance.volume = 1.0;

        utterance.onend = () => {
          if (!speechQueueRef.current.isActive) return;
          // Natural human breath pause (320ms) between sentences
          speechQueueRef.current.timeoutId = setTimeout(() => {
            speakSentenceAtIndex(sentenceIdx + 1);
          }, 320);
        };

        utterance.onerror = (e) => {
          console.warn('Speech narration error:', e);
          if (speechQueueRef.current.isActive) {
            speechQueueRef.current.timeoutId = setTimeout(() => {
              speakSentenceAtIndex(sentenceIdx + 1);
            }, 300);
          }
        };

        // Resume if suspended by browser autoplay policy
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      };

      // Start first sentence
      speakSentenceAtIndex(0);
    } catch (err) {
      console.warn('Voice narration error:', err);
    }
  };

  const handleToggleVideoPlay = () => {
    playAudioBeep();
    if (videoElementRef.current) {
      if (videoElementRef.current.paused) {
        videoElementRef.current.play().catch(() => {});
        setIsVideoPlaying(true);
        if (isVoiceActive) {
          speakEpisodeNarration(selectedVideoIndex);
        }
      } else {
        videoElementRef.current.pause();
        setIsVideoPlaying(false);
        stopVoiceNarration();
      }
    } else {
      const nextPlay = !isVideoPlaying;
      setIsVideoPlaying(nextPlay);
      if (nextPlay) {
        if (isVoiceActive) {
          speakEpisodeNarration(selectedVideoIndex);
        }
      } else {
        stopVoiceNarration();
      }
    }
  };

  const handleToggleVoiceNarration = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    playAudioBeep();
    const nextVoice = !isVoiceActive;
    setIsVoiceActive(nextVoice);
    if (nextVoice) {
      speakEpisodeNarration(selectedVideoIndex);
      showToast(lang === 'bn' ? '🔊 ধীর ও স্বাভাবিক মানুষের কণ্ঠের ভয়েস চালু করা হয়েছে' : '🔊 Calm, natural voice narration activated');
    } else {
      stopVoiceNarration();
      showToast(lang === 'bn' ? '🔇 ভয়েস মিউট করা হয়েছে' : '🔇 Voice muted');
    }
  };

  const handleSelectVideoEpisode = (idx: number) => {
    playAudioBeep();
    stopVoiceNarration();
    setSelectedVideoIndex(idx);
    setVideoSeconds(0);
    // User requested: video only plays if explicitly clicked
    setIsVideoPlaying(false);
    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.currentTime = 0;
    }
  };

  // Video seconds progress timer
  useEffect(() => {
    let timer: any;
    if (isVideoPlaying) {
      timer = setInterval(() => {
        setVideoSeconds((prev) => {
          const currentTotal = videoEpisodes[selectedVideoIndex]?.totalSec || 30;
          if (prev >= currentTotal) {
            setIsVideoPlaying(false);
            if (videoElementRef.current) {
              videoElementRef.current.pause();
              videoElementRef.current.currentTime = 0;
            }
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isVideoPlaying, selectedVideoIndex]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopVoiceNarration();
    };
  }, []);

  // FAQ Accordion State
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');

  // Chart state
  const [perfMetric, setPerfMetric] = useState<'hourly' | 'monthly'>('hourly');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  // Live Telemetry Simulation
  const [liveGeneration, setLiveGeneration] = useState(4820.4);
  const [liveEfficiency, setLiveEfficiency] = useState(98.4);
  const [liveFrequency, setLiveFrequency] = useState(50.02);
  const [liveCapacity] = useState(6500);

  // Live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveGeneration((prev) => +(prev + (Math.random() * 0.8 - 0.35)).toFixed(1));
      setLiveEfficiency((prev) => +(98.2 + Math.random() * 0.4).toFixed(1));
      setLiveFrequency((prev) => +(50.0 + (Math.random() * 0.04 - 0.02)).toFixed(2));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('https://nvt-energy.io/portal/ref?code=NVT123456');
    showToast(t.toastCopied);
  };

  const handleOpenSystemDetails = (sys: EnergySystem) => {
    setSelectedSystem(sys);
    setActiveModal('system-details');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsDrawerOpen(false);
  };

  return (
    <div className="w-full flex flex-col space-y-4 pb-6 text-slate-100 animate-in fade-in duration-200">
      {/* ───────────────────────────────────────────────────────────
          1. TOP HEADER BAR: [ ☰ ]  [ ⚡ AI ENERGY ]  [ 🌐 EN/বাং ] [ 🔔 ]
      ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1 pb-1">
        {/* Left: Drawer Toggle ☰ */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-slate-300 hover:text-cyan-400 transition-all cursor-pointer shadow-sm"
          aria-label="Open Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Center: ⚡ AI ENERGY */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 p-[1.5px] shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-[#070c17] rounded-[6px] flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/30" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-white">
              AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">ENERGY</span>
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[9px] font-extrabold text-cyan-300">
              GRID v4.2
            </span>
          </div>
        </div>

        {/* Right: Language Pill & 🔔 Notification Bell */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Language Toggle */}
          <button
            type="button"
            onClick={() => onToggleLang && onToggleLang(lang === 'en' ? 'bn' : 'en')}
            className="px-2.5 py-1.5 rounded-xl bg-[#0d172e] border border-cyan-500/30 hover:border-cyan-400 text-xs font-bold text-cyan-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
            title={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'en' ? 'বাং' : 'EN'}</span>
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all relative cursor-pointer shadow-sm shrink-0"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#050811]" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          2. AI ENERGY BANNER (Electricity System, [Explore Systems])
      ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-b from-[#0b162c] via-[#091122] to-[#060a14] border border-cyan-500/30 shadow-[0_12px_36px_-10px_rgba(6,182,212,0.25)]">
        {/* Background Image with Ambient Glow */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/energy_hero_facility_1788465969350.jpg"
            alt="AI Electricity Generation Facility"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105 transition-transform duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] via-[#091122]/90 to-[#0b162c]/85" />
        </div>

        {/* Ambient Glow Orbs */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 p-5 space-y-3.5">
          {/* Top Tag */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[10px] font-bold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.bannerBadge}</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t.bannerLive}
            </span>
          </div>

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {t.bannerTitlePrefix}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                {t.bannerTitleHighlight}
              </span>
            </h1>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {t.bannerDescription}
            </p>
          </div>

          {/* Embedded Mini Telemetry Strip */}
          <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-black/50 border border-slate-800/90 backdrop-blur-sm text-center">
            <div>
              <span className="text-[9px] text-slate-400 block font-medium">{t.bannerActiveLoad}</span>
              <span className="text-xs sm:text-sm font-bold text-cyan-300 font-mono">{liveGeneration} MW</span>
            </div>
            <div className="border-x border-slate-800">
              <span className="text-[9px] text-slate-400 block font-medium">{t.bannerNeuralEfficiency}</span>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono">{liveEfficiency}%</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 block font-medium">{t.bannerFrequency}</span>
              <span className="text-xs sm:text-sm font-bold text-blue-400 font-mono">{liveFrequency} Hz</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          3. QUICK MENU (8 Dedicated Icons as requested:
             Recharge, Withdraw, Company, Employee, New, Invite, Supply, Support)
      ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[22px] bg-[#0c1324] border border-slate-800/80 p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
            {t.quickMenuTitle}
          </span>
          <span className="text-[10px] text-cyan-400 font-medium">{t.quickMenuShortcutsCount}</span>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 sm:gap-2.5">
          {/* 1. 💳 Recharge */}
          <button
            type="button"
            onClick={onOpenRecharge}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-blue-500/20 hover:border-blue-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform mb-1">
              <ArrowDownToLine className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmRecharge}</span>
            <span className="text-[9px] text-slate-400">{t.qmRechargeSub}</span>
          </button>

          {/* 2. 💰 Withdraw */}
          <button
            type="button"
            onClick={onOpenWithdraw}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-cyan-500/20 hover:border-cyan-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform mb-1">
              <ArrowUpFromLine className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmWithdraw}</span>
            <span className="text-[9px] text-slate-400">{t.qmWithdrawSub}</span>
          </button>

          {/* 3. 🏢 Company (Company Profile) */}
          <button
            type="button"
            onClick={() => setActiveModal('company')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-amber-500/20 hover:border-amber-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mb-1">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmCompany}</span>
            <span className="text-[9px] text-amber-300">{t.qmCompanySub}</span>
          </button>

          {/* 4. 👷 Employee (Employee Team) */}
          <button
            type="button"
            onClick={() => setActiveModal('employee')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-indigo-500/20 hover:border-indigo-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-1">
              <HardHat className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmEmployee}</span>
            <span className="text-[9px] text-indigo-300">{t.qmEmployeeSub}</span>
          </button>

          {/* 5. 🆕 New (New Projects) */}
          <button
            type="button"
            onClick={() => setActiveModal('new-projects')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-emerald-500/20 hover:border-emerald-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-1">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmNew}</span>
            <span className="text-[9px] text-emerald-300">{t.qmNewSub}</span>
          </button>

          {/* 6. 🔗 Invite (হোম পেজের ইনভাইটেশন অপশন) */}
          <button
            id="home-quick-invite-btn"
            type="button"
            onClick={() => {
              if (onOpenInvite) {
                onOpenInvite();
              } else {
                handleCopyReferral();
              }
            }}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-amber-500/30 hover:border-amber-400/50 transition-all text-center group cursor-pointer active:scale-95 shadow-sm"
          >
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mb-1 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              <Share2 className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmInvite}</span>
            <span className="text-[9px] text-amber-300 font-semibold">{t.qmInviteSub}</span>
          </button>

          {/* 7. ⚡ Supply (Power Supply Status) */}
          <button
            type="button"
            onClick={() => setActiveModal('supply')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-yellow-500/20 hover:border-yellow-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform mb-1">
              <Zap className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmSupply}</span>
            <span className="text-[9px] text-yellow-300">{t.qmSupplySub}</span>
          </button>

          {/* 8. 🎧 Support */}
          <button
            type="button"
            onClick={() => setActiveModal('support')}
            className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#111c36] hover:bg-[#162447] border border-teal-500/20 hover:border-teal-400/40 transition-all text-center group cursor-pointer active:scale-95"
          >
            <div className="w-9 h-9 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-110 transition-transform mb-1">
              <Headphones className="w-4.5 h-4.5" />
            </div>
            <span className="text-[11px] font-bold text-white leading-tight">{t.qmSupport}</span>
            <span className="text-[9px] text-teal-300">{t.qmSupportSub}</span>
          </button>
        </div>

        {/* Bonus Strip */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">{t.dailyBonusTitle}</span>
          </div>
          <button
            type="button"
            onClick={onClaimDailyBonus}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              hasClaimedBonus
                ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 active:scale-95'
            }`}
          >
            {hasClaimedBonus ? t.dailyBonusClaimed : t.dailyBonusClaim}
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          3.5 🎁 INVITATION & REFERRAL REWARDS BANNER (হোম পেজের ইনভাইটেশন অপশন)
      ─────────────────────────────────────────────────────────── */}
      <div
        id="home-referral-invitation-card"
        onClick={() => {
          if (onOpenInvite) onOpenInvite();
          else handleCopyReferral();
        }}
        className="rounded-[22px] bg-gradient-to-r from-[#0c1a33] via-[#09152b] to-[#121c38] border border-amber-500/30 hover:border-amber-400/50 p-3.5 sm:p-4 shadow-lg shadow-amber-950/20 relative overflow-hidden cursor-pointer transition-all group active:scale-[0.99]"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform shrink-0">
              <Share2 className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {lang === 'bn' ? 'আমন্ত্রণ ও রেফারেল রিওয়ার্ড' : 'Invitation & Referral Rewards'}
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-bold font-mono">
                  7% + 3% + 1%
                </span>
              </div>
              <p className="text-[10px] text-slate-300 line-clamp-1 mt-0.5">
                {lang === 'bn'
                  ? 'বন্ধুদের ইনভাইট করুন, কিউআর কোড ও সরাসরি ক্যাশ কমিশন তুলুন'
                  : 'Invite friends, view QR code & claim instant cash commission'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] font-bold text-amber-300 hidden xs:inline">
              {lang === 'bn' ? 'ওপেন' : 'Open'}
            </span>
            <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:translate-x-0.5 transition-transform">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          4. 🎬 WATCH VIDEO: Live Streaming & Voice Narration
      ─────────────────────────────────────────────────────────── */}
      <div id="ai-energy-video" className="rounded-[24px] bg-[#0c1324] border border-cyan-500/40 overflow-hidden shadow-xl shadow-cyan-500/10 space-y-0">
        {/* Player Header with Status & Mode Controls */}
        <div className="p-4 pb-3 flex items-center justify-between border-b border-slate-800/80 bg-[#080e1c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-white tracking-wide">
                  {lang === 'bn' ? 'NVT এনার্জি ভিডিও ও পরিদর্শন' : 'NVT Energy Video & Tour'}
                </h3>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[9px] font-medium text-emerald-300">
                  {lang === 'bn' ? 'ধীর মানুষের কণ্ঠ' : 'Natural Voice'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                {lang === 'bn' ? 'শান্ত, স্বাভাবিক ও স্পষ্ট ধারাভাষ্য (Human Cadence)' : 'Calm, steady human voice narration'}
              </p>
            </div>
          </div>

          {/* Voice Audio Toggle Button */}
          <button
            type="button"
            onClick={handleToggleVoiceNarration}
            className={`px-3 py-1.5 rounded-xl transition-all border cursor-pointer flex items-center gap-1.5 text-xs font-medium ${
              isVoiceActive
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-sm shadow-emerald-500/30'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title={isVoiceActive ? (lang === 'bn' ? 'ভয়েস মিউট করুন' : 'Mute Voice') : (lang === 'bn' ? 'মানুষের কণ্ঠের ভয়েস শুনুন' : 'Listen with Human Voice')}
          >
            {isVoiceActive ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="hidden xs:inline">{lang === 'bn' ? 'ভয়েস চালু' : 'Voice ON'}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-400" />
                <span className="hidden xs:inline">{lang === 'bn' ? 'ভয়েস শুনুন' : 'Voice OFF'}</span>
              </>
            )}
          </button>
        </div>

        {/* Video Screen / Canvas View */}
        <div className="p-3 sm:p-4 space-y-3">
          <div className="relative h-52 sm:h-60 rounded-2xl overflow-hidden bg-black border border-slate-800 group shadow-inner">
            {/* Native Clean Video Element (No YouTube branding/logos, manual play only) */}
            <video
              ref={videoElementRef}
              src={videoEpisodes[selectedVideoIndex].videoSrc}
              poster={videoEpisodes[selectedVideoIndex].image}
              className="w-full h-full object-cover"
              playsInline
              preload="metadata"
              loop
              onPlay={() => setIsVideoPlaying(true)}
              onPause={() => setIsVideoPlaying(false)}
              onClick={handleToggleVideoPlay}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] via-black/20 to-black/40 pointer-events-none" />

            {/* Grid Scan Lines Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

            {/* Center Interactive Play Button Prompt when not playing (Only plays when clicked) */}
            {!isVideoPlaying ? (
              <div
                onClick={handleToggleVideoPlay}
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-pointer transition-all hover:bg-black/30"
              >
                <div className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 border border-cyan-300 text-black flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform hover:scale-110 active:scale-95 transition-all">
                  <Play className="w-8 h-8 fill-current ml-1" />
                </div>
                <div className="mt-3 px-3 py-1 rounded-full bg-black/80 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 shadow-md">
                  {lang === 'bn' ? 'ভিডিও চালু করতে প্লে বাটনে ক্লিক করুন' : 'Click Play Button to Start Video'}
                </div>
              </div>
            ) : (
              /* Center Interactive Play/Pause Button on hover when playing */
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <button
                  type="button"
                  onClick={handleToggleVideoPlay}
                  className="w-14 h-14 rounded-full bg-black/60 hover:bg-black/80 border border-cyan-400/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl transition-all hover:scale-110 cursor-pointer pointer-events-auto"
                  title="Pause"
                >
                  <Pause className="w-6 h-6 fill-current" />
                </button>
              </div>
            )}

            {/* Subtitle / Closed-Caption Box */}
            {isVideoPlaying && (
              <div className="absolute bottom-12 inset-x-3 text-center pointer-events-none">
                <div className="inline-block max-w-[92%] px-3 py-1.5 rounded-xl bg-black/85 border border-cyan-500/40 backdrop-blur-md text-xs sm:text-sm text-cyan-200 font-medium shadow-xl animate-in fade-in duration-300">
                  {videoEpisodes[selectedVideoIndex].captions.find(
                    (c) => (videoSeconds % 25) >= c.start && (videoSeconds % 25) < c.end
                  )?.text || videoEpisodes[selectedVideoIndex].captions[0]?.text}
                </div>
              </div>
            )}

            {/* Bottom Control Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2.5 pt-4 space-y-1.5">
              {/* Scrubber Progress Bar */}
              <div
                onClick={() => {
                  setVideoSeconds((prev) => prev + 5);
                  playAudioBeep();
                }}
                className="w-full bg-slate-800/90 rounded-full h-1.5 overflow-hidden cursor-pointer group/bar relative"
              >
                <div
                  className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300 relative"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((videoSeconds % videoEpisodes[selectedVideoIndex].totalSec) /
                          videoEpisodes[selectedVideoIndex].totalSec) *
                          100
                      )
                    )}%`,
                  }}
                >
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md scale-0 group-hover/bar:scale-100 transition-transform" />
                </div>
              </div>

              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleVideoPlay}
                    className="p-1 text-cyan-300 hover:text-white cursor-pointer"
                  >
                    {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleVoiceNarration}
                    className={`p-1 cursor-pointer transition-colors ${isVoiceActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-200'}`}
                    title={isVoiceActive ? 'Mute Voice' : 'Unmute Voice'}
                  >
                    {isVoiceActive ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  {/* Soundwave equalizer indicator when voice is active */}
                  {isVoiceActive && (
                    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] text-emerald-300 font-mono">
                      <span className="w-0.5 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-0.5 h-3 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-0.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" />
                      <span className="ml-1 text-[9px] hidden xs:inline">{lang === 'bn' ? 'মানুষের কণ্ঠ' : 'Human Voice'}</span>
                    </div>
                  )}

                  <span className="text-[10px] font-mono text-slate-300">
                    {Math.floor((videoSeconds % videoEpisodes[selectedVideoIndex].totalSec) / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {Math.floor((videoSeconds % videoEpisodes[selectedVideoIndex].totalSec) % 60)
                      .toString()
                      .padStart(2, '0')}{' '}
                    / {videoEpisodes[selectedVideoIndex].duration}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]">
                    {videoEpisodes[selectedVideoIndex].title}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Episode Selector Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {lang === 'bn' ? 'ভিডিও তালিকা (ভয়েস সহ)' : 'Video Playlist (With Voice)'}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {lang === 'bn' ? 'অফিসিয়াল এইচডী ভিডিও' : 'Official HD Video'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {videoEpisodes.map((ep, idx) => (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => handleSelectVideoEpisode(idx)}
                  className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                    selectedVideoIndex === idx
                      ? 'bg-[#122347] border-cyan-400/80 shadow-md shadow-cyan-500/10'
                      : 'bg-[#091122] border-slate-800/90 hover:border-slate-700 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-mono text-cyan-400 font-bold">
                      #{idx + 1}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {ep.duration}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-white line-clamp-1">
                    {ep.title}
                  </div>
                  <div className="text-[9px] text-slate-400 line-clamp-1 mt-0.5">
                    {ep.subtitle}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          5. ENERGY STATUS:
             ⚡ Generated  🔋 System  📊 Capacity  📈 Output
      ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[22px] bg-[#0c1324] border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              {t.statusSectionTitle}
            </h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {t.statusSectionSubtitle}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* ⚡ Generated */}
          <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                {t.statGeneratedTitle}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">+14.2%</span>
            </div>
            <span className="text-lg font-bold text-white font-mono">{liveGeneration} MW</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">{t.statGeneratedSubtitle}</span>
          </div>

          {/* 🔋 System */}
          <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <BatteryCharging className="w-3.5 h-3.5 text-blue-400" />
                {t.statSystemTitle}
              </span>
              <span className="text-[9px] text-blue-400 font-mono">88%</span>
            </div>
            <span className="text-lg font-bold text-white font-mono">1,280 MWh</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">{t.statSystemSubtitle}</span>
          </div>

          {/* 📊 Capacity */}
          <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                {t.statCapacityTitle}
              </span>
              <span className="text-[9px] text-amber-400 font-mono">500kV</span>
            </div>
            <span className="text-lg font-bold text-white font-mono">{liveCapacity} MW</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">{t.statCapacitySubtitle}</span>
          </div>

          {/* 📈 Output */}
          <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                {t.statOutputTitle}
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">98.4%</span>
            </div>
            <span className="text-lg font-bold text-white font-mono">{liveEfficiency}%</span>
            <span className="block text-[10px] text-slate-400 mt-0.5">{t.statOutputSubtitle}</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          6. AI TECHNOLOGY
      ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[22px] bg-[#0c1324] border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              {t.aiTechTitle}
            </h3>
          </div>
          <span className="text-[10px] text-cyan-400 font-semibold">{t.aiTechSubtitle}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-white">{t.tech1Title}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t.tech1Desc}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-white">{t.tech2Title}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t.tech2Desc}
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800/80 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-white">{t.tech3Title}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t.tech3Desc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          8. ENERGY PERFORMANCE (Interactive Generation Chart)
      ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[22px] bg-[#0c1324] border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              {t.perfTitle}
            </h3>
          </div>
          <div className="flex items-center gap-1 bg-[#10182f] p-0.5 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setPerfMetric('hourly')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                perfMetric === 'hourly' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.perfHourly}
            </button>
            <button
              type="button"
              onClick={() => setPerfMetric('monthly')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                perfMetric === 'monthly' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.perfMonthly}
            </button>
          </div>
        </div>

        {/* Dynamic Interactive Chart Bars */}
        <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Peak Dispatch: <strong className="text-white font-mono">1,480 MW</strong></span>
            <span>Avg Daily Efficiency: <strong className="text-emerald-400 font-mono">98.3%</strong></span>
          </div>

          <div className="h-28 flex items-end justify-between gap-1.5 pt-4 pb-1 px-1">
            {HOURLY_GENERATION_DATA.slice(0, 8).map((data, idx) => {
              const heightPercent = Math.min(100, Math.max(25, (data.generation / 1500) * 100));
              const isHovered = hoveredHour === idx;

              return (
                <div
                  key={data.hour}
                  onMouseEnter={() => setHoveredHour(idx)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end cursor-pointer group"
                >
                  {isHovered && (
                    <div className="absolute -top-7 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-[9px] font-mono text-cyan-300 font-bold whitespace-nowrap z-20 shadow-md">
                      {data.generation} MW
                    </div>
                  )}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-t transition-all ${
                      isHovered
                        ? 'bg-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.8)]'
                        : 'bg-gradient-to-t from-blue-700 to-cyan-500 group-hover:from-blue-600 group-hover:to-cyan-400'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-400">{data.hour}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          8. HOW POWER GRID WORKS & COMPANY PROFILE (Full Workflow, Video, Real Activities & Transparency)
      ─────────────────────────────────────────────────────────── */}
      <HowPowerGridWorksSection
        currentLang={currentLang}
        onOpenLicensesModal={() => setActiveModal('company')}
      />

      {/* ───────────────────────────────────────────────────────────
          11. NEW PROJECTS
      ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[22px] bg-[#0c1324] border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white tracking-wide uppercase">
              {t.newProjectsTitle}
            </h3>
          </div>
          <span className="text-[10px] text-cyan-400 font-medium font-mono">2026 - 2027</span>
        </div>

        <div className="space-y-2.5">
          {newProjectsList.map((proj) => (
            <div key={proj.id} className="p-3 rounded-xl bg-[#10182f] border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{proj.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px] font-bold">
                  {proj.expectedDate}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {proj.description}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span>{proj.location}</span>
                <span className="text-cyan-300 font-mono font-bold">{proj.capacity}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${proj.progressPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ───────────────────────────────────────────────────────────
          13. FAQ
      ─────────────────────────────────────────────────────────── */}
      <div className="rounded-[22px] bg-[#0c1324] border border-slate-800/80 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            {t.faqTitle}
          </h3>
        </div>

        <div className="space-y-2 text-xs">
          {faqList.map((faq) => (
            <div key={faq.id} className="rounded-xl bg-[#10182f] border border-slate-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedFaqId(expandedFaqId === faq.id ? null : faq.id)}
                className="w-full p-3 text-left font-bold text-white flex items-center justify-between hover:text-cyan-300 transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedFaqId === faq.id ? 'rotate-180 text-cyan-400' : 'text-slate-400'}`} />
              </button>
              {expandedFaqId === faq.id && (
                <div className="px-3 pb-3 text-slate-300 text-[11px] leading-relaxed border-t border-slate-800/60 pt-2">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          14. FOOTER
      ─────────────────────────────────────────────────────────── */}
      <footer className="pt-2 pb-6 text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-amber-500 to-cyan-400 flex items-center justify-center p-0.5">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-xs font-bold text-white">NVT • Nova Terra Energy Grid</span>
        </div>
        <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
          {t.footerGridDesc}
        </p>
        <div className="flex items-center justify-center gap-4 text-[10px] text-cyan-400">
          <button
            type="button"
            onClick={() => setActiveModal('company')}
            className="hover:underline cursor-pointer"
          >
            {t.companyTitle}
          </button>
          <span>•</span>
          <button type="button" onClick={() => setActiveModal('support')} className="hover:underline cursor-pointer">
            {t.qmSupport}
          </button>
          <span>•</span>
          <button type="button" onClick={onGoToProfile} className="hover:underline cursor-pointer">
            {t.tabProfile}
          </button>
        </div>
        <span className="block text-[9px] text-slate-500">
          {t.footerCopyright}
        </span>
      </footer>

      {/* ───────────────────────────────────────────────────────────
          SLIDING NAVIGATION DRAWER (From ☰)
      ─────────────────────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] h-full bg-[#0a1020] border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center p-0.5">
                    <Zap className="w-4 h-4 text-black" />
                  </div>
                  <span className="font-bold text-white text-sm">AI ENERGY MENU</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Language Switcher inside Drawer */}
              {onToggleLang && (
                <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-cyan-400" />
                    Language / ভাষা
                  </span>
                  <div className="flex items-center gap-1 bg-[#090f1d] p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => onToggleLang('en')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        lang === 'en' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLang('bn')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        lang === 'bn' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      বাংলা
                    </button>
                  </div>
                </div>
              )}

              {/* Menu Links */}
              <nav className="space-y-1.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('company');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>{t.companyTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('employee');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <HardHat className="w-4 h-4 text-indigo-400" />
                  <span>{t.employeeModalTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onGoToInvest) onGoToInvest();
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>{t.tabInvest}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('supply');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <Gauge className="w-4 h-4 text-yellow-400" />
                  <span>{t.supplyModalTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('ai-energy-video');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                  <span>{t.videoTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('support');
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <Headphones className="w-4 h-4 text-teal-400" />
                  <span>{t.supportModalTitle}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onGoToProfile();
                    setIsDrawerOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-slate-800/80 text-slate-200 hover:text-cyan-300 flex items-center gap-3 transition-colors text-left"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>{t.tabProfile}</span>
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500">
              NVT Grid v4.2 • Enterprise
            </div>
          </div>
        </div>
      )}



      {/* ───────────────────────────────────────────────────────────
          MODAL: COMPANY PROFILE & LICENSES (🏢)
      ─────────────────────────────────────────────────────────── */}
      <CompanyProfileModal
        isOpen={activeModal === 'company'}
        onClose={() => setActiveModal(null)}
        currentLang={currentLang}
        initialTab="overview"
      />

      {/* ───────────────────────────────────────────────────────────
          MODAL: EMPLOYEE TEAM (👷)
      ─────────────────────────────────────────────────────────── */}
      {activeModal === 'employee' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a1020] border border-indigo-500/40 rounded-3xl p-5 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t.employeeModalTitle}</h3>
                  <span className="text-[10px] text-indigo-400 font-mono">Active Personnel: 240+</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Employee 1 */}
              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Dr. Arthur Vance, PhD</h4>
                  <p className="text-[10px] text-cyan-400">Chief Grid Architect & AI Lead</p>
                  <span className="text-[9px] text-slate-400">Ex-National Grid UK • 18 Yrs Experience</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                  Verified ✓
                </span>
              </div>

              {/* Employee 2 */}
              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Engr. Tanvir Ahmed, PE</h4>
                  <p className="text-[10px] text-cyan-400">Head of Substation & HVDC Transmission</p>
                  <span className="text-[9px] text-slate-400">BUET Graduate • BERC Grid Advisory</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                  Verified ✓
                </span>
              </div>

              {/* Employee 3 */}
              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Elena Rostova</h4>
                  <p className="text-[10px] text-cyan-400">Director of BESS & Battery Chemistry</p>
                  <span className="text-[9px] text-slate-400">Ex-Siemens Energy • LFP Battery Pioneer</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                  Verified ✓
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}



      {/* ───────────────────────────────────────────────────────────
          MODAL: SYSTEM DETAILS
      ─────────────────────────────────────────────────────────── */}
      {activeModal === 'system-details' && selectedSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a1020] border border-cyan-500/40 rounded-3xl p-5 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{selectedSystem.name}</h3>
                  <span className="text-[10px] text-cyan-400">{selectedSystem.category}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-44 rounded-xl overflow-hidden border border-slate-800">
              <img
                src={selectedSystem.image}
                alt={selectedSystem.name}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${selectedSystem.statusColor}`}>
                  {selectedSystem.status}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {selectedSystem.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{t.locationLabel}</span>
                  <span className="text-white font-medium">{selectedSystem.location}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{t.frequencyLabel}</span>
                  <span className="text-cyan-300 font-mono font-bold">{selectedSystem.gridFrequency}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{t.capacityLabel}</span>
                  <span className="text-white font-mono font-bold">{selectedSystem.capacity}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#10182f] border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">{t.efficiencyLabel}</span>
                  <span className="text-emerald-300 font-mono font-bold">{selectedSystem.efficiency}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 block font-semibold uppercase">{t.highlightsLabel}</span>
                <ul className="space-y-1 text-[11px] text-slate-300">
                  {selectedSystem.highlights.map((h, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: POWER SUPPLY & SUBSTATION (⚡)
      ─────────────────────────────────────────────────────────── */}
      {activeModal === 'supply' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a1020] border border-yellow-500/40 rounded-3xl p-5 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t.supplyModalTitle}</h3>
                  <span className="text-[10px] text-yellow-400 font-mono">132kV / 500kV HVDC Corridors</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{lang === 'bn' ? 'ঢাকা ইন্ডাস্ট্রিয়াল সাবস্টেশন #০১' : 'Dhaka Industrial Substation #01'}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                    Online 100%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">132kV Synchronous Feed • 1,420 MW Load</p>
              </div>

              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{lang === 'bn' ? 'চট্টগ্রাম উপকূলীয় বন্দর নোড' : 'Chattogram Coastal Port Node'}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                    Online 99.8%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Offshore HVDC Inverter Link • 980 MW Load</p>
              </div>

              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold">{lang === 'bn' ? 'বরেন্দ্র নবায়নযোগ্য সঞ্চালন কেন্দ্র' : 'Barind Renewable Transmission Hub'}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                    Online 99.9%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Solar Mega-Park Corridor • 2,420 MW Peak Feed</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: SUPPORT & HELPLINE (🎧)
      ─────────────────────────────────────────────────────────── */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a1020] border border-teal-500/40 rounded-3xl p-5 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t.supportModalTitle}</h3>
                  <span className="text-[10px] text-teal-400">{lang === 'bn' ? 'তাত্ক্ষণিক সহায়তা' : 'Instant Assistance'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{lang === 'bn' ? 'জরুরী গ্রিড হটলাইন' : 'Emergency Grid Hotline'}</h4>
                  <p className="text-[11px] text-slate-400">+880 9612-345678 (24/7 Toll-Free)</p>
                </div>
                <a
                  href="tel:+8809612345678"
                  className="px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 font-bold hover:bg-teal-500/30"
                >
                  {lang === 'bn' ? 'কল করুন' : 'Call Now'}
                </a>
              </div>

              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{lang === 'bn' ? 'অফিসিয়াল টেলিগ্রাম চ্যানেল' : 'Official Telegram Channel'}</h4>
                  <p className="text-[11px] text-slate-400">@NVTEnergySupport</p>
                </div>
                <button
                  type="button"
                  onClick={() => showToast('Telegram: @NVTEnergySupport')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 font-bold hover:bg-cyan-500/30 cursor-pointer"
                >
                  {lang === 'bn' ? 'যুক্ত হোন' : 'Join'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#10182f] border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">{lang === 'bn' ? 'ইমেইল সাপোর্ট' : 'Email Support'}</h4>
                  <p className="text-[11px] text-slate-400">support@novaterraenergy.io</p>
                </div>
                <a
                  href="mailto:support@novaterraenergy.io"
                  className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 font-bold hover:bg-blue-500/30"
                >
                  {lang === 'bn' ? 'ইমেইল' : 'Email'}
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: NEW PROJECTS (🆕)
      ─────────────────────────────────────────────────────────── */}
      {activeModal === 'new-projects' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#0a1020] border border-emerald-500/40 rounded-3xl p-5 text-white space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{t.newProjectsTitle}</h3>
                  <span className="text-[10px] text-emerald-400 font-mono">{t.newProjectsSubtitle}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {newProjectsList.map((proj) => (
                <div key={proj.id} className="p-3 rounded-xl bg-[#10182f] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">{proj.name}</h4>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-bold">{proj.expectedDate}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {proj.description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{proj.location}</span>
                    <span className="text-cyan-300 font-mono font-bold">{proj.capacity}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${proj.progressPercent}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
