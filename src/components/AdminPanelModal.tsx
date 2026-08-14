import React, { useState, useMemo, useRef } from 'react';
import { Lock, X, Plus, Edit, Trash2, Eye, Upload, Settings, AlertCircle, Save, CheckCircle, FolderPlus, ShoppingBag, DollarSign, Calendar, TrendingUp, Package, RotateCcw, AlertTriangle, CheckCircle2, Search, Flame, Users, Gift, Cake, FileBarChart, Home, Volume2, VolumeX, Sparkles, Tag, Printer, Download, RefreshCw } from 'lucide-react';
import { Knife, StoreConfig, Category } from '../types';
import { formatCurrencyBRL, generateKnifeWhatsAppLink } from '../lib/whatsapp';
import { BASE_CATEGORIES, getAllCategories, saveCategory, deleteCategory, isSameCategory } from '../lib/categories';
import { getNextKnifeCode } from '../lib/codeUtils';
import { getStoredSalesLog, fetchSalesLogAPI, saveSaleRecord, removeSaleRecord, clearSalesLog, SaleRecord, PaymentMethod } from '../lib/salesStorage';
import { compressImageFile } from '../lib/imageCompressor';
import { CrmSection } from './CrmSection';
import { SelectCustomerSaleModal } from './SelectCustomerSaleModal';
import { SalesReportModal } from './SalesReportModal';
import { Customer, getStoredCustomers, getBirthdayMatches, getCustomerLastPurchaseInfo } from '../lib/customersStorage';
import { playVaniVoiceReport, stopVoiceReport } from '../lib/adminVoiceReport';
import { subscribeToSalesFirebase } from '../lib/firebase';

export const DEFAULT_STEEL_TYPES = [
  'Disco de Arado',
  'Aço Carbono 1070',
  'Aço Inox 420C',
  'Aço Damasco',
];

export const DEFAULT_HANDLE_MATERIALS = [
  'Híbrido',
  'Resina com Madeira',
  'Osso',
  'Chifre',
  'Madeira Tradicional',
  'Madeira Nobre',
];

export const DEFAULT_LENGTH_OPTIONS = [
  '4"',
  '5"',
  '6"',
  '7"',
  '8"',
  '9"',
  '10"',
  '11"',
  '12"',
];

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  knives: Knife[];
  onSaveKnife: (knife: Partial<Knife>) => Promise<Knife>;
  onDeleteKnife: (id: string) => Promise<boolean>;
  onImportCatalog?: (catalog: Knife[]) => Promise<boolean>;
  config: StoreConfig;
  onSaveConfig: (cfg: StoreConfig) => Promise<boolean>;
}

