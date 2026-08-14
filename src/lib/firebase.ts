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
  projectId: firebaseConfigJson.projectId || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0135363209",
  appId: firebaseConfigJson.appId || (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:141072856887:web:3a4550b04d4ca4824e4cb2",
  apiKey: firebaseConfigJson.apiKey || (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyBULwAyVqjGDoTyY9prVqa-VUQWcaZQEHc",
  authDomain: firebaseConfigJson.authDomain || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0135363209.firebaseapp.com",
  firestoreDatabaseId: firebaseConfigJson.firestoreDatabaseId || (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || "ai-studio-cutelariaartesan-d1fa4ca2-bee4-4acf-9272-96423c649f61",
  storageBucket: firebaseConfigJson.storageBucket || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0135363209.firebasestorage.app",
  messagingSenderId: firebaseConfigJson.messagingSenderId || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "141072856887",
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with custom Database ID
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

console.log(`[Firebase] 🔥 Firestore conectado ao projeto "${firebaseConfig.projectId}" (Banco: "${firebaseConfig.firestoreDatabaseId || 'default'}")`);

const KNIVES_COLLECTION = 'knives';
const CONFIG_COLLECTION = 'config';
const CONFIG_DOC_ID = 'main_config';

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
    (snapshot) => {
      const knivesList: Knife[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Knife;
        knivesList.push({
          ...data,
          id: docSnap.id || data.id,
        });
      });

      console.log(`[Firebase] ⚡ ${knivesList.length} facas sincronizadas em tempo real via Firestore.`);
      onUpdate(knivesList);
    },
    (error) => {
      console.error('[Firebase] ❌ Erro no listener em tempo real do Firestore:', error);
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
        onUpdate(data);
      }
    },
    (err) => {
      console.warn('[Firebase] Aviso ao escutar configurações:', err);
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
  } catch (err) {
    console.error('[Firebase] Erro ao buscar facas do Firestore:', err);
    throw err;
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
    console.error('[Firebase] Erro ao salvar configurações no Firestore:', err);
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
    console.error('[Firebase] Erro ao buscar configurações do Firestore:', err);
  }
  return null;
}

/**
 * No auto-seeding: Firestore collection 'knives' is the sole authoritative source.
 * When empty, it stays empty until the administrator explicitly creates products.
 */
export async function seedInitialKnivesIfEmpty(_initialKnives: Knife[]): Promise<void> {
  // Deliberately no-op: never populate mock/initial knives automatically
}

