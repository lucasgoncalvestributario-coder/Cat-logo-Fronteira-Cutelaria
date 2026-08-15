import React, { useEffect, useState } from 'react';
import { Knife } from '../types';

interface SplashScreenProps {
  knives: Knife[];
  isFullySynced: boolean;
  onFinished?: () => void;
  minDurationMs?: number;
  maxDurationMs?: number;
}

type LoadingStage = 'init' | 'products' | 'images' | 'organizing' | 'ready';

export function SplashScreen({
  knives,
  isFullySynced,
  onFinished,
  minDurationMs = 800,
  maxDurationMs = 7000,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stage, setStage] = useState<LoadingStage>('init');
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Preparando o catálogo...');

  // State pipeline management - strictly waits for full database sync
  useEffect(() => {
    let isCancelled = false;

    const runPipeline = async () => {
      // Step 1: Initial state
      setStage('init');
      setStatusText('Preparando o catálogo...');
      setProgress(20);

      // Step 2: Strictly wait until Firestore confirms ALL knives from the database are loaded
      setStage('products');
      setStatusText('Buscando todas as facas no banco de dados...');
      setProgress(40);

      // Wait until full synchronization is confirmed (or safety timeout)
      await new Promise<void>((resolve) => {
        if (isFullySynced) return resolve();
        const checkInterval = setInterval(() => {
          if (isFullySynced || isCancelled) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 60);
      });

      if (isCancelled) return;

      // Update progress with live knife count
      const totalCount = knives.length;
      setStatusText(`Sincronizando ${totalCount > 0 ? totalCount : ''} produtos...`);
      setProgress(60);

      await new Promise((r) => setTimeout(r, 200));
      if (isCancelled) return;

      // Step 3: Preparing images (warm up the top 6 visible knife thumbnails)
      setStage('images');
      setStatusText('Preparando imagens...');
      setProgress(80);

      if (knives && knives.length > 0) {
        const topImageUrls = knives
          .slice(0, 6)
          .map((k) => k.images?.[0])
          .filter((url): url is string => Boolean(url));

        if (topImageUrls.length > 0) {
          await Promise.race([
            Promise.allSettled(
              topImageUrls.map(
                (url) =>
                  new Promise<void>((resolve) => {
                    const img = new Image();
                    img.src = url;
                    if (img.complete) return resolve();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                  })
              )
            ),
            new Promise((r) => setTimeout(r, 700)),
          ]);
        }
      }

      if (isCancelled) return;

      // Step 4: Organizing catalog layout
      setStage('organizing');
      setStatusText(totalCount > 0 ? `Organizando ${totalCount} facas...` : 'Organizando catálogo...');
      setProgress(95);

      await new Promise((r) => setTimeout(r, 220));
      if (isCancelled) return;

      // Step 5: Catalog fully ready with all knives
      setStage('ready');
      setStatusText(totalCount > 0 ? `Catálogo pronto (${totalCount} facas).` : 'Catálogo pronto.');
      setProgress(100);

      // Brief pause to let user see "Catálogo pronto." then smooth fade out
      await new Promise((r) => setTimeout(r, 380));
      if (isCancelled) return;

      setIsFadingOut(true);

      setTimeout(() => {
        if (!isCancelled) {
          setIsVisible(false);
          if (onFinished) onFinished();
        }
      }, 450);
    };

    runPipeline();

    // Absolute fallback safety timer
    const absoluteSafety = setTimeout(() => {
      if (!isCancelled) {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          if (onFinished) onFinished();
        }, 450);
      }
    }, maxDurationMs);

    return () => {
      isCancelled = true;
      clearTimeout(absoluteSafety);
    };
  }, [isFullySynced, knives, maxDurationMs, onFinished]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#030406] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Deep dark steel radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/15 via-[#040508] to-[#010203] pointer-events-none" />

      {/* Subtle forge embers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute w-1 h-1 bg-[#ff7f11] rounded-full animate-ping top-1/3 left-1/4 shadow-[0_0_10px_#ff6b00]" />
        <div className="absolute w-1.5 h-1.5 bg-[#ff4500] rounded-full animate-pulse top-2/3 right-1/3 shadow-[0_0_12px_#ff4500]" />
        <div className="absolute w-1 h-1 bg-amber-200 rounded-full animate-ping top-1/2 right-1/4 shadow-[0_0_8px_#f59e0b]" />
      </div>

      {/* Minimalist Presentation Box */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full mx-auto space-y-8">
        {/* Minimalist Forged Knife Blade SVG Animation */}
        <div className="relative w-64 h-20 flex items-center justify-center">
          <svg
            viewBox="0 0 320 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-[0_0_15px_rgba(255,107,0,0.35)]"
          >
            <defs>
              <linearGradient id="bladeSteel" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="40%" stopColor="#71717a" />
                <stop offset="70%" stopColor="#d4d4d8" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              <linearGradient id="edgeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff4500" />
                <stop offset="60%" stopColor="#ff7f11" />
                <stop offset="100%" stopColor="#ffe4b5" />
              </linearGradient>

              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Silhouette of Custom Forged Blade Spine & Body */}
            <path
              d="M 25 50 L 70 48 C 120 46 210 44 260 52 C 278 55 292 62 300 68 C 285 76 250 82 190 82 C 120 82 60 76 25 72 Z"
              fill="#0d0e14"
              stroke="#27272a"
              strokeWidth="1.5"
            />

            {/* Damascus steel grain lines */}
            <path
              d="M 60 53 Q 120 50 180 56 Q 240 62 280 66"
              stroke="#3f3f46"
              strokeWidth="0.8"
              strokeDasharray="4 6"
              opacity="0.6"
            />
            <path
              d="M 50 62 Q 130 60 210 68 Q 250 72 270 73"
              stroke="#3f3f46"
              strokeWidth="0.8"
              strokeDasharray="5 7"
              opacity="0.5"
            />

            {/* Knife Bolster/Hilt Connection */}
            <rect x="18" y="46" width="9" height="30" rx="2" fill="#1c1917" stroke="#3f3f46" strokeWidth="1" />
            <line x1="22" y1="48" x2="22" y2="74" stroke="#ff7f11" strokeWidth="1.5" strokeOpacity="0.8" />

            {/* Ultra-Sharp Cutting Edge Path with Forge Light */}
            <path
              d="M 25 72 C 60 76 120 82 190 82 C 250 82 285 76 300 68"
              stroke="url(#edgeGlow)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#glow)"
              className="animate-pulse"
            />

            {/* Travelling Light Spark / Laser on the Edge */}
            <circle cx="25" cy="72" r="3.5" fill="#ffffff" filter="url(#glow)">
              <animateMotion
                path="M 0 0 C 35 4 95 10 165 10 C 225 10 260 4 275 -4"
                dur="1.8s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>

        {/* Minimalist Progress Track and Real Stage Status */}
        <div className="w-full space-y-3.5">
          {/* Razor-Thin Progress Line */}
          <div className="w-48 sm:w-56 h-[2px] bg-zinc-900/90 rounded-full mx-auto overflow-hidden relative border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-[#ff4500] via-[#ff7f11] to-[#ffe4b5] transition-all duration-300 ease-out shadow-[0_0_8px_#ff6b00]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic Status Typography */}
          <div className="h-5 flex items-center justify-center">
            <p
              key={statusText}
              className={`text-xs font-medium tracking-[0.2em] uppercase transition-all duration-200 ${
                stage === 'ready'
                  ? 'text-emerald-400 font-semibold drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                  : 'text-zinc-400'
              }`}
            >
              {statusText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
