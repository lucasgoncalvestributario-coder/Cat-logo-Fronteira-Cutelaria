import { Knife } from '../types';

export const INITIAL_KNIVES: Knife[] = [
  {
    id: 'faca-001',
    code: 'FC-001',
    name: 'Picanheira Damasco 10" Forjada',
    price: 1890,
    category: 'PREMIUM',
    steelType: 'Aço Damasco (1084/15N20)',
    handleMaterial: 'Madeira Estabilizada de Jacarandá com Pinos em Latão',
    length: '10" (25cm)',
    quantity: 5,
    isOutofStock: false,
    images: [
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&q=80&w=1000'
    ]
  },
  {
    id: 'faca-002',
    code: 'FC-002',
    name: 'Faca Rústica 8" Brut de Forge',
    price: 1250,
    category: 'RÚSTICAS',
    steelType: 'Aço Carbono 5160 Forjado',
    handleMaterial: 'Chifre de Cervo Vermelho com Espaçador Duralumínio',
    length: '8" (20cm)',
    quantity: 3,
    isOutofStock: false,
    images: [
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000'
    ]
  },
  {
    id: 'faca-003',
    code: 'FC-003',
    name: 'Faca Tradicional Gaúcha 9" Inox',
    price: 1180,
    category: 'TRADICIONAIS',
    steelType: 'Aço Inox D2 de Alta Retenção',
    handleMaterial: 'Cerne de Guajuvira e Alpaca',
    length: '9" (23cm)',
    quantity: 4,
    isOutofStock: false,
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=1000'
    ]
  },
  {
    id: 'faca-004',
    code: 'FC-004',
    name: 'Faca de Time Comemorativa 8"',
    price: 990,
    category: 'TIMES',
    steelType: 'Aço Inox 420C Alemão',
    handleMaterial: 'Madeira Resinada Personalizada com Brasão em Latão',
    length: '8" (20cm)',
    quantity: 6,
    isOutofStock: false,
    images: [
      'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&q=80&w=1000'
    ]
  },
  {
    id: 'faca-005',
    code: 'FC-005',
    name: 'Faca de Colecionador Mosaico 12"',
    price: 3400,
    category: 'COLECIONADOR',
    steelType: 'Aço Damasco Mosaico Exclusivo (15N20 + 1095)',
    handleMaterial: 'Chifre de Cervo Canadense com Detalhes em Ouro e Prata',
    length: '12" (30cm)',
    quantity: 1,
    isOutofStock: false,
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=1000',
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000'
    ]
  },
  {
    id: 'faca-006',
    code: 'FC-006',
    name: 'Faca Rústica Sorocabana 10"',
    price: 1450,
    category: 'RÚSTICAS',
    steelType: 'Aço Carbono 1095',
    handleMaterial: 'Osso Bovino Polido e Alpaca',
    length: '10" (25cm)',
    quantity: 0,
    isOutofStock: true,
    images: [
      'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000'
    ]
  }
];

