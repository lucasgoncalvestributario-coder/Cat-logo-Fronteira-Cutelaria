import { Knife, StoreConfig } from '../types';
import { INITIAL_KNIVES } from '../data/initialKnives';
import { getNextKnifeCode } from './codeUtils';

const KNIVES_CACHE_KEY = 'cutelaria_knives_v1';
const FAVORITES_KEY = 'cutelaria_favorites_v1';
const CONFIG_KEY = 'cutelaria_config_v1';

export const DEFAULT_CONFIG: StoreConfig = {
  whatsappNumber: '5511999998888',
  storeName: 'Fronteira Cutelaria',
  adminPin: '251127',
  welcomeMessage: 'Olá! Gostaria de mais informações sobre o catálogo da Fronteira Cutelaria.'
};

export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`localStorage quota exceeded or error for key "${key}":`, err?.message || err);

    // Try clearing non-essential or old sales log cache to free space
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
        return data;
      }
    }
  } catch (err) {
    console.warn('API offline or error, reading local cache:', err);
  }

  // Fallback to local storage or seed data
  const cached = localStorage.getItem(KNIVES_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      return isAdmin ? parsed : parsed.filter((k: Knife) => !k.isHidden);
    } catch (e) {
      console.error('Error parsing local cache:', e);
    }
  }

  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify([]));
  return [];
}

export async function saveKnifeToApi(knife: Partial<Knife>): Promise<Knife> {
  const isNew = !knife.id;
  const url = isNew ? '/api/knives' : `/api/knives/${knife.id}`;
  const method = isNew ? 'POST' : 'PUT';

  const res = await fetch(url, {
    method,
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(knife),
  });

  if (!res.ok) {
    throw new Error(`Falha no servidor ao salvar (${res.status})`);
  }

  const savedItem: Knife = await res.json();

  // Update local cache safely without throwing quota exceeded error
  const cached = localStorage.getItem(KNIVES_CACHE_KEY);
  let list: Knife[] = cached ? JSON.parse(cached) : [];
  if (isNew) {
    list = [savedItem, ...list];
  } else {
    list = list.map(item => item.id === savedItem.id ? savedItem : item);
  }
  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(list));

  return savedItem;
}

export async function deleteKnifeFromApi(id: string): Promise<boolean> {
  const targetId = String(id || '').trim();

  // Immediately remove from localStorage cache
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
      return await res.json();
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

  current.unshift(duplicated);
  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(current));
  return duplicated;
}

export async function importCatalogToApi(catalog: Knife[]): Promise<boolean> {
  try {
    const res = await fetch('/api/knives/import', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(catalog)
    });
    if (res.ok) {
      safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(catalog));
      return true;
    }
  } catch (e) {
    console.warn('Import API error, using local fallback:', e);
  }
  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(catalog));
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
  try {
    const res = await fetch('/api/config', {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(config)
    });
    if (res.ok) {
      safeSetLocalStorage(CONFIG_KEY, JSON.stringify(config));
      return true;
    }
  } catch (e) {
    console.warn('API config update failed, saving locally:', e);
  }
  safeSetLocalStorage(CONFIG_KEY, JSON.stringify(config));
  return true;
}
