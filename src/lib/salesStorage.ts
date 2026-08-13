import { db } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

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
const SALES_COLLECTION = 'sales';

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
  // 1. Try Firebase Firestore
  try {
    const colRef = collection(db, SALES_COLLECTION);
    const snap = await getDocs(colRef);
    const list: SaleRecord[] = [];
    snap.forEach((d) => {
      list.push({ ...(d.data() as SaleRecord), id: d.id });
    });
    if (list.length > 0) {
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      try {
        localStorage.setItem(SALES_LOG_KEY, JSON.stringify(list));
      } catch (_) {}
      return list;
    }
  } catch (err) {
    console.warn('[Sales] Firestore fetch error:', err);
  }

  // 2. Try Express API
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
  } catch (e) {}

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

  // Persist to Firebase Firestore
  try {
    const docRef = doc(db, SALES_COLLECTION, newRecord.id);
    const cleanRecord: Record<string, any> = {};
    for (const [k, v] of Object.entries(newRecord)) {
      if (v !== undefined) cleanRecord[k] = v;
    }
    setDoc(docRef, cleanRecord, { merge: true }).catch(() => {});
  } catch (_) {}

  // Persist to server in background
  fetch('/api/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRecord),
  }).catch(() => {});

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

  try {
    const docRef = doc(db, SALES_COLLECTION, saleId);
    deleteDoc(docRef).catch(() => {});
  } catch (_) {}

  fetch(`/api/sales/${saleId}`, {
    method: 'DELETE',
  }).catch(() => {});

  return updated;
}

export function clearSalesLog(): SaleRecord[] {
  try {
    localStorage.removeItem(SALES_LOG_KEY);
  } catch (e) {
    console.error('Error clearing sales log:', e);
  }

  fetch('/api/sales', {
    method: 'DELETE',
  }).catch(() => {});

  return [];
}

