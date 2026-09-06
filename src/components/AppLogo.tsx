import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = '', size = 56 }) => {
  return (
    <div
      id="app-logo-container"
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Subtle back glow */}
      <div 
        className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl -z-10"
        aria-hidden="true"
      />

      <svg
        id="app-logo-svg"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_12px_rgba(56,189,248,0.5)] transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="facetTop" x1="20" y1="10" x2="80" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <linearGradient id="facetRight" x1="50" y1="30" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#1E3A8A" />
          </linearGradient>
          <linearGradient id="facetLeft" x1="10" y1="30" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
          <linearGradient id="facetInner" x1="30" y1="35" x2="70" y2="65" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="facetGlow" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F0FF" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>

        {/* Outer Isometric Hexagon Structure matching reference */}
        {/* Top facet */}
        <path
          d="M50 12 L82 30 L50 48 L18 30 Z"
          fill="url(#facetTop)"
        />

        {/* Right side facet */}
        <path
          d="M82 30 L82 70 L50 88 L50 48 Z"
          fill="url(#facetRight)"
        />

        {/* Left side facet */}
        <path
          d="M18 30 L50 48 L50 88 L18 70 Z"
          fill="url(#facetLeft)"
        />

        {/* Inner geometric negative/cutout block that creates the futuristic 3D loop */}
        <path
          d="M50 26 L70 37 L50 49 L30 37 Z"
          fill="#0B111E"
        />
        
        {/* Right inner cut */}
        <path
          d="M70 37 L70 63 L50 75 L50 49 Z"
          fill="#060A14"
        />

        {/* Left inner jewel facet */}
        <path
          d="M30 37 L50 49 L50 75 L30 63 Z"
          fill="#0A1325"
        />

        {/* Central futuristic angled ribbon facet representing digital wealth & block ledger */}
        <path
          d="M42 43 L62 32 L74 39 L54 50 Z"
          fill="url(#facetInner)"
          opacity="0.95"
        />
        <path
          d="M54 50 L74 39 L74 53 L54 64 Z"
          fill="#1D4ED8"
        />
        <path
          d="M34 49 L46 42 L54 47 L42 54 Z"
          fill="#38BDF8"
        />

        {/* Bottom accent glow dot */}
        <circle cx="50" cy="88" r="2" fill="#38BDF8" />
      </svg>
    </div>
  );
};
