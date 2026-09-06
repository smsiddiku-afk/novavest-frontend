import React from 'react';

interface FuturisticLogoProps {
  size?: number;
  className?: string;
}

export const FuturisticLogo: React.FC<FuturisticLogoProps> = ({ size = 64, className = '' }) => {
  return (
    <div
      id="futuristic-logo-slot"
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div 
        className="absolute inset-0 rounded-2xl bg-cyan-500/25 blur-xl -z-10 animate-pulse"
        aria-hidden="true"
      />

      {/* Futuristic Rounded Square Frame matching user's reference mockup */}
      <div 
        className="w-full h-full rounded-[18px] border-2 border-cyan-500/50 bg-gradient-to-b from-[#0e1f3d] to-[#081226] p-2 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.35)] relative overflow-hidden group hover:border-cyan-400 transition-all duration-300"
      >
        {/* Subtle grid lines inside logo frame */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15)_0,transparent_70%)] pointer-events-none" />

        {/* 3D Geometric Isometric Investment Core Symbol */}
        <svg
          width={size * 0.75}
          height={size * 0.75}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_10px_rgba(56,189,248,0.7)] transform group-hover:scale-110 transition-transform duration-300"
        >
          <defs>
            <linearGradient id="coreTop" x1="20" y1="15" x2="80" y2="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="coreRight" x1="50" y1="35" x2="85" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#0F172A" />
            </linearGradient>
            <linearGradient id="coreLeft" x1="15" y1="35" x2="50" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#1E3A8A" />
            </linearGradient>
            <linearGradient id="coreGlow" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#E0F2FE" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
          </defs>

          {/* Isometric Diamond / Crystal Node */}
          <path d="M50 15 L82 33 L50 51 L18 33 Z" fill="url(#coreTop)" />
          <path d="M82 33 L82 67 L50 85 L50 51 Z" fill="url(#coreRight)" />
          <path d="M18 33 L50 51 L50 85 L18 67 Z" fill="url(#coreLeft)" />

          {/* Inner Floating Hologram Core */}
          <path d="M50 32 L68 42 L50 52 L32 42 Z" fill="url(#coreGlow)" opacity="0.95" />
          <path d="M68 42 L68 60 L50 70 L50 52 Z" fill="#2563EB" opacity="0.8" />
          <path d="M32 42 L50 52 L50 70 L32 60 Z" fill="#0284C7" opacity="0.8" />

          {/* Center Light Sparkle */}
          <circle cx="50" cy="52" r="3" fill="#FFFFFF" />
        </svg>

        {/* Corner Neon Accents */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
      </div>
    </div>
  );
};
