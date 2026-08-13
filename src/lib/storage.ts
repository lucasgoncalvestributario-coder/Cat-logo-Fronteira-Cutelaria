import { Knife, StoreConfig } from '../types';
import { getNextKnifeCode } from './codeUtils';
import { idbGetKnives, idbSaveKnives, idbPutKnife, idbDeleteKnife } from './indexedDbStorage';
import {
  saveKnifeFirebase,
  deleteKnifeFirebase,
  fetchKnivesFirebase,
  saveConfigFirebase,
  fetchConfigFirebase,
  seedInitialKnivesIfEmpty
} from './firebase';
import { INITIAL_KNIVES } from '../data/initialKnives';

export const KNIVES_CACHE_KEY = 'cutelaria_knives_v1';
export const FAVORITES_KEY = 'cutelaria_favorites_v1';
export const CONFIG_KEY = 'cutelaria_config_v1';

export const DEFAULT_CONFIG: StoreConfig = {
  whatsappNumber: '554792787901',
  storeName: 'Fronteira Cutelaria',
  adminPin: '251127',
  welcomeMessage: 'Olá! Gostaria de mais informações sobre o catálogo da Fronteira Cutelaria.'
};

// Auto seed Firestore on first load if empty
let isSeededChecked = false;
export async function ensureFirestoreSeeded(): Promise<void> {
  if (isSeededChecked) return;
  isSeededChecked = true;
  try {
    await seedInitialKnivesIfEmpty(INITIAL_KNIVES);
  } catch (e) {
    console.warn('[Storage] Seed check error:', e);
  }
}

