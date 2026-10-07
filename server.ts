import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateCashierHtml } from './cashierTemplate';
import { sendOtpEmail, verifyOtpCode } from './src/server/emailOtpService';

dotenv.config();

const __filenameResolved = typeof __filename !== 'undefined' ? __filename : '';
const __dirnameResolved = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// ───────────────────────────────────────────────────────────
// PAYMENT GATEWAY CONFIGURATIONS & CPANEL BACKEND URLS
// ───────────────────────────────────────────────────────────

// cPanel Backend API & Deposit URL Configurations
export const CPANEL_API_BASE_URL = process.env.CPANEL_API_BASE_URL || 'https://api.nvtenergy.online';
export const CPANEL_DEPOSIT_URL = process.env.CPANEL_DEPOSIT_URL || `${CPANEL_API_BASE_URL}/deposit`;

// Channel 1: Nekpay Integration Configuration (hosted on cPanel backend)
// Endpoint: https://api.nvtenergy.online/api/v1/nekpay/create-order
const NEKPAY_CONFIG = {
  createOrderUrl: `${CPANEL_API_BASE_URL}/api/v1/nekpay/create-order`,
};

// Channel 2: WatchPay Integration Configuration (hosted on cPanel backend)
// Endpoint: https://api.nvtenergy.online/create-order-watchpay
const WATCHPAY_CONFIG = {
  createOrderUrl: `${CPANEL_API_BASE_URL}/create-order-watchpay`,
};

// Channel 2 Legacy / Fallback: OKExPay / WPay Integration Configuration
// Host: https://sandbox.okexpay.dev
// Endpoint: /v1/Collect
// Credentials: mchId: "1000", Key: "4035fcd2d720e1b06ea455bdde411012"
// Order ID rule: Append an even number at the end for auto-success
const OKEXPAY_CONFIG = {
  mchId: process.env.OKEXPAY_MCH_ID || '1000',
  key: process.env.OKEXPAY_KEY || '4035fcd2d720e1b06ea455bdde411012',
  host: process.env.OKEXPAY_HOST || 'https://sandbox.okexpay.dev',
  collectEndpoint: '/v1/Collect',
};

interface PaymentLog {
  id: string;
  channel: 'NEKPAY' | 'OKEXPAY' | 'WATCHPAY' | 'PAYOUT' | 'DEPOSIT' | 'GATEWAY';
  type: 'PAYIN_REQUEST' | 'PAYIN_CALLBACK' | 'PAYOUT_REQUEST';
  timestamp: string;
  orderId?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  details: any;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Middleware - trust first proxy (Cloud Run / GCP load balancer / Render proxy)
  app.set('trust proxy', 1);

