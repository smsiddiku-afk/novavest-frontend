import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ───────────────────────────────────────────────────────────
// PAYMENT GATEWAY CONFIGURATIONS
// ───────────────────────────────────────────────────────────

// Channel 1: Nekpay Integration Configuration
// URL: https://nekpay-backend.onrender.com/create-order
// Method: POST
// Headers: Content-Type: application/json
// Body: { "amount": selectedAmount, "payerName": "Customer" }
const NEKPAY_CONFIG = {
  createOrderUrl: 'https://nekpay-backend.onrender.com/create-order',
};

// Channel 2: OKExPay / WPay Integration Configuration
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
  channel: 'NEKPAY' | 'OKEXPAY' | 'PAYOUT';
  type: 'PAYIN_REQUEST' | 'PAYIN_CALLBACK' | 'PAYOUT_REQUEST';
  timestamp: string;
  orderId?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  details: any;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
  // HEALTH CHECK
  // ───────────────────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ───────────────────────────────────────────────────────────
  // CHANNEL 1: NEKPAY PAYMENT INTEGRATION
  // URL: https://nekpay-backend.onrender.com/create-order
  // Method: POST
  // Headers: Content-Type: application/json
  // Body: { "amount": selectedAmount, "payerName": "Customer" }
  // ───────────────────────────────────────────────────────────
  app.post(['/api/v1/nekpay/create-order', '/api/payment/create-order'], async (req, res) => {
    try {
      const { amount, payerName = 'Customer', userId = 'USER1001' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required (minimum 350 BDT)',
        });
      }

      const postBody = {
        amount: numAmount,
        payerName: String(payerName).trim() || 'Customer',
      };

      console.log('Sending request to Nekpay:', NEKPAY_CONFIG.createOrderUrl, postBody);

      // Call Nekpay backend
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
        console.error('Failed to parse Nekpay response as JSON:', responseText);
      }

      console.log('Nekpay response status:', response.status, responseData);

      if (response.ok && responseData.success && responseData.paymentLink) {
        const orderNo = responseData.orderNo || `NEK-${Date.now()}`;

        // Save order in memory database
        ordersDatabase.set(orderNo, {
          orderId: orderNo,
          amount: numAmount,
          channel: 'nekpay',
          channelName: 'চ্যানেল ১ (Nekpay)',
          status: 'PENDING',
          paymentLink: responseData.paymentLink,
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
          details: { postBody, responseData },
        });

        return res.json({
          success: true,
          channel: 'channel1',
          paymentLink: responseData.paymentLink,
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
  // CHANNEL 2: OKEXPAY / WPAY PAYMENT INTEGRATION
  // Host: https://sandbox.okexpay.dev
  // Endpoint: /v1/Collect
  // Credentials: mchId: "1000", Key: "4035fcd2d720e1b06ea455bdde411012"
  // Order ID: Ends with an even number (e.g. DEP-${Date.now()}2) for automatic success
  // ───────────────────────────────────────────────────────────
  app.post('/api/v1/okexpay/create-order', async (req, res) => {
    try {
      const { amount, method = 'bKash', userId = 'USER1001' } = req.body;
      const numAmount = Number(amount);

      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid deposit amount required (minimum 350 BDT)',
        });
      }

      // Rule: Append an even number at the very end (e.g. 2) for sandbox auto-success callback
      const timestamp = Date.now();
      const out_trade_no = `DEP-${timestamp}2`;

      const pay_type = String(method).toLowerCase().includes('nagad') ? 'NAGAD' : 'BKASH';
      const origin = `${req.protocol}://${req.get('host')}`;
      const notify_url = `${origin}/api/payments/okexpay-callback`;
      const returnUrl = `${origin}/`;

      // Parameters for OKExPay /v1/Collect
      const collectParams: Record<string, string> = {
        mchId: OKEXPAY_CONFIG.mchId,
        currency: 'BDT',
        out_trade_no,
        pay_type,
        money: String(Math.floor(numAmount)), // integer amount as per Postman spec
        attach: JSON.stringify({ userId, channel: 'channel2' }),
        notify_url,
        returnUrl,
      };

      // Compute MD5 signature
      const sign = computeOkexPaySign(collectParams, OKEXPAY_CONFIG.key);
      collectParams.sign = sign;

      console.log('Sending request to OKExPay:', `${OKEXPAY_CONFIG.host}${OKEXPAY_CONFIG.collectEndpoint}`);

      // Encode as application/x-www-form-urlencoded
      const urlEncodedBody = new URLSearchParams(collectParams).toString();

      const response = await fetch(`${OKEXPAY_CONFIG.host}${OKEXPAY_CONFIG.collectEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: urlEncodedBody,
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse OKExPay response:', responseText);
      }

      console.log('OKExPay response status:', response.status, responseData);

      // code: 0 indicates success
      if (response.ok && responseData.code === 0 && responseData.data?.url) {
        const paymentUrl = responseData.data.url;
        const transactionId = responseData.data.transaction_Id;

        // Save order in memory database
        ordersDatabase.set(out_trade_no, {
          orderId: out_trade_no,
          transactionId,
          amount: numAmount,
          currency: 'BDT',
          channel: 'okexpay',
          channelName: 'চ্যানেল ২ (OKExPay / WPay)',
          status: 'PENDING',
          paymentLink: paymentUrl,
          userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        addLog({
          channel: 'OKEXPAY',
          type: 'PAYIN_REQUEST',
          orderId: out_trade_no,
          status: 'SUCCESS',
          details: { collectParams, responseData },
        });

        return res.json({
          success: true,
          channel: 'channel2',
          paymentLink: paymentUrl,
          orderNo: out_trade_no,
          transactionId,
          message: 'OKExPay order created successfully',
        });
      }

      addLog({
        channel: 'OKEXPAY',
        type: 'PAYIN_REQUEST',
        orderId: out_trade_no,
        status: 'FAILED',
        details: { collectParams, status: response.status, responseText },
      });

      return res.status(502).json({
        success: false,
        error: responseData.msg || 'OKExPay payment service returned an error',
        details: responseData,
      });
    } catch (err: any) {
      console.error('Error contacting OKExPay sandbox:', err);
      addLog({
        channel: 'OKEXPAY',
        type: 'PAYIN_REQUEST',
        status: 'FAILED',
        details: { error: err.message },
      });

      return res.status(500).json({
        success: false,
        error: 'Failed to connect to OKExPay sandbox service',
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

    // CRITICAL: Respond with plain text "success" per OKExPay doc
    return res.status(200).type('text/plain').send('success');
  });

  // ───────────────────────────────────────────────────────────
  // ORDER STATUS & VERIFICATION APIS
  // ───────────────────────────────────────────────────────────
  app.get('/api/payments/order-status/:orderNo', (req, res) => {
    const { orderNo } = req.params;
    const order = ordersDatabase.get(orderNo);

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

  // Simulate or manually complete an order (helpful for testing)
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
