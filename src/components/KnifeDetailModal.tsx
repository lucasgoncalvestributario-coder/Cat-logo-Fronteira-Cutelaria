import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Maximize2, ChevronLeft, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Knife } from '../types';
import { generateKnifeWhatsAppLink, formatCurrencyBRL } from '../lib/whatsapp';
import { ImageGalleryViewer } from './ImageGalleryViewer';

interface KnifeDetailModalProps {
  knife: Knife | null;
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
}

export function KnifeDetailModal({
  knife,
  isOpen,
  onClose,
  whatsappNumber,
}: KnifeDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Reset image index when modal opens or knife changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setDirection(0);
  }, [knife?.id, isOpen]);

  if (!isOpen || !knife) return null;

  const isSoldOut = knife.isOutofStock || knife.status === 'esgotado' || (typeof knife.quantity === 'number' && knife.quantity <= 0);

  const images = knife.images && knife.images.length > 0
    ? knife.images
    : ['https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000'];

  const whatsappUrl = generateKnifeWhatsAppLink(knife, whatsappNumber);

  const goToNextImage = () => {
    setDirection(1);
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrevImage = () => {
    setDirection(-1);
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 35) {
      if (diffX > 0) {
        goToNextImage();
      } else {
        goToPrevImage();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : dir < 0 ? -100 : 0,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : dir > 0 ? -100 : 0,
      opacity: 0,
    }),
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
        <div className="relative w-full max-w-2xl bg-[#12141c] sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col my-auto">
          
          {/* Top Modal Header */}
          <div className="sticky top-0 z-30 flex items-start justify-between p-3.5 sm:p-5 bg-[#12141c]/95 border-b border-white/10 backdrop-blur-md shrink-0 gap-3">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-amber-500 uppercase font-bold tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  CÓD: {knife.code}
                </span>
                {knife.category && (
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {knife.category}
                  </span>
                )}
              </div>
              {/* Full Title without truncation/cutting off */}
              <h2 className="font-serif-luxury text-base sm:text-xl font-extrabold text-white leading-snug break-words">
                {knife.name}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="overflow-y-auto p-4 sm:p-6 space-y-4 flex-1">
            
            {/* Smooth Animated Image Slider / Carousel */}
            <div className="space-y-2.5">
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="relative aspect-square sm:aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[#0a0b0e] border border-white/10 shadow-2xl group touch-pan-y"
              >
                <AnimatePresence initial={false} custom={direction} mode="wait">
                  <motion.img
                    key={selectedImageIndex}
                    src={images[selectedImageIndex]}
                    alt={`${knife.name} - Foto ${selectedImageIndex + 1}`}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
                    referrerPolicy="no-referrer"
                    onClick={() => setIsGalleryOpen(true)}
                    className={`w-full h-full object-cover object-center cursor-pointer ${
                      isSoldOut ? 'opacity-75 blur-[2.5px] grayscale contrast-110' : 'opacity-95'
                    }`}
                  />
                </AnimatePresence>

                {/* ESGOTADO Badge Overlay */}
                {isSoldOut && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2 z-20 pointer-events-none">
                    <span className="px-6 py-2.5 bg-red-600 text-white font-extrabold text-base sm:text-lg tracking-widest uppercase rounded-xl border-2 border-red-400 shadow-2xl drop-shadow-xl">
                      ESGOTADO
                    </span>
                  </div>
                )}

                {/* Image Counter Badge */}
                {images.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/15 text-[11px] font-mono font-bold text-white z-20">
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                )}

                {/* Navigation arrows for desktop/mobile tap */}
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPrevImage();
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/65 hover:bg-black/90 text-white border border-white/20 shadow-xl transition-all cursor-pointer z-20 active:scale-90"
                      title="Foto anterior"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextImage();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/65 hover:bg-black/90 text-white border border-white/20 shadow-xl transition-all cursor-pointer z-20 active:scale-90"
                      title="Próxima foto"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Expand Indicator */}
                <button 
                  onClick={() => setIsGalleryOpen(true)}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-black/80 hover:bg-[#ff6b00] text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg z-20 border border-white/10"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Ampliar</span>
                </button>

                {/* Pagination Dots Indicator */}
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setDirection(idx > selectedImageIndex ? 1 : -1);
                          setSelectedImageIndex(idx);
                        }}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === selectedImageIndex ? 'w-5 bg-[#ff6b00]' : 'w-1.5 bg-white/40 hover:bg-white/70'
                        }`}
                        title={`Ir para foto ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnails Horizontal Row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDirection(idx > selectedImageIndex ? 1 : -1);
                        setSelectedImageIndex(idx);
                      }}
                      className={`relative shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedImageIndex === idx ? 'border-[#ff6b00] scale-102 shadow-md shadow-[#ff6b00]/30' : 'border-white/10 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description Card (if present) */}
            {knife.description && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161822] border border-white/10 space-y-1.5">
                <span className="text-amber-400 block text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Descrição da Peça</span>
                </span>
                <p className="text-zinc-200 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                  {knife.description}
                </p>
              </div>
            )}

            {/* Detailed Characteristics & Specifications Grid */}
            <div className="p-4 rounded-2xl bg-[#161822] border border-white/10 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 border-b border-white/5 pb-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Especificações Técnicas</span>
              </h3>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Full Title Card */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 col-span-2">
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider mb-1">Modelo / Nome da Peça</span>
                  <strong className="text-white text-sm sm:text-base font-bold block leading-snug break-words">
                    {knife.name}
                  </strong>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Código</span>
                  <strong className="text-amber-400 font-mono font-bold">{knife.code}</strong>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Categoria</span>
                  <strong className="text-amber-300 uppercase font-bold">{knife.category}</strong>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Lâmina (Aço)</span>
                  <strong className="text-white font-bold">{knife.steelType || 'Aço Nobre'}</strong>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Material do Cabo</span>
                  <strong className="text-white font-bold">{knife.handleMaterial || 'Madeira Nobre'}</strong>
                </div>

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Tamanho da Lâmina</span>
                  <strong className="text-white font-bold">{knife.length || '8"'}</strong>
                </div>

                {knife.thickness && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Espessura</span>
                    <strong className="text-white font-bold">{knife.thickness}</strong>
                  </div>
                )}

                {knife.sheathType && (
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Bainha</span>
                    <strong className="text-white font-bold">{knife.sheathType}</strong>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-zinc-400 block text-[10px] uppercase tracking-wider mb-0.5">Status</span>
                  <strong className={`font-bold uppercase ${
                    isSoldOut 
                      ? 'text-red-400' 
                      : (typeof knife.quantity === 'number' && knife.quantity === 1)
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}>
                    {isSoldOut ? 'Esgotado' : (typeof knife.quantity === 'number' && knife.quantity === 1) ? 'Disponível (Última Unidade)' : 'Disponível'}
                  </strong>
                </div>
              </div>

              {/* Price Banner */}
              {knife.isOnSale && knife.originalPrice && Number(knife.originalPrice) > Number(knife.price) ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-amber-950/40 to-[#161822] border border-red-500/40 mt-2 shadow-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-red-600/90 text-white font-extrabold text-[10px] uppercase tracking-wider border border-red-400 flex items-center gap-1 shadow-md">
                      <span>🔥 PROMOÇÃO ESPECIAL</span>
                    </span>
                    <span className="text-xs text-zinc-400 line-through font-mono">
                      De: {formatCurrencyBRL(knife.originalPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider block">
                        Valor Promocional:
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        Economia de {formatCurrencyBRL(Number(knife.originalPrice) - Number(knife.price))}
                      </span>
                    </div>
                    <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                      {formatCurrencyBRL(knife.price)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/50 via-black to-black border border-amber-500/30 flex items-center justify-between mt-2 shadow-lg">
                  <span className="text-xs uppercase font-bold text-amber-400 tracking-wider">Investimento</span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-amber-400 tracking-tight">
                    {formatCurrencyBRL(knife.price)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Bottom Button: TENHO INTERESSE (CHAMAR NO WHATSAPP) */}
          <div className="p-3.5 sm:p-4 bg-[#12141c] border-t border-white/10 shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-[#25d366] to-[#128c7e] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl shadow-[#25d366]/20 transition-all cursor-pointer active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5 fill-white text-transparent shrink-0" />
              <span className="truncate">TENHO INTERESSE (CHAMAR NO WHATSAPP)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Gallery Viewer */}
      <ImageGalleryViewer
        images={images}
        initialIndex={selectedImageIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        knifeTitle={knife.name}
        whatsappUrl={whatsappUrl}
      />
    </>
  );
}


