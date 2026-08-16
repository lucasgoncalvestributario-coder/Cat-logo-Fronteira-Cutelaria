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
  Copy,
  Printer,
  Check,
  Award,
  Search,
  Filter,
  Download,
  FileText,
  Tag,
  Percent
} from 'lucide-react';
import { getStoredSalesLog, SaleRecord, PaymentMethod } from '../lib/salesStorage';
import { downloadSalesReportPdf, downloadAnnualSalesReportPdf } from '../lib/pdfReportGenerator';

interface SalesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaymentStatItem {
  label: string;
  count: number;
  total: number;
  icon: any;
  color: string;
  bg: string;
  border: string;
}

export function SalesReportModal({ isOpen, onClose }: SalesReportModalProps) {
  const [reportMode, setReportMode] = useState<'mensal' | 'anual'>('mensal');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('current');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);

  const allSales = useMemo(() => {
    return getStoredSalesLog();
  }, [isOpen]);

  // Extract available months from sales history
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; key: string; year: string }>();

    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    monthMap.set(currentKey, {
      key: currentKey,
      label: currentLabel.charAt(0).toUpperCase() + currentLabel.slice(1),
      year: now.getFullYear().toString(),
    });

    for (const sale of allSales) {
      if (sale.timestamp) {
        const d = new Date(sale.timestamp);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const lbl = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        monthMap.set(k, {
          key: k,
          label: lbl.charAt(0).toUpperCase() + lbl.slice(1),
          year: d.getFullYear().toString(),
        });
      }
    }

    return Array.from(monthMap.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [allSales]);

  // Extract available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    for (const sale of allSales) {
      if (sale.timestamp) {
        const d = new Date(sale.timestamp);
        years.add(d.getFullYear().toString());
      }
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [allSales]);

  // Set initial selected month
  const activeMonthKey = selectedMonthKey === 'current' ? (availableMonths[0]?.key || '') : selectedMonthKey;
  const activeMonthObj = availableMonths.find((m) => m.key === activeMonthKey) || availableMonths[0];
  const activeMonthLabel = activeMonthObj ? activeMonthObj.label : 'Mês Atual';

  // Filter sales for active month
  const monthSales = useMemo(() => {
    return allSales.filter((s) => {
      if (!s.timestamp) return true;
      const d = new Date(s.timestamp);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return k === activeMonthKey;
    });
  }, [allSales, activeMonthKey]);

  // Filter sales for active year
  const yearSales = useMemo(() => {
    return allSales.filter((s) => {
      if (!s.timestamp) return true;
      const d = new Date(s.timestamp);
      return d.getFullYear().toString() === selectedYear;
    });
  }, [allSales, selectedYear]);

  // Monthly metrics
  const totalRevenueMonth = monthSales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  const totalQuantityMonth = monthSales.length;
  const totalDiscountMonth = monthSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
  const ticketMedioMonth = totalQuantityMonth > 0 ? totalRevenueMonth / totalQuantityMonth : 0;

  // Annual metrics
  const totalRevenueYear = yearSales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
  const totalQuantityYear = yearSales.length;
  const totalDiscountYear = yearSales.reduce((acc, s) => acc + (Number(s.discount) || 0), 0);
  const ticketMedioYear = totalQuantityYear > 0 ? totalRevenueYear / totalQuantityYear : 0;

  // Annual Month-by-Month breakdown
  const annualMonthlyBreakdown = useMemo(() => {
    const monthsData = [
      { num: 1, name: 'Janeiro' },
      { num: 2, name: 'Fevereiro' },
      { num: 3, name: 'Março' },
      { num: 4, name: 'Abril' },
      { num: 5, name: 'Maio' },
      { num: 6, name: 'Junho' },
      { num: 7, name: 'Julho' },
      { num: 8, name: 'Agosto' },
      { num: 9, name: 'Setembro' },
      { num: 10, name: 'Outubro' },
      { num: 11, name: 'Novembro' },
      { num: 12, name: 'Dezembro' },
    ];

    return monthsData.map((m) => {
      const monthKey = `${selectedYear}-${String(m.num).padStart(2, '0')}`;
      const salesInMonth = yearSales.filter((s) => {
        if (!s.timestamp) return false;
        const d = new Date(s.timestamp);
        return d.getMonth() + 1 === m.num && d.getFullYear().toString() === selectedYear;
      });

      const total = salesInMonth.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
      const count = salesInMonth.length;
      const ticket = count > 0 ? total / count : 0;
      const percentage = totalRevenueYear > 0 ? (total / totalRevenueYear) * 100 : 0;

      return {
        monthKey,
        monthName: m.name,
        count,
        total,
        ticketMedio: ticket,
        percentage,
      };
    });
  }, [yearSales, selectedYear, totalRevenueYear]);

  // Payment methods breakdown for active month
  const paymentStatsMonth = useMemo<Record<string, PaymentStatItem>>(() => {
    const stats: Record<string, PaymentStatItem> = {
      pix: { label: 'PIX', count: 0, total: 0, icon: QrCode, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
      cartao_credito: { label: 'Crédito', count: 0, total: 0, icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
      cartao_debito: { label: 'Débito', count: 0, total: 0, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      dinheiro: { label: 'Dinheiro', count: 0, total: 0, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
      outros: { label: 'Outros', count: 0, total: 0, icon: Wallet, color: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
    };

    for (const sale of monthSales) {
      const pm = (sale.paymentMethod || 'pix') as PaymentMethod;
      if (stats[pm]) {
        stats[pm].count += 1;
        stats[pm].total += Number(sale.price) || 0;
      }
    }

    return stats;
  }, [monthSales]);

  // Payment methods breakdown for active year
  const paymentStatsYear = useMemo<Record<string, PaymentStatItem>>(() => {
    const stats: Record<string, PaymentStatItem> = {
      pix: { label: 'PIX', count: 0, total: 0, icon: QrCode, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
      cartao_credito: { label: 'Crédito', count: 0, total: 0, icon: CreditCard, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
      cartao_debito: { label: 'Débito', count: 0, total: 0, icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
      dinheiro: { label: 'Dinheiro', count: 0, total: 0, icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
      outros: { label: 'Outros', count: 0, total: 0, icon: Wallet, color: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30' },
    };

    for (const sale of yearSales) {
      const pm = (sale.paymentMethod || 'pix') as PaymentMethod;
      if (stats[pm]) {
        stats[pm].count += 1;
        stats[pm].total += Number(sale.price) || 0;
      }
    }

    return stats;
  }, [yearSales]);

  // Top selling knives in active month
  const topSellingKnivesMonth = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number; total: number }>();
    for (const sale of monthSales) {
      const key = sale.code || sale.knifeId;
      const current = map.get(key) || { code: sale.code || 'FC-000', name: sale.name || 'Faca Artesanal', count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.price) || 0;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 5);
  }, [monthSales]);

  // Top selling knives in active year
  const topSellingKnivesYear = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number; total: number }>();
    for (const sale of yearSales) {
      const key = sale.code || sale.knifeId;
      const current = map.get(key) || { code: sale.code || 'FC-000', name: sale.name || 'Faca Artesanal', count: 0, total: 0 };
      current.count += 1;
      current.total += Number(sale.price) || 0;
      map.set(key, current);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 10);
  }, [yearSales]);

  // Filtered sales list for detailed view table
  const activeDataset = reportMode === 'mensal' ? monthSales : yearSales;
  const filteredSales = useMemo(() => {
    return activeDataset.filter((s) => {
      if (selectedPaymentFilter !== 'all') {
        const pm = s.paymentMethod || 'pix';
        if (pm !== selectedPaymentFilter) return false;
      }

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchCode = (s.code || '').toLowerCase().includes(q);
        const matchName = (s.name || '').toLowerCase().includes(q);
        const matchCat = (s.category || '').toLowerCase().includes(q);
        return matchCode || matchName || matchCat;
      }

      return true;
    });
  }, [activeDataset, selectedPaymentFilter, searchFilter]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return (Number(val) || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      if (reportMode === 'mensal') {
        downloadSalesReportPdf({
          monthLabel: activeMonthLabel,
          monthKey: activeMonthKey,
          sales: monthSales,
          totalRevenue: totalRevenueMonth,
          totalQuantity: totalQuantityMonth,
          totalDiscount: totalDiscountMonth,
          ticketMedio: ticketMedioMonth,
          paymentStats: paymentStatsMonth,
          topSellingKnives: topSellingKnivesMonth,
        });
      } else {
        downloadAnnualSalesReportPdf({
          year: selectedYear,
          sales: yearSales,
          totalRevenue: totalRevenueYear,
          totalQuantity: totalQuantityYear,
          totalDiscount: totalDiscountYear,
          ticketMedio: ticketMedioYear,
          monthlyBreakdown: annualMonthlyBreakdown,
          paymentStats: paymentStatsYear,
          topSellingKnives: topSellingKnivesYear,
        });
      }

      setPdfDownloaded(true);
      setTimeout(() => setPdfDownloaded(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopySummary = () => {
    let text = '';
    if (reportMode === 'mensal') {
      text = `📊 FECHAMENTO MENSAL - ${activeMonthLabel.toUpperCase()}\n` +
        `----------------------------------------\n` +
        `💰 Faturamento Total: ${formatCurrency(totalRevenueMonth)}\n` +
        `🗡️ Peças Vendidas: ${totalQuantityMonth} unidades\n` +
        `🏷️ Descontos Concedidos: ${formatCurrency(totalDiscountMonth)}\n` +
        `📈 Ticket Médio: ${formatCurrency(ticketMedioMonth)}\n\n` +
        `💳 Formas de Pagamento:\n` +
        `• PIX: ${paymentStatsMonth.pix.count} un. (${formatCurrency(paymentStatsMonth.pix.total)})\n` +
        `• Cartão de Crédito: ${paymentStatsMonth.cartao_credito.count} un. (${formatCurrency(paymentStatsMonth.cartao_credito.total)})\n` +
        `• Cartão de Débito: ${paymentStatsMonth.cartao_debito.count} un. (${formatCurrency(paymentStatsMonth.cartao_debito.total)})\n` +
        `• Dinheiro: ${paymentStatsMonth.dinheiro.count} un. (${formatCurrency(paymentStatsMonth.dinheiro.total)})\n` +
        `• Outros: ${paymentStatsMonth.outros.count} un. (${formatCurrency(paymentStatsMonth.outros.total)})\n` +
        `----------------------------------------\n` +
        `Fronteira Cutelaria Artesanal`;
    } else {
      text = `📊 RELATÓRIO ANUAL DE VENDAS - ANO ${selectedYear}\n` +
        `----------------------------------------\n` +
        `💰 Faturamento Anual: ${formatCurrency(totalRevenueYear)}\n` +
        `🗡️ Total de Peças: ${totalQuantityYear} unidades\n` +
        `🏷️ Total de Descontos: ${formatCurrency(totalDiscountYear)}\n` +
        `📈 Ticket Médio Anual: ${formatCurrency(ticketMedioYear)}\n\n` +
        `📅 Resumo Mês a Mês:\n` +
        annualMonthlyBreakdown
          .filter((m) => m.count > 0)
          .map((m) => `• ${m.monthName}: ${m.count} un. | ${formatCurrency(m.total)} (${m.percentage.toFixed(1)}%)`)
          .join('\n') +
        `\n----------------------------------------\n` +
        `Fronteira Cutelaria Artesanal`;
    }

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div
      id="sales-report-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#0f1118] border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 my-auto relative text-zinc-100 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/25">
              <FileBarChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white tracking-wide">
                Relatório Gerencial de Vendas
              </h2>
              <p className="text-xs text-zinc-400">
                Acompanhamento financeiro, fechamento de caixa e demonstrativos comparativos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector (Mensal vs Anual) & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#161824] rounded-2xl border border-white/10 shrink-0">
          {/* Tabs: Mensal | Anual */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
            <button
              onClick={() => setReportMode('mensal')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                reportMode === 'mensal'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Relatório Mensal
            </button>

            <button
              onClick={() => setReportMode('anual')}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                reportMode === 'anual'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Relatório Anual Consolidado
            </button>
          </div>

          {/* Period Selector (Month selector or Year selector) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {reportMode === 'mensal' ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-zinc-400 uppercase shrink-0">
                  Mês:
                </span>
                <select
                  value={activeMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key} className="bg-zinc-900 text-white">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-zinc-400 uppercase shrink-0">
                  Exercício / Ano:
                </span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 rounded-xl bg-black/60 border border-amber-500/40 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-zinc-900 text-white">
                      Ano {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quick Actions (Copy summary & Download PDF) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopySummary}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
                title="Copiar Resumo em Texto"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{pdfDownloaded ? 'Baixado!' : reportMode === 'mensal' ? 'PDF Mensal' : 'PDF Anual'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Card 1: Faturamento */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#161824] border border-emerald-500/40 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {reportMode === 'mensal' ? 'Faturamento do Mês' : `Faturamento (${selectedYear})`}
                </span>
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatCurrency(reportMode === 'mensal' ? totalRevenueMonth : totalRevenueYear)}
              </span>
              <span className="text-[11px] text-zinc-400">
                {reportMode === 'mensal' ? `${totalQuantityMonth} facas vendidas` : `${totalQuantityYear} facas vendidas no ano`}
              </span>
            </div>

            {/* Card 2: Peças Vendidas */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161824] border border-white/10 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-amber-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Volume Comercializado
                </span>
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-white">
                {reportMode === 'mensal' ? totalQuantityMonth : totalQuantityYear}{' '}
                <span className="text-xs text-zinc-400 font-normal">unidades</span>
              </span>
              <span className="text-[11px] text-amber-400 font-medium">
                {reportMode === 'mensal' ? activeMonthLabel : `Exercício ${selectedYear}`}
              </span>
            </div>

            {/* Card 3: Descontos */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161824] border border-white/10 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-blue-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Descontos Concedidos
                </span>
                <Tag className="w-4 h-4" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatCurrency(reportMode === 'mensal' ? totalDiscountMonth : totalDiscountYear)}
              </span>
              <span className="text-[11px] text-zinc-400">
                Margem negociada
              </span>
            </div>

            {/* Card 4: Ticket Médio */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-[#161824] border border-white/10 flex flex-col justify-between space-y-1">
              <div className="flex items-center justify-between text-purple-400">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Ticket Médio
                </span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-white">
                {formatCurrency(reportMode === 'mensal' ? ticketMedioMonth : ticketMedioYear)}
              </span>
              <span className="text-[11px] text-zinc-400">
                Média por faca
              </span>
            </div>
          </div>

          {/* Mode-specific Breakdown Section */}
          {reportMode === 'anual' ? (
            /* ANNUAL: Demonstrativo Mês a Mês do Ano */
            <div className="p-4 rounded-2xl bg-[#161824] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>Comparativo Mensal de Vendas ({selectedYear})</span>
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  Total: {formatCurrency(totalRevenueYear)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {annualMonthlyBreakdown.map((m) => (
                  <div
                    key={m.monthKey}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      m.count > 0
                        ? 'bg-black/40 border-amber-500/30'
                        : 'bg-black/20 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{m.monthName}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 font-mono">
                        {m.count} un.
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-sm font-black text-emerald-400">
                        {formatCurrency(m.total)}
                      </span>
                      {m.percentage > 0 && (
                        <span className="text-[10px] text-amber-400 font-mono">
                          {m.percentage.toFixed(1)}% do ano
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* MENSAL: Formas de Pagamento & Top Facas */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Formas de Pagamento */}
              <div className="p-4 rounded-2xl bg-[#161824] border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Formas de Pagamento ({activeMonthLabel})</span>
                </h3>

                <div className="space-y-2">
                  {Object.entries(paymentStatsMonth).map(([key, item]: [string, PaymentStatItem]) => {
                    const pct = totalRevenueMonth > 0 ? (item.total / totalRevenueMonth) * 100 : 0;
                    const IconComp = item.icon;
                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg ${item.bg} ${item.color}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">{item.label}</span>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {item.count} venda(s) • {pct.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Facas Mais Vendidas */}
              <div className="p-4 rounded-2xl bg-[#161824] border border-white/10 space-y-3">
                <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Facas Mais Vendidas no Mês</span>
                </h3>

                <div className="space-y-2">
                  {topSellingKnivesMonth.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-6 text-center">
                      Nenhuma venda registrada neste mês.
                    </p>
                  ) : (
                    topSellingKnivesMonth.map((knife, idx) => (
                      <div
                        key={knife.code}
                        className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center border border-amber-500/30">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white">{knife.name}</span>
                            <div className="text-[10px] text-amber-400 font-mono">
                              CÓD: {knife.code} • {knife.count} un. vendida(s)
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-black text-emerald-400 font-mono">
                          {formatCurrency(knife.total)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Sales List Table */}
          <div className="p-4 rounded-2xl bg-[#161824] border border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>
                  Extrato Detalhado de Vendas ({reportMode === 'mensal' ? activeMonthLabel : `Ano ${selectedYear}`})
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                  {filteredSales.length} registros
                </span>
              </h3>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar por código ou modelo..."
                    className="pl-8 pr-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={selectedPaymentFilter}
                  onChange={(e) => setSelectedPaymentFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todas Formas</option>
                  <option value="pix">PIX</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
            </div>

            {/* Sales Table */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400 text-[11px] uppercase">
                    <th className="py-2 px-3 font-semibold">Data / Hora</th>
                    <th className="py-2 px-3 font-semibold">Código</th>
                    <th className="py-2 px-3 font-semibold">Modelo da Faca</th>
                    <th className="py-2 px-3 font-semibold">Categoria</th>
                    <th className="py-2 px-3 font-semibold">Preço Catálogo</th>
                    <th className="py-2 px-3 font-semibold">Desconto</th>
                    <th className="py-2 px-3 font-semibold">Pagamento</th>
                    <th className="py-2 px-3 font-semibold text-right">Valor Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500">
                        Nenhuma venda encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                          {sale.soldAt}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                          {sale.code}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-white">
                          {sale.name}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px] uppercase">
                          {sale.category || 'Geral'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">
                          {sale.originalPrice ? formatCurrency(sale.originalPrice) : '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-400">
                          {sale.discount && sale.discount > 0 ? formatCurrency(sale.discount) : '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-zinc-300 uppercase">
                            {sale.paymentMethod || 'PIX'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-black text-emerald-400 text-right">
                          {formatCurrency(sale.price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <span>Fronteira Cutelaria Artesanal • Relatórios e Controle de Vendas</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs uppercase cursor-pointer transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
