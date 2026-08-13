export interface Customer {
  id: string;
  name: string;           // Nome completo
  birthDate: string;      // Data de nascimento (DD/MM/AAAA ou YYYY-MM-DD)
  whatsapp: string;       // WhatsApp com DDD
  purchasesCount: number; // Quantidade de compras
  rewardClaimed?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const CUSTOMERS_KEY = 'cutelaria_customers_v1';

export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading customers from localStorage:', e);
  }
  return [];
}

export function saveCustomersToStorage(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers to localStorage:', e);
  }
}

export async function fetchCustomersAPI(): Promise<Customer[]> {
  try {
    const res = await fetch('/api/customers');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveCustomersToStorage(data);
        return data;
      }
    }
  } catch (e) {
    console.warn('API customers fetch failed, fallback to localStorage:', e);
  }
  return getStoredCustomers();
}

export async function saveCustomerAPI(customer: Partial<Customer>): Promise<Customer> {
  const current = getStoredCustomers();
  const id = customer.id || `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const formatted: Customer = {
    id,
    name: customer.name ? customer.name.trim() : 'Cliente Sem Nome',
    birthDate: customer.birthDate ? customer.birthDate.trim() : '',
    whatsapp: customer.whatsapp ? customer.whatsapp.trim() : '',
    purchasesCount: typeof customer.purchasesCount === 'number' ? Math.max(0, customer.purchasesCount) : 0,
    rewardClaimed: Boolean(customer.rewardClaimed),
    createdAt: customer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = current.findIndex((c) => c.id === id);
  let updatedList: Customer[];
  if (existingIdx !== -1) {
    updatedList = [...current];
    updatedList[existingIdx] = { ...updatedList[existingIdx], ...formatted };
  } else {
    updatedList = [formatted, ...current];
  }

  saveCustomersToStorage(updatedList);

  try {
    const method = customer.id ? 'PUT' : 'POST';
    const url = customer.id ? `/api/customers/${customer.id}` : '/api/customers';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formatted),
    });
  } catch (e) {
    console.warn('API customer save sync failed:', e);
  }

  return formatted;
}

export async function deleteCustomerAPI(id: string): Promise<void> {
  const current = getStoredCustomers();
  const updatedList = current.filter((c) => c.id !== id);
  saveCustomersToStorage(updatedList);

  try {
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('API customer delete sync failed:', e);
  }
}

export async function incrementCustomerPurchasesAPI(id: string): Promise<Customer | null> {
  const current = getStoredCustomers();
  const idx = current.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const target = current[idx];
  const newCount = target.purchasesCount + 1;
  const updatedCustomer: Customer = {
    ...target,
    purchasesCount: newCount,
    updatedAt: new Date().toISOString(),
  };

  current[idx] = updatedCustomer;
  saveCustomersToStorage(current);

  try {
    await fetch(`/api/customers/${id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.warn('API increment purchase sync failed:', e);
  }

  return updatedCustomer;
}

export async function claimCustomerRewardAPI(id: string): Promise<Customer | null> {
  const current = getStoredCustomers();
  const idx = current.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  const target = current[idx];
  const newCount = Math.max(0, target.purchasesCount - 10);
  const updatedCustomer: Customer = {
    ...target,
    purchasesCount: newCount,
    rewardClaimed: false,
    updatedAt: new Date().toISOString(),
  };

  current[idx] = updatedCustomer;
  saveCustomersToStorage(current);

  try {
    await fetch(`/api/customers/${id}/claim-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.warn('API claim reward sync failed:', e);
  }

  return updatedCustomer;
}

// Utility functions for birthdays and WhatsApp URL generation

export function formatWhatsAppUrl(whatsapp: string, name: string): string {
  if (!whatsapp) return '';
  // Clean digits
  let digits = whatsapp.replace(/\D/g, '');
  if (!digits) return '';
  // If no country code, prepend 55 (Brazil)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  const message = `Olá, ${name}! 🎉 A equipe da Fronteira Cutelaria deseja a você um feliz aniversário! Que seu novo ciclo seja repleto de saúde, felicidade e grandes momentos. Aproveite muito o seu dia! 🥳🔪`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export interface BirthdayMatch {
  customer: Customer;
  type: 'today' | 'next7' | 'thisMonth';
  daysUntil: number;
  formattedBirthDay: string;
}

export function parseBirthDateParts(birthDateStr: string): { day: number; month: number; year?: number } | null {
  if (!birthDateStr) return null;
  const clean = birthDateStr.trim();
  
  // Try DD/MM/YYYY or DD/MM
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10);
    const year = slashMatch[3] ? parseInt(slashMatch[3], 10) : undefined;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { day, month, year };
    }
  }

  // Try YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return { day, month, year };
    }
  }

  return null;
}

export function getBirthdayMatches(customers: Customer[]): {
  today: Customer[];
  next7Days: Customer[];
  thisMonth: Customer[];
} {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1; // 1-indexed

  const todayList: Customer[] = [];
  const next7List: Customer[] = [];
  const monthList: Customer[] = [];

  for (const customer of customers) {
    const parts = parseBirthDateParts(customer.birthDate);
    if (!parts) continue;

    const { day, month } = parts;

    // Check if same month
    if (month === currentMonth) {
      monthList.push(customer);

      if (day === currentDay) {
        todayList.push(customer);
      } else if (day > currentDay && day <= currentDay + 7) {
        next7List.push(customer);
      }
    } else {
      // Handle month wrap-around for next 7 days if near end of month
      const daysInCurrentMonth = new Date(today.getFullYear(), currentMonth, 0).getDate();
      if (currentDay + 7 > daysInCurrentMonth) {
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        if (month === nextMonth) {
          const daysRemaining = daysInCurrentMonth - currentDay;
          if (day <= 7 - daysRemaining) {
            next7List.push(customer);
          }
        }
      }
    }
  }

  return {
    today: todayList,
    next7Days: next7List,
    thisMonth: monthList,
  };
}

export function getCustomerLastPurchaseInfo(
  customer: Customer,
  sales: { customerId?: string; customerName?: string; timestamp?: number; soldAt?: string }[]
): {
  daysAgo: number | null;
  lastDateStr: string | null;
  isInactive20Days: boolean;
} {
  const customerSales = sales.filter(
    (s) =>
      (s.customerId && s.customerId === customer.id) ||
      (s.customerName && s.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase())
  );

  if (customerSales.length === 0) {
    return {
      daysAgo: null,
      lastDateStr: null,
      isInactive20Days: false,
    };
  }

  let latestTimestamp = 0;
  let latestDateStr = '';

  for (const s of customerSales) {
    let ts = s.timestamp || 0;
    if (!ts && s.soldAt) {
      const parts = s.soldAt.split(' ');
      if (parts[0]) {
        const dateParts = parts[0].split('/');
        if (dateParts.length === 3) {
          ts = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`).getTime();
        }
      }
    }

    if (ts > latestTimestamp) {
      latestTimestamp = ts;
      latestDateStr = s.soldAt || '';
    }
  }

  if (!latestTimestamp) {
    return {
      daysAgo: null,
      lastDateStr: latestDateStr || null,
      isInactive20Days: false,
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - latestTimestamp);
  const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return {
    daysAgo,
    lastDateStr: latestDateStr,
    isInactive20Days: daysAgo >= 20,
  };
}
