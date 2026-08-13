import { safeSetLocalStorage } from './storage';

export function normalizeCatString(cat: string): string {
  if (!cat) return '';
  return String(cat)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

/**
 * Checks if two category strings match conceptually.
 * Handles exact match, case/accent differences, and Portuguese plurals/synonyms:
 * e.g., "COLECIONADOR" <-> "COLECIONADORES"
 * e.g., "TIMES" <-> "TIME"
 * e.g., "TRADICIONAIS" <-> "TRADICIONAL"
 * e.g., "CAMPEIRAS" <-> "RÚSTICAS"
 */
export function isSameCategory(cat1: string, cat2: string): boolean {
  const norm1 = normalizeCatString(cat1);
  const norm2 = normalizeCatString(cat2);

  if (!norm1 || !norm2) return false;
  if (norm1 === 'TODAS' || norm2 === 'TODAS') return true;
  if (norm1 === norm2) return true;

  // Handle CAMPEIRAS <-> RUSTICAS equivalence for legacy data
  if ((norm1 === 'CAMPEIRAS' || norm1 === 'CAMPEIRA') && (norm2 === 'RUSTICAS' || norm2 === 'RUSTICA' || norm2 === 'RUSTICAS')) return true;
  if ((norm2 === 'CAMPEIRAS' || norm2 === 'CAMPEIRA') && (norm1 === 'RUSTICAS' || norm1 === 'RUSTICA' || norm1 === 'RUSTICAS')) return true;

  // Root stem extraction
  const getStem = (s: string) => {
    let stem = s;
    if (stem.endsWith('ADORES')) return stem.slice(0, -2);
    if (stem.endsWith('ADOR')) return stem;
    if (stem.endsWith('AIS')) return stem.slice(0, -2) + 'L';
    if (stem.endsWith('AL')) return stem;
    if (stem.endsWith('ES')) return stem.slice(0, -2);
    if (stem.endsWith('S')) return stem.slice(0, -1);
    return stem;
  };

  return getStem(norm1) === getStem(norm2);
}

export const DEFAULT_BASE_CATEGORIES = [
  'TODAS',
  'PROMOÇÕES',
  'RÚSTICAS',
  'TRADICIONAIS',
  'TIMES',
  'PREMIUM',
  'COLECIONADOR'
];

const CATEGORIES_KEY = 'cutelaria_all_active_categories_v2';
const CUSTOM_CATS_KEY = 'cutelaria_custom_categories_v1';

export function getAllCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure 'TODAS' is at index 0
        const withoutTodas = parsed.filter(c => String(c).trim().toUpperCase() !== 'TODAS');
        return ['TODAS', ...withoutTodas];
      }
    }

    // Migration / Fallback: check legacy custom categories
    const legacyCustom = getStoredCustomCategories();
    const merged = [...DEFAULT_BASE_CATEGORIES];
    legacyCustom.forEach((c) => {
      const clean = String(c).trim().toUpperCase();
      if (clean && !merged.some((m) => isSameCategory(m, clean))) {
        merged.push(clean);
      }
    });

    safeSetLocalStorage(CATEGORIES_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error('Error reading categories:', e);
  }
  return [...DEFAULT_BASE_CATEGORIES];
}

export const BASE_CATEGORIES = DEFAULT_BASE_CATEGORIES;

export function getStoredCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_CATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading custom categories:', e);
  }
  return [];
}

export function saveCategory(newCat: string): string[] {
  const clean = String(newCat || '').trim().toUpperCase();
  if (!clean || clean === 'TODAS') return getAllCategories();

  const current = getAllCategories();
  const exists = current.some((c) => isSameCategory(c, clean));

  if (!exists) {
    const updated = [...current, clean];
    safeSetLocalStorage(CATEGORIES_KEY, JSON.stringify(updated));
    // Sync legacy key as well
    const legacy = getStoredCustomCategories();
    if (!legacy.some((l) => isSameCategory(l, clean))) {
      safeSetLocalStorage(CUSTOM_CATS_KEY, JSON.stringify([...legacy, clean]));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('categories_updated'));
    }
    return updated;
  }

  return current;
}

export function saveCustomCategory(newCat: string): string[] {
  return saveCategory(newCat);
}

export function deleteCategory(catToDelete: string): string[] {
  const clean = String(catToDelete || '').trim().toUpperCase();
  if (!clean || clean === 'TODAS') return getAllCategories();

  const current = getAllCategories();
  const updated = current.filter((c) => !isSameCategory(c, clean) && c.trim().toUpperCase() !== clean);

  safeSetLocalStorage(CATEGORIES_KEY, JSON.stringify(updated));

  // Sync legacy key
  const legacy = getStoredCustomCategories();
  const updatedLegacy = legacy.filter((l) => !isSameCategory(l, clean) && l.trim().toUpperCase() !== clean);
  safeSetLocalStorage(CUSTOM_CATS_KEY, JSON.stringify(updatedLegacy));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('categories_updated'));
  }

  return updated;
}

