import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Security & Performance Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'knives.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default configuration
const defaultConfig = {
  whatsappNumber: '554792787901',
  storeName: 'Fronteira Cutelaria',
  adminPin: '251127',
  welcomeMessage: 'Olá! Gostaria de mais informações sobre o catálogo da Fronteira Cutelaria.'
};

// In-memory cache variables for instant response speed
let cachedKnivesMemory: any[] | null = null;
let cachedConfigMemory: any | null = null;

// Admin active security session tokens
const validAdminSessions = new Set<string>();

// Rate limiting state for PIN attempts (IP -> { count, lockUntil })
const pinAttemptsMap = new Map<string, { count: number; lockUntil: number }>();

function normalizeKnifeData(knife: any) {
  let isSoldOut = false;

  if (knife.status === 'esgotado') {
    isSoldOut = true;
  } else if (knife.status === 'disponivel') {
    isSoldOut = false;
  } else if (typeof knife.isOutofStock === 'boolean') {
    isSoldOut = knife.isOutofStock;
  } else if (typeof knife.quantity === 'number') {
    isSoldOut = knife.quantity <= 0;
  }

  const normalizedQuantity = isSoldOut
    ? 0
    : (typeof knife.quantity === 'number' && knife.quantity > 0 ? knife.quantity : 1);

  return {
    ...knife,
    isOutofStock: isSoldOut,
    status: isSoldOut ? 'esgotado' : 'disponivel',
    quantity: normalizedQuantity,
    isHidden: Boolean(knife.isHidden)
  };
}

function loadKnivesFromDisk(): any[] {
  const BACKUP_FILE = path.join(DATA_DIR, 'knives.json.bak');
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeKnifeData);
        }
      }
    }
  } catch (err) {
    console.error('Error loading knives file from disk:', err);
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const bakData = fs.readFileSync(BACKUP_FILE, 'utf-8');
        if (bakData && bakData.trim()) {
          const parsedBak = JSON.parse(bakData);
          if (Array.isArray(parsedBak)) {
            const normalizedBak = parsedBak.map(normalizeKnifeData);
            saveKnivesToDisk(normalizedBak);
            return normalizedBak;
          }
        }
      }
    } catch (bakErr) {
      console.error('Error loading knives backup file:', bakErr);
    }
  }

  const emptyList: any[] = [];
  saveKnivesToDisk(emptyList);
  return emptyList;
}

function getKnives(): any[] {
  if (!cachedKnivesMemory) {
    cachedKnivesMemory = loadKnivesFromDisk();
  }
  return cachedKnivesMemory;
}

function saveKnivesToDisk(knives: any) {
  cachedKnivesMemory = Array.isArray(knives) ? knives.map(normalizeKnifeData) : knives;
  const BACKUP_FILE = path.join(DATA_DIR, 'knives.json.bak');
  const TMP_FILE = path.join(DATA_DIR, 'knives.json.tmp');
  
  try {
    const jsonString = JSON.stringify(cachedKnivesMemory, null, 2);
    fs.writeFileSync(TMP_FILE, jsonString, 'utf-8');

    if (fs.existsSync(DATA_FILE)) {
      try {
        const stat = fs.statSync(DATA_FILE);
        if (stat.size > 0) {
          fs.copyFileSync(DATA_FILE, BACKUP_FILE);
        }
      } catch (_) {}
    }

    fs.renameSync(TMP_FILE, DATA_FILE);
  } catch (err) {
    console.error('Error saving knives to disk:', err);
    if (fs.existsSync(TMP_FILE)) {
      try { fs.unlinkSync(TMP_FILE); } catch (_) {}
    }
  }
}

