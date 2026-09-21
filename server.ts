import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

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
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { raw: responseText };
      }

      if (response.ok && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || `DEP-${Date.now()}`;
        const clientOrigin = getClientOrigin(req);
        const cleanPaymentLink = sanitizePaymentLink(responseData.paymentLink, clientOrigin, orderNo, numAmount, channel);

        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel,
          channelName: channel === 'channel2' ? 'চ্যানেল ২ (WatchPay)' : 'চ্যানেল ১ (Nekpay)',
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

      return res.status(502).json({
        success: false,
        error: responseData.message || responseData.error || 'Failed to create deposit order via cPanel backend',
        details: responseData,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to connect to cPanel backend API',
        details: err.message,
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

      // Call Nekpay on cPanel backend with 10s timeout
      const response = await fetch(NEKPAY_CONFIG.createOrderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(postBody),
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Nekpay response as JSON:', responseText);
      }

      console.log('Nekpay response status:', response.status, responseData);

      if (response.ok && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || `NEK-${Date.now()}`;
        const clientOrigin = getClientOrigin(req);
        const cleanPaymentLink = sanitizePaymentLink(responseData.paymentLink, clientOrigin, orderNo, numAmount, 'channel1');

        // Save order in memory database
        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel: 'nekpay',
          channelName: 'চ্যানেল ১ (Nekpay)',
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

      // If Nekpay returned an error
      addLog({
        channel: 'NEKPAY',
        type: 'PAYIN_REQUEST',
        status: 'FAILED',
        details: { postBody, status: response.status, responseText },
      });

      return res.status(502).json({
        success: false,
        error: responseData.message || responseData.error || 'Nekpay failed to create payment link',
        details: responseData,
      });
    } catch (err: any) {
      console.error('Error contacting Nekpay backend:', err);
      addLog({
        channel: 'NEKPAY',
        type: 'PAYIN_REQUEST',
        status: 'FAILED',
        details: { error: err.message },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to connect to Nekpay backend service',
        details: err.message,
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
        signal: AbortSignal.timeout(10000),
      });

      const data: any = await response.json();
      console.log('[WatchPay] Response:', data);

      if (data && data.success && data.paymentLink) {
        const orderId = data.orderNo || `WPY-${Date.now()}`;
        let targetPaymentUrl = data.paymentLink;

        // Extract direct checkout link from watchglb iframe wrapper to prevent X-Frame-Options/SAMEORIGIN errors in browsers
        try {
          const pageRes = await fetch(data.paymentLink, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
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

      addLog({
        channel: 'WATCHPAY',
        type: 'PAYIN_REQUEST',
        orderId: `WPY-FAIL-${Date.now()}`,
        status: 'FAILED',
        details: { response: data },
      });

      return res.status(502).json({
        success: false,
        error: data.message || data.error || 'Failed to create WatchPay order',
        details: data,
      });
    } catch (err: any) {
      console.error('Error contacting WatchPay gateway:', err);
      addLog({
        channel: 'WATCHPAY',
        type: 'PAYIN_REQUEST',
        status: 'FAILED',
        details: { error: err.message },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to connect to WatchPay gateway',
        details: err.message,
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

      const response = await fetch(NEKPAY_CONFIG.createOrderUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify(postBody),
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse Nekpay response for gogopay as JSON:', responseText);
      }

      if (response.ok && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || `GOGO-${Date.now()}`;
        const clientOrigin = getClientOrigin(req);
        const cleanPaymentLink = sanitizePaymentLink(responseData.paymentLink, clientOrigin, orderNo, numAmount, 'gogopay');

        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel: 'gogopay',
          channelName: 'Go-Go-Pay Live Gateway',
          status: 'PENDING',
          paymentLink: cleanPaymentLink,
          rawPaymentLink: responseData.paymentLink,
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

      return res.status(502).json({
        success: false,
        error: responseData.message || 'Live gateway unreachable',
      });
    } catch (err: any) {
      console.error('Error in Go-Go-Pay order creation:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to create Go-Go-Pay order',
        details: err.message,
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
  app.post('/api/upload-news-audio', async (req, res) => {
    try {
      const { audioBase64 } = req.body || {};
      if (!audioBase64) {
        return res.status(400).json({ success: false, error: 'No audio data provided' });
      }

      const base64Data = String(audioBase64).replace(/^data:audio\/[a-zA-Z0-9.\-_]+;base64,/, '');
      const audioBuffer = Buffer.from(base64Data, 'base64');

      const publicAudioDir = path.join(process.cwd(), 'public', 'company-profile', 'audio');
      if (!fs.existsSync(publicAudioDir)) {
        fs.mkdirSync(publicAudioDir, { recursive: true });
      }
      const targetAudio = path.join(publicAudioDir, 'mohana-sarkar-globaltv-news.mp3');
      fs.writeFileSync(targetAudio, audioBuffer);

      // Also copy to dist if dist exists
      const distAudioDir = path.join(process.cwd(), 'dist', 'company-profile', 'audio');
      if (fs.existsSync(distAudioDir)) {
        fs.writeFileSync(path.join(distAudioDir, 'mohana-sarkar-globaltv-news.mp3'), audioBuffer);
      }

      // Re-generate the video with the exact uploaded audio using ffmpeg in background
      const publicVideoDir = path.join(process.cwd(), 'public', 'company-profile', 'videos');
      if (!fs.existsSync(publicVideoDir)) {
        fs.mkdirSync(publicVideoDir, { recursive: true });
      }
      const videoOut = path.join(publicVideoDir, 'globaltv-news-report.mp4');
      const imgPath = path.join(process.cwd(), 'public', 'news-broadcast', 'anchor_mohana.jpg');

      import('child_process').then(({ exec }) => {
        exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${targetAudio}"`, (pErr, stdout) => {
          const duration = Math.ceil(parseFloat(stdout.trim()) || 90);
          const ffmpegCmd = `ffmpeg -y -loop 1 -t ${duration} -i "${imgPath}" -i "${targetAudio}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -shortest "${videoOut}"`;
          exec(ffmpegCmd, (fErr) => {
            if (!fErr) {
              console.log('Successfully regenerated globaltv-news-report.mp4 with uploaded audio');
              const distVideoDir = path.join(process.cwd(), 'dist', 'company-profile', 'videos');
              if (fs.existsSync(distVideoDir)) {
                try {
                  fs.copyFileSync(videoOut, path.join(distVideoDir, 'globaltv-news-report.mp4'));
                } catch (_) {}
              }
            } else {
              console.warn('ffmpeg video regen warning:', fErr);
            }
          });
        });
      });

      return res.json({
        success: true,
        message: 'ভয়েস সফলভাবে আপলোড ও সেভ করা হয়েছে!',
        size: audioBuffer.length
      });
    } catch (err: any) {
      console.error('Error saving uploaded news audio:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to save audio' });
    }
  });

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
