import React from 'react';

/**
 * High-fidelity vector SVG illustrations representing clean solar energy
 * tailored specifically to match the NVT Energy brand and reference screenshot.
 */

export const SolarHeaderIcon: React.FC<{ className?: string }> = ({ className = 'w-14 h-14 sm:w-16 sm:h-16' }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="headerSky" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="45%" stopColor="#38bdf8" />
        <stop offset="85%" stopColor="#86efac" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
      <linearGradient id="solarGlass" x1="10" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1e3a8a" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1d4ed8" />
      </linearGradient>
      <radialGradient id="sunGlow" cx="72" cy="22" r="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="40%" stopColor="#facc15" />
        <stop offset="80%" stopColor="#eab308" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
      </radialGradient>
      <filter id="glowG" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
      </filter>
    </defs>
    {/* Base Circular Badge with glowing outline */}
    <circle cx="50" cy="50" r="46" fill="url(#headerSky)" stroke="#34d399" strokeWidth="2.5" filter="url(#glowG)" />
    
    {/* Sun with Rays */}
    <circle cx="72" cy="22" r="16" fill="url(#sunGlow)" />
    <circle cx="72" cy="22" r="9" fill="#fef08a" />
    <circle cx="72" cy="22" r="6" fill="#fffbeb" />
    {/* Sunrays */}
    <path d="M72 7V2M72 42V37M57 22H52M92 22H87M61 11L57 7M87 37L83 33M83 11L87 7M57 33L61 37" stroke="#fef08a" strokeWidth="1.8" strokeLinecap="round" />

    {/* Green Hills Base */}
    <path d="M4 64C20 54 45 56 62 62C76 67 88 66 96 68V94C96 95 95 96 94 96H6C5 96 4 95 4 94V64Z" fill="#15803d" />
    <path d="M4 72C24 66 50 67 68 74C82 79 92 78 96 79V94C96 95 95 96 94 96H6C5 96 4 95 4 94V72Z" fill="#16a34a" />

    {/* Stand / Mounting Pole */}
    <path d="M46 58L42 76H52L48 58" fill="#475569" stroke="#334155" strokeWidth="1" />
    <path d="M38 76H56V78H38V76Z" fill="#334155" />

    {/* Tilted Solar Panel in 3D Perspective */}
    <g transform="translate(0, 2)">
      {/* Outer Aluminum Frame */}
      <polygon points="18,48 70,36 78,59 26,71" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
      {/* Blue Solar Glass Face */}
      <polygon points="20,49 68,38 76,58 28,69" fill="url(#solarGlass)" />
      {/* Solar Cell Grid Lines */}
      {/* Horizontals */}
      <line x1="22" y1="54" x2="70" y2="43" stroke="#93c5fd" strokeWidth="0.8" opacity="0.8" />
      <line x1="25" y1="60" x2="73" y2="49" stroke="#93c5fd" strokeWidth="0.8" opacity="0.8" />
      <line x1="27" y1="65" x2="75" y2="54" stroke="#93c5fd" strokeWidth="0.8" opacity="0.8" />
      {/* Verticals */}
      <line x1="32" y1="46" x2="40" y2="66" stroke="#93c5fd" strokeWidth="0.8" opacity="0.8" />
      <line x1="44" y1="43" x2="52" y2="63" stroke="#93c5fd" strokeWidth="0.8" opacity="0.8" />
      <line x1="56" y1="40" x2="64" y2="60" stroke="#93c5fd" strokeWidth="0.8" opacity="0.8" />
      {/* Glossy Diagonal Glare */}
      <polygon points="21,50 38,45 42,67 25,69" fill="#ffffff" opacity="0.15" />
    </g>
  </svg>
);

export const SolarMiniIcon: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <linearGradient id="miniPanel" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#1e40af" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    {/* Sun corner */}
    <circle cx="38" cy="10" r="6" fill="#facc15" />
    <path d="M38 2V4M38 16V18M30 10H32M44 10H46" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
    {/* Stand */}
    <path d="M22 28L18 42H28L24 28" fill="#64748b" />
    <line x1="14" y1="42" x2="32" y2="42" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
    {/* Solar Face */}
    <polygon points="8,22 36,14 42,30 14,38" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
    <polygon points="10,23 35,16 40,29 15,36" fill="url(#miniPanel)" />
    <line x1="12" y1="29" x2="38" y2="22" stroke="#93c5fd" strokeWidth="0.8" />
    <line x1="23" y1="20" x2="27" y2="33" stroke="#93c5fd" strokeWidth="0.8" />
  </svg>
);

