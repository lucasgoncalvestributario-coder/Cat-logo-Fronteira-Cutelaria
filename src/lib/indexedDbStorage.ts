import { Knife } from '../types';

const DB_NAME = 'FronteiraCutelariaDB_v1';
const STORE_KNIVES = 'knives';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_KNIVES)) {
        db.createObjectStore(STORE_KNIVES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveKnives(knives: Knife[]): Promise<void> {
  if (!Array.isArray(knives) || knives.length === 0) {
    return;
  }
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_KNIVES, 'readwrite');
    const store = tx.objectStore(STORE_KNIVES);
    
    // Clear and re-populate with new non-empty list
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const k of knives) {
      if (k && k.id) {
        store.put(k);
      }
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save knives error:', err);
  }
}

export async function idbClearKnives(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_KNIVES, 'readwrite');
    const store = tx.objectStore(STORE_KNIVES);
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });
  } catch (_) {}
}

export async function idbGetKnives(): Promise<Knife[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_KNIVES, 'readonly');
    const store = tx.objectStore(STORE_KNIVES);

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB get knives error:', err);
    return [];
  }
}

export async function idbPutKnife(knife: Knife): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_KNIVES, 'readwrite');
    const store = tx.objectStore(STORE_KNIVES);
    store.put(knife);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB put knife error:', err);
  }
}

export async function idbDeleteKnife(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_KNIVES, 'readwrite');
    const store = tx.objectStore(STORE_KNIVES);
    store.delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB delete knife error:', err);
  }
}
