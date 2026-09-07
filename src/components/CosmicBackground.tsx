import React from 'react';

interface BackgroundProps {
  children?: React.ReactNode;
  theme?: 'cosmic-dark' | 'light-map';
  locked?: boolean;
}

export const CosmicBackground: React.FC<BackgroundProps> = ({ children }) => {
  return (
    <div
      id="cosmic-background-wrapper"
      className="relative w-full min-h-screen bg-[#0d1527] text-slate-100 flex flex-col items-center justify-start overflow-x-hidden"
    >
      {/* 1. Core Ambient Radial Glow Centered Directly Behind the Card */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(37, 99, 235, 0.24) 0%, rgba(30, 64, 175, 0.16) 40%, rgba(15, 23, 42, 0.85) 75%, #0d1527 100%)',
        }}
      />

      {/* 2. Top Luminous Beam Glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 pointer-events-none z-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(59, 130, 246, 0.22) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 80%)',
          filter: 'blur(35px)',
        }}
      />

      {/* 3. Subtle Tech Micro-Grid Layer with Radial Vignette Fade */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          backgroundPosition: '0 0',
          maskImage: 'radial-gradient(circle at 50% 45%, black 50%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 45%, black 50%, transparent 85%)',
        }}
      />

      {/* 4. Bottom Ambient Reflected Light (Softens the bottom area so it is not pitch black) */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-56 pointer-events-none z-0 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 50% 100%, rgba(37, 99, 235, 0.25) 0%, rgba(30, 58, 138, 0.15) 45%, transparent 75%)',
          filter: 'blur(45px)',
        }}
      />

      {/* Main Content Viewport Area - always starts at the top */}
      <div className="relative z-10 w-full max-w-md md:max-w-lg flex flex-col items-center justify-start px-3 sm:px-4 pt-3 sm:pt-6 pb-20">
        {children}
      </div>
    </div>
  );
};
