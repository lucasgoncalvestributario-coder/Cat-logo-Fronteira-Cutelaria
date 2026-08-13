import { Knife, StoreConfig } from '../types';
import { getNextKnifeCode } from './codeUtils';
import {
  saveKnifeFirebase,
  deleteKnifeFirebase,
  fetchKnivesFirebase,
  saveConfigFirebase,
  fetchConfigFirebase,
  seedInitialKnivesIfEmpty
} from './firebase';
import { INITIAL_KNIVES } from '../data/initialKnives';

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
  console.log(`[Storage] 📥 Carregando catálogo central do Firebase Firestore (modo ${isAdmin ? 'admin' : 'público'})...`);

  // 1. SOLE AUTHORITATIVE SOURCE: Firebase Firestore Central Database
  try {
    await ensureFirestoreSeeded();
    const fbKnives = await fetchKnivesFirebase();
    if (Array.isArray(fbKnives)) {
      console.log(`[Storage] 🔥 ${fbKnives.length} facas carregadas diretamente do Firebase Firestore!`);
      return isAdmin ? fbKnives : fbKnives.filter((k: Knife) => !k.isHidden);
    }
  } catch (err: any) {
    console.error('[Storage] ❌ Erro ao consultar Firebase Firestore:', err);
    throw new Error('Não foi possível conectar ao banco de dados central.');
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

  console.log(`[Storage] 💾 Gravando faca "${normalizedKnife.name}" (ID: ${normalizedKnife.id}, Código: ${normalizedKnife.code}) exclusivamente no Firebase central...`);

  // MANDATORY: Save directly to Firebase Firestore. Any failure throws explicit error.
  await saveKnifeFirebase(normalizedKnife);
  console.log('[Storage] 🔥 Faca confirmada com sucesso no Firebase Firestore!');

  return normalizedKnife;
}

export async function deleteKnifeFromApi(id: string): Promise<boolean> {
  const targetId = String(id || '').trim();
  console.log(`[Storage] 🗑️ Excluindo faca ID: "${targetId}" exclusivamente do Firebase central...`);

  // MANDATORY: Delete directly from Firebase Firestore.
  await deleteKnifeFirebase(targetId);
  console.log('[Storage] 🔥 Faca excluída do Firebase Firestore.');

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

