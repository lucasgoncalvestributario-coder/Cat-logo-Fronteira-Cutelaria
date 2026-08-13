import { useState, useEffect, useMemo, useCallback } from 'react';
import { ActiveTab, Knife, FilterState, StoreConfig } from './types';
import {
  fetchKnives,
  saveKnifeToApi,
  deleteKnifeFromApi,
  importCatalogToApi,
  fetchStoreConfig,
  saveStoreConfig
} from './lib/storage';
import { subscribeToKnivesFirebase, subscribeToConfigFirebase } from './lib/firebase';
import { generateGeneralWhatsAppLink } from './lib/whatsapp';
import { isSameCategory } from './lib/categories';

import { EmberBackground } from './components/EmberBackground';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { KnifeCard } from './components/KnifeCard';
import { SearchAndFilter } from './components/SearchAndFilter';
import { KnifeDetailModal } from './components/KnifeDetailModal';
import { CustomKnifeConfigurator } from './components/CustomKnifeConfigurator';
import { AdminPanelModal } from './components/AdminPanelModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

import { SplashScreen } from './components/SplashScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [knives, setKnives] = useState<Knife[]>([]);
  const [config, setConfig] = useState<StoreConfig>({
    whatsappNumber: '554792787901',
    storeName: 'FRONTEIRA CUTELARIA',
    adminPin: '251127',
    welcomeMessage: 'Olá! Gostaria de mais informações sobre o catálogo da Fronteira Cutelaria.',
  });

  // Filter & Search State (Default category: 'TODAS')
  const [filter, setFilter] = useState<FilterState>({
    category: 'TODAS',
    searchQuery: '',
    steelFilter: '',
    sortBy: 'featured',
  });

  // Selected Knife for Detail Modal
  const [selectedKnife, setSelectedKnife] = useState<Knife | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Admin Modal State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  // PWA Install Prompt & Standalone Mode Detection
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isAndroidApp = document.referrer.includes('android-app://');
    return isStandaloneMatch || isIOSStandalone || isAndroidApp;
  });

  const loadData = useCallback(async () => {
    try {
      const loadedKnives = await fetchKnives(true);
      if (Array.isArray(loadedKnives)) {
        setKnives(loadedKnives);
      }
    } catch (_) {}

    try {
      const loadedConfig = await fetchStoreConfig();
      if (loadedConfig) {
        setConfig(loadedConfig);
      }
    } catch (_) {}
  }, []);

  // Initial Data Load, Firebase Real-Time Firestore Sync & Window Focus Listener
  useEffect(() => {
    loadData();

    // 1. PRIMARY: Real-time synchronization via Firebase Firestore onSnapshot
    // Instantaneous universal broadcast across all devices, browsers and Netlify clients worldwide
    let unsubKnives: (() => void) | null = null;
    let unsubConfig: (() => void) | null = null;

    try {
      unsubKnives = subscribeToKnivesFirebase((liveKnives) => {
        if (Array.isArray(liveKnives)) {
          console.log('[Firebase Live] 🔥 Atualização universal recebida do Firestore:', liveKnives.length, 'facas');
          setKnives(liveKnives);
        }
      });

      unsubConfig = subscribeToConfigFirebase((liveConfig) => {
        if (liveConfig) {
          console.log('[Firebase Live] 🔥 Configuração atualizada do Firestore:', liveConfig);
          setConfig((prev) => ({ ...prev, ...liveConfig }));
        }
      });
    } catch (fbErr) {
      console.warn('[Firebase] Erro ao conectar listener:', fbErr);
    }

    // 2. SECONDARY: Server-Sent Events (SSE) fallback for local dev / express proxy
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'knives_updated' && Array.isArray(payload.data)) {
            setKnives(payload.data);
          } else if (payload.type === 'config_updated' && payload.data) {
            setConfig((prev) => ({ ...prev, ...payload.data }));
          }
        } catch (_) {}
      };
      eventSource.onerror = () => {};
    } catch (_) {}

    // 3. Re-sync immediately whenever the user switches back to this tab or unlocks their phone
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    const handleWindowFocus = () => {
      loadData();
    };
    const handleOnline = () => {
      loadData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('online', handleOnline);

    // 4. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }

    // Check standalone mode again in case display mode changes
    const checkStandalone = () => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      if (isStandaloneMatch || isIOSStandalone || isAndroidApp) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Capture PWA Install prompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Detect when PWA installation completes
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsInstallModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Periodic backup sync
    const interval = setInterval(() => {
      loadData();
    }, 6000);

    return () => {
      if (unsubKnives) unsubKnives();
      if (unsubConfig) unsubConfig();
      if (eventSource) eventSource.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, [loadData]);

  // Helper to normalize strings for category comparison (handles accents, spaces, upper/lowercase)
  const normalizeCat = (cat: string) =>
    String(cat || '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

  // Filter Knives logic according to category and searchQuery
  const filteredKnives = useMemo(() => {
    return knives
      .filter((k) => !k.isHidden)
      .filter((k) => {
        // Category filter
        if (filter.category && filter.category !== 'TODAS') {
          if (!isSameCategory(k.category, filter.category)) {
            return false;
          }
        }

        // Search query
        if (filter.searchQuery && filter.searchQuery.trim()) {
          const q = filter.searchQuery.toLowerCase().trim();
          const matchName = k.name ? k.name.toLowerCase().includes(q) : false;
          const matchCode = k.code ? k.code.toLowerCase().includes(q) : false;
          const matchCategory = k.category ? String(k.category).toLowerCase().includes(q) : false;
          const matchSteel = k.steelType ? k.steelType.toLowerCase().includes(q) : false;
          return matchName || matchCode || matchCategory || matchSteel;
        }

        return true;
      });
  }, [knives, filter]);

  // Open Knife Detail Modal
  const handleOpenKnifeDetail = (knife: Knife) => {
    setSelectedKnife(knife);
    setIsDetailModalOpen(true);
  };

  // Admin CRUD Handlers - Instant local reactivity + backend persistence
  const handleSaveKnife = async (knifeToSave: Partial<Knife>) => {
    console.log('[App] 🚀 handleSaveKnife recebido:', knifeToSave);
    try {
      const saved = await saveKnifeToApi(knifeToSave);
      console.log('[App] ✓ Faca retornada por saveKnifeToApi:', saved);
      setKnives((prev) => {
        const idx = prev.findIndex((item) => item.id === saved.id || (saved.code && item.code === saved.code));
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = saved;
          console.log(`[App] ✓ Catálogo atualizado: Faca editada no índice ${idx}.`);
          return updated;
        }
        console.log('[App] ✓ Catálogo atualizado: Nova faca inserida no topo.');
        return [saved, ...prev];
      });
      return saved;
    } catch (err) {
      console.error('[App] ❌ Erro ao processar handleSaveKnife:', err);
      throw err;
    }
  };

  const handleDeleteKnife = async (id: string) => {
    const targetId = String(id || '').trim();
    setKnives((prev) => prev.filter((k) => String(k.id || '').trim() !== targetId && String(k.code || '').trim() !== targetId));
    const success = await deleteKnifeFromApi(targetId);
    return success;
  };

  const handleImportCatalog = async (catalog: Knife[]) => {
    setKnives(catalog);
    const success = await importCatalogToApi(catalog);
    await loadData();
    return success;
  };

  const handleSaveConfig = async (newCfg: StoreConfig) => {
    const success = await saveStoreConfig(newCfg);
    setConfig(newCfg);
    return success;
  };

  const handleOpenGeneralWhatsApp = () => {
    const url = generateGeneralWhatsAppLink(config.welcomeMessage, config.whatsappNumber);
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen relative bg-black text-zinc-100 flex flex-col font-sans pb-24 sm:pb-12">
      {/* Premium Initial Loading Splash Screen */}
      <SplashScreen durationMs={1800} />

      {/* Animated Forge Ember & Particles Background */}
      <EmberBackground />

      {/* Top Navigation Header Bar */}
      <Header
        config={config}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
        onOpenInstallModal={!isInstalled ? () => setIsInstallModalOpen(true) : undefined}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-1.5 sm:px-4 w-full">
        
        {/* TAB 1: CATALOG VIEW */}
        {activeTab === 'catalog' && (
          <div className="space-y-3 sm:space-y-4">
            {/* Real-time Category Filters */}
            <SearchAndFilter
              filter={filter}
              onFilterChange={setFilter}
              totalResults={filteredKnives.length}
              knives={knives}
            />

            {/* Catalog Grid */}
            {filteredKnives.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 my-2 sm:my-4">
                {filteredKnives.map((knife) => (
                  <KnifeCard
                    key={knife.id}
                    knife={knife}
                    onClickCard={handleOpenKnifeDetail}
                  />
                ))}
              </div>
            ) : (
              /* No Results Found State */
              <div className="p-10 text-center rounded-3xl bg-metallic-card border border-white/10 my-6 space-y-3">
                <span className="text-4xl">🗡️</span>
                <h3 className="font-serif-luxury text-lg font-bold text-white">Nenhuma faca encontrada nesta categoria</h3>
                <p className="text-xs text-zinc-400">
                  Selecione outra categoria para visualizar os modelos disponíveis.
                </p>
                <button
                  onClick={() => setFilter({ category: 'TODAS', searchQuery: '', steelFilter: '', sortBy: 'featured' })}
                  className="px-4 py-2 rounded-xl bg-[#ff6b00] text-white text-xs font-bold cursor-pointer hover:brightness-110 uppercase"
                >
                  Ver Todas as Facas
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXCLUSIVA VIEW */}
        {activeTab === 'custom' && (
          <CustomKnifeConfigurator whatsappNumber={config.whatsappNumber} />
        )}
      </main>

      {/* Footer Heritage Section */}
      <footer className="relative z-10 border-t border-white/10 bg-black/90 mt-12 py-8 px-4 text-center text-xs text-zinc-500 space-y-3">
        <div className="flex flex-col items-center justify-center gap-2">
          <h2 className="font-serif-luxury text-base sm:text-lg font-extrabold text-white tracking-wider uppercase">
            {config.storeName || 'FRONTEIRA CUTELARIA'}
          </h2>
          <span className="text-xs text-[#ff6b00] font-bold tracking-widest uppercase">
            facas artesanais
          </span>
        </div>
        <p className="max-w-md mx-auto text-zinc-400">
          Cada faca tem uma história. Na Fronteira Cutelaria, ela também tem nome e sobrenome.
        </p>
        <div className="flex items-center justify-center gap-4 text-zinc-400 font-medium">
          <span>• Atendimento exclusivo via WhatsApp</span>
        </div>
        <p className="text-[10px] text-zinc-600">
          © {new Date().getFullYear()} {config.storeName || 'FRONTEIRA CUTELARIA'}. Todos os direitos reservados.
        </p>
      </footer>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenWhatsApp={handleOpenGeneralWhatsApp}
      />

      {/* Modals & Overlays */}
      <KnifeDetailModal
        knife={selectedKnife}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        whatsappNumber={config.whatsappNumber}
      />

      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        knives={knives}
        onSaveKnife={handleSaveKnife}
        onDeleteKnife={handleDeleteKnife}
        onImportCatalog={handleImportCatalog}
        config={config}
        onSaveConfig={handleSaveConfig}
      />

      <PWAInstallPrompt
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstalled={() => setIsInstalled(true)}
      />
    </div>
  );
}
