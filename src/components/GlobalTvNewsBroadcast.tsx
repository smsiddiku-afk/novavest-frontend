import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Sparkles,
  Users,
  Award,
  TrendingUp,
  CheckCircle2,
  Tv,
  Share2,
  Mic,
  ShieldCheck,
  Radio,
  FileText
} from 'lucide-react';

interface GlobalTvNewsBroadcastProps {
  lang: 'en' | 'bn';
  themeMode?: 'day' | 'night';
}

interface NewsSegment {
  start: number;
  end: number;
  captionBn: string;
  captionEn: string;
  sceneImage: string;
  sceneTitleBn: string;
  sceneTitleEn: string;
  showPip: boolean;
}

export const GlobalTvNewsBroadcast: React.FC<GlobalTvNewsBroadcastProps> = ({
  lang,
  themeMode = 'night'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(89);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synced Captions and Story Scenes across the 89s audio provided by the user
  const segments: NewsSegment[] = useMemo(() => [
    {
      start: 0,
      end: 14,
      captionBn: 'আমি মোহনা সরকার। গ্লোবাল টিভি থেকে। এনভিটি এনার্জি: কর্মসংস্থানের মাধ্যমে স্বাবলম্বী হওয়ার নতুন সম্ভাবনা। নিজস্ব প্রতিবেদক।',
      captionEn: 'I am Mohona Sarkar from Global TV. NVT Energy: A new horizon for self-reliance through meaningful employment. Special Report.',
      sceneImage: '/news-broadcast/anchor_studio_framed.jpg',
      sceneTitleBn: 'গ্লোবাল টিভি নিউজ স্টুডিও • ঢাকা',
      sceneTitleEn: 'Global TV News Studio • Dhaka',
      showPip: false
    },
    {
      start: 14,
      end: 28,
      captionBn: 'সীমিত সুযোগ ও আর্থিক সংকটের কারণে অনেক পরিবার দীর্ঘদিন ধরে স্বাবলম্বী হওয়ার সুযোগ থেকে বঞ্চিত।',
      captionEn: 'Due to limited opportunities and economic pressure, many families have long lacked viable paths to self-reliance.',
      sceneImage: '/news-broadcast/anchor_studio_framed.jpg',
      sceneTitleBn: 'বিশেষ প্রতিবেদন • কর্মসংস্থান সংকট ও সমাধান',
      sceneTitleEn: 'Special Coverage • Employment Reality',
      showPip: false
    },
    {
      start: 28,
      end: 44,
      captionBn: 'এমন বাস্তবতায় এনভিটি এনার্জি এর কার্যক্রমের মাধ্যমে বিভিন্ন পরিবারের মানুষ কাজের সুযোগ পেয়ে নিজেদের দক্ষতা কাজে লাগানোর চেষ্টা করছেন।',
      captionEn: 'Amidst this reality, through NVT Energy initiatives, families are accessing work opportunities and harnessing their skills.',
      sceneImage: '/images/energy_hero_facility_1788465969350.jpg',
      sceneTitleBn: 'অন-সাইট রিপোর্ট • এনভিটি ক্লিন এনার্জি অবকাঠামো',
      sceneTitleEn: 'Ground Report • NVT Clean Energy Infrastructure',
      showPip: true
    },
    {
      start: 44,
      end: 58,
      captionBn: 'এনভিটি এনার্জির সঙ্গে যুক্ত হয়ে অনেক মানুষ নিয়মিত কাজের মাধ্যমে নিজেদের আয় ও কর্মদক্ষতা বাড়ানোর সুযোগ পাচ্ছেন।',
      captionEn: 'Joining NVT Energy enables individuals to steadily increase both their daily income and professional competencies.',
      sceneImage: '/images/solar_ai_substation_1788465992131.jpg',
      sceneTitleBn: 'প্রজেক্ট সাবস্টেশন • জাতীয় গ্রিড কানেকশন',
      sceneTitleEn: 'Project Substation • National Grid Connectivity',
      showPip: true
    },
    {
      start: 58,
      end: 72,
      captionBn: 'বিশেষ করে অপেক্ষাকৃত কম আয়ের পরিবার থেকে আসা ব্যক্তিদের জন্য কাজের উপযুক্ত পরিবেশ তৈরি ও দায়িত্ব দেওয়ার বিষয়টিকে গুরুত্ব দেওয়া হচ্ছে।',
      captionEn: 'Creating supportive work environments and providing targeted responsibilities for modest-income individuals is prioritized.',
      sceneImage: '/news-broadcast/team_collaboration.jpg',
      sceneTitleBn: 'টিম কোলাবোরেশন • মাঠপর্যায়ে কার্যক্রম',
      sceneTitleEn: 'Team Collaboration • Field Operations',
      showPip: true
    },
    {
      start: 72,
      end: 89,
      captionBn: 'যার ফলে নতুনদের জন্য যেমন কাজ শেখার সুযোগ তৈরি হয়েছে, তেমনি পরিবারগুলোর জন্য তৈরি হয়েছে অর্থনৈতিক নিরাপত্তার সুযোগ। আমাদের লক্ষ্য প্রতিটি পরিবারকে স্বাবলম্বী করে তোলা।',
      captionEn: 'Enabling beginners to acquire professional mastery while empowering families with sustainable financial security.',
      sceneImage: '/news-broadcast/speaking_studio_framed.jpg',
      sceneTitleBn: 'মোহনা সরকার • উপসংহার ও ভবিষ্যৎ রূপরেখা',
      sceneTitleEn: 'Mohona Sarkar • Conclusion & Future Outlook',
      showPip: false
    }
  ], []);

  // Find active segment
  const activeSegment = useMemo(() => {
    const found = segments.find(s => currentTime >= s.start && currentTime < s.end);
    return found || segments[0];
  }, [segments, currentTime]);

  // Video event handlers (video now has integrated native audio track)
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.muted = isMuted;
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Video play notice:', e);
        // Fallback: try unmuted or muted
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().then(() => {
            setIsPlaying(true);
            setIsMuted(true);
          }).catch(() => {});
        }
      });
    }
  };

  const handleVideoTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current?.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * (duration || 89.4);

    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextMuted = !isMuted;
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
    setIsMuted(nextMuted);
  };

  const handleRestart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
    videoRef.current.muted = isMuted;
    videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Format mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <section className="w-full my-4 rounded-3xl overflow-hidden border border-red-500/25 bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-[#040814] shadow-2xl shadow-red-950/20">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP BROADCAST BANNER & TV STATION HEADER
      ───────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 bg-gradient-to-r from-red-950/80 via-slate-900/90 to-blue-950/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          {/* Pulsing Live Beacon */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-black tracking-wider shadow-lg shadow-red-600/40 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{lang === 'bn' ? 'লাইভ সংবাদ' : 'LIVE REPORT'}</span>
          </div>

          <div className="flex items-center gap-1 text-white font-black text-sm tracking-wider">
            <span className="text-red-500 font-extrabold">GLOBAL</span>
            <span className="text-white">TV</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/90 font-bold ml-1">HD</span>
          </div>

          <span className="hidden sm:inline-block text-slate-400 text-xs">|</span>
          <span className="text-xs text-slate-200 font-medium hidden sm:inline-block">
            {lang === 'bn' ? 'বিশেষ অনুসন্ধান প্রতিবেদন' : 'Investigative Broadcast'}
          </span>
        </div>

        {/* Anchor name and status */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden xs:block">
            <p className="text-xs font-bold text-white flex items-center gap-1 justify-end">
              <Mic className="w-3 h-3 text-red-400" />
              <span>{lang === 'bn' ? 'মোহনা সরকার' : 'Mohona Sarkar'}</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {lang === 'bn' ? 'প্রধান সংবাদ উপস্থাপক' : 'Senior News Anchor'}
            </p>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-500/30 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 shadow-sm">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden xs:inline">{lang === 'bn' ? 'অফিসিয়াল বুলেটিন' : 'Official Bulletin'}</span>
          </div>

          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">{copiedLink ? (lang === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (lang === 'bn' ? 'শেয়ার' : 'Share')}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. VIDEO BROADCAST PLAYER STAGE
      ───────────────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black overflow-hidden group select-none"
      >
        {/* Real MP4 Video with Anchor Narration and Active Moving B-Roll Scenes */}
        <video
          ref={videoRef}
          src="/company-profile/videos/globaltv-news-report.mp4"
          poster="/news-broadcast/anchor_studio_framed.jpg"
          playsInline
          muted={isMuted}
          preload="auto"
          onTimeUpdate={handleVideoTimeUpdate}
          onLoadedMetadata={handleVideoLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={handleTogglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Picture-in-Picture (PIP) Anchor Inset (shows Mohona Sarkar speaking during on-site footage) */}
        {activeSegment.showPip && isPlaying && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-28 sm:w-36 aspect-video rounded-xl overflow-hidden border-2 border-red-500/80 shadow-2xl bg-slate-950 z-20 animate-in fade-in zoom-in-90 duration-300">
            <img
              src="/news-broadcast/anchor_closeup_16x9.jpg"
              alt="Mohona Sarkar Speaking"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute bottom-0 inset-x-0 bg-black/85 px-1.5 py-0.5 flex items-center justify-between text-[9px] text-white font-bold">
              <span className="truncate">মোহনা সরকার</span>
              <span className="flex items-center gap-0.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[8px]">MIC</span>
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Television Bug / Live Badge */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex flex-col items-end gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/65 backdrop-blur-md border border-white/10 text-white">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] sm:text-xs font-black tracking-widest text-red-400">GLOBAL TV</span>
            <span className="text-[9px] font-bold px-1 bg-red-600 rounded text-white">LIVE</span>
          </div>
          <div className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[9.5px] font-medium text-slate-300">
            {activeSegment.sceneTitleBn}
          </div>
        </div>

        {/* Center Big Play Prompt when paused */}
        {!isPlaying && (
          <div
            onClick={handleTogglePlay}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/45 backdrop-blur-[2px] cursor-pointer transition-all hover:bg-black/35"
          >
            <div className="relative group/play flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-600/40 blur-xl scale-125 animate-pulse" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-2xl shadow-red-600/50 transform group-hover/play:scale-110 active:scale-95 transition-all">
                <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-current ml-1" />
              </div>
            </div>

            <div className="mt-3 sm:mt-4 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-black/85 text-xs sm:text-sm font-bold text-white shadow-xl border border-red-500/40 backdrop-blur-md flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span>{lang === 'bn' ? 'গ্লোবাল টিভি বিশেষ বুলেটিন শুনতে ক্লিক করুন' : 'Click to Watch Global TV News Broadcast'}</span>
            </div>

            <p className="text-[10px] sm:text-[11px] text-slate-300 mt-1.5 sm:mt-2 max-w-sm text-center px-4">
              {lang === 'bn' ? 'সংবাদ উপস্থাপক মোহনা সরকারের পূর্ণাঙ্গ অনুসন্ধান প্রতিবেদন ও বিশ্লেষণ' : 'Full investigative report & economic analysis presented by Mohona Sarkar'}
            </p>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            LIVE LOWER-THIRD BANNER & TIMED SUBTITLES
        ───────────────────────────────────────────────────────────── */}
        {showCaptions && (
          <div className="absolute bottom-13 sm:bottom-16 inset-x-2.5 sm:inset-x-5 z-20 pointer-events-none">
            {/* Lower Third News Tag */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-t-md bg-red-600 text-white text-[9px] sm:text-[11px] font-black uppercase tracking-wider shadow-md">
              <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>{lang === 'bn' ? 'বিশেষ প্রতিবেদন • কর্মসংস্থান ও স্বাবলম্বিতা' : 'Special Report • Employment & Growth'}</span>
            </div>

            {/* Captions Body Box */}
            <div className="p-2 sm:p-2.5 rounded-b-xl rounded-tr-xl bg-slate-950/92 backdrop-blur-md border border-red-500/30 text-white shadow-2xl">
              <p className="text-[11px] sm:text-xs md:text-sm font-semibold text-amber-100 leading-snug line-clamp-2 sm:line-clamp-none">
                {lang === 'bn' ? activeSegment.captionBn : activeSegment.captionEn}
              </p>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            BREAKING NEWS MARQUEE STRIP
        ───────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-8 sm:bottom-9 inset-x-0 h-6 sm:h-7 bg-[#a30b1e] text-white flex items-center overflow-hidden z-20 border-t border-red-400/30">
          <div className="bg-black px-2 sm:px-2.5 h-full flex items-center font-black text-[9px] sm:text-[11px] text-amber-300 shrink-0 uppercase tracking-wide">
            {lang === 'bn' ? 'ব্রেকিং নিউজ' : 'BREAKING'}
          </div>
          <div className="whitespace-nowrap overflow-hidden flex-1 relative flex items-center">
            <div className="inline-block animate-marquee-slide text-[10px] sm:text-xs font-semibold px-4">
              {lang === 'bn'
                ? '🔴 গ্লোবাল টিভি এক্সক্লুসিভ: এনভিটি এনার্জি-এর কার্যক্রমে টিম ভিত্তিক কাজ ও কমিশন কাঠামোয় বাড়ছে কর্মসংস্থান • প্রান্তিক ও কম আয়ের পরিবারগুলোর স্বাবলম্বী হওয়ার নতুন দ্বার উন্মোচিত • নতুনদের জন্য হাতে-কলমে প্রশিক্ষণ ও অভিজ্ঞতা অর্জনের বাস্তব সুযোগ'
                : '🔴 GLOBAL TV EXCLUSIVE: NVT Energy initiates structured team collaboration and transparent commission models • Empowering families across Bangladesh with sustainable income and comprehensive vocational skills'}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            BOTTOM SCRUBBER & PLAYBACK CONTROLS
        ───────────────────────────────────────────────────────────── */}
        <div className="absolute bottom-0 inset-x-0 h-8 sm:h-9 bg-gradient-to-t from-black via-black/90 to-black/60 px-3 flex items-center justify-between gap-3 z-30">
          {/* Left Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="p-1 text-white hover:text-red-400 transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Time Indicator */}
            <span className="text-[10px] sm:text-xs font-mono text-slate-300 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Center Scrubber */}
          <div
            onClick={handleSeek}
            className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative group/track mx-2"
          >
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full transition-all duration-150"
              style={{ width: `${Math.min(100, (currentTime / (duration || 89)) * 100)}%` }}
            />
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCaptions(!showCaptions)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                showCaptions ? 'bg-red-600 border-red-500 text-white' : 'border-slate-600 text-slate-400 hover:text-white'
              }`}
              title="Subtitles"
            >
              CC
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="p-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. KEY REPORT HIGHLIGHTS & SUMMARY CARDS (ভয়েস অনুযায়ী মূল বিষয়বস্তু)
      ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <h4 className="text-sm sm:text-base font-extrabold text-white">
              {lang === 'bn' ? 'প্রতিবেদনের ৫টি প্রধান দিক ও কর্মসংস্থান রূপরেখা' : '5 Key Highlights & Employment Framework'}
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'গ্লোবাল টিভি সত্যতা যাচাইকৃত' : 'Global TV Verified'}</span>
          </span>
        </div>

        {/* 5 Points Grid based on the voice transcript */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Card 1: Team-based work */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-all space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">
                {lang === 'bn' ? '১. টিম ভিত্তিক কাজের সুযোগ' : '1. Team Collaboration'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'এককভাবে নয়, একটি পুরো দল একসাথে কাজ পরিচালনা করায় পারস্পরিক সহযোগিতা ও নতুনদের কাজ দ্রুত শেখার পরিবেশ সৃষ্টি হয়।'
                : 'Work is coordinated within collaborative teams, fostering mutual support and accelerated learning curves.'}
            </p>
          </div>

          {/* Card 2: Commission structure */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-all space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">
                {lang === 'bn' ? '২. স্বচ্ছ কমিশন ও আয়ের কাঠামো' : '2. Transparent Commission'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'প্রতিটি কাজের জন্য সুনির্দিষ্ট ও নিশ্চিত কমিশন ব্যবস্থা, যার মাধ্যমে নিয়মিত কাজের ভিত্তিতে স্থিতিশীল আয় নিশ্চিত করা যায়।'
                : 'Clear and reliable commission structures enable participants to achieve predictable, performance-based earnings.'}
            </p>
          </div>

          {/* Card 3: Skill Recognition */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-all space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                <Award className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">
                {lang === 'bn' ? '৩. দক্ষতার সঠিক মূল্যায়ন' : '3. Skill-Based Growth'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'ব্যক্তির যোগ্যতা ও সক্ষমতা অনুযায়ী দায়িত্ব বণ্টন করা হয়, যাতে তারা আত্মবিশ্বাসের সাথে দায়িত্ব পালন করতে পারেন।'
                : 'Responsibilities align directly with individual capabilities, fostering dignity and steady personal growth.'}
            </p>
          </div>

          {/* Card 4: Beginner Training */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-all space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">
                {lang === 'bn' ? '৪. নতুনদের কাজ শেখার ক্ষেত্র' : '4. Hands-On Training'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'পূর্বে অভিজ্ঞতা না থাকলেও টিমের অভিজ্ঞ সদস্যদের সাথে হাতে-কলমে কাজ শিখে দক্ষ কর্মী হিসেবে গড়ে ওঠার পথ উন্মুক্ত।'
                : 'No prior experience required; beginners gain hands-on operational know-how working alongside experienced members.'}
            </p>
          </div>

          {/* Card 5: Family Self-Reliance */}
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-red-500/40 transition-all space-y-1.5 sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">
                {lang === 'bn' ? '৫. পরিবারিক স্বাবলম্বী হওয়ার নতুন সম্ভাবনা' : '5. Sustainable Family Livelihood'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {lang === 'bn'
                ? 'সীমিত আয়ের পরিবারগুলো আর্থিক সংকট কাটিয়ে স্বাবলম্বী হতে পারছে এবং দীর্ঘমেয়াদে নিজেদের ভবিষ্যৎ নিরাপদ করতে সক্ষম হচ্ছে।'
                : 'Modest-income households can overcome economic barriers, establishing dependable livelihoods and long-term security.'}
            </p>
          </div>
        </div>

        {/* Audio Narration Quick Player & Download Button */}
        <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold shrink-0">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">
                {lang === 'bn' ? 'গ্লোবাল টিভি অফিসিয়াল অডিও বুলেটিন' : 'Global TV Official Audio Bulletin'}
              </p>
              <p className="text-[10px] text-slate-400">
                {lang === 'bn' ? 'দৈর্ঘ্য: ১ মিনিট ৩০ সেকেন্ড • মোহনা সরকার বিশেষ প্রতিবেদন' : 'Duration: 1m 30s • Mohona Sarkar Special Report'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? (lang === 'bn' ? 'থামান' : 'Pause') : (lang === 'bn' ? 'প্লে করুন' : 'Play')}</span>
            </button>

            <a
              href="/company-profile/audio/mohana-sarkar-globaltv-news.mp3"
              download="Mohona_Sarkar_GlobalTV_NVT_Report.mp3"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-red-400" />
              <span>{lang === 'bn' ? 'অডিও ডাউনলোড' : 'Download Audio'}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
