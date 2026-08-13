import { Flame, Sparkles, ArrowRight, ShieldCheck, Award } from 'lucide-react';
import { StoreConfig } from '../types';

interface HeroBannerProps {
  config: StoreConfig;
  onExploreClick: () => void;
  onCustomClick: () => void;
}

export function HeroBanner({ config, onExploreClick, onCustomClick }: HeroBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-metallic-card my-3 sm:my-6 mx-2 sm:mx-0">
      {/* Background Forge Image Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1600"
          alt="Forja e Ferraria Artesanal"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-35 scale-105 filter brightness-75 hover:scale-100 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-[#0d0e12]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0e12] via-transparent to-[#0d0e12]/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col justify-end min-h-[360px] sm:min-h-[440px]">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#ff6b00]/15 border border-[#ff6b00]/30 text-[#ff8c00] text-xs font-semibold uppercase tracking-widest w-fit mb-4 backdrop-blur-md shadow-lg">
          <Flame className="w-4 h-4 text-[#ff6b00] animate-pulse" />
          <span>Cutelaria Custom Premium</span>
        </div>

        {/* Headline */}
        <h2 className="font-serif-luxury text-2xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight sm:leading-none mb-3 max-w-2xl drop-shadow-md">
          {config.heroHeadline || 'Forjadas no fogo.\nCriadas para durar gerações.'}
        </h2>

        {/* Subheadline */}
        <p className="text-zinc-300 text-sm sm:text-base max-w-xl mb-6 font-normal leading-relaxed">
          {config.heroSubheadline || 'Peças artesanais exclusivas forjadas em aços nobres com acabamento refinado e empunhaduras de madeira estabilizada.'}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onExploreClick}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#ff6b00]/25 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onCustomClick}
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm backdrop-blur-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#ff6b00]" />
            <span>Faca Personalizada</span>
          </button>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-8 pt-6 border-t border-white/10 text-center sm:text-left">
          <div className="flex items-center gap-2 text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-[#ff6b00] shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Garantia Vitalícia</p>
              <p className="text-[10px] text-zinc-400 hidden sm:block">Contra defeitos de fabricação</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-300">
            <Flame className="w-4 h-4 text-[#ff6b00] shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">Aço Forjado</p>
              <p className="text-[10px] text-zinc-400 hidden sm:block">Tratamento térmico de precisão</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-zinc-300">
            <Award className="w-4 h-4 text-[#ff6b00] shrink-0" />
            <div>
              <p className="text-xs font-bold text-white">100% Artesanal</p>
              <p className="text-[10px] text-zinc-400 hidden sm:block">Peças únicas e exclusivas</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
