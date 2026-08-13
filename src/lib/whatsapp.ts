import { Knife } from '../types';

export const DEFAULT_WHATSAPP_NUMBER = '554792787901';

export function formatCurrencyBRL(amount: number): string {
  if (!amount || amount <= 0) return 'Sob Consulta';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function cleanPhoneNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  return digits || DEFAULT_WHATSAPP_NUMBER;
}

export function generateKnifeWhatsAppLink(knife: Knife, phoneNumber: string = DEFAULT_WHATSAPP_NUMBER): string {
  const cleanPhone = cleanPhoneNumber(phoneNumber) || DEFAULT_WHATSAPP_NUMBER;
  const priceStr = formatCurrencyBRL(knife.price);
  const text = `Olá! Tenho interesse na faca ${knife.name} (Código: ${knife.code}) no valor de ${priceStr}. Gostaria de mais informações sobre disponibilidade e entrega.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function generateExclusiveKnifeWhatsAppLink(phoneNumber: string = DEFAULT_WHATSAPP_NUMBER): string {
  const cleanPhone = cleanPhoneNumber(phoneNumber) || DEFAULT_WHATSAPP_NUMBER;
  const text = `Olá! Gostaria de falar diretamente com a fábrica para solicitar uma faca exclusiva feita especialmente para mim.`;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function generateGeneralWhatsAppLink(message: string, phoneNumber: string = DEFAULT_WHATSAPP_NUMBER): string {
  const cleanPhone = cleanPhoneNumber(phoneNumber) || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
