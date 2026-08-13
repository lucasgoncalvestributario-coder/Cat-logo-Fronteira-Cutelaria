import { useState, useEffect } from 'react';
import { Search, UserPlus, ShoppingBag, X, Check, User, Cake, Phone, CreditCard, DollarSign, QrCode, Wallet, CheckCircle, ArrowLeft } from 'lucide-react';
import { Knife } from '../types';
import {
  Customer,
  getStoredCustomers,
  saveCustomerAPI,
  incrementCustomerPurchasesAPI
} from '../lib/customersStorage';
import { PaymentMethod } from '../lib/salesStorage';

interface SelectCustomerSaleModalProps {
  isOpen: boolean;
  knife: Knife | null;
  onClose: () => void;
  onConfirmSale: (knife: Knife, customer: Customer | null, paymentMethod?: PaymentMethod) => Promise<void>;
  onGoToCrmRegister?: (knife: Knife, paymentMethod?: PaymentMethod) => void;
  onGoToSalesTab?: () => void;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro',
  outros: 'Outros / Fiado'
};

export function SelectCustomerSaleModal({
  isOpen,
  knife,
  onClose,
  onConfirmSale,
  onGoToSalesTab
}: SelectCustomerSaleModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  // Customer sub-tab: 'cadastrado' vs 'novo'
  const [customerMode, setCustomerMode] = useState<'cadastrado' | 'novo'>('cadastrado');
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    birthDate: '',
    whatsapp: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [confirmedCustomerName, setConfirmedCustomerName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCustomers(getStoredCustomers());
      setSearchQuery('');
      setSelectedCustomer(null);
      setCustomerMode('cadastrado');
      setPaymentMethod('pix');
      setNewCustomerForm({ name: '', birthDate: '', whatsapp: '' });
      setSaleSuccess(false);
      setConfirmedCustomerName('');
    }
  }, [isOpen]);

  if (!isOpen || !knife) return null;

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.whatsapp && c.whatsapp.includes(searchQuery))
  );

  const handleConfirmSale = async () => {
    setIsSubmitting(true);
    try {
      let finalCustomer: Customer | null = null;
      let customerNameForNotice = '';

      if (customerMode === 'cadastrado') {
        finalCustomer = selectedCustomer;
        if (finalCustomer) {
          await incrementCustomerPurchasesAPI(finalCustomer.id);
          customerNameForNotice = finalCustomer.name;
        }
      } else if (customerMode === 'novo') {
        if (!newCustomerForm.name.trim()) {
          alert('Por favor, informe ao menos o nome completo do novo cliente.');
          setIsSubmitting(false);
          return;
        }

        const saved = await saveCustomerAPI({
          name: newCustomerForm.name.trim(),
          birthDate: newCustomerForm.birthDate.trim(),
          whatsapp: newCustomerForm.whatsapp.trim(),
          purchasesCount: 1 // First purchase
        });
        finalCustomer = saved;
        customerNameForNotice = saved.name;
      }

      await onConfirmSale(knife, finalCustomer, paymentMethod);
      setConfirmedCustomerName(customerNameForNotice);
      setSaleSuccess(true);
    } catch (err) {
      console.error('Error confirming sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNoCustomerSale = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmSale(knife, null, paymentMethod);
      setConfirmedCustomerName('Venda sem vínculo de cliente');
      setSaleSuccess(true);
    } catch (err) {
      console.error('Error confirming sale without customer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCustomerSummaryName = () => {
    if (customerMode === 'cadastrado') {
      return selectedCustomer ? selectedCustomer.name : 'Nenhum selecionado';
    }
    return newCustomerForm.name.trim() ? newCustomerForm.name.trim() : 'Novo cliente';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#12141c] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl space-y-4 animate-scaleUp">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {saleSuccess ? (
          /* POST-SALE SUCCESS CONFIRMATION SCREEN INSIDE ADMIN */
          <div className="py-4 text-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="font-serif-luxury text-xl font-bold text-white">
                ✓ Venda Registrada com Sucesso!
              </h3>
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                A faca <strong className="text-amber-400">{knife.name}</strong> (CÓD: {knife.code}) foi registrada como vendida. Foi subtraído 1 item do estoque do catálogo.
              </p>

              <div className="p-3 rounded-2xl bg-[#161822] border border-white/10 max-w-sm mx-auto text-left text-xs space-y-1">
                <p className="text-zinc-400">
                  Forma de Pagamento: <strong className="text-emerald-400">{PAYMENT_LABELS[paymentMethod]}</strong>
                </p>
                <p className="text-zinc-400">
                  Valor: <strong className="text-amber-400">R$ {Number(knife.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </p>
                {confirmedCustomerName && (
                  <p className="text-zinc-400">
                    Cliente: <strong className="text-white">{confirmedCustomerName}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* TWO OPTIONS FOR ADMIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSaleSuccess(false);
                  onClose();
                }}
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/10"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" />
                <span>Voltar para Lista de Facas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSaleSuccess(false);
                  onClose();
                  if (onGoToSalesTab) onGoToSalesTab();
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-xs uppercase shadow-lg shadow-[#ff6b00]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>Ir para Vendas</span>
              </button>
            </div>
          </div>
        ) : (
          /* REGULAR SALE WORKFLOW */
          <>
            {/* Modal Header */}
            <div className="space-y-1 text-left pr-8">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4" />
                <span>Registrar Venda</span>
              </div>
              <h3 className="font-serif-luxury text-base sm:text-lg font-bold text-white">
                {knife.name}
              </h3>
              <p className="text-xs text-zinc-400">
                Código: <strong className="text-amber-400 font-mono">{knife.code}</strong> • Valor: <strong className="text-emerald-400">R$ {Number(knife.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              </p>
            </div>

            {/* STEP 1: FORMA DE PAGAMENTO */}
            <div className="p-3 bg-[#161822] rounded-2xl border border-white/10 space-y-2 text-left">
              <label className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                <span>1. Escolha a Forma de Pagamento *</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    paymentMethod === 'pix'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                      : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>PIX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao_credito')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    paymentMethod === 'cartao_credito'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500 shadow-md ring-1 ring-purple-500'
                      : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Cartão Crédito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao_debito')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    paymentMethod === 'cartao_debito'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500 shadow-md ring-1 ring-blue-500'
                      : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Cartão Débito</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('dinheiro')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    paymentMethod === 'dinheiro'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md ring-1 ring-amber-500'
                      : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Dinheiro</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('outros')}
                  className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border col-span-2 sm:col-span-1 ${
                    paymentMethod === 'outros'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500 shadow-md ring-1 ring-orange-500'
                      : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/20'
                  }`}
                >
                  <Wallet className="w-4 h-4 text-orange-400 shrink-0" />
                  <span>Outros / Fiado</span>
                </button>
              </div>
            </div>

            {/* STEP 2: CLIENTE SELECTION TABS */}
            <div className="space-y-2 text-left">
              <label className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Identificação do Cliente</span>
              </label>

              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <button
                  type="button"
                  onClick={() => setCustomerMode('cadastrado')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    customerMode === 'cadastrado'
                      ? 'bg-[#ff6b00] text-white shadow-md shadow-[#ff6b00]/20'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Cliente Cadastrado</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerMode('novo')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    customerMode === 'novo'
                      ? 'bg-[#ff6b00] text-white shadow-md shadow-[#ff6b00]/20'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Novo Cliente</span>
                </button>
              </div>

              {/* MODE A: CLIENTE CADASTRADO */}
              {customerMode === 'cadastrado' && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar cliente cadastrado..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#161822] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00]"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center bg-[#161822] rounded-xl border border-white/5 text-xs text-zinc-400 space-y-1">
                        <p>Nenhum cliente encontrado.</p>
                        <button
                          type="button"
                          onClick={() => setCustomerMode('novo')}
                          className="text-[#ff6b00] font-bold underline hover:text-amber-400 cursor-pointer"
                        >
                          + Cadastrar Novo Cliente Agora
                        </button>
                      </div>
                    ) : (
                      filteredCustomers.map((c) => {
                        const isSelected = selectedCustomer?.id === c.id;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedCustomer(c)}
                            className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#ff6b00]/20 border-[#ff6b00] text-white shadow-md'
                                : 'bg-[#161822] border-white/5 hover:border-white/20 text-zinc-300'
                            }`}
                          >
                            <div>
                              <p className="font-bold text-xs uppercase">{c.name}</p>
                              <p className="text-[10px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                {c.whatsapp && <span>📱 {c.whatsapp}</span>}
                                {c.whatsapp && <span>•</span>}
                                <span>🛍️ {c.purchasesCount} {c.purchasesCount === 1 ? 'compra' : 'compras'}</span>
                              </p>
                            </div>

                            {isSelected && (
                              <Check className="w-4 h-4 text-[#ff6b00] shrink-0" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* MODE B: NOVO CLIENTE */}
              {customerMode === 'novo' && (
                <div className="space-y-2.5 bg-[#161822] p-3.5 rounded-2xl border border-white/10">
                  <div className="space-y-1 text-left">
                    <label className="text-[11px] font-bold text-zinc-300 uppercase">
                      Nome Completo do Cliente *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Eduardo Lima"
                      value={newCustomerForm.name}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-[#12141c] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase flex items-center gap-1">
                        <Cake className="w-3 h-3 text-amber-400" />
                        <span>Data Nasc.</span>
                      </label>
                      <input
                        type="text"
                        placeholder="DD/MM/AAAA"
                        value={newCustomerForm.birthDate}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, birthDate: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12141c] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-zinc-300 uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>WhatsApp</span>
                      </label>
                      <input
                        type="text"
                        placeholder="(DDD) 9XXXX-XXXX"
                        value={newCustomerForm.whatsapp}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, whatsapp: e.target.value })}
                        className="w-full px-3 py-2 bg-[#12141c] border border-white/10 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RESUMO DA VENDA BOX */}
            <div className="p-3 bg-[#161822] border border-amber-500/30 rounded-2xl text-xs space-y-1 text-left">
              <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
                Resumo da Venda
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-zinc-300 text-[11px]">
                <div><span className="text-zinc-500">Faca:</span> <strong>{knife.name}</strong></div>
                <div><span className="text-zinc-500">Código:</span> <strong className="font-mono text-amber-400">{knife.code}</strong></div>
                <div><span className="text-zinc-500">Valor:</span> <strong className="text-emerald-400">R$ {Number(knife.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></div>
                <div><span className="text-zinc-500">Pagamento:</span> <strong>{PAYMENT_LABELS[paymentMethod]}</strong></div>
                <div className="col-span-2 truncate">
                  <span className="text-zinc-500">Cliente:</span> <strong>{getCustomerSummaryName()}</strong>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4 text-black" />
                <span>CONFIRMAR VENDA</span>
              </button>

              <button
                type="button"
                onClick={handleNoCustomerSale}
                disabled={isSubmitting}
                className="w-full py-2 text-center text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Vender sem vincular cliente
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