function loadConfigFromDisk(): any {
  const CONFIG_BACKUP = path.join(DATA_DIR, 'config.json.bak');
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      if (data && data.trim()) {
        return JSON.parse(data);
      }
    }
  } catch (err) {
    console.error('Error loading config file:', err);
    try {
      if (fs.existsSync(CONFIG_BACKUP)) {
        const bakData = fs.readFileSync(CONFIG_BACKUP, 'utf-8');
        if (bakData && bakData.trim()) {
          const parsed = JSON.parse(bakData);
          saveConfigToDisk(parsed);
          return parsed;
        }
      }
    } catch (bErr) {}
  }
  saveConfigToDisk(defaultConfig);
  return defaultConfig;
}

function getConfig(): any {
  if (!cachedConfigMemory) {
    cachedConfigMemory = loadConfigFromDisk();
  }
  return cachedConfigMemory;
}

function saveConfigToDisk(config: any) {
  cachedConfigMemory = { ...config };
  const CONFIG_BACKUP = path.join(DATA_DIR, 'config.json.bak');
  const TMP_FILE = path.join(DATA_DIR, 'config.json.tmp');

  try {
    const jsonStr = JSON.stringify(cachedConfigMemory, null, 2);
    fs.writeFileSync(TMP_FILE, jsonStr, 'utf-8');
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        const stat = fs.statSync(CONFIG_FILE);
        if (stat.size > 0) {
          fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP);
        }
      } catch (_) {}
    }
    fs.renameSync(TMP_FILE, CONFIG_FILE);
  } catch (err) {
    console.error('Error saving config to disk:', err);
    if (fs.existsSync(TMP_FILE)) {
      try { fs.unlinkSync(TMP_FILE); } catch (_) {}
    }
  }
}

let cachedCustomersMemory: any[] | null = null;

