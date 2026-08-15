import React, { useEffect, useState, useRef } from 'react';
import { Flame, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  isDataReady: boolean;
  knivesCount: number;
  onFinish: () => void;
}

export function SplashScreen({ isDataReady, knivesCount, onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Conectando ao acervo da forja...');
  const [isFadingOut, setIsFadingOut] = useState(false);

  const isFinishedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // Dynamic progress controller based on real data readiness
    const interval = setInterval(() => {
      if (isFinishedRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      const MIN_DISPLAY_MS = 1000; // Minimum 1s for smooth brand entry
      const MAX_SAFETY_MS = 6000; // Safety ceiling: never lock longer than 6s

      // If data is ready AND minimum time has elapsed, OR if safety ceiling reached:
      if ((isDataReady && elapsed >= MIN_DISPLAY_MS) || elapsed >= MAX_SAFETY_MS) {
        isFinishedRef.current = true;
        setProgress(100);
        setStatusText(
          knivesCount > 0
            ? `${knivesCount} peças artesanais prontas!`
            : 'Catálogo pronto! Abrindo...'
        );

        setTimeout(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            if (onFinishRef.current) {
              onFinishRef.current();
            }
          }, 450);
        }, 300);
        return;
      }

      // Smoothly advance progress while waiting for real data
      setProgress((prev) => {
        if (isDataReady) {
          return Math.min(prev + 12, 95);
        }
        if (prev < 45) return prev + 4;
        if (prev < 75) return prev + 2;
        if (prev < 90) return prev + 0.8;
        return prev;
      });

      // Contextual status text based on real knife count arrival
      if (knivesCount > 0) {
        setStatusText(`Carregando ${knivesCount} facas artesanais...`);
      } else if (elapsed > 2000) {
        setStatusText('Sincronizando catálogo com a nuvem...');
      } else {
        setStatusText('Conectando ao acervo da forja...');
      }
    }, 60);

    return () => clearInterval(interval);
  }, [isDataReady, knivesCount]);

  return (
    <div
      id="catalog-splash-screen"
      className={`fixed inset-0 z-[99999] w-screen h-screen bg-[#050608] flex flex-col items-center justify-center p-6 select-none overflow-hidden transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#050608' }}
    >
      {/* Subtle Forge Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/25 via-[#050608] to-[#050608] pointer-events-none" />

      {/* Floating Ember Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute w-1.5 h-1.5 rounded-full bg-[#ff6b00] top-1/4 left-1/5 animate-pulse blur-[0.5px]" />
        <div className="absolute w-2 h-2 rounded-full bg-amber-500 top-2/3 right-1/4 animate-ping opacity-20" />
        <div className="absolute w-1 h-1 rounded-full bg-amber-400 bottom-1/3 left-1/3 animate-pulse" />
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-sm w-full text-center">
        {/* Brand Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-zinc-800/90 to-zinc-950 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-950/40 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent" />
            <Flame className="w-10 h-10 sm:w-12 sm:h-12 text-amber-500 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
          </div>
        </div>

        {/* Brand Titles */}
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 tracking-wider uppercase mb-1">
          Fronteira Cutelaria
        </h1>
        <p className="text-[11px] sm:text-xs text-zinc-400 tracking-widest uppercase mb-6 font-medium">
          Cutelaria Artesanal de Excelência
        </p>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-zinc-900/90 rounded-full h-2 p-0.5 border border-white/10 mb-3 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-amber-600 via-amber-400 to-[#ff6b00] h-full rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            style={{ width: `${Math.max(5, Math.min(progress, 100))}%` }}
          />
        </div>

        {/* Progress & Real Count Indicator */}
        <div className="flex items-center justify-between w-full px-1 mb-3 text-[11px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '3s' }} />
            {statusText}
          </span>
          <span className="font-semibold text-amber-400">
            {Math.round(Math.min(progress, 100))}%
          </span>
        </div>

        {/* Live Items Count Badge when detected */}
        {knivesCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-500/20 text-[11px] text-amber-300 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{knivesCount} modelos sincronizados</span>
          </div>
        )}
      </div>
    </div>
  );
}
