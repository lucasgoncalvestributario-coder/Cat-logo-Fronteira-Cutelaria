export type Category = 
  | 'TODAS'
  | 'PROMOÇÕES'
  | 'RÚSTICAS'
  | 'CAMPEIRAS'
  | 'TRADICIONAIS'
  | 'TIMES'
  | 'PREMIUM'
  | 'COLECIONADOR'
  | 'TÁBUAS'
  | string;

export interface Knife {
  id: string;
  code: string;
  name: string;
  price: number;
  category: Category | string;
  steelType: string; // Lâmina
  handleMaterial: string; // Material do cabo
  length: string; // Tamanho em polegadas
  quantity: number; // Quantidade disponível
  isOutofStock?: boolean; // Status ESGOTADO manual or automatic
  status?: 'disponivel' | 'esgotado'; // Persistent status label
  images: string[];
  // Promotion fields
  isOnSale?: boolean;
  originalPrice?: number;
  promotionalPrice?: number;
  originalCategory?: string;
  // Optional legacy fields for backwards compatibility
  hrcHardness?: string;
  thickness?: string;
  weight?: string;
  finish?: string;
  sheathType?: string;
  fabricationTime?: string;
  availability?: string;
  description?: string;
  isFeatured?: boolean;
  isLaunch?: boolean;
  isHidden?: boolean;
}

export interface FilterState {
  category: Category | string;
  searchQuery: string;
  steelFilter: string;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'name';
}

export interface StoreConfig {
  whatsappNumber: string;
  storeName: string;
  adminPin?: string;
  welcomeMessage: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  customCategories?: string[];
}

export type ActiveTab = 'catalog' | 'custom';

