import { Lock, Smartphone } from 'lucide-react';
import { StoreConfig } from '../types';
import { Logo } from './Logo';

interface HeaderProps {
  config: StoreConfig;
  onOpenAdmin: () => void;
  onOpenInstallModal?: () => void;
  isInstallable?: boolean;
}

export function Header({ config, onOpenAdmin, onOpenInstallModal }: HeaderProps) {
  const storeTitle = config.storeName || 'FRONTEIRA CUTELARIA';

  return (
    <header className="sticky top-0 z-40 bg-[#0d0e12]/95 backdrop-blur-md border-b border-white/10 py-3 px-4 shadow-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Official Logo & Store Name */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <Logo className="w-14 h-14 sm:w-20 sm:h-20 shrink-0" />
          <div>
            <h1 className="font-serif-luxury text-base sm:text-2xl font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
              {storeTitle}
            </h1>
            <p className="text-[10px] sm:text-sm text-[#ff6b00] font-bold tracking-widest uppercase">
              facas artesanais
            </p>
          </div>
        </div>

        {/* Action Buttons: Install App + Admin */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] hover:brightness-110 text-white border border-amber-500/30 transition-all cursor-pointer shadow-lg shadow-[#ff6b00]/20 active:scale-95 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
              title="Instalar o aplicativo da Fronteira Cutelaria no celular"
            >
              <Smartphone className="w-4 h-4 text-white shrink-0 animate-pulse" />
              <span>Instalar App</span>
            </button>
          )}

          <button
            onClick={onOpenAdmin}
            className="p-2 sm:p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white border border-white/10 transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
            title="Acesso Administrativo"
          >
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
}


