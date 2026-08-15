import React, { useMemo, useRef, useState, useEffect, memo } from 'react';
import { Search, X, ChevronRight, ChevronLeft, LayoutGrid, Layers } from 'lucide-react';
import { FilterState, Knife } from '../types';
import { isSameCategory, getAllCategories } from '../lib/categories';

interface SearchAndFilterProps {
  filter: FilterState;
  onFilterChange: (updatedFilter: FilterState) => void;
  totalResults: number;
  knives?: Knife[];
}

export const SearchAndFilter = memo(function SearchAndFilter({
  filter,
  onFilterChange,
  totalResults,
  knives = [],
}: SearchAndFilterProps) {
  const [categoriesList, setCategoriesList] = React.useState<string[]>(() => getAllCategories(knives));
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isGridModalOpen, setIsGridModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const refreshCategories = () => {
      setCategoriesList(getAllCategories(knives));
    };

    window.addEventListener('categories_updated', refreshCategories);
    return () => window.removeEventListener('categories_updated', refreshCategories);
  }, [knives]);

  // Mouse Drag to Scroll for horizontal category strip (Desktop & Trackpad swipe)
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasMovedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftStartRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasMovedRef.current = true;
    }
    scrollContainerRef.current.scrollLeft = scrollLeftStartRef.current - walk;
    checkScroll();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  // Touch swipe to dismiss for modal bottom sheet on mobile
  const touchStartYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const handleTouchStartSheet = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMoveSheet = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartYRef.current;
    if (diff > 0) {
      setDragOffset(diff);
    }
  };

  const handleTouchEndSheet = () => {
    if (dragOffset > 100) {
      setIsGridModalOpen(false);
    }
    setDragOffset(0);
    touchStartYRef.current = null;
  };

  // Fast single-pass category count calculation (O(N) instead of O(N * C))
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { TODAS: 0 };
    categoriesList.forEach((c) => {
      if (c !== 'TODAS') counts[c] = 0;
    });

    for (let i = 0; i < knives.length; i++) {
      const k = knives[i];
      if (k.isHidden) continue;
      counts['TODAS'] = (counts['TODAS'] || 0) + 1;

      for (let j = 0; j < categoriesList.length; j++) {
        const cat = categoriesList[j];
        if (cat !== 'TODAS' && isSameCategory(k.category, cat)) {
          counts[cat] = (counts[cat] || 0) + 1;
        }
      }
    }

    return counts;
  }, [categoriesList, knives]);

  // Check scroll position to display left/right indicators
  const checkScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 15);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [categoriesList]);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (cat: string) => {
    onFilterChange({
      ...filter,
      category: cat as any,
      searchQuery: '',
    });
    setIsGridModalOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filter,
      searchQuery: e.target.value,
    });
  };

  const handleClearSearch = () => {
    onFilterChange({
      ...filter,
      searchQuery: '',
    });
  };

  return (
    <div className="space-y-3 my-4">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-500/70">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={filter.searchQuery}
          onChange={handleSearchChange}
          placeholder="Buscar por nome, código (ex: FC-001), aço..."
          className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#13151f] border border-white/10 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00] transition-all shadow-inner"
        />
        {filter.searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categories Header with "Ver Todas" Button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold tracking-wider uppercase">
          <Layers className="w-3.5 h-3.5 text-[#ff6b00]" />
          <span>Categorias ({categoriesList.length})</span>
        </div>

        <button
          id="btn-ver-todas-categorias"
          onClick={() => setIsGridModalOpen(true)}
          className="relative group overflow-hidden flex items-center gap-1.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 px-3 sm:px-3.5 py-1.5 rounded-xl border border-yellow-200 shadow-[0_0_18px_rgba(245,158,11,0.65)] hover:shadow-[0_0_24px_rgba(245,158,11,0.9)] transition-all duration-200 cursor-pointer animate-pulse active:scale-95"
        >
          {/* Animated Light Sweep Effect */}
          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          
          <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black/30 shrink-0" />
          <span className="relative z-10 font-extrabold drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)]">
            Ver Todas Categorias
          </span>
          <span className="relative z-10 w-2 h-2 rounded-full bg-red-600 border border-white animate-ping ml-0.5" />
        </button>
      </div>

      {/* Horizontal Category Carousel Container with Visual Cues & Scroll Buttons */}
      <div className="relative group">
        {/* Left Scroll Button / Gradient Mask */}
        {canScrollLeft && (
          <div className="absolute left-0 inset-y-0 z-20 flex items-center pr-2 bg-gradient-to-r from-[#000000] via-[#000000]/80 to-transparent pointer-events-none">
            <button
              onClick={scrollLeft}
              className="pointer-events-auto p-1.5 rounded-full bg-[#1c1f2b] text-white hover:bg-[#ff6b00] border border-white/10 shadow-lg shadow-black/80 transition-all cursor-pointer -ml-1"
              title="Rolar para a esquerda"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Scrollable & Drag-Swipeable Pill Strip */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth select-none cursor-grab active:cursor-grabbing touch-pan-x overscroll-x-contain"
        >
          {categoriesList.map((cat) => {
            const isSelected = isSameCategory(filter.category, cat);
            const count = categoryCounts[cat] ?? 0;
            const isExclusiva = cat.toUpperCase().includes('EXCLUSIV');

            return (
              <button
                key={cat}
                onClick={(e) => {
                  if (hasMovedRef.current) {
                    e.preventDefault();
                    return;
                  }
                  handleCategorySelect(cat);
                }}
                className={`shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all duration-150 cursor-pointer uppercase flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white shadow-lg shadow-[#ff6b00]/25 scale-102 border border-[#ff8c00]/50'
                    : isExclusiva
                    ? 'bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                    : 'bg-[#161822] hover:bg-[#202332] text-zinc-300 border border-white/10'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : isExclusiva ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-zinc-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button / Hint Gradient Mask */}
        {canScrollRight && (
          <div className="absolute right-0 inset-y-0 z-20 flex items-center pl-2 bg-gradient-to-l from-[#000000] via-[#000000]/80 to-transparent pointer-events-none">
            <button
              onClick={scrollRight}
              className="pointer-events-auto p-1.5 rounded-full bg-[#1c1f2b] text-white hover:bg-[#ff6b00] border border-white/10 shadow-lg shadow-black/80 transition-all cursor-pointer -mr-1"
              title="Rolar para a direita"
            >
              <ChevronRight className="w-4 h-4 text-[#ff6b00]" />
            </button>
          </div>
        )}
      </div>

      {/* Category Info */}
      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-0.5">
        <span className="font-medium text-zinc-300 truncate mr-2">
          Categoria: <strong className="text-[#ff8c00]">{filter.category}</strong> ({totalResults}{' '}
          {totalResults === 1 ? 'modelo' : 'modelos'})
        </span>
        {filter.searchQuery && (
          <span className="text-zinc-400 italic text-[10px]">
            Filtrando por: &quot;{filter.searchQuery}&quot;
          </span>
        )}
      </div>

      {/* Full Modal Bottom Sheet */}
      {isGridModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 animate-fadeIn"
          onClick={() => setIsGridModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#0e1017] border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[88vh] flex flex-col transition-transform duration-150"
            style={{
              transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStartSheet}
            onTouchMove={handleTouchMoveSheet}
            onTouchEnd={handleTouchEndSheet}
          >
            {/* Mobile Swipe-to-Dismiss Pill Handle */}
            <div className="w-12 h-1.5 bg-zinc-600/70 hover:bg-zinc-500 rounded-full mx-auto mb-3 sm:hidden cursor-grab active:cursor-grabbing" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-[#ff6b00]" />
                <h3 className="font-serif text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Todas as Categorias
                </h3>
              </div>
              <button
                onClick={() => setIsGridModalOpen(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-3">
              Selecione uma categoria para filtrar o catálogo:
            </p>

            {/* Grid of Categories with Quantities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto overscroll-contain touch-pan-y max-h-[60vh] pr-1 pb-2 scroll-smooth">
              {categoriesList.map((cat) => {
                const isSelected = isSameCategory(filter.category, cat);
                const count = categoryCounts[cat] ?? 0;
                const isExclusiva = cat.toUpperCase().includes('EXCLUSIV');

                return (
                  <button
                    key={cat}
                    onClick={() => handleCategorySelect(cat)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer select-none active:scale-98 ${
                      isSelected
                        ? 'bg-[#ff6b00] text-white border-[#ff8c00] shadow-md shadow-[#ff6b00]/30 font-bold'
                        : isExclusiva
                        ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-500/40'
                        : 'bg-[#151722] hover:bg-[#1f2233] text-zinc-200 border-white/5'
                    }`}
                  >
                    <span className="text-xs uppercase font-semibold tracking-wider truncate mr-2">
                      {cat}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-mono shrink-0 font-bold ${
                        isSelected
                          ? 'bg-black/30 text-white'
                          : isExclusiva
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {count} {count === 1 ? 'faca' : 'facas'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsGridModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
