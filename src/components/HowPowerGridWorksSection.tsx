import React, { useState, useRef } from 'react';
import {
  Building2,
  Zap,
  BatteryCharging,
  Cpu,
  Users,
  Headphones,
  TrendingUp,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ShieldCheck,
  CheckCircle2,
  Award,
  Sparkles,
  Info,
  Layers,
  FileCheck,
  Radio,
  Scale,
  Activity,
  MapPin,
  ExternalLink,
  ChevronRight,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { Language } from '../types';

interface HowPowerGridWorksSectionProps {
  currentLang?: Language;
  onOpenLicensesModal?: () => void;
  defaultTab?: 'workflow' | 'licenses';
}

export const HowPowerGridWorksSection: React.FC<HowPowerGridWorksSectionProps> = ({
  currentLang = 'en',
  defaultTab = 'workflow',
  onOpenLicensesModal,
}) => {
  const isBn = currentLang === 'bn';
  const [activeMainTab, setActiveMainTab] = useState<'workflow' | 'licenses'>(defaultTab);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Video Player state
  const videoClips = [
    {
      id: 'solar-park',
      title: isBn ? '১. সোলার পার্ক ও গ্রিড সাবস্টেশন' : '1. Solar Park & Grid Substation',
      subtitle: isBn ? 'Apex Helios ৪৫০ মেগাওয়াট উৎপাদন' : 'Apex Helios 450MW Substation',
      videoSrc: '/company-profile/videos/solar-park-grid.mp4',
    },
    {
      id: 'battery-hub',
      title: isBn ? '২. বিইএসএস ব্যাটারি হাব' : '2. BESS Mega Battery Hub',
      subtitle: isBn ? '৮২০ MWh গ্রিড ব্যালেন্সিং' : '820 MWh Grid Balancing',
      videoSrc: '/company-profile/videos/battery-storage-hub.mp4',
    },
    {
      id: 'ppa-dispatch',
      title: isBn ? '৩. দৈনিক আয় ও ক্যাশআউট' : '3. Revenue & Instant Cashout',
      subtitle: isBn ? 'PPA রাজস্ব ও বিকাশ/নগদ পেমেন্ট' : 'PPA Dispatch & Mobile Payouts',
      videoSrc: '/company-profile/videos/ppa-revenue-dispatch.mp4',
    },
    {
      id: 'grid-arch',
      title: isBn ? '৪. সম্পূর্ণ গ্রিড আর্কিটেকচার' : '4. Complete Grid Architecture',
      subtitle: isBn ? 'নোভা এনার্জি প্রাতিষ্ঠানিক প্রামাণ্যচিত্র' : 'Nova Official Grid Architecture',
      videoSrc: '/company-profile/videos/how-power-grid-works.mp4',
    },
  ];
  const [selectedClipIndex, setSelectedClipIndex] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlayingLocal, setIsPlayingLocal] = useState(false);

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
      title: isBn ? 'প্রকল্প ও কার্যক্রম' : 'Projects/Activities',
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
      title: isBn ? 'গ্রাহক ও অংশীদার সেবা' : 'Customer/Partner Services',
      subtitle: isBn ? 'স্বচ্ছ হিসাব ও সার্বক্ষণিক সহায়তা' : 'Transparent Accounting & Care',
      icon: Headphones,
      desc: isBn
        ? 'গ্রাহকদের ২৪/৭ কাস্টমার কেয়ার, ডিজিটাল ওয়ালেট সমন্বয় এবং দৈনিক উৎপাদন তথ্য স্বচ্ছভাবে উপস্থাপন।'
        : 'Round-the-clock member helpline, automated daily generation accounting, and direct communication channels.',
      metric: isBn ? '< ৫ মিনিট রেসপন্স টাইম' : '< 5 min Response Time',
    },
    {
      num: '07',
      title: isBn ? 'রাজস্ব ও ব্যবসায়িক পরিচালনা' : 'Revenue/Business Operations',
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
    <div id="how-power-grid-works-section" className="w-full space-y-5 pt-2">
      {/* Top Navigation Tabs directly on the page - NO POP-UP */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#091122] border border-cyan-500/30">
        <button
          type="button"
          onClick={() => setActiveMainTab('workflow')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'workflow'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>{isBn ? '⚡ বিদ্যুৎ গ্রিড কর্মপদ্ধতি ও ভিডিও' : '⚡ How Power Grid Works & Video'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('licenses')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeMainTab === 'licenses'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isBn ? '📜 সরকারি লাইসেন্স ও সনদপত্র' : '📜 Official Licences & Approvals'}</span>
        </button>
      </div>

      {/* TAB 1: WORKFLOW & VIDEO */}
      {activeMainTab === 'workflow' && (
        <div className="rounded-3xl bg-[#0a1020] border border-cyan-500/30 p-5 sm:p-6 space-y-6 shadow-xl">
          {/* 1. HOW POWER GRID WORKS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
              <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                {isBn ? 'বিদ্যুৎ গ্রিড আর্কিটেকচার' : 'Operational Architecture'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {isBn ? '১. বিদ্যুৎ গ্রিড কিভাবে কাজ করে' : '1. HOW POWER GRID WORKS'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isBn
                ? 'নোভা টেরা এনার্জি (NVT) একটি আধুনিক ও পেশাদার জ্বালানী ও বিদ্যুৎ অবকাঠামো পরিচালনাকারী প্রতিষ্ঠান। আমাদের বৃহৎ সৌর ও জ্বালানী বিদ্যুৎ প্রকল্পসমূহে সূর্যালোক ও ফুয়েল এনার্জিকে উচ্চ ক্ষমতাসম্পন্ন ইনভার্টারের মাধ্যমে ব্যবহারযোগ্য বিদ্যুতে রূপান্তর করা হয়। এরপর ১৩২কেভি/৩৩কেভি সাবস্টেশনের মাধ্যমে ভোল্টেজ বৃদ্ধি করে সরাসরি জাতীয় গ্রিড ও শিল্প জোনে সরবরাহ করা হয়।'
                : 'Nova Terra Energy (NVT) operates utility-scale renewable power generation assets integrated directly into national transmission networks. Solar irradiance captured by bifacial photovoltaic panels is converted into AC power via high-efficiency inverters, stepped up to 132kV/33kV at on-site automated substations, and injected into the grid under regulated Power Purchase Agreements (PPAs) that deliver dependable daily yields.'}
            </p>
          </div>

          {/* 2. OUR WORKING PROCESS */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{isBn ? '২. আমাদের কার্যপ্রণালী পরিক্রমা' : '2. OUR WORKING PROCESS'}</span>
              </h3>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                7-Stage Flow
              </span>
            </div>

            {/* Visual Process Flow Ribbon */}
            <div className="flex items-center overflow-x-auto pb-2 gap-2 no-scrollbar">
              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                const isSelected = activeStepIndex === idx;
                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setActiveStepIndex(idx)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20 text-white'
                        : 'bg-[#091122] border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-cyan-400 text-black' : 'bg-slate-800 text-cyan-300'
                      }`}
                    >
                      {step.num}
                    </div>
                    <span className="text-xs font-semibold whitespace-nowrap">{step.title}</span>
                    {idx < steps.length - 1 && (
                      <span className="text-slate-600 pl-1 font-mono">→</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. STEP-BY-STEP EXPLANATION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{isBn ? '৩. প্রতিটি ধাপের বিস্তারিত ব্যাখ্যা' : '3. STEP-BY-STEP EXPLANATION'}</span>
              </h3>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                Step {steps[activeStepIndex].num} of 07
              </span>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#0d152a] border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                    {React.createElement(steps[activeStepIndex].icon, { className: 'w-5 h-5' })}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-white">{steps[activeStepIndex].title}</h4>
                    <span className="text-[11px] text-slate-400">{steps[activeStepIndex].subtitle}</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-black/60 text-cyan-300 border border-cyan-500/30">
                  {steps[activeStepIndex].metric}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {steps[activeStepIndex].desc}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white cursor-pointer transition-colors"
                >
                  ← {isBn ? 'পূর্ববর্তী ধাপ' : 'Prev Step'}
                </button>
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveStepIndex(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeStepIndex === i ? 'bg-cyan-400 w-5' : 'bg-slate-700 w-2'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  disabled={activeStepIndex === steps.length - 1}
                  onClick={() => setActiveStepIndex((prev) => Math.min(steps.length - 1, prev + 1))}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs text-white font-bold cursor-pointer transition-colors"
                >
                  {isBn ? 'পরবর্তী ধাপ' : 'Next Step'} →
                </button>
              </div>
            </div>
          </div>

          {/* 4. EXPLAINER VIDEO DIRECTLY BELOW EXPLANATION */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>{isBn ? '৪. প্রাতিষ্ঠানিক এক্সপ্লেইনার ভিডিও' : '4. EXPLAINER VIDEO'}</span>
              </h3>

              <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'অফিসিয়াল এইচডি ভিডিও' : 'Official HD Video'}</span>
              </div>
            </div>

            {/* Clean Native Video Player (No YouTube branding, Manual Play Only) */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-cyan-500/40 shadow-2xl group">
              <div className="relative w-full aspect-video bg-black flex flex-col justify-center items-center">
                <video
                  ref={videoRef}
                  src={videoClips[selectedClipIndex].videoSrc}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-cover"
                  onPlay={() => setIsPlayingLocal(true)}
                  onPause={() => setIsPlayingLocal(false)}
                />

                {/* Big Play Overlay if paused (manual play requirement) */}
                {!isPlayingLocal && (
                  <div
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.play().catch(() => {});
                        setIsPlayingLocal(true);
                      }
                    }}
                    className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/35"
                  >
                    <div className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 border border-cyan-300 text-black flex items-center justify-center shadow-2xl shadow-cyan-500/50 transform hover:scale-110 active:scale-95 transition-all">
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                    <div className="mt-3 px-3 py-1 rounded-full bg-black/80 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 shadow-md">
                      {isBn ? 'ভিডিও চালু করতে প্লে করুন' : 'Click to Play Video'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Video Switcher Pill Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {videoClips.map((clip, idx) => (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => {
                    setSelectedClipIndex(idx);
                    setIsPlayingLocal(false);
                    if (videoRef.current) {
                      videoRef.current.pause();
                      videoRef.current.currentTime = 0;
                    }
                  }}
                  className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                    selectedClipIndex === idx
                      ? 'bg-cyan-950/70 border-cyan-400 text-cyan-200 ring-1 ring-cyan-500/30'
                      : 'bg-[#091122] border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-bold truncate">{clip.title}</div>
                  <div className="text-[9px] text-slate-400 truncate">{clip.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. REAL BUSINESS ACTIVITIES */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{isBn ? '৫. বাস্তব ব্যবসায়িক কার্যক্রম' : '5. REAL BUSINESS ACTIVITIES'}</span>
              </h3>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isBn ? 'সক্রিয় প্রকল্পসমূহ' : 'Live Assets'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#0c1426] border border-slate-800 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=600&q=80"
                  alt="Solar Park"
                  className="w-full h-36 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="p-3.5 space-y-1">
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                    {isBn ? '৪৫০ মেগাওয়াট সোলার পার্ক' : '450 MW Apex Solar Park'}
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {isBn ? 'বাইফেসিয়াল সোলার অ্যারে ও ইনভার্টার' : 'Bifacial Solar Arrays & Inverters'}
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isBn
                      ? '১২০০টি স্ট্রিং ইনভার্টার দ্বারা পরিচালিত এবং সার্বক্ষণিক এআই থার্মাল ড্রোন দ্বারা তদারকিকৃত।'
                      : 'Monitored by autonomous infrared drones and string telemetry ensuring 98.9% availability.'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#0c1426] border border-slate-800 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80"
                  alt="Substation"
                  className="w-full h-36 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="p-3.5 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                    {isBn ? '১৩২কেভি গ্রিড সাবস্টেশন' : '132kV / 33kV Substation'}
                  </span>
                  <h5 className="text-xs font-bold text-white">
                    {isBn ? 'স্টেপ-আপ ট্রান্সফরমার ও সুইচইয়ার্ড' : 'Step-Up Transformers & Switchyard'}
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isBn
                      ? 'জাতীয় গ্রিড লাইনে বিদ্যুৎ প্রেরণের জন্য উচ্চ ভোল্টেজ রূপান্তর এবং স্বয়ংক্রিয় সুরক্ষা ব্যবস্থা।'
                      : 'Stepping up voltage for low-loss transmission into regional national grid feeders.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 6. TRANSPARENCY */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>{isBn ? '৬. প্রাতিষ্ঠানিক স্বচ্ছতা' : '6. TRANSPARENCY'}</span>
              </h3>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isBn
                ? 'নোভা টেরা এনার্জি (NVT) প্রতিটি কার্যক্রমে সর্বোচ্চ স্বচ্ছতা বজায় রাখে। জাতীয় গ্রিডে বিদ্যুৎ সরবরাহের তথ্য ডুয়াল-সার্টিফাইড ডিজিটাল এনার্জি মিটারের মাধ্যমে সরাসরি রেকর্ড হয়। কোনো কৃত্রিম অনুমান বা গোপন তথ্য ছাড়াই নিয়মিত অডিট রিপোর্ট ও দৈনিক উৎপাদন ব্রিফিং প্রদান করা হয়।'
                : 'Nova Terra Energy (NVT) enforces stringent corporate transparency. Every kilowatt-hour supplied to the grid is measured through dual utility-certified meters, verified against official dispatch sheets, and communicated openly through daily community town halls and annual audits.'}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-black/50 border border-slate-800 space-y-1">
                <span className="text-[11px] text-cyan-400 font-bold block">
                  {isBn ? 'ডিজিটাল মিটারিং লগ' : 'Digital Metering'}
                </span>
                <span className="text-slate-300 text-[11px] block">
                  {isBn ? 'প্রতি সেকেন্ডে রিয়েল-টাইম আপডেট' : 'Verified by utility dispatch sheets'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-slate-800 space-y-1">
                <span className="text-[11px] text-amber-400 font-bold block">
                  {isBn ? 'স্বাধীন পেশাদার অডিট' : 'Statutory Audits'}
                </span>
                <span className="text-slate-300 text-[11px] block">
                  {isBn ? 'চার্টার্ড ফার্ম দ্বারা নিয়মিত যাচাই' : 'ISO & financial conformity audits'}
                </span>
              </div>
            </div>
          </div>

          {/* 7. FINAL SUMMARY */}
          <div className="pt-4 border-t border-slate-800">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0f1d3d] via-[#13254d] to-[#0f1d3d] border border-cyan-400/50 shadow-xl text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>{isBn ? '৭. চূড়ান্ত সারাংশ' : '7. FINAL SUMMARY'}</span>
              </div>

              <p className="text-sm sm:text-base font-extrabold text-white tracking-wide leading-relaxed">
                “From operation to execution, every process is managed through a structured and transparent system.”
              </p>

              {isBn && (
                <p className="text-xs text-cyan-200 font-medium">
                  “পরিকল্পনা ও পরিচালনা থেকে শুরু করে বাস্তবায়ন পর্যন্ত, প্রতিটি প্রক্রিয়া একটি সুনির্দিষ্ট এবং স্বচ্ছ কাঠামোর মাধ্যমে পরিচালিত হয়।”
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OFFICIAL LICENSES DIRECTLY ON THE PAGE */}
      {activeMainTab === 'licenses' && (
        <div className="rounded-3xl bg-[#0a1020] border border-amber-500/30 p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isBn ? 'সরকারি লাইসেন্স ও অনুমোদন সনদপত্র' : 'Official Licences & Certifications'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {isBn
                  ? 'কোম্পানির সকল নিয়ন্ত্রক লাইসেন্স ও সনদপত্র শতভাগ যাচাইযোগ্য ও স্বচ্ছ।'
                  : 'All corporate permits, grid dispatch licenses, and ISO standards are verifiable.'}
              </p>
            </div>

            {onOpenLicensesModal && (
              <button
                type="button"
                onClick={onOpenLicensesModal}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'পূর্ণাঙ্গ প্রোফাইল' : 'Full Profile'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {officialLicenses.map((lic) => (
              <div
                key={lic.id}
                className="p-4 rounded-2xl bg-[#0c1426] border border-slate-800 hover:border-amber-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
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
                    <h4 className="text-sm font-bold text-white mt-1">{lic.title}</h4>
                    <span className="text-xs text-slate-400">{lic.org}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-cyan-300 block">{lic.code}</span>
                    <span className="text-[10px] text-slate-400 block">{lic.validity}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-slate-800/80">
                  {lic.details}
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                  <span className="font-mono text-[10px] text-slate-500 truncate max-w-[200px]">
                    {lic.issuerSeal}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleCopyHash(lic.hash)}
                    className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30"
                  >
                    {copiedHash === lic.hash ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">{isBn ? 'কপি হয়েছে' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{isBn ? 'হ্যাশ যাচাই' : 'Verify Hash'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 text-center space-y-1">
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
    </div>
  );
};
