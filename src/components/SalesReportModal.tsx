import React, { useState, useMemo } from 'react';
import {
  X,
  FileBarChart,
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  CreditCard,
  QrCode,
  Wallet,
  Users,
  Copy,
  Printer,
  Check,
  Award,
  Search,
  Filter,
  Download,
  FileText
} from 'lucide-react';
import { getStoredSalesLog, SaleRecord, PaymentMethod } from '../lib/salesStorage';
import { downloadSalesReportPdf } from '../lib/pdfReportGenerator';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SalesReportModal({ isOpen, onClose }: SalesReportModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('current');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  const allSales = useMemo(() => {
    return getStoredSalesLog();
  }, [isOpen]);

  // Extract available months from sales history
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; key: string }>();

    // Current month default
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthMap.set(currentKey, {
      key: currentKey,
      label: currentLabel.charAt(0).toUpperCase() + currentLabel.slice(1)
    });

    for (const sale of allSales) {
      if (sale.timestamp) {
        const d = new Date(sale.timestamp);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const lbl = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        monthMap.set(k, {
          key: k,
          label: lbl.charAt(0).toUpperCase() + lbl.slice(1)
        });
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [allSales]);

  // Set initial selected month
  const activeMonthKey = selectedMonthKey === 'current' ? (availableMonths[0]?.key || '') : selectedMonthKey;

  // Filter sales for active month
  const monthSales = useMemo(() => {
    return allSales.filter((s) => {
      if (!s.timestamp) return true;
      const d = new Date(s.timestamp);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return k === activeMonthKey;
    });
  }, [allSales, activeMonthKey]);

  // Calculate metrics
  const totalRevenue = monthSales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  const totalQuantity = monthSales.length;
  const ticketMedio = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  // Unique customers in the month
  const uniqueCustomers = new Set(
    monthSales.map((s) => s.customerId || s.customerName).filter(Boolean)
  ).size;

  // Payment methods breakdown
  const paymentStats = useMemo(() => {
    const stats = {
      pix: { label: 'PIX', count: 0, total: 0, icon: QrCode, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
      cartao_credito: { label: 'Cartão de Crédito', count: 0, total: 0, icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
      cartao_debito: { label: 'Cartão de Débito', count: 0, total: 0, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      dinheiro: { label: 'Dinheiro', count: 0, total: 0, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
      outros: { label: 'Outros / Fiado', count: 0, total: 0, icon: Wallet, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' }
    };

    for (const sale of monthSales) {
      const pm = (sale.paymentMethod || 'pix') as keyof typeof stats;
      if (stats[pm]) {
        stats[pm].count += 1;
        stats[pm].total += Number(sale.price) || 0;
      } else {
        stats.pix.count += 1;
        stats.pix.total += Number(sale.price) || 0;
      }
    }

    return stats;
  }, [monthSales]);

  // Top selling knives in the month
  const topSellingKnives = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number; total: number }>();
    for (const sale of monthSales) {
      const k = sale.code || sale.name;
      const existing = map.get(k) || { code: sale.code, name: sale.name, count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(sale.price) || 0;
      map.set(k, existing);
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.total - a.total)
      .slice(0, 5);
  }, [monthSales]);

  // Filtered sales list
  const filteredSalesList = useMemo(() => {
    return monthSales.filter((s) => {
      const matchesPayment = selectedPaymentFilter === 'all' || (s.paymentMethod || 'pix') === selectedPaymentFilter;
      const q = searchFilter.toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.customerName && s.customerName.toLowerCase().includes(q));
      return matchesPayment && matchesSearch;
    });
  }, [monthSales, selectedPaymentFilter, searchFilter]);

  if (!isOpen) return null;

  const currentMonthObj = availableMonths.find((m) => m.key === activeMonthKey);
  const currentMonthLabel = currentMonthObj?.label || 'Mês Atual';

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Copy WhatsApp summary report
  const handleCopyReport = () => {
    const text = `📊 *RELATÓRIO MENSAL DE VENDAS - FRONTEIRA CUTELARIA* 📊
🗓️ *Período:* ${currentMonthLabel}

💰 *Faturamento Total:* ${formatCurrency(totalRevenue)}
🔪 *Total de Peças Vendidas:* ${totalQuantity} un.
👥 *Clientes Atendidos:* ${uniqueCustomers}
📈 *Ticket Médio por Venda:* ${formatCurrency(ticketMedio)}

💳 *DETALHAMENTO POR FORMA DE PAGAMENTO:*
⚡ *PIX:* ${formatCurrency(paymentStats.pix.total)} (${paymentStats.pix.count} vds)
💳 *Cartão de Crédito:* ${formatCurrency(paymentStats.cartao_credito.total)} (${paymentStats.cartao_credito.count} vds)
💳 *Cartão de Débito:* ${formatCurrency(paymentStats.cartao_debito.total)} (${paymentStats.cartao_debito.count} vds)
💵 *Dinheiro:* ${formatCurrency(paymentStats.dinheiro.total)} (${paymentStats.dinheiro.count} vds)
🔄 *Outros / Fiado:* ${formatCurrency(paymentStats.outros.total)} (${paymentStats.outros.count} vds)

🏆 *PRODUTOS MAIS VENDIDOS:*
${topSellingKnives.map((k, i) => `${i + 1}. [${k.code}] ${k.name} - ${k.count}x (${formatCurrency(k.total)})`).join('\n') || 'Nenhum registro'}

Gerado automaticamente via Painel ADM Fronteira Cutelaria.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Download formatted color PDF report immediately
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      downloadSalesReportPdf({
        monthLabel: currentMonthLabel,
        monthKey: activeMonthKey,
        sales: monthSales,
        totalRevenue,
        totalQuantity,
        ticketMedio,
        uniqueCustomers,
        paymentStats,
        topSellingKnives,
      });

      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3500);
    } catch (err) {
      console.error('Error generating PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-[#12141c] rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl space-y-6 animate-scaleUp my-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <FileBarChart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-serif-luxury text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <span>Relatório Mensal de Vendas</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Resumo faturamento, métricas executivas e fechamento por forma de pagamento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Month selector */}
            <select
              value={activeMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="p-2.5 rounded-xl bg-[#161822] border border-amber-500/40 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Download PDF Report Button */}
            <button
              type="button"
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
              title="Baixar imediatamente o arquivo PDF colorido para o seu dispositivo"
            >
              {pdfDownloaded ? (
                <>
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span className="font-black">PDF Baixado com Sucesso!</span>
                </>
              ) : isGeneratingPdf ? (
                <>
                  <Download className="w-4 h-4 text-black animate-bounce" />
                  <span>Baixando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-black" />
                  <span className="hidden sm:inline">Baixar Relatório em PDF</span>
                  <span className="sm:hidden">Baixar PDF</span>
                </>
              )}
            </button>

            {/* Copy Report Button */}
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copiar resumo formatado para WhatsApp"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-emerald-400" />}
              <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Copiar Resumo'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Fechar relatório"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 4 EXECUTIVE CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Faturamento Total */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#161822] border border-emerald-500/40 space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Faturamento Mês</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-amber-400 truncate">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[10px] text-zinc-400">{currentMonthLabel}</p>
          </div>

          {/* Peças Vendidas */}
          <div className="p-4 rounded-2xl bg-[#161822] border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Facas Vendidas</span>
              <ShoppingBag className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-white">
              {totalQuantity} <span className="text-xs text-zinc-400 font-normal">un.</span>
            </p>
            <p className="text-[10px] text-zinc-400">Total de unidades</p>
          </div>

          {/* Clientes Atendidos */}
          <div className="p-4 rounded-2xl bg-[#161822] border border-blue-500/30 space-y-1">
            <div className="flex items-center justify-between text-blue-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Clientes Atendidos</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-white">
              {uniqueCustomers} <span className="text-xs text-zinc-400 font-normal">pessoas</span>
            </p>
            <p className="text-[10px] text-zinc-400">Clientes no mês</p>
          </div>

          {/* Ticket Médio */}
          <div className="p-4 rounded-2xl bg-[#161822] border border-purple-500/30 space-y-1">
            <div className="flex items-center justify-between text-purple-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ticket Médio</span>
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-lg sm:text-2xl font-black text-purple-300 truncate">
              {formatCurrency(ticketMedio)}
            </p>
            <p className="text-[10px] text-zinc-400">Média por pedido</p>
          </div>
        </div>

        {/* FORMA DE PAGAMENTO BREAKDOWN */}
        <div className="p-4 sm:p-5 bg-[#161822] rounded-2xl border border-white/10 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Totais por Forma de Pagamento ({currentMonthLabel})</span>
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono">100% das vendas contabilizadas</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {(Object.entries(paymentStats) as Array<[keyof typeof paymentStats, typeof paymentStats.pix]>).map(([key, item]) => {
              const percentage = totalRevenue > 0 ? ((item.total / totalRevenue) * 100).toFixed(1) : '0';
              const IconComp = item.icon;

              return (
                <div
                  key={key}
                  className={`p-3 rounded-xl border ${item.bg} ${item.border} space-y-1 flex flex-col justify-between`}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-300">
                    <div className="flex items-center gap-1.5">
                      <IconComp className={`w-3.5 h-3.5 ${item.color}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{percentage}%</span>
                  </div>

                  <p className={`text-base font-black ${item.color} truncate`}>
                    {formatCurrency(item.total)}
                  </p>

                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color.replace('text-', 'bg-')}`}
                      style={{ width: `${Math.min(100, Math.max(0, Number(percentage)))}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-zinc-400 font-mono">
                    {item.count} {item.count === 1 ? 'venda' : 'vendas'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* TOP SELLING KNIVES RANKING */}
        <div className="p-4 bg-[#161822] rounded-2xl border border-white/10 space-y-3 text-left">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Ranking dos Modelos Mais Vendidos no Mês</span>
          </h3>

          {topSellingKnives.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">Nenhuma venda registrada neste mês.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topSellingKnives.map((k, idx) => (
                <div
                  key={k.code || idx}
                  className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">{k.name}</p>
                      <span className="text-[10px] text-amber-400 font-mono">CÓD: {k.code}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-black text-amber-300">{formatCurrency(k.total)}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">{k.count} un. vendidas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DETAILED MONTHLY SALES LIST */}
        <div className="space-y-3 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Detalhamento de Vendas ({filteredSalesList.length} de {monthSales.length})
            </h3>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
              <span className="text-[10px] text-zinc-500 font-bold uppercase shrink-0">Forma:</span>
              <button
                type="button"
                onClick={() => setSelectedPaymentFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  selectedPaymentFilter === 'all'
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentFilter('pix')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  selectedPaymentFilter === 'pix'
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                PIX
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentFilter('cartao_credito')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  selectedPaymentFilter === 'cartao_credito'
                    ? 'bg-purple-500 text-black'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Crédito
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentFilter('cartao_debito')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  selectedPaymentFilter === 'cartao_debito'
                    ? 'bg-blue-500 text-black'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Débito
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentFilter('dinheiro')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  selectedPaymentFilter === 'dinheiro'
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Dinheiro
              </button>
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 no-scrollbar">
            {filteredSalesList.length === 0 ? (
              <p className="p-4 text-center text-xs text-zinc-500 bg-[#161822] rounded-xl border border-white/5">
                Nenhuma venda encontrada para os filtros selecionados.
              </p>
            ) : (
              filteredSalesList.map((item) => {
                const pm = item.paymentMethod || 'pix';
                const pmInfo = paymentStats[pm as keyof typeof paymentStats] || paymentStats.pix;

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#161822] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          CÓD: {item.code}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {item.soldAt}
                        </span>
                        {item.customerName && (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            👤 {item.customerName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white mt-1">{item.name}</p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${pmInfo.bg} ${pmInfo.color} ${pmInfo.border}`}>
                        {pmInfo.label}
                      </span>
                      <span className="font-extrabold text-amber-400 text-sm">
                        {formatCurrency(Number(item.price) || 0)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
