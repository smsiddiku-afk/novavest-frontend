import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { robotAudio } from '../utils/robotAudio';

interface CleanRobotModalProps {
  isOpen: boolean;
}

export const RobotLoginModal: React.FC<CleanRobotModalProps> = ({ isOpen }) => {
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      return;
    }

    // Step 1: Start verification with robot sound and speech
    setIsSuccess(false);
    robotAudio.speak("Verifying credentials. Please wait.");

    // Step 2: At 1.3s, transition seamlessly to "Login Successful!" with happy chime
    const successTimer = setTimeout(() => {
      setIsSuccess(true);
      robotAudio.playSuccessBeeps();
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance("Login successful! Welcome back.");
          utterance.rate = 1.0;
          utterance.pitch = 1.1;
          window.speechSynthesis.speak(utterance);
        }
      } catch {
        // safe ignore
      }
    }, 1300);

    return () => {
      clearTimeout(successTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="robot-login-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300 select-none animate-in fade-in duration-200"
    >
      {/* Sleek, Modern Glass Card */}
      <div
        id="clean-robot-card"
        className={`relative w-full max-w-sm rounded-3xl p-7 text-center transition-all duration-500 flex flex-col items-center shadow-2xl border ${
          isSuccess
            ? 'bg-[#051816]/95 border-emerald-500/50 shadow-[0_0_60px_rgba(16,185,129,0.35)]'
            : 'bg-[#07132a]/95 border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.3)]'
        }`}
      >
        {/* Glowing Background Radial Halo */}
        <div
          className={`absolute -top-10 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isSuccess ? 'bg-emerald-500/25' : 'bg-cyan-500/20'
          }`}
        />

        {/* Dynamic Robot Vector with Smooth Transitions */}
        <div className="relative my-3 w-32 h-32 flex items-center justify-center">
          {/* Pulsing Aura Circle */}
          <div
            className={`absolute w-28 h-28 rounded-full blur-xl transition-all duration-500 ${
              isSuccess ? 'bg-emerald-400/25 scale-110' : 'bg-cyan-400/20 animate-pulse'
            }`}
          />

          {/* Floating Robot Figure */}
          <div className="relative z-10 flex flex-col items-center animate-bounce duration-1000" style={{ animationDuration: '3s' }}>
            {/* Robot Head */}
            <div
              className={`relative w-24 h-20 rounded-2xl p-2 flex flex-col items-center justify-center transition-all duration-500 border-2 ${
                isSuccess
                  ? 'bg-gradient-to-b from-[#0f2922] via-[#061e18] to-[#041410] border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                  : 'bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#07132a] border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)]'
              }`}
            >
              {/* Antenna with Glowing Bulb */}
              <div
                className={`absolute -top-4 w-1.5 h-4 rounded-full flex flex-col items-center transition-colors ${
                  isSuccess ? 'bg-emerald-400' : 'bg-cyan-400'
                }`}
              >
                <div
                  className={`absolute -top-2 w-3.5 h-3.5 rounded-full border border-white transition-all ${
                    isSuccess
                      ? 'bg-emerald-300 shadow-[0_0_12px_#34d399]'
                      : 'bg-cyan-300 shadow-[0_0_10px_#38bdf8] animate-ping'
                  }`}
                />
              </div>

              {/* Robot Ears */}
              <div
                className={`absolute -left-2 top-6 w-2 h-5 rounded-l-md transition-colors ${
                  isSuccess ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
              />
              <div
                className={`absolute -right-2 top-6 w-2 h-5 rounded-r-md transition-colors ${
                  isSuccess ? 'bg-emerald-500' : 'bg-cyan-500'
                }`}
              />

              {/* Visor Screen */}
              <div className="w-full h-12 rounded-xl bg-[#020617] border border-slate-700/60 flex flex-col items-center justify-center px-2 py-1 relative overflow-hidden">
                {/* Subtle Screen Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(255,255,255,0.05)_51%)] bg-[length:100%_4px] pointer-events-none" />

                {/* Robot Eyes: Dynamic based on status */}
                <div className="flex items-center justify-center gap-4 mb-1 z-10">
                  {isSuccess ? (
                    // Happy Crescent / Smiling Eyes on Success ^ _ ^
                    <>
                      <div className="w-4 h-2 border-t-2.5 border-x-2.5 border-emerald-400 rounded-t-full shadow-[0_0_8px_#34d399] animate-pulse" />
                      <div className="w-4 h-2 border-t-2.5 border-x-2.5 border-emerald-400 rounded-t-full shadow-[0_0_8px_#34d399] animate-pulse" />
                    </>
                  ) : (
                    // Focused Glowing Eyes during Verification
                    <>
                      <div className="relative w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] flex items-center justify-center animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                      <div className="relative w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] flex items-center justify-center animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    </>
                  )}
                </div>

                {/* Mouth Line */}
                <div className="flex items-center justify-center gap-1 h-2.5 z-10">
                  {isSuccess ? (
                    <div className="w-6 h-1.5 border-b-2 border-emerald-400 rounded-b-full shadow-[0_0_6px_#34d399]" />
                  ) : (
                    <>
                      <span className="w-1 h-2 rounded-full bg-cyan-300 animate-pulse" />
                      <span className="w-1 h-3 rounded-full bg-cyan-400 animate-bounce" />
                      <span className="w-1 h-2 rounded-full bg-cyan-300 animate-pulse" />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Neck */}
            <div className="w-6 h-1.5 bg-slate-700 rounded-full my-0.5" />

            {/* Torso */}
            <div
              className={`w-16 h-6 rounded-t-xl border-t-2 border-x-2 flex items-center justify-center transition-colors ${
                isSuccess
                  ? 'bg-[#0f2922] border-emerald-500/50'
                  : 'bg-slate-800 border-cyan-500/40'
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shadow-md animate-pulse ${
                  isSuccess ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Clean, Impactful Animation Display (No extra clutter or unnecessary text) */}
        <div className="w-full mt-3 min-h-[90px] flex flex-col items-center justify-center">
          {isSuccess ? (
            <div className="flex flex-col items-center animate-in zoom-in-90 duration-300 space-y-1.5">
              {/* Success Icon Badge with Ripple */}
              <div className="relative flex items-center justify-center mb-1">
                <span className="absolute w-12 h-12 rounded-full bg-emerald-500/30 animate-ping" />
                <div className="relative w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-white tracking-wide">
                Login Successful!
              </h3>
              <p className="text-xs sm:text-sm text-emerald-300 font-medium">
                Welcome back to NVT • Nova Terra Energy
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2.5">
              {/* Subtle Scanning Spinner */}
              <div className="flex items-center gap-2 text-cyan-300 text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400" />
                </span>
                <span>Authenticating...</span>
              </div>

              {/* Sleek Progress Bar */}
              <div className="w-48 bg-slate-900/80 h-1.5 rounded-full overflow-hidden border border-slate-700/50">
                <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-white w-full animate-pulse" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
