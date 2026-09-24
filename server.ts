import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateCashierHtml } from './cashierTemplate';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const PORT = 3000;

  // Middleware
  app.set('trust proxy', true);
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // In-memory stores
  const ordersDatabase = new Map<string, any>();
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
    const targetUrl = customUrl || CPANEL_DEPOSIT_URL;
    try {
      fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'NovaVest-Server/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000),
      }).catch((e) => {
        // non-blocking
        console.warn(`[cPanel Forward Notice (${targetUrl})]:`, e?.message || e);
      });
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
    const raw = String(req.query.phone || '').trim();
    const digits = normalizePhoneQuery(raw);
    const last10 = digits.slice(-10);

    if (!last10) {
      return res.json({ found: false });
    }

    const record =
      phoneRegistry.get(last10) ||
      phoneRegistry.get(`0${last10}`) ||
      phoneRegistry.get(`880${last10}`) ||
      phoneRegistry.get(digits);

    if (record && record.email) {
      return res.json({
        found: true,
        email: record.email,
        memberId: record.memberId,
        referralCode: record.referralCode,
      });
    }

    // Default canonical email for fallback
    return res.json({
      found: false,
      suggestedEmail: `880${last10}@novavest.local`,
    });
  });

  // 3. POST /api/auth/register-phone
  app.post('/api/auth/register-phone', (req, res) => {
    const { phone, email, uid, memberId, referralCode, username } = req.body;
    const digits = normalizePhoneQuery(phone);
    const last10 = digits.slice(-10);

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

    savePhoneRegistryToDisk();

    return res.json({
      success: true,
      message: 'Phone registered successfully in server registry',
      record,
    });
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

  // Extract client domain origin so returnUrl points back to user's real website domain
  const getClientOrigin = (req: express.Request): string => {
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
    const returnTarget = `${cleanOrigin}/?payment_status=SUCCESS&orderNo=${encodeURIComponent(orderNo)}&amount=${amount}&channel=${encodeURIComponent(channel)}&gateway=nekpay`;

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
  const CASHOUT_NUMBERS: Record<string, { number: string; type: string; name: string }> = {
    bkash: { number: '01712-345678', type: 'বিকাশ এজেন্ট (Cash Out)', name: 'NovaVest bKash Agent' },
    nagad: { number: '01844-992211', type: 'নগদ এজেন্ট (Cash Out)', name: 'NovaVest Nagad Agent' },
    rocket: { number: '01911-223344', type: 'রকেট এজেন্ট (Cash Out)', name: 'NovaVest Rocket Agent' },
    upay: { number: '01611-223344', type: 'উপায় এজেন্ট (Cash Out)', name: 'NovaVest Upay Agent' },
    usdt: { number: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', type: 'TRC-20 USDT Wallet Address', name: 'Binance TRC20 Official' },
  };

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
  // PHONE REGISTRATION & SINGLE-ACCOUNT VERIFICATION
  // ───────────────────────────────────────────────────────────
  const registeredPhones = new Map<string, { phone: string; uid?: string; email?: string; memberId?: string; timestamp: number }>();

  // Ensure persistent phone directory exists and hydrate
  const PHONES_FILE_PATH = path.join(process.cwd(), 'data', 'registered_phones.json');
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'), { recursive: true });
    }
    if (fs.existsSync(PHONES_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(PHONES_FILE_PATH, 'utf-8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.last10) registeredPhones.set(item.last10, item);
          if (item.digits) registeredPhones.set(item.digits, item);
          if (item.phone) registeredPhones.set(item.phone, item);
        }
      }
    }
  } catch (err) {
    console.warn('[Server] Error loading phone registry:', err);
  }

  const persistPhones = () => {
    try {
      const allItems: any[] = [];
      const seen = new Set<string>();
      for (const [key, val] of registeredPhones.entries()) {
        const id = val.phone || key;
        if (!seen.has(id)) {
          seen.add(id);
          allItems.push({ ...val, key });
        }
      }
      fs.writeFileSync(PHONES_FILE_PATH, JSON.stringify(allItems, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Server] Error persisting phone registry:', err);
    }
  };

  app.get('/api/auth/check-phone', (req, res) => {
    const rawPhone = String(req.query.phone || '').trim();
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const last10 = cleanDigits.slice(-10);

    if (!last10 || last10.length < 8) {
      return res.json({ registered: false });
    }

    const entry = registeredPhones.get(last10) || registeredPhones.get(cleanDigits) || registeredPhones.get(rawPhone);
    const isRegistered = Boolean(entry);
    return res.json({
      registered: isRegistered,
      phone: last10,
      email: entry?.email,
      memberId: entry?.memberId,
    });
  });

  app.get('/api/auth/phone-to-email', (req, res) => {
    const rawPhone = String(req.query.phone || '').trim();
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const last10 = cleanDigits.slice(-10);

    const entry =
      (last10 && registeredPhones.get(last10)) ||
      (cleanDigits && registeredPhones.get(cleanDigits)) ||
      registeredPhones.get(rawPhone);

    if (entry && entry.email) {
      return res.json({
        found: true,
        email: entry.email,
        phone: entry.phone,
        memberId: entry.memberId,
        uid: entry.uid,
      });
    }

    return res.json({ found: false });
  });

  app.post('/api/auth/register-phone', (req, res) => {
    const { phone, last10, uid, email, memberId } = req.body || {};
    const cleanPhone = String(phone || '').trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    const cleanLast10 = String(last10 || cleanDigits.slice(-10)).trim();
    const cleanEmail = String(email || '').trim();
    const cleanMemberId = String(memberId || '').trim();

    const record = {
      phone: cleanPhone,
      uid: String(uid || ''),
      email: cleanEmail,
      memberId: cleanMemberId,
      timestamp: Date.now(),
    };

    if (cleanLast10 && cleanLast10.length >= 8) {
      registeredPhones.set(cleanLast10, record);
    }
    if (cleanDigits) {
      registeredPhones.set(cleanDigits, record);
    }
    if (cleanPhone) {
      registeredPhones.set(cleanPhone, record);
    }

    persistPhones();
    return res.json({ success: true, registered: true });
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
      const returnTarget = `${clientOrigin.replace(/\/+$/, '')}/?payment_status=SUCCESS&orderNo=${encodeURIComponent(preOrderNo)}&amount=${numAmount}&channel=${encodeURIComponent(channel)}&gateway=nekpay`;

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
            callback_url: returnTarget,
            redirect_url: returnTarget,
            redirectUrl: returnTarget,
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
      const { amount, payerName = 'Customer', userId = 'USER1001' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required (minimum 100 BDT)',
        });
      }

      const clientOrigin = getClientOrigin(req);
      const preOrderNo = `NEK-${Date.now()}`;
      const returnTarget = `${clientOrigin.replace(/\/+$/, '')}/?payment_status=SUCCESS&orderNo=${encodeURIComponent(preOrderNo)}&amount=${numAmount}&channel=channel1&gateway=nekpay`;

      const postBody = {
        amount: numAmount,
        payerName: String(payerName).trim() || 'Customer',
        userId: userId || 'USER1001',
        orderNo: preOrderNo,
        order_no: preOrderNo,
        return_url: returnTarget,
        returnUrl: returnTarget,
        callback_url: returnTarget,
        redirect_url: returnTarget,
        redirectUrl: returnTarget,
        success_url: returnTarget,
        cancel_url: `${clientOrigin.replace(/\/+$/, '')}/profile`,
      };

      // Also forward deposit request notification directly to cPanel deposit URL
      forwardToCpanelDeposit({
        amount: numAmount,
        payerName: postBody.payerName,
        userId,
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
          channelName: 'চ্যানেল ১ (Nekpay)',
          method: req.body?.method || 'bKash',
          status: 'PENDING',
          paymentLink: cleanPaymentLink,
          rawPaymentLink: responseData.paymentLink,
          payerName: postBody.payerName,
          userId,
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
          paymentLink: cleanPaymentLink,
          orderNo,
          message: 'Order created successfully with Nekpay',
        });
      }

      // HIGH-AVAILABILITY CASHIER FALLBACK
      const fallbackOrderNo = preOrderNo;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}`;

      ordersDatabase.set(fallbackOrderNo, {
        orderId: fallbackOrderNo,
        amount: numAmount,
        channel: 'nekpay',
        channelName: 'চ্যানেল ১ (Nekpay)',
        method: req.body?.method || 'bKash',
        status: 'PENDING',
        paymentLink: cashierUrl,
        rawPaymentLink: cashierUrl,
        payerName: postBody.payerName,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      addLog({
        channel: 'NEKPAY',
        type: 'PAYIN_REQUEST',
        orderId: fallbackOrderNo,
        status: 'SUCCESS',
        details: { fallbackCashier: true, numAmount, cashierUrl },
      });

      return res.json({
        success: true,
        channel: 'channel1',
        paymentLink: cashierUrl,
        orderNo: fallbackOrderNo,
        isCashier: true,
        message: 'Cashier checkout link created successfully',
      });
    } catch (err: any) {
      console.error('Error contacting Nekpay backend:', err);
      const clientOrigin = getClientOrigin(req);
      const fallbackOrderNo = `NEK-${Date.now()}`;
      const cashierUrl = `${clientOrigin.replace(/\/+$/, '')}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}`;
      return res.json({
        success: true,
        channel: 'channel1',
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
      const returnTarget = `${clientOrigin.replace(/\/+$/, '')}/?payment_status=SUCCESS&orderNo=${encodeURIComponent(preOrderNo)}&amount=${numAmount}&channel=channel2&gateway=watchpay`;

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
            callback_url: returnTarget,
            redirect_url: returnTarget,
            redirectUrl: returnTarget,
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
    forwardToCpanelDeposit(payload, `${CPANEL_API_BASE_URL}/api/payments/okexpay-callback`);

    // CRITICAL: Respond with plain text "success" per OKExPay doc
    return res.status(200).type('text/plain').send('success');
  });

  // ───────────────────────────────────────────────────────────
  // WATCHPAY WEBHOOK / CALLBACK HANDLER
  // POST /api/payments/watchpay-callback, /api/v1/callback/watchpay
  // ───────────────────────────────────────────────────────────
  app.post(['/api/payments/watchpay-callback', '/api/v1/callback/watchpay', '/api/v1/watchpay/callback'], (req, res) => {
    const payload = req.body || {};
    console.log('[WatchPay Webhook Received]:', payload);

    const orderNo = payload.orderNo || payload.out_trade_no || payload.order_id || payload.orderId;
    const trxId = payload.trxId || payload.trade_no || payload.txnid || payload.transactionId || orderNo;
    const rawStatus = String(payload.status || payload.trade_status || payload.state || '').toUpperCase();
    const amount = Number(payload.amount || payload.money || payload.pay_money) || 0;

    const isSuccess = ['SUCCESS', 'COMPLETED', 'PAID', '1', 'TRUE', 'OK'].includes(rawStatus);

    if (orderNo && ordersDatabase.has(orderNo)) {
      const order = ordersDatabase.get(orderNo);
      order.status = isSuccess ? 'COMPLETED' : 'FAILED';
      order.trxId = trxId;
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
        channel: 'watchpay',
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
                channel: remoteData.gateway?.toLowerCase() || 'watchpay',
                channelName: remoteData.gateway || 'WatchPay',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            } else {
              order.status = 'COMPLETED';
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

    if (orderNo && ordersDatabase.has(orderNo)) {
      const order = ordersDatabase.get(orderNo);
      order.status = isSuccess ? 'COMPLETED' : 'FAILED';
      order.trxId = trxId;
      order.amount = amount || order.amount;
      order.updatedAt = new Date().toISOString();
      order.rawCallback = payload;
      ordersDatabase.set(orderNo, order);
    } else if (orderNo) {
      ordersDatabase.set(orderNo, {
        orderId: orderNo,
        amount,
        trxId,
        status: isSuccess ? 'COMPLETED' : 'PENDING',
        channel: 'gogopay',
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
  // ───────────────────────────────────────────────────────────
  app.post(['/api/payments/submit-txnid', '/api/payments/verify-txnid'], (req, res) => {
    const { amount, trxId, method = 'bKash', senderPhone = '', userId = 'USER1001', channel = 'manual' } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid deposit amount required',
      });
    }

    const cleanTrxId = String(trxId || '').trim().toUpperCase();
    if (!cleanTrxId || cleanTrxId.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Valid Transaction ID (TrxID) is required (minimum 4 characters)',
      });
    }

    const orderNo = `DEP-TXN-${Date.now().toString().slice(-6)}`;

    // Only allow COMPLETED if an existing order was already verified by payment gateway webhook
    const existing = ordersDatabase.get(cleanTrxId);
    const isAlreadyCompleted = Boolean(existing && (existing.status === 'COMPLETED' || existing.status === 'SUCCESS'));

    // Security: All submitted TrxIDs start strictly as PENDING until confirmed by cPanel, gateway or admin
    const orderStatus = isAlreadyCompleted ? 'COMPLETED' : 'PENDING';
    const isVerified = orderStatus === 'COMPLETED';

    const orderRecord: any = {
      orderId: orderNo,
      trxId: cleanTrxId,
      amount: numAmount,
      method,
      senderPhone,
      channel,
      channelName: channel === 'gogopay' ? 'Go-Go-Pay' : channel === 'channel1' ? 'Nekpay' : channel === 'channel2' ? 'WatchPay' : 'Manual TrxID',
      status: orderStatus,
      verified: isVerified,
      userId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ordersDatabase.set(orderNo, orderRecord);
    ordersDatabase.set(cleanTrxId, orderRecord);

    addLog({
      channel: 'DEPOSIT',
      type: 'PAYIN_REQUEST',
      orderId: orderNo,
      status: orderStatus === 'COMPLETED' ? 'SUCCESS' : 'PENDING',
      details: { cleanTrxId, numAmount, method, senderPhone, userId, status: orderStatus },
    });

    // Forward transaction submission directly to cPanel deposit URL and verification endpoint
    forwardToCpanelDeposit({ ...orderRecord, submissionType: 'TXNID_SUBMISSION' });
    forwardToCpanelDeposit(orderRecord, `${CPANEL_API_BASE_URL}/api/payments/submit-txnid`);

    return res.json({
      success: true,
      verified: isVerified,
      status: orderStatus,
      order: orderRecord,
      message: orderStatus === 'COMPLETED'
        ? 'ডিপোজিট সফলভাবে ভেরিফাই ও অনুমোদিত হয়েছে!'
        : 'TrxID সফলভাবে জমা হয়েছে। cPanel ভেরিফিকেশনের পর ব্যালেন্স যুক্ত হবে।',
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

    return res.json({ success: true, status: 'CANCELLED', order, message: 'Order cancelled/rejected successfully' });
  });

  // Verify return parameters from any gateway
  app.get('/api/payments/verify-return', (req, res) => {
    const { order_id, out_trade_no, trx_id, txnid, amount, payment_status, status } = req.query;
    const id = String(order_id || out_trade_no || trx_id || txnid || '');
    const isSuccess =
      String(payment_status || status || '').toUpperCase() === 'SUCCESS' ||
      String(payment_status || status || '').toUpperCase() === 'COMPLETED' ||
      status === '1';

    let order = ordersDatabase.get(id);
    if (!order && id) {
      order = {
        orderId: id,
        trxId: String(trx_id || txnid || id),
        amount: Number(amount) || 0,
        status: isSuccess ? 'COMPLETED' : 'PENDING',
        verified: isSuccess,
        updatedAt: new Date().toISOString(),
      };
      ordersDatabase.set(id, order);
    } else if (order && isSuccess) {
      order.status = 'COMPLETED';
      order.verified = true;
      order.updatedAt = new Date().toISOString();
      ordersDatabase.set(id, order);
    }

    return res.json({
      success: true,
      verified: isSuccess,
      status: isSuccess ? 'COMPLETED' : 'PENDING',
      order,
    });
  });

  // Manually complete an order
  app.post('/api/payments/complete-order', (req, res) => {
    const { orderNo } = req.body;
    if (!orderNo || !ordersDatabase.has(orderNo)) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const order = ordersDatabase.get(orderNo);
    order.status = 'COMPLETED';
    order.updatedAt = new Date().toISOString();
    ordersDatabase.set(orderNo, order);

    res.json({ success: true, order });
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
      channelName: 'চ্যানেল ১ (Nekpay)',
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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NovaVest server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
