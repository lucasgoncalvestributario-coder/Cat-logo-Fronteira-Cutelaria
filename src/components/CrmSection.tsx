import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Gift,
  Cake,
  Award,
  Search,
  UserPlus,
  Edit,
  Trash2,
  Phone,
  Calendar,
  CheckCircle,
  ShoppingBag,
  ExternalLink,
  AlertCircle,
  Plus,
  ArrowLeft,
  Save,
  History,
  ChevronDown,
  ChevronUp,
  CreditCard,
  QrCode,
  DollarSign,
  Wallet,
  Clock,
  AlertTriangle,
  Flame,
  MessageSquare
} from 'lucide-react';
import {
  Customer,
  getStoredCustomers,
  saveCustomerAPI,
  deleteCustomerAPI,
  incrementCustomerPurchasesAPI,
  claimCustomerRewardAPI,
  formatWhatsAppUrl,
  getBirthdayMatches,
  getCustomerLastPurchaseInfo
} from '../lib/customersStorage';
import { getStoredSalesLog, SaleRecord, PaymentMethod } from '../lib/salesStorage';

interface CrmSectionProps {
  knives?: {
    id: string;
    code: string;
    name: string;
    price: number;
    category?: string;
    images?: string[];
    quantity?: number;
    isOutofStock?: boolean;
    status?: string;
  }[];
  pendingSaleKnife?: {
    id: string;
    code: string;
    name: string;
    price: number;
    category?: string;
    images?: string[];
    quantity?: number;
    isOutofStock?: boolean;
    status?: string;
  } | null;
  initialPaymentMethod?: PaymentMethod;
  onCompleteSaleWithNewCustomer?: (knife: any, customer: Customer, paymentMethod?: PaymentMethod) => Promise<void>;
  onCancelPendingSale?: () => void;
  initialSubTab?: 'clientes' | 'aniversariantes' | 'fidelidade' | 'inativos' | 'novo_cliente';
}

