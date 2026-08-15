import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinished?: () => void;
  durationMs?: number;
}

export function SplashScreen({ onFinished, durationMs = 1000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return !sessionStorage.getItem('cutelaria_splash_seen_v2');
      } catch (_) {
        return true;
      }
    }
    return true;
  });
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      if (onFinished) onFinished();
      return;
    }

    try {
      sessionStorage.setItem('cutelaria_splash_seen_v2', 'true');
    } catch (_) {}

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(durationMs - 350, 400));

    const finishTimer = setTimeout(() => {
      setIsVisible(false);
      if (onFinished) onFinished();
    }, durationMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, isVisible, onFinished]);

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

      {/* Main Presentation Container */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-6 animate-fadeIn max-w-sm sm:max-w-md mx-auto px-4">
        {/* Brand Name Typography */}
        <div className="space-y-3">
          <h1 className="font-serif-luxury text-3xl sm:text-4xl md:text-5xl font-black tracking-wider text-white uppercase drop-shadow-[0_4px_20px_rgba(245,158,11,0.35)]">
            FRONTEIRA CUTELARIA
          </h1>
          <p className="text-xs sm:text-sm text-[#ff6b00] font-extrabold tracking-[0.3em] uppercase">
            FACAS ARTESANAIS
          </p>
        </div>

        <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#ff6b00] to-transparent mx-auto rounded-full" />

        {/* Brand Tagline */}
        <div>
          <h2 className="font-serif-luxury text-xs sm:text-sm font-semibold tracking-[0.25em] text-zinc-300 uppercase">
            TRADIÇÃO MOLDADA NO AÇO
          </h2>
        </div>
      </div>
    </div>
  );
}
