import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { generateGeneralWhatsAppLink } from '../lib/whatsapp';

interface FloatingWhatsAppProps {
  whatsappNumber: string;
}

export function FloatingWhatsApp({ whatsappNumber }: FloatingWhatsAppProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMsg, setCustomMsg] = useState('Olá! Gostaria de mais informações sobre o catálogo de facas artesanais.');

  const handleSendMessage = () => {
    const link = generateGeneralWhatsAppLink(customMsg, whatsappNumber);
    window.open(link, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end">
      {/* Quick Chat Popover */}
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 rounded-2xl bg-[#12141c] border border-emerald-500/30 p-4 shadow-2xl animate-scaleUp space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white">Cutelaria no WhatsApp</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-300">
            Fale diretamente com nosso mestre cuteleiro para tirar dúvidas ou fazer encomendas.
          </p>

          <textarea
            rows={2}
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handleSendMessage}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>INICIAR CONVERSA</span>
          </button>
        </div>
      )}

      {/* Trigger Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3.5 sm:p-4 rounded-full bg-emerald-500 text-white shadow-2xl hover:bg-emerald-400 active:scale-90 transition-all duration-300 group cursor-pointer"
        title="Falar no WhatsApp"
      >
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#ff6b00] border-2 border-[#0d0e12] animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#ff6b00] border-2 border-[#0d0e12]" />
        <MessageCircle className="w-6 h-6 fill-current" />
      </button>
    </div>
  );
}
