import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SaleRecord, PaymentMethod } from './salesStorage';

export interface ReportPdfData {
  monthLabel: string;
  monthKey: string;
  sales: SaleRecord[];
  totalRevenue: number;
  totalQuantity: number;
  totalDiscount: number;
  ticketMedio: number;
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

export interface AnnualReportPdfData {
  year: string;
  sales: SaleRecord[];
  totalRevenue: number;
  totalQuantity: number;
  totalDiscount: number;
  ticketMedio: number;
  monthlyBreakdown: Array<{
    monthKey: string;
    monthName: string;
    count: number;
    total: number;
    ticketMedio: number;
    percentage: number;
  }>;
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
      return 'PIX';
    case 'cartao_credito':
      return 'C. Crédito';
    case 'cartao_debito':
      return 'C. Débito';
    case 'dinheiro':
      return 'Dinheiro';
    case 'outros':
      return 'Outros';
    default:
      return 'PIX';
  }
};

/**
 * Generates and downloads the Monthly Sales Executive Report PDF
 */
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

  // --- 1. HEADER BANNER ---
  doc.setFillColor(18, 20, 28);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Gold accent strip at bottom of header
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FRONTEIRA CUTELARIA ARTESANAL', margin, 13);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 210);
  doc.text('RELATÓRIO MENSAL DE VENDAS & FECHAMENTO', margin, 19);

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
    `Período de referência: ${data.monthLabel} • Volume processado: ${data.sales.length} vendas`,
    margin,
    30
  );

  let currentY = 43;

  // --- 2. KPI SUMMARY CARDS (4 Cards) ---
  const cardGap = 3.5;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 3) / 4;
  const cardHeight = 22;

  const kpis = [
    {
      title: 'FATURAMENTO',
      value: formatCurrencyBRL(data.totalRevenue),
      sub: `${data.totalQuantity} peças vendidas`,
      bg: [240, 253, 244], // Emerald-50
      border: [110, 231, 183],
      text: [4, 120, 87],
      accent: [5, 150, 105],
    },
    {
      title: 'PEÇAS VENDIDAS',
      value: `${data.totalQuantity} un.`,
      sub: 'Volume total do mês',
      bg: [254, 252, 232], // Amber-50
      border: [252, 211, 77],
      text: [180, 83, 9],
      accent: [217, 119, 6],
    },
    {
      title: 'DESCONTOS CONCEDIDOS',
      value: formatCurrencyBRL(data.totalDiscount || 0),
      sub: 'Margem negociada',
      bg: [239, 246, 255], // Blue-50
      border: [147, 197, 253],
      text: [29, 78, 216],
      accent: [37, 99, 235],
    },
    {
      title: 'TICKET MÉDIO',
      value: formatCurrencyBRL(data.ticketMedio),
      sub: 'Média por faca',
      bg: [250, 245, 255], // Purple-50
      border: [216, 180, 254],
      text: [109, 40, 217],
      accent: [126, 34, 206],
    },
  ];

  kpis.forEach((kpi, index) => {
    const cardX = margin + index * (cardWidth + cardGap);

    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFillColor(kpi.accent[0], kpi.accent[1], kpi.accent[2]);
    doc.rect(cardX, currentY, cardWidth, 1.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.title, cardX + 3, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(18, 20, 28);
    doc.text(kpi.value, cardX + 3, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 110, 125);
    doc.text(kpi.sub, cardX + 3, currentY + 18);
  });

  currentY += cardHeight + 6;

  // --- 3. SECTION: FORMAS DE PAGAMENTO ---
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
      'Outros / Transferência',
      `${data.paymentStats.outros.count} un.`,
      formatCurrencyBRL(data.paymentStats.outros.total),
      data.totalRevenue > 0 ? `${((data.paymentStats.outros.total / data.totalRevenue) * 100).toFixed(1)}%` : '0%',
    ],
  ];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
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
  currentY = doc.lastAutoTable.finalY + 6;

  // --- 4. TOP FACAS MAIS VENDIDAS ---
  if (data.topSellingKnives.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
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
        fillColor: [217, 119, 6],
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
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // --- 5. EXTRATO COMPLETO DE VENDAS DO MÊS ---
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 20, 28);
  doc.text('3. Extrato Detalhado de Vendas do Mês', margin, currentY);
  currentY += 2;

  const salesRows = data.sales.map((s) => [
    s.soldAt || (s.timestamp ? new Date(s.timestamp).toLocaleDateString('pt-BR') : '-'),
    s.code || 'FC-000',
    s.name || 'Faca Artesanal',
    s.category || 'Geral',
    s.originalPrice && s.originalPrice !== s.price ? formatCurrencyBRL(s.originalPrice) : '-',
    s.discount && s.discount > 0 ? formatCurrencyBRL(s.discount) : '-',
    getPaymentLabel(s.paymentMethod),
    formatCurrencyBRL(s.price),
  ]);

  if (salesRows.length === 0) {
    salesRows.push(['-', '-', 'Nenhuma venda registrada neste mês', '-', '-', '-', '-', 'R$ 0,00']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Data/Hora', 'Código', 'Modelo da Faca', 'Categoria', 'Preço Cat.', 'Desconto', 'Pagto', 'Valor Final']],
    body: salesRows,
    foot: [
      [
        'TOTAL',
        '',
        `${data.totalQuantity} facas vendidas`,
        '',
        '',
        formatCurrencyBRL(data.totalDiscount || 0),
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
      textColor: [245, 158, 11],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 26, fontSize: 7 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 22 },
      4: { halign: 'right', cellWidth: 20, fontSize: 7 },
      5: { halign: 'right', cellWidth: 20, fontSize: 7, textColor: [180, 83, 9] },
      6: { cellWidth: 20, fontSize: 7 },
      7: { halign: 'right', cellWidth: 24, fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    margin: { left: margin, right: margin, bottom: 16 },
    didDrawPage: () => {
      const totalPages = (doc.internal as any).getNumberOfPages();
      const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 145, 160);

      doc.text(
        'Fronteira Cutelaria Artesanal • Registro e Relatório de Vendas',
        margin,
        pageHeight - 7
      );

      doc.text(
        `Página ${currentPage} de ${totalPages}`,
        pageWidth - margin - 20,
        pageHeight - 7
      );

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    },
  });

  const cleanMonthKey = (data.monthKey || 'mes-atual').replace(/[^a-zA-Z0-9-]/g, '-');
  const filename = `relatorio-vendas-fronteira-${cleanMonthKey}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads the Annual Consolidated Sales Report PDF
 */
export function downloadAnnualSalesReportPdf(data: AnnualReportPdfData): void {
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

  // --- 1. HEADER BANNER ---
  doc.setFillColor(18, 20, 28);
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Gold accent strip at bottom of header
  doc.setFillColor(245, 158, 11);
  doc.rect(0, 36, pageWidth, 2, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FRONTEIRA CUTELARIA ARTESANAL', margin, 13);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 210);
  doc.text('RELATÓRIO ANUAL CONSOLIDADO DE VENDAS', margin, 19);

  // Tag / Year Reference (Header Right)
  doc.setFillColor(35, 38, 52);
  doc.roundedRect(pageWidth - margin - 72, 7, 72, 17, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(245, 158, 11);
  doc.text(`EXERCÍCIO ANUAL: ${data.year}`, pageWidth - margin - 68, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(160, 165, 180);
  doc.text(`Emitido em: ${emissionDateStr} às ${emissionTimeStr}`, pageWidth - margin - 68, 20);

  // Meta row below header
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(180, 185, 200);
  doc.text(
    `Consolidação de vendas do ano de ${data.year} • Total de ${data.totalQuantity} peças comercializadas`,
    margin,
    30
  );

  let currentY = 43;

  // --- 2. KPI SUMMARY CARDS (4 Cards) ---
  const cardGap = 3.5;
  const cardWidth = (pageWidth - margin * 2 - cardGap * 3) / 4;
  const cardHeight = 22;

  const kpis = [
    {
      title: 'FATURAMENTO ANUAL',
      value: formatCurrencyBRL(data.totalRevenue),
      sub: `${data.totalQuantity} facas no total`,
      bg: [240, 253, 244],
      border: [110, 231, 183],
      text: [4, 120, 87],
      accent: [5, 150, 105],
    },
    {
      title: 'TOTAL DE PEÇAS',
      value: `${data.totalQuantity} un.`,
      sub: 'Volume anual comercializado',
      bg: [254, 252, 232],
      border: [252, 211, 77],
      text: [180, 83, 9],
      accent: [217, 119, 6],
    },
    {
      title: 'DESCONTOS DO ANO',
      value: formatCurrencyBRL(data.totalDiscount || 0),
      sub: 'Total abatido em vendas',
      bg: [239, 246, 255],
      border: [147, 197, 253],
      text: [29, 78, 216],
      accent: [37, 99, 235],
    },
    {
      title: 'TICKET MÉDIO ANUAL',
      value: formatCurrencyBRL(data.ticketMedio),
      sub: 'Média por faca vendida',
      bg: [250, 245, 255],
      border: [216, 180, 254],
      text: [109, 40, 217],
      accent: [126, 34, 206],
    },
  ];

  kpis.forEach((kpi, index) => {
    const cardX = margin + index * (cardWidth + cardGap);

    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setFillColor(kpi.accent[0], kpi.accent[1], kpi.accent[2]);
    doc.rect(cardX, currentY, cardWidth, 1.8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(kpi.title, cardX + 3, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(18, 20, 28);
    doc.text(kpi.value, cardX + 3, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 110, 125);
    doc.text(kpi.sub, cardX + 3, currentY + 18);
  });

  currentY += cardHeight + 6;

  // --- 3. TABELA COMPARATIVA MÊS A MÊS DO ANO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 20, 28);
  doc.text(`1. Demonstrativo Comparativo Mês a Mês (${data.year})`, margin, currentY);
  currentY += 2;

  const monthRows = data.monthlyBreakdown.map((m) => [
    m.monthName,
    `${m.count} un.`,
    formatCurrencyBRL(m.total),
    formatCurrencyBRL(m.ticketMedio),
    `${m.percentage.toFixed(1)}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Mês de Referência', 'Peças Vendidas', 'Total Faturado (R$)', 'Ticket Médio', '% do Faturamento Anual']],
    body: monthRows,
    foot: [
      [
        `TOTAL DO ANO (${data.year})`,
        `${data.totalQuantity} un.`,
        formatCurrencyBRL(data.totalRevenue),
        formatCurrencyBRL(data.ticketMedio),
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
      fillColor: [18, 20, 28],
      textColor: [245, 158, 11],
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
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'center', cellWidth: 32 },
      2: { halign: 'right', cellWidth: 42, fontStyle: 'bold' },
      3: { halign: 'right', cellWidth: 38 },
      4: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 6;

  // --- 4. TOP FACAS MAIS VENDIDAS NO ANO ---
  if (data.topSellingKnives.length > 0) {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(18, 20, 28);
    doc.text(`2. Modelos Mais Vendidos no Ano (${data.year})`, margin, currentY);
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
      head: [['Posição', 'Código', 'Modelo da Faca', 'Qtd Vendida no Ano', 'Total Faturado']],
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
        fillColor: [217, 119, 6],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { halign: 'center', cellWidth: 32 },
        4: { halign: 'right', cellWidth: 44, fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 6;
  }

  // --- 5. EXTRATO CONSOLIDADO DE VENDAS DO ANO ---
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(18, 20, 28);
  doc.text(`3. Extrato Consolidado de Todas as Vendas de ${data.year}`, margin, currentY);
  currentY += 2;

  const salesRows = data.sales.map((s) => [
    s.soldAt || (s.timestamp ? new Date(s.timestamp).toLocaleDateString('pt-BR') : '-'),
    s.code || 'FC-000',
    s.name || 'Faca Artesanal',
    s.category || 'Geral',
    s.originalPrice && s.originalPrice !== s.price ? formatCurrencyBRL(s.originalPrice) : '-',
    s.discount && s.discount > 0 ? formatCurrencyBRL(s.discount) : '-',
    getPaymentLabel(s.paymentMethod),
    formatCurrencyBRL(s.price),
  ]);

  if (salesRows.length === 0) {
    salesRows.push(['-', '-', 'Nenhuma venda registrada neste ano', '-', '-', '-', '-', 'R$ 0,00']);
  }

  autoTable(doc, {
    startY: currentY,
    head: [['Data/Hora', 'Código', 'Modelo da Faca', 'Categoria', 'Preço Cat.', 'Desconto', 'Pagto', 'Valor Final']],
    body: salesRows,
    foot: [
      [
        'TOTAL ANUAL',
        '',
        `${data.totalQuantity} facas vendidas`,
        '',
        '',
        formatCurrencyBRL(data.totalDiscount || 0),
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
      textColor: [245, 158, 11],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 26, fontSize: 7 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 44 },
      3: { cellWidth: 22 },
      4: { halign: 'right', cellWidth: 20, fontSize: 7 },
      5: { halign: 'right', cellWidth: 20, fontSize: 7, textColor: [180, 83, 9] },
      6: { cellWidth: 20, fontSize: 7 },
      7: { halign: 'right', cellWidth: 24, fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    margin: { left: margin, right: margin, bottom: 16 },
    didDrawPage: () => {
      const totalPages = (doc.internal as any).getNumberOfPages();
      const currentPage = (doc.internal as any).getCurrentPageInfo().pageNumber;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 145, 160);

      doc.text(
        `Fronteira Cutelaria Artesanal • Relatório Anual Consolidado (${data.year})`,
        margin,
        pageHeight - 7
      );

      doc.text(
        `Página ${currentPage} de ${totalPages}`,
        pageWidth - margin - 20,
        pageHeight - 7
      );

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
    },
  });

  const filename = `relatorio-vendas-anual-fronteira-${data.year}.pdf`;
  doc.save(filename);
}