export function AdminPanelModal({
  isOpen,
  onClose,
  knives,
  onSaveKnife,
  onDeleteKnife,
  onImportCatalog,
  config,
  onSaveConfig,
}: AdminPanelModalProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Sub-tabs in admin panel: 'knives' | 'vendas' | 'crm' | 'categories' | 'form' | 'settings'
  const [activeTab, setActiveTab] = useState<'knives' | 'vendas' | 'crm' | 'categories' | 'form' | 'settings'>('knives');

  // Customer sale modal state
  const [saleTargetKnife, setSaleTargetKnife] = useState<Knife | null>(null);
  const [isSelectCustomerModalOpen, setIsSelectCustomerModalOpen] = useState(false);
  const [pendingSaleKnife, setPendingSaleKnife] = useState<Knife | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<PaymentMethod>('pix');
  const [crmSubTab, setCrmSubTab] = useState<'clientes' | 'aniversariantes' | 'fidelidade' | 'novo_cliente'>('clientes');

  // Sales report modal state
  const [isSalesReportOpen, setIsSalesReportOpen] = useState(false);

  // Vendas internal sub-tabs: 'historico' | 'esgotadas'
  const [vendasSubTab, setVendasSubTab] = useState<'historico' | 'esgotadas'>('historico');

  // Sales log state
  const [salesLog, setSalesLog] = useState<SaleRecord[]>([]);
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [synthSalesCleared, setSynthSalesCleared] = useState(false);

  // Search by code/name in admin
  const [searchCodeQuery, setSearchCodeQuery] = useState('');

  // Form editing state
  const [editingKnife, setEditingKnife] = useState<Partial<Knife> | null>(null);
  const [knifeImages, setKnifeImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isSavingKnife, setIsSavingKnife] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState('');

  // Preview Knife state
  const [previewKnife, setPreviewKnife] = useState<Knife | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<StoreConfig>(config);
  const [saveMessage, setSaveMessage] = useState('');

  // All active categories state
  const [allCategoriesList, setAllCategoriesList] = useState<string[]>(() => getAllCategories());
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Keep categories list updated when categories_updated event fires
  React.useEffect(() => {
    const handleCatsUpdated = () => {
      setAllCategoriesList(getAllCategories());
    };
    window.addEventListener('categories_updated', handleCatsUpdated);
    return () => window.removeEventListener('categories_updated', handleCatsUpdated);
  }, []);

  // Custom options states for Steel, Handle, and Length
  const [isCustomSteel, setIsCustomSteel] = useState(false);
  const [isCustomHandle, setIsCustomHandle] = useState(false);
  const [isCustomLength, setIsCustomLength] = useState(false);

  // Compute code uniqueness & real-time knife form validations
  const currentKnifeCode = (editingKnife?.code || '').trim().toUpperCase();
  const currentKnifeName = (editingKnife?.name || '').trim();
  const currentKnifePrice = Number(editingKnife?.price);

  const isKnifeCodeDuplicate = useMemo(() => {
    if (!currentKnifeCode) return false;
    return knives.some(
      (k) => k.id !== editingKnife?.id && (k.code || '').trim().toUpperCase() === currentKnifeCode
    );
  }, [knives, editingKnife?.id, currentKnifeCode]);

  const isKnifeCodeEmpty = currentKnifeCode.length === 0;
  const isKnifeNameEmpty = currentKnifeName.length === 0;
  const isKnifeNameInvalid = currentKnifeName.length > 0 && currentKnifeName.length < 3;
  const isKnifePriceInvalid = isNaN(currentKnifePrice) || currentKnifePrice <= 0;
  const isKnifeImagesEmpty = knifeImages.length === 0;

  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  // Play daily audio report on first admin load of the day (only in Admin)
  React.useEffect(() => {
    if (isOpen && isAuthenticated) {
      const customers = getStoredCustomers();
      const { today, thisMonth } = getBirthdayMatches(customers);
      const birthdaysCount = today.length + thisMonth.length;
      const fidelityCount = customers.filter(c => c.purchasesCount >= 10).length;
      const soldOutCount = knives.filter(k => k.isOutofStock || k.status === 'esgotado' || (typeof k.quantity === 'number' && k.quantity <= 0)).length;
      const allSales = getStoredSalesLog();
      const inactiveCount = customers.filter(c => getCustomerLastPurchaseInfo(c, allSales).isInactive20Days).length;

      const timer = setTimeout(() => {
        playVaniVoiceReport({
          birthdaysCount,
          soldOutCount,
          fidelityCount,
          inactiveCount,
        }, false);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [isOpen, isAuthenticated, knives]);

  const handleManualTriggerVoiceReport = () => {
    const customers = getStoredCustomers();
    const { today, thisMonth } = getBirthdayMatches(customers);
    const birthdaysCount = today.length + thisMonth.length;
    const fidelityCount = customers.filter(c => c.purchasesCount >= 10).length;
    const soldOutCount = knives.filter(k => k.isOutofStock || k.status === 'esgotado' || (typeof k.quantity === 'number' && k.quantity <= 0)).length;
    const allSales = getStoredSalesLog();
    const inactiveCount = customers.filter(c => getCustomerLastPurchaseInfo(c, allSales).isInactive20Days).length;

    setIsPlayingVoice(true);
    playVaniVoiceReport({
      birthdaysCount,
      soldOutCount,
      fidelityCount,
      inactiveCount,
    }, true);
    setTimeout(() => setIsPlayingVoice(false), 8000);
  };

  // Always require authentication every time Admin modal is opened
  React.useEffect(() => {
    let unsubSales: (() => void) | null = null;

    if (isOpen) {
      setIsAuthenticated(false);
      setPinInput('');
      setAuthError('');
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token');
      }
      setSalesLog(getStoredSalesLog());

      try {
        unsubSales = subscribeToSalesFirebase((liveSales) => {
          if (Array.isArray(liveSales) && liveSales.length > 0) {
            setSalesLog(liveSales);
          }
        });
      } catch (_) {}
    } else {
      setIsAuthenticated(false);
      setPinInput('');
      setAuthError('');
      setActiveTab('knives');
      setEditingKnife(null);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token');
      }
    }

    return () => {
      if (unsubSales) {
        unsubSales();
      }
    };
  }, [isOpen]);

  // Clean up session token on tab or browser window unload
  React.useEffect(() => {
    const invalidateSession = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('admin_token');
        localStorage.removeItem('admin_token');
      }
    };

    window.addEventListener('beforeunload', invalidateSession);
    window.addEventListener('pagehide', invalidateSession);

    return () => {
      window.removeEventListener('beforeunload', invalidateSession);
      window.removeEventListener('pagehide', invalidateSession);
    };
  }, []);

  // Keyboard shortcut: Escape key closes preview or locks admin modal
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewKnife) {
          setPreviewKnife(null);
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, previewKnife]);

  const handleClose = () => {
    setIsAuthenticated(false);
    setPinInput('');
    setAuthError('');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('admin_token');
      localStorage.removeItem('admin_token');
    }
    onClose();
  };

  // Compute all sales records: stored salesLog + any sold-out knife in knives catalog
  const allSalesRecords = useMemo(() => {
    const list = [...salesLog];

    if (!synthSalesCleared) {
      knives.forEach((k) => {
        const isSoldOut = k.isOutofStock || k.status === 'esgotado' || (typeof k.quantity === 'number' && k.quantity <= 0);
        if (isSoldOut) {
          const alreadyInLog = list.some((s) => s.knifeId === k.id || (s.code && s.code === k.code));
          if (!alreadyInLog) {
            list.push({
              id: `synth-${k.id}`,
              knifeId: k.id,
              code: k.code || 'FC-000',
              name: k.name,
              price: Number(k.price) || 0,
              soldAt: 'Registrado',
              category: String(k.category || 'GERAL'),
              images: k.images || [],
            });
          }
        }
      });
    }

    return list;
  }, [salesLog, knives, synthSalesCleared]);

  // Today's Sales Calculations
  const todayDateStr = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }, []);

  const todaySalesRecords = useMemo(() => {
    return allSalesRecords.filter((item) => {
      if (item.timestamp) {
        return new Date(item.timestamp).toDateString() === new Date().toDateString();
      }
      if (item.soldAt && item.soldAt.includes('/')) {
        return item.soldAt.startsWith(todayDateStr);
      }
      return false;
    });
  }, [allSalesRecords, todayDateStr]);

  const todaySalesCount = todaySalesRecords.length;
  const todaySalesValue = useMemo(() => {
    return todaySalesRecords.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [todaySalesRecords]);

  // Current Month Reference (zeros out automatically on the 1st of every month)
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const currentMonthName = useMemo(() => {
    const d = new Date();
    const lbl = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return lbl.charAt(0).toUpperCase() + lbl.slice(1);
  }, []);

  const currentMonthSalesRecords = useMemo(() => {
    return allSalesRecords.filter((item) => {
      if (item.timestamp) {
        const d = new Date(item.timestamp);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === currentMonthKey;
      }
      return false;
    });
  }, [allSalesRecords, currentMonthKey]);

  const currentMonthSalesCount = currentMonthSalesRecords.length;
  const currentMonthSalesValue = useMemo(() => {
    return currentMonthSalesRecords.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [currentMonthSalesRecords]);

  const totalSalesCount = allSalesRecords.length;
  const totalSalesValue = useMemo(() => {
    return allSalesRecords.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  }, [allSalesRecords]);

  // Total Available Stock in Catalog
  const totalAvailableStock = useMemo(() => {
    return knives.reduce((sum, k) => {
      const qty = typeof k.quantity === 'number' ? k.quantity : 0;
      return sum + Math.max(0, qty);
    }, 0);
  }, [knives]);

  // Sold Out Items (0 units left)
  const soldOutKnives = useMemo(() => {
    return knives.filter((k) => {
      const qty = typeof k.quantity === 'number' ? k.quantity : 0;
      return k.isOutofStock || k.status === 'esgotado' || qty <= 0;
    });
  }, [knives]);

  // Filtered Sales Records based on Search Query
  const filteredSalesRecords = useMemo(() => {
    if (!salesSearchQuery.trim()) return allSalesRecords;
    const q = salesSearchQuery.toLowerCase().trim();
    return allSalesRecords.filter(
      (s) =>
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.category && String(s.category).toLowerCase().includes(q))
    );
  }, [allSalesRecords, salesSearchQuery]);

  // Dynamically computed list of allowed categories for dropdown
  const allowedCategoriesList = useMemo(() => {
    return allCategoriesList.filter((c) => c !== 'TODAS');
  }, [allCategoriesList]);

  if (!isOpen) return null;

  // PIN Login handler
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pinInput.trim().replace(/\s+/g, '');
    const currentConfigPin = String(config.adminPin || '251127').trim().replace(/\s+/g, '');

    try {
      const res = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: cleanInput }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) {
          sessionStorage.setItem('admin_token', data.token);
        }
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        // Direct backup validation for master pin 251127 or config pin
        if (cleanInput === '251127' || cleanInput === currentConfigPin) {
          sessionStorage.setItem('admin_token', 'authenticated-admin-session');
          setIsAuthenticated(true);
          setAuthError('');
          return;
        }
        const errData = await res.json().catch(() => null);
        setAuthError(errData?.message || 'Senha incorreta. Tente novamente.');
      }
    } catch (err) {
      if (cleanInput === '251127' || cleanInput === currentConfigPin) {
        sessionStorage.setItem('admin_token', 'authenticated-admin-session');
        setIsAuthenticated(true);
        setAuthError('');
      } else {
        setAuthError('Senha incorreta. Tente novamente.');
      }
    }
  };

  // Filter knives by code search query
  const filteredKnives = knives.filter((k) => {
    if (!searchCodeQuery.trim()) return true;
    const q = searchCodeQuery.toLowerCase().trim();
    return (
      (k.code && k.code.toLowerCase().includes(q)) ||
      (k.name && k.name.toLowerCase().includes(q))
    );
  });

  const handleOpenNewForm = () => {
    console.log('[AdminPanel] ➕ Abrindo formulário de cadastro de nova faca.');
    setFormErrorMessage('');
    setIsCustomSteel(false);
    setIsCustomHandle(false);
    setIsCustomLength(false);
    setEditingKnife({
      name: '',
      code: getNextKnifeCode(knives),
      price: 0,
      isOnSale: false,
      originalPrice: undefined,
      promotionalPrice: undefined,
      category: 'RÚSTICAS',
      originalCategory: 'RÚSTICAS',
      steelType: DEFAULT_STEEL_TYPES[0], // Disco de Arado
      handleMaterial: DEFAULT_HANDLE_MATERIALS[0], // Híbrido
      length: '10"',
      quantity: 1,
      isOutofStock: false,
      images: [],
    });
    setKnifeImages([]);
    setActiveTab('form');
  };

  const handleOpenEditForm = (knife: Knife) => {
    console.log(`[AdminPanel] ✏️ Abrindo edição da faca "${knife.name}" (ID: ${knife.id}, Código: ${knife.code}).`);
    setFormErrorMessage('');
    setIsCustomSteel(Boolean(knife.steelType && !DEFAULT_STEEL_TYPES.includes(knife.steelType)));
    setIsCustomHandle(Boolean(knife.handleMaterial && !DEFAULT_HANDLE_MATERIALS.includes(knife.handleMaterial)));
    setIsCustomLength(Boolean(knife.length && !DEFAULT_LENGTH_OPTIONS.includes(knife.length)));
    setEditingKnife({
      ...knife,
      isOnSale: Boolean(knife.isOnSale || knife.category === 'PROMOÇÕES'),
      originalPrice: knife.originalPrice || knife.price,
      promotionalPrice: knife.promotionalPrice || (knife.isOnSale ? knife.price : undefined),
      originalCategory: knife.originalCategory || (knife.category !== 'PROMOÇÕES' ? knife.category : 'RÚSTICAS'),
    });
    setKnifeImages(knife.images && knife.images.length > 0 ? [...knife.images] : []);
    setActiveTab('form');
  };

  const handleSaveKnifeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[AdminPanel] 🖱️ Botão "Salvar produto" acionado pelo usuário.');

    if (!editingKnife) {
      console.warn('[AdminPanel] ⚠️ Nenhum objeto de faca em edição.');
      setFormErrorMessage('Nenhum produto selecionado para salvar.');
      return;
    }

    console.log('[AdminPanel] 📋 Validando campos do formulário...');
    console.log(` - Código: "${currentKnifeCode}"`);
    console.log(` - Nome: "${currentKnifeName}"`);
    console.log(` - Preço: R$ ${currentKnifePrice}`);
    console.log(` - Fotos anexadas: ${knifeImages.length}`);

    if (isUploadingPhotos) {
      const msg = '⚠️ O upload das fotos ainda está em andamento. Aguarde alguns instantes antes de salvar.';
      console.warn('[AdminPanel]', msg);
      setFormErrorMessage(msg);
      return;
    }

    if (isKnifeNameEmpty || isKnifeNameInvalid) {
      const msg = '⚠️ O nome do produto é obrigatório e deve ter no mínimo 3 caracteres.';
      console.warn('[AdminPanel]', msg);
      setFormErrorMessage(msg);
      return;
    }

    if (isKnifeCodeEmpty) {
      const msg = '⚠️ O código de referência é obrigatório (ex: FC-001).';
      console.warn('[AdminPanel]', msg);
      setFormErrorMessage(msg);
      return;
    }

    if (isKnifeCodeDuplicate) {
      const msg = `⚠️ O código de referência "${currentKnifeCode}" já está em uso por outro produto cadastrado. Escolha outro código exclusivo.`;
      console.warn('[AdminPanel]', msg);
      setFormErrorMessage(msg);
      return;
    }

    if (isKnifePriceInvalid) {
      const msg = '⚠️ O preço em Reais (R$) deve ser maior que zero (ex: 350).';
      console.warn('[AdminPanel]', msg);
      setFormErrorMessage(msg);
      return;
    }

    // Clear any previous error message
    setFormErrorMessage('');

    const isSoldOut = Boolean(
      editingKnife.isOutofStock ||
      editingKnife.status === 'esgotado' ||
      (typeof editingKnife.quantity === 'number' && editingKnife.quantity <= 0)
    );

    let formattedLength = (editingKnife.length || '').trim();
    if (
      formattedLength &&
      !formattedLength.endsWith('"') &&
      !formattedLength.includes('"') &&
      !formattedLength.toLowerCase().includes('pol') &&
      !formattedLength.toLowerCase().includes('cm')
    ) {
      formattedLength = `${formattedLength}"`;
    }

    const isOnSale = Boolean(editingKnife.isOnSale);
    const originalPrice = isOnSale ? (Number(editingKnife.originalPrice) || Number(editingKnife.price) || 0) : undefined;
    const promotionalPrice = isOnSale ? (Number(editingKnife.promotionalPrice) || Number(editingKnife.price) || 0) : undefined;
    const finalPrice = isOnSale && promotionalPrice ? promotionalPrice : (Number(editingKnife.price) || 0);

    let finalCategory = editingKnife.category || 'RÚSTICAS';
    let originalCat = editingKnife.originalCategory || (finalCategory !== 'PROMOÇÕES' ? finalCategory : 'RÚSTICAS');

    if (isOnSale) {
      if (finalCategory !== 'PROMOÇÕES') {
        originalCat = finalCategory;
      }
      finalCategory = 'PROMOÇÕES';
    } else {
      if (finalCategory === 'PROMOÇÕES') {
        finalCategory = originalCat || 'RÚSTICAS';
      }
    }

    const finalImages = knifeImages.length > 0 ? knifeImages : [];

    const knifeToSave: Knife = {
      id: editingKnife.id || `faca-${Date.now()}`,
      code: currentKnifeCode,
      name: currentKnifeName,
      price: finalPrice,
      isOnSale,
      originalPrice,
      promotionalPrice,
      category: finalCategory,
      originalCategory: originalCat,
      steelType: editingKnife.steelType || 'Aço Carbono 5160',
      handleMaterial: editingKnife.handleMaterial || 'Madeira Nobre',
      length: formattedLength || '8"',
      isOutofStock: isSoldOut,
      status: isSoldOut ? 'esgotado' : 'disponivel',
      quantity: isSoldOut ? 0 : (typeof editingKnife.quantity === 'number' && editingKnife.quantity > 0 ? editingKnife.quantity : 1),
      images: finalImages,
      description: editingKnife.description || '',
      thickness: editingKnife.thickness,
      weight: editingKnife.weight,
      finish: editingKnife.finish,
      sheathType: editingKnife.sheathType,
      isHidden: Boolean(editingKnife.isHidden)
    };

    console.log('[AdminPanel] ✓ Validações concluídas com sucesso. Objeto pronto para salvar:', knifeToSave);
    setIsSavingKnife(true);
    setSaveMessage('Salvando produto no catálogo...');

    try {
      console.log('[AdminPanel] 📡 Chamando onSaveKnife...');
      await onSaveKnife(knifeToSave);
      console.log('[AdminPanel] ✓ Produto salvo e sincronizado com sucesso no Firestore universal!');
      setSaveMessage(`✓ Faca "${knifeToSave.name}" salva com sucesso no catálogo!`);
      setTimeout(() => setSaveMessage(''), 4000);
      setActiveTab('knives');
    } catch (err: any) {
      console.error('[AdminPanel] ❌ Erro ao salvar produto no Firestore:', err);
      setFormErrorMessage('Não foi possível salvar no banco de dados. Verifique sua conexão e tente novamente.');
      setSaveMessage('⚠️ Não foi possível salvar no banco de dados. Verifique sua conexão e tente novamente.');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSavingKnife(false);
    }
  };

  const handleOpenSaleModal = (knife: Knife) => {
    setSaleTargetKnife(knife);
    setIsSelectCustomerModalOpen(true);
  };

  const handleGoToCrmRegister = (knife: Knife, paymentMethod?: PaymentMethod) => {
    setIsSelectCustomerModalOpen(false);
    setSaleTargetKnife(null);
    setPendingSaleKnife(knife);
    if (paymentMethod) {
      setPendingPaymentMethod(paymentMethod);
    }
    setCrmSubTab('novo_cliente');
    setActiveTab('crm');
  };

  const handleCompleteSaleFromCrm = async (knife: Knife, customer: Customer, paymentMethod?: PaymentMethod) => {
    await handleConfirmSaleWithCustomer(knife, customer, paymentMethod);
    setPendingSaleKnife(null);
  };

  const handleConfirmSaleWithCustomer = async (
    knife: Knife,
    customer: Customer | null,
    paymentMethod?: PaymentMethod
  ) => {
    const currentQty = typeof knife.quantity === 'number' ? knife.quantity : 1;
    const newQty = Math.max(0, currentQty - 1);
    const isSoldOut = newQty === 0;

    // 1. Register sale in sales storage
    const updatedLog = saveSaleRecord(knife, customer, paymentMethod);
    setSalesLog(updatedLog);

    // 2. Automatically subtract 1 from stock and update status
    await onSaveKnife({
      ...knife,
      quantity: newQty,
      isOutofStock: isSoldOut,
      status: isSoldOut ? 'esgotado' : 'disponivel',
    });

    const clientMsg = customer ? ` para ${customer.name} (+1 compra computada)` : '';
    const paymentLabel = paymentMethod ? ` (${paymentMethod.replace('_', ' ').toUpperCase()})` : '';
    setSaveMessage(`✓ Venda registrada da faca "${knife.name}" (CÓD: ${knife.code})${clientMsg}${paymentLabel}! Estoque restante: ${newQty} un.`);
    setTimeout(() => setSaveMessage(''), 4000);
  };

  const handleRegisterSale = async (knife: Knife) => {
    handleOpenSaleModal(knife);
  };

  const handleRemoveSaleItem = (saleId: string) => {
    const updated = removeSaleRecord(saleId);
    setSalesLog(updated);
    setSaveMessage('✓ Registro de venda removido.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleUndoSale = async (sale: SaleRecord) => {
    // 1. Remove sale from sales log if stored immediately
    if (!sale.id.startsWith('synth-')) {
      const updatedLog = removeSaleRecord(sale.id);
      setSalesLog(updatedLog);
    }

    // 2. Add 1 unit back to catalog stock for this knife immediately
    const targetKnife = knives.find((k) => k.id === sale.knifeId || (k.code && k.code === sale.code));
    if (targetKnife) {
      const currentQty = typeof targetKnife.quantity === 'number' ? targetKnife.quantity : 0;
      const restoredQty = currentQty + 1;

      await onSaveKnife({
        ...targetKnife,
        quantity: restoredQty,
        isOutofStock: false,
        status: 'disponivel',
      });

      setSaveMessage(`✓ Venda desfeita imediatamente! 1 unidade da faca "${targetKnife.name}" (CÓD: ${targetKnife.code}) devolvida ao estoque.`);
    } else {
      setSaveMessage('✓ Registro de venda desfeito imediatamente.');
    }

    setTimeout(() => setSaveMessage(''), 3500);
  };

  const handleUndoLastSale = async () => {
    if (allSalesRecords.length === 0) return;
    const lastSale = allSalesRecords[0];
    await handleUndoSale(lastSale);
  };

  const handleRestockKnife = async (knife: Knife, amountToAdd = 1) => {
    const currentQty = typeof knife.quantity === 'number' ? knife.quantity : 0;
    const newQty = Math.max(1, currentQty + amountToAdd);

    await onSaveKnife({
      ...knife,
      quantity: newQty,
      isOutofStock: false,
      status: 'disponivel',
    });

    setSaveMessage(`✓ Estoque de "${knife.name}" atualizado para ${newQty} un.`);
    setTimeout(() => setSaveMessage(''), 3500);
  };

  const handleClearAllSales = () => {
    // Immediate and permanent clear without confirmation popups
    const updated = clearSalesLog();
    setSalesLog(updated);
    setSynthSalesCleared(true);
    setSaveMessage('✓ Histórico de vendas limpo e excluído definitivamente.');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleToggleStatus = async (knife: Knife) => {
    const isCurrentlySoldOut = knife.isOutofStock || knife.status === 'esgotado' || (typeof knife.quantity === 'number' && knife.quantity <= 0);
    
    if (isCurrentlySoldOut) {
      // REATIVAR FACA (DISPONÍVEL)
      await onSaveKnife({
        ...knife,
        isOutofStock: false,
        status: 'disponivel',
        quantity: knife.quantity && knife.quantity > 0 ? knife.quantity : 1,
        isHidden: false,
      });
      setSaveMessage(`✓ Faca "${knife.name}" reativada e disponível para venda!`);
    } else {
      // MARCAR COMO ESGOTADO
      await onSaveKnife({
        ...knife,
        isOutofStock: true,
        status: 'esgotado',
        quantity: 0,
      });
      setSaveMessage(`✓ Faca "${knife.name}" marcada como esgotada!`);
    }
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      const urls = newImageUrl
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => u.length > 0);
      setKnifeImages((prev) => [...prev, ...urls]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setKnifeImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    setSaveMessage('Otimizando e carregando fotos...');

    try {
      for (const file of Array.from(files) as File[]) {
        try {
          const compressed = await compressImageFile(file);
          if (compressed) {
            setKnifeImages((prev) => [...prev, compressed]);
          }
        } catch (err) {
          console.error('Error compressing uploaded file:', err);
        }
      }
      setSaveMessage('✓ Fotos adicionadas com sucesso!');
      setTimeout(() => setSaveMessage(''), 2500);
    } finally {
      setIsUploadingPhotos(false);
      // reset input value so re-uploading the same file works
      e.target.value = '';
    }
  };

  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhotos(true);
    setSaveMessage('Otimizando e carregando fotos...');

    try {
      for (const file of Array.from(files) as File[]) {
        try {
          const compressed = await compressImageFile(file);
          if (compressed) {
            setKnifeImages((prev) => [...prev, compressed]);
          }
        } catch (err) {
          console.error('Error compressing dropped file:', err);
        }
      }
      setSaveMessage('✓ Fotos adicionadas com sucesso!');
      setTimeout(() => setSaveMessage(''), 2500);
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveConfig(settingsForm);
    setSaveMessage('✓ Configurações salvas com sucesso!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#12141c] rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-4 bg-[#161822] border-b border-white/10">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#ff6b00]" />
            <h2 className="font-serif-luxury text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              Painel Administrativo - Fronteira Cutelaria
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                type="button"
                onClick={handleManualTriggerVoiceReport}
                className="px-3 py-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                title="Ouvir relatório de áudio do dia para a Vani"
              >
                <Volume2 className={`w-4 h-4 text-indigo-400 ${isPlayingVoice ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">Relatório de Voz</span>
              </button>
            )}

            {/* PROMINENT CASINHA (HOME) ICON BUTTON TO EXIT ADMIN AREA */}
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-extrabold text-xs transition-all cursor-pointer uppercase flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 border border-amber-400/50"
              title="Clique na casinha para sair do Administrador e voltar para a Tela Inicial"
            >
              <Home className="w-4.5 h-4.5 text-black shrink-0" />
              <span className="font-extrabold">VOLTAR AO INÍCIO</span>
            </button>
          </div>
        </div>

        {/* PIN Authentication View */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="p-4 rounded-2xl bg-[#ff6b00]/15 border border-[#ff6b00]/30 text-[#ff6b00] shadow-lg shadow-[#ff6b00]/10">
              <Lock className="w-10 h-10" />
            </div>

            <div>
              <h3 className="font-serif-luxury text-xl font-bold text-white">Acesso do Administrador</h3>
              <p className="text-xs text-zinc-400 mt-1">Digite obrigatoriamente a senha para entrar no painel</p>
            </div>

            <form onSubmit={handlePinSubmit} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                maxLength={12}
                autoFocus
                autoComplete="current-password"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="Senha de acesso..."
                className="w-full p-3.5 rounded-xl bg-[#1a1d29] border border-white/10 text-center text-lg tracking-widest text-white focus:border-[#ff6b00] focus:ring-2 focus:ring-[#ff6b00]/20 focus:outline-none transition-all placeholder:text-zinc-600 placeholder:text-sm placeholder:tracking-normal"
              />

              {authError && (
                <p className="text-xs text-red-400 font-semibold flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-sm tracking-wider uppercase shadow-lg shadow-[#ff6b00]/25 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Acessar Painel</span>
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Dashboard */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Admin Action Subnav */}
            <div className="flex items-center justify-between p-3 bg-[#0d0e12] border-b border-white/10 overflow-x-auto no-scrollbar gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('knives')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer uppercase ${
                    activeTab === 'knives' ? 'bg-[#ff6b00] text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  Facas no Catálogo ({knives.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('vendas')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer uppercase ${
                    activeTab === 'vendas'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>VENDAS ({allSalesRecords.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('crm')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer uppercase ${
                    activeTab === 'crm'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-1 ring-amber-400'
                      : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  }`}
                >
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>CLIENTES / CRM</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('categories')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all cursor-pointer uppercase ${
                    activeTab === 'categories'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                      : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20'
                  }`}
                >
                  <FolderPlus className="w-4 h-4 text-indigo-400" />
                  <span>CATEGORIAS ({allCategoriesList.filter((c) => c !== 'TODAS').length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenNewForm}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer uppercase ${
                    activeTab === 'form' ? 'bg-[#ff6b00] text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ NOVA FACA</span>
                </button>
              </div>

              {/* Settings icon button - NO TEXT LABEL */}
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`p-2.5 rounded-xl text-xs font-semibold shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                  activeTab === 'settings' ? 'bg-[#ff6b00] text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
                title="Configurações"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Notification Toast */}
            {saveMessage && (
              <div
                className={`p-3 border-b text-xs text-center font-bold animate-fadeIn flex items-center justify-center gap-2 ${
                  saveMessage.includes('⚠️') || saveMessage.includes('❌') || saveMessage.includes('Erro')
                    ? 'bg-red-500/20 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {saveMessage.includes('⚠️') || saveMessage.includes('❌') || saveMessage.includes('Erro') ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{saveMessage}</span>
              </div>
            )}

            {/* Main Content Area */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              
              {/* TAB 1: KNIVES MANAGEMENT LIST */}
              {activeTab === 'knives' && (
                <div className="space-y-4">
                  {/* Search Header */}
                  <div className="p-3.5 rounded-2xl bg-[#161822] border border-white/10 space-y-2">
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider">
                      🔎 BUSCAR FACA PELO CÓDIGO
                    </label>
                    <input
                      type="text"
                      value={searchCodeQuery}
                      onChange={(e) => setSearchCodeQuery(e.target.value)}
                      placeholder="Digite o código da faca... (Ex: FC-024)"
                      className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-amber-300 placeholder-zinc-500 focus:outline-none focus:border-amber-500 uppercase"
                    />
                  </div>

                  {/* Knives List */}
                  <div className="space-y-3">
                    {filteredKnives.length === 0 ? (
                      <div className="p-8 text-center text-zinc-500 text-xs">
                        Nenhuma faca encontrada para o termo "{searchCodeQuery}".
                      </div>
                    ) : (
                      filteredKnives.map((knife) => {
                        const isSoldOut = knife.isOutofStock || (typeof knife.quantity === 'number' && knife.quantity <= 0);
                        return (
                          <div
                            key={knife.id}
                            className={`p-3.5 rounded-2xl bg-[#161822] border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-colors ${
                              isSoldOut ? 'border-red-500/30 bg-red-950/10' : 'border-white/10'
                            }`}
                          >
                            {/* Knife Header & Info */}
                            <div className="flex items-center gap-3">
                              <img
                                src={knife.images?.[0] || 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=200'}
                                alt={knife.name}
                                referrerPolicy="no-referrer"
                                className={`w-14 h-14 rounded-xl object-cover border border-white/10 ${isSoldOut ? 'grayscale opacity-50' : ''}`}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                    CÓD: {knife.code}
                                  </span>
                                  <span className="text-[10px] text-amber-300 uppercase font-extrabold">{knife.category}</span>
                                  {isSoldOut && (
                                    <span className="text-[10px] font-extrabold text-red-400 bg-red-500/20 px-2 py-0.5 rounded uppercase border border-red-500/30">
                                      ESGOTADO
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">{knife.name}</h4>
                                <span className="text-xs text-amber-300 font-extrabold">{formatCurrencyBRL(knife.price)}</span>
                              </div>
                            </div>

                            {/* Stock & Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-white/10">
                              
                              {/* Quantity Control */}
                              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                                <span className="text-[10px] text-zinc-400 px-1 font-bold">ESTOQUE:</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={typeof knife.quantity === 'number' ? knife.quantity : 1}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    const isSold = val === 0;
                                    onSaveKnife({
                                      ...knife,
                                      quantity: val,
                                      isOutofStock: isSold,
                                      status: isSold ? 'esgotado' : 'disponivel',
                                    });
                                  }}
                                  className="w-12 text-center bg-[#1e2230] text-white font-mono text-xs font-bold rounded py-1 focus:outline-none border border-white/10"
                                />
                              </div>

                              {/* MARCAR COMO VENDIDA Button */}
                              <button
                                onClick={() => handleOpenSaleModal(knife)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-500/40 cursor-pointer transition-all active:scale-95"
                                title="Registrar 1 venda e vincular cliente"
                              >
                                <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                                <span>VENDIDA</span>
                              </button>

                              {/* Preview Button */}
                              <button
                                onClick={() => setPreviewKnife(knife)}
                                className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold text-xs flex items-center gap-1 border border-blue-500/30 cursor-pointer"
                                title="Visualizar Faca"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>VISUALIZAR</span>
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => handleOpenEditForm(knife)}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 border border-amber-500/30 cursor-pointer"
                                title="Editar Faca"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>EDITAR</span>
                              </button>

                              {/* Esgotar / Reativar Toggle */}
                              <button
                                onClick={() => handleToggleStatus(knife)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSoldOut
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                }`}
                              >
                                {isSoldOut ? '🔄 REATIVAR' : '🔄 ESGOTAR'}
                              </button>

                              {/* Delete Button - Automatic instant deletion */}
                              <button
                                onClick={() => {
                                  onDeleteKnife(knife.id);
                                }}
                                className="p-2 rounded-xl bg-red-600/30 hover:bg-red-600/60 text-red-300 border border-red-500/40 cursor-pointer transition-all active:scale-95"
                                title="Excluir Faca Automaticamente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB VENDAS */}
              {activeTab === 'vendas' && (
                <div className="space-y-4">
                  {/* SECTION 1: Resumo das Vendas (Executive Metrics) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
                    {/* Card 1: Vendas Hoje */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-[#161822] border border-emerald-500/30 flex flex-col justify-between space-y-1">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Vendas Hoje</span>
                        <Calendar className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-lg sm:text-2xl font-black text-white">
                        {todaySalesCount} <span className="text-xs text-zinc-400 font-normal">un.</span>
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400">
                        {formatCurrencyBRL(todaySalesValue)}
                      </span>
                    </div>

                    {/* Card 2: Mês Atual (Zera todo dia 1º) */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#161822] border border-emerald-500/40 flex flex-col justify-between space-y-1">
                      <div className="flex items-center justify-between text-emerald-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 truncate" title={`Mês de referência: ${currentMonthName}`}>
                          Mês: {currentMonthName}
                        </span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span className="text-lg sm:text-2xl font-black text-white">
                        {currentMonthSalesCount} <span className="text-xs text-zinc-400 font-normal">un.</span>
                      </span>
                      <span className="text-sm font-extrabold text-amber-400 truncate">
                        {formatCurrencyBRL(currentMonthSalesValue)}
                      </span>
                    </div>

                    {/* Card 3: Total Geral Acumulado */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-[#161822] border border-white/10 flex flex-col justify-between space-y-1">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Geral</span>
                        <ShoppingBag className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-lg sm:text-2xl font-black text-white">
                        {totalSalesCount} <span className="text-xs text-zinc-400 font-normal">un.</span>
                      </span>
                      <span className="text-[11px] font-bold text-zinc-400">
                        Histórico completo
                      </span>
                    </div>

                    {/* Card 4: Faturamento Total Acumulado */}
                    <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-[#161822] border border-amber-500/40 flex flex-col justify-between space-y-1">
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Faturamento Total</span>
                        <DollarSign className="w-4 h-4 text-amber-400" />
                      </div>
                      <span className="text-base sm:text-xl font-black text-amber-400 truncate">
                        {formatCurrencyBRL(totalSalesValue)}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        Todos os meses
                      </span>
                    </div>

                    {/* Card 5: Estoque Total Disponível */}
                    <div className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-2xl bg-[#161822] border border-blue-500/30 flex flex-col justify-between space-y-1">
                      <div className="flex items-center justify-between text-blue-400">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Estoque Total</span>
                        <Package className="w-4 h-4 text-blue-400" />
                      </div>
                      <span className="text-lg sm:text-2xl font-black text-white">
                        {totalAvailableStock} <span className="text-xs text-zinc-400 font-normal">un.</span>
                      </span>
                      <span className="text-[10px] text-blue-300">
                        No catálogo
                      </span>
                    </div>
                  </div>

                  {/* SECTION 2: Sub-Nav Tabs for Vendas Section */}
                  <div className="flex items-center gap-1.5 p-1 bg-[#161822] rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setVendasSubTab('historico')}
                      className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        vendasSubTab === 'historico'
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                      <span>HISTÓRICO</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-emerald-300 font-mono">
                        {allSalesRecords.length}
                      </span>
                    </button>

                    <button
                      onClick={() => setVendasSubTab('esgotadas')}
                      className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        vendasSubTab === 'esgotadas'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>ESGOTADAS</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${soldOutKnives.length > 0 ? 'bg-red-500/30 text-red-300' : 'bg-black/40 text-zinc-400'}`}>
                        {soldOutKnives.length}
                      </span>
                    </button>

                    {/* RELATÓRIO MENSAL BUTTON */}
                    <button
                      onClick={() => setIsSalesReportOpen(true)}
                      className="flex-1 min-w-[160px] py-2 px-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 text-black hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      <FileBarChart className="w-3.5 h-3.5 text-black shrink-0" />
                      <span>📊 RELATÓRIO MENSAL</span>
                    </button>
                  </div>

                  {/* SUB-TAB 1: HISTÓRICO DE VENDAS */}
                  {vendasSubTab === 'historico' && (
                    <div className="space-y-3">
                      {/* Search Bar & Actions */}
                      <div className="p-3 rounded-2xl bg-[#161822] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="relative w-full sm:flex-1">
                          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500 pointer-events-none" />
                          <input
                            type="text"
                            value={salesSearchQuery}
                            onChange={(e) => setSalesSearchQuery(e.target.value)}
                            placeholder="Buscar por código ou nome/modelo da faca..."
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-amber-300 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                          {allSalesRecords.length > 0 && (
                            <button
                              onClick={handleUndoLastSale}
                              className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                              title="Desfazer a última venda realizada"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                              <span>Desfazer última venda</span>
                            </button>
                          )}

                          {allSalesRecords.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllSales}
                              className="px-3 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold border border-red-500/30 cursor-pointer shrink-0 transition-all active:scale-95 flex items-center gap-1.5"
                              title="Limpar e excluir definitivamente todo o histórico de vendas"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Limpar</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Sales List */}
                      <div className="space-y-2.5">
                        {filteredSalesRecords.length === 0 ? (
                          <div className="p-10 text-center rounded-2xl bg-[#161822] border border-white/10 text-zinc-500 text-xs space-y-2">
                            <ShoppingBag className="w-8 h-8 mx-auto text-zinc-600" />
                            <p className="font-semibold text-zinc-400">Nenhuma venda encontrada.</p>
                            <p className="text-[11px] text-zinc-500">
                              Ao clicar no botão "VENDIDA" na lista de facas, as vendas aparecerão aqui com data e horário detalhados.
                            </p>
                          </div>
                        ) : (
                          filteredSalesRecords.map((item) => (
                            <div
                              key={item.id}
                              className="p-3.5 rounded-2xl bg-[#161822] border border-emerald-500/20 hover:border-emerald-500/40 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3">
                                <img
                                  src={
                                    item.images?.[0] ||
                                    knives.find((k) => k.id === item.knifeId || (k.code && k.code === item.code))?.images?.[0] ||
                                    'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=200'
                                  }
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-12 h-12 rounded-xl object-cover border border-white/10"
                                />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      CÓD: {item.code}
                                    </span>
                                    {item.category && (
                                      <span className="text-[9px] text-amber-300 uppercase font-bold">{item.category}</span>
                                    )}
                                    <span className="text-[9px] text-zinc-400 font-mono">
                                      • {item.soldAt}
                                    </span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">{item.name}</h4>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                <span className="text-sm sm:text-base font-black text-amber-400 mr-1">
                                  {formatCurrencyBRL(item.price)}
                                </span>

                                <button
                                  onClick={() => {
                                    const targetKnife = knives.find((k) => k.id === item.knifeId || (k.code && k.code === item.code));
                                    if (targetKnife) {
                                      setPreviewKnife(targetKnife);
                                    } else {
                                      setPreviewKnife({
                                        id: item.knifeId,
                                        code: item.code,
                                        name: item.name,
                                        category: item.category || 'Geral',
                                        price: item.price,
                                        quantity: 0,
                                        images: [item.image || 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=200'],
                                        isOutofStock: true,
                                        status: 'esgotado',
                                      });
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/30 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                                  title="Visualizar foto e identificação desta faca"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Visualizar</span>
                                </button>

                                <button
                                  onClick={() => handleUndoSale(item)}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                                  title="Desfazer esta venda e devolver 1 unidade ao estoque"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Desfazer Venda</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: ESGOTADAS (0 unidades) */}
                  {vendasSubTab === 'esgotadas' && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-2xl bg-[#161822] border border-red-500/30 flex items-center justify-between text-xs text-red-200">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Facas com estoque zerado / esgotadas no catálogo.</span>
                        </div>
                        <span className="font-bold text-red-400 font-mono">{soldOutKnives.length} modelo(s)</span>
                      </div>

                      <div className="space-y-2.5">
                        {soldOutKnives.length === 0 ? (
                          <div className="p-10 text-center rounded-2xl bg-[#161822] border border-white/10 text-zinc-500 text-xs space-y-2">
                            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                            <p className="font-semibold text-zinc-300">Nenhuma faca esgotada no catálogo!</p>
                            <p className="text-[11px] text-zinc-500">Todos os modelos cadastrados possuem ao menos 1 unidade em estoque.</p>
                          </div>
                        ) : (
                          soldOutKnives.map((knife) => {
                            const mainImg = knife.images?.[0] || 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=200';

                            return (
                              <div
                                key={knife.id}
                                className="p-3.5 rounded-2xl bg-[#161822] border border-red-500/30 hover:border-red-500/50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img
                                      src={mainImg}
                                      alt={knife.name}
                                      referrerPolicy="no-referrer"
                                      className="w-12 h-12 rounded-xl object-cover border border-white/10 opacity-60"
                                    />
                                    <span className="absolute inset-0 bg-red-950/60 rounded-xl flex items-center justify-center text-[8px] font-black text-red-300 uppercase tracking-widest border border-red-500/50">
                                      0 UNID
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                        CÓD: {knife.code}
                                      </span>
                                      <span className="text-[9px] text-red-300 uppercase font-bold">{knife.category}</span>
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-bold text-white mt-0.5">{knife.name}</h4>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold uppercase bg-red-500/20 text-red-400 border border-red-500/30">
                                    ESGOTADA
                                  </span>

                                  {/* Botão para visualizar faca */}
                                  <button
                                    onClick={() => setPreviewKnife(knife)}
                                    className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/35 text-blue-300 border border-blue-500/30 text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0"
                                    title="Visualizar foto e identificação desta faca"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Visualizar</span>
                                  </button>

                                  {/* Botão de Reabastecer (+1) */}
                                  <button
                                    onClick={() => handleRestockKnife(knife, 1)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-1 border border-emerald-500/40 cursor-pointer transition-all active:scale-95 shrink-0"
                                    title="Adicionar 1 unidade ao estoque e reativar faca no catálogo"
                                  >
                                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>REABASTECER (+1)</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: CLIENTES / CRM */}
              {activeTab === 'crm' && (
                <CrmSection
                  knives={knives}
                  pendingSaleKnife={pendingSaleKnife}
                  onCompleteSaleWithNewCustomer={handleCompleteSaleFromCrm}
                  onCancelPendingSale={() => setPendingSaleKnife(null)}
                  initialSubTab={crmSubTab}
                  initialPaymentMethod={pendingPaymentMethod}
                />
              )}

              {/* TAB: GERENCIAR CATEGORIAS */}
              {activeTab === 'categories' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#161822] border border-white/10 space-y-3">
                    <div>
                      <h3 className="font-serif-luxury text-base sm:text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-indigo-400" />
                        <span>Gerenciar Categorias do Catálogo</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        Todas as categorias cadastradas aparecem no catálogo e na opção de seleção ao cadastrar uma faca nova. Você pode cadastrar novas ou excluir existentes.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        value={newCategoryInput}
                        onChange={(e) => setNewCategoryInput(e.target.value)}
                        placeholder="Digite o nome da nova categoria (ex: CHEF, EDC, TAUBATÉ...)"
                        className="w-full sm:flex-1 p-2.5 rounded-xl bg-[#12141c] border border-white/10 text-xs font-bold text-amber-300 placeholder-zinc-500 uppercase focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newCategoryInput.trim()) {
                            const catUpper = newCategoryInput.trim().toUpperCase();
                            const updated = saveCategory(catUpper);
                            setAllCategoriesList([...updated]);
                            setNewCategoryInput('');
                            setSaveMessage(`✓ Categoria "${catUpper}" cadastrada com sucesso!`);
                            setTimeout(() => setSaveMessage(''), 3500);
                          }
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold text-xs uppercase cursor-pointer hover:brightness-110 shrink-0 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-4 h-4 text-black" />
                        <span>Cadastrar Categoria</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allCategoriesList
                      .filter((c) => c !== 'TODAS')
                      .map((cat) => {
                        const knifeCount = knives.filter((k) => isSameCategory(k.category, cat)).length;

                        return (
                          <div
                            key={cat}
                            className="p-3.5 rounded-2xl bg-[#161822] border border-white/10 flex items-center justify-between gap-3 shadow-md hover:border-amber-500/30 transition-all"
                          >
                            <div>
                              <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">{cat}</h4>
                              <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                                <strong className="text-amber-400">{knifeCount}</strong>{' '}
                                {knifeCount === 1 ? 'faca cadastrada' : 'facas cadastradas'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = deleteCategory(cat);
                                setAllCategoriesList([...updated]);
                                setSaveMessage(`✓ Categoria "${cat}" excluída do sistema.`);
                                setTimeout(() => setSaveMessage(''), 3500);
                              }}
                              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 cursor-pointer transition-all active:scale-95 shrink-0 flex items-center gap-1 text-xs font-bold"
                              title={`Excluir categoria ${cat}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                              <span className="hidden sm:inline">Excluir</span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2: EDIT / NEW FORM */}
              {activeTab === 'form' && editingKnife && (
                <form onSubmit={handleSaveKnifeSubmit} className="space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                      {editingKnife.id ? `Editar Faca: ${editingKnife.name}` : 'Cadastrar Nova Faca'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('knives')}
                      className="text-zinc-400 hover:text-white font-semibold cursor-pointer"
                    >
                      ← Voltar para lista
                    </button>
                  </div>

                  {formErrorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 flex items-start gap-2.5 shadow-lg animate-fadeIn">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-extrabold text-red-300 uppercase tracking-wide">Atenção ao preencher o produto</h5>
                        <p className="text-xs text-red-200 mt-0.5 font-medium">{formErrorMessage}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nome da Faca */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold">Nome da Faca *</label>
                      <input
                        type="text"
                        required
                        value={editingKnife.name || ''}
                        onChange={(e) => setEditingKnife({ ...editingKnife, name: e.target.value })}
                        placeholder="Ex: Faca Gaúcha Dourada 10''"
                        className={`w-full p-2.5 rounded-xl bg-[#161822] border transition-colors ${
                          isKnifeNameEmpty
                            ? 'border-white/10 text-white focus:border-amber-500'
                            : isKnifeNameInvalid
                            ? 'border-red-500 bg-red-500/10 text-red-200 focus:border-red-500'
                            : 'border-emerald-500/60 bg-emerald-500/5 text-white focus:border-emerald-500'
                        }`}
                      />
                      {isKnifeNameInvalid && (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Nome curto demais (mínimo 3 caracteres).</span>
                        </p>
                      )}
                      {!isKnifeNameEmpty && !isKnifeNameInvalid && (
                        <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Nome válido</span>
                        </p>
                      )}
                    </div>

                    {/* Código de Referência (com verificação de duplicidade em tempo real) */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold flex items-center justify-between">
                        <span>Código de Referência *</span>
                        {isKnifeCodeDuplicate ? (
                          <span className="text-[10px] text-red-400 font-extrabold uppercase animate-pulse">
                            ⚠️ CÓDIGO JÁ EXISTE
                          </span>
                        ) : !isKnifeCodeEmpty ? (
                          <span className="text-[10px] text-emerald-400 font-extrabold uppercase">
                            ✓ ÚNICO
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="text"
                        required
                        value={editingKnife.code || ''}
                        onChange={(e) => setEditingKnife({ ...editingKnife, code: e.target.value })}
                        placeholder="Ex: FC-024"
                        className={`w-full p-2.5 rounded-xl bg-[#161822] border font-mono font-bold transition-colors ${
                          isKnifeCodeEmpty
                            ? 'border-white/10 text-amber-400 focus:border-amber-500'
                            : isKnifeCodeDuplicate
                            ? 'border-red-500 bg-red-500/10 text-red-300 focus:border-red-500'
                            : 'border-emerald-500/60 bg-emerald-500/5 text-amber-300 focus:border-emerald-500'
                        }`}
                      />
                      {isKnifeCodeDuplicate && (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                          <span>Código "{currentKnifeCode}" já cadastrado em outra faca! Escolha outro código.</span>
                        </p>
                      )}
                      {!isKnifeCodeEmpty && !isKnifeCodeDuplicate && (
                        <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Código único e disponível no catálogo!</span>
                        </p>
                      )}
                      {isKnifeCodeEmpty && (
                        <p className="text-[11px] text-zinc-500 mt-1">Digite o código único de identificação</p>
                      )}
                    </div>

                    {/* Preço */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold">Preço em Reais (R$) *</label>
                      <input
                        type="number"
                        step="1"
                        required
                        placeholder="Ex: 450"
                        value={editingKnife.price || ''}
                        onChange={(e) => setEditingKnife({ ...editingKnife, price: parseFloat(e.target.value) || 0 })}
                        className={`w-full p-2.5 rounded-xl bg-[#161822] border font-bold transition-colors ${
                          isKnifePriceInvalid
                            ? 'border-red-500 bg-red-500/10 text-red-300 focus:border-red-500'
                            : 'border-emerald-500/60 bg-emerald-500/5 text-white focus:border-emerald-500'
                        }`}
                      />
                      {isKnifePriceInvalid ? (
                        <p className="text-[11px] text-red-400 font-bold flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Informe um valor maior que R$ 0.</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Preço ativo: R$ {Number(editingKnife.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-zinc-400 font-bold">Categoria *</label>
                        <button
                          type="button"
                          onClick={() => setShowAddCatModal(true)}
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          <span>+ Criar Categoria</span>
                        </button>
                      </div>
                      <select
                        value={editingKnife.category || 'RÚSTICAS'}
                        onChange={(e) => setEditingKnife({ ...editingKnife, category: e.target.value as Category })}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-amber-300 font-bold focus:border-amber-500 uppercase"
                      >
                        {allowedCategoriesList.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* SEÇÃO DE PROMOÇÃO (DE / POR) */}
                    <div className="col-span-1 sm:col-span-2 p-3.5 rounded-2xl bg-gradient-to-r from-red-950/40 via-[#161822] to-[#161822] border border-red-500/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={Boolean(editingKnife.isOnSale)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentP = Number(editingKnife.price) || 0;
                              setEditingKnife({
                                ...editingKnife,
                                isOnSale: checked,
                                originalPrice: checked ? (editingKnife.originalPrice || currentP) : undefined,
                                promotionalPrice: checked ? (editingKnife.promotionalPrice || (currentP > 0 ? Math.round(currentP * 0.85) : 0)) : undefined,
                                originalCategory: checked && editingKnife.category !== 'PROMOÇÕES' ? editingKnife.category : editingKnife.originalCategory,
                                category: checked ? 'PROMOÇÕES' : (editingKnife.originalCategory || 'RÚSTICAS'),
                              });
                            }}
                            className="accent-red-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-extrabold text-amber-300 text-xs sm:text-sm uppercase flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
                            <span>Ativar Preço Promocional (De / Por)</span>
                          </span>
                        </label>
                        {editingKnife.isOnSale && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-red-500/20 text-red-300 font-extrabold text-[10px] uppercase border border-red-500/40 animate-pulse">
                            🔥 PROMOÇÃO ATIVA
                          </span>
                        )}
                      </div>

                      {editingKnife.isOnSale && (
                        <div className="p-3 rounded-xl bg-black/40 border border-red-500/30 space-y-3 animate-fadeIn">
                          <p className="text-[11px] text-zinc-300">
                            Ao ativar a promoção, esta faca irá automaticamente para a categoria <strong>PROMOÇÕES</strong> e exibirá o preço <em>"De: R$ X por R$ Y"</em> no catálogo com destaque.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-zinc-400 mb-1 font-bold">
                                Valor Original (De R$) *
                              </label>
                              <input
                                type="number"
                                step="1"
                                required={Boolean(editingKnife.isOnSale)}
                                value={editingKnife.originalPrice || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditingKnife({
                                    ...editingKnife,
                                    originalPrice: val,
                                  });
                                }}
                                placeholder="Ex: 500"
                                className="w-full p-2.5 rounded-xl bg-[#12141c] border border-white/10 text-zinc-300 font-bold focus:border-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-amber-400 mb-1 font-bold">
                                Valor Promocional com Desconto (Por R$) *
                              </label>
                              <input
                                type="number"
                                step="1"
                                required={Boolean(editingKnife.isOnSale)}
                                value={editingKnife.promotionalPrice || ''}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setEditingKnife({
                                    ...editingKnife,
                                    promotionalPrice: val,
                                    price: val,
                                  });
                                }}
                                placeholder="Ex: 380"
                                className="w-full p-2.5 rounded-xl bg-[#12141c] border border-amber-500/50 text-amber-300 font-bold focus:border-amber-500"
                              />
                            </div>
                          </div>

                          {editingKnife.originalPrice && editingKnife.promotionalPrice && Number(editingKnife.originalPrice) > Number(editingKnife.promotionalPrice) && (
                            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-bold flex items-center justify-between">
                              <span>
                                Economia de R$ {(Number(editingKnife.originalPrice) - Number(editingKnife.promotionalPrice)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-extrabold text-[10px]">
                                - {Math.round(((Number(editingKnife.originalPrice) - Number(editingKnife.promotionalPrice)) / Number(editingKnife.originalPrice)) * 100)}% OFF
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lâmina (Tipo de Aço) */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold">Lâmina (Tipo de Aço) *</label>
                      <select
                        value={
                          isCustomSteel || (editingKnife.steelType && !DEFAULT_STEEL_TYPES.includes(editingKnife.steelType))
                            ? '__custom__'
                            : (editingKnife.steelType || DEFAULT_STEEL_TYPES[0])
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setIsCustomSteel(true);
                            if (DEFAULT_STEEL_TYPES.includes(editingKnife.steelType || '')) {
                              setEditingKnife({ ...editingKnife, steelType: '' });
                            }
                          } else {
                            setIsCustomSteel(false);
                            setEditingKnife({ ...editingKnife, steelType: val });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-amber-300 font-bold focus:border-amber-500 mb-2"
                      >
                        {DEFAULT_STEEL_TYPES.map((steel) => (
                          <option key={steel} value={steel}>
                            {steel}
                          </option>
                        ))}
                        <option value="__custom__">+ Adicionar novo tipo de aço...</option>
                      </select>

                      {(isCustomSteel || (editingKnife.steelType && !DEFAULT_STEEL_TYPES.includes(editingKnife.steelType))) && (
                        <input
                          type="text"
                          required
                          value={editingKnife.steelType || ''}
                          onChange={(e) => setEditingKnife({ ...editingKnife, steelType: e.target.value })}
                          placeholder="Digite o novo tipo de aço..."
                          className="w-full p-2.5 rounded-xl bg-[#161822] border border-amber-500/50 text-white focus:border-amber-500 animate-fadeIn"
                          autoFocus
                        />
                      )}
                    </div>

                    {/* Material do Cabo */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold">Material do Cabo *</label>
                      <select
                        value={
                          isCustomHandle || (editingKnife.handleMaterial && !DEFAULT_HANDLE_MATERIALS.includes(editingKnife.handleMaterial))
                            ? '__custom__'
                            : (editingKnife.handleMaterial || DEFAULT_HANDLE_MATERIALS[0])
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setIsCustomHandle(true);
                            if (DEFAULT_HANDLE_MATERIALS.includes(editingKnife.handleMaterial || '')) {
                              setEditingKnife({ ...editingKnife, handleMaterial: '' });
                            }
                          } else {
                            setIsCustomHandle(false);
                            setEditingKnife({ ...editingKnife, handleMaterial: val });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-amber-300 font-bold focus:border-amber-500 mb-2"
                      >
                        {DEFAULT_HANDLE_MATERIALS.map((handle) => (
                          <option key={handle} value={handle}>
                            {handle}
                          </option>
                        ))}
                        <option value="__custom__">+ Adicionar novo material de cabo...</option>
                      </select>

                      {(isCustomHandle || (editingKnife.handleMaterial && !DEFAULT_HANDLE_MATERIALS.includes(editingKnife.handleMaterial))) && (
                        <input
                          type="text"
                          required
                          value={editingKnife.handleMaterial || ''}
                          onChange={(e) => setEditingKnife({ ...editingKnife, handleMaterial: e.target.value })}
                          placeholder="Digite o novo material do cabo..."
                          className="w-full p-2.5 rounded-xl bg-[#161822] border border-amber-500/50 text-white focus:border-amber-500 animate-fadeIn"
                          autoFocus
                        />
                      )}
                    </div>

                    {/* Tamanho em Polegadas */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold">Tamanho em Polegadas *</label>

                      {/* Quick Chips 4" to 12" */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {DEFAULT_LENGTH_OPTIONS.map((opt) => {
                          const isSelected = !isCustomLength && editingKnife.length === opt;
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                setIsCustomLength(false);
                                setEditingKnife({ ...editingKnife, length: opt });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 scale-105'
                                  : 'bg-[#161822] text-zinc-300 border border-white/10 hover:border-amber-500/50 hover:text-white'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomLength(true);
                            if (DEFAULT_LENGTH_OPTIONS.includes(editingKnife.length || '')) {
                              setEditingKnife({ ...editingKnife, length: '' });
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isCustomLength || (editingKnife.length && !DEFAULT_LENGTH_OPTIONS.includes(editingKnife.length))
                              ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 scale-105'
                              : 'bg-[#161822] text-zinc-400 border border-white/10 hover:border-amber-500/50 hover:text-white'
                          }`}
                        >
                          + Outro
                        </button>
                      </div>

                      {/* Select Dropdown */}
                      <select
                        value={
                          isCustomLength || (editingKnife.length && !DEFAULT_LENGTH_OPTIONS.includes(editingKnife.length))
                            ? '__custom__'
                            : (editingKnife.length || DEFAULT_LENGTH_OPTIONS[6])
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__custom__') {
                            setIsCustomLength(true);
                            if (DEFAULT_LENGTH_OPTIONS.includes(editingKnife.length || '')) {
                              setEditingKnife({ ...editingKnife, length: '' });
                            }
                          } else {
                            setIsCustomLength(false);
                            setEditingKnife({ ...editingKnife, length: val });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-amber-300 font-bold focus:border-amber-500 mb-2"
                      >
                        {DEFAULT_LENGTH_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt} ({opt.replace('"', '')} polegadas)
                          </option>
                        ))}
                        <option value="__custom__">+ Outra polegada (digitar tamanho especial)...</option>
                      </select>

                      {/* Custom Length Input */}
                      {(isCustomLength || (editingKnife.length && !DEFAULT_LENGTH_OPTIONS.includes(editingKnife.length))) && (
                        <div className="relative flex items-center animate-fadeIn">
                          <input
                            type="text"
                            required
                            value={editingKnife.length || ''}
                            onChange={(e) => setEditingKnife({ ...editingKnife, length: e.target.value })}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && !val.endsWith('"') && !val.includes('"') && !val.toLowerCase().includes('pol') && !val.toLowerCase().includes('cm')) {
                                setEditingKnife({ ...editingKnife, length: `${val}"` });
                              }
                            }}
                            placeholder="Digite o número ex: 14 ou 16"
                            className="w-full p-2.5 pr-28 rounded-xl bg-[#161822] border border-amber-500/50 text-white font-mono font-bold focus:border-amber-500"
                            autoFocus
                          />
                          <div className="absolute right-3 flex items-center gap-1 text-amber-400 font-bold pointer-events-none select-none bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30 text-xs">
                            <span>polegadas</span>
                            <span className="text-sm font-extrabold">"</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1 font-bold">Quantidade em Estoque *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={typeof editingKnife.quantity === 'number' ? editingKnife.quantity : 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setEditingKnife({
                            ...editingKnife,
                            quantity: val,
                            isOutofStock: val <= 0,
                          });
                        }}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-white font-mono font-bold focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Stock Checkbox Toggle */}
                  <div className="flex items-center gap-4 py-2 border-y border-white/10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingKnife.isOutofStock || (typeof editingKnife.quantity === 'number' && editingKnife.quantity <= 0)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setEditingKnife({
                            ...editingKnife,
                            isOutofStock: checked,
                            status: checked ? 'esgotado' : 'disponivel',
                            quantity: checked ? 0 : (editingKnife.quantity && editingKnife.quantity > 0 ? editingKnife.quantity : 1),
                          });
                        }}
                        className="accent-red-500 w-4 h-4"
                      />
                      <span className="text-red-400 font-bold">Marcar produto como ESGOTADO</span>
                    </label>
                  </div>

                  {/* Image Uploader & URLs */}
                  <div className="space-y-2">
                    <label className="block text-zinc-400 font-bold">Fotos do Produto *</label>
                    
                    {/* Drag and Drop File Input */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDropFiles}
                      className={`p-4 rounded-xl border-2 border-dashed ${
                        isUploadingPhotos
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-amber-500/30 hover:border-amber-500/60 bg-[#161822]'
                      } text-center space-y-2 transition-colors`}
                    >
                      <Upload className={`w-6 h-6 text-amber-500 mx-auto ${isUploadingPhotos ? 'animate-bounce' : ''}`} />
                      <p className="text-zinc-300 font-semibold">
                        {isUploadingPhotos ? 'Processando e otimizando fotos...' : 'Arraste fotos aqui ou clique para selecionar'}
                      </p>
                      <p className="text-[10px] text-zinc-500">Suporta JPG, JPEG, PNG, WEBP, fotos de câmera e múltiplos arquivos</p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                        id="image-upload-input"
                        disabled={isUploadingPhotos}
                      />
                      <label
                        htmlFor="image-upload-input"
                        className={`inline-block px-4 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          isUploadingPhotos
                            ? 'bg-zinc-700 text-zinc-400 border-zinc-600 cursor-not-allowed'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 cursor-pointer'
                        }`}
                      >
                        {isUploadingPhotos ? 'Carregando fotos...' : 'Escolher Fotos da Galeria / Câmera'}
                      </label>
                    </div>

                    {/* Or URL input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Ou cole o link direto da imagem (URL)"
                        className="flex-1 p-2.5 rounded-xl bg-[#161822] border border-white/10 text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddImage}
                        className="px-4 py-2.5 rounded-xl bg-amber-500 text-black font-bold cursor-pointer hover:brightness-110"
                      >
                        Adicionar URL
                      </button>
                    </div>

                    {/* Image thumbnails list */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {knifeImages.map((img, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20 group">
                          <img src={img} alt={`Foto ${idx}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-0 right-0 p-1 bg-red-600 text-white text-[10px] font-bold shadow hover:bg-red-700"
                            title="Remover foto"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {knifeImages.length > 0 && (
                        <div className="flex items-center text-xs text-amber-400/80 font-medium px-1">
                          {knifeImages.length} foto(s) anexada(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Alerts for instant visibility */}
                  {formErrorMessage && (
                    <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-500/70 text-red-200 flex items-start gap-2.5 shadow-lg animate-bounce-short">
                      <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-extrabold text-red-300 uppercase tracking-wide text-xs">Não foi possível salvar ainda</h5>
                        <p className="text-xs text-red-200 mt-0.5 font-semibold">{formErrorMessage}</p>
                      </div>
                    </div>
                  )}

                  {isUploadingPhotos && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                      <span className="font-bold text-xs">Comprimindo e carregando fotos... Aguarde finalizar para salvar.</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingKnife || isUploadingPhotos}
                      className={`flex-1 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all ${
                        isSavingKnife || isUploadingPhotos
                          ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black cursor-pointer hover:brightness-110 active:scale-[0.99]'
                      }`}
                    >
                      {isSavingKnife ? (
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSavingKnife ? 'SALVANDO PRODUTO...' : 'SALVAR PRODUTO NO CATÁLOGO'}</span>
                    </button>

                    {editingKnife.id && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteKnife(editingKnife.id);
                          setActiveTab('knives');
                        }}
                        className="px-4 py-3.5 rounded-xl bg-red-600/30 hover:bg-red-600/60 text-red-300 font-bold text-xs uppercase tracking-wider border border-red-500/40 cursor-pointer flex items-center gap-1.5 transition-all"
                        title="Excluir esta faca automaticamente"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>EXCLUIR</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* TAB 3: SETTINGS & WHATSAPP */}
              {activeTab === 'settings' && (
                <div className="space-y-6 text-xs">
                  <form onSubmit={handleSaveSettingsSubmit} className="space-y-4 text-xs">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest border-b border-white/10 pb-2">
                      Configurações da Loja
                    </h3>

                    <div>
                      <label className="block text-zinc-400 mb-1">Número do WhatsApp (com DDD e 55) *</label>
                      <input
                        type="text"
                        required
                        value={settingsForm.whatsappNumber}
                        onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}
                        placeholder="Ex: 554792787901"
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Nome da Cutelaria</label>
                      <input
                        type="text"
                        value={settingsForm.storeName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Senha de Administrador (PIN)</label>
                      <input
                        type="text"
                        value={settingsForm.adminPin || '251127'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[#161822] border border-white/10 text-white font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-sm uppercase cursor-pointer hover:brightness-110"
                    >
                      Salvar Configurações
                    </button>
                  </form>

                  {/* BACKUP, EXPORT & SYNC SECTION */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        <span>Backup & Sincronização em Nuvem</span>
                      </h3>
                      <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded-lg">
                        {knives.length} {knives.length === 1 ? 'faca' : 'facas'} na memória
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      Exporte o catálogo para um arquivo de segurança no seu computador ou restaure suas facas em qualquer dispositivo.
                    </p>

                    {syncStatusMsg && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>{syncStatusMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Button: Export Backup JSON */}
                      <button
                        type="button"
                        onClick={() => {
                          const dataStr = JSON.stringify(knives, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `backup-facas-fronteira-${new Date().toISOString().slice(0, 10)}.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                          setSyncStatusMsg(`Backup de ${knives.length} facas exportado com sucesso!`);
                        }}
                        disabled={knives.length === 0}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Baixar Backup (JSON)</span>
                      </button>

                      {/* Button: Import Backup JSON */}
                      <button
                        type="button"
                        onClick={() => backupFileInputRef.current?.click()}
                        className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-blue-400" />
                        <span>Restaurar Backup (JSON)</span>
                      </button>
                      <input
                        ref={backupFileInputRef}
                        type="file"
                        accept=".json,application/json"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const parsed = JSON.parse(event.target?.result as string);
                              if (Array.isArray(parsed) && parsed.length > 0) {
                                if (onImportCatalog) {
                                  await onImportCatalog(parsed);
                                }
                                setSyncStatusMsg(`${parsed.length} facas importadas e sincronizadas na nuvem com sucesso!`);
                              } else {
                                alert('Arquivo de backup inválido ou vazio.');
                              }
                            } catch (err) {
                              alert('Erro ao processar o arquivo JSON de backup.');
                            }
                          };
                          reader.readAsText(file);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {/* Button: Force Firestore Sync */}
                    <button
                      type="button"
                      disabled={isSyncingFirestore}
                      onClick={async () => {
                        setIsSyncingFirestore(true);
                        setSyncStatusMsg('Sincronizando facas com a nuvem central do Firebase...');
                        try {
                          const { safeMigrateLocalDataToFirestore } = await import('../lib/firebase');
                          await safeMigrateLocalDataToFirestore();
                          const { idbGetKnives } = await import('../lib/indexedDbStorage');
                          const local = await idbGetKnives();
                          if (local && local.length > 0 && onImportCatalog) {
                            await onImportCatalog(local);
                          }
                          setSyncStatusMsg(`Sincronização concluída! Dados atualizados em tempo real.`);
                        } catch (err) {
                          setSyncStatusMsg('Falha na sincronização. Verifique a conexão de internet.');
                        } finally {
                          setIsSyncingFirestore(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
                      <span>{isSyncingFirestore ? 'Sincronizando com a Nuvem...' : 'Forçar Sincronização com o Firebase'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Visualizer Preview Overlay Modal */}
      {previewKnife && (
        <div
          onClick={() => setPreviewKnife(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl bg-[#141722] rounded-3xl border border-white/15 p-5 space-y-4 shadow-2xl overflow-hidden"
          >
            {/* Header with Title and Close X */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <Eye className="w-4 h-4" />
                <span>Visualização Rápida da Faca</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKnife(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white cursor-pointer transition-all"
                title="Fechar visualização e voltar ao painel ADM"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Photo + Small Side Info for quick identification */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* Photo Area */}
              <div className="sm:col-span-6 relative aspect-square rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center shadow-lg">
                {previewKnife.images?.[0] ? (
                  <img
                    src={previewKnife.images[0]}
                    alt={previewKnife.name}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover ${
                      previewKnife.isOutofStock || (typeof previewKnife.quantity === 'number' && previewKnife.quantity <= 0)
                        ? 'grayscale opacity-75 blur-[2px] contrast-110'
                        : ''
                    }`}
                  />
                ) : (
                  <div className="text-zinc-600 font-mono text-xs uppercase tracking-wider">Sem Foto</div>
                )}

                {(previewKnife.isOutofStock || (typeof previewKnife.quantity === 'number' && previewKnife.quantity <= 0)) && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="px-3.5 py-1.5 bg-red-600 text-white font-extrabold text-xs uppercase tracking-widest rounded-lg border-2 border-red-400 shadow-xl">
                      ESGOTADA
                    </span>
                  </div>
                )}
              </div>

              {/* Small Info on the side */}
              <div className="sm:col-span-6 space-y-2.5">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      CÓD: {previewKnife.code}
                    </span>
                    <span className="text-[9px] text-amber-300 uppercase font-extrabold bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      {previewKnife.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-white leading-tight">{previewKnife.name}</h3>
                </div>

                <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 space-y-1.5 font-mono text-[11px] text-zinc-300">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-sans">Preço:</span>
                    <span className="font-extrabold text-amber-400 text-xs">{formatCurrencyBRL(previewKnife.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 font-sans">Estoque:</span>
                    <span className={`font-bold text-xs ${
                      (previewKnife.quantity ?? 0) <= 0
                        ? 'text-red-400'
                        : (previewKnife.quantity ?? 0) <= 3
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {previewKnife.quantity ?? 0} un.
                    </span>
                  </div>
                  {previewKnife.steelType && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans">Aço:</span>
                      <span className="text-zinc-200 truncate max-w-[110px]">{previewKnife.steelType}</span>
                    </div>
                  )}
                  {previewKnife.handleMaterial && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans">Cabo:</span>
                      <span className="text-zinc-200 truncate max-w-[110px]">{previewKnife.handleMaterial}</span>
                    </div>
                  )}
                  {previewKnife.length && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400 font-sans">Lâmina:</span>
                      <span className="text-zinc-200">{previewKnife.length}</span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-zinc-400 leading-tight">
                  Identificação do modelo. Clique em voltar para continuar no painel.
                </p>
              </div>
            </div>

            {/* Bottom Button to close modal and return to admin */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewKnife(null)}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer transition-colors border border-white/10"
              >
                Voltar ao Painel ADM
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Category Modal */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161822] border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-base uppercase tracking-wider flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <span>Adicionar Nova Categoria</span>
              </h4>
              <button
                onClick={() => setShowAddCatModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Digite o nome da nova categoria. Ao salvar, ela aparecerá automaticamente ao lado das outras categorias no catálogo.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Nome da Categoria *
              </label>
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                placeholder="Ex: CHEF, EDC, CHURRASCO, CAÇA..."
                className="w-full p-3 rounded-xl bg-black/50 border border-white/10 text-amber-300 font-bold focus:border-amber-500 uppercase text-sm focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCatModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCategoryInput.trim()) {
                    const catUpper = newCategoryInput.trim().toUpperCase();
                    const updated = saveCategory(catUpper);
                    setAllCategoriesList([...updated]);
                    if (editingKnife) {
                      setEditingKnife({ ...editingKnife, category: catUpper });
                    }
                    setSaveMessage(`✓ Categoria "${catUpper}" adicionada com sucesso!`);
                    setTimeout(() => setSaveMessage(''), 3500);
                    setNewCategoryInput('');
                    setShowAddCatModal(false);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff6b00] to-[#e05600] text-white font-bold text-xs uppercase shadow-lg shadow-[#ff6b00]/20 hover:brightness-110 cursor-pointer transition-all"
              >
                Salvar Categoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Customer Sale Modal */}
      <SelectCustomerSaleModal
        isOpen={isSelectCustomerModalOpen}
        knife={saleTargetKnife}
        onClose={() => {
          setIsSelectCustomerModalOpen(false);
          setSaleTargetKnife(null);
        }}
        onConfirmSale={handleConfirmSaleWithCustomer}
        onGoToCrmRegister={handleGoToCrmRegister}
        onGoToSalesTab={() => setActiveTab('vendas')}
      />

      {/* Monthly Sales Report Modal */}
      <SalesReportModal
        isOpen={isSalesReportOpen}
        onClose={() => setIsSalesReportOpen(false)}
      />
    </div>
  );
}
