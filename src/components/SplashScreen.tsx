import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface SplashScreenProps {
  onFinished?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinished, durationMs = 1800 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, durationMs - 500);

    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      if (onFinished) onFinished();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinished]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#07080a] flex flex-col items-center justify-center p-4 transition-opacity duration-500 select-none overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Dark forge metal texture background with subtle radial ember glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-[#07080a] to-[#040506] pointer-events-none" />

      {/* Sparks particles effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute w-1 h-1 bg-amber-400 rounded-full animate-ping top-1/3 left-1/4 shadow-[0_0_8px_#f59e0b]" />
        <div className="absolute w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse top-2/3 right-1/3 shadow-[0_0_10px_#ff4500]" />
        <div className="absolute w-1 h-1 bg-yellow-200 rounded-full animate-ping top-1/2 right-1/4 shadow-[0_0_6px_#ffeaad]" />
      </div>

      {/* Main Logo & Sheen Container */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-5 animate-fadeIn">
        {/* Animated Metallic Sheen Wrapper */}
        <div className="relative group">
          {/* Subtle forge ember glow behind logo */}
          <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-amber-600/30 via-orange-500/40 to-amber-600/30 blur-xl opacity-75 animate-pulse" />

          {/* Logo element */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 p-1 bg-[#0f1118] shadow-[0_0_30px_rgba(255,107,0,0.25)]">
            <Logo className="w-24 h-24 sm:w-32 sm:h-32" />

            {/* Metallic Shine Sweep effect */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[sheen_1.5s_ease-in-out_infinite] pointer-events-none"
              style={{
                animation: 'sheenSweep 1.6s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Brand Tagline */}
        <div className="space-y-1.5">
          <h2 className="font-serif-luxury text-sm sm:text-base font-extrabold tracking-[0.25em] text-amber-200 uppercase drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
            TRADIÇÃO MOLDADA NO AÇO
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent mx-auto rounded-full" />
        </div>
      </div>

      {/* Inline Keyframe Styles for Sheen Sweep */}
      <style>{`
        @keyframes sheenSweep {
          0% {
            transform: translateX(-100%) rotate(25deg);
          }
          100% {
            transform: translateX(200%) rotate(25deg);
          }
        }
      `}</style>
    </div>
  );
}
