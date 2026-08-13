import { Knife, StoreConfig } from '../types';
import { getNextKnifeCode } from './codeUtils';
import { idbGetKnives, idbSaveKnives, idbPutKnife, idbDeleteKnife } from './indexedDbStorage';

const KNIVES_CACHE_KEY = 'cutelaria_knives_v1';
const FAVORITES_KEY = 'cutelaria_favorites_v1';
const CONFIG_KEY = 'cutelaria_config_v1';

export const DEFAULT_CONFIG: StoreConfig = {
  whatsappNumber: '554792787901',
  storeName: 'Fronteira Cutelaria',
  adminPin: '251127',
  welcomeMessage: 'Olá! Gostaria de mais informações sobre o catálogo da Fronteira Cutelaria.'
};

export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`localStorage quota exceeded or error for key "${key}":`, err?.message || err);

    // Try clearing non-essential sales log cache to free space
    try {
      localStorage.removeItem('cutelaria_sales_log_v1');
    } catch (_) {}

    try {
      localStorage.setItem(key, value);
      return;
    } catch (_) {}

    // If storing knives cache, strip heavy data URLs so local storage cache fits within quota
    if (key === KNIVES_CACHE_KEY) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const stripped = parsed.map((item: Knife) => ({
            ...item,
            images: (item.images || []).map((img: string) =>
              typeof img === 'string' && img.startsWith('data:') && img.length > 5000
                ? img.substring(0, 100) + '...[cached]'
                : img
            )
          }));
          localStorage.setItem(key, JSON.stringify(stripped));
          return;
        }
      } catch (_) {}
    }
  }
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['x-admin-token'] = token;
  }
  return headers;
}

