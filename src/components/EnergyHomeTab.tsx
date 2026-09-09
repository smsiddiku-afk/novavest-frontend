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
  Moon,
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
  TrendingUp,
  ArrowUp,
  LayoutGrid,
  Leaf,
  User,
  UserCheck
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
import { resolveImageSrc, handleImageError } from '../utils/imageUtils';

interface EnergyHomeTabProps {
  currentLang?: Language;
  onToggleLang?: (lang: Language) => void;
  themeMode?: 'night' | 'day';
  onToggleTheme?: (mode: 'night' | 'day') => void;
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
  themeMode = 'night',
  onToggleTheme,
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
  const [isVoiceActive, setIsVoiceActive] = useState(true);
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
      image: '/images/solar_ai_substation_1788465992131.jpg',
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
      image: '/images/bess_storage_facility_1788466008161.jpg',
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
      image: '/images/smart_turbine_plant_1788466039952.jpg',
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
    if (videoElementRef.current) {
      if (videoElementRef.current.paused) {
        videoElementRef.current.muted = !isVoiceActive;
        videoElementRef.current.volume = 1.0;
        videoElementRef.current.play().then(() => {
          setIsVideoPlaying(true);
        }).catch((err) => {
          console.warn('Video play error:', err);
          setIsVideoPlaying(true);
        });
      } else {
        videoElementRef.current.pause();
        setIsVideoPlaying(false);
      }
    } else {
      const nextPlay = !isVideoPlaying;
      setIsVideoPlaying(nextPlay);
    }
  };

  const handleToggleVoiceNarration = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextVoice = !isVoiceActive;
    setIsVoiceActive(nextVoice);
    if (videoElementRef.current) {
      videoElementRef.current.muted = !nextVoice;
    }
    showToast(
      nextVoice
        ? (lang === 'bn' ? '🔊 অডিও চালু করা হয়েছে' : '🔊 Voice unmuted')
        : (lang === 'bn' ? '🔇 অডিও মিউট করা হয়েছে' : '🔇 Voice muted')
    );
  };

  const handleSelectVideoEpisode = (idx: number) => {
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

  // Chart & Slide State
  const [activeSlide, setActiveSlide] = useState(0);
  const [livePayoutIndex, setLivePayoutIndex] = useState(0);

  // Live Telemetry Simulation
  const [liveGeneration, setLiveGeneration] = useState(4820.9);
  const [liveEfficiency, setLiveEfficiency] = useState(98.4);
  const [liveFrequency, setLiveFrequency] = useState(50);
  const [liveCapacity] = useState(6500);

  // Live telemetry pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveGeneration((prev) => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setLiveEfficiency((prev) => +(98.3 + Math.random() * 0.2).toFixed(1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Top Power Systems Photographic Carousel (Pure Clean Power Infrastructure matching screenshot)
  const heroSlides = useMemo(() => [
    {
      id: 'slide-green-power',
      tag: lang === 'bn' ? 'গ্রিন পাওয়ার ইনফ্রাস্ট্রাকচার' : 'Green Power Infrastructure',
      title1: lang === 'bn' ? 'ক্লিন এনার্জিতে বিনিয়োগ করুন' : 'Invest in Clean Energy',
      title2: lang === 'bn' ? 'টেকসই ভবিষ্যৎ গড়ে তুলুন' : 'Build a Sustainable Future',
      desc: lang === 'bn'
        ? 'গ্লোবাল রিনিউয়েবল এনার্জি প্রকল্পে অংশীদার হয়ে প্রতিদিন মুনাফা অর্জন করুন। আপনার আজকের বিনিয়োগ এনে দেবে একটি সবুজ ভবিষ্যৎ।'
        : 'Partner with global renewable energy projects and earn daily profits. Your investment today creates a greener tomorrow.',
      badge: lang === 'bn' ? '🌱 সাসটেইনেবল এনার্জি • গ্লোবাল গ্রোথ' : '🌱 Sustainable Energy • Global Growth',
      image: '/images/energy-hero.jpg',
      fallback: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'slide-wind-turbines',
      tag: lang === 'bn' ? 'অফশোর উইন্ড পাওয়ার' : 'Offshore Wind Generation',
      title1: lang === 'bn' ? 'উইন্ড টারবাইন মেগা পার্ক' : 'Oceanic Wind Turbine Park',
      title2: lang === 'bn' ? 'নিরবচ্ছিন্ন সবুজ বিদ্যুৎ' : 'Zero-Carbon Grid Power',
      desc: lang === 'bn'
        ? 'সমুদ্রের শক্তিশালী বায়ুপ্রবাহ কাজে লাগিয়ে জাতীয় গ্রিডে ৫০ হার্জ ক্লিন বিদ্যুৎ সরবরাহ করা হচ্ছে।'
        : 'Harnessing oceanic wind currents with zero emissions for continuous 50 Hz green power transmission.',
      badge: lang === 'bn' ? '⚡ ৫০ হার্জ গ্রিড সিঙ্ক্রোনাইজেশন' : '⚡ 50 Hz Grid Synchronization',
      image: '/images/novawind-facility.jpg',
      fallback: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'slide-solar-farm',
      tag: lang === 'bn' ? 'স্মার্ট এআই সাবস্টেশন' : 'Smart AI Power Grid',
      title1: lang === 'bn' ? 'হাই-ভোল্টেজ অটোমেশন' : 'Automated Load Dispatch',
      title2: lang === 'bn' ? '৯৮.৪% প্ল্যান্ট এফিসিয়েন্সি' : '98.4% Plant Efficiency',
      desc: lang === 'bn'
        ? 'স্বয়ংক্রিয় এআই ডেসপ্যাচার ভোল্টেজ ও ফ্রিকোয়েন্সি নিয়ন্ত্রণ করে বাণিজ্যিক ও শিল্পাঞ্চলে বিদ্যুৎ সরবরাহ বজায় রাখে।'
        : 'Automated AI dispatchers stabilize voltage and frequency, supplying reliable power across commercial hubs.',
      badge: lang === 'bn' ? '☀️ ৯৮.৪% এফিসিয়েন্সি মেট্রিক্স' : '☀️ 98.4% Efficiency Matrix',
      image: '/images/solar_ai_substation_1788465992131.jpg',
      fallback: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'slide-bess-storage',
      tag: lang === 'bn' ? 'BESS ব্যাটারি স্টোরেজ' : 'BESS Energy Storage',
      title1: lang === 'bn' ? 'লিথিয়াম ফসফেট রিজার্ভ' : 'Advanced LFP Battery Reserve',
      title2: lang === 'bn' ? '২৪/৭ পিক আওয়ার ব্যাকআপ' : '24/7 Peak Demand Backup',
      desc: lang === 'bn'
        ? 'উদ্বৃত্ত শক্তি বিশাল ব্যাটারি স্টোরেজে সঞ্চয় করে রাতে ও পিক আওয়ারের বিদ্যুৎ চাহিদা মেটানো হয়।'
        : 'Industrial battery reserves guarantee round-the-clock power reliability and steady daily returns.',
      badge: lang === 'bn' ? '🔋 ফাস্ট ডিসচার্জ ব্যাকআপ' : '🔋 Fast LFP Discharge Reserve',
      image: '/images/vanguard-bess-storage.jpg',
      fallback: '/images/bess_storage_facility_1788466008161.jpg',
    },
  ], [lang]);

  // Auto-advance banner slides every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

  // Single-line withdrawal notification alerts under carousel (matching user screenshot)
  const [liveWithdrawalAlertIndex, setLiveWithdrawalAlertIndex] = useState(0);
  const liveWithdrawalAlerts = useMemo(() => [
    { id: '18**36', amount: '4500' },
    { id: '17**92', amount: '5000' },
    { id: '19**44', amount: '2500' },
    { id: '18**11', amount: '12000' },
    { id: '16**90', amount: '8500' },
    { id: '13**21', amount: '3000' },
    { id: '17**94', amount: '10000' },
    { id: '15**08', amount: '6200' },
    { id: '18**10', amount: '15000' },
    { id: '19**23', amount: '4500' },
    { id: '17**31', amount: '20000' },
  ], []);

  useEffect(() => {
    const alertTimer = setInterval(() => {
      setLiveWithdrawalAlertIndex((prev) => (prev + 1) % liveWithdrawalAlerts.length);
    }, 2600);
    return () => clearInterval(alertTimer);
  }, [liveWithdrawalAlerts.length]);

  // Live Payouts data (Bangladesh mobile banking & withdrawals for detailed feed)
  const livePayouts = useMemo(() => [
    { phone: '017****5892', amount: '৳৫,০০০', method: 'bKash', time: lang === 'bn' ? 'এইমাত্র' : 'Just now', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#e2136e]', brandText: 'bKash' },
    { phone: '019****4412', amount: '৳২,৫০০', method: 'Nagad', time: lang === 'bn' ? '১ মিনিট আগে' : '1m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#f7941d]', brandText: 'Nagad' },
    { phone: '018****1154', amount: '৳১২,০০০', method: 'Rocket', time: lang === 'bn' ? '২ মিনিট আগে' : '2m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#8c3494]', brandText: 'Rocket' },
    { phone: '016****7890', amount: '৳৮,৫০০', method: 'bKash', time: lang === 'bn' ? '৩ মিনিট আগে' : '3m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#e2136e]', brandText: 'bKash' },
    { phone: '013****6621', amount: '৳৩,০০০', method: 'Nagad', time: lang === 'bn' ? '৩ মিনিট আগে' : '3m ago', type: lang === 'bn' ? 'টাকা গ্রহণ সফল' : 'Payout Received', brandBg: 'bg-[#f7941d]', brandText: 'Nagad' },
    { phone: '017****2394', amount: '৳১০,০০০', method: 'bKash', time: lang === 'bn' ? '৪ মিনিট আগে' : '4m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#e2136e]', brandText: 'bKash' },
    { phone: '015****9908', amount: '৳৬,২০০', method: 'Rocket', time: lang === 'bn' ? '৫ মিনিট আগে' : '5m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#8c3494]', brandText: 'Rocket' },
    { phone: '018****3410', amount: '৳১৫,০০০', method: 'bKash', time: lang === 'bn' ? '৬ মিনিট আগে' : '6m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#e2136e]', brandText: 'bKash' },
    { phone: '019****7823', amount: '৳৪,৫০০', method: 'Nagad', time: lang === 'bn' ? '৭ মিনিট আগে' : '7m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#f7941d]', brandText: 'Nagad' },
    { phone: '017****4931', amount: '৳২০,০০০', method: 'bKash', time: lang === 'bn' ? '৮ মিনিট আগে' : '8m ago', type: lang === 'bn' ? 'উত্তোলন সফল' : 'Withdrawal Paid', brandBg: 'bg-[#e2136e]', brandText: 'bKash' },
  ], [lang]);

  // Live Payout rotator timer
  useEffect(() => {
    const payoutTimer = setInterval(() => {
      setLivePayoutIndex((prev) => (prev + 1) % livePayouts.length);
    }, 2800);
    return () => clearInterval(payoutTimer);
  }, [livePayouts.length]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText('https://nvt-energy.io/portal/ref?code=NVT123456');
    showToast(t.toastCopied);
  };

  const handleOpenSystemDetails = (sys: EnergySystem) => {
    setSelectedSystem(sys);
    setActiveModal('system-details');
  };

  return (
    <div className={`w-full flex flex-col space-y-4 pb-6 transition-colors duration-200 ${themeMode === 'day' ? 'text-slate-800' : 'text-slate-100'} animate-in fade-in duration-200`}>
      {/* ───────────────────────────────────────────────────────────
          1. TOP HEADER BAR: [ ☰ ]  [ AI ENERGY ]  [ 🌐 বাংলা ∨ ] [ 🔔 ]
          (Screenshot matching: Clean 3-bar hamburger menu on left, Sun/Leaf badge + AI ENERGY in center, language + bell on right)
      ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-1 pb-1">
        {/* Left: 3-bar clean hamburger Menu button */}
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer text-white"
          aria-label="Open Navigation Menu"
          title="Menu"
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        {/* Center: Modern Clean Energy Branding with Sun/Leaf Icon (Excluding 'SDRL' as requested) */}
        <div className="flex items-center gap-2">
          {/* Sun + Leaf Icon */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="6.5" fill="#f59e0b" />
              <path d="M18 4V7M18 29V32M4 18H7M29 18H32M8.1 8.1L10.5 10.5M25.5 25.5L27.9 27.9M8.1 27.9L10.5 25.5M25.5 10.5L27.9 8.1" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 28C12 28 14 17 25 14C25 14 26 23 15 27C13.8 27.4 12.8 27.8 12 28Z" fill="#00e676" />
              <path d="M15 25C18 22 21 19 23 16" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 font-black text-lg sm:text-xl tracking-wider leading-none">
              <span className={themeMode === 'day' ? 'text-slate-900' : 'text-white'}>AI</span>
              <span className="text-[#00e676]">ENERGY</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
              Clean Energy | Better Tomorrow
            </span>
          </div>
        </div>

        {/* Right: Language Dropdown & Notification Bell */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Language Toggle Pill: [ 🌐 বাংলা ∨ ] */}
          <button
            type="button"
            onClick={() => onToggleLang && onToggleLang(lang === 'en' ? 'bn' : 'en')}
            className={`px-2.5 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
              themeMode === 'day'
                ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                : 'bg-[#071936] border-slate-700/80 hover:border-slate-600 text-slate-200'
            }`}
            title={lang === 'en' ? 'Switch to Bengali' : 'Switch to English'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold">{lang === 'en' ? 'English' : 'বাংলা'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Notifications 🔔 with Red Alert Badge */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all relative cursor-pointer shadow-xs shrink-0 ${
              themeMode === 'day'
                ? 'bg-white border-slate-300 text-slate-700 hover:text-slate-900'
                : 'bg-[#071936] border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white'
            }`}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-white" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#001228] animate-pulse" />
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          2. SLIDING HERO BANNER (Matching Screenshot Exactly)
          "উপরে ব্যানার গুলা যেরকম দিছি অইরকম ভাবে স্লাইড হবে"
      ─────────────────────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden rounded-2xl shadow-xl bg-[#001228] min-h-[220px] sm:min-h-[240px] border border-cyan-500/20">
        {heroSlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              activeSlide === idx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image of Green Energy Systems */}
            <img
              src={resolveImageSrc(slide.image, 'offshore')}
              alt={slide.title1}
              className="w-full h-full object-cover object-right"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                if (slide.fallback && target.src !== slide.fallback) {
                  target.src = slide.fallback;
                } else {
                  handleImageError(e, 'offshore');
                }
              }}
            />

            {/* Dark gradient overlay on left half for pristine text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#001228] via-[#001228]/85 to-transparent/30 sm:to-transparent" />

            {/* Banner Text Overlaid matching screenshot */}
            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between max-w-[85%] sm:max-w-[70%] z-10">
              <div className="space-y-1 sm:space-y-1.5">
                <span className="text-[11px] sm:text-xs font-extrabold text-[#00e676] tracking-wide block">
                  {slide.tag}
                </span>
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-tight">
                  {slide.title1} <br />
                  <span className="text-[#00e676]">{slide.title2}</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-200 line-clamp-3 leading-relaxed mt-1">
                  {slide.desc}
                </p>
              </div>

              {/* Bottom pill badge */}
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e676]/15 border border-[#00e676]/40 text-[#00e676] text-[11px] font-bold shadow-xs">
                  {slide.badge}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Carousel Pagination Dots at Bottom Center */}
        <div className="absolute bottom-2.5 right-4 z-20 flex items-center gap-1.5 pointer-events-auto">
          {heroSlides.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={() => setActiveSlide(dotIdx)}
              className={`h-1.5 transition-all duration-300 cursor-pointer ${
                activeSlide === dotIdx
                  ? 'w-6 rounded-full bg-[#00e676] shadow-md'
                  : 'w-1.5 rounded-full bg-white/40 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          3. POWER GRID TELEMETRY METRICS (Matching Screenshot: 3 Columns, Borderless)
             Power Dispatched 4820.9 MW | Plant Efficiency 98.4% | Grid Frequency 50 Hz
      ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 py-2 px-1 text-center bg-transparent border-0 border-none shadow-none">
        {/* 1. Power Dispatched */}
        <div className="flex flex-col items-center justify-center border-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#00e676]/15 text-[#00e676] flex items-center justify-center mb-1.5">
            <Zap className="w-5 h-5 fill-[#00e676]" />
          </div>
          <span className="text-xs sm:text-[13px] text-slate-300 font-medium leading-tight block">
            {lang === 'bn' ? 'বিদ্যুৎ সরবরাহ' : 'Power Dispatched'}
          </span>
          <span className="text-sm sm:text-base font-bold text-[#38bdf8] font-mono tracking-tight mt-0.5 block">
            {liveGeneration} MW
          </span>
        </div>

        {/* 2. Plant Efficiency */}
        <div className="flex flex-col items-center justify-center border-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#00e676]/15 text-[#00e676] flex items-center justify-center mb-1.5">
            <Leaf className="w-5 h-5 fill-[#00e676]" />
          </div>
          <span className="text-xs sm:text-[13px] text-slate-300 font-medium leading-tight block">
            {lang === 'bn' ? 'প্ল্যান্ট দক্ষতা' : 'Plant Efficiency'}
          </span>
          <span className="text-sm sm:text-base font-bold text-[#38bdf8] font-mono tracking-tight mt-0.5 block">
            {liveEfficiency}%
          </span>
        </div>

        {/* 3. Grid Frequency */}
        <div className="flex flex-col items-center justify-center border-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0284c7]/20 text-[#38bdf8] flex items-center justify-center mb-1.5">
            <Activity className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-[13px] text-slate-300 font-medium leading-tight block">
            {lang === 'bn' ? 'গ্রিড ফ্রিকোয়েন্সি' : 'Grid Frequency'}
          </span>
          <span className="text-sm sm:text-base font-bold text-[#38bdf8] font-mono tracking-tight mt-0.5 block">
            {liveFrequency} Hz
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          4. QUICK SERVICES (8 Cards Grid - Matching Screenshot Colors & Icons)
      ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-white">
              {lang === 'bn' ? 'কুইক সার্ভিস' : 'Quick Services'}
            </h2>
          </div>
          <span className="text-xs font-bold text-cyan-400 flex items-center gap-0.5 cursor-pointer hover:underline">
            8 Actions <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* 8-Card Grid (2 Rows of 4 Cards) */}
        <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
          {/* Card 1: Deposit (Royal Blue, Wallet) */}
          <button
            type="button"
            onClick={onOpenRecharge}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#1d4ed8] to-[#1e40af] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Wallet className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'ডিপোজিট' : 'Deposit'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-blue-200 font-medium flex items-center gap-0.5 mt-0.5">
              {lang === 'bn' ? 'অ্যাড ফান্ড' : 'Add Funds'} <ChevronRight className="w-2.5 h-2.5" />
            </span>
          </button>

          {/* Card 2: Withdraw (Emerald Green, Up Arrow) */}
          <button
            type="button"
            onClick={onOpenWithdraw}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#059669] to-[#047857] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <ArrowUp className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'উত্তোলন' : 'Withdraw'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-emerald-200 font-medium flex items-center gap-0.5 mt-0.5">
              {lang === 'bn' ? 'ক্যাশ আউট' : 'Cash Out'} <ChevronRight className="w-2.5 h-2.5" />
            </span>
          </button>

          {/* Card 3: Company Profile (Warm Amber, Person/Profile) */}
          <button
            type="button"
            onClick={() => setActiveModal('company')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#d97706] to-[#b45309] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <User className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'কোম্পানি' : 'Company Profile'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-amber-200 font-medium flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {lang === 'bn' ? 'লাইসেন্স' : 'Licenses & Docs'} <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </span>
          </button>

          {/* Card 4: Leadership (Violet/Purple, User) */}
          <button
            type="button"
            onClick={() => setActiveModal('employee')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <UserCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'নেতৃত্ব' : 'Leadership'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-purple-200 font-medium flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {lang === 'bn' ? 'ইঞ্জিনিয়ার' : 'Engineers'} <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </span>
          </button>

          {/* Card 5: New Projects (Teal, Gift) */}
          <button
            type="button"
            onClick={() => setActiveModal('new-projects')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#0d9488] to-[#0f766e] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Gift className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'নতুন প্রজেক্ট' : 'New Projects'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-teal-200 font-medium flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {lang === 'bn' ? 'আসন্ন ২০২৬' : 'Upcoming 2026-27'} <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </span>
          </button>

          {/* Card 6: Invite (Magenta/Rose, Share2) */}
          <button
            id="home-quick-invite-btn"
            type="button"
            onClick={() => {
              if (onOpenInvite) onOpenInvite();
              else handleCopyReferral();
            }}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#e11d48] to-[#be123c] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Share2 className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'ইনভাইট' : 'Invite'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-pink-200 font-medium flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {lang === 'bn' ? 'রেফার ও আয়' : 'Refer & Earn'} <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </span>
          </button>

          {/* Card 7: Power Grid (Electric Blue, Zap) */}
          <button
            type="button"
            onClick={() => setActiveModal('supply')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#1d4ed8] to-[#1e3a8a] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Zap className="w-4.5 h-4.5 text-white fill-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'পাওয়ার গ্রিড' : 'Power Grid'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-blue-200 font-medium flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {lang === 'bn' ? 'লাইভ স্ট্যাটাস' : 'Live Status'} <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </span>
          </button>

          {/* Card 8: Support (Sky Cyan, Headphones) */}
          <button
            type="button"
            onClick={() => setActiveModal('support')}
            className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Headphones className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-xs sm:text-sm font-bold leading-tight block truncate w-full">
              {lang === 'bn' ? 'সাপোর্ট' : 'Support'}
            </span>
            <span className="text-[9.5px] sm:text-[10px] text-cyan-200 font-medium flex items-center gap-0.5 mt-0.5 truncate max-w-full">
              {lang === 'bn' ? '২৪/৭ হেল্পলাইন' : '24/7 Helpline'} <ChevronRight className="w-2.5 h-2.5 shrink-0" />
            </span>
          </button>
        </div>
      </div>


      {/* ───────────────────────────────────────────────────────────
          5. LIVE WITHDRAWAL & PAYOUT SLIDING NOTIFICATIONS
             "উইথড্র লাইভ সিস্টেম আরো একটু নিচে যাবে"
      ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2.5 pt-1">
        {/* Header with pulsating live indicator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className={`text-xs sm:text-sm font-extrabold tracking-wide ${
              themeMode === 'day' ? 'text-slate-900' : 'text-white'
            }`}>
              {lang === 'bn' ? 'সরাসরি উত্তোলন ও টাকা গ্রহণ নোটিফিকেশন' : 'Live Withdrawal & Cashout Notifications'}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {lang === 'bn' ? 'লাইভ ভেরিফাইড' : 'Live Verified'}
          </span>
        </div>

        {/* Featured Live Payout Card (Rotates every 2.8s) */}
        <div className={`rounded-2xl p-3 sm:p-3.5 transition-all relative overflow-hidden ${
          themeMode === 'day'
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200'
            : 'bg-gradient-to-r from-[#071b26] via-[#092230] to-[#071724] border border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs sm:text-sm font-black ${
                    themeMode === 'day' ? 'text-slate-900' : 'text-white'
                  }`}>
                    {livePayouts[livePayoutIndex].phone}
                  </span>
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold text-white ${livePayouts[livePayoutIndex].brandBg}`}>
                    {livePayouts[livePayoutIndex].brandText}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">
                  {livePayouts[livePayoutIndex].type}: {lang === 'bn' ? 'সরাসরি ওয়ালেটে পৌঁছে গেছে' : 'Credited to mobile wallet'}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-base sm:text-lg font-black text-emerald-400 font-mono block leading-tight">
                {livePayouts[livePayoutIndex].amount}
              </span>
              <span className="text-[10px] text-slate-400">
                {livePayouts[livePayoutIndex].time}
              </span>
            </div>
          </div>
        </div>

        {/* Continuous Horizontal Sliding Marquee Ticker */}
        <div className="overflow-hidden rounded-xl bg-black/40 py-2 border border-slate-800/80">
          <div className="animate-marquee-slide flex items-center gap-3">
            {[...livePayouts, ...livePayouts].map((payout, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0c1629] border border-slate-800 text-xs shrink-0 whitespace-nowrap"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-white font-bold font-mono">{payout.phone}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold text-white ${payout.brandBg}`}>
                  {payout.brandText}
                </span>
                <span className="text-emerald-400 font-black font-mono">{payout.amount}</span>
                <span className="text-slate-400 text-[10px]">{payout.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          6. 🎬 VIDEO PLAYER (ভিডিও নিচে নাম্বে আরো পেজে যেনো সুন্দর লাগে)
      ─────────────────────────────────────────────────────────── */}
      <div id="ai-energy-video" className="rounded-3xl bg-black overflow-hidden shadow-2xl space-y-0 border-0 border-none">
        {/* Video Canvas View (NO BORDER) */}
        <div className="relative h-56 sm:h-64 rounded-3xl overflow-hidden bg-black group border-0 border-none">
          {/* Native Clean Video Element */}
          <video
            ref={videoElementRef}
            src={videoEpisodes[selectedVideoIndex].videoSrc}
            poster={resolveImageSrc(videoEpisodes[selectedVideoIndex].image, 'solar')}
            className="w-full h-full object-cover"
            playsInline
            preload="auto"
            loop
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onTimeUpdate={(e) => setVideoSeconds(Math.floor(e.currentTarget.currentTime))}
            onClick={handleToggleVideoPlay}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#060a14] via-black/20 to-black/40 pointer-events-none" />

          {/* Center Interactive Play Prompt when stopped */}
          {!isVideoPlaying ? (
            <div
              onClick={handleToggleVideoPlay}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px] cursor-pointer transition-all hover:bg-black/30"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 text-black flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform hover:scale-110 active:scale-95 transition-all">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
              <div className="mt-3 px-3.5 py-1.5 rounded-full bg-black/80 text-xs font-bold text-cyan-300 shadow-md">
                {lang === 'bn' ? 'ভিডিও দেখতে এখানে ক্লিক করুন' : 'Click to Watch Facility Video'}
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button
                type="button"
                onClick={handleToggleVideoPlay}
                className="w-14 h-14 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white shadow-2xl transition-all hover:scale-110 cursor-pointer pointer-events-auto"
                title="Pause"
              >
                <Pause className="w-6 h-6 fill-current" />
              </button>
            </div>
          )}

          {/* Captions / Subtitles */}
          {isVideoPlaying && (
            <div className="absolute bottom-12 inset-x-3 text-center pointer-events-none">
              <div className="inline-block max-w-[92%] px-3.5 py-1.5 rounded-xl bg-black/85 text-xs sm:text-sm text-cyan-200 font-medium shadow-xl animate-in fade-in duration-300">
                {videoEpisodes[selectedVideoIndex].captions.find(
                  (c) => (videoSeconds % 25) >= c.start && (videoSeconds % 25) < c.end
                )?.text || videoEpisodes[selectedVideoIndex].captions[0]?.text}
              </div>
            </div>
          )}

          {/* Bottom Control Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-4 space-y-2">
            {/* Scrubber Progress Bar */}
            <div
              onClick={() => {
                if (videoElementRef.current) {
                  const currentTotal = videoEpisodes[selectedVideoIndex]?.totalSec || 30;
                  const nextTime = (videoElementRef.current.currentTime + 5) % currentTotal;
                  videoElementRef.current.currentTime = nextTime;
                  setVideoSeconds(Math.floor(nextTime));
                } else {
                  setVideoSeconds((prev) => prev + 5);
                }
              }}
              className="w-full bg-slate-800/90 rounded-full h-1.5 overflow-hidden cursor-pointer group/bar relative"
            >
              <div
                className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 h-full rounded-full transition-all duration-300 relative"
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
              />
            </div>

            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2.5">
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
                  className={`p-1 cursor-pointer transition-colors ${
                    isVoiceActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={isVoiceActive ? 'Mute Voice' : 'Unmute Voice'}
                >
                  {isVoiceActive ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                </button>

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

              <span className="text-[11px] font-semibold text-white truncate max-w-[170px] sm:max-w-[240px]">
                {videoEpisodes[selectedVideoIndex].title}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          6.1 HOW THE POWER GRID WORKS (কিভাবে পাওয়ার গ্রিড কাজ করে)
          (Borderless, matching screenshot's warm palette, filling the page nicely)
      ─────────────────────────────────────────────────────────── */}
      <div className="w-full space-y-3 pt-2">
        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 rounded-full bg-[#f97316]" />
              <span className="w-1.5 h-5 rounded-full bg-[#10b981]" />
              <span className="w-1.5 h-3.5 rounded-full bg-[#06b6d4]" />
            </div>
            <span className={`text-sm sm:text-base font-extrabold tracking-wide ${
              themeMode === 'day' ? 'text-slate-900' : 'text-white'
            }`}>
              {lang === 'bn' ? 'কিভাবে এআই পাওয়ার গ্রিড কাজ করে' : 'How the AI Power Grid Works'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-amber-500 dark:text-amber-400">
            {lang === 'bn' ? 'স্মার্ট অটোমেশন' : 'Smart Automation'}
          </span>
        </div>

        {/* 4 Process Cards - matching the screenshot's warm peach/cream tint, borderless */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Card 1: Clean Power Generation */}
          <div className="p-3.5 rounded-2xl bg-[#fff8f0] dark:bg-[#131c2d] border-0 border-none shadow-xs space-y-1.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#f97316]/15 text-[#ea580c] dark:text-[#fb923c] flex items-center justify-center text-xs font-black">
                  ১
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'ক্লিন বিদ্যুৎ উৎপাদন' : 'Clean Power Generation'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                100% Zero-Carbon
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'সুবিশাল সৌর পার্ক ও অফশোর উইন্ড টারবাইনের মাধ্যমে প্রাকৃতিক শক্তি থেকে নিরবচ্ছিন্ন ক্লিন বিদ্যুৎ উৎপাদন করা হয়।'
                : 'Zero-emission clean electricity is generated continuously from massive solar parks and offshore wind turbines.'}
            </p>
          </div>

          {/* Card 2: AI Grid Synchronization */}
          <div className="p-3.5 rounded-2xl bg-[#fff8f0] dark:bg-[#131c2d] border-0 border-none shadow-xs space-y-1.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#10b981]/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">
                  ২
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'এআই গ্রিড ডেসপ্যাচ' : 'AI Smart Grid Dispatch'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400">
                50 Hz Sync
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'স্বয়ংক্রিয় এআই কন্ট্রোলারের মাধ্যমে ভোল্টেজ ও ৫০ হার্জ ফ্রিকোয়েন্সি নিয়ন্ত্রণ করে সরাসরি জাতীয় পাওয়ার গ্রিডে বিদ্যুৎ সরবরাহ হয়।'
                : 'Automated AI dispatchers stabilize voltage and grid frequency at 50 Hz, supplying reliable power directly to national grids.'}
            </p>
          </div>

          {/* Card 3: BESS Battery Reserve */}
          <div className="p-3.5 rounded-2xl bg-[#fff8f0] dark:bg-[#131c2d] border-0 border-none shadow-xs space-y-1.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#06b6d4]/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-black">
                  ৩
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'ব্যাটারি স্টোরেজ (BESS)' : 'BESS Energy Storage'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                24/7 Backup
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'উদ্বৃত্ত শক্তি উন্নত লিথিয়াম আয়রন ফসফেট ব্যাটারিতে সঞ্চয় করে রাতে ও পিক আওয়ারের বিদ্যুৎ চাহিদা পূরণ করা হয়।'
                : 'Surplus power is stored in high-capacity LFP energy storage systems to guarantee uninterrupted power during peak hours.'}
            </p>
          </div>

          {/* Card 4: Daily Revenue & Payout */}
          <div className="p-3.5 rounded-2xl bg-[#fff8f0] dark:bg-[#131c2d] border-0 border-none shadow-xs space-y-1.5 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#e11d48]/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs font-black">
                  ৪
                </span>
                <span className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white">
                  {lang === 'bn' ? 'দৈনিক বিদ্যুৎ মুনাফা' : 'Daily Revenue Dividends'}
                </span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                Auto-Credit
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'গ্রিডে বিদ্যুৎ বিক্রির অর্জিত রাজস্ব স্বয়ংক্রিয়ভাবে হিসাব হয়ে প্রতিদিন বিনিয়োগকারীদের ওয়ালেটে লভ্যাংশ হিসেবে জমা হয়।'
                : 'Commercial electricity revenues are automatically calculated and distributed daily straight to members wallets.'}
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          7. MINIMAL CLEAN FOOTER (তাছাড়া এক্সট্রা সব লেখা রিমুভ)
      ─────────────────────────────────────────────────────────── */}
      <footer className="pt-4 pb-4 text-center space-y-2 border-t border-slate-900">
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center p-0.5">
            <Zap className="w-3.5 h-3.5 text-black" />
          </div>
          <span className="text-xs font-bold text-white">AI ENERGY • Clean Infrastructure</span>
        </div>
        <p className="text-[10px] text-slate-500">
          © 2026 AI Energy Infrastructure. All Rights Reserved.
        </p>
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
