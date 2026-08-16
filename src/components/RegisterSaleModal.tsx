import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Check, DollarSign, Tag, CreditCard, QrCode, Wallet, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Knife } from '../types';
import { PaymentMethod } from '../lib/salesStorage';
import { formatCurrencyBRL } from '../lib/whatsapp';

interface RegisterSaleModalProps {
  isOpen: boolean;
  knife: Knife | null;
  onClose: () => void;
  onConfirmSale: (
    knife: Knife,
    soldPrice: number,
    paymentMethod: PaymentMethod,
    note?: string
  ) => Promise<void>;
  onGoToSalesTab?: () => void;
}

export function RegisterSaleModal({
  isOpen,
  knife,
  onClose,
  onConfirmSale,
  onGoToSalesTab,
}: RegisterSaleModalProps) {
  const [soldPriceInput, setSoldPriceInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasDiscountApplied, setHasDiscountApplied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && knife) {
      const original = Number(knife.price) || 0;
      setSoldPriceInput(original.toString());
      setPaymentMethod('pix');
      setNote('');
      setHasDiscountApplied(false);
      setIsSubmitting(false);
    }
  }, [isOpen, knife]);

  if (!isOpen || !knife) return null;

  const originalPrice = Number(knife.price) || 0;
  const currentSoldPrice = parseFloat(soldPriceInput.replace(',', '.')) || 0;
  const discountAmount = Math.max(0, originalPrice - currentSoldPrice);
  const discountPercent = originalPrice > 0 ? ((discountAmount / originalPrice) * 100).toFixed(0) : '0';

  const applyDiscountPercent = (percent: number) => {
    const discounted = Math.round(originalPrice * (1 - percent / 100));
    setSoldPriceInput(discounted.toString());
    setHasDiscountApplied(true);
  };

  const resetToOriginalPrice = () => {
    setSoldPriceInput(originalPrice.toString());
    setHasDiscountApplied(false);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSoldPrice <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirmSale(knife, currentSoldPrice, paymentMethod, note.trim());
      onClose();
    } catch (err) {
      console.error('Error confirming sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQty = typeof knife.quantity === 'number' ? knife.quantity : 1;
  const willDisappearFromCatalog = currentQty <= 1;

  return (
    <div
      id="register-sale-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0f1118] border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto relative animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                Registrar Venda
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                CÓD: <strong className="text-amber-400">{knife.code}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Knife Summary Card */}
        <div className="p-3 rounded-2xl bg-[#161824] border border-white/10 flex items-center gap-3">
          {knife.images && knife.images.length > 0 ? (
            <img
              src={knife.images[0]}
              alt={knife.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase border border-amber-500/30">
                {knife.category || 'Geral'}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Estoque: <strong className="text-white">{currentQty} un.</strong>
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate mt-1">{knife.name}</h4>
            <div className="text-xs text-zinc-400 mt-0.5">
              Preço Catálogo:{' '}
              <strong className="text-zinc-200 font-mono">
                {formatCurrencyBRL(originalPrice)}
              </strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Valor Vendido (Com / Sem Desconto) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Valor Final da Venda (R$)</span>
              </label>

              {discountAmount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Economia de {formatCurrencyBRL(discountAmount)} ({discountPercent}% OFF)
                </span>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-400 font-bold text-sm">
                R$
              </div>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={soldPriceInput}
                onChange={(e) => {
                  setSoldPriceInput(e.target.value);
                  setHasDiscountApplied(true);
                }}
                placeholder="Ex: 450.00"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/50 border border-emerald-500/40 text-lg font-black font-mono text-emerald-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner"
              />
            </div>

            {/* Quick Discount Shortcuts */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={resetToOriginalPrice}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                  discountAmount === 0
                    ? 'bg-zinc-800 text-white border-zinc-600'
                    : 'bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                Valor Normal (R$ {originalPrice})
              </button>

              <button
                type="button"
                onClick={() => applyDiscountPercent(5)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 cursor-pointer transition-all"
              >
                -5%
              </button>
              <button
                type="button"
                onClick={() => applyDiscountPercent(10)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 cursor-pointer transition-all"
              >
                -10%
              </button>
              <button
                type="button"
                onClick={() => applyDiscountPercent(15)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 cursor-pointer transition-all"
              >
                -15%
              </button>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-emerald-400' },
                { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'text-purple-400' },
                { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'text-blue-400' },
                { id: 'dinheiro', label: 'Dinheiro', icon: DollarSign, color: 'text-amber-400' },
                { id: 'outros', label: 'Outros', icon: Wallet, color: 'text-zinc-300' },
              ].map((p) => {
                const isSelected = paymentMethod === p.id;
                const IconComponent = p.icon;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold shadow-md'
                        : 'bg-[#161824] border-white/5 text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 ${p.color}`} />
                    <span className="text-xs">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Observação rápida (opcional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">
              Observação / Detalhe (opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Venda à vista na forja, desconto especial..."
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Automatic Catalog Removal Notice */}
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              {willDisappearFromCatalog ? (
                <span>
                  Esta é a <strong>última unidade</strong> desta faca. Ao confirmar, ela será{' '}
                  <strong>removida automaticamente do catálogo</strong> e ficará arquivada no histórico de vendas.
                </span>
              ) : (
                <span>
                  O estoque desta faca será reduzido para <strong>{currentQty - 1} un.</strong> no catálogo.
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || currentSoldPrice <= 0}
              className="flex-2 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar Venda ({formatCurrencyBRL(currentSoldPrice)})</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