export const SolarTierIcon: React.FC<{ tierNumber: number; className?: string }> = ({
  tierNumber,
  className = 'w-12 h-12 sm:w-13 sm:h-13',
}) => {
  switch (tierNumber) {
    case 1:
      // Single panel with sun & grass
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <path d="M8 44C18 38 46 38 56 44V58C56 60 32 62 8 58V44Z" fill="#15803d" />
          {/* Sun */}
          <circle cx="48" cy="16" r="8" fill="#facc15" />
          <path d="M48 5V7M48 25V27M37 16H39M57 16H59" stroke="#fef08a" strokeWidth="1.5" strokeLinecap="round" />
          {/* Pole */}
          <path d="M30 36L26 50H36L32 36" fill="#64748b" />
          {/* Panel */}
          <polygon points="12,28 44,18 50,38 18,48" fill="#cbd5e1" />
          <polygon points="14,29 43,20 48,37 19,46" fill="#1d4ed8" />
          <line x1="16" y1="37" x2="46" y2="28" stroke="#93c5fd" strokeWidth="1" />
          <line x1="28" y1="24" x2="33" y2="42" stroke="#93c5fd" strokeWidth="1" />
        </svg>
      );

    case 2:
      // Twin solar panels
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <path d="M6 46C20 40 44 40 58 46V58C58 60 32 62 6 58V46Z" fill="#16a34a" />
          <circle cx="48" cy="15" r="7" fill="#facc15" />
          {/* Left Panel */}
          <polygon points="8,30 28,22 32,42 12,50" fill="#cbd5e1" />
          <polygon points="10,31 27,24 30,41 13,48" fill="#2563eb" />
          <line x1="11" y1="39" x2="29" y2="32" stroke="#93c5fd" strokeWidth="0.8" />
          <line x1="19" y1="27" x2="22" y2="45" stroke="#93c5fd" strokeWidth="0.8" />
          {/* Right Panel */}
          <polygon points="32,26 52,18 56,38 36,46" fill="#cbd5e1" />
          <polygon points="34,27 51,20 54,37 37,44" fill="#1d4ed8" />
          <line x1="35" y1="35" x2="53" y2="28" stroke="#93c5fd" strokeWidth="0.8" />
          <line x1="43" y1="23" x2="46" y2="41" stroke="#93c5fd" strokeWidth="0.8" />
        </svg>
      );

    case 3:
      // Solar farm array with bright sun
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="50" cy="14" r="8" fill="#facc15" />
          <path d="M6 42C22 36 46 36 58 42V60H6V42Z" fill="#15803d" />
          {/* Triple Array */}
          <polygon points="10,38 24,32 28,46 14,52" fill="#1e40af" stroke="#cbd5e1" strokeWidth="1" />
          <polygon points="24,34 38,28 42,42 28,48" fill="#2563eb" stroke="#cbd5e1" strokeWidth="1" />
          <polygon points="38,30 52,24 56,38 42,44" fill="#3b82f6" stroke="#cbd5e1" strokeWidth="1" />
        </svg>
      );

    case 4:
      // High-yield solar ground farm
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="48" cy="14" r="8" fill="#fde047" />
          <path d="M48 3V5M48 23V25M37 14H39M57 14H59" stroke="#facc15" strokeWidth="1.5" />
          <path d="M4 42C20 34 46 34 60 42V60H4V42Z" fill="#16a34a" />
          {/* Large ground array */}
          <polygon points="12,28 50,18 56,42 18,52" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <polygon points="14,30 48,20 54,40 20,50" fill="#1d4ed8" />
          <line x1="17" y1="40" x2="51" y2="30" stroke="#93c5fd" strokeWidth="1" />
          <line x1="31" y1="25" x2="37" y2="45" stroke="#93c5fd" strokeWidth="1" />
          <line x1="22" y1="27" x2="28" y2="47" stroke="#93c5fd" strokeWidth="1" />
          <line x1="40" y1="22" x2="46" y2="42" stroke="#93c5fd" strokeWidth="1" />
        </svg>
      );

    case 5:
      // Solar Panel + Battery Inverter Cabinet (BESS storage matching screenshot V5!)
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <path d="M4 46C20 40 48 40 60 46V60H4V46Z" fill="#15803d" />
          {/* Solar Panel in back */}
          <polygon points="26,24 54,16 58,38 30,46" fill="#cbd5e1" />
          <polygon points="28,25 52,18 56,36 32,43" fill="#2563eb" />
          <line x1="30" y1="34" x2="54" y2="27" stroke="#93c5fd" strokeWidth="0.8" />
          <line x1="40" y1="21" x2="44" y2="40" stroke="#93c5fd" strokeWidth="0.8" />
          {/* Modern White Battery Storage Tower (BESS Cabinet) */}
          <rect x="10" y="24" width="16" height="28" rx="2.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
          {/* LED Indicator and Inverter Lines */}
          <rect x="13" y="28" width="10" height="2" rx="0.5" fill="#10b981" />
          <circle cx="15" cy="34" r="1.2" fill="#22c55e" />
          <circle cx="18" cy="34" r="1.2" fill="#22c55e" />
          <circle cx="21" cy="34" r="1.2" fill="#38bdf8" />
          <rect x="13" y="38" width="10" height="10" rx="1" fill="#e2e8f0" />
        </svg>
      );

    case 6:
      // Eco Residential Home with Rooftop Solar Panels (Matching screenshot V6!)
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="50" cy="14" r="7" fill="#facc15" />
          <path d="M4 48C18 42 46 42 60 48V60H4V48Z" fill="#16a34a" />
          {/* House Base */}
          <rect x="16" y="34" width="32" height="20" rx="1.5" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
          {/* Door & Window */}
          <rect x="28" y="42" width="8" height="12" fill="#475569" />
          <rect x="38" y="38" width="7" height="7" rx="0.5" fill="#38bdf8" stroke="#cbd5e1" strokeWidth="0.8" />
          {/* Roof */}
          <polygon points="12,34 32,18 52,34" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          {/* Solar Panel on Left Slanted Roof */}
          <polygon points="16,33 30,22 34,26 20,37" fill="#1d4ed8" stroke="#cbd5e1" strokeWidth="0.8" />
          <line x1="18" y1="35" x2="32" y2="24" stroke="#93c5fd" strokeWidth="0.6" />
        </svg>
      );

    case 7:
      // Multi-panel Solar Park on Rolling Hills (Matching screenshot V7!)
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="48" cy="14" r="8" fill="#facc15" />
          {/* Rolling Hills */}
          <path d="M4 38C18 30 42 32 60 38V60H4V38Z" fill="#15803d" />
          <path d="M4 46C22 40 44 42 60 46V60H4V46Z" fill="#16a34a" />
          {/* Solar Park Arrays */}
          <polygon points="8,36 26,28 32,44 14,52" fill="#1e3a8a" stroke="#cbd5e1" strokeWidth="1" />
          <polygon points="10,38 25,30 30,42 15,50" fill="#2563eb" />
          <polygon points="30,30 48,22 54,38 36,46" fill="#1e3a8a" stroke="#cbd5e1" strokeWidth="1" />
          <polygon points="32,32 47,24 52,36 37,44" fill="#3b82f6" />
        </svg>
      );

    case 8:
      // Solar Station + Wind Turbine (Matching screenshot V8!)
      return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
          <circle cx="32" cy="32" r="30" fill="#063223" stroke="#10b981" strokeWidth="1.5" />
          {/* Sun */}
          <circle cx="48" cy="14" r="7" fill="#fde047" />
          <path d="M4 44C20 38 46 38 60 44V60H4V44Z" fill="#15803d" />
          {/* Wind Turbine in background */}
          <line x1="48" y1="20" x2="48" y2="46" stroke="#e2e8f0" strokeWidth="1.8" />
          <circle cx="48" cy="20" r="2.2" fill="#cbd5e1" />
          <line x1="48" y1="20" x2="40" y2="10" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="48" y1="20" x2="56" y2="12" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="48" y1="20" x2="48" y2="30" stroke="#f8fafc" strokeWidth="1.4" strokeLinecap="round" />
          {/* Large Foreground Solar Arrays */}
          <polygon points="10,32 38,22 44,42 16,52" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
          <polygon points="12,33 37,24 42,40 17,49" fill="#1d4ed8" />
          <line x1="14" y1="41" x2="39" y2="32" stroke="#93c5fd" strokeWidth="0.8" />
          <line x1="24" y1="28" x2="29" y2="45" stroke="#93c5fd" strokeWidth="0.8" />
        </svg>
      );

    default:
      return <SolarMiniIcon className={className} />;
  }
};
