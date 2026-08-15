import React, { useState, memo } from 'react';
import { Sparkles, Flame, Eye, Image as ImageIcon } from 'lucide-react';
import { Knife } from '../types';
import { formatCurrencyBRL } from '../lib/whatsapp';

export interface KnifeCardProps {
  knife: Knife;
  index?: number;
  onClickCard: (knife: Knife) => void;
}

export const KnifeCard = memo(function KnifeCard({ knife, index = 0, onClickCard }: KnifeCardProps) {
  const mainImage = knife.images && knife.images.length > 0 ? knife.images[0] : '';
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  const isSoldOut = knife.isOutofStock || knife.status === 'esgotado' || (typeof knife.quantity === 'number' && knife.quantity <= 0);
  const isExclusive = Boolean(
    knife.isFeatured ||
    knife.isLaunch ||
    (knife.category && String(knife.category).toUpperCase().includes('EXCLUSIV'))
  );
  const isLastUnit = !isSoldOut && typeof knife.quantity === 'number' && knife.quantity === 1;
  const isOnSale = Boolean(knife.isOnSale && knife.originalPrice && Number(knife.originalPrice) > Number(knife.price));

  // Top 4 cards are eager; others are lazy
  const isTopPriority = index < 4;

  return (
    <div
      onClick={() => onClickCard(knife)}
      className={`group relative bg-[#12141d] rounded-xl sm:rounded-2xl border ${
        isExclusive
          ? 'border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.08)]'
          : 'border-white/10 shadow-md'
      } overflow-hidden transition-transform duration-200 active:scale-[0.98] sm:hover:-translate-y-1 sm:hover:border-[#ff6b00]/60 sm:hover:shadow-xl sm:hover:shadow-[#ff6b00]/15 flex flex-col cursor-pointer ${
        isSoldOut ? 'opacity-75' : ''
      }`}
      style={{
        transform: 'translateZ(0)',
        contain: 'paint layout',
      }}
    >
      {/* Knife Photo Container */}
      <div className="relative aspect-[4/3] w-full bg-[#0a0b0e] overflow-hidden flex items-center justify-center">
        {/* Placeholder Skeleton until image is loaded */}
        {mainImage && !isImageLoaded && (
          <div className="absolute inset-0 bg-[#0d0e14] flex items-center justify-center overflow-hidden">
            <div className="w-full h-full animate-pulse bg-gradient-to-r from-[#0d0e14] via-[#161824] to-[#0d0e14]" />
            <div className="absolute inset-0 flex items-center justify-center opacity-25">
              <span className="font-serif text-[10px] tracking-widest text-amber-500 uppercase">Fronteira</span>
            </div>
          </div>
        )}

        {mainImage ? (
          <img
            src={mainImage}
            alt={knife.name}
            loading={isTopPriority ? 'eager' : 'lazy'}
            decoding="async"
            // @ts-ignore
            fetchPriority={isTopPriority ? 'high' : 'auto'}
            referrerPolicy="no-referrer"
            onLoad={() => setIsImageLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-250 group-hover:scale-105 ${
              !isImageLoaded ? 'opacity-0' : isSoldOut ? 'opacity-75 blur-[2px] grayscale contrast-110' : 'opacity-95'
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 gap-1.5 p-4">
            <ImageIcon className="w-8 h-8 opacity-40" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">Sem Foto</span>
          </div>
        )}

        {/* Steel Reflection Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12141d] via-transparent to-black/30 pointer-events-none" />

        {/* ESGOTADO Badge */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/45 flex items-center justify-center p-1.5 z-10">
            <span className="px-3 py-1 sm:px-4 sm:py-1.5 bg-red-600 text-white font-extrabold text-xs sm:text-sm tracking-widest uppercase rounded-xl border-2 border-red-400 shadow-2xl drop-shadow-lg">
              ESGOTADO
            </span>
          </div>
        )}

        {/* Category Pill (Top Left) */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md border border-white/10 text-[8px] sm:text-[9.5px] font-bold text-amber-400 uppercase tracking-wider z-10">
          {knife.category}
        </div>

        {/* Badges (Top Right) */}
        {!isSoldOut && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex flex-col gap-1 items-end z-10">
            {isOnSale && (
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-gradient-to-r from-red-600 to-orange-600 text-white font-black text-[8px] sm:text-[9px] uppercase tracking-wider rounded-md shadow-md flex items-center gap-0.5 border border-red-400">
                <Flame className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                <span>PROMOÇÃO</span>
              </span>
            )}
            {isExclusive && !isOnSale && (
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[7.5px] sm:text-[8.5px] uppercase tracking-wider rounded-md shadow-md flex items-center gap-0.5 border border-amber-200">
                <Sparkles className="w-2.5 h-2.5 fill-black text-black shrink-0" />
                <span>EXCLUSIVA</span>
              </span>
            )}
            {isLastUnit && (
              <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-extrabold text-[7.5px] sm:text-[8.5px] uppercase tracking-wider rounded-md shadow-md flex items-center gap-0.5 border border-orange-400">
                <Flame className="w-2.5 h-2.5 fill-amber-300 text-amber-300 shrink-0" />
                <span>ÚLTIMA UNIDADE</span>
              </span>
            )}
          </div>
        )}

        {/* Hover hint */}
        <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-1.5 text-white font-bold text-xs uppercase tracking-wider z-10">
          <Eye className="w-4 h-4 text-[#ff6b00]" />
          <span>Ver Detalhes</span>
        </div>
      </div>

      {/* Product Information Body */}
      <div className="p-2 sm:p-3.5 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-2 relative z-10">
        <div>
          {/* Code */}
          <div className="text-[9px] sm:text-[10px] font-mono font-semibold text-amber-500/90 tracking-wider mb-0.5">
            CÓD: {knife.code}
          </div>

          {/* Name */}
          <h3 className="font-serif text-[11px] sm:text-base font-bold text-white group-hover:text-[#ff8c00] transition-colors line-clamp-2 leading-tight sm:leading-snug">
            {knife.name}
          </h3>
        </div>

        {/* Price Row */}
        <div className="pt-1.5 sm:pt-2 border-t border-white/10 flex items-end justify-between">
          <div>
            <span className="text-[8px] sm:text-[9.5px] uppercase tracking-wider text-zinc-400 font-semibold block">
              {isOnSale ? 'Oferta' : 'Valor'}
            </span>
            {isOnSale && knife.originalPrice && (
              <span className="text-[9px] sm:text-xs text-zinc-500 line-through font-mono block">
                De {formatCurrencyBRL(knife.originalPrice)}
              </span>
            )}
          </div>

          <div className="text-right">
            {isOnSale && (
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase block font-mono">
                Por:
              </span>
            )}
            <span className="text-xs sm:text-lg font-extrabold text-amber-400 tracking-tight">
              {formatCurrencyBRL(knife.price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
