import React, { useEffect, useState, useRef } from 'react';
import { Knife } from '../types';

interface SplashScreenProps {
  knives?: Knife[];
  isFullySynced?: boolean;
  onFinished?: () => void;
}

export function SplashScreen({
  knives = [],
  onFinished,
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Iniciando forja do catálogo...');
  
  const knivesRef = useRef(knives);
  const onFinishedRef = useRef(onFinished);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    knivesRef.current = knives;
  }, [knives]);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  // Preload knife images in background so they are ready instantly
  useEffect(() => {
    if (Array.isArray(knives) && knives.length > 0) {
      const toPreload = knives.slice(0, 20);
      toPreload.forEach((k) => {
        const url = (k.images && k.images[0]) || (k as any).imageUrl;
        if (url && typeof url === 'string' && url.startsWith('http')) {
          const img = new Image();
          img.src = url;
        }
      });
    }
  }, [knives]);

  // 12-Second Smooth Progress Timer (Runs ONCE on mount, uninterrupted)
  useEffect(() => {
    const TOTAL_DURATION_MS = 12000; // 12 seconds
    const INTERVAL_MS = 50; // 50ms updates
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.floor((elapsed / TOTAL_DURATION_MS) * 100), 100);
      setProgress(pct);

      if (elapsed < 2000) {
        setStatusText('Iniciando forja do catálogo...');
      } else if (elapsed < 4500) {
        setStatusText('Conectando ao acervo de peças...');
      } else if (elapsed < 7000) {
        const count = knivesRef.current.length;
        setStatusText(count > 0 ? `Sincronizando ${count} modelos artesanais...` : 'Sincronizando facas e modelos...');
      } else if (elapsed < 9500) {
        setStatusText('Carregando lâminas e detalhes em alta definição...');
      } else if (elapsed < 11500) {
        setStatusText('Organizando estoque e categorias...');
      } else {
        setStatusText('Catálogo pronto! Abrindo...');
      }

      if (elapsed >= TOTAL_DURATION_MS) {
        clearInterval(interval);
        if (!isFinishedRef.current) {
          isFinishedRef.current = true;
          setProgress(100);
          setStatusText('Catálogo pronto! Abrindo...');
          
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(() => {
              setIsVisible(false);
              if (onFinishedRef.current) onFinishedRef.current();
            }, 600);
          }, 300);
        }
      }
    }, INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] w-screen h-screen bg-black flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-opacity duration-700 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#000000' }}
    >
      {/* Pure Black Canvas with subtle center glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/25 via-[#000000] to-[#000000] pointer-events-none" />

      {/* Subtle forge embers */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
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
            className="w-full h-full drop-shadow-[0_0_18px_rgba(255,107,0,0.45)]"
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
          <div className="w-52 sm:w-64 h-[3px] bg-zinc-900 rounded-full mx-auto overflow-hidden relative border border-white/10 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#ff4500] via-[#ff7f11] to-[#ffe4b5] transition-all duration-100 ease-linear shadow-[0_0_12px_#ff6b00]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic Status Typography with Percentage */}
          <div className="space-y-1">
            <p
              key={statusText}
              className="text-xs font-semibold tracking-[0.18em] uppercase transition-all duration-300 text-zinc-300 min-h-[20px] flex items-center justify-center px-2"
            >
              {statusText}
            </p>
            <p className="text-[11px] font-mono text-amber-500/80 font-bold">
              {progress}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
