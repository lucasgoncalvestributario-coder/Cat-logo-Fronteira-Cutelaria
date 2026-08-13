import React from 'react';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { Knife } from '../types';
import { KnifeCard } from './KnifeCard';

interface FavoritesViewProps {
  favoriteKnives: Knife[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onClickKnife: (knife: Knife) => void;
  onExploreClick: () => void;
  onClearAll: () => void;
}

export function FavoritesView({
  favoriteKnives,
  onToggleFavorite,
  onClickKnife,
  onExploreClick,
  onClearAll,
}: FavoritesViewProps) {
  return (
    <div className="space-y-6 my-4 px-2">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-metallic-card border border-white/10 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#ff6b00]/15 border border-[#ff6b00]/30 text-[#ff6b00]">
            <Heart className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="font-serif-luxury text-xl sm:text-2xl font-bold text-white">Minhas Facas Favoritas</h2>
            <p className="text-xs text-zinc-400">
              {favoriteKnives.length} {favoriteKnives.length === 1 ? 'peça salva' : 'peças salvas'} no seu aplicativo
            </p>
          </div>
        </div>

        {favoriteKnives.length > 0 && (
          <button
            onClick={onClearAll}
            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpar Lista</span>
          </button>
        )}
      </div>

      {/* Grid of Saved Knives */}
      {favoriteKnives.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {favoriteKnives.map((knife) => (
            <KnifeCard
              key={knife.id}
              knife={knife}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
              onClickCard={onClickKnife}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-10 rounded-3xl bg-metallic-card border border-white/10 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="font-serif-luxury text-lg font-bold text-white">Você ainda não possui favoritos</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Navegue pelo catálogo e toque no ícone de coração em qualquer faca para salvá-la nesta lista e consultar quando quiser.
          </p>
          <button
            onClick={onExploreClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#ff6b00]/20 hover:brightness-110 transition-all cursor-pointer"
          >
            <span>Explorar Catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
