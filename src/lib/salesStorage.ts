export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'outros';

export interface SaleRecord {
  id: string;
  knifeId: string;
  code: string;
  name: string;
  price: number;
  soldAt: string; // e.g. "12/08/2026 18:30"
  timestamp?: number;
  category?: string;
  images?: string[];
  customerId?: string;
  customerName?: string;
  customerWhatsapp?: string;
  paymentMethod?: PaymentMethod;
}

const SALES_LOG_KEY = 'cutelaria_sales_log_v1';

function cleanImageUrls(images?: string[]): string[] {
  if (!images || !Array.isArray(images)) return [];
  // Avoid saving large data URIs or base64 strings into localStorage to prevent quota overflow
  return images
    .filter((img) => typeof img === 'string' && img.length < 500 && !img.startsWith('data:'))
    .slice(0, 1);
}

export function getStoredSalesLog(): SaleRecord[] {
  try {
    const raw = localStorage.getItem(SALES_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Sanitize records on load to clean up any legacy bloated base64 strings
        return parsed.map((item) => ({
          ...item,
          images: cleanImageUrls(item.images),
        }));
      }
    }
  } catch (e) {
    console.error('Error reading sales log from localStorage:', e);
  }
  return [];
}

export async function fetchSalesLogAPI(): Promise<SaleRecord[]> {
  try {
    const res = await fetch('/api/sales');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        try {
          localStorage.setItem(SALES_LOG_KEY, JSON.stringify(data));
        } catch (_) {}
        return data;
      }
    }
  } catch (e) {
    console.warn('API sales fetch failed, fallback to localStorage:', e);
  }
  return getStoredSalesLog();
}

export function saveSaleRecord(
  knife: {
    id: string;
    code: string;
    name: string;
    price: number;
    category?: string;
    images?: string[];
  },
  customer?: {
    id?: string;
    name?: string;
    whatsapp?: string;
  } | null,
  paymentMethod?: PaymentMethod
): SaleRecord[] {
  const current = getStoredSalesLog();
  const now = new Date();
  const formattedDate = now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const sanitizedImages = cleanImageUrls(knife.images);

  const newRecord: SaleRecord = {
    id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    knifeId: knife.id,
    code: knife.code || 'FC-000',
    name: knife.name || 'Faca Artesanal',
    price: Number(knife.price) || 0,
    soldAt: formattedDate,
    timestamp: now.getTime(),
    category: knife.category || 'GERAL',
    images: sanitizedImages,
    customerId: customer?.id || undefined,
    customerName: customer?.name || undefined,
    customerWhatsapp: customer?.whatsapp || undefined,
    paymentMethod: paymentMethod || 'pix',
  };

  let updated = [newRecord, ...current];

  // Attempt saving with fallback handling for QuotaExceededError
  try {
    localStorage.setItem(SALES_LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Quota exceeded while saving sales log. Cleaning up images and retrying...', e);
    // Fallback 1: Strip image arrays from all items
    updated = updated.map((item) => ({ ...item, images: [] }));
    try {
      localStorage.setItem(SALES_LOG_KEY, JSON.stringify(updated));
    } catch (e2) {
      // Fallback 2: Keep only recent 100 sales records
      updated = updated.slice(0, 100);
      try {
        localStorage.setItem(SALES_LOG_KEY, JSON.stringify(updated));
      } catch (e3) {
        console.error('Failed to save sales log even after fallback cleanup:', e3);
      }
    }
  }

  // Persist to server in background
  fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRecord),
  }).catch((err) => console.warn('Failed to sync sale record to server:', err));

  return updated;
}

export function removeSaleRecord(saleId: string): SaleRecord[] {
  const current = getStoredSalesLog();
  const updated = current.filter((s) => s.id !== saleId);
  try {
    localStorage.setItem(SALES_LOG_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error removing sale record:', e);
  }

  // Persist deletion to server in background
  fetch(`/api/sales/${saleId}`, {
    method: 'DELETE',
  }).catch((err) => console.warn('Failed to delete sale record on server:', err));

  return updated;
}

export function clearSalesLog(): SaleRecord[] {
  try {
    localStorage.removeItem(SALES_LOG_KEY);
  } catch (e) {
    console.error('Error clearing sales log:', e);
  }

  // Persist clear on server
  fetch('/api/sales', {
    method: 'DELETE',
  }).catch((err) => console.warn('Failed to clear sales on server:', err));

  return [];
}