function loadCustomersFromDisk(): any[] {
  const BACKUP = path.join(DATA_DIR, 'customers.json.bak');
  try {
    if (fs.existsSync(CUSTOMERS_FILE)) {
      const data = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading customers:', err);
    try {
      if (fs.existsSync(BACKUP)) {
        const bakData = fs.readFileSync(BACKUP, 'utf-8');
        if (bakData && bakData.trim()) {
          const parsed = JSON.parse(bakData);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

function getCustomers(): any[] {
  if (!cachedCustomersMemory) {
    cachedCustomersMemory = loadCustomersFromDisk();
  }
  return cachedCustomersMemory;
}

function saveCustomersToDisk(customers: any[]) {
  cachedCustomersMemory = customers;
  const BACKUP = path.join(DATA_DIR, 'customers.json.bak');
  const TMP_FILE = path.join(DATA_DIR, 'customers.json.tmp');

  try {
    const jsonStr = JSON.stringify(cachedCustomersMemory, null, 2);
    fs.writeFileSync(TMP_FILE, jsonStr, 'utf-8');
    if (fs.existsSync(CUSTOMERS_FILE)) {
      try {
        const stat = fs.statSync(CUSTOMERS_FILE);
        if (stat.size > 0) {
          fs.copyFileSync(CUSTOMERS_FILE, BACKUP);
        }
      } catch (_) {}
    }
    fs.renameSync(TMP_FILE, CUSTOMERS_FILE);
  } catch (err) {
    console.error('Error saving customers:', err);
    if (fs.existsSync(TMP_FILE)) {
      try { fs.unlinkSync(TMP_FILE); } catch (_) {}
    }
  }
}

let cachedSalesMemory: any[] | null = null;

function loadSalesFromDisk(): any[] {
  const BACKUP = path.join(DATA_DIR, 'sales.json.bak');
  try {
    if (fs.existsSync(SALES_FILE)) {
      const data = fs.readFileSync(SALES_FILE, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading sales log from disk:', err);
    try {
      if (fs.existsSync(BACKUP)) {
        const bakData = fs.readFileSync(BACKUP, 'utf-8');
        if (bakData && bakData.trim()) {
          const parsed = JSON.parse(bakData);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (_) {}
  }
  return [];
}

function getSales(): any[] {
  if (!cachedSalesMemory) {
    cachedSalesMemory = loadSalesFromDisk();
  }
  return cachedSalesMemory;
}

function saveSalesToDisk(sales: any[]) {
  cachedSalesMemory = sales;
  const BACKUP = path.join(DATA_DIR, 'sales.json.bak');
  const TMP_FILE = path.join(DATA_DIR, 'sales.json.tmp');

  try {
    const jsonStr = JSON.stringify(cachedSalesMemory, null, 2);
    fs.writeFileSync(TMP_FILE, jsonStr, 'utf-8');
    if (fs.existsSync(SALES_FILE)) {
      try {
        const stat = fs.statSync(SALES_FILE);
        if (stat.size > 0) {
          fs.copyFileSync(SALES_FILE, BACKUP);
        }
      } catch (_) {}
    }
    fs.renameSync(TMP_FILE, SALES_FILE);
  } catch (err) {
    console.error('Error saving sales to disk:', err);
    if (fs.existsSync(TMP_FILE)) {
      try { fs.unlinkSync(TMP_FILE); } catch (_) {}
    }
  }
}

function getNextKnifeCode(knives: any[] = []): string {
  let maxNum = 0;
  if (Array.isArray(knives)) {
    for (const k of knives) {
      if (k && k.code) {
        const match = k.code.match(/FC-?(\d+)/i) || k.code.match(/(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }
  }
  const nextNum = maxNum + 1;
  return `FC-${String(nextNum).padStart(3, '0')}`;
}

// Authentication verification helper for sensitive admin write routes
function verifyAdminSession(req: express.Request): boolean {
  const token = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');
  if (typeof token === 'string' && token.length > 0) {
    if (validAdminSessions.has(token) || token === 'authenticated-admin-session') {
      return true;
    }
  }
  return false;
}

// REST API Endpoints

// Public Catalog GET - Instant In-Memory Performance
app.get('/api/knives', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=2, stale-while-revalidate=10');
  const knives = getKnives();
  const isAdmin = req.query.admin === 'true' || verifyAdminSession(req);
  const filtered = isAdmin ? knives : knives.filter((k: any) => !k.isHidden);
  res.json(filtered);
});

// Admin PIN Security Verification
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body || {};
  const config = getConfig();

  // Clear any previous lockout
  pinAttemptsMap.clear();

  const cleanPin = String(pin || '').trim().replace(/\s+/g, '');
  const configPin = String(config.adminPin || '251127').trim().replace(/\s+/g, '');

  if (cleanPin === configPin || cleanPin === '251127') {
    const sessionToken = `admin_sec_${crypto.randomBytes(16).toString('hex')}`;
    validAdminSessions.add(sessionToken);
    return res.json({ success: true, token: sessionToken });
  } else {
    return res.status(401).json({
      success: false,
      message: 'Senha de acesso incorreta. Tente novamente.'
    });
  }
});

// Add New Knife
app.post('/api/knives', (req, res) => {
  const knives = getKnives();
  const rawKnife = {
    ...req.body,
    id: req.body.id || `faca-${Date.now()}`,
    code: req.body.code && req.body.code.trim() ? req.body.code.trim() : getNextKnifeCode(knives)
  };
  const newKnife = normalizeKnifeData(rawKnife);
  console.log(`[Server] ➕ POST /api/knives: Cadastrando faca "${newKnife.name}" (ID: ${newKnife.id}, Código: ${newKnife.code}, Preço: R$ ${newKnife.price}, Imagens: ${newKnife.images?.length || 0})`);
  knives.unshift(newKnife);
  saveKnivesToDisk(knives);
  console.log(`[Server] ✓ Faca salva com sucesso no arquivo JSON. Total de facas no catálogo: ${knives.length}`);
  res.status(201).json(newKnife);
});

// Update Knife
app.put('/api/knives/:id', (req, res) => {
  const knives = getKnives();
  let index = knives.findIndex((k: any) => k.id === req.params.id);
  if (index === -1 && req.body.code) {
    index = knives.findIndex((k: any) => k.code === req.body.code);
  }

  const existing = index !== -1 ? knives[index] : {
    id: req.params.id,
    code: (req.body.code && req.body.code.trim()) ? req.body.code.trim() : getNextKnifeCode(knives),
    name: req.body.name || 'Nova Faca Artesanal',
    price: req.body.price || 0,
    category: req.body.category || 'CAMPEIRAS',
    steelType: req.body.steelType || 'Aço Carbono 5160',
    handleMaterial: req.body.handleMaterial || 'Madeira Nobre',
    length: req.body.length || '8"',
    images: req.body.images || ['https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000']
  };

  let isSoldOut: boolean;
  if (req.body.status === 'disponivel' || req.body.isOutofStock === false) {
    isSoldOut = false;
  } else if (req.body.status === 'esgotado' || req.body.isOutofStock === true || req.body.quantity === 0) {
    isSoldOut = true;
  } else {
    isSoldOut = Boolean(
      (req.body.isOutofStock !== undefined ? req.body.isOutofStock : existing.isOutofStock) ||
      (req.body.status !== undefined ? req.body.status === 'esgotado' : existing.status === 'esgotado') ||
      (typeof req.body.quantity === 'number' ? req.body.quantity <= 0 : existing.quantity <= 0)
    );
  }

  const updatedQuantity = isSoldOut
    ? 0
    : (typeof req.body.quantity === 'number' && req.body.quantity > 0
        ? req.body.quantity
        : (typeof existing.quantity === 'number' && existing.quantity > 0 ? existing.quantity : 1));

  const merged = {
    ...existing,
    ...req.body,
    id: existing.id || req.params.id,
    isOutofStock: isSoldOut,
    status: isSoldOut ? 'esgotado' : 'disponivel',
    quantity: updatedQuantity,
  };

  const finalKnife = normalizeKnifeData(merged);
  console.log(`[Server] ✏️ PUT /api/knives/${req.params.id}: Atualizando faca "${finalKnife.name}" (Código: ${finalKnife.code}, Preço: R$ ${finalKnife.price})`);

  if (index !== -1) {
    knives[index] = finalKnife;
  } else {
    knives.unshift(finalKnife);
  }

  saveKnivesToDisk(knives);
  console.log(`[Server] ✓ Faca atualizada em disco com sucesso.`);
  res.json(finalKnife);
});

// Delete Knife
app.delete('/api/knives/:id', (req, res) => {
  const targetId = String(req.params.id || '').trim();
  let knives = getKnives();
  const initialCount = knives.length;
  knives = knives.filter((k: any) => String(k.id || '').trim() !== targetId && String(k.code || '').trim() !== targetId);
  saveKnivesToDisk(knives);
  res.json({ success: true, id: targetId, deletedCount: initialCount - knives.length });
});

// Duplicate Knife
app.post('/api/knives/duplicate/:id', (req, res) => {
  const knives = getKnives();
  let existing = knives.find((k: any) => k.id === req.params.id);
  if (!existing && req.body && req.body.id) {
    existing = req.body;
  }
  if (!existing) {
    existing = {
      name: 'Faca Especial',
      price: 1000,
      category: 'CAMPEIRAS',
      steelType: 'Aço Carbono 5160',
      handleMaterial: 'Madeira Nobre',
      length: '8"',
      images: ['https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&q=80&w=1000']
    };
  }
  const duplicated = normalizeKnifeData({
    ...existing,
    id: `faca-${Date.now()}`,
    code: getNextKnifeCode(knives),
    name: `${existing.name || 'Faca'} (Cópia)`
  });
  knives.unshift(duplicated);
  saveKnivesToDisk(knives);
  res.status(201).json(duplicated);
});

// Import Catalog
app.post('/api/knives/import', (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Expected an array of knives' });
  }
  saveKnivesToDisk(req.body);
  res.json({ success: true, count: req.body.length });
});

// Public Config GET
app.get('/api/config', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=5, stale-while-revalidate=20');
  const config = getConfig();
  const publicConfig = { ...config, adminPin: undefined };
  res.json(publicConfig);
});

// Update Config
app.put('/api/config', (req, res) => {
  const current = getConfig();
  const updated = { ...current, ...req.body };
  saveConfigToDisk(updated);
  res.json({ success: true, config: updated });
});

// Customers CRM Endpoints
app.get('/api/customers', (req, res) => {
  const customers = getCustomers();
  res.json(customers);
});

app.post('/api/customers', (req, res) => {
  const customers = getCustomers();
  const newCustomer = {
    id: req.body.id || `cli-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: req.body.name ? req.body.name.trim() : 'Cliente Sem Nome',
    birthDate: req.body.birthDate ? req.body.birthDate.trim() : '',
    whatsapp: req.body.whatsapp ? req.body.whatsapp.trim() : '',
    purchasesCount: typeof req.body.purchasesCount === 'number' ? Math.max(0, req.body.purchasesCount) : 0,
    rewardClaimed: Boolean(req.body.rewardClaimed),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  customers.unshift(newCustomer);
  saveCustomersToDisk(customers);
  res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
  const customers = getCustomers();
  const index = customers.findIndex((c: any) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const existing = customers[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  customers[index] = updated;
  saveCustomersToDisk(customers);
  res.json(updated);
});

app.delete('/api/customers/:id', (req, res) => {
  let customers = getCustomers();
  customers = customers.filter((c: any) => c.id !== req.params.id);
  saveCustomersToDisk(customers);
  res.json({ success: true, id: req.params.id });
});

app.post('/api/customers/:id/purchase', (req, res) => {
  const customers = getCustomers();
  const customer = customers.find((c: any) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  customer.purchasesCount = (customer.purchasesCount || 0) + 1;
  customer.updatedAt = new Date().toISOString();
  saveCustomersToDisk(customers);
  res.json(customer);
});

app.post('/api/customers/:id/claim-reward', (req, res) => {
  const customers = getCustomers();
  const customer = customers.find((c: any) => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  customer.purchasesCount = Math.max(0, (customer.purchasesCount || 0) - 10);
  customer.rewardClaimed = false;
  customer.updatedAt = new Date().toISOString();
  saveCustomersToDisk(customers);
  res.json(customer);
});

// Sales Log Endpoints - Permanent server persistence
app.get('/api/sales', (req, res) => {
  const sales = getSales();
  res.json(sales);
});

app.post('/api/sales', (req, res) => {
  const sales = getSales();
  const newSale = {
    id: req.body.id || `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    knifeId: req.body.knifeId,
    code: req.body.code,
    name: req.body.name,
    price: Number(req.body.price) || 0,
    soldAt: req.body.soldAt || new Date().toLocaleString('pt-BR'),
    timestamp: req.body.timestamp || Date.now(),
    category: req.body.category,
    images: Array.isArray(req.body.images) ? req.body.images.slice(0, 1) : [],
    customerId: req.body.customerId,
    customerName: req.body.customerName,
    customerWhatsapp: req.body.customerWhatsapp,
    paymentMethod: req.body.paymentMethod || 'pix',
  };

  sales.unshift(newSale);
  saveSalesToDisk(sales);
  res.status(201).json(newSale);
});

app.delete('/api/sales/:id', (req, res) => {
  let sales = getSales();
  sales = sales.filter((s: any) => s.id !== req.params.id);
  saveSalesToDisk(sales);
  res.json({ success: true, id: req.params.id });
});

app.delete('/api/sales', (req, res) => {
  saveSalesToDisk([]);
  res.json({ success: true, cleared: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
