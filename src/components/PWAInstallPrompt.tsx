import { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';
import { Logo } from './Logo';

interface PWAInstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstalled: () => void;
}

export function PWAInstallPrompt({ isOpen, onClose, deferredPrompt, onInstalled }: PWAInstallPromptProps) {
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        onInstalled();
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#12141c] rounded-3xl border border-white/10 p-6 shadow-2xl space-y-5 animate-scaleUp">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-3">
          {/* Exact official logo of Fronteira Cutelaria */}
          <div className="flex justify-center">
            <Logo className="w-20 h-20" />
          </div>

          <h3 className="font-serif-luxury text-xl font-bold text-white">
            Instalar o App Fronteira Cutelaria
          </h3>

          <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
            Acesse o catálogo em modo aplicativo, em tela cheia e com acesso instantâneo.
          </p>
        </div>

        {/* Features Checklist */}
        <div className="space-y-2 bg-[#161822] p-4 rounded-2xl border border-white/5 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#ff6b00] shrink-0" />
            <span>Ícone oficial da Fronteira Cutelaria na tela inicial</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#ff6b00] shrink-0" />
            <span>Modo aplicativo nativo (Sem barra do navegador)</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#ff6b00] shrink-0" />
            <span>Navegação ultrafluida e rápida</span>
          </div>
        </div>

        {/* Android / Desktop Direct Install Button or Android Manual Steps */}
        {!isIOS && (
          <div className="space-y-3">
            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#ff6b00]/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Instalar App Agora</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2 text-left">
                <p className="font-bold flex items-center gap-1.5 text-amber-300">
                  <Smartphone className="w-4 h-4 text-[#ff6b00]" />
                  <span>Como instalar no Android:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-amber-100/90">
                  <li>Toque no menu do navegador <strong>(⋮)</strong>.</li>
                  <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à Tela inicial"</strong>.</li>
                  <li>Confirme a instalação para adicionar o ícone na sua tela inicial.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* iOS Safari Instructions */}
        {isIOS && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 space-y-2 text-left">
            <p className="font-bold flex items-center gap-1.5 text-amber-300">
              <Smartphone className="w-4 h-4 text-[#ff6b00]" />
              <span>Como adicionar à Tela de Início no iPhone (Safari):</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-amber-100/90">
              <li>
                Toque no ícone de <Share className="inline w-3.5 h-3.5 mx-0.5 text-amber-300" /> <strong>Compartilhar</strong> na barra inferior do Safari.
              </li>
              <li>
                Role a lista e selecione <PlusSquare className="inline w-3.5 h-3.5 mx-0.5 text-amber-300" /> <strong>Adicionar à Tela de Início</strong>.
              </li>
              <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
            </ol>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-center text-xs text-zinc-400 hover:text-zinc-200 font-medium transition-colors cursor-pointer"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