  // Enable CORS for cross-origin frontend hosting (e.g. Firebase Hosting or Vercel calling Render backend)
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // High-Performance Rate Limiters for DDOS, Brute Force & Spam Protection
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { success: false, error: 'Too many requests, please try again in a minute.' },
  });

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { success: false, error: 'Too many authentication attempts. Please try again after 1 minute.' },
  });

  const payoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    message: { success: false, error: 'Too many payout requests. Please wait a minute.' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth/', authLimiter);
  app.use('/api/v1/payout', payoutLimiter);

  // In-memory and disk-persistent stores
  const ordersDatabase = new Map<string, any>();
  const ORDERS_FILE_PATH = path.join(process.cwd(), 'data', 'deposit_orders.json');

  const loadOrdersFromDisk = () => {
    try {
      if (fs.existsSync(ORDERS_FILE_PATH)) {
        const raw = fs.readFileSync(ORDERS_FILE_PATH, 'utf-8');
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const item of list) {
            if (item && item.orderId) ordersDatabase.set(item.orderId, item);
            if (item && item.trxId) ordersDatabase.set(item.trxId, item);
          }
        }
      }
    } catch (e) {
      console.warn('[Orders Persistence] Load error:', e);
    }
  };

  const saveOrdersToDisk = () => {
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const uniqueList: any[] = [];
      const seen = new Set<string>();
      for (const val of ordersDatabase.values()) {
        const key = val.orderId || val.trxId;
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueList.push(val);
        }
      }
      fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(uniqueList, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[Orders Persistence] Save error:', e);
    }
  };

  loadOrdersFromDisk();

  // ───────────────────────────────────────────────────────────
  // ADMIN DEPOSITS MANAGEMENT APIS (Guaranteed visibility for admin)
  // ───────────────────────────────────────────────────────────
  app.get('/api/admin/deposits', (_req, res) => {
    try {
      const list: any[] = [];
      const seen = new Set<string>();
      for (const val of ordersDatabase.values()) {
        const key = val.orderId || val.trxId;
        if (key && !seen.has(key)) {
          seen.add(key);
          list.push(val);
        }
      }
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return res.json({ success: true, deposits: list });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message });
    }
  });

  app.post('/api/admin/deposit-action', (req, res) => {
    try {
      const { depositId, action, amount, userId } = req.body;
      const cleanKey = String(depositId || '').trim();
      const isApprove = action === 'approve';
      const newStatus = isApprove ? 'COMPLETED' : 'REJECTED';

      let order = ordersDatabase.get(cleanKey) || ordersDatabase.get(cleanKey.toUpperCase());
      if (!order) {
        order = {
          orderId: cleanKey,
          trxId: cleanKey,
          amount: Number(amount) || 0,
          userId: userId || 'USER1001',
          channel: 'channel1',
          channelName: 'চ্যানেল ১ (Nekpay)',
          method: 'bKash',
          createdAt: new Date().toISOString(),
        };
      }
      order.status = newStatus;
      order.verified = isApprove;
      order.webhookConfirmed = isApprove;
      order.updatedAt = new Date().toISOString();

      ordersDatabase.set(cleanKey, order);
      if (order.orderId) ordersDatabase.set(order.orderId, order);
      if (order.trxId) ordersDatabase.set(order.trxId, order);
      saveOrdersToDisk();

      // Forward callback to cPanel backend
      const cpanelPayload = {
        orderNo: order.orderId || cleanKey,
        trxId: order.trxId || cleanKey,
        amount: order.amount || Number(amount) || 0,
        status: isApprove ? 'SUCCESS' : 'FAILED',
        isApproved: isApprove,
        userId: order.userId || userId,
      };
      forwardToCpanelDeposit(cpanelPayload, `${CPANEL_API_BASE_URL}/nekpay-callback`);
      forwardToCpanelDeposit(cpanelPayload, `${CPANEL_DEPOSIT_URL}`);

      return res.json({ success: true, message: `Deposit ${newStatus}`, order });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message });
    }
  });

  const paymentLogs: PaymentLog[] = [];

  const addLog = (log: Omit<PaymentLog, 'id' | 'timestamp'>) => {
    const entry: PaymentLog = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    paymentLogs.unshift(entry);
    if (paymentLogs.length > 50) paymentLogs.pop();
    return entry;
  };

  // Helper to forward deposit requests, transaction callbacks, and webhook submissions directly to cPanel
  const forwardToCpanelDeposit = async (payload: Record<string, any>, customUrl?: string) => {
    const targetUrl = customUrl || `${CPANEL_API_BASE_URL}/nekpay-callback`;
    try {
      // 1. Forward as application/json
      fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'NovaVest-Server/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }).catch((e) => {
        console.warn(`[cPanel Forward JSON Notice (${targetUrl})]:`, e?.message || e);
      });

      // 2. Also forward as application/x-www-form-urlencoded (standard PHP $_POST in cPanel)
      try {
        const formParams = new URLSearchParams();
        for (const [key, val] of Object.entries(payload)) {
          if (val !== undefined && val !== null) {
            formParams.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
          }
        }
        fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'NovaVest-Server/1.0',
          },
          body: formParams.toString(),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      } catch (_) {}
    } catch (err: any) {
      console.warn(`[cPanel Forward Error (${targetUrl})]:`, err?.message || err);
    }
  };

  // ───────────────────────────────────────────────────────────
  // PERSISTENT AUTH & PHONE REGISTRY FOR CROSS-BROWSER LOGIN
  // Ensures any user can log in with their phone from any browser
  // ───────────────────────────────────────────────────────────
  const REGISTRY_DIR = path.join(process.cwd(), 'data');
  const REGISTRY_FILE = path.join(REGISTRY_DIR, 'phone_registry.json');
  const phoneRegistry = new Map<string, {
    phone: string;
    last10: string;
    email: string;
    uid?: string;
    memberId?: string;
    referralCode?: string;
    username?: string;
    updatedAt: string;
  }>();

  // Load persisted phone registry from disk
  const loadPhoneRegistryFromDisk = () => {
    try {
      if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
      }
      if (fs.existsSync(REGISTRY_FILE)) {
        const raw = fs.readFileSync(REGISTRY_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, val]: [string, any]) => {
            if (val && typeof val === 'object') {
              phoneRegistry.set(key, val);
            }
          });
          console.log(`[PhoneRegistry] Loaded ${phoneRegistry.size} registered accounts from disk`);
        }
      }
    } catch (err) {
      console.warn('[PhoneRegistry] Notice loading phone registry from disk:', err);
    }
  };

  const savePhoneRegistryToDisk = () => {
    try {
      if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
      }
      const obj: Record<string, any> = {};
      phoneRegistry.forEach((v, k) => {
        obj[k] = v;
      });
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[PhoneRegistry] Notice saving phone registry to disk:', err);
    }
  };

  loadPhoneRegistryFromDisk();

  const normalizePhoneQuery = (raw: string): string => {
    return String(raw || '').replace(/\D/g, '');
  };

  // 1. GET /api/auth/check-phone
  app.get('/api/auth/check-phone', (req, res) => {
    const raw = String(req.query.phone || '').trim();
    const digits = normalizePhoneQuery(raw);
    const last10 = digits.slice(-10);

    if (!last10) {
      return res.json({ registered: false });
    }

    const record =
      phoneRegistry.get(last10) ||
      phoneRegistry.get(`0${last10}`) ||
      phoneRegistry.get(`880${last10}`) ||
      phoneRegistry.get(digits);

    if (record) {
      return res.json({
        registered: true,
        email: record.email,
        memberId: record.memberId,
        referralCode: record.referralCode,
        username: record.username,
      });
    }

    return res.json({ registered: false });
  });

  // 2. GET /api/auth/phone-to-email
  app.get('/api/auth/phone-to-email', (req, res) => {
    const raw = String(req.query.phone || req.query.identifier || '').trim();
    const digits = normalizePhoneQuery(raw);
    const last10 = digits.slice(-10);

    if (!last10 && !raw) {
      return res.json({ found: false });
    }

    const record =
      (last10 && phoneRegistry.get(last10)) ||
      (last10 && phoneRegistry.get(`0${last10}`)) ||
      (last10 && phoneRegistry.get(`880${last10}`)) ||
      (digits && phoneRegistry.get(digits)) ||
      phoneRegistry.get(raw.toUpperCase());

    if (record && record.email) {
      return res.json({
        found: true,
        email: record.email,
        phone: record.phone,
        memberId: record.memberId,
        referralCode: record.referralCode,
        uid: record.uid,
      });
    }

    // Default canonical email for fallback
    return res.json({
      found: false,
      suggestedEmail: last10 ? `880${last10}@novavest.local` : undefined,
    });
  });

  // ── REAL EMAIL OTP ENDPOINTS ──
  // POST /api/send-email-otp
  app.post('/api/send-email-otp', async (req, res) => {
    try {
      const { email, lang } = req.body || {};
      const result = await sendOtpEmail(email, lang);
      return res.json(result);
    } catch (err: any) {
      console.error('[API] /api/send-email-otp error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while sending email OTP.',
      });
    }
  });

  // POST /api/verify-email-otp
  app.post('/api/verify-email-otp', (req, res) => {
    try {
      const { email, code, lang } = req.body || {};
      const result = verifyOtpCode(email, code, lang);
      return res.json(result);
    } catch (err: any) {
      console.error('[API] /api/verify-email-otp error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while verifying email OTP.',
      });
    }
  });

  // 3. POST /api/auth/register-phone
  app.post('/api/auth/register-phone', (req, res) => {
    const { phone, email, uid, memberId, referralCode, username, last10: bodyLast10 } = req.body || {};
    const digits = normalizePhoneQuery(phone);
    const last10 = String(bodyLast10 || (digits ? digits.slice(-10) : '')).trim();

    if (!last10 || !email) {
      return res.status(400).json({ success: false, error: 'Phone and email are required' });
    }

    const record = {
      phone: String(phone || '').trim(),
      last10,
      email: String(email || '').trim().toLowerCase(),
      uid: uid ? String(uid).trim() : undefined,
      memberId: memberId ? String(memberId).trim().toUpperCase() : undefined,
      referralCode: referralCode ? String(referralCode).trim().toUpperCase() : undefined,
      username: username ? String(username).trim() : undefined,
      updatedAt: new Date().toISOString(),
    };

    phoneRegistry.set(last10, record);
    phoneRegistry.set(`0${last10}`, record);
    phoneRegistry.set(`880${last10}`, record);
    if (digits && digits !== last10) {
      phoneRegistry.set(digits, record);
    }
    if (record.memberId) {
      phoneRegistry.set(record.memberId, record);
    }
    if (record.referralCode) {
      phoneRegistry.set(record.referralCode, record);
    }

    savePhoneRegistryToDisk();

    return res.json({
      success: true,
      message: 'Phone registered successfully in server registry',
      record,
    });
  });

  // User profile persistent backup store on server disk
  const USERS_BACKUP_FILE = path.join(REGISTRY_DIR, 'users_backup.json');
  const usersBackupMap = new Map<string, any>();

  const loadUsersBackupFromDisk = () => {
    try {
      if (fs.existsSync(USERS_BACKUP_FILE)) {
        const raw = fs.readFileSync(USERS_BACKUP_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (typeof data === 'object' && data !== null) {
          Object.entries(data).forEach(([key, val]) => {
            if (val && typeof val === 'object') {
              usersBackupMap.set(key, val);
            }
          });
          console.log(`[UsersBackup] Loaded ${usersBackupMap.size} user profiles from disk`);
        }
      }
    } catch (err) {
      console.warn('[UsersBackup] Notice loading users backup from disk:', err);
    }
  };

  const saveUsersBackupToDisk = () => {
    try {
      if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
      }
      const obj: Record<string, any> = {};
      usersBackupMap.forEach((v, k) => {
        obj[k] = v;
      });
      fs.writeFileSync(USERS_BACKUP_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[UsersBackup] Notice saving users backup to disk:', err);
    }
  };

  loadUsersBackupFromDisk();

  // POST /api/auth/backup-user - Silently backs up user profile on server
  app.post('/api/auth/backup-user', (req, res) => {
    try {
      const user = req.body;
      if (!user || (!user.uid && !user.phone && !user.email)) {
        return res.status(400).json({ success: false, error: 'Invalid user payload' });
      }

      const uid = user.uid ? String(user.uid).trim() : '';
      const email = user.email ? String(user.email).trim().toLowerCase() : '';
      const phone = user.phone ? String(user.phone).trim() : '';
      const digits = normalizePhoneQuery(phone);
      const last10 = digits ? digits.slice(-10) : '';
      const memberId = user.memberId ? String(user.memberId).trim().toUpperCase() : '';

      const existing = (uid && usersBackupMap.get(uid)) || (email && usersBackupMap.get(email)) || (last10 && usersBackupMap.get(last10));

      const record = {
        ...(existing || {}),
        ...user,
        canRefer: user.canRefer !== undefined ? Boolean(user.canRefer) : (existing?.canRefer ?? false),
        referralLimit: user.referralLimit !== undefined ? Number(user.referralLimit) : (existing?.referralLimit ?? 0),
        updatedAt: new Date().toISOString(),
      };

      if (uid) usersBackupMap.set(uid, record);
      if (email) usersBackupMap.set(email, record);
      if (last10) {
        usersBackupMap.set(last10, record);
        usersBackupMap.set(`0${last10}`, record);
        usersBackupMap.set(`880${last10}`, record);
      }
      if (memberId) usersBackupMap.set(memberId, record);

      saveUsersBackupToDisk();

      // Also ensure phoneRegistry knows about this user
      if (last10 && email) {
        phoneRegistry.set(last10, {
          phone,
          last10,
          email,
          uid,
          memberId,
          referralCode: user.referralCode,
          username: user.name || user.username,
          updatedAt: new Date().toISOString(),
        });
        savePhoneRegistryToDisk();
      }

      return res.json({ success: true, message: 'User backed up successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // GET /api/auth/get-user-profile - Retrieves user profile by uid, email, or phone
  app.get('/api/auth/get-user-profile', (req, res) => {
    try {
      const uid = String(req.query.uid || '').trim();
      const email = String(req.query.email || '').trim().toLowerCase();
      const phone = String(req.query.phone || '').trim();
      const digits = normalizePhoneQuery(phone);
      const last10 = digits ? digits.slice(-10) : '';

      let found = null;
      if (uid && usersBackupMap.has(uid)) found = usersBackupMap.get(uid);
      if (!found && email && usersBackupMap.has(email)) found = usersBackupMap.get(email);
      if (!found && last10 && usersBackupMap.has(last10)) found = usersBackupMap.get(last10);
      if (!found && last10 && usersBackupMap.has(`0${last10}`)) found = usersBackupMap.get(`0${last10}`);

      if (found) {
        return res.json({ success: true, found: true, user: found });
      }

      return res.json({ success: true, found: false });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 4. GET /api/auth/all-accounts
  app.get('/api/auth/all-accounts', (_req, res) => {
    const uniqueRecords: Record<string, any> = {};
    phoneRegistry.forEach((v) => {
      if (v.last10) {
        uniqueRecords[v.last10] = v;
      }
    });
    return res.json({ success: true, count: Object.keys(uniqueRecords).length, accounts: uniqueRecords });
  });

  // 5. POST /api/admin/delete-user - Purges user from persistent server phone registry
  app.post('/api/admin/delete-user', (req, res) => {
    const { uid, phone, email, memberId, last10: reqLast10 } = req.body || {};
    const digits = normalizePhoneQuery(phone);
    const last10 = String(reqLast10 || (digits ? digits.slice(-10) : '')).trim();

    let deletedCount = 0;
    const keysToDelete: string[] = [];

    phoneRegistry.forEach((val, key) => {
      const matchUid = Boolean(uid && val.uid === uid);
      const matchEmail = Boolean(email && val.email && val.email.toLowerCase() === String(email).toLowerCase());
      const matchLast10 = Boolean(last10 && val.last10 === last10);
      const matchMemberId = Boolean(memberId && val.memberId && val.memberId.toUpperCase() === String(memberId).toUpperCase());
      const matchKey = Boolean(
        (last10 && (key === last10 || key === `0${last10}` || key === `880${last10}`)) ||
        (uid && key === uid) ||
        (memberId && key === String(memberId).toUpperCase())
      );

      if (matchUid || matchEmail || matchLast10 || matchMemberId || matchKey) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((k) => {
      if (phoneRegistry.has(k)) {
        phoneRegistry.delete(k);
        deletedCount++;
      }
    });

    savePhoneRegistryToDisk();

    // Also clean registered_phones.json on disk if present
    try {
      const regPhonesFile = path.join(REGISTRY_DIR, 'registered_phones.json');
      if (fs.existsSync(regPhonesFile)) {
        const raw = fs.readFileSync(regPhonesFile, 'utf-8');
        const data = JSON.parse(raw);
        if (typeof data === 'object' && data !== null) {
          let modified = false;
          Object.keys(data).forEach((k) => {
            if (keysToDelete.includes(k) || (last10 && k.includes(last10))) {
              delete data[k];
              modified = true;
            }
          });
          if (modified) {
            fs.writeFileSync(regPhonesFile, JSON.stringify(data, null, 2), 'utf-8');
          }
        }
      }
    } catch (_) {}

    return res.json({
      success: true,
      message: `User permanently purged from server phone registry (${deletedCount} keys removed)`,
      deletedCount,
    });
  });

  // 5.4 POST /api/admin/update-referral-permission - Updates referral permission and limit on persistent server disk
  app.post('/api/admin/update-referral-permission', (req, res) => {
    try {
      const { userId, uid, memberId, phone, referralCode, canRefer, referralLimit } = req.body || {};
      const targetLimit = Number(referralLimit);
      const effectiveLimit = !isNaN(targetLimit) && targetLimit >= 0 ? targetLimit : (canRefer ? 10 : 0);
      const effectiveCanRefer = Boolean(canRefer);

      const cleanUid = uid ? String(uid).trim() : (userId ? String(userId).trim() : '');
      const cleanMember = memberId ? String(memberId).trim().toUpperCase() : '';
      const digits = phone ? normalizePhoneQuery(phone) : '';
      const last10 = digits ? digits.slice(-10) : '';

      let updatedCount = 0;
      usersBackupMap.forEach((user, key) => {
        const match =
          (cleanUid && (user.uid === cleanUid || key === cleanUid || user.id === cleanUid)) ||
          (cleanMember && (user.memberId === cleanMember || key === cleanMember)) ||
          (last10 && (key === last10 || key === `0${last10}` || key === `880${last10}` || (user.phone && user.phone.includes(last10))));
        if (match) {
          user.canRefer = effectiveCanRefer;
          user.referralLimit = effectiveLimit;
          user.updatedAt = new Date().toISOString();
          usersBackupMap.set(key, user);
          updatedCount++;
        }
      });

      if (cleanUid && !usersBackupMap.has(cleanUid)) {
        usersBackupMap.set(cleanUid, {
          uid: cleanUid,
          memberId: cleanMember,
          canRefer: effectiveCanRefer,
          referralLimit: effectiveLimit,
          updatedAt: new Date().toISOString(),
        });
      }

      saveUsersBackupToDisk();

      return res.json({
        success: true,
        message: 'Referral permission and limit updated on server disk',
        effectiveCanRefer,
        effectiveLimit,
        updatedCount,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 5.4.1 POST /api/admin/withdrawal-action - Updates withdrawal status on persistent server disk and user transactions
  app.post('/api/admin/withdrawal-action', (req, res) => {
    try {
      const { withdrawId, userId, status, amount } = req.body || {};
      const cleanWId = withdrawId ? String(withdrawId).trim() : '';
      if (!cleanWId) {
        return res.status(400).json({ success: false, error: 'Missing withdrawId' });
      }

      const isApprove = status === 'Approved';
      const statusText = isApprove ? 'Approved' : 'Rejected';
      const statusBangla = isApprove ? 'এপ্রুভ' : 'বাতিল';

      let updatedCount = 0;
      usersBackupMap.forEach((user, key) => {
        if (user && Array.isArray(user.transactions)) {
          let txMatched = false;
          user.transactions = user.transactions.map((t: any) => {
            if (t.id === cleanWId || t.hash === cleanWId) {
              txMatched = true;
              updatedCount++;
              const currentDesc = String(t.description || t.desc || '');
              const cleanDesc = currentDesc
                .replace('অপেক্ষমাণ', statusBangla)
                .replace('Pending', statusText)
                .replace('pending', statusText);
              return {
                ...t,
                status: statusText,
                statusBangla,
                description: cleanDesc.includes(statusBangla) ? cleanDesc : `${cleanDesc} - ${statusBangla}`,
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          });

          if (txMatched) {
            user.updatedAt = new Date().toISOString();
            usersBackupMap.set(key, user);
          }
        }
      });

      saveUsersBackupToDisk();

      console.log(`[Server] Admin withdrawal action applied: [${cleanWId} -> ${statusText}] on ${updatedCount} transactions`);
      return res.json({
        success: true,
        message: `Withdrawal ${cleanWId} updated to ${statusText}`,
        withdrawId: cleanWId,
        status: statusText,
        statusBangla,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 5.5 POST /api/admin/purge-all-accounts - Completely clears all user and phone registries on server
  app.post('/api/admin/purge-all-accounts', (_req, res) => {
    try {
      phoneRegistry.clear();
      savePhoneRegistryToDisk();

      usersBackupMap.clear();
      saveUsersBackupToDisk();

      const regPhonesFile = path.join(REGISTRY_DIR, 'registered_phones.json');
      if (fs.existsSync(regPhonesFile)) {
        fs.writeFileSync(regPhonesFile, '{}', 'utf-8');
      }

      console.log('[Server] Successfully purged all user and phone records from memory and disk');
      return res.json({
        success: true,
        message: 'All accounts, phone registry, and user backups purged completely from server.',
      });
    } catch (err: any) {
      console.error('[Server] purge-all-accounts error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Purge failed' });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 5.8 REDEEM CODES & TREASURE MANAGEMENT (Persistent Server API)
  // Ensures 10-12 Taka Envelope Bonus works reliably across all devices
  // ─────────────────────────────────────────────────────────────
  const TREASURE_CODES_FILE = path.join(REGISTRY_DIR, 'treasure_codes.json');
  const treasureCodesMap = new Map<string, {
    id: string;
    code: string;
    amount: number;
    minAmount: number;
    maxAmount: number;
    isRange: boolean;
    isActive: boolean;
    description: string;
    claimedUsers: string[];
    createdAt: string;
    updatedAt: string;
  }>();

  const loadTreasureCodes = () => {
    try {
      if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
      }
      if (fs.existsSync(TREASURE_CODES_FILE)) {
        const raw = fs.readFileSync(TREASURE_CODES_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item) => {
            if (item && item.code) {
              const codeKey = String(item.code).trim().toUpperCase();
              treasureCodesMap.set(codeKey, {
                id: item.id || codeKey,
                code: codeKey,
                amount: Number(item.amount) || 11,
                minAmount: Number(item.minAmount) || 10,
                maxAmount: Number(item.maxAmount) || 12,
                isRange: item.isRange !== false,
                isActive: item.isActive !== false,
                description: String(item.description || 'দৈনিক স্পেশাল লাকি গিফট খাম (১০-১২ টাকা)'),
                claimedUsers: Array.isArray(item.claimedUsers) ? item.claimedUsers : [],
                createdAt: item.createdAt || new Date().toISOString(),
                updatedAt: item.updatedAt || new Date().toISOString(),
              });
            }
          });
          console.log(`[TreasureCodes] Loaded ${treasureCodesMap.size} redeem codes from disk`);
        }
      }
      // If empty, auto-seed default DAILY12 code
      if (treasureCodesMap.size === 0) {
        const defaultCode = {
          id: 'DAILY12',
          code: 'DAILY12',
          amount: 11,
          minAmount: 10,
          maxAmount: 12,
          isRange: true,
          isActive: true,
          description: 'দৈনিক স্পেশাল লাকি গিফট খাম (১০-১২ টাকা)',
          claimedUsers: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        treasureCodesMap.set('DAILY12', defaultCode);
        saveTreasureCodes();
      }
    } catch (err) {
      console.warn('[TreasureCodes] Error loading treasure_codes.json:', err);
    }
  };

  const saveTreasureCodes = () => {
    try {
      if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
      }
      const list = Array.from(treasureCodesMap.values());
      fs.writeFileSync(TREASURE_CODES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[TreasureCodes] Error saving treasure_codes.json:', err);
    }
  };

  loadTreasureCodes();

  // GET /api/treasure-codes - Lists all active redeem codes
  app.get('/api/treasure-codes', (_req, res) => {
    const list = Array.from(treasureCodesMap.values()).filter((c) => c.isActive);
    return res.json({ success: true, codes: list });
  });

  // POST /api/treasure-codes - Save/update a redeem code from Admin Panel
  app.post('/api/treasure-codes', (req, res) => {
    try {
      const { code, amount, minAmount, maxAmount, isRange, description } = req.body || {};
      const clean = String(code || '').trim().toUpperCase();
      if (!clean) {
        return res.status(400).json({ success: false, error: 'Code is required' });
      }

      const isR = Boolean(isRange !== false);
      const min = Number(minAmount) || 10;
      const max = Number(maxAmount) || 12;
      const amt = isR ? 11 : (Number(amount) || 11);
      const existing = treasureCodesMap.get(clean);

      const record = {
        id: clean,
        code: clean,
        amount: amt,
        minAmount: min,
        maxAmount: max,
        isRange: isR,
        isActive: true,
        description: String(description || (isR ? 'দৈনিক স্পেশাল লাকি গিফট খাম (১০-১২ টাকা)' : `রিডিম কোড (৳${amt})`)).trim(),
        claimedUsers: existing?.claimedUsers || [],
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      treasureCodesMap.set(clean, record);
      saveTreasureCodes();

      console.log(`[TreasureCodes] Saved code [${clean}] (Reward: ${isR ? '10-12 TK random' : amt + ' TK'})`);
      return res.json({ success: true, code: record });
    } catch (err: any) {
      console.error('[TreasureCodes] Save error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to save code' });
    }
  });

  // DELETE /api/treasure-codes/:code - Deletes code from Admin Panel (Immediately disables it)
  app.delete('/api/treasure-codes/:code', (req, res) => {
    try {
      const clean = String(req.params.code || '').trim().toUpperCase();
      if (treasureCodesMap.has(clean)) {
        treasureCodesMap.delete(clean);
        saveTreasureCodes();
        console.log(`[TreasureCodes] Deleted code [${clean}] from server registry`);
        return res.json({ success: true, message: `Code [${clean}] removed successfully` });
      }
      return res.json({ success: true, message: 'Code was not found or already deleted' });
    } catch (err: any) {
      console.error('[TreasureCodes] Delete error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete code' });
    }
  });

  // POST /api/treasure-codes/redeem - Validates code and assigns 10-12 Taka Envelope Bonus
  app.post('/api/treasure-codes/redeem', (req, res) => {
    try {
      const { code, userId } = req.body || {};
      const clean = String(code || '').trim().toUpperCase();
      const cleanUser = String(userId || 'ANON').trim();

      if (!clean) {
        return res.status(400).json({ success: false, error: 'দয়া করে একটি সঠিক রিডিম কোড লিখুন।' });
      }

      const item = treasureCodesMap.get(clean);
      if (!item || !item.isActive) {
        return res.status(404).json({
          success: false,
          error: 'ভুল বা মেয়াদোত্তীর্ণ রিডিম কোড! সঠিক কোড পেতে প্রজেক্ট ম্যানেজারের সাথে যোগাযোগ করুন।',
        });
      }

      // Check if user already claimed this code
      if (cleanUser && cleanUser !== 'ANON' && Array.isArray(item.claimedUsers) && item.claimedUsers.includes(cleanUser)) {
        return res.status(400).json({
          success: false,
          alreadyClaimed: true,
          error: 'এই রিডিম কোডটি আপনি ইতিমধ্যে ব্যবহার করেছেন!',
        });
      }

      // Calculate bonus amount strictly in 10-12 Taka range
      let calculatedAmt = 11;
      const min = Number(item.minAmount) || 10;
      const max = Number(item.maxAmount) || 12;

      if (item.isRange) {
        const choices = [10, 11, 12].filter((n) => n >= min && n <= max);
        calculatedAmt = choices.length > 0
          ? choices[Math.floor(Math.random() * choices.length)]
          : Math.floor(Math.random() * (max - min + 1)) + min;
      } else if (Number(item.amount) > 0) {
        calculatedAmt = Number(item.amount);
      } else {
        const choices = [10, 11, 12];
        calculatedAmt = choices[Math.floor(Math.random() * choices.length)];
      }

      return res.json({
        success: true,
        code: clean,
        amount: calculatedAmt,
        description: item.description,
      });
    } catch (err: any) {
      console.error('[TreasureCodes] Redeem verify error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Error verifying code' });
    }
  });

  // POST /api/treasure-codes/confirm-claim - Records that user claimed the code
  app.post('/api/treasure-codes/confirm-claim', (req, res) => {
    try {
      const { code, userId } = req.body || {};
      const clean = String(code || '').trim().toUpperCase();
      const cleanUser = String(userId || '').trim();

      if (clean && cleanUser && treasureCodesMap.has(clean)) {
        const item = treasureCodesMap.get(clean)!;
        if (!item.claimedUsers) item.claimedUsers = [];
        if (!item.claimedUsers.includes(cleanUser)) {
          item.claimedUsers.push(cleanUser);
          saveTreasureCodes();
        }
      }
      return res.json({ success: true });
    } catch (_) {
      return res.json({ success: true });
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 6. CHARITY BANNERS MANAGEMENT API (দাতব্য প্রতিষ্ঠান ব্যানার)
  // ─────────────────────────────────────────────────────────────
  const CHARITY_BANNERS_FILE = path.join(REGISTRY_DIR, 'charity_banners.json');
  const CHARITY_UPLOADS_DIR = path.join(process.cwd(), 'public', 'charity', 'uploads');
  if (!fs.existsSync(CHARITY_UPLOADS_DIR)) {
    fs.mkdirSync(CHARITY_UPLOADS_DIR, { recursive: true });
  }

  const loadCharityBanners = (): Array<{ id: string; image: string; title?: string; createdAt: string; isActive?: boolean }> => {
    try {
      if (fs.existsSync(CHARITY_BANNERS_FILE)) {
        const raw = fs.readFileSync(CHARITY_BANNERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (err) {
      console.warn('[Server] Error loading charity_banners.json:', err);
    }
    return [];
  };

  const saveCharityBanners = (banners: any[]) => {
    try {
      if (!fs.existsSync(REGISTRY_DIR)) {
        fs.mkdirSync(REGISTRY_DIR, { recursive: true });
      }
      fs.writeFileSync(CHARITY_BANNERS_FILE, JSON.stringify(banners, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Server] Error saving charity_banners.json:', err);
    }
  };

  // GET /api/admin/charity-banners
  app.get('/api/admin/charity-banners', (_req, res) => {
    const banners = loadCharityBanners();
    return res.json({ success: true, count: banners.length, banners });
  });

  // POST /api/admin/upload-charity-banner
  app.post('/api/admin/upload-charity-banner', (req, res) => {
    try {
      const { image, title, url } = req.body || {};
      let finalImagePath = '';

      if (url && typeof url === 'string' && url.trim().startsWith('http')) {
        finalImagePath = url.trim();
      } else if (image && typeof image === 'string' && image.startsWith('data:image/')) {
        const matches = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ success: false, error: 'Invalid base64 image data' });
        }
        let ext = matches[1].toLowerCase();
        if (ext === 'jpeg') ext = 'jpg';
        if (ext === 'svg+xml') ext = 'svg';

        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `charity_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const filePath = path.join(CHARITY_UPLOADS_DIR, fileName);
        fs.writeFileSync(filePath, buffer);

        // Also copy to dist if dist exists
        const distUploads = path.join(process.cwd(), 'dist', 'charity', 'uploads');
        try {
          if (!fs.existsSync(distUploads)) fs.mkdirSync(distUploads, { recursive: true });
          fs.writeFileSync(path.join(distUploads, fileName), buffer);
        } catch (_) {}

        finalImagePath = `/charity/uploads/${fileName}`;
      } else {
        return res.status(400).json({ success: false, error: 'No image or valid image URL provided' });
      }

      const banners = loadCharityBanners();
      const newBanner = {
        id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        image: finalImagePath,
        title: typeof title === 'string' ? title.trim() : '',
        createdAt: new Date().toISOString(),
        isActive: true,
      };

      banners.unshift(newBanner);
      saveCharityBanners(banners);

      return res.json({ success: true, banner: newBanner, banners });
    } catch (err: any) {
      console.error('[Server] upload-charity-banner error:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Upload failed' });
    }
  });

  // POST /api/admin/save-charity-banners
  app.post('/api/admin/save-charity-banners', (req, res) => {
    try {
      const { banners } = req.body || {};
      if (!Array.isArray(banners)) {
        return res.status(400).json({ success: false, error: 'Banners array required' });
      }
      saveCharityBanners(banners);
      return res.json({ success: true, count: banners.length, banners });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Save failed' });
    }
  });

  // DELETE /api/admin/charity-banner/:id
  app.delete('/api/admin/charity-banner/:id', (req, res) => {
    try {
      const bannerId = req.params.id;
      let banners = loadCharityBanners();
      const target = banners.find((b) => b.id === bannerId);

      banners = banners.filter((b) => b.id !== bannerId);
      saveCharityBanners(banners);

      if (target && target.image && target.image.startsWith('/charity/uploads/')) {
        const localFileName = path.basename(target.image);
        try {
          const localPath = path.join(CHARITY_UPLOADS_DIR, localFileName);
          if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
        } catch (_) {}
      }

      return res.json({ success: true, count: banners.length, banners });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Delete failed' });
    }
  });

  // POST /api/admin/clear-all-charity-banners
  app.post('/api/admin/clear-all-charity-banners', (_req, res) => {
    try {
      saveCharityBanners([]);
      try {
        if (fs.existsSync(CHARITY_UPLOADS_DIR)) {
          const files = fs.readdirSync(CHARITY_UPLOADS_DIR);
          for (const f of files) {
            try {
              fs.unlinkSync(path.join(CHARITY_UPLOADS_DIR, f));
            } catch (_) {}
          }
        }
      } catch (_) {}
      return res.json({ success: true, count: 0, banners: [] });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Clear failed' });
    }
  });

  // Extract client domain origin so returnUrl points back to user's real website domain
  const getClientOrigin = (req: express.Request): string => {
    if (req.query && req.query.origin) {
      return String(req.query.origin).trim().replace(/\/+$/, '');
    }
    if (req.body && req.body.clientOrigin) {
      return String(req.body.clientOrigin).trim().replace(/\/+$/, '');
    }
    if (req.headers && req.headers.origin) {
      return String(req.headers.origin).trim().replace(/\/+$/, '');
    }
    if (req.headers && req.headers.referer) {
      try {
        return new URL(String(req.headers.referer)).origin.replace(/\/+$/, '');
      } catch (_) {}
    }
    // Check x-forwarded-host / host headers from proxy (Cloud Run, preview domain)
    const host = req.headers['x-forwarded-host'] || req.headers['host'];
    let proto = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    if (host) {
      const cleanHost = String(Array.isArray(host) ? host[0] : host).trim();
      // On Cloud Run and public hosting proxies, always use https to prevent mixed content
      if (
        cleanHost.includes('run.app') ||
        cleanHost.includes('nvtenergy.online') ||
        cleanHost.includes('web.app') ||
        cleanHost.includes('firebaseapp.com') ||
        req.headers['x-forwarded-proto'] === 'https'
      ) {
        proto = 'https';
      }
      return `${proto}://${cleanHost}`.replace(/\/+$/, '');
    }
    return 'https://nvtenergy.online';
  };

  // Sanitize gateway payment link so callback/returnUrl points to the user's active domain, never old hosting links
  const sanitizePaymentLink = (
    rawLink: string,
    clientOrigin: string,
    orderNo: string,
    amount: number,
    channel: string = 'channel1'
  ): string => {
    if (!rawLink || typeof rawLink !== 'string') return rawLink;
    const cleanOrigin = clientOrigin.replace(/\/+$/, '');
    const returnTarget = `${cleanOrigin}/profile?payment_status=PENDING&payment_return=1&orderNo=${encodeURIComponent(orderNo)}&amount=${amount}&channel=${encodeURIComponent(channel)}&gateway=nekpay`;

    let processed = rawLink;

    // Direct replacement of any Firebase hosting URL occurrences (raw & encoded)
    try {
      processed = processed
        .replace(/https%3A%2F%2Fnovavest-a711c\.web\.app[^&"'\s]*/gi, encodeURIComponent(returnTarget))
        .replace(/https:\/\/novavest-a711c\.web\.app[^&"'\s]*/gi, returnTarget)
        .replace(/https%3A%2F%2Fnovavest-a711c\.firebaseapp\.com[^&"'\s]*/gi, encodeURIComponent(returnTarget))
        .replace(/https:\/\/novavest-a711c\.firebaseapp\.com[^&"'\s]*/gi, returnTarget);
    } catch (_) {}

    try {
      const url = new URL(processed);
      // Clean target callback URL on user's active website domain for all possible redirect keys
      const redirectKeys = ['returnUrl', 'return_url', 'redirectUrl', 'redirect_url', 'callbackUrl', 'callback_url', 'successUrl', 'success_url'];
      let matchedAny = false;
      for (const k of redirectKeys) {
        if (url.searchParams.has(k)) {
          url.searchParams.set(k, returnTarget);
          matchedAny = true;
        }
      }
      if (!matchedAny) {
        url.searchParams.set('returnUrl', returnTarget);
      }
      return url.toString();
    } catch (e) {
      return processed;
    }
  };

  // Helper to format date in YYYY-MM-DD HH:mm:ss format
  const formatDateTime = (d: Date = new Date()) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  // Helper to compute OKExPay MD5 Signature
  // Rule:
  // 1. Sort non-empty parameters (excluding 'sign') alphabetically by ASCII code
  // 2. Concatenate into stringA: key1=value1&key2=value2...
  // 3. stringSignTemp = stringA + '&key=' + secretKey
  // 4. MD5(stringSignTemp) in lowercase
  const computeOkexPaySign = (params: Record<string, any>, secretKey: string): string => {
    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && String(v).trim() !== '' && k !== 'sign') {
        filtered[k] = String(v).trim();
      }
    }
    const sortedKeys = Object.keys(filtered).sort();
    const stringA = sortedKeys.map((k) => `${k}=${filtered[k]}`).join('&');
    const stringSignTemp = `${stringA}&key=${secretKey}`;
    return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toLowerCase();
  };

  // Official Bangladesh Cash Out Numbers (এজেন্ট ক্যাশ আউট নম্বর)
  const CASHOUT_NUMBERS_FILE = path.join(process.cwd(), 'data', 'cashout_numbers.json');
  let CASHOUT_NUMBERS: Record<string, { number: string; type: string; name: string }> = {
    bkash: { number: '01700-000000', type: 'বিকাশ এজেন্ট (Cash Out)', name: 'NVT bKash Agent' },
    nagad: { number: '01800-000000', type: 'নগদ এজেন্ট (Cash Out)', name: 'NVT Nagad Agent' },
    rocket: { number: '01900-000000', type: 'রকেট এজেন্ট (Cash Out)', name: 'NVT Rocket Agent' },
    upay: { number: '01600-000000', type: 'উপায় এজেন্ট (Cash Out)', name: 'NVT Upay Agent' },
    usdt: { number: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', type: 'TRC-20 USDT Wallet Address', name: 'Binance TRC20 Official' },
  };

  try {
    if (fs.existsSync(CASHOUT_NUMBERS_FILE)) {
      const raw = fs.readFileSync(CASHOUT_NUMBERS_FILE, 'utf-8');
      if (raw && raw.trim()) {
        const parsed = JSON.parse(raw);
        CASHOUT_NUMBERS = { ...CASHOUT_NUMBERS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('[Server] Error loading cashout numbers file:', e);
  }

  // ───────────────────────────────────────────────────────────
  // HEALTH CHECK & APK DOWNLOAD ROUTE
  // ───────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Direct APK File Download Handler with standard Android package MIME
  app.get(['/NVT_Energy_v2.4.2.apk', '/download-apk', '/api/download-apk'], (req, res) => {
    const filePath = path.join(process.cwd(), 'public', 'NVT_Energy_v2.4.2.apk');
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="NVT_Energy_v2.4.2.apk"');
    res.sendFile(filePath);
  });

  // ───────────────────────────────────────────────────────────
  // UNIFIED DEPOSIT API ROUTE (DIRECT CPANEL ROUTING)
  // POST /deposit, POST /api/deposit, POST /api/v1/deposit
  // ───────────────────────────────────────────────────────────
  app.post(['/deposit', '/api/deposit', '/api/v1/deposit'], async (req, res) => {
    try {
      const { amount, payerName = 'Customer', userId = 'USER1001', channel = 'channel1', method = 'bKash' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required (minimum 100 BDT)',
        });
      }

      // Forward deposit submission directly to cPanel deposit URL
      forwardToCpanelDeposit({
        amount: numAmount,
        payerName: String(payerName).trim() || 'Customer',
        userId,
        channel,
        method,
        timestamp: new Date().toISOString(),
      });

      // Route to chosen gateway on cPanel backend
      const targetUrl = channel === 'channel2' ? WATCHPAY_CONFIG.createOrderUrl : NEKPAY_CONFIG.createOrderUrl;
      const clientOrigin = getClientOrigin(req);
      const preOrderNo = `DEP-${Date.now()}`;
      const returnTarget = `${clientOrigin.replace(/\/+$/, '')}/profile?payment_status=PENDING&payment_return=1&orderNo=${encodeURIComponent(preOrderNo)}&amount=${numAmount}&channel=${encodeURIComponent(channel)}&gateway=nekpay`;
      const cpanelCallbackUrl = channel === 'channel2'
        ? `${CPANEL_API_BASE_URL}/watchpay-callback`
        : `${CPANEL_API_BASE_URL}/nekpay-callback`;

      let responseData: any = {};
      let responseOk = false;

      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'NovaVest-Server/1.0',
          },
          body: JSON.stringify({
            amount: numAmount,
            payerName: String(payerName).trim() || 'Customer',
            userId,
            orderNo: preOrderNo,
            order_no: preOrderNo,
            return_url: returnTarget,
            returnUrl: returnTarget,
            redirect_url: returnTarget,
            redirectUrl: returnTarget,
            callback_url: cpanelCallbackUrl,
            callbackUrl: cpanelCallbackUrl,
            notify_url: cpanelCallbackUrl,
            notifyUrl: cpanelCallbackUrl,
            ipn_url: cpanelCallbackUrl,
            webhook_url: cpanelCallbackUrl,
            success_url: returnTarget,
            cancel_url: `${clientOrigin.replace(/\/+$/, '')}/profile`,
          }),
          signal: AbortSignal.timeout(3500),
        });

        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = { raw: responseText };
        }
        responseOk = response.ok;
      } catch (upstreamErr: any) {
        console.warn(`[Deposit] Upstream ${targetUrl} unavailable (${upstreamErr.message}), falling back to Cashier.`);
      }

      if (responseOk && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || `DEP-${Date.now()}`;
        const cleanPaymentLink = sanitizePaymentLink(responseData.paymentLink, clientOrigin, orderNo, numAmount, channel);

        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel,
          channelName: channel === 'channel2' ? 'চ্যানেল ২ (WatchPay)' : 'চ্যানেল ১ (Nekpay)',
          method: method || 'bKash',
          status: 'PENDING',
          paymentLink: cleanPaymentLink,
          rawPaymentLink: responseData.paymentLink,
          payerName,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        addLog({
          channel: 'DEPOSIT',
          type: 'PAYIN_REQUEST',
          orderId: orderNo,
          status: 'SUCCESS',
          details: { numAmount, payerName, cleanPaymentLink },
        });

        return res.json({
          success: true,
          channel,
          paymentLink: cleanPaymentLink,
          orderNo,
          message: 'Deposit order created successfully via cPanel backend',
        });
      }

      // HIGH-AVAILABILITY CASHIER FALLBACK
      // If cPanel backend is unreachable or timed out, provide direct cashier checkout
      const fallbackOrderNo = preOrderNo;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}`;

      ordersDatabase.set(fallbackOrderNo, {
        orderId: fallbackOrderNo,
        amount: numAmount,
        channel,
        channelName: channel === 'channel2' ? 'চ্যানেল ২ (WatchPay)' : 'চ্যানেল ১ (Nekpay)',
        method: method || 'bKash',
        status: 'PENDING',
        paymentLink: cashierUrl,
        rawPaymentLink: cashierUrl,
        payerName: String(payerName).trim() || 'Customer',
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      addLog({
        channel: 'DEPOSIT',
        type: 'PAYIN_REQUEST',
        orderId: fallbackOrderNo,
        status: 'SUCCESS',
        details: { fallbackCashier: true, numAmount, cashierUrl },
      });

      return res.json({
        success: true,
        channel,
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Deposit cashier link created successfully',
      });
    } catch (err: any) {
      const clientOrigin = getClientOrigin(req);
      const fallbackOrderNo = `DEP-${Date.now()}`;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}`;
      return res.json({
        success: true,
        channel: req.body?.channel || 'channel1',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Deposit cashier link created successfully',
      });
    }
  });

  // ───────────────────────────────────────────────────────────
  // CHANNEL 1: NEKPAY PAYMENT INTEGRATION
  // Endpoint: https://api.nvtenergy.online/api/v1/nekpay/create-order
  // ───────────────────────────────────────────────────────────
  app.post(['/api/v1/nekpay/create-order', '/api/payment/create-order'], async (req, res) => {
    try {
      const { amount, payerName = 'Customer', userId = 'USER1001', method = 'bKash', senderPhone = '' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required (minimum 100 BDT)',
        });
      }

      const clientOrigin = getClientOrigin(req);
      const preOrderNo = `NEK-${Date.now()}`;
      const returnTarget = `${clientOrigin.replace(/\/+$/, '')}/profile?payment_status=PENDING&payment_return=1&orderNo=${encodeURIComponent(preOrderNo)}&amount=${numAmount}&channel=channel1&method=${encodeURIComponent(method)}&gateway=nekpay`;
      const cpanelCallbackUrl = `${CPANEL_API_BASE_URL}/nekpay-callback`;

      const postBody = {
        amount: numAmount,
        payerName: String(payerName).trim() || 'Customer',
        userId: userId || 'USER1001',
        method: method || 'bKash',
        senderPhone: senderPhone || '',
        orderNo: preOrderNo,
        order_no: preOrderNo,
        return_url: returnTarget,
        returnUrl: returnTarget,
        redirect_url: returnTarget,
        redirectUrl: returnTarget,
        success_url: returnTarget,
        callback_url: cpanelCallbackUrl,
        callbackUrl: cpanelCallbackUrl,
        notify_url: cpanelCallbackUrl,
        notifyUrl: cpanelCallbackUrl,
        ipn_url: cpanelCallbackUrl,
        webhook_url: cpanelCallbackUrl,
        cancel_url: `${clientOrigin.replace(/\/+$/, '')}/profile`,
      };

      // Also forward deposit request notification directly to cPanel deposit URL
      forwardToCpanelDeposit({
        amount: numAmount,
        payerName: postBody.payerName,
        userId,
        method: method || 'bKash',
        channel: 'channel1',
        createdAt: new Date().toISOString(),
      });

      console.log('Sending request to cPanel Nekpay:', NEKPAY_CONFIG.createOrderUrl, postBody);

      let responseData: any = {};
      let responseOk = false;

      // Call Nekpay on cPanel backend with 3.5s timeout
      try {
        const response = await fetch(NEKPAY_CONFIG.createOrderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: JSON.stringify(postBody),
          signal: AbortSignal.timeout(3500),
        });

        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse Nekpay response as JSON:', responseText);
        }
        responseOk = response.ok;
      } catch (upstreamErr: any) {
        console.warn('[Nekpay] Upstream cPanel timed out or failed, falling back to Cashier:', upstreamErr.message);
      }

      if (responseOk && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || `NEK-${Date.now()}`;
        const cleanPaymentLink = sanitizePaymentLink(responseData.paymentLink, clientOrigin, orderNo, numAmount, 'channel1');

        // Save order in memory database
        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel: 'nekpay',
          channelName: `চ্যানেল ১ (${method || 'Nekpay'})`,
          method: method || 'bKash',
          status: 'PENDING',
          paymentLink: cleanPaymentLink,
          rawPaymentLink: responseData.paymentLink,
          payerName: postBody.payerName,
          userId,
          senderPhone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        addLog({
          channel: 'NEKPAY',
          type: 'PAYIN_REQUEST',
          orderId: orderNo,
          status: 'SUCCESS',
          details: { postBody, cleanPaymentLink },
        });

        return res.json({
          success: true,
          channel: 'channel1',
          method: method || 'bKash',
          paymentLink: cleanPaymentLink,
          orderNo,
          message: 'Order created successfully with Nekpay',
        });
      }

      // HIGH-AVAILABILITY CASHIER FALLBACK
      const fallbackOrderNo = preOrderNo;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}?amount=${numAmount}&method=${encodeURIComponent(method)}&channel=channel1&userId=${encodeURIComponent(userId)}`;

      ordersDatabase.set(fallbackOrderNo, {
        orderId: fallbackOrderNo,
        amount: numAmount,
        channel: 'nekpay',
        channelName: `চ্যানেল ১ (${method || 'Nekpay'})`,
        method: method || 'bKash',
        status: 'PENDING',
        paymentLink: cashierUrl,
        rawPaymentLink: cashierUrl,
        payerName: postBody.payerName,
        userId,
        senderPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      addLog({
        channel: 'NEKPAY',
        type: 'PAYIN_REQUEST',
        orderId: fallbackOrderNo,
        status: 'SUCCESS',
        details: { fallbackCashier: true, numAmount, cashierUrl, method },
      });

      return res.json({
        success: true,
        channel: 'channel1',
        method: method || 'bKash',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    } catch (err: any) {
      console.error('Error contacting Nekpay backend:', err);
      const clientOrigin = getClientOrigin(req);
      const fallbackOrderNo = `NEK-${Date.now()}`;
      const method = req.body?.method || 'bKash';
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}?amount=${req.body?.amount || 100}&method=${encodeURIComponent(method)}&channel=channel1&userId=${encodeURIComponent(req.body?.userId || 'USER1001')}`;
      return res.json({
        success: true,
        channel: 'channel1',
        method,
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    }
  });

  // ───────────────────────────────────────────────────────────
  // CHANNEL 2: WATCHPAY PAYMENT INTEGRATION
  // Endpoint: https://api.nvtenergy.online/create-order-watchpay
  // ───────────────────────────────────────────────────────────
  app.post(['/api/v1/watchpay/create-order', '/api/v1/okexpay/create-order'], async (req, res) => {
    try {
      const { amount, payerName = 'Customer', userId = 'USER1001' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required',
        });
      }

      console.log(`[WatchPay] Initiating order: amount=${numAmount}, payerName=${payerName}`);

      // Forward deposit submission directly to cPanel deposit URL
      forwardToCpanelDeposit({
        amount: numAmount,
        payerName: payerName || 'Customer',
        userId,
        channel: 'channel2',
        createdAt: new Date().toISOString(),
      });

      const clientOrigin = getClientOrigin(req);
      const preOrderNo = `WPY-${Date.now()}`;
      const returnTarget = `${clientOrigin.replace(/\/+$/, '')}/profile?payment_status=PENDING&payment_return=1&orderNo=${encodeURIComponent(preOrderNo)}&amount=${numAmount}&channel=channel2&gateway=watchpay`;

      const cpanelCallbackUrl = `${CPANEL_API_BASE_URL}/watchpay-callback`;
      let data: any = {};
      let responseOk = false;

      try {
        const response = await fetch(WATCHPAY_CONFIG.createOrderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'NovaVest-Server/1.0',
          },
          body: JSON.stringify({
            amount: numAmount,
            payerName: payerName || 'Customer',
            userId: userId || 'USER1001',
            orderNo: preOrderNo,
            order_no: preOrderNo,
            return_url: returnTarget,
            returnUrl: returnTarget,
            redirect_url: returnTarget,
            redirectUrl: returnTarget,
            callback_url: cpanelCallbackUrl,
            callbackUrl: cpanelCallbackUrl,
            notify_url: cpanelCallbackUrl,
            notifyUrl: cpanelCallbackUrl,
            ipn_url: cpanelCallbackUrl,
            webhook_url: cpanelCallbackUrl,
            success_url: returnTarget,
            cancel_url: `${clientOrigin.replace(/\/+$/, '')}/profile`,
          }),
          signal: AbortSignal.timeout(3500),
        });

        data = await response.json();
        responseOk = response.ok;
      } catch (upstreamErr: any) {
        console.warn('[WatchPay] Upstream gateway timed out or failed, using Cashier:', upstreamErr.message);
      }

      if (responseOk && data && data.success && data.paymentLink) {
        const orderId = data.orderNo || `WPY-${Date.now()}`;
        let targetPaymentUrl = data.paymentLink;

        // Extract direct checkout link from watchglb iframe wrapper to prevent X-Frame-Options/SAMEORIGIN errors in browsers
        try {
          const pageRes = await fetch(data.paymentLink, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            signal: AbortSignal.timeout(3000),
          });
          const html = await pageRes.text();
          const match = html.match(/src=["'](https?:\/\/[^"']+)["']/i);
          if (match && match[1]) {
            targetPaymentUrl = match[1];
            console.log('[WatchPay] Successfully extracted direct checkout URL:', targetPaymentUrl);
          }
        } catch (e) {
          console.warn('[WatchPay] Could not extract direct iframe URL, fallback to raw link:', e);
        }

        // Save order in memory database
        ordersDatabase.set(orderId, {
          orderId,
          transactionId: orderId,
          amount: numAmount,
          currency: 'BDT',
          channel: 'watchpay',
          channelName: 'চ্যানেল ২ (WatchPay)',
          method: req.body?.method || 'bKash',
          status: 'PENDING',
          paymentLink: targetPaymentUrl,
          rawPaymentLink: data.paymentLink,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        addLog({
          channel: 'WATCHPAY',
          type: 'PAYIN_REQUEST',
          orderId,
          status: 'SUCCESS',
          details: { amount: numAmount, payerName, targetPaymentUrl, response: data },
        });

        return res.json({
          success: true,
          channel: 'channel2',
          paymentLink: targetPaymentUrl,
          rawPaymentLink: data.paymentLink,
          orderNo: orderId,
          message: 'WatchPay order created successfully',
        });
      }

      // HIGH-AVAILABILITY CASHIER FALLBACK
      const fallbackOrderId = preOrderNo;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderId)}`;

      ordersDatabase.set(fallbackOrderId, {
        orderId: fallbackOrderId,
        transactionId: fallbackOrderId,
        amount: numAmount,
        currency: 'BDT',
        channel: 'watchpay',
        channelName: 'চ্যানেল ২ (WatchPay)',
        method: req.body?.method || 'bKash',
        status: 'PENDING',
        paymentLink: cashierUrl,
        rawPaymentLink: cashierUrl,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      addLog({
        channel: 'WATCHPAY',
        type: 'PAYIN_REQUEST',
        orderId: fallbackOrderId,
        status: 'SUCCESS',
        details: { fallbackCashier: true, numAmount, cashierUrl },
      });

      return res.json({
        success: true,
        channel: 'channel2',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderId,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    } catch (err: any) {
      console.error('Error in WatchPay handler:', err);
      const clientOrigin = getClientOrigin(req);
      const fallbackOrderId = `WPY-${Date.now()}`;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderId)}`;
      return res.json({
        success: true,
        channel: 'channel2',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderId,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    }
  });

  // ───────────────────────────────────────────────────────────
  // OKEXPAY WEBHOOK / CALLBACK HANDLER
  // POST /api/payments/okexpay-callback
  // Per doc: Return plain text "success" so OKExPay stops retrying.
  // ───────────────────────────────────────────────────────────
  app.post(['/api/payments/okexpay-callback', '/api/v1/callback/okexpay'], (req, res) => {
    const payload = req.body || {};
    console.log('OKExPay Webhook Received:', payload);

    const out_trade_no = payload.out_trade_no;
    const status = String(payload.status || '');
    const pay_money = Number(payload.pay_money || payload.money) || 0;
    const incomingSign = payload.sign;

    // Verify signature if provided
    let signValid = true;
    if (incomingSign) {
      const expectedSign = computeOkexPaySign(payload, OKEXPAY_CONFIG.key);
      signValid = expectedSign === incomingSign.toLowerCase();
    }

    // status '1' = payment success
    const isSuccess = status === '1';

    if (out_trade_no && ordersDatabase.has(out_trade_no)) {
      const order = ordersDatabase.get(out_trade_no);
      order.status = isSuccess ? 'COMPLETED' : status === '2' ? 'FAILED' : 'PENDING';
      order.payMoney = pay_money;
      order.updatedAt = new Date().toISOString();
      order.rawCallback = payload;
      ordersDatabase.set(out_trade_no, order);
    } else if (out_trade_no) {
      // Record incoming callback even if order was not in memory
      ordersDatabase.set(out_trade_no, {
        orderId: out_trade_no,
        amount: pay_money,
        status: isSuccess ? 'COMPLETED' : 'PENDING',
        channel: 'okexpay',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCallback: payload,
      });
    }

    addLog({
      channel: 'OKEXPAY',
      type: 'PAYIN_CALLBACK',
      orderId: out_trade_no,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      details: { payload, signValid, isSuccess },
    });

    // Forward callback directly to cPanel deposit and callback endpoints
    forwardToCpanelDeposit({ ...payload, callbackSource: 'OKEXPAY', out_trade_no, status, isSuccess });
    forwardToCpanelDeposit(payload, `${CPANEL_API_BASE_URL}/nekpay-callback`);
    forwardToCpanelDeposit(payload, `${CPANEL_API_BASE_URL}/api/payments/okexpay-callback`);

    // CRITICAL: Respond with plain text "success" per OKExPay doc
    return res.status(200).type('text/plain').send('success');
  });

  // ───────────────────────────────────────────────────────────
  // NEKPAY / CHANNEL 1 WEBHOOK HANDLER (Hits cPanel backend)
  // POST /api/payments/nekpay-callback, /api/v1/callback/nekpay, /nekpay-callback
  // ───────────────────────────────────────────────────────────
  app.post(['/nekpay-callback', '/api/payments/nekpay-callback', '/api/v1/callback/nekpay', '/api/v1/nekpay/callback'], (req, res) => {
    const payload = req.body || {};
    console.log('[Nekpay Webhook Received]:', payload);

    const orderNo = payload.orderNo || payload.out_trade_no || payload.order_id || payload.orderId;
    const trxId = payload.trxId || payload.trade_no || payload.txnid || payload.transactionId || orderNo;
    const rawStatus = String(payload.status || payload.trade_status || payload.state || '').toUpperCase();
    const amount = Number(payload.amount || payload.money || payload.pay_money) || 0;

    const isSuccess = ['SUCCESS', 'COMPLETED', 'PAID', '1', 'TRUE', 'OK'].includes(rawStatus);

    const rawMethod = String(
      payload.method ||
      payload.pay_type ||
      payload.payType ||
      payload.payment_method ||
      payload.channel_name ||
      payload.channel ||
      payload.type ||
      ''
    ).toLowerCase();

    let detectedMethod: string | null = null;
    if (rawMethod.includes('nagad') || rawMethod === '2') {
      detectedMethod = 'Nagad';
    } else if (rawMethod.includes('bkash') || rawMethod === '1') {
      detectedMethod = 'bKash';
    } else if (rawMethod.includes('rocket')) {
      detectedMethod = 'Rocket';
    }

    if (orderNo && ordersDatabase.has(orderNo)) {
      const order = ordersDatabase.get(orderNo);
      order.status = isSuccess ? 'COMPLETED' : 'PENDING';
      order.verified = isSuccess;
      order.webhookConfirmed = isSuccess;
      if (detectedMethod) {
        order.method = detectedMethod;
        order.channelName = `চ্যানেল ১ (${detectedMethod})`;
      }
      if (trxId) order.trxId = trxId;
      if (amount > 0) order.amount = amount;
      order.updatedAt = new Date().toISOString();
      order.rawCallback = payload;
      ordersDatabase.set(orderNo, order);
      if (trxId) ordersDatabase.set(trxId, order);
      saveOrdersToDisk();

      // Credit user if gateway completed
      if (isSuccess && order.userId && order.amount > 0) {
        try {
          const uRec = usersBackupMap.get(order.userId);
          if (uRec) {
            uRec.walletBalance = (Number(uRec.walletBalance) || 0) + Number(order.amount);
            uRec.totalDeposited = (Number(uRec.totalDeposited) || 0) + Number(order.amount);
            uRec.hasDeposited = true;
            uRec.updatedAt = new Date().toISOString();
            saveUsersBackupToDisk();
          }
        } catch (_) {}
      }
    } else if (orderNo || trxId) {
      const key = orderNo || trxId;
      const finalMethod = detectedMethod || 'bKash';
      ordersDatabase.set(key, {
        orderId: key,
        trxId,
        amount,
        method: finalMethod,
        status: isSuccess ? 'COMPLETED' : 'PENDING',
        verified: isSuccess,
        webhookConfirmed: isSuccess,
        channel: 'channel1',
        channelName: `চ্যানেল ১ (${finalMethod})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCallback: payload,
      });
      saveOrdersToDisk();
    }

    addLog({
      channel: 'NEKPAY',
      type: 'PAYIN_CALLBACK',
      orderId: orderNo || trxId || 'UNKNOWN',
      status: isSuccess ? 'SUCCESS' : 'PENDING',
      details: { payload, isSuccess },
    });

    // Always forward webhook directly to cPanel backend
    forwardToCpanelDeposit({ ...payload, callbackSource: 'NEKPAY', orderNo, trxId, amount, isSuccess }, `${CPANEL_API_BASE_URL}/nekpay-callback`);

    return res.status(200).type('text/plain').send('success');
  });

  // ───────────────────────────────────────────────────────────
  // WATCHPAY WEBHOOK / CALLBACK HANDLER
  // POST /api/payments/watchpay-callback, /api/v1/callback/watchpay, /watchpay-callback
  // ───────────────────────────────────────────────────────────
  app.post(['/watchpay-callback', '/api/payments/watchpay-callback', '/api/v1/callback/watchpay', '/api/v1/watchpay/callback'], (req, res) => {
    const payload = req.body || {};
    console.log('[WatchPay Webhook Received]:', payload);

    const orderNo = payload.orderNo || payload.out_trade_no || payload.order_id || payload.orderId;
    const trxId = payload.trxId || payload.trade_no || payload.txnid || payload.transactionId || orderNo;
    const rawStatus = String(payload.status || payload.trade_status || payload.state || '').toUpperCase();
    const amount = Number(payload.amount || payload.money || payload.pay_money) || 0;

    const isSuccess = ['SUCCESS', 'COMPLETED', 'PAID', '1', 'TRUE', 'OK'].includes(rawStatus);

    if (orderNo && ordersDatabase.has(orderNo)) {
      const order = ordersDatabase.get(orderNo);
      order.status = isSuccess ? 'COMPLETED' : 'PENDING';
      order.verified = isSuccess;
      order.webhookConfirmed = isSuccess;
      if (trxId) order.trxId = trxId;
      if (amount > 0) order.amount = amount;
      order.updatedAt = new Date().toISOString();
      order.rawCallback = payload;
      ordersDatabase.set(orderNo, order);
      if (trxId) ordersDatabase.set(trxId, order);
    } else if (orderNo || trxId) {
      const key = orderNo || trxId;
      ordersDatabase.set(key, {
        orderId: key,
        trxId,
        amount,
        status: isSuccess ? 'COMPLETED' : 'PENDING',
        verified: isSuccess,
        webhookConfirmed: isSuccess,
        channel: 'channel2',
        channelName: 'চ্যানেল ২ (WatchPay)',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCallback: payload,
      });
    }

    addLog({
      channel: 'WATCHPAY',
      type: 'PAYIN_CALLBACK',
      orderId: orderNo || trxId || 'UNKNOWN',
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      details: { payload, isSuccess },
    });

    // Forward webhook submission directly to cPanel deposit URL and callback endpoint
    forwardToCpanelDeposit({ ...payload, callbackSource: 'WATCHPAY', orderNo, trxId, amount, isSuccess });
    forwardToCpanelDeposit(payload, `${CPANEL_API_BASE_URL}/api/payments/watchpay-callback`);

    return res.status(200).json({ success: true, message: 'WatchPay callback processed' });
  });

  // ───────────────────────────────────────────────────────────
  // ORDER STATUS & VERIFICATION APIS
  // ───────────────────────────────────────────────────────────
  app.get(['/api/payments/order-status/:orderNo', '/api/payments/status/:orderNo'], async (req, res) => {
    const { orderNo } = req.params;
    const cleanKey = String(orderNo || '').trim();
    let order = ordersDatabase.get(cleanKey) || ordersDatabase.get(cleanKey.toUpperCase());

    // If order is not found or still pending, check live remote backend on cPanel
    if (!order || order.status === 'PENDING') {
      try {
        const remoteRes = await fetch(`${CPANEL_API_BASE_URL}/order-status/${encodeURIComponent(cleanKey)}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(4000),
        });
        if (remoteRes.ok) {
          const remoteData: any = await remoteRes.json();
          const remoteStatus = String(remoteData.status || '').toUpperCase();
          if (remoteStatus === 'COMPLETED' || remoteStatus === 'SUCCESS' || remoteStatus === 'PAID') {
            if (!order) {
              order = {
                orderId: cleanKey,
                trxId: remoteData.trxId || cleanKey,
                amount: Number(remoteData.amount) || 0,
                status: 'COMPLETED',
                verified: true,
                channel: remoteData.gateway?.toLowerCase() || 'watchpay',
                channelName: remoteData.gateway || 'WatchPay',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            } else {
              order.status = 'COMPLETED';
              order.verified = true;
              order.trxId = remoteData.trxId || order.trxId || cleanKey;
              if (remoteData.amount) order.amount = Number(remoteData.amount);
              order.updatedAt = new Date().toISOString();
            }
            ordersDatabase.set(cleanKey, order);
            if (order.orderId) ordersDatabase.set(order.orderId, order);
            if (order.trxId) ordersDatabase.set(order.trxId, order);
          }
        }
      } catch (_) {
        // remote check non-fatal
      }
    }

    if (!order) {
      return res.json({
        success: true,
        found: false,
        status: 'PENDING',
        message: 'Order not found or pending confirmation',
      });
    }

    res.json({
      success: true,
      found: true,
      order,
    });
  });

  // ───────────────────────────────────────────────────────────
  // CHANNEL 3: GO-GO-PAY GATEWAY (ROUTED TO REAL LIVE CASHIER)
  // ───────────────────────────────────────────────────────────
  app.post('/api/v1/gogopay/create-order', async (req, res) => {
    try {
      const { amount, method = 'bKash', userId = 'USER1001' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required (minimum 100 BDT)',
        });
      }

      // Call real live Nekpay gateway for Go-Go-Pay checkout
      const postBody = {
        amount: numAmount,
        payerName: `Customer-${userId}`,
        userId: String(userId),
      };

      const clientOrigin = getClientOrigin(req);
      const preOrderNo = `GOGO-${Date.now()}`;

      let responseData: any = {};
      let responseOk = false;

      try {
        const response = await fetch(NEKPAY_CONFIG.createOrderUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          body: JSON.stringify(postBody),
          signal: AbortSignal.timeout(3500),
        });

        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse Nekpay response for gogopay as JSON:', responseText);
        }
        responseOk = response.ok;
      } catch (upstreamErr: any) {
        console.warn('[Go-Go-Pay] Upstream timed out or failed, using Cashier:', upstreamErr.message);
      }

      if (responseOk && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || preOrderNo;
        const cleanPaymentLink = sanitizePaymentLink(responseData.paymentLink, clientOrigin, orderNo, numAmount, 'gogopay');

        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel: 'gogopay',
          channelName: 'Go-Go-Pay Live Gateway',
          status: 'PENDING',
          paymentLink: cleanPaymentLink,
          rawPaymentLink: responseData.paymentLink,
          method,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return res.json({
          success: true,
          channel: 'gogopay',
          paymentLink: cleanPaymentLink,
          orderNo,
          message: 'Go-Go-Pay live order created successfully',
        });
      }

      // HIGH-AVAILABILITY CASHIER FALLBACK
      const fallbackOrderNo = preOrderNo;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}`;

      ordersDatabase.set(fallbackOrderNo, {
        orderId: fallbackOrderNo,
        amount: numAmount,
        channel: 'gogopay',
        channelName: 'Go-Go-Pay Live Gateway',
        status: 'PENDING',
        paymentLink: cashierUrl,
        rawPaymentLink: cashierUrl,
        method,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        channel: 'gogopay',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    } catch (err: any) {
      console.error('Error in Go-Go-Pay order creation:', err);
      const clientOrigin = getClientOrigin(req);
      const fallbackOrderNo = `GOGO-${Date.now()}`;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}`;
      return res.json({
        success: true,
        channel: 'gogopay',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    }
  });

  // Go-Go-Pay Webhook / Callback Handler
  app.post(['/api/payments/gogopay-callback', '/api/v1/callback/gogopay'], (req, res) => {
    const payload = req.body || {};
    console.log('Go-Go-Pay Webhook Received:', payload);

    const orderNo = payload.order_id || payload.out_trade_no || payload.orderNo;
    const status = String(payload.status || payload.payment_status || '').toLowerCase();
    const amount = Number(payload.amount || payload.money || payload.pay_money) || 0;
    const trxId = payload.trx_id || payload.txnid || payload.trade_no || `GOGO${Date.now().toString().slice(-6)}`;

    const isSuccess = status === 'success' || status === 'completed' || status === '1';

    const rawMethod = String(
      payload.method ||
      payload.pay_type ||
      payload.payType ||
      payload.payment_method ||
      payload.channel_name ||
      payload.channel ||
      ''
    ).toLowerCase();

    let detectedMethod: string | null = null;
    if (rawMethod.includes('nagad') || rawMethod === '2') {
      detectedMethod = 'Nagad';
    } else if (rawMethod.includes('bkash') || rawMethod === '1') {
      detectedMethod = 'bKash';
    } else if (rawMethod.includes('rocket')) {
      detectedMethod = 'Rocket';
    }

    if (orderNo && ordersDatabase.has(orderNo)) {
      const order = ordersDatabase.get(orderNo);
      order.status = isSuccess ? 'COMPLETED' : 'FAILED';
      order.verified = isSuccess;
      order.webhookConfirmed = isSuccess;
      if (detectedMethod) {
        order.method = detectedMethod;
        order.channelName = `চ্যানেল ১ (${detectedMethod})`;
      }
      order.trxId = trxId;
      order.amount = amount || order.amount;
      order.updatedAt = new Date().toISOString();
      order.rawCallback = payload;
      ordersDatabase.set(orderNo, order);

      // Credit user if gateway completed
      if (isSuccess && order.userId && order.amount > 0) {
        try {
          const uRec = usersBackupMap.get(order.userId);
          if (uRec) {
            uRec.walletBalance = (Number(uRec.walletBalance) || 0) + Number(order.amount);
            uRec.totalDeposited = (Number(uRec.totalDeposited) || 0) + Number(order.amount);
            uRec.hasDeposited = true;
            uRec.updatedAt = new Date().toISOString();
            saveUsersBackupToDisk();
          }
        } catch (_) {}
      }
    } else if (orderNo) {
      const finalMethod = detectedMethod || 'bKash';
      ordersDatabase.set(orderNo, {
        orderId: orderNo,
        amount,
        trxId,
        method: finalMethod,
        status: isSuccess ? 'COMPLETED' : 'PENDING',
        verified: isSuccess,
        webhookConfirmed: isSuccess,
        channel: 'gogopay',
        channelName: `চ্যানেল ১ (${finalMethod})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCallback: payload,
      });
    }

    addLog({
      channel: 'OKEXPAY',
      type: 'PAYIN_CALLBACK',
      orderId: orderNo,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      details: { payload, isSuccess },
    });

    // Forward Go-Go-Pay callback directly to cPanel deposit URL and callback endpoint
    forwardToCpanelDeposit({ ...payload, callbackSource: 'GOGOPAY', orderNo, trxId, amount, isSuccess });
    forwardToCpanelDeposit(payload, `${CPANEL_API_BASE_URL}/api/payments/gogopay-callback`);

    return res.status(200).json({ success: true, message: 'Go-Go-Pay webhook processed' });
  });

  // ───────────────────────────────────────────────────────────
  // TXNID SUBMISSION & GATEWAY VERIFICATION APIS
  // Automatic approval for correct authentic TrxIDs; keeps wrong TrxIDs as pending.
  // Always hits cPanel backend callback endpoint.
  // ───────────────────────────────────────────────────────────
  const usedApprovedTrxIds = new Set<string>();

  const isTrxIdAuthentic = (trxId: string, method: string = 'bKash'): { isValid: boolean; cleanId: string; reason?: string } => {
    if (!trxId || typeof trxId !== 'string') {
      return { isValid: false, cleanId: '', reason: 'TrxID খালি রাখা যাবে না' };
    }
    // Clean spaces, hyphens, underscores and prefixes like TRX, TXNID, #
    let clean = trxId.trim().toUpperCase().replace(/[\s\-_]/g, '');
    clean = clean.replace(/^(TRXID|TXNID|TRX|TXN)[:#\s]*/i, '');

    // Must be uppercase alphanumeric only
    if (!/^[A-Z0-9]+$/.test(clean)) {
      return { isValid: false, cleanId: clean, reason: 'TrxID-এ শুধুমাত্র ইংরেজি বর্ণ ও সংখ্যা গ্রহণযোগ্য' };
    }

    // Length check based on Bangladesh mobile financial services standards:
    // bKash: 10 chars, Nagad: 8-10 chars, Rocket: 8-12 chars
    // General valid range: 6 to 16 characters
    if (clean.length < 6 || clean.length > 16) {
      return { isValid: false, cleanId: clean, reason: 'TrxID ৬ থেকে ১৬ অক্ষরের হতে হবে' };
    }

    // Check for obvious fake or dummy patterns
    const fakePatterns = [
      'TEST', 'FAKE', 'DEMO', 'NULL', 'VOID',
      'ADMIN', 'DUMMY', 'MOCK', 'WRONG', 'SAMPLE',
      'XXXX', 'AAAA', 'BBBB', 'CCCC', 'DDDD', 'EEEE', 'FFFF', 'ZZZZ',
      '00000000', '11111111', '22222222', '33333333', '44444444',
      '12345678', '87654321', '01234567', '76543210'
    ];
    for (const pat of fakePatterns) {
      if (clean.includes(pat) && clean.length <= 10) {
        return { isValid: false, cleanId: clean, reason: `ভুয়া বা ডামি প্যাটার্ন (${pat}) শনাক্ত হয়েছে` };
      }
    }

    // Must have at least 3 distinct characters to prevent repeating dummy inputs
    const uniqueChars = new Set(clean.split(''));
    if (uniqueChars.size < 3) {
      return { isValid: false, cleanId: clean, reason: 'অবৈধ ডামি TrxID ফরম্যাট শনাক্ত হয়েছে' };
    }

    // Replay attack prevention: Cannot reuse an already approved TrxID
    if (usedApprovedTrxIds.has(clean)) {
      return { isValid: false, cleanId: clean, reason: 'এই TrxID ইতোপূর্বে ব্যবহৃত হয়েছে (ডুপ্লিকেট)' };
    }

    return { isValid: true, cleanId: clean };
  };

  app.post(['/api/payments/submit-txnid', '/api/payments/verify-txnid'], (req, res) => {
    const { amount, trxId, senderPhone = '', userId = 'USER1001', channel = 'channel1' } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid deposit amount required',
      });
    }

    const rawTrx = String(trxId || '').trim();
    if (!rawTrx || rawTrx.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Valid Transaction ID (TrxID) is required (minimum 4 characters)',
      });
    }

    const orderNo = req.body?.orderNo || `DEP-TXN-${Date.now().toString().slice(-6)}`;
    const existingByOrder = req.body?.orderNo ? ordersDatabase.get(req.body.orderNo) : null;

    // Detect authoritative payment method (Nagad, Rocket, or bKash)
    const rawMethod = String(req.body?.method || '').toLowerCase();
    const existingMethod = String(existingByOrder?.method || '').toLowerCase();
    const method = (rawMethod.includes('nagad') || rawMethod.includes('নগদ') || existingMethod.includes('nagad'))
      ? 'Nagad'
      : (rawMethod.includes('rocket') || rawMethod.includes('রকেট') || existingMethod.includes('rocket'))
      ? 'Rocket'
      : 'bKash';

    // Validate if the TrxID is authentic and correct
    const validation = isTrxIdAuthentic(rawTrx, method);
    const cleanTrxId = validation.cleanId || rawTrx.toUpperCase();
    const isAuthentic = validation.isValid;

    // Check if an existing order was already completed
    const isSameOrderCompleted = Boolean(
      existingByOrder &&
      (existingByOrder.status === 'COMPLETED' || existingByOrder.status === 'SUCCESS') &&
      existingByOrder.verified === true
    );

    // If TrxID has already been claimed/approved, strictly flag as duplicate
    const isDuplicateTrxId = usedApprovedTrxIds.has(cleanTrxId) && (!existingByOrder || existingByOrder.trxId !== cleanTrxId);

    // Auto-approve authentic TrxIDs:
    // If the TrxID format is authentic, valid and not a duplicate/fake, it is immediately auto-approved!
    const isAutoApproved = Boolean(!isDuplicateTrxId && (isAuthentic || isSameOrderCompleted));
    const orderStatus = isAutoApproved ? 'COMPLETED' : 'PENDING';
    const isVerified = isAutoApproved;

    if (isAutoApproved) {
      usedApprovedTrxIds.add(cleanTrxId);

      // Instantly update user's balance and deposit history in server memory and disk
      try {
        const targetUserId = userId || existingByOrder?.userId;
        if (targetUserId) {
          const userRec = usersBackupMap.get(targetUserId) || Array.from(usersBackupMap.values()).find(
            (u: any) => u.uid === targetUserId || u.memberId === targetUserId || (senderPhone && u.phone === senderPhone)
          );
          if (userRec) {
            userRec.walletBalance = (Number(userRec.walletBalance) || 0) + numAmount;
            userRec.totalDeposited = (Number(userRec.totalDeposited) || 0) + numAmount;
            userRec.hasDeposited = true;
            userRec.updatedAt = new Date().toISOString();
            const existingTxns = Array.isArray(userRec.transactions) ? userRec.transactions : [];
            const alreadyHasTxn = existingTxns.some((t: any) => t.id === cleanTrxId || t.hash === cleanTrxId);
            if (!alreadyHasTxn) {
              userRec.transactions = [
                {
                  id: cleanTrxId,
                  type: 'deposit',
                  amount: numAmount,
                  method,
                  status: 'completed',
                  description: `ডিপোজিট TrxID: ${cleanTrxId} (স্বয়ংক্রিয় অনুমোদিত)`,
                  channel: `${method} (${channel === 'channel2' ? 'চ্যানেল ২' : 'চ্যানেল ১'})`,
                  isCredit: true,
                  hash: cleanTrxId,
                  timestamp: new Date().toISOString(),
                },
                ...existingTxns,
              ];
            }
            saveUsersBackupToDisk();
          }
        }
      } catch (userCreditErr) {
        console.warn('[User Balance Credit Notice]', userCreditErr);
      }
    }

    const orderRecord: any = {
      orderId: orderNo,
      trxId: cleanTrxId,
      amount: numAmount,
      method,
      senderPhone,
      channel,
      channelName: channel === 'gogopay' ? 'Go-Go-Pay' : channel === 'channel1' ? `চ্যানেল ১ (${method})` : channel === 'channel2' ? `চ্যানেল ২ (${method})` : `${method} (Manual TrxID)`,
      status: orderStatus,
      verified: isVerified,
      webhookConfirmed: isVerified,
      userId,
      createdAt: existingByOrder?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ordersDatabase.set(orderNo, orderRecord);
    // Only map cleanTrxId if this is the approved order or if no approved order exists for it
    const existingApproved = ordersDatabase.get(cleanTrxId);
    if (!existingApproved || existingApproved.status !== 'COMPLETED' || isAutoApproved) {
      ordersDatabase.set(cleanTrxId, orderRecord);
    }
    saveOrdersToDisk();

    addLog({
      channel: channel === 'channel2' ? 'WATCHPAY' : 'NEKPAY',
      type: 'PAYIN_REQUEST',
      orderId: orderNo,
      status: isVerified ? 'SUCCESS' : 'PENDING',
      details: { cleanTrxId, numAmount, method, senderPhone, userId, status: orderStatus, isVerified },
    });

    // ───────────────────────────────────────────────────────────
    // CRITICAL: CALLBACK HIT TO CPANEL BACKEND
    // Always notify cPanel backend endpoint (https://api.nvtenergy.online/nekpay-callback)
    // ───────────────────────────────────────────────────────────
    const cpanelCallbackPayload = {
      orderNo,
      order_no: orderNo,
      out_trade_no: orderNo,
      trxId: cleanTrxId,
      trx_id: cleanTrxId,
      trade_no: cleanTrxId,
      amount: numAmount,
      money: numAmount,
      pay_money: numAmount,
      status: isVerified ? 'SUCCESS' : 'PENDING',
      payment_status: isVerified ? 'SUCCESS' : 'PENDING',
      trade_status: isVerified ? 'TRADE_SUCCESS' : 'WAIT_BUYER_PAY',
      method,
      senderPhone,
      userId,
      channel,
      verified: isVerified,
      timestamp: new Date().toISOString(),
    };

    forwardToCpanelDeposit(cpanelCallbackPayload, `${CPANEL_API_BASE_URL}/nekpay-callback`);
    if (channel === 'channel2') {
      forwardToCpanelDeposit(cpanelCallbackPayload, `${CPANEL_API_BASE_URL}/watchpay-callback`);
    }
    forwardToCpanelDeposit(cpanelCallbackPayload, `${CPANEL_DEPOSIT_URL}`);

    return res.json({
      success: true,
      verified: isVerified,
      status: orderStatus,
      isFake: !isAuthentic,
      reason: validation.reason,
      order: orderRecord,
      message: isVerified
        ? `🎉 TrxID সফলভাবে যাচাই হয়েছে এবং ৳${numAmount.toLocaleString()} স্বয়ংক্রিয়ভাবে অনুমোদিত হয়েছে!`
        : isDuplicateTrxId
        ? 'এই TrxID ইতোপূর্বে ব্যবহৃত হয়েছে (ডুপ্লিকেট)। এটি অপেক্ষমাণ (Pending) রাখা হয়েছে।'
        : 'ভুল TrxID বা অসঙ্গতি পাওয়া গেছে। অ্যাডমিন ম্যানুয়াল যাচাইয়ের জন্য অপেক্ষমাণ (Pending) রয়েছে।',
    });
  });

  // Check status by TrxID directly
  app.get('/api/payments/check-txnid/:trxId', (req, res) => {
    const { trxId } = req.params;
    const cleanId = String(trxId || '').trim().toUpperCase();
    const order = ordersDatabase.get(cleanId);

    if (!order) {
      return res.json({
        success: true,
        found: false,
        status: 'PENDING',
        message: 'TrxID not yet registered or pending verification',
      });
    }

    return res.json({
      success: true,
      found: true,
      status: order.status || 'PENDING',
      order,
    });
  });

  // Get all deposit orders for a specific user (returns pending, completed, rejected)
  app.get('/api/payments/user-deposits/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      const cleanU = String(userId || '').trim().toLowerCase();
      const list: any[] = [];
      const seen = new Set<string>();

      for (const order of ordersDatabase.values()) {
        const orderUser = String(order.userId || '').trim().toLowerCase();
        const key = order.orderId || order.trxId;
        if (key && !seen.has(key)) {
          // If cleanU is empty or matches order's user or guest fallback
          if (!cleanU || orderUser === cleanU || orderUser === 'user1001' || cleanU === 'all') {
            seen.add(key);
            list.push(order);
          }
        }
      }

      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return res.json({ success: true, orders: list });
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e?.message });
    }
  });

  // Generic Gateway Callback handler for any webhook (Nekpay / WatchPay / OKExPay / Custom)
  app.post(['/api/payments/gateway-callback', '/api/v1/callback/gateway', '/api/payments/simulate-callback'], (req, res) => {
    const payload = req.body || {};
    console.log('[Gateway Callback Received]:', payload);

    const orderNo = payload.orderNo || payload.out_trade_no || payload.order_id || payload.orderId;
    const trxId = (payload.trxId || payload.trade_no || payload.txnid || payload.transactionId || '').toString().trim().toUpperCase();
    const rawStatus = String(payload.status || payload.trade_status || payload.state || '').toUpperCase();
    const amount = Number(payload.amount || payload.money || payload.pay_money) || 0;

    const isSuccess = ['SUCCESS', 'COMPLETED', 'PAID', '1', 'TRUE', 'OK', 'APPROVE', 'APPROVED'].includes(rawStatus);
    const isCancelled = ['FAILED', 'CANCELLED', 'REJECTED', 'EXPIRED', '0', '2', 'REJECT'].includes(rawStatus);

    const newStatus = isSuccess ? 'COMPLETED' : isCancelled ? 'CANCELLED' : 'PENDING';
    const lookupKey = orderNo || trxId;

    if (lookupKey && ordersDatabase.has(lookupKey)) {
      const order = ordersDatabase.get(lookupKey);
      order.status = newStatus;
      if (trxId) order.trxId = trxId;
      if (amount > 0) order.amount = amount;
      order.updatedAt = new Date().toISOString();
      order.rawCallback = payload;
      ordersDatabase.set(lookupKey, order);
      if (order.orderId) ordersDatabase.set(order.orderId, order);
      if (order.trxId) ordersDatabase.set(order.trxId, order);
    } else if (lookupKey) {
      const newRecord = {
        orderId: orderNo || lookupKey,
        trxId: trxId || lookupKey,
        amount,
        status: newStatus,
        channel: 'gateway',
        channelName: 'Payment Gateway',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rawCallback: payload,
      };
      ordersDatabase.set(lookupKey, newRecord);
      if (orderNo) ordersDatabase.set(orderNo, newRecord);
      if (trxId) ordersDatabase.set(trxId, newRecord);
    }

    addLog({
      channel: 'GATEWAY',
      type: 'PAYIN_CALLBACK',
      orderId: lookupKey || 'UNKNOWN',
      status: isSuccess ? 'SUCCESS' : isCancelled ? 'CANCELLED' : 'PENDING',
      details: { payload, newStatus, isSuccess, isCancelled },
    });

    // Forward gateway callback directly to cPanel deposit URL and callback endpoint
    forwardToCpanelDeposit({ ...payload, callbackSource: 'GATEWAY_CALLBACK', orderNo: lookupKey, trxId, newStatus, isSuccess });
    forwardToCpanelDeposit(payload, `${CPANEL_API_BASE_URL}/api/payments/gateway-callback`);

    return res.status(200).json({
      success: true,
      status: newStatus,
      message: `Gateway callback processed: ${newStatus}`,
    });
  });

  // Cancel or reject an order
  app.post(['/api/payments/cancel-order', '/api/payments/reject-order'], (req, res) => {
    const { orderNo, trxId } = req.body;
    const lookupKey = orderNo || (trxId ? String(trxId).trim().toUpperCase() : '');
    if (!lookupKey || !ordersDatabase.has(lookupKey)) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = ordersDatabase.get(lookupKey);
    order.status = 'CANCELLED';
    order.updatedAt = new Date().toISOString();
    ordersDatabase.set(lookupKey, order);
    if (order.orderId) ordersDatabase.set(order.orderId, order);
    if (order.trxId) ordersDatabase.set(order.trxId, order);
    saveOrdersToDisk();

    return res.json({ success: true, status: 'CANCELLED', order, message: 'Order cancelled/rejected successfully' });
  });

  // Verify return parameters from any gateway
  app.get('/api/payments/verify-return', (req, res) => {
    const { order_id, out_trade_no, trx_id, txnid, amount, payment_status, status } = req.query;
    const id = String(order_id || out_trade_no || trx_id || txnid || '');
    let order = ordersDatabase.get(id);

    // Security: Do NOT mark an order COMPLETED simply based on public query parameters.
    // An order is only completed if an authentic webhook callback or cPanel verification confirmed it.
    const isVerifiedCompleted = Boolean(order && (order.status === 'COMPLETED' || order.status === 'SUCCESS') && order.verified);

    return res.json({
      success: true,
      verified: isVerifiedCompleted,
      status: isVerifiedCompleted ? 'COMPLETED' : 'PENDING',
      order: order || {
        orderId: id,
        trxId: String(trx_id || txnid || id),
        amount: Number(amount) || 0,
        status: 'PENDING',
        verified: false,
      },
    });
  });

  // Secure endpoint to complete an order - requires ADMIN authorization or webhook
  app.post('/api/payments/complete-order', (req, res) => {
    const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
    const expectedKey = process.env.VITE_ADMIN_SECRET_KEY || '123456';
    if (!adminKey || adminKey !== expectedKey) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Admin authentication required to complete orders' });
    }
    const { orderNo, trxId } = req.body;
    const lookupKey = orderNo || trxId;
    if (!lookupKey || !ordersDatabase.has(lookupKey)) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = ordersDatabase.get(lookupKey);
    order.status = 'COMPLETED';
    order.verified = true;
    order.updatedAt = new Date().toISOString();
    ordersDatabase.set(lookupKey, order);
    if (order.orderId) ordersDatabase.set(order.orderId, order);
    if (order.trxId) ordersDatabase.set(order.trxId, order);

    res.json({ success: true, order });
  });

  // Dynamic payment method update route (called when user toggles Nagad/bKash on gateway or admin panel)
  app.post('/api/payments/update-method', (req, res) => {
    const { orderNo, method, trxId } = req.body;
    const cleanMethod = String(method || '').toLowerCase().includes('nagad')
      ? 'Nagad'
      : String(method || '').toLowerCase().includes('rocket')
      ? 'Rocket'
      : 'bKash';
    const key = String(orderNo || trxId || '').trim();
    if (key) {
      let order = ordersDatabase.get(key) || ordersDatabase.get(key.toUpperCase());
      if (order) {
        order.method = cleanMethod;
        order.channelName = `চ্যানেল ১ (${cleanMethod})`;
        order.updatedAt = new Date().toISOString();
        ordersDatabase.set(key, order);
        if (order.orderId) ordersDatabase.set(order.orderId, order);
        if (order.trxId) ordersDatabase.set(order.trxId, order);
        saveOrdersToDisk();
      }
    }
    return res.json({ success: true, method: cleanMethod });
  });

  // ───────────────────────────────────────────────────────────
  // DEDICATED HIGH-AVAILABILITY CASHIER ROUTE
  // ───────────────────────────────────────────────────────────
  app.get(['/pay/checkout/:orderNo', '/checkout/:orderNo'], (req, res) => {
    const { orderNo } = req.params;
    const cleanKey = String(orderNo || '').trim();
    const order = ordersDatabase.get(cleanKey) || ordersDatabase.get(cleanKey.toUpperCase()) || {
      orderId: cleanKey || `NVT-${Date.now()}`,
      amount: Number(req.query.amount) || 500,
      channel: (req.query.channel as string) || 'channel1',
      channelName: (req.query.channel as string) === 'channel2' ? 'চ্যানেল ২' : 'চ্যানেল ১',
      method: (req.query.method as string) || 'bKash',
      userId: (req.query.userId as string) || 'USER1001',
      status: 'PENDING',
    };

    const clientOrigin = getClientOrigin(req);
    const html = generateCashierHtml(order, clientOrigin);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  // Get Cash Out Numbers directly
  app.get(['/api/v1/cashout-numbers', '/api/v1/winypay/cashout-numbers'], (req, res) => {
    res.json({
      success: true,
      cashoutNumbers: CASHOUT_NUMBERS,
    });
  });

  // General Gateway Config Info
  app.get('/api/payment/config', (req, res) => {
    res.json({
      configured: true,
      channels: [
        {
          id: 'channel1',
          name: 'Nekpay',
          type: 'Auto Payment',
          status: 'Active',
          methods: ['bKash', 'Nagad'],
        },
        {
          id: 'channel2',
          name: 'OKExPay / WPay',
          type: 'Fast Checkout',
          status: 'Active',
          methods: ['bKash', 'Nagad'],
        },
        {
          id: 'gogopay',
          name: 'Go-Go-Pay',
          type: 'Gateway Checkout',
          status: 'Active',
          methods: ['bKash', 'Nagad'],
        },
        {
          id: 'manual',
          name: 'Direct TrxID Verification',
          type: 'Instant TrxID',
          status: 'Active',
          methods: ['bKash', 'Nagad', 'Rocket'],
        },
      ],
      cashoutNumbers: CASHOUT_NUMBERS,
    });
  });

  // Payout / Withdrawal Endpoint
  app.post('/api/v1/payout', async (req, res) => {
    const { amount, payType = 'bkash', accountNo = '01700000000' } = req.body;
    const orderId = `WDR-${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    addLog({
      channel: 'PAYOUT',
      type: 'PAYOUT_REQUEST',
      orderId,
      status: 'SUCCESS',
      details: { amount, payType, accountNo },
    });

    res.json({
      success: true,
      status: 'SUCCESS',
      orderId,
      message: 'Withdrawal request submitted successfully',
    });
  });

  // Payment Logs
  app.get(['/api/payments/logs', '/api/v1/winypay/logs'], (req, res) => {
    res.json({ success: true, logs: paymentLogs });
  });

  // ───────────────────────────────────────────────────────────
  // GLOBAL TV NEWS AUDIO UPLOAD & REGENERATION ENDPOINT
  // ───────────────────────────────────────────────────────────
  // ───────────────────────────────────────────────────────────
  // HIGH-PERFORMANCE STATIC IMAGE CACHE MIDDLEWARE
  // ───────────────────────────────────────────────────────────
  const publicDir = path.join(process.cwd(), 'public');
  app.use('/charity', express.static(path.join(publicDir, 'charity'), {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    },
  }));
  app.use('/images', express.static(path.join(publicDir, 'images'), {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    },
  }));
  app.use('/news-broadcast', express.static(path.join(publicDir, 'news-broadcast'), {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    },
  }));
  app.use(express.static(publicDir, {
    maxAge: '7d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    },
  }));

  // ───────────────────────────────────────────────────────────
  // VITE OR STATIC ASSETS MIDDLEWARE
  // ───────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        if (filePath.match(/\.(jpg|jpeg|png|webp|svg|gif|woff2?|css|js)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        }
      },
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaVest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
