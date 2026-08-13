import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleRecord, PaymentMethod } from './salesStorage';

export interface ReportPdfData {
  monthLabel: string;
  monthKey: string;
  sales: SaleRecord[];
  totalRevenue: number;
  totalQuantity: number;
  ticketMedio: number;
  uniqueCustomers: number;
  paymentStats: {
    pix: { label: string; count: number; total: number };
    cartao_credito: { label: string; count: number; total: number };
    cartao_debito: { label: string; count: number; total: number };
    dinheiro: { label: string; count: number; total: number };
    outros: { label: string; count: number; total: number };
  };
  topSellingKnives: Array<{
    code: string;
    name: string;
    count: number;
    total: number;
  }>;
}

const formatCurrencyBRL = (val: number) => {
  return (Number(val) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const getPaymentLabel = (pm?: PaymentMethod | string): string => {
  switch (pm) {
    case 'pix':
      return 'PIX ⚡';
    case 'cartao_credito':
      return 'Crédito 💳';
    case 'cartao_debito':
      return 'Débito 💳';
    case 'dinheiro':
      return 'Dinheiro 💵';
    case 'outros':
      return 'Outros / Fiado 🔄';
    default:
      return 'PIX ⚡';
  }
};

export function downloadSalesReportPdf(data: ReportPdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const now = new Date();
  const emissionDateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const emissionTimeStr = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // --- 1. HEADER BANNER (Luxury Dark Charcoal & Gold Accent) ---
  doc.setFillColor(18, 20, 28);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Gold accent strip at bottom of header
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('FRONTEIRA CUTELARIA ARTESANAL', margin, 13);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(200, 200, 210);
  doc.text('RELATÓRIO MENSAL EXECUTIVO DE VENDAS & FECHAMENTO', margin, 19);

  // Tag / Month Reference (Header Right)
  doc.setFillColor(35, 38, 52);
  doc.roundedRect(pageWidth - margin - 72, 7, 72, 17, 2, 2, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 158, 11);
  doc.text(`MÊS: ${data.monthLabel.toUpperCase()}`, pageWidth - margin - 68, 13);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 165, 180);
  doc.text(`Emitido em: ${emissionDateStr} às ${emissionTimeStr}`, pageWidth - margin - 68, 20);

  // Meta row below header
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(180, 185, 200);
  doc.text(
    `Período de referência: ${data.monthLabel} • Registros processados: ${data.sales.length} vendas`,
    margin,
    30
  );

  let currentY = 44;

  // --- 2. EXECUTIVE KPI SUMMARY CARDS (4 Colorful Cards) ---
  const cardGap = 3.5;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 3) / 4;
  const cardHeight = 22;

  const kpis = [
    {
      title: 'FATURAMENTO',
      value: formatCurrencyBRL(data.totalRevenue),
      sub: `${data.totalQuantity} peças`,
      bg: [240, 253, 244], // Emerald-50
      border: [110, 231, 183], // Emerald-300
      text: [4, 120, 87], // Emerald-700
      accent: [5, 150, 105],
    },
    {
      title: 'PEÇAS VENDIDAS',
      value: `${data.totalQuantity} un.`,
      sub: 'Volume total',
      bg: [254, 252, 232], // Amber-50
      border: [252, 211, 77], // Amber-300
      text: [180, 83, 9], // Amber-700
      accent: [217, 119, 6],
    },
    {
      title: 'CLIENTES',
      value: `${data.uniqueCustomers}`,
      sub: 'Compradores únicos',
      bg: [239, 246, 255], // Blue-50
      border: [147, 197, 253], // Blue-300
      text: [29, 78, 216], // Blue-700
      accent: [37, 99, 235],
    },
    {
      title: 'TICKET MÉDIO',
      value: formatCurrencyBRL(data.ticketMedio),
      sub: 'Média por peça',
      bg: [250, 245, 255], // Purple-50
      border: [216, 180, 254], // Purple-300
      text: [109, 40, 217], // Purple-700
      accent: [126, 34, 206],
    },
  ];

  kpis.forEach((kpi, index) => {
    const cardX = margin + index * (cardWidth + cardGap);
    
    // Background
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    // Accent top bar
    doc.setFillColor(kpi.accent[0], kpi.accent[1], kpi.accent[2]);
    doc.rect(cardX, currentY, cardWidth, 1.8, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.title, cardX + 3, currentY + 5.5);

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(18, 20, 28);
    doc.text(kpi.value, cardX + 3, currentY + 12);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 110, 125);
    doc.text(kpi.sub, cardX + 3, currentY + 18);
  });

  currentY += cardHeight + 6;

  // --- 3. SECTION: FORMAS DE PAGAMENTO & TOP FACAS (Side-by-side or stacked tables) ---
  const paymentRows = [
    [
      'PIX',
      `${data.paymentStats.pix.count} un.`,
      formatCurrencyBRL(data.paymentStats.pix.total),
      data.totalRevenue > 0 ? `${((data.paymentStats.pix.total / data.totalRevenue) * 100).toFixed(1)}%` : '0%',
    ],
    [
      'Cartão de Crédito',
      `${data.paymentStats.cartao_credito.count} un.`,
      formatCurrencyBRL(data.paymentStats.cartao_credito.total),
      data.totalRevenue > 0 ? `${((data.paymentStats.cartao_credito.total / data.totalRevenue) * 100).toFixed(1)}%` : '0%',
    ],
    [
      'Cartão de Débito',
      `${data.paymentStats.cartao_debito.count} un.`,
      formatCurrencyBRL(data.paymentStats.cartao_debito.total),
      data.totalRevenue > 0 ? `${((data.paymentStats.cartao_debito.total / data.totalRevenue) * 100).toFixed(1)}%` : '0%',
    ],
    [
      'Dinheiro',
      `${data.paymentStats.dinheiro.count} un.`,
      formatCurrencyBRL(data.paymentStats.dinheiro.total),
      data.totalRevenue > 0 ? `${((data.paymentStats.dinheiro.total / data.totalRevenue) * 100).toFixed(1)}%` : '0%',
    ],
    [
      'Outros / Fiado',
      `${data.paymentStats.outros.count} un.`,
      formatCurrencyBRL(data.paymentStats.outros.total),
      data.totalRevenue > 0 ? `${((data.paymentStats.outros.total / data.totalRevenue) * 100).toFixed(1)}%` : '0%',
    ],
  ];

  // Section Header: Formas de Pagamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 20, 28);
  doc.text('1. Fechamento por Forma de Pagamento', margin, currentY);
  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [['Forma de Pagamento', 'Qtd Vendas', 'Faturamento Total', '% do Faturamento']],
    body: paymentRows,
    foot: [
      [
        'TOTAL GERAL',
        `${data.totalQuantity} un.`,
        formatCurrencyBRL(data.totalRevenue),
        '100.0%',
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 50 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 7;

  // Section Header: Top Facas Mais Vendidas (if any)
  if (data.topSellingKnives.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(18, 20, 28);
    doc.text('2. Facas Mais Vendidas no Mês', margin, currentY);
    currentY += 2;

    const topRows = data.topSellingKnives.map((k, index) => [
      `${index + 1}º`,
      k.code,
      k.name,
      `${k.count} un.`,
      formatCurrencyBRL(k.total),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Posição', 'Código', 'Modelo da Faca', 'Qtd Vendida', 'Total Faturado']],
      body: topRows,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [217, 119, 6], // Amber-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 38, fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 7;
  }

  // --- 4. SECTION: EXTRATO COMPLETO DE VENDAS DO MÊS ---
  // If remaining space is tight (< 45mm), trigger page break cleanly
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(18, 20, 28);
  doc.text('3. Extrato Detalhado de Vendas do Mês', margin, currentY);
  currentY += 2;

  const salesRows = data.sales.map((s) => [
    s.soldAt || (s.timestamp ? new Date(s.timestamp).toLocaleDateString('pt-BR') : '-'),
    s.code || 'FC-000',
    s.name || 'Faca Artesanal',
    s.customerName ? `${s.customerName}${s.customerWhatsapp ? ` (${s.customerWhatsapp})` : ''}` : 'Balcão / Anônimo',
    getPaymentLabel(s.paymentMethod),
    formatCurrencyBRL(s.price),
  ]);

  if (salesRows.length === 0) {
    salesRows.push(['-', '-', 'Nenhuma venda registrada neste mês', '-', '-', 'R$ 0,00']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Data / Hora', 'Código', 'Modelo da Faca', 'Cliente / WhatsApp', 'Pagamento', 'Valor']],
    body: salesRows,
    foot: [
      [
        'TOTAL',
        '',
        `${data.totalQuantity} facas vendidas`,
        `${data.uniqueCustomers} clientes`,
        '',
        formatCurrencyBRL(data.totalRevenue),
      ],
    ],
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [18, 20, 28],
      textColor: [245, 158, 11], // Gold text
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 26, fontSize: 7 },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 48 },
      3: { cellWidth: 42 },
      4: { cellWidth: 24, fontSize: 7 },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    margin: { left: margin, right: margin, bottom: 16 },
    didDrawPage: () => {
      // Add standard footer to each page
      const totalPages = (doc.internal as any).getNumberOfPages();
      const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 145, 160);

      // Left footer
      doc.text(
        'Fronteira Cutelaria Artesanal • Sistema de Gestão Comercial Integrado',
        margin,
        pageHeight - 7
      );

      // Right footer
      doc.text(
        `Página ${currentPage} de ${totalPages}`,
        pageWidth - margin - 20,
        pageHeight - 7
      );

      // Subtle bottom divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    },
  });

  // Build clean sanitized filename
  const cleanMonthKey = (data.monthKey || 'mes-atual').replace(/[^a-zA-Z0-9-]/g, '-');
  const filename = `relatorio-vendas-fronteira-${cleanMonthKey}.pdf`;

  // Download directly
  doc.save(filename);
}
