import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
  writeBatch
} from 'firebase/firestore';
import { Knife, StoreConfig } from '../types';
import firebaseConfigJson from '../../firebase-applet-config.json';

export const firebaseConfig = {
  projectId: firebaseConfigJson.projectId || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "catalogo-fronteira-cutelaria",
  appId: firebaseConfigJson.appId || (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:97657827199:web:e2ef9b1c49dc7658fc344a",
  apiKey: firebaseConfigJson.apiKey || (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyAgXrq4G1pcuTgVTJqRvOmyN3yNHg-hlR4",
  authDomain: firebaseConfigJson.authDomain || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "catalogo-fronteira-cutelaria.firebaseapp.com",
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || "(default)",
  storageBucket: firebaseConfigJson.storageBucket || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "catalogo-fronteira-cutelaria.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "97657827199",
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore: Use default database as primary for 100% compatibility with Firebase Console and Blaze, or custom database if specified
export const db = getFirestore(app);
export const customDb = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : null;

console.log(`[Firebase] 🔥 Firestore conectado ao projeto "${firebaseConfig.projectId}" (Banco principal: (default))`);

const KNIVES_COLLECTION = 'knives';
const CONFIG_COLLECTION = 'config';
const CONFIG_DOC_ID = 'main_config';
const SALES_COLLECTION = 'sales';
const CUSTOMERS_COLLECTION = 'customers';

/**
 * Real-time listener for the universal central knives catalog.
 * Whenever any admin anywhere updates, adds or deletes a knife,
 * all connected users worldwide receive the update immediately via Firebase.
 */
export function subscribeToKnivesFirebase(
  onUpdate: (knives: Knife[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  console.log('[Firebase] 📡 Iniciando listener em tempo real (onSnapshot) para a coleção de facas...');
  const knivesCol = collection(db, KNIVES_COLLECTION);
  
  return onSnapshot(
    knivesCol,
    async (snapshot) => {
      const knivesList: Knife[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Knife;
        knivesList.push({
          ...data,
          id: docSnap.id || data.id,
        });
      });

      console.log(`[Firebase] ⚡ ${knivesList.length} facas sincronizadas em tempo real via Firestore.`);
      if (knivesList.length > 0) {
        onUpdate(knivesList);
        try {
          localStorage.setItem('cutelaria_knives_cache_v2', JSON.stringify(knivesList));
        } catch (_) {}
        try {
          const { idbSaveKnives } = await import('./indexedDbStorage');
          await idbSaveKnives(knivesList);
        } catch (_) {}
      } else {
        // If Firestore is empty (0 docs), check if this client has local knives to migrate to the cloud
        try {
          const { idbGetKnives } = await import('./indexedDbStorage');
          const localKnives = await idbGetKnives();
          if (Array.isArray(localKnives) && localKnives.length > 0) {
            console.log(`[Firebase] 📦 Detectadas ${localKnives.length} facas locais no dispositivo. Enviando para o Firestore central...`);
            onUpdate(localKnives);
            for (const k of localKnives) {
              if (k && (k.name || k.code)) {
                await saveKnifeFirebase(k).catch(() => {});
              }
            }
          } else {
            onUpdate([]);
          }
        } catch (_) {
          onUpdate([]);
        }
      }
    },
    (error) => {
      console.warn('[Firebase] Aviso no listener em tempo real do Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Real-time listener for store configuration (WhatsApp number, store name, etc.)
 */
export function subscribeToConfigFirebase(
  onUpdate: (config: StoreConfig) => void
): Unsubscribe {
  const configDocRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  return onSnapshot(
    configDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StoreConfig;
        console.log('[Firebase] ⚡ Configurações da loja atualizadas em tempo real:', data);
        try {
          localStorage.setItem('cutelaria_config_v1', JSON.stringify(data));
        } catch (_) {}
        onUpdate(data);
      }
    },
    (err) => {
      console.warn('[Firebase] Aviso ao escutar configurações:', err);
    }
  );
}

/**
 * Real-time listener for universal sales log
 */
export function subscribeToSalesFirebase(
  onUpdate: (sales: any[]) => void
): Unsubscribe {
  const salesCol = collection(db, SALES_COLLECTION);
  return onSnapshot(
    salesCol,
    (snapshot) => {
      const salesList: any[] = [];
      snapshot.forEach((docSnap) => {
        salesList.push({
          ...docSnap.data(),
          id: docSnap.id,
        });
      });
      salesList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      onUpdate(salesList);
    },
    (err) => {
      console.warn('[Firebase] Aviso ao escutar vendas:', err);
    }
  );
}

/**
 * Real-time listener for universal customers CRM
 */
export function subscribeToCustomersFirebase(
  onUpdate: (customers: any[]) => void
): Unsubscribe {
  const customersCol = collection(db, CUSTOMERS_COLLECTION);
  return onSnapshot(
    customersCol,
    (snapshot) => {
      const customersList: any[] = [];
      snapshot.forEach((docSnap) => {
        customersList.push({
          ...docSnap.data(),
          id: docSnap.id,
        });
      });
      onUpdate(customersList);
    },
    (err) => {
      console.warn('[Firebase] Aviso ao escutar clientes:', err);
    }
  );
}

/**
 * Save or update a knife in the central Firebase Firestore database.
 * Throws explicit error if Firestore is unreachable or write fails.
 */
export async function saveKnifeFirebase(knife: Knife): Promise<void> {
  const knifeId = knife.id || `faca-${Date.now()}`;
  const knifeDocRef = doc(db, KNIVES_COLLECTION, knifeId);
  
  console.log(`[Firebase] 💾 Gravando faca "${knife.name}" (ID: ${knifeId}, Código: ${knife.code}) no Firestore central...`);
  
  // Clean undefined values to prevent Firestore serialization errors
  const cleanData: Record<string, any> = {};
  for (const [key, value] of Object.entries(knife)) {
    if (value !== undefined) {
      cleanData[key] = value;
    }
  }
  cleanData.id = knifeId;
  cleanData.updatedAt = new Date().toISOString();

  try {
    await setDoc(knifeDocRef, cleanData, { merge: true });
    if (customDb) {
      const customKnifeDocRef = doc(customDb, KNIVES_COLLECTION, knifeId);
      setDoc(customKnifeDocRef, cleanData, { merge: true }).catch(() => {});
    }
    console.log(`[Firebase] ✓ Faca "${knife.name}" gravada com sucesso no Firestore universal.`);
  } catch (err: any) {
    console.error(`[Firebase] ❌ Falha crítica ao gravar no Firestore:`, err);
    throw new Error(`Não foi possível salvar no banco de dados. Verifique sua conexão e tente novamente.`);
  }
}

/**
 * Delete a knife from the central Firebase Firestore database.
 * Throws explicit error if Firestore is unreachable or delete fails.
 */
export async function deleteKnifeFirebase(id: string): Promise<void> {
  const targetId = String(id || '').trim();
  console.log(`[Firebase] 🗑️ Removendo faca ID "${targetId}" do Firestore central...`);
  const knifeDocRef = doc(db, KNIVES_COLLECTION, targetId);
  try {
    await deleteDoc(knifeDocRef);
    if (customDb) {
      const customKnifeDocRef = doc(customDb, KNIVES_COLLECTION, targetId);
      deleteDoc(customKnifeDocRef).catch(() => {});
    }
    console.log(`[Firebase] ✓ Faca removida com sucesso do Firestore universal.`);
  } catch (err: any) {
    console.error(`[Firebase] ❌ Falha ao excluir no Firestore:`, err);
    throw new Error(`Não foi possível excluir do banco de dados. Verifique sua conexão e tente novamente.`);
  }
}

/**
 * Fetch all knives once from Firestore.
 */
export async function fetchKnivesFirebase(): Promise<Knife[]> {
  try {
    const knivesCol = collection(db, KNIVES_COLLECTION);
    const snap = await getDocs(knivesCol);
    const result: Knife[] = [];
    snap.forEach((d) => {
      result.push({ ...(d.data() as Knife), id: d.id });
    });
    return result;
  } catch (err: any) {
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota')) {
      console.warn('[Firebase] Cota diária de leitura atingida (aguardando ciclo de renovação).');
    } else {
      console.warn('[Firebase] Aviso ao buscar facas do Firestore:', err?.message || err);
    }
    return [];
  }
}

/**
 * Save store config to Firestore.
 */
export async function saveConfigFirebase(config: StoreConfig): Promise<void> {
  try {
    const configDocRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    await setDoc(configDocRef, config, { merge: true });
    console.log('[Firebase] ✓ Configurações salvas no Firestore central.');
  } catch (err) {
    console.warn('[Firebase] Erro ao salvar configurações no Firestore:', err);
  }
}

/**
 * Fetch store config from Firestore.
 */
export async function fetchConfigFirebase(): Promise<StoreConfig | null> {
  try {
    const configDocRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
    const snap = await getDoc(configDocRef);
    if (snap.exists()) {
      return snap.data() as StoreConfig;
    }
  } catch (err) {
    console.warn('[Firebase] Erro ao buscar configurações do Firestore:', err);
  }
  return null;
}

/**
 * Save customer to Firestore.
 */
export async function saveCustomerFirebase(customer: any): Promise<void> {
  if (!customer || !customer.id) return;
  try {
    const customerDocRef = doc(db, CUSTOMERS_COLLECTION, customer.id);
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(customer)) {
      if (v !== undefined) clean[k] = v;
    }
    clean.updatedAt = new Date().toISOString();
    await setDoc(customerDocRef, clean, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Erro ao salvar cliente no Firestore:', err);
  }
}

/**
 * Delete customer from Firestore.
 */
export async function deleteCustomerFirebase(id: string): Promise<void> {
  if (!id) return;
  try {
    const customerDocRef = doc(db, CUSTOMERS_COLLECTION, id);
    await deleteDoc(customerDocRef);
  } catch (err) {
    console.warn('[Firebase] Erro ao excluir cliente no Firestore:', err);
  }
}

/**
 * Fetch customers from Firestore.
 */
export async function fetchCustomersFirebase(): Promise<any[]> {
  try {
    const col = collection(db, CUSTOMERS_COLLECTION);
    const snap = await getDocs(col);
    const result: any[] = [];
    snap.forEach((d) => {
      result.push({ ...d.data(), id: d.id });
    });
    return result;
  } catch (err) {
    console.warn('[Firebase] Erro ao buscar clientes do Firestore:', err);
    return [];
  }
}

/**
 * Save sale to Firestore.
 */
export async function saveSaleFirebase(sale: any): Promise<void> {
  if (!sale || !sale.id) return;
  try {
    const saleDocRef = doc(db, SALES_COLLECTION, sale.id);
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(sale)) {
      if (v !== undefined) clean[k] = v;
    }
    await setDoc(saleDocRef, clean, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Erro ao salvar venda no Firestore:', err);
  }
}

/**
 * Delete sale from Firestore.
 */
export async function deleteSaleFirebase(id: string): Promise<void> {
  if (!id) return;
  try {
    const saleDocRef = doc(db, SALES_COLLECTION, id);
    await deleteDoc(saleDocRef);
  } catch (err) {
    console.warn('[Firebase] Erro ao excluir venda no Firestore:', err);
  }
}

/**
 * Fetch sales from Firestore.
 */
export async function fetchSalesFirebase(): Promise<any[]> {
  try {
    const col = collection(db, SALES_COLLECTION);
    const snap = await getDocs(col);
    const result: any[] = [];
    snap.forEach((d) => {
      result.push({ ...d.data(), id: d.id });
    });
    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return result;
  } catch (err) {
    console.warn('[Firebase] Erro ao buscar vendas do Firestore:', err);
    return [];
  }
}

let hasCheckedLocalMigration = false;

/**
 * Automatic safe migration of any real local products from notebook to Firestore.
 * Preserves existing products and pushes them to the central cloud.
 */
export async function safeMigrateLocalDataToFirestore(): Promise<void> {
  if (typeof window === 'undefined' || hasCheckedLocalMigration) return;
  hasCheckedLocalMigration = true;

  try {
    if (localStorage.getItem('cutelaria_migration_completed_v2')) {
      return;
    }
  } catch (_) {}

  try {
    // 1. Check local storage / IndexedDB for user-created knives
    let localKnives: Knife[] = [];

    // Try IndexedDB
    try {
      const { idbGetKnives } = await import('./indexedDbStorage');
      const idbList = await idbGetKnives();
      if (Array.isArray(idbList) && idbList.length > 0) {
        localKnives = idbList;
      }
    } catch (_) {}

    // Try legacy localStorage keys if IndexedDB was empty
    if (localKnives.length === 0) {
      const keysToTest = [
        'cutelaria_knives_v1',
        'cutelaria_catalog_v1',
        'knives',
        'cutelaria_knives',
        'saved_knives',
        'catalog',
        'cutelaria_products',
        'products'
      ];
      for (const k of keysToTest) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              localKnives = parsed;
              break;
            }
          }
        } catch (_) {}
      }
    }

    const realLocalKnives = localKnives.filter((k) => k && (k.name || k.code));

    if (realLocalKnives.length > 0) {
      console.log(`[Firebase Migration] 🚀 Detectadas ${realLocalKnives.length} facas locais no notebook. Sincronizando com o Firestore universal...`);
      for (const knife of realLocalKnives) {
        try {
          await saveKnifeFirebase(knife);
        } catch (e) {
          console.warn('[Firebase Migration] Falha ao sincronizar faca:', knife.name, e);
        }
      }
      console.log(`[Firebase Migration] ✓ Migração de facas concluída.`);
    }

    // 2. Migrate local customers
    try {
      const rawCust = localStorage.getItem('cutelaria_customers_v1');
      if (rawCust) {
        const customers = JSON.parse(rawCust);
        if (Array.isArray(customers) && customers.length > 0) {
          for (const c of customers) {
            if (c && c.id && c.name) {
              await saveCustomerFirebase(c);
            }
          }
        }
      }
    } catch (_) {}

    // 3. Migrate local sales
    try {
      const rawSales = localStorage.getItem('cutelaria_sales_log_v1');
      if (rawSales) {
        const sales = JSON.parse(rawSales);
        if (Array.isArray(sales) && sales.length > 0) {
          for (const s of sales) {
            if (s && s.id && !s.id.startsWith('synth-')) {
              await saveSaleFirebase(s);
            }
          }
        }
      }
    } catch (_) {}

    try {
      localStorage.setItem('cutelaria_migration_completed_v2', 'true');
    } catch (_) {}
  } catch (err) {
    console.warn('[Firebase Migration] Erro durante checagem de migração:', err);
  }
}

/**
 * No auto-seeding: Firestore collection 'knives' is the sole authoritative source.
 * When empty, it stays empty until the administrator explicitly creates products.
 */
export async function seedInitialKnivesIfEmpty(_initialKnives: Knife[]): Promise<void> {
  // Deliberately no-op: never populate mock/initial knives automatically
}

