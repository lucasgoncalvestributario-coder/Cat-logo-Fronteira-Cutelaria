import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';

interface ImageGalleryViewerProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  knifeTitle: string;
  whatsappUrl?: string;
}

export function ImageGalleryViewer({ images, initialIndex = 0, isOpen, onClose, knifeTitle, whatsappUrl }: ImageGalleryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (!isOpen || !images || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.5, 3.5));
  const handleZoomOut = () => {
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    handleResetZoom();
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    handleResetZoom();
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoomLevel === 1) {
      setTouchStartX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || zoomLevel > 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 40) {
      if (diffX > 0) {
        nextImage();
      } else {
        prevImage();
      }
    }
    setTouchStartX(null);
  };

  // Drag pan handlers when zoomed in
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-fadeIn select-none">
      {/* Top Header Bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between border-b border-white/10 bg-black/60 z-20">
        <div>
          <h3 className="font-serif-luxury text-sm sm:text-base font-bold text-white line-clamp-1">{knifeTitle}</h3>
          <p className="text-xs text-amber-400 font-mono">
            Foto {currentIndex + 1} de {images.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-zinc-300 hover:text-white rounded hover:bg-white/10 cursor-pointer"
              title="Aumentar Zoom"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-zinc-300 hover:text-white rounded hover:bg-white/10 cursor-pointer"
              title="Reduzir Zoom"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-zinc-300 hover:text-white rounded hover:bg-white/10 cursor-pointer"
              title="Restaurar Tamanho"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Fechar Galeria"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Display View */}
      <div
        className="relative flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={zoomLevel === 1 ? handleZoomIn : handleResetZoom}
      >
        <img
          src={currentImage}
          alt={`Visualização ${currentIndex + 1}`}
          referrerPolicy="no-referrer"
          decoding="async"
          className="max-h-[68vh] sm:max-h-[75vh] max-w-full object-contain transition-transform duration-200 ease-out rounded-lg shadow-2xl"
          style={{
            transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
          }}
        />

        {/* Previous Image Arrow */}
        {images.length > 1 && (
          <button
            onClick={prevImage}
            className="absolute left-2 sm:left-4 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer z-10"
            title="Foto Anterior"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        {/* Next Image Arrow */}
        {images.length > 1 && (
          <button
            onClick={nextImage}
            className="absolute right-2 sm:right-4 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer z-10"
            title="Próxima Foto"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Carousel Bar & WhatsApp CTA */}
      <div className="p-3 sm:p-4 bg-black/90 border-t border-white/10 flex flex-col items-center gap-2.5 z-20">
        {images.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar py-0.5">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  handleResetZoom();
                }}
                className={`relative shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  idx === currentIndex ? 'border-[#ff6b00] scale-105 shadow-lg shadow-[#ff6b00]/30' : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}

        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full max-w-md py-3 px-4 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] hover:brightness-110 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98"
          >
            <MessageCircle className="w-4 h-4 fill-white text-transparent" />
            <span>TENHO INTERESSE (CHAMAR NO WHATSAPP)</span>
          </a>
        )}
      </div>
    </div>
  );
}