export function CrmSection({
  knives = [],
  pendingSaleKnife,
  initialPaymentMethod = 'pix',
  onCompleteSaleWithNewCustomer,
  onCancelPendingSale,
  initialSubTab
}: CrmSectionProps = {}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'clientes' | 'aniversariantes' | 'fidelidade' | 'inativos' | 'novo_cliente'>(
    initialSubTab || (pendingSaleKnife ? 'novo_cliente' : 'clientes')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState('');
  const [expandedCustomerHistoryId, setExpandedCustomerHistoryId] = useState<string | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod);
  const [salesList, setSalesList] = useState<SaleRecord[]>([]);

  // Sync subtab if initialSubTab or pendingSaleKnife changes
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    } else if (pendingSaleKnife) {
      setActiveSubTab('novo_cliente');
    }
  }, [initialSubTab, pendingSaleKnife]);

  useEffect(() => {
    if (initialPaymentMethod) {
      setPendingPaymentMethod(initialPaymentMethod);
    }
  }, [initialPaymentMethod]);

  // Add / Edit Form State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    whatsapp: '',
    purchasesCount: 0
  });

  // Load customers & sales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const list = getStoredCustomers();
    setCustomers(list);
    setSalesList(getStoredSalesLog());
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Open Add Form Tab
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      birthDate: '',
      whatsapp: '',
      purchasesCount: 0
    });
    setActiveSubTab('novo_cliente');
  };

  // Open Edit Form Tab
  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      birthDate: c.birthDate || '',
      whatsapp: c.whatsapp || '',
      purchasesCount: c.purchasesCount || 0
    });
    setActiveSubTab('novo_cliente');
  };

  // Real-time customer form validation helpers
  const isCustNameEmpty = !formData.name.trim();
  const isCustNameInvalid = formData.name.trim().length > 0 && formData.name.trim().length < 3;
  const custWhatsappDigits = formData.whatsapp.replace(/\D/g, '');
  const isCustWhatsappInvalid = formData.whatsapp.trim().length > 0 && custWhatsappDigits.length < 10;

  // Save Customer (Add or Edit)
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('⚠️ Por favor, informe o nome do cliente.');
      return;
    }

    if (isCustNameInvalid) {
      showToast('⚠️ Nome muito curto! Digite o nome completo (mínimo 3 caracteres).');
      return;
    }

    if (isCustWhatsappInvalid) {
      showToast('⚠️ WhatsApp inválido! Informe o DDD e o número completo (mínimo 10 dígitos).');
      return;
    }

    const basePurchases = typeof formData.purchasesCount === 'number' ? formData.purchasesCount : 0;
    const finalPurchasesCount = pendingSaleKnife
      ? (editingCustomer ? basePurchases : Math.max(1, basePurchases))
      : basePurchases;

    const saved = await saveCustomerAPI({
      id: editingCustomer ? editingCustomer.id : undefined,
      name: formData.name.trim(),
      birthDate: formData.birthDate.trim(),
      whatsapp: formData.whatsapp.trim(),
      purchasesCount: finalPurchasesCount
    });

    if (pendingSaleKnife && onCompleteSaleWithNewCustomer) {
      await onCompleteSaleWithNewCustomer(pendingSaleKnife, saved, pendingPaymentMethod);
      showToast(`✓ Cliente "${saved.name}" cadastrado e venda da faca "${pendingSaleKnife.name}" (CÓD: ${pendingSaleKnife.code}) realizada com sucesso (-1 no estoque)!`);
    } else {
      showToast(`✓ Cliente "${saved.name}" salvo com sucesso!`);
    }

    loadData();
    setEditingCustomer(null);
    setFormData({ name: '', birthDate: '', whatsapp: '', purchasesCount: 0 });
    setActiveSubTab('clientes');
  };

  // Delete Customer IMMEDIATELY on click as requested
  const handleDeleteCustomer = async (c: Customer) => {
    await deleteCustomerAPI(c.id);
    loadData();
    showToast(`✓ Cliente "${c.name}" excluído.`);
  };

  // Claim Reward
  const handleClaimReward = async (c: Customer) => {
    await claimCustomerRewardAPI(c.id);
    loadData();
    showToast(`🎁 Brinde entregue a "${c.name}"! Novo ciclo de compras iniciado.`);
  };

  // Customer purchase analytics
  const customerAnalytics = useMemo(() => {
    return customers.map((c) => {
      const info = getCustomerLastPurchaseInfo(c, salesList);
      return {
        customer: c,
        daysAgo: info.daysAgo,
        lastDateStr: info.lastDateStr,
        isInactive20Days: info.isInactive20Days
      };
    });
  }, [customers, salesList]);

  // Inactive customers (> 20 days without purchase)
  const inactiveCustomers = useMemo(() => {
    return customerAnalytics
      .filter((item) => item.isInactive20Days)
      .sort((a, b) => (b.daysAgo || 0) - (a.daysAgo || 0));
  }, [customerAnalytics]);

  // Birthday matches
  const { today, next7Days, thisMonth } = getBirthdayMatches(customers);
  const totalUpcomingBirthdays = today.length + next7Days.length + thisMonth.length;

  // Loyalty rewards count (10+ purchases)
  const rewardAvailableCount = customers.filter(c => c.purchasesCount >= 10).length;

  // Sold out knives (0 units)
  const soldOutKnives = useMemo(() => {
    return knives.filter((k) => k.isOutofStock || k.status === 'esgotado' || (typeof k.quantity === 'number' && k.quantity <= 0));
  }, [knives]);

  // Filtered Customers list for search
  const filteredCustomers = customerAnalytics.filter((item) =>
    item.customer.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // WhatsApp Reactivation Message for Inactive customer
  const formatReactivationWhatsappUrl = (whatsapp: string, name: string, daysAgo: number | null) => {
    if (!whatsapp) return '';
    let digits = whatsapp.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    }
    const daysMsg = daysAgo ? `faz mais de ${daysAgo} dias que não nos falamos` : 'faz algum tempo que não nos falamos';
    const message = `Olá, ${name}! Tudo bem? Passando para te mandar um abraço da Fronteira Cutelaria. Notamos que ${daysMsg} e acabamos de receber novos modelos e promoções exclusivas de facas artesanais no nosso catálogo. Gostaria de dar uma olhada nas novidades? 🔪🔥`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toast message */}
      {notification && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs text-center font-bold flex items-center justify-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* DYNAMIC ALERTS BAR (Aniversariante, Fidelidade, Esgotadas, Inativos) */}
      {(totalUpcomingBirthdays > 0 || rewardAvailableCount > 0 || soldOutKnives.length > 0 || inactiveCustomers.length > 0) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-[#161822] to-[#161822] border border-amber-500/40 space-y-2.5 text-left shadow-xl animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Painel de Alertas em Tempo Real</span>
            </h4>
            <span className="text-[10px] text-zinc-400 font-mono">Notificações automáticas do dia</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Alert: Aniversariantes */}
            {totalUpcomingBirthdays > 0 && (
              <button
                type="button"
                onClick={() => setActiveSubTab('aniversariantes')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Cake className="w-3.5 h-3.5 text-amber-400" />
                <span>{today.length > 0 ? `🎂 ${today.length} Aniversariante(s) HOJE!` : `🎂 ${totalUpcomingBirthdays} Aniversariantes no mês`}</span>
              </button>
            )}

            {/* Alert: Fidelidade Batida */}
            {rewardAvailableCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveSubTab('fidelidade')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>🎁 {rewardAvailableCount} Fidelidade(s) Batida(s) - Entregar Brinde</span>
              </button>
            )}

            {/* Alert: Clientes Inativos +20 dias */}
            {inactiveCustomers.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveSubTab('inativos')}
                className="px-3 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>⚠️ {inactiveCustomers.length} Clientes +20 dias sem comprar</span>
              </button>
            )}

            {/* Alert: Facas Esgotadas */}
            {soldOutKnives.length > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>🔥 {soldOutKnives.length} Faca(s) Esgotada(s)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TOP SUMMARY CARDS (Cleaned up: removed Brindes Ganhos square, focused on CRM stats) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Card 1: Total de Clientes */}
        <div className="p-4 rounded-2xl bg-[#161822] border border-white/10 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Clientes</span>
            <Users className="w-4 h-4 text-[#ff6b00]" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-white">
            {customers.length}
          </div>
          <span className="text-[10px] text-zinc-400">Cadastrados no CRM</span>
        </div>

        {/* Card 2: Aniversariantes */}
        <div className="p-4 rounded-2xl bg-[#161822] border border-amber-500/30 flex flex-col justify-between space-y-1">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Aniversariantes</span>
            <Cake className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-300">
            {totalUpcomingBirthdays}
          </div>
          <span className="text-[10px] text-amber-400/80">Hoje e neste mês</span>
        </div>

        {/* Card 3: Clientes Inativos (+20 dias) */}
        <div className="p-4 rounded-2xl bg-[#161822] border border-orange-500/30 flex flex-col justify-between space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-orange-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inativos (+20 dias)</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-300">
            {inactiveCustomers.length}
          </div>
          <span className="text-[10px] text-orange-400/80">Sem compras recentes</span>
        </div>
      </div>

      {/* SUB-NAV TABS */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveSubTab('clientes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase shrink-0 ${
              activeSubTab === 'clientes'
                ? 'bg-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20'
                : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Todos ({customers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('inativos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase shrink-0 ${
              activeSubTab === 'inativos'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                : 'bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20'
            }`}
          >
            <Clock className="w-4 h-4 text-orange-400" />
            <span>Inativos +20d ({inactiveCustomers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('aniversariantes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase shrink-0 ${
              activeSubTab === 'aniversariantes'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                : 'bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            <Cake className="w-4 h-4 text-amber-400" />
            <span>Aniversários ({totalUpcomingBirthdays})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('fidelidade')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 uppercase shrink-0 ${
              activeSubTab === 'fidelidade'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            <Gift className="w-4 h-4 text-emerald-400" />
            <span>Fidelidade ({rewardAvailableCount})</span>
          </button>
        </div>

        {/* Action Button: + Novo Cliente */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0 uppercase shadow-md ${
            activeSubTab === 'novo_cliente'
              ? 'bg-[#ff6b00] text-white ring-2 ring-white/20'
              : 'bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white shadow-[#ff6b00]/20'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>{editingCustomer ? 'Editar Cliente' : '+ Novo Cliente'}</span>
        </button>
      </div>

      {/* TAB 1: TODOS OS CLIENTES */}
      {activeSubTab === 'clientes' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar cliente pelo nome completo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#161822] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Customer Cards List */}
          {filteredCustomers.length === 0 ? (
            <div className="p-8 text-center bg-[#161822] rounded-2xl border border-white/5 space-y-3">
              <Users className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400 font-medium">
                {searchQuery ? `Nenhum cliente encontrado para "${searchQuery}".` : 'Nenhum cliente cadastrado no CRM.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 rounded-xl bg-[#ff6b00] text-white font-bold text-xs uppercase hover:brightness-110 cursor-pointer"
              >
                + Cadastrar Primeiro Cliente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredCustomers.map(({ customer: c, daysAgo, isInactive20Days }) => {
                const hasReward = c.purchasesCount >= 10;
                const whatsappUrl = formatWhatsAppUrl(c.whatsapp, c.name);

                return (
                  <div
                    key={c.id}
                    className={`p-4 rounded-2xl bg-[#161822] border transition-all flex flex-col justify-between space-y-3 ${
                      isInactive20Days
                        ? 'border-orange-500/40 bg-orange-500/5'
                        : hasReward
                        ? 'border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/5'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-white uppercase tracking-wide">
                              {c.name}
                            </h4>
                            {isInactive20Days && (
                              <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 font-extrabold text-[9px] uppercase border border-orange-500/40 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5 text-orange-400" />
                                <span>+{daysAgo} dias sem comprar</span>
                              </span>
                            )}
                          </div>

                          {c.birthDate ? (
                            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                              <Cake className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>Nascimento: <strong>{c.birthDate}</strong></span>
                            </p>
                          ) : (
                            <p className="text-xs text-zinc-500 italic mt-0.5">
                              Data de nascimento não informada
                            </p>
                          )}
                        </div>

                        {/* Purchases Badge */}
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-extrabold shrink-0 flex items-center gap-1 ${
                            hasReward
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                              : 'bg-white/5 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {hasReward ? <Gift className="w-3.5 h-3.5 text-emerald-400" /> : <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{c.purchasesCount} {c.purchasesCount === 1 ? 'compra' : 'compras'}</span>
                        </div>
                      </div>

                      {/* Days since last purchase indicator */}
                      <div className="text-xs flex items-center gap-1.5 font-mono">
                        <Clock className={`w-3.5 h-3.5 ${isInactive20Days ? 'text-orange-400' : 'text-zinc-400'}`} />
                        <span className={isInactive20Days ? 'text-orange-300 font-bold' : 'text-zinc-400'}>
                          {daysAgo === null
                            ? 'Sem compras registradas'
                            : daysAgo === 0
                            ? 'Última compra: Hoje'
                            : daysAgo === 1
                            ? 'Última compra: Ontem (há 1 dia)'
                            : `Última compra: há ${daysAgo} dias`}
                        </span>
                      </div>

                      {/* WhatsApp Info */}
                      <div className="pt-1">
                        {c.whatsapp ? (
                          <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-xl border border-white/5">
                            <div className="flex items-center gap-1.5 text-emerald-400">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span className="font-mono text-zinc-300">{c.whatsapp}</span>
                            </div>
                            {whatsappUrl && (
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                              >
                                <span>Abrir Whats</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-300">
                            <span className="text-[11px] font-medium">WhatsApp não cadastrado</span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(c)}
                              className="text-[10px] font-bold uppercase underline text-amber-400 hover:text-amber-200 cursor-pointer"
                            >
                              Adicionar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Customer Purchase History Expander */}
                      {(() => {
                        const customerSales = salesList.filter(
                          (s) => s.customerId === c.id || (s.customerName && s.customerName.toLowerCase() === c.name.toLowerCase())
                        );
                        const isExpanded = expandedCustomerHistoryId === c.id;

                        return (
                          <div className="pt-1 space-y-2">
                            <button
                              type="button"
                              onClick={() => setExpandedCustomerHistoryId(isExpanded ? null : c.id)}
                              className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isExpanded
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-black/30 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'
                              }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <History className="w-3.5 h-3.5 text-amber-400" />
                                <span>Histórico de Compras ({customerSales.length})</span>
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && (
                              <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2 animate-fadeIn max-h-52 overflow-y-auto no-scrollbar text-left">
                                {customerSales.length === 0 ? (
                                  <p className="text-[11px] text-zinc-500 italic text-center py-2">
                                    Nenhuma compra detalhada registrada para este cliente ainda.
                                  </p>
                                ) : (
                                  customerSales.map((s) => {
                                    const matchingKnife = knives.find((k) => k.id === s.knifeId || (k.code && k.code === s.code));
                                    const knifeImg = (s.images && s.images[0]) || matchingKnife?.images?.[0];

                                    return (
                                      <div
                                        key={s.id}
                                        className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs gap-2.5"
                                      >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                          {knifeImg ? (
                                            <img
                                              src={knifeImg}
                                              alt={s.name}
                                              className="w-10 h-10 object-cover rounded-lg border border-white/10 shrink-0 bg-black/40"
                                            />
                                          ) : (
                                            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-sm font-bold shrink-0">
                                              🗡️
                                            </div>
                                          )}
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                                                {s.code}
                                              </span>
                                              <span className="text-[10px] text-zinc-400 font-mono">{s.soldAt}</span>
                                            </div>
                                            <p className="font-bold text-white text-[11px] mt-0.5 truncate">{s.name}</p>
                                          </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                          <p className="font-bold text-amber-400 text-xs">
                                            R$ {Number(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                          </p>
                                          <span className="text-[9px] font-bold text-emerald-400 uppercase">
                                            {s.paymentMethod ? s.paymentMethod.replace('_', ' ') : 'pix'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Reward Available Destaque */}
                      {hasReward && (
                        <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                            <Gift className="w-4 h-4 text-emerald-400 animate-bounce" />
                            <span>🎁 BRINDE DISPONÍVEL (10 Compras)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleClaimReward(c)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[10px] rounded-lg uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                          >
                            Brinde Entregue
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Actions Bar (Immediately deletes on trash button click) */}
                    <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-zinc-300 border border-white/10 transition-colors cursor-pointer"
                          title="Editar cadastro do cliente"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(c)}
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30 transition-all cursor-pointer active:scale-90"
                          title="Excluir cliente de imediato"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLIENTES INATIVOS (+20 DIAS SEM COMPRAR) */}
      {activeSubTab === 'inativos' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-xs text-orange-200 space-y-1.5 text-left">
            <h4 className="font-bold text-orange-300 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Clientes Inativos (+20 dias sem compras)</span>
            </h4>
            <p className="text-zinc-300 leading-relaxed">
              Aqui estão os clientes que compraram anteriormente, mas estão há mais de 20 dias sem registrar novos pedidos.
              Aproveite para enviar uma mensagem carinhosa de reativação via WhatsApp!
            </p>
          </div>

          {inactiveCustomers.length === 0 ? (
            <div className="p-8 text-center bg-[#161822] rounded-2xl border border-white/5 space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm text-zinc-300 font-bold">Nenhum cliente inativo há mais de 20 dias!</p>
              <p className="text-xs text-zinc-500">Sua base de clientes está com compras ativas e frequentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inactiveCustomers.map(({ customer: c, daysAgo }) => {
                const reactivateUrl = formatReactivationWhatsappUrl(c.whatsapp, c.name, daysAgo);

                return (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-[#161822] border border-orange-500/40 space-y-3 text-left flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white uppercase text-sm tracking-wide">
                            {c.name}
                          </h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 font-mono font-bold text-[10px] uppercase border border-orange-500/40 mt-1">
                            <Clock className="w-3 h-3 text-orange-400" />
                            <span>Há {daysAgo} dias sem comprar</span>
                          </span>
                        </div>

                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {c.purchasesCount} {c.purchasesCount === 1 ? 'compra' : 'compras'}
                        </span>
                      </div>

                      {c.whatsapp ? (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{c.whatsapp}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-zinc-500 italic">WhatsApp não cadastrado</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      {reactivateUrl ? (
                        <a
                          href={reactivateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs uppercase flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Reativar no Whats</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(c)}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase"
                        >
                          Adicionar WhatsApp
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(c)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer shrink-0"
                        title="Excluir cliente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANIVERSARIANTES */}
      {activeSubTab === 'aniversariantes' && (
        <div className="space-y-5">
          {totalUpcomingBirthdays === 0 ? (
            <div className="p-8 text-center bg-[#161822] rounded-2xl border border-white/5 space-y-2">
              <Cake className="w-10 h-10 text-amber-500/40 mx-auto" />
              <p className="text-sm text-zinc-400 font-medium">
                Nenhum cliente fazendo aniversário hoje ou neste mês.
              </p>
              <p className="text-xs text-zinc-500">
                Lembre-se de incluir a data de nascimento ao cadastrar novos clientes!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Hoje */}
              {today.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Cake className="w-4 h-4 text-amber-400" />
                    <span>🎂 Aniversariantes de HOJE ({today.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {today.map((c) => (
                      <BirthdayCard key={c.id} customer={c} onEdit={handleOpenEditModal} onDelete={handleDeleteCustomer} />
                    ))}
                  </div>
                </div>
              )}

              {/* Próximos 7 Dias */}
              {next7Days.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-300" />
                    <span>🗓️ Próximos 7 Dias ({next7Days.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {next7Days.map((c) => (
                      <BirthdayCard key={c.id} customer={c} onEdit={handleOpenEditModal} onDelete={handleDeleteCustomer} />
                    ))}
                  </div>
                </div>
              )}

              {/* Neste Mês */}
              {thisMonth.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>📅 Aniversariantes deste Mês ({thisMonth.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {thisMonth.map((c) => (
                      <BirthdayCard key={c.id} customer={c} onEdit={handleOpenEditModal} onDelete={handleDeleteCustomer} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FIDELIDADE */}
      {activeSubTab === 'fidelidade' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#161822] to-[#1e2230] border border-amber-500/20 text-xs text-zinc-300 space-y-1.5 text-left">
            <h4 className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#ff6b00]" />
              <span>Programa de Fidelidade — 10 Compras = 1 Brinde 🎁</span>
            </h4>
            <p className="text-zinc-400 leading-relaxed">
              A cada 10 compras registradas, o cliente ganha um brinde exclusivo da Fronteira Cutelaria.
              Ao entregar o brinde, clique em <strong>"Brinde Entregue"</strong> para reiniciar o ciclo para o próximo presente!
            </p>
          </div>

          {customers.length === 0 ? (
            <div className="p-8 text-center bg-[#161822] rounded-2xl border border-white/5 space-y-2">
              <Gift className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-sm text-zinc-400">Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customers
                .sort((a, b) => b.purchasesCount - a.purchasesCount)
                .map((c) => {
                  const hasReward = c.purchasesCount >= 10;
                  const cycleProgress = Math.min(100, (c.purchasesCount / 10) * 100);

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-2xl bg-[#161822] border space-y-3 transition-all text-left ${
                        hasReward
                          ? 'border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                          : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-white uppercase text-sm">{c.name}</h4>
                          <p className="text-xs text-zinc-400">
                            {c.purchasesCount} {c.purchasesCount === 1 ? 'compra registrada' : 'compras registradas'}
                          </p>
                        </div>

                        {hasReward ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-black font-extrabold text-[10px] uppercase animate-bounce">
                            🎁 Ganhou Brinde!
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {c.purchasesCount} / 10
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div
                            className={`h-full transition-all duration-500 ${
                              hasReward
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-[#ff6b00] to-amber-400'
                            }`}
                            style={{ width: `${cycleProgress}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-zinc-400 text-right">
                          {hasReward
                            ? ' Meta de 10 compras atingida!'
                            : `Faltam ${10 - c.purchasesCount} compras para o brinde`}
                        </p>
                      </div>

                      {/* Reward Claim Button */}
                      {hasReward && (
                        <button
                          type="button"
                          onClick={() => handleClaimReward(c)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-black font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                        >
                          <Gift className="w-4 h-4" />
                          <span>Confirmar Entrega do Brinde</span>
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ABA DEDICADA DE CADASTRO / EDIÇÃO DE CLIENTE */}
      {activeSubTab === 'novo_cliente' && (
        <div className="p-6 bg-[#161822] rounded-3xl border border-white/10 space-y-6 max-w-2xl mx-auto shadow-2xl animate-fadeIn">
          
          {/* Pending Sale Notice Banner */}
          {pendingSaleKnife && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-500/50 text-xs text-emerald-200 flex flex-col items-stretch gap-3 shadow-xl animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                    <ShoppingBag className="w-5 h-5 animate-bounce shrink-0" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-white uppercase tracking-wider">
                        Venda em Andamento Vinculada
                      </p>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30 font-bold">
                        CÓD: {pendingSaleKnife.code}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300 mt-0.5">
                      Faca: <strong className="text-white">{pendingSaleKnife.name}</strong> • Valor: <strong className="text-amber-300 font-mono">R$ {Number(pendingSaleKnife.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </p>
                    <p className="text-[11px] text-zinc-300 mt-1">
                      Ao salvar este novo cliente, a faca será marcada como <strong>VENDIDA</strong> (-1 no estoque), o valor entrará nas vendas e a faca será vinculada ao histórico deste cliente!
                    </p>
                  </div>
                </div>

                {onCancelPendingSale && (
                  <button
                    type="button"
                    onClick={onCancelPendingSale}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer uppercase shrink-0"
                  >
                    Cancelar Venda
                  </button>
                )}
              </div>

              {/* Payment Method selector for pending sale */}
              <div className="pt-2 border-t border-emerald-500/30 space-y-1.5 text-left">
                <label className="text-[11px] font-bold text-amber-300 uppercase flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Forma de Pagamento para esta Venda *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPendingPaymentMethod('pix')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      pendingPaymentMethod === 'pix'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow'
                        : 'bg-black/40 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingPaymentMethod('cartao_credito')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      pendingPaymentMethod === 'cartao_credito'
                        ? 'bg-purple-500 text-white border-purple-400 shadow'
                        : 'bg-black/40 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Crédito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingPaymentMethod('cartao_debito')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      pendingPaymentMethod === 'cartao_debito'
                        ? 'bg-blue-500 text-white border-blue-400 shadow'
                        : 'bg-black/40 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Débito</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingPaymentMethod('dinheiro')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                      pendingPaymentMethod === 'dinheiro'
                        ? 'bg-amber-500 text-black border-amber-400 shadow'
                        : 'bg-black/40 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Dinheiro</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingPaymentMethod('outros')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border col-span-2 sm:col-span-1 ${
                      pendingPaymentMethod === 'outros'
                        ? 'bg-orange-500 text-white border-orange-400 shadow'
                        : 'bg-black/40 text-zinc-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Outros</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-[#ff6b00]" />
              <div>
                <h3 className="font-serif-luxury text-lg font-bold">
                  {editingCustomer ? `Editar Cliente: ${editingCustomer.name}` : 'Cadastrar Novo Cliente CRM'}
                </h3>
                <p className="text-xs text-zinc-400">
                  Preencha as informações do cliente. As alterações permanecem salvas na sua conta do painel.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSubTab('clientes')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 uppercase shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4">
            {/* Nome Completo */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span>Nome Completo do Cliente *</span>
                {isCustNameInvalid ? (
                  <span className="text-[10px] text-red-400 font-extrabold uppercase">
                    ⚠️ MÍNIMO 3 CARACTERES
                  </span>
                ) : !isCustNameEmpty ? (
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase">
                    ✓ VÁLIDO
                  </span>
                ) : null}
              </label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva Santos"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3.5 py-2.5 bg-[#12141c] border rounded-xl text-sm text-white placeholder-zinc-500 transition-colors ${
                  isCustNameEmpty
                    ? 'border-white/10 focus:border-[#ff6b00]'
                    : isCustNameInvalid
                    ? 'border-red-500 bg-red-500/10 text-red-200 focus:border-red-500'
                    : 'border-emerald-500/60 bg-emerald-500/5 text-white focus:border-emerald-500'
                }`}
              />
              {isCustNameInvalid && (
                <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Nome muito curto. Informe o nome completo do cliente.</span>
                </p>
              )}
              {!isCustNameEmpty && !isCustNameInvalid && (
                <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Nome preenchido corretamente</span>
                </p>
              )}
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                <Cake className="w-3.5 h-3.5 text-amber-400" />
                <span>Data de Nascimento</span>
              </label>
              <input
                type="text"
                placeholder="Ex: 15/08/1985 ou 15/08"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#12141c] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#ff6b00]"
              />
              <p className="text-[10px] text-zinc-500">
                Usado para calcular os aniversariantes do dia/mês no CRM.
              </p>
            </div>

            {/* WhatsApp */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp com DDD</span>
                </span>
                {isCustWhatsappInvalid ? (
                  <span className="text-[10px] text-amber-400 font-extrabold uppercase">
                    ⚠️ MÍNIMO 10 DÍGITOS
                  </span>
                ) : custWhatsappDigits.length >= 10 ? (
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase">
                    ✓ WHATSAPP OK
                  </span>
                ) : null}
              </label>
              <input
                type="text"
                placeholder="Ex: (11) 99999-8888 ou 11999998888"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className={`w-full px-3.5 py-2.5 bg-[#12141c] border rounded-xl text-sm text-white placeholder-zinc-500 transition-colors ${
                  isCustWhatsappInvalid
                    ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                    : custWhatsappDigits.length >= 10
                    ? 'border-emerald-500/60 bg-emerald-500/5 text-white'
                    : 'border-white/10 focus:border-[#ff6b00]'
                }`}
              />
              {isCustWhatsappInvalid && (
                <p className="text-[11px] text-amber-400 font-bold flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Digite o DDD e o número completo (ex: 11999998888).</span>
                </p>
              )}
              {custWhatsappDigits.length >= 10 && (
                <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>WhatsApp válido com DDD!</span>
                </p>
              )}
            </div>

            {/* Quantidade de Compras */}
            <div className="space-y-1 text-left">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Quantidade de Compras Inicial</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.purchasesCount}
                onChange={(e) => setFormData({ ...formData, purchasesCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3.5 py-2.5 bg-[#12141c] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#ff6b00]"
              />
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveSubTab('clientes')}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-xs uppercase shadow-lg shadow-[#ff6b00]/20 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingCustomer ? 'Salvar Alterações' : 'Salvar Novo Cliente'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Helper Birthday Card Component
function BirthdayCard({
  customer,
  onEdit,
  onDelete
}: {
  key?: string;
  customer: Customer;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  const whatsappUrl = formatWhatsAppUrl(customer.whatsapp, customer.name);

  return (
    <div className="p-4 rounded-2xl bg-[#161822] border border-amber-500/30 flex flex-col justify-between space-y-3 hover:border-amber-500/50 transition-all text-left">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-bold text-white uppercase text-sm tracking-wide">
            {customer.name}
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] uppercase border border-amber-500/30">
            🎂 Aniversariante
          </span>
        </div>

        <p className="text-xs text-zinc-300 flex items-center gap-1.5">
          <Cake className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Data: <strong>{customer.birthDate || 'Data não informada'}</strong></span>
        </p>

        {customer.whatsapp ? (
          <p className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>{customer.whatsapp}</span>
          </p>
        ) : (
          <p className="text-[11px] text-amber-400/80 italic flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>WhatsApp não cadastrado</span>
          </p>
        )}
      </div>

      {/* Button: 🎉 Enviar Parabéns */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs uppercase flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <span>🎉 Enviar Parabéns</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="flex-1 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Adicionar WhatsApp</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(customer)}
          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all cursor-pointer shrink-0"
          title="Excluir cliente"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
        </button>
      </div>
    </div>
  );
}
