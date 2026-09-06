import React from 'react';

interface SpinningLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subtitle?: string;
  lang?: 'en' | 'bn';
}

export const SpinningLogo: React.FC<SpinningLogoProps> = ({
  size = 'lg',
  showText = true,
  className = '',
  subtitle,
  lang = 'bn',
}) => {
  // Dimensions mapping
  const sizeMap = {
    sm: { container: 'w-12 h-12', textSize: 'text-base', subSize: 'text-[9px]' },
    md: { container: 'w-20 h-20', textSize: 'text-lg', subSize: 'text-[10px]' },
    lg: { container: 'w-28 h-28 sm:w-32 sm:h-32', textSize: 'text-2xl sm:text-3xl', subSize: 'text-xs' },
    xl: { container: 'w-36 h-36 sm:w-40 sm:h-40', textSize: 'text-3xl sm:text-4xl', subSize: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* ───────────────────────────────────────────────────────────
          SPINNING FUEL & ENERGY (জ্বালানী ও বিদ্যুৎ) REACTOR LOGO
      ─────────────────────────────────────────────────────────── */}
      <div className={`relative ${currentSize.container} flex items-center justify-center`}>
        {/* Ambient Fuel Combustion Aura (Glowing Amber & Electric Blue) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/35 via-orange-600/30 to-cyan-500/25 blur-xl animate-pulse pointer-events-none" />

        {/* Outer Ring 1: High-Tech Refinery & Energy Orbit (Clockwise Smooth Rotation) */}
        <div className="absolute inset-0 flex items-center justify-center animate-spin-slow">
          <svg
            viewBox="0 0 120 120"
            className="w-full h-full drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            fill="none"
          >
            <defs>
              <linearGradient id="fuelRingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
                <stop offset="40%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Segmented technological orbit */}
            <circle
              cx="60"
              cy="60"
              r="55"
              stroke="url(#fuelRingGrad1)"
              strokeWidth="2.2"
              strokeDasharray="28 10 8 10 40 14"
              strokeLinecap="round"
            />

            {/* Fuel & Energy Orbital Particles */}
            <circle cx="60" cy="5" r="3.5" fill="#f59e0b" className="drop-shadow-[0_0_8px_#f59e0b]" />
            <circle cx="115" cy="60" r="3" fill="#22d3ee" className="drop-shadow-[0_0_6px_#22d3ee]" />
            <circle cx="60" cy="115" r="3.5" fill="#f97316" className="drop-shadow-[0_0_8px_#f97316]" />
            <circle cx="5" cy="60" r="3" fill="#38bdf8" className="drop-shadow-[0_0_6px_#38bdf8]" />
          </svg>
        </div>

        {/* Ring 2: Counter-Rotating Fuel Flow & Pipeline Calibrator (Counter-Clockwise) */}
        <div className="absolute inset-1 sm:inset-1.5 flex items-center justify-center animate-spin-reverse-slow">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            fill="none"
          >
            <defs>
              <linearGradient id="fuelPipelineGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.85" />
              </linearGradient>
            </defs>

            {/* Dashed tech circle */}
            <circle
              cx="50"
              cy="50"
              r="43"
              stroke="url(#fuelPipelineGrad)"
              strokeWidth="1.6"
              strokeDasharray="10 6 20 6"
            />

            {/* Calibrator notches */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, idx) => {
              const rad = (angle * Math.PI) / 180;
              const isMajor = angle % 90 === 0;
              const rInner = isMajor ? 38 : 40;
              const rOuter = 44;
              const x1 = 50 + rInner * Math.cos(rad);
              const y1 = 50 + rInner * Math.sin(rad);
              const x2 = 50 + rOuter * Math.cos(rad);
              const y2 = 50 + rOuter * Math.sin(rad);
              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isMajor ? '#f59e0b' : '#38bdf8'}
                  strokeWidth={isMajor ? '1.8' : '1.2'}
                  strokeOpacity={isMajor ? '0.9' : '0.6'}
                />
              );
            })}
          </svg>
        </div>

        {/* Ring 3: Spinning 4-Point Turbine / Rotor of Fuel Generation */}
        <div className="absolute inset-2.5 sm:inset-3 flex items-center justify-center animate-spin-medium">
          <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
            <defs>
              <linearGradient id="turbineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <g transform="translate(40,40)">
              {[0, 90, 180, 270].map((rot) => (
                <path
                  key={rot}
                  d="M 0 -2 C 8 -16, 20 -15, 18 -4 C 16 2, 6 3, 0 0 Z"
                  fill="url(#turbineGrad)"
                  transform={`rotate(${rot})`}
                  className="drop-shadow-[0_0_5px_rgba(249,115,22,0.6)]"
                />
              ))}
            </g>
          </svg>
        </div>

        {/* ───────────────────────────────────────────────────────────
            CENTRAL ICON: THE ICONIC FUEL DROPLET & BLAZING ENERGY FLAME
            (জালানীর প্রতীক: তেলের ড্রপ ও জ্বলন্ত অগ্নিশিখা)
        ─────────────────────────────────────────────────────────── */}
        <div className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_16px_rgba(245,158,11,0.85)]">
            <defs>
              {/* Outer Fuel Drop Gradient */}
              <linearGradient id="outerFuelDrop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="30%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>

              {/* Inner Pure Flame Gradient */}
              <linearGradient id="innerBlazingFlame" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="80%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              {/* Cyan Gas & Spark Accent Gradient */}
              <linearGradient id="gasPlasmaGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>

            {/* Glowing Fuel Droplet Base (জ্বালানি ড্রপলেট কাঠামো) */}
            <path
              d="M 50,14 C 50,14 26,45 26,67 C 26,81 37,92 50,92 C 63,92 74,81 74,67 C 74,45 50,14 50,14 Z"
              fill="url(#outerFuelDrop)"
              stroke="#fef08a"
              strokeWidth="1.5"
              strokeOpacity="0.7"
              className="drop-shadow-[0_0_10px_rgba(234,88,12,0.9)]"
            />

            {/* Active Inner Flame (জ্বলন্ত অগ্নিশিখা) */}
            <path
              d="M 50,28 C 50,28 35,50 35,66 C 35,76 42,83 50,83 C 58,83 65,76 65,66 C 65,56 59,48 56,43 C 54,49 51,52 48,51 C 48,46 51,37 50,28 Z"
              fill="url(#innerBlazingFlame)"
              className="animate-pulse"
            />

            {/* Hot White-Gold Energy Core (উত্তপ্ত কেন্দ্রবিন্দু) */}
            <path
              d="M 50,50 C 50,50 43,60 43,69 C 43,74 46,78 50,78 C 54,78 57,74 57,69 C 57,63 53,58 50,50 Z"
              fill="#ffffff"
              opacity="0.95"
              className="drop-shadow-[0_0_6px_#ffffff]"
            />

            {/* Micro Electric Spark within fuel base */}
            <circle cx="50" cy="70" r="3" fill="#67e8f9" className="animate-ping" />
          </svg>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────
          BRAND TYPOGRAPHY & FUEL/POWER STATUS (NVT • Nova Terra Energy)
      ─────────────────────────────────────────────────────────── */}
      {showText && (
        <div className="mt-4 text-center">
          <div className="flex flex-col items-center justify-center gap-0.5">
            <h1
              className={`${currentSize.textSize} font-black tracking-[0.25em] uppercase bg-gradient-to-r from-amber-200 via-orange-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_2px_16px_rgba(245,158,11,0.5)]`}
            >
              NVT
            </h1>
            <span className="text-xs sm:text-sm font-bold tracking-[0.22em] uppercase text-slate-200 drop-shadow-sm font-sans">
              Nova Terra Energy
            </span>
          </div>

          <p
            className={`${currentSize.subSize} text-amber-400 font-bold tracking-[0.16em] uppercase mt-1.5 flex items-center justify-center gap-1.5`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping inline-block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-cyan-300 font-extrabold">
              {subtitle || (lang === 'bn' ? 'জ্বালানী, গ্যাস ও বিদ্যুৎ গ্রিড' : 'Fuel, Gas & Electric Power Grid')}
            </span>
          </p>

          <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5">
            {lang === 'bn' ? 'NVT অফিশিয়াল এনার্জি ইনভেস্টমেন্ট পোর্টাল' : 'NVT Official Energy & Fuel Portal'}
          </p>
        </div>
      )}
    </div>
  );
};

