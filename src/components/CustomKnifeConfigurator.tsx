import React from 'react';
import { Hammer, MessageCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { generateExclusiveKnifeWhatsAppLink } from '../lib/whatsapp';

interface CustomKnifeConfiguratorProps {
  whatsappNumber: string;
}

export function CustomKnifeConfigurator({ whatsappNumber }: CustomKnifeConfiguratorProps) {
  const whatsappUrl = generateExclusiveKnifeWhatsAppLink(whatsappNumber);

  return (
    <div className="my-8 max-w-4xl mx-auto px-2">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="faca-exclusiva-section relative rounded-3xl overflow-hidden border-2 border-[#ff6b00]/70 bg-gradient-to-b from-[#181a26] via-[#12141d] to-[#0d0e12] p-8 sm:p-12 shadow-[0_0_35px_rgba(255,107,0,0.35)] hover:shadow-[0_0_50px_rgba(255,107,0,0.5)] transition-all duration-300 text-center space-y-6"
      >
        {/* Subtle Metallic Sheen Sweep on Scroll */}
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-3xl">
          <motion.div
            initial={{ x: '-160%', opacity: 0 }}
            whileInView={{
              x: '180%',
              opacity: [0, 0.7, 0.7, 0],
            }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{
              duration: 1.5,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.15,
            }}
            className="w-[120%] h-[200%] -top-[50%] -left-[10%] absolute transform -rotate-25 bg-gradient-to-r from-transparent via-amber-200/20 via-white/30 to-transparent"
          />
        </div>

        {/* Soft Glow Ambient Aura */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#ff6b00]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Subtle Background Texture */}
        <div className="absolute inset-0 z-0 opacity-25 pointer-events-none mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1200"
            alt="Cutelaria Artesanal Forja"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e12] via-[#0d0e12]/85 to-transparent" />
        </div>

        <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#ff6b00]/20 border border-[#ff6b00]/50 text-amber-300 text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#ff6b00]/10">
            <Hammer className="w-4 h-4 text-[#ff6b00] animate-bounce" />
            <span>Fábrica Fronteira Cutelaria</span>
          </div>

          {/* Main Title */}
          <h2 className="font-serif-luxury text-2xl sm:text-4xl font-extrabold text-white tracking-wide uppercase drop-shadow-md">
            QUER UMA FACA EXCLUSIVA?
          </h2>

          {/* Subtitle */}
          <p className="text-zinc-200 text-sm sm:text-lg leading-relaxed font-medium max-w-xl mx-auto">
            Fale diretamente com nossa fábrica e solicite uma peça personalizada feita sob medida especialmente para você.
          </p>

          {/* Features Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold text-zinc-300">
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Aços Forjados Nobres</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1.5">
              <Hammer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Gravação Personalizada</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Garantia Vitalícia</span>
            </div>
          </div>

          {/* Call to Action Button with High Contrast */}
          <div className="pt-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-gradient-to-r from-[#25d366] via-[#22c55e] to-[#16a34a] text-zinc-950 font-black text-base sm:text-lg uppercase tracking-wider shadow-[0_0_30px_rgba(37,211,102,0.55)] hover:shadow-[0_0_45px_rgba(37,211,102,0.85)] border-2 border-emerald-300 hover:scale-[1.03] active:scale-95 transition-all duration-300 cursor-pointer group"
            >
              <MessageCircle className="w-6 h-6 fill-zinc-950 text-zinc-950 group-hover:rotate-12 transition-transform" />
              <span className="drop-shadow-sm">FAZER MINHA FACA EXCLUSIVA</span>
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}