export function safeSetLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (err: any) {
    console.warn(`[Storage] localStorage quota exceeded or error for key "${key}":`, err?.message || err);

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
  console.log(`[Storage] 📥 Carregando catálogo central (modo ${isAdmin ? 'admin' : 'público'})...`);

  // 1. PRIMARY: Fetch from Firebase Firestore Central Database
  try {
    await ensureFirestoreSeeded();
    const fbKnives = await fetchKnivesFirebase();
    if (Array.isArray(fbKnives) && fbKnives.length > 0) {
      console.log(`[Storage] 🔥 ${fbKnives.length} facas carregadas diretamente do Firebase Firestore!`);
      safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(fbKnives));
      idbSaveKnives(fbKnives);
      return isAdmin ? fbKnives : fbKnives.filter((k: Knife) => !k.isHidden);
    }
  } catch (err) {
    console.warn('[Storage] Aviso ao consultar Firebase Firestore:', err);
  }

  // 2. SECONDARY: Express Server API
  try {
    const headers = getAdminAuthHeaders();
    const ts = Date.now();
    const query = isAdmin ? `?admin=true&_t=${ts}` : `?_t=${ts}`;
    const res = await fetch(`/api/knives${query}`, {
      headers,
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[Storage] ✓ ${data.length} facas carregadas da API com sucesso.`);
        safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(data));
        idbSaveKnives(data);
        return data;
      }
    }
  } catch (err) {
    console.warn('[Storage] API fallback error:', err);
  }

  // 3. Fallback IndexedDB
  try {
    const idbKnives = await idbGetKnives();
    if (idbKnives && idbKnives.length > 0) {
      console.log(`[Storage] ✓ ${idbKnives.length} facas recuperadas do IndexedDB.`);
      return isAdmin ? idbKnives : idbKnives.filter((k: Knife) => !k.isHidden);
    }
  } catch (e) {
    console.warn('[Storage] IndexedDB read error:', e);
  }

  // 4. Fallback localStorage
  const cached = localStorage.getItem(KNIVES_CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      console.log(`[Storage] ✓ ${parsed.length} facas recuperadas do LocalStorage.`);
      return isAdmin ? parsed : parsed.filter((k: Knife) => !k.isHidden);
    } catch (e) {
      console.error('[Storage] Error parsing local cache:', e);
    }
  }

  return INITIAL_KNIVES;
}

export async function saveKnifeToApi(knife: Partial<Knife>): Promise<Knife> {
  const isNew = !knife.id;
  const targetId = knife.id || `faca-${Date.now()}`;
  const isSoldOut = Boolean(
    knife.isOutofStock ||
    knife.status === 'esgotado' ||
    (typeof knife.quantity === 'number' && knife.quantity <= 0)
  );

  const defaultImg = 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000';
  const finalImages = (knife.images && knife.images.length > 0)
    ? knife.images
    : [defaultImg];

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
    images: finalImages,
    description: knife.description || '',
    thickness: knife.thickness,
    weight: knife.weight,
    finish: knife.finish,
    sheathType: knife.sheathType,
    isHidden: Boolean(knife.isHidden)
  };

  console.log(`[Storage] 💾 Salvando faca "${normalizedKnife.name}" (ID: ${normalizedKnife.id}, Código: ${normalizedKnife.code}) no Firebase central...`);

  // 1. PRIMARY: Save directly to Firebase Firestore universal database
  try {
    await saveKnifeFirebase(normalizedKnife);
    console.log('[Storage] 🔥 Faca gravada com sucesso no Firebase Firestore universal!');
  } catch (fbErr) {
    console.error('[Storage] Erro ao gravar no Firebase Firestore:', fbErr);
  }

  // 2. Cache locally for instant UI response and offline safety
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
    console.warn('[Storage] Aviso ao salvar localmente:', err);
  }

  // 3. Sync to API backend if running in full-stack mode
  try {
    const url = isNew ? '/api/knives' : `/api/knives/${targetId}`;
    const method = isNew ? 'POST' : 'PUT';
    await fetch(url, {
      method,
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(normalizedKnife),
    });
  } catch (_) {}

  return normalizedKnife;
}

export async function deleteKnifeFromApi(id: string): Promise<boolean> {
  const targetId = String(id || '').trim();
  console.log(`[Storage] 🗑️ Excluindo faca ID: "${targetId}" do Firebase central...`);

  // 1. Delete from Firebase Firestore
  try {
    await deleteKnifeFirebase(targetId);
    console.log('[Storage] 🔥 Faca excluída do Firebase Firestore.');
  } catch (fbErr) {
    console.error('[Storage] Erro ao excluir do Firebase:', fbErr);
  }

  // 2. Delete from local caches
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
      console.error('[Storage] Error updating cache on delete:', e);
    }
  }

  // 3. Sync delete with API backend
  try {
    await fetch(`/api/knives/${targetId}`, {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    });
  } catch (_) {}

  return true;
}

export async function duplicateKnifeInApi(id: string): Promise<Knife | null> {
  const current = await fetchKnives(true);
  const item = current.find(k => k.id === id);
  if (!item) return null;

  const duplicated: Knife = {
    ...item,
    id: `faca-${Date.now()}`,
    code: getNextKnifeCode(current),
    name: `${item.name} (Cópia)`
  };

  await saveKnifeToApi(duplicated);
  return duplicated;
}

export async function importCatalogToApi(catalog: Knife[]): Promise<boolean> {
  for (const item of catalog) {
    await saveKnifeFirebase(item);
  }
  await idbSaveKnives(catalog);
  safeSetLocalStorage(KNIVES_CACHE_KEY, JSON.stringify(catalog));
  return true;
}

// Favorites local persistence (client-specific preference)
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

// Config persistence with Firebase
export async function fetchStoreConfig(): Promise<StoreConfig> {
  try {
    const fbConfig = await fetchConfigFirebase();
    if (fbConfig) {
      const merged = { ...DEFAULT_CONFIG, ...fbConfig };
      safeSetLocalStorage(CONFIG_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('[Storage] Erro ao carregar config do Firebase:', err);
  }

  try {
    const res = await fetch(`/api/config?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const merged = { ...DEFAULT_CONFIG, ...data };
      safeSetLocalStorage(CONFIG_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (_) {}

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
    await saveConfigFirebase(config);
    console.log('[Storage] 🔥 Configurações salvas no Firebase Firestore.');
  } catch (e) {
    console.warn('[Storage] Erro ao salvar config no Firebase:', e);
  }

  try {
    await fetch('/api/config', {
      method: 'PUT',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(config)
    });
  } catch (_) {}

  return true;
}

