import { Sword, Sparkles } from 'lucide-react';
import { ActiveTab } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  favoritesCount?: number;
  onOpenWhatsApp?: () => void;
}

export function BottomNav({ activeTab, onChangeTab }: BottomNavProps) {
  const navItems = [
    { id: 'catalog' as ActiveTab, label: 'CATÁLOGO', icon: Sword },
    { id: 'custom' as ActiveTab, label: 'EXCLUSIVA', icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0e1017]/95 backdrop-blur-xl border-t border-white/10 pb-safe shadow-2xl transition-all">
      <div className="max-w-md mx-auto px-4 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isExclusiva = item.id === 'custom';

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                isExclusiva
                  ? 'bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-amber-500/15 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)] animate-pulse text-amber-300'
                  : isActive
                  ? 'text-amber-400 scale-105'
                  : 'text-zinc-400 hover:text-zinc-200 active:scale-95'
              }`}
            >
              <div className="relative flex items-center gap-1">
                <Icon className={`w-5 h-5 transition-transform duration-300 ${isExclusiva ? 'text-amber-300 fill-amber-400/30' : isActive ? 'stroke-[2.5px] text-amber-400' : 'stroke-2'}`} />
                {isExclusiva && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
                )}
              </div>

              <span className={`text-[10px] mt-1 font-extrabold tracking-wider transition-colors uppercase ${isExclusiva ? 'text-amber-300 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]' : isActive ? 'text-amber-400' : 'text-zinc-400'}`}>
                {item.label}
              </span>

              {/* Active tab indicator glow */}
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