export async function fetchKnives(isAdmin = false): Promise<Knife[]> {
  try {
    const headers = getAdminAuthHeaders();
    const res = await fetch(`/api/knives${isAdmin ? '?admin=true' : ''}`, { headers, cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(data));
        idbSaveKnives(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('API offline or error, reading local cache:', err);
  }

  // 1. Try IndexedDB (handles full-res base64 images without quota limits)
  try {
    const idbKnives = await idbGetKnives();
    if (idbKnives && idbKnives.length > 0) {
      return isAdmin ? idbKnives : idbKnives.filter((k: Knife) => !k.isHidden);
    }
  } catch (e) {
    console.warn('IndexedDB read error:', e);
  }

  // 2. Fallback to localStorage
  const cached = localStorage.getItem(KNIVES_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return isAdmin ? parsed : parsed.filter((k: Knife) => !k.isHidden);
    } catch (e) {
      console.error('Error parsing local cache:', e);
    }
  }

  return [];
}

export async function saveKnifeToApi(knife: Partial<Knife>): Promise<Knife> {
  const isNew = !knife.id;
  const targetId = knife.id || `faca-${Date.now()}`;
  const isSoldOut = Boolean(
    knife.isOutofStock ||
    knife.status === 'esgotado' ||
    (typeof knife.quantity === 'number' && knife.quantity <= 0)
  );

  const normalizedKnife: Knife = {
    id: targetId,
    code: knife.code || `FC-${String(Date.now()).slice(-3)}`,
    name: knife.name || 'Nova Faca Artesanal',
    price: Number(knife.price) || 0,
    isOnSale: Boolean(knife.isOnSale),
    originalPrice: knife.originalPrice,
    promotionalPrice: knife.promotionalPrice,
    category: knife.category || 'CAMPEIRAS',
    originalCategory: knife.originalCategory || knife.category || 'CAMPEIRAS',
    steelType: knife.steelType || 'Aço Carbono 5160',
    handleMaterial: knife.handleMaterial || 'Madeira Nobre',
    length: knife.length || '8"',
    isOutofStock: isSoldOut,
    status: isSoldOut ? 'esgotado' : 'disponivel',
    quantity: isSoldOut ? 0 : (typeof knife.quantity === 'number' && knife.quantity > 0 ? knife.quantity : 1),
    images: (knife.images && knife.images.length > 0)
      ? knife.images
      : ['https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000'],
    description: knife.description || '',
    structure: knife.structure,
    sheath: knife.sheath,
    bladeFinish: knife.bladeFinish,
    guardMaterial: knife.guardMaterial,
    totalLength: knife.totalLength,
    bladeThickness: knife.bladeThickness,
    bladeWidth: knife.bladeWidth,
    weight: knife.weight,
    features: knife.features || [],
    isHidden: Boolean(knife.isHidden)
  };

  // 1. Immediately save to IndexedDB & localStorage for 100% offline & instant reactivity
  try {
    await idbPutKnife(normalizedKnife);
    const cached = localStorage.getItem(KNIVES_CACHE_KEY);
    let list: Knife[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex(k => k.id === targetId || k.code === normalizedKnife.code);
    if (idx >= 0) {
      list[idx] = normalizedKnife;
    } else {
      list = [normalizedKnife, ...list];
    }
    safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Local save warning in saveKnifeToApi:', err);
  }

  // 2. Persist to API backend
  try {
    const url = isNew ? '/api/knives' : `/api/knives/${targetId}`;
    const method = isNew ? 'POST' : 'PUT';

    const res = await fetch(url, {
      method,
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(normalizedKnife),
    });

    if (res.ok) {
      const serverSaved: Knife = await res.json();
      await idbPutKnife(serverSaved);
      return serverSaved;
    }
  } catch (err) {
    console.warn('Server sync failed, returning local saved knife:', err);
  }

  return normalizedKnife;
}

export async function deleteKnifeFromApi(id: string): Promise<boolean> {
  const targetId = String(id || '').trim();

  // Immediately remove from IndexedDB & localStorage
  try {
    await idbDeleteKnife(targetId);
  } catch (_) {}

  const cached = localStorage.getItem(KNIVES_CACHE_KEY);
  if (cached) {
    try {
      const list: Knife[] = JSON.parse(cached);
      const filtered = list.filter(k => String(k.id || '').trim() !== targetId && String(k.code || '').trim() !== targetId);
      safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Error updating cache on delete:', e);
    }
  }

  try {
    const res = await fetch(`/api/knives/${targetId}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.warn('API delete failed, local cache updated:', err);
    return true;
  }
}

export async function duplicateKnifeInApi(id: string): Promise<Knife | null> {
  try {
    const res = await fetch(`/api/knives/duplicate/${id}`, {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      await idbPutKnife(data);
      return data;
    }
  } catch (e) {
    console.warn('Duplicate API failed, using fallback:', e);
  }

  const current = await fetchKnives(true);
  const item = current.find(k => k.id === id);
  if (!item) return null;

  const duplicated: Knife = {
    ...item,
    id: `faca-${Date.now()}`,
    code: getNextKnifeCode(current),
    name: `${item.name} (Cópia)`
  };

  await idbPutKnife(duplicated);
  current.unshift(duplicated);
  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(current));
  return duplicated;
}

export async function importCatalogToApi(catalog: Knife[]): Promise<boolean> {
  await idbSaveKnives(catalog);
  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(catalog));

  try {
    const res = await fetch('/api/knives/import', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(catalog)
    });
    if (res.ok) {
      return true;
    }
  } catch (e) {
    console.warn('Import API error, saved locally:', e);
  }
  return true;
}

// Favorites local persistence
export function getFavorites(): string[] {
  try {
    const data = localStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function toggleFavorite(id: string): string[] {
  const favorites = getFavorites();
  const index = favorites.indexOf(id);
  let updated: string[];
  if (index >= 0) {
    updated = favorites.filter(favId => favId !== id);
  } else {
    updated = [...favorites, id];
  }
  safeSetLocalStorage(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

// Config persistence
export async function fetchStoreConfig(): Promise<StoreConfig> {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      const merged = { ...DEFAULT_CONFIG, ...data };
      safeSetLocalStorage(CONFIG_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('API config load error:', err);
  }

  const cached = localStorage.getItem(CONFIG_KEY);
  if (cached) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
    } catch (e) {}
  }

  return DEFAULT_CONFIG;
}

export async function saveStoreConfig(config: StoreConfig): Promise<boolean> {
  safeSetLocalStorage(CONFIG_KEY, JSON.stringify(config));
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(config)
    });
    if (res.ok) {
      return true;
    }
  } catch (e) {
    console.warn('API config update failed, saved locally:', e);
  }
  return true;
}
