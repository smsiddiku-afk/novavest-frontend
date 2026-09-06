import React, { useState, useRef } from 'react';
import {
  Building2,
  Zap,
  BatteryCharging,
  Cpu,
  Users,
  Headphones,
  TrendingUp,
  Award,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  MapPin,
  Check,
  Copy,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  Info,
  Radio,
  FileText,
  Activity,
  Layers,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Language } from '../types';

export type CompanyModalTab = 'overview' | 'howItWorks' | 'licenses' | 'substations' | 'leadership' | 'video';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: Language;
  initialTab?: CompanyModalTab;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  currentLang = 'en',
  initialTab = 'overview',
}) => {
  const isBn = currentLang === 'bn';
  const [activeTab, setActiveTab] = useState<CompanyModalTab>(initialTab);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Video State
  const videoClips = [
    {
      id: 'solar-park',
      title: isBn ? 'সোলার পার্ক ও গ্রিড' : 'Solar Farm & Substation',
      videoSrc: '/company-profile/videos/solar-park-grid.mp4',
    },
    {
      id: 'battery-hub',
      title: isBn ? 'বিইএসএস ব্যাটারি হাব' : 'BESS Battery Storage',
      videoSrc: '/company-profile/videos/battery-storage-hub.mp4',
    },
    {
      id: 'ppa-dispatch',
      title: isBn ? 'দৈনিক লভ্যাংশ ও ক্যাশআউট' : 'Yield & Instant Cashout',
      videoSrc: '/company-profile/videos/ppa-revenue-dispatch.mp4',
    },
    {
      id: 'grid-arch',
      title: isBn ? 'সম্পূর্ণ গ্রিড প্রজেক্ট' : 'Full Grid Documentary',
      videoSrc: '/company-profile/videos/how-power-grid-works.mp4',
    },
  ];
  const [selectedClipIndex, setSelectedClipIndex] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingLocal, setIsPlayingLocal] = useState(false);

  if (!isOpen) return null;

  // 7-Step Operational Framework
  const steps = [
    {
      num: '01',
      title: isBn ? 'কোম্পানি পরিচালনা' : 'Company Operations',
      subtitle: isBn ? 'আইনি ও কৌশলগত প্রশাসন' : 'Governance & Strategic Capital',
      icon: Building2,
      desc: isBn
        ? 'কোম্পানির উচ্চপর্যায়ের পরিচালনা পর্ষদ, আইনি সম্মতি নিশ্চিতকরণ এবং বিদ্যুৎ অবকাঠামোতে মূলধন বণ্টন।'
        : 'Strategic executive governance, statutory energy regulation compliance, and infrastructure capital deployment.',
      metric: isBn ? 'বিইআরসি ও আরজেএসসি অনুমোদিত' : 'BERC & RJSC Compliant',
    },
    {
      num: '02',
      title: isBn ? 'প্রকল্প ও কার্যক্রম' : 'Projects & Activities',
      subtitle: isBn ? 'সোলার পার্ক ও সাবস্টেশন নির্মাণ' : 'Utility Solar & Substation Works',
      icon: Zap,
      desc: isBn
        ? 'উচ্চ ক্ষমতাসম্পন্ন বাইফেসিয়াল সোলার প্যানেল স্থাপন এবং ১৩২কেভি/৩৩কেভি গ্রিড সাবস্টেশন নির্মাণ।'
        : 'Deployment of Tier-1 bifacial photovoltaic parks and construction of 132kV high-voltage step-up switchyards.',
      metric: isBn ? '১৩২ কেভি গ্রিড ইন্টারকানেকশন' : '132kV Grid Interconnect',
    },
    {
      num: '03',
      title: isBn ? 'জ্বালানি ও সম্পদ ব্যবস্থাপনা' : 'Energy & Resource Mgmt',
      subtitle: isBn ? 'ফটোভোলটাইক সর্বোচ্চ রূপান্তর' : 'Photovoltaic MPPT Tuning',
      icon: BatteryCharging,
      desc: isBn
        ? 'সূর্যালোক থেকে সর্বোচ্চ ডিসি বিদ্যুৎ গ্রহণ, এসি বিদ্যুতে রূপান্তর এবং সঞ্চালন অপচয় সর্বনিম্ন রাখা।'
        : 'Continuous Maximum Power Point Tracking (MPPT) balancing irradiance fluctuations and eliminating transmission losses.',
      metric: isBn ? '৯৮.৯% ইনভার্টার দক্ষতা' : '98.9% Inverter Efficiency',
    },
    {
      num: '04',
      title: isBn ? 'প্রযুক্তি ও মনিটরিং' : 'Technology & Monitoring',
      subtitle: isBn ? '২৪/৭ স্কাডা ও আইওটি টেলিমেট্রি' : '24/7 AI-Powered SCADA Feed',
      icon: Cpu,
      desc: isBn
        ? 'সেন্ট্রাল কন্ট্রোল রুম থেকে রিয়েল-টাইম মেগাওয়াট উৎপাদন, গ্রিড ফ্রিকোয়েন্সি ও লাইভ স্ট্রিমিং তদারকি।'
        : 'Real-time megawatt dispatch monitoring, automated frequency synchronization, and predictive equipment alerts.',
      metric: isBn ? '১ সেকেন্ড লাইভ টেলিমেট্রি' : '1-sec Live Telemetry',
    },
    {
      num: '05',
      title: isBn ? 'টিম ম্যানেজমেন্ট' : 'Team Management',
      subtitle: isBn ? 'পেশাদার প্রকৌশলী ও টেকনিশিয়ান' : 'Certified Electrical Linemen',
      icon: Users,
      desc: isBn
        ? 'আন্তর্জাতিক OSHA এবং ISO 45001 নিরাপত্তা মেনে ২৪/৭ অন-সাইট ফিল্ড সাপোর্ট ও রক্ষণাবেক্ষণ পরিচালনা।'
        : 'Adherence to ISO 45001 workplace safety protocols, certified high-voltage technicians, and proactive drone inspections.',
      metric: isBn ? 'আইএসও ৪৫০০১ সার্টিফাইড' : 'ISO 45001 Certified',
    },
    {
      num: '06',
      title: isBn ? 'গ্রাহক ও অংশীদার সেবা' : 'Customer & Partner Services',
      subtitle: isBn ? 'স্বচ্ছ হিসাব ও সার্বক্ষণিক সহায়তা' : 'Transparent Accounting & Care',
      icon: Headphones,
      desc: isBn
        ? 'গ্রাহকদের ২৪/৭ কাস্টমার কেয়ার, ডিজিটাল ওয়ালেট সমন্বয় এবং দৈনিক উৎপাদন তথ্য স্বচ্ছভাবে উপস্থাপন।'
        : 'Round-the-clock member helpline, automated daily generation accounting, and direct communication channels.',
      metric: isBn ? '< ৫ মিনিট রেসপন্স টাইম' : '< 5 min Response Time',
    },
    {
      num: '07',
      title: isBn ? 'রাজস্ব ও ব্যবসায়িক পরিচালনা' : 'Revenue & Business Operations',
      subtitle: isBn ? 'বিদ্যুৎ বিক্রি চুক্তি ও মুনাফা বণ্টন' : 'Regulated Tariff PPAs & Yield',
      icon: TrendingUp,
      desc: isBn
        ? 'জাতীয় গ্রিডে বিদ্যুৎ সরবরাহের মাধ্যমে নিশ্চিত রাজস্ব অর্জন এবং নিয়মতান্ত্রিকভাবে সদস্যদের লভ্যাংশ প্রদান।'
        : 'Contracted kilowatt-hour sales under Power Purchase Agreements (PPAs) funding automated, predictable daily yield credits.',
      metric: isBn ? 'দীর্ঘমেয়াদী পিপিএ চুক্তি' : 'Long-Term PPA Tariff',
    },
  ];

  // Official Verified Licenses
  const officialLicenses = [
    {
      id: 'lic-1',
      code: 'BERC-GEN-2024/0912-A',
      title: isBn ? 'বিইআরসি বিদ্যুৎ উৎপাদন লাইসেন্স' : 'BERC Power Generation License',
      org: isBn ? 'বাংলাদেশ এনার্জি রেগুলেটরি কমিশন' : 'Bangladesh Energy Regulatory Commission',
      validity: isBn ? 'মেয়াদ: ২০৩৪ পর্যন্ত বৈধ' : 'Valid Thru: Dec 2034',
      status: isBn ? 'সক্রিয় ও অনুমোদিত' : 'Active & Verified',
      category: 'regulatory',
      badge: 'IPP Authorized',
      details: isBn
        ? 'বেসরকারি বিদ্যুৎ উৎপাদনকারী (IPP) হিসেবে ৫০০ মেগাওয়াট সৌর বিদ্যুৎ উৎপাদন ও ১৩২কেভি ট্রান্সমিশন সরবরাহের পূর্ণ সরকারি লাইসেন্স।'
        : 'Authorized independent power producer (IPP) permit for utility-scale solar generation and 132kV transmission interconnection.',
      hash: 'SHA256: 8f4a91b2c830e01764df7a19c6239100fae418b76c',
      issuerSeal: 'BERC OFFICIAL SEAL • REGULATORY ACT 2003',
    },
    {
      id: 'lic-2',
      code: 'ISO-50001:2018-EMS',
      title: isBn ? 'আইএসও ৫০MDA১ শক্তি ব্যবস্থাপনা সনদ' : 'ISO 50001:2018 Energy Management',
      org: 'TÜV SÜD & Bureau Veritas Certification',
      validity: isBn ? 'মেয়াদ: ২০২৭ পর্যন্ত' : 'Valid Thru: Aug 2027',
      status: isBn ? 'যাচাইকৃত' : 'Certified',
      category: 'standards',
      badge: 'Energy Excellence',
      details: isBn
        ? 'উৎপাদন ও রূপান্তর অপচয় আন্তর্জাতিক মানদণ্ডে সর্বনিম্ন রাখার জন্য বৈশ্বিক এনার্জি ম্যানেজমেন্ট সার্টিফিকেট।'
        : 'International benchmark for systematically improving energy performance, transformer conversion efficiency, and carbon accounting.',
      hash: 'SHA256: 3c9b71e4d021f8a892b1154c90ef41291da938b812',
      issuerSeal: 'TÜV SÜD AUDITED • GLOBAL CONFORMITY',
    },
    {
      id: 'lic-3',
      code: 'ISO-9001:2015-QMS',
      title: isBn ? 'আইএসও ৯০০১ গুণগত মান সনদ' : 'ISO 9001:2015 Quality Management',
      org: 'International Quality Assurance Registry',
      validity: isBn ? 'মেয়াদ: ২০২৮ পর্যন্ত' : 'Valid Thru: Nov 2028',
      status: isBn ? 'যাচাইকৃত' : 'Certified',
      category: 'standards',
      badge: 'Quality Assured',
      details: isBn
        ? 'বিদ্যুৎ প্রকল্প ডিজাইন, সাবস্টেশন নির্মাণ এবং গ্রাহক সেবা পরিচালনায় আন্তর্জাতিক গুণগত মান নিয়ন্ত্রণ।'
        : 'Quality management certification governing electrical engineering workflows, supplier audits, and customer inquiry management.',
      hash: 'SHA256: 6a18d99042bcefa8104d5381a74201fe982b13ac',
      issuerSeal: 'ISO COMPLIANT • ACCREDITED REGISTRAR',
    },
    {
      id: 'lic-4',
      code: 'RJSC-REG-C-198420/2024',
      title: isBn ? 'যৌথমূলধন কোম্পানি নিবন্ধন (RJSC)' : 'Certificate of Incorporation (RJSC)',
      org: isBn ? 'রেজিস্ট্রার অব জয়েন্ট স্টক কোম্পানিজ অ্যান্ড ফার্মস' : 'Registrar of Joint Stock Companies and Firms',
      validity: isBn ? 'স্থায়ী নিবন্ধিত প্রতিষ্ঠান' : 'Perpetual Legal Standing',
      status: isBn ? 'আইনগত সক্রিয়' : 'Active Corporation',
      category: 'legal',
      badge: 'Legal Entity',
      details: isBn
        ? 'কোম্পানি আইন ১৯৯৪ এর অধীন নিবন্ধিত সরকারি অনুমোদনপ্রাপ্ত বাণিজ্যিক এনার্জি অবকাঠামো অপারেটর।'
        : 'Officially registered corporate entity chartered to develop, finance, and operate independent electricity generating facilities.',
      hash: 'SHA256: 9b24ac88102f9e4210d7a6182390fa83c18b761a',
      issuerSeal: 'GOVERNMENT REGISTRY • CORPORATE CHARTER',
    },
    {
      id: 'lic-5',
      code: 'DOE-ECC-4921/2023',
      title: isBn ? 'পরিবেশ অধিদপ্তর ছাড়পত্র (DoE)' : 'Environmental Clearance (DoE)',
      org: isBn ? 'পরিবেশ অধিদপ্তর, গণপ্রজাতন্ত্রী বাংলাদেশ সরকার' : 'Department of Environment, GoB',
      validity: isBn ? 'মেয়াদ: ২০২৯ পর্যন্ত' : 'Valid Thru: Oct 2029',
      status: isBn ? 'অনুমোদিত' : 'Approved',
      category: 'environmental',
      badge: 'Green Certified',
      details: isBn
        ? 'পরিবেশবান্ধব নবায়নযোগ্য শক্তি প্রকল্প ও শূন্য কার্বন নিঃসরণের জন্য পরিবেশ অধিদপ্তরের সরকারি ছাড়পত্র।'
        : 'Zero-emission solar generation environmental compliance and ecological sustainability approval.',
      hash: 'SHA256: 7e11ac5429be1947b003aef192b0c1448df74092',
      issuerSeal: 'DoE GOVERNMENT CLEARANCE • ZERO EMISSION',
    },
  ];

  // Substation Grid Nodes
  const substations = [
    { name: isBn ? 'ঢাকা উত্তর স্মার্ট সাবস্টেশন' : 'Dhaka North Smart Substation', load: '120 MW', status: 'Online 99.98%', voltage: '132/33 kV' },
    { name: isBn ? 'চট্টগ্রাম শিল্পাঞ্চল গ্রিড নোড' : 'Chattogram Industrial Grid Node', load: '140 MW', status: 'Online 100%', voltage: '230/132 kV' },
    { name: isBn ? 'সিলেট হাইড্রো-হাইব্রিড সাবস্টেশন' : 'Sylhet Hydro-Hybrid Substation', load: '85 MW', status: 'Online 99.95%', voltage: '132/33 kV' },
    { name: isBn ? 'রাজশাহী সৌর হাব ৪' : 'Rajshahi Solar Hub #4', load: '95 MW', status: 'Online 100%', voltage: '132/33 kV' },
    { name: isBn ? 'খুলনা ইকো পাওয়ার স্টেশন' : 'Khulna Eco Power Station', load: '60 MW', status: 'Online 99.91%', voltage: '33/11 kV' },
  ];

  // Engineering Leadership
  const engineers = [
    {
      name: isBn ? 'ড. তারিকুল ইসলাম, পিএইচডি' : 'Dr. Tariqul Islam, Ph.D.',
      role: isBn ? 'চিফ টেকনিক্যাল অফিসার (CTO)' : 'Chief Technical Officer (CTO)',
      org: isBn ? 'সাবেক সিমেন্স স্মার্ট গ্রিড বিশেষজ্ঞ' : 'Ex-Siemens Smart Grid Lead',
      experience: isBn ? '২০+ বছরের অভিজ্ঞতা' : '20+ Yrs Energy Telemetry',
    },
    {
      name: isBn ? 'প্রকৌ. সারা রহমান' : 'Engr. Sarah Rahman',
      role: isBn ? 'প্রধান, এআই ট্রান্সমিশন' : 'Head of AI Transmission',
      org: isBn ? 'বুয়েট ইলেকট্রিক্যাল ফেলো' : 'BUET Electrical Engineering Fellow',
      experience: isBn ? 'স্মার্ট গ্রিড অপ্টিমাইজেশন' : 'Grid Dispatch Algorithm Specialist',
    },
    {
      name: isBn ? 'কাজী মাহবুব আলম' : 'Kazi Mahbub Alam',
      role: isBn ? 'পরিচালক, প্ল্যান্ট ও ফিল্ড নিরাপত্তা' : 'Director of Plant Safety',
      org: isBn ? 'আইএসও লিড অডিটর (ISO 45001)' : 'ISO Lead Auditor & OSHA Certified',
      experience: isBn ? 'উচ্চ-ভোল্টেজ নিরাপত্তা' : 'High-Voltage Switchyard Safety',
    },
  ];

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleToggleLocalPlay = () => {
    if (!videoRef.current) return;
    if (isPlayingLocal) {
      videoRef.current.pause();
      setIsPlayingLocal(false);
    } else {
      videoRef.current.play().then(() => setIsPlayingLocal(true)).catch(() => {});
    }
  };

  return (
    <div
      id="company-profile-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
    >
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-[#090e1c] border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 overflow-hidden relative">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800/80 bg-[#0c1426]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Nova Terra Energy Ltd. (NVT)
                </h2>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isBn ? 'যাচাইকৃত' : 'Verified'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {isBn
                  ? 'নিবন্ধিত বিদ্যুৎ উৎপাদন ও গ্রিড টেলিমেট্রি অপারেটর'
                  : 'Registered Clean Energy & Grid Telemetry Operator'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-3 sm:px-5 py-2.5 bg-[#070b16] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isBn ? 'পরিচিতি ও বিবরণ' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('howItWorks')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'howItWorks'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isBn ? 'গ্রিড কার্যপদ্ধতি' : 'How Grid Works'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('licenses')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'licenses'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{isBn ? 'লাইসেন্স ও সনদ' : 'Official Licenses'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('substations')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'substations'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isBn ? 'সাবস্টেশন নেটওয়ার্ক' : 'Substations'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leadership')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'leadership'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isBn ? 'প্রকৌশলী ও গভর্ন্যান্স' : 'Leadership & SOP'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'video'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isBn ? 'ভিডিও প্রেজেন্টেশন' : 'Explainer Video'}</span>
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-slate-200">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  {isBn ? 'প্রাতিষ্ঠানিক পরিচয়' : 'Corporate Identity & Scale'}
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isBn
                    ? '২০২১ সালে প্রতিষ্ঠিত, নোভা টেরা এনার্জি লিমিটেড (NVT) দেশের অন্যতম শীর্ষস্থানীয় জ্বালানী, গ্যাস ও ক্লিন এনার্জি প্রযুক্তি প্রতিষ্ঠান। আমরা বৃহৎ পরিসরে গ্রিড-সংযুক্ত সৌর বিদ্যুৎ উৎপাদন, ব্যাটারি স্টোরেজ সিস্টেম (BESS) এবং রিয়েল-টাইম গ্রিড ব্যালান্সিং অবকাঠামো পরিচালনা করে থাকি।'
                    : 'Founded in 2021, Nova Terra Energy Ltd. (NVT) is a premier clean-energy and fuel technology company developing utility-scale renewable generation, battery storage systems (BESS), and digital grid balancing networks across South Asia.'}
                </p>
              </div>

              {/* Corporate Identity Data Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#0c1426] border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isBn ? 'কোম্পানি রেজিস্ট্রেশন নম্বর:' : 'Corporate Registration:'}
                  </span>
                  <span className="font-semibold text-white">#NV-2024-ENG-772</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isBn ? 'অনুমোদিত মূলধন:' : 'Authorized Capital:'}
                  </span>
                  <span className="font-semibold text-white">৳ 500,000,000 BDT</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isBn ? 'গ্রিড নোড লাইসেন্স:' : 'Grid Node License:'}
                  </span>
                  <span className="font-semibold text-emerald-400">132kV / 230kV Active</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isBn ? 'প্রধান কার্যালয়:' : 'Headquarters:'}
                  </span>
                  <span className="font-semibold text-white">Gulshan-2, Dhaka, Bangladesh</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isBn ? 'পরিবেশগত ছাড়পত্র (ESG):' : 'Environmental Rating:'}
                  </span>
                  <span className="font-semibold text-emerald-400">AAA Green Standard</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {isBn ? 'মোট পরিকাঠামো সম্পদ:' : 'Infrastructure Assets:'}
                  </span>
                  <span className="font-semibold text-cyan-400">৳ 4,850,000,000+</span>
                </div>
              </div>

              {/* Mission Statement */}
              <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>{isBn ? 'আমাদের লক্ষ্য ও ভিশন' : 'Our Mission & Vision'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isBn
                    ? 'লোডশেডিং মুক্ত আধুনিক বাংলাদেশ বিনির্মাণ এবং টেকসই সবুজ শক্তির শতভাগ ব্যবহার নিশ্চিত করা। আধুনিক এআই টেলিমেট্রির মাধ্যমে জাতীয় গ্রিডে বিদ্যুতের নিরবচ্ছিন্ন সরবরাহ বজায় রাখা এবং সাধারণ মানুষের অংশগ্রহণের মাধ্যমে স্বচ্ছ মুনাফা বণ্টন।'
                    : 'To eliminate brownouts and accelerate transition to sustainable base-load clean power by combining advanced AI predictive telemetry with direct public infrastructure participation.'}
                </p>
              </div>

              {/* Live Plant Assets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white tracking-wider uppercase">
                  {isBn ? 'সক্রিয় প্রকল্পসমূহ' : 'Live Energy Assets'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#0c1426] border border-slate-800 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80"
                      alt="Apex Solar Park"
                      className="w-full h-32 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-3 space-y-1">
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                        450 MW Apex Solar Park
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {isBn ? '১২০০টি বাইফেসিয়াল অ্যারে এবং ২৪/৭ ড্রোন তদারকি।' : 'Bifacial arrays with 98.9% availability.'}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#0c1426] border border-slate-800 overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80"
                      alt="132kV Substation"
                      className="w-full h-32 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="p-3 space-y-1">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                        132kV / 33kV Substation
                      </span>
                      <p className="text-[11px] text-slate-300">
                        {isBn ? 'স্টেপ-আপ ট্রান্সফরমার ও জাতীয় গ্রিড ফিডার।' : 'High-voltage step-up feed into national grid.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HOW GRID WORKS */}
          {activeTab === 'howItWorks' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                  {isBn ? 'বিদ্যুৎ গ্রিড আর্কিটেকচার' : 'Operational Architecture'}
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-white">
                  {isBn ? '১. বিদ্যুৎ গ্রিড কিভাবে কাজ করে' : '1. HOW POWER GRID WORKS'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {isBn
                    ? 'সৌর প্যানেল থেকে প্রাপ্ত ডিসি বিদ্যুৎকে আধুনিক ইনভার্টারের মাধ্যমে ব্যবহারযোগ্য এসি বিদ্যুতে রূপান্তর করা হয়। এরপর ১৩২কেভি/৩৩কেভি সাবস্টেশনের মাধ্যমে ভোল্টেজ বৃদ্ধি করে সরাসরি জাতীয় গ্রিডে সরবরাহ করা হয়। সরকারের বিদ্যুৎ ক্রয় চুক্তি (PPA) অনুযায়ী নির্দিষ্ট হারে রাজস্ব সংগৃহীত হয়, যা প্রতিদিন সদস্যদের লভ্যাংশ হিসেবে জমা হয়।'
                    : 'Solar irradiance captured by bifacial photovoltaic panels is converted into AC power via high-efficiency inverters, stepped up to 132kV/33kV at on-site automated substations, and injected into the national grid under regulated Power Purchase Agreements (PPAs).'}
                </p>
              </div>

              {/* 7-Stage Flow Ribbon */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white tracking-wide">
                    {isBn ? '২. আমাদের ৭-ধাপের কার্যপ্রণালী' : '2. OUR 7-STAGE PROCESS FLOW'}
                  </h4>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                    Step {steps[activeStepIndex].num} / 07
                  </span>
                </div>

                <div className="flex items-center overflow-x-auto pb-2 gap-2 no-scrollbar">
                  {steps.map((step, idx) => {
                    const isSelected = activeStepIndex === idx;
                    return (
                      <button
                        key={step.num}
                        type="button"
                        onClick={() => setActiveStepIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-left border transition-all shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
                            : 'bg-[#0c1426] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold ${
                            isSelected ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-cyan-300'
                          }`}
                        >
                          {step.num}
                        </span>
                        <span className="text-xs font-semibold whitespace-nowrap">{step.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Step Detail Card */}
                <div className="p-4 rounded-2xl bg-[#0c1426] border border-cyan-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                        {React.createElement(steps[activeStepIndex].icon, { className: 'w-4 h-4' })}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">{steps[activeStepIndex].title}</h5>
                        <span className="text-[11px] text-slate-400">{steps[activeStepIndex].subtitle}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-black/60 text-cyan-300 border border-cyan-500/30">
                      {steps[activeStepIndex].metric}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {steps[activeStepIndex].desc}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <button
                      type="button"
                      disabled={activeStepIndex === 0}
                      onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white cursor-pointer"
                    >
                      ← {isBn ? 'পূর্ববর্তী' : 'Prev'}
                    </button>
                    <div className="flex gap-1">
                      {steps.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveStepIndex(i)}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            activeStepIndex === i ? 'bg-cyan-400 w-4' : 'bg-slate-700 w-1.5'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={activeStepIndex === steps.length - 1}
                      onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                      className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white font-bold cursor-pointer"
                    >
                      {isBn ? 'পরবর্তী' : 'Next'} →
                    </button>
                  </div>
                </div>
              </div>

              {/* Final Summary Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0d1c3a] via-[#10244c] to-[#0d1c3a] border border-cyan-400/40 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBn ? 'প্রাতিষ্ঠানিক নিশ্চয়তা' : 'OPERATIONAL COMMITMENT'}</span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white">
                  “From operation to execution, every process is managed through a structured and transparent system.”
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: LICENSES */}
          {activeTab === 'licenses' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isBn ? 'সরকারি লাইসেন্স ও অনুমোদন সনদপত্র' : 'Official Licences & Certifications'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {isBn
                    ? 'কোম্পানির সকল নিয়ন্ত্রক লাইসেন্স ও সনদপত্র শতভাগ যাচাইযোগ্য ও স্বচ্ছ।'
                    : 'All corporate permits, grid dispatch licenses, and ISO standards are verifiable.'}
                </p>
              </div>

              <div className="space-y-3">
                {officialLicenses.map((lic) => (
                  <div
                    key={lic.id}
                    className="p-3.5 rounded-2xl bg-[#0c1426] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {lic.badge}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {lic.status}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-white mt-1">{lic.title}</h4>
                        <span className="text-[11px] text-slate-400">{lic.org}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-cyan-300 block">{lic.code}</span>
                        <span className="text-[10px] text-slate-400 block">{lic.validity}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed bg-black/40 p-2 rounded-xl border border-slate-800/80">
                      {lic.details}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span className="font-mono text-slate-500 truncate max-w-[180px] sm:max-w-[280px]">
                        {lic.issuerSeal}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleCopyHash(lic.hash)}
                        className="flex items-center gap-1 font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30"
                      >
                        {copiedHash === lic.hash ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>{isBn ? 'হ্যাশ কপি' : 'Verify Hash'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-center space-y-1">
                <span className="text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {isBn ? 'আইনগত নিশ্চয়তা' : 'Statutory Compliance Guarantee'}
                </span>
                <p className="text-[11px] text-slate-300">
                  {isBn
                    ? 'বিদ্যুৎ ও জ্বালানি মন্ত্রণালয় এবং সংশ্লিষ্ট আন্তর্জাতিক সার্টিফিকেশন সংস্থা কর্তৃক সমস্ত তথ্য নথিবদ্ধ।'
                    : 'All documents are on statutory file with the Energy Regulatory Commission and accredited registrars.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SUBSTATIONS */}
          {activeTab === 'substations' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isBn ? 'গ্রিড সাবস্টেশন নেটওয়ার্ক' : 'Grid Substation Network'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {isBn
                    ? '১৪টি রিয়েল-টাইম অটোমেটেড পাওয়ার নোড ও সুইচইয়ার্ড'
                    : '14 Automated Power Nodes connected to regional grids'}
                </p>
              </div>

              <div className="space-y-2.5">
                {substations.map((sub, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#0c1426] border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white text-xs sm:text-sm block">{sub.name}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono">{sub.voltage}</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {sub.status}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/40 text-xs">
                      {sub.load}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs space-y-1 text-slate-300">
                <span className="font-bold text-cyan-300 block">
                  {isBn ? 'স্বয়ংক্রিয় স্কাডা সমন্বয়' : 'Automated SCADA Synchronization'}
                </span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isBn
                    ? 'প্রতিটি সাবস্টেশন প্রতি সেকেন্ডে এআই লোড-ব্যালান্সিং অ্যালগরিদম দ্বারা ফ্রিকোয়েন্সি সমন্বয় করে থাকে।'
                    : 'Substations operate with autonomous frequency correction maintaining standard 50.0 Hz grid parameters.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: LEADERSHIP & SOP */}
          {activeTab === 'leadership' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {isBn ? 'প্রধান প্রকৌশলী দল ও গভর্ন্যান্স' : 'Executive Engineering Team & Governance'}
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  {isBn ? 'এআই পাওয়ার ম্যানেজমেন্ট ও উচ্চ ভোল্টেজ নিরাপত্তা বিশেষজ্ঞ' : 'Specialists in AI Smart Grid & High-Voltage Systems'}
                </p>
              </div>

              {/* Engineering Team */}
              <div className="space-y-2.5">
                {engineers.map((eng, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-[#0c1426] border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs sm:text-sm">{eng.name}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{eng.experience}</span>
                    </div>
                    <span className="text-indigo-300 text-[11px] block">{eng.role}</span>
                    <span className="text-slate-400 text-[10px] block">{eng.org}</span>
                  </div>
                ))}
              </div>

              {/* Operational Guidelines SOP */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  {isBn ? 'পরিচালন ও নিরাপত্তা নীতিমালা (SOP)' : 'Safety & Operational Guidelines'}
                </h4>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <h5 className="font-bold text-white text-xs">
                    {isBn ? '১. সাবস্টেশন নিরাপত্তা প্রোটোকল' : '1. High-Voltage Substation Protocol'}
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    {isBn
                      ? '১৩২কেভি সুইচইয়ার্ডে প্রবেশের জন্য ক্লাস ৪ আর্ক-ফ্ল্যাশ পিপিই ও বায়োমেট্রিক আইডি বাধ্যতামূলক।'
                      : 'Personnel entering switchyards must wear certified Class 4 arc-flash PPE and biometric RFID access.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <h5 className="font-bold text-white text-xs">
                    {isBn ? '২. ডেটা ইন্টিগ্রিটি ও স্কাডা লগিং' : '2. Data Integrity & SCADA Logging'}
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    {isBn
                      ? 'মেগাওয়াট উৎপাদন ও ফ্রিকোয়েন্সি তথ্য অপরিবর্তনীয়ভাবে সংরক্ষণ করা হয়।'
                      : 'Megawatt generation telemetry and frequency logs are recorded immutably.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: VIDEO */}
          {activeTab === 'video' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {isBn ? 'প্রাতিষ্ঠানিক এক্সপ্লেইনার ভিডিও' : 'Official Explainer Video'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? 'নোভাভেস্ট বিদ্যুৎ উৎপাদন ও গ্রিড সংযোগের সম্পূর্ণ পরিচিতি'
                      : 'Comprehensive visual tour of our grid infrastructure and plant generation'}
                  </p>
                </div>

                {/* Clip selection chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {videoClips.map((clip, idx) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() => {
                        setSelectedClipIndex(idx);
                        setIsPlayingLocal(false);
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          videoRef.current.pause();
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        selectedClipIndex === idx
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                          : 'bg-[#0f172a] text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {clip.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Player (Local MP4 - strictly manual playback, no YouTube) */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl group">
                <video
                  ref={videoRef}
                  src={videoClips[selectedClipIndex].videoSrc}
                  className="w-full h-full object-contain"
                  playsInline
                  controls
                  onPlay={() => setIsPlayingLocal(true)}
                  onPause={() => setIsPlayingLocal(false)}
                  onEnded={() => setIsPlayingLocal(false)}
                />

                {/* Big center play button overlay when paused */}
                {!isPlayingLocal && (
                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play();
                        setIsPlayingLocal(true);
                      }
                    }}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer z-20 pointer-events-auto"
                    aria-label="Play video"
                  >
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-[#070c18] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">
            Nova Terra Energy (NVT) Ltd. • 2026
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
