import React, { useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { FilterState, Knife } from '../types';
import { isSameCategory, getAllCategories } from '../lib/categories';

interface SearchAndFilterProps {
  filter: FilterState;
  onFilterChange: (updatedFilter: FilterState) => void;
  totalResults: number;
  knives?: Knife[];
}

export function SearchAndFilter({ filter, onFilterChange, totalResults, knives = [] }: SearchAndFilterProps) {
  const [categoriesList, setCategoriesList] = React.useState<string[]>(() => getAllCategories());

  React.useEffect(() => {
    const refreshCategories = () => {
      setCategoriesList(getAllCategories());
    };

    window.addEventListener('categories_updated', refreshCategories);
    return () => window.removeEventListener('categories_updated', refreshCategories);
  }, []);

  // Sync when knives change as well
  React.useEffect(() => {
    setCategoriesList(getAllCategories());
  }, [knives]);

  // Calculate counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const visibleKnives = knives.filter((k) => !k.isHidden);

    counts['TODAS'] = visibleKnives.length;

    categoriesList.forEach((cat) => {
      if (cat === 'TODAS') return;
      counts[cat] = visibleKnives.filter((k) => isSameCategory(k.category, cat)).length;
    });

    return counts;
  }, [categoriesList, knives]);

  const handleCategorySelect = (cat: string) => {
    onFilterChange({
      ...filter,
      category: cat as any,
      searchQuery: '', // Clear search query when changing category so all knives in category appear
    });
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
          placeholder="Buscar faca por nome, código (ex: FC-001), aço ou categoria..."
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

      {/* Horizontal Category Pills Scroll Container */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {categoriesList.map((cat) => {
          const isSelected = isSameCategory(filter.category, cat);
          const count = categoryCounts[cat] ?? 0;
          const isExclusiva = cat.toUpperCase().includes('EXCLUSIV');

          return (
            <button
              key={cat}
              onClick={() => handleCategorySelect(cat)}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all duration-200 cursor-pointer uppercase flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white shadow-lg shadow-[#ff6b00]/25 scale-102 border border-[#ff8c00]/50'
                  : isExclusiva
                  ? 'bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.35)] animate-pulse'
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

      {/* Counter bar */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-0.5">
        <span className="font-medium text-zinc-300">
          Categoria: <strong className="text-[#ff8c00]">{filter.category}</strong> ({totalResults}{' '}
          {totalResults === 1 ? 'modelo encontrado' : 'modelos encontrados'})
        </span>
        {filter.searchQuery && (
          <span className="text-zinc-400 italic">
            Filtrando por: &quot;{filter.searchQuery}&quot;
          </span>
        )}
      </div>
    </div>
  );
}



