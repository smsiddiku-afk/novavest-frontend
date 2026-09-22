/**
 * cPanel Payment & Deposit Gateway Configuration
 * Primary Base URL: https://api.nvtenergy.online
 * Deposit URL: https://api.nvtenergy.online/deposit
 */

export const CPANEL_BASE_URL = 'https://api.nvtenergy.online';
export const CPANEL_DEPOSIT_URL = 'https://api.nvtenergy.online/deposit';

// Specific endpoints on cPanel Node.js / Express backend
export const CPANEL_ENDPOINTS = {
  deposit: `${CPANEL_BASE_URL}/deposit`,
  apiDeposit: `${CPANEL_BASE_URL}/api/deposit`,
  nekpayCreateOrder: `${CPANEL_BASE_URL}/api/v1/nekpay/create-order`,
  watchpayCreateOrder: `${CPANEL_BASE_URL}/create-order-watchpay`,
  orderStatus: (orderNo: string) => `${CPANEL_BASE_URL}/order-status/${encodeURIComponent(orderNo)}`,
  gatewayCallback: `${CPANEL_BASE_URL}/api/payments/gateway-callback`,
  submitTxnId: `${CPANEL_BASE_URL}/api/payments/submit-txnid`,
};

export interface DepositRequestParams {
  amount: number;
  method?: string;
  payerName?: string;
  userId?: string;
  channel?: 'channel1' | 'channel2' | 'gogopay' | 'manual' | string;
  orderNo?: string;
  trxId?: string;
  senderPhone?: string;
  status?: string;
  [key: string]: any;
}

/**
 * Dispatch deposit notification, transaction callbacks, or webhook submissions
 * directly to the cPanel backend API URL: https://api.nvtenergy.online/deposit
 */
export async function sendDepositToCpanel(
  payload: DepositRequestParams
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(CPANEL_DEPOSIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return { success: res.ok, data };
  } catch (err: any) {
    console.warn('[cPanel Deposit API Notice]', err?.message || err);
    return { success: false, error: err?.message || 'Network error connecting to cPanel' };
  }
}

/**
 * Helper to sanitize gateway payment links so returnUrl/redirectUrl always points to the user's active domain,
 * completely preventing the user from being redirected to Firebase hosting links (novavest-a711c.web.app) or getting logged out.
 */
export function sanitizePaymentLink(
  rawLink: string,
  clientOrigin?: string,
  orderNo?: string,
  amount?: number,
  channel: string = 'channel1'
): string {
  if (!rawLink || typeof rawLink !== 'string') return rawLink;

  const origin = clientOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://nvtenergy.online');
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanOrderNo = orderNo || `ORD-${Date.now()}`;
  const numAmount = amount || 0;
  const returnTarget = `${cleanOrigin}/?payment_status=SUCCESS&orderNo=${encodeURIComponent(cleanOrderNo)}&amount=${numAmount}&channel=${encodeURIComponent(channel)}&gateway=nekpay`;

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
}

/**
 * Creates a deposit order via cPanel backend API.
 * Tries direct cPanel endpoint and gracefully falls back to local server proxy.
 * Can be called with an object or positional arguments.
 */
export async function createCpanelDepositOrder(
  paramsOrChannel: DepositRequestParams | string,
  amountArg?: number,
  payerNameArg?: string,
  userIdArg?: string,
  methodArg?: string
): Promise<{
  success: boolean;
  paymentLink?: string;
  orderNo?: string;
  channel?: string;
  error?: string;
  raw?: any;
}> {
  let params: DepositRequestParams;

  if (typeof paramsOrChannel === 'string') {
    params = {
      channel: paramsOrChannel,
      amount: amountArg || 0,
      payerName: payerNameArg || 'Customer',
      userId: userIdArg || 'USER1001',
      method: methodArg || 'bKash',
    };
  } else {
    params = paramsOrChannel;
  }

  const { amount, channel = 'channel1', payerName = 'Customer', userId = 'USER1001', method = 'bKash' } = params;
  const clientOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://nvtenergy.online';

  // Choose the appropriate target URL on the cPanel backend
  let directCpanelUrl = CPANEL_ENDPOINTS.nekpayCreateOrder;
  let localProxyUrl = '/api/v1/nekpay/create-order';

  if (channel === 'channel2') {
    directCpanelUrl = CPANEL_ENDPOINTS.watchpayCreateOrder;
    localProxyUrl = '/api/v1/watchpay/create-order';
  } else if (channel === 'gogopay') {
    directCpanelUrl = CPANEL_ENDPOINTS.nekpayCreateOrder;
    localProxyUrl = '/api/v1/gogopay/create-order';
  }

  // Non-blocking broadcast deposit submission to cPanel deposit URL in parallel
  sendDepositToCpanel({
    amount,
    method,
    payerName,
    userId,
    channel,
    clientOrigin,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  const cleanOrigin = clientOrigin.replace(/\/+$/, '');
  const returnTarget = `${cleanOrigin}/?payment_status=SUCCESS&amount=${amount}&channel=${encodeURIComponent(channel)}&gateway=nekpay`;

  const requestBody = JSON.stringify({
    amount,
    payerName,
    userId,
    method,
    channel,
    clientOrigin,
    return_url: returnTarget,
    returnUrl: returnTarget,
    callback_url: returnTarget,
    redirect_url: returnTarget,
    redirectUrl: returnTarget,
    success_url: returnTarget,
    cancel_url: `${cleanOrigin}/profile`,
  });

  // 1. Try local proxy first (timeout of 6s)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const proxyRes = await fetch(localProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: requestBody,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.success && data.paymentLink) {
        data.paymentLink = sanitizePaymentLink(data.paymentLink, clientOrigin, data.orderNo, amount, channel);
        return data;
      }
    }
  } catch (proxyErr) {
    console.warn('[DepositService] Local proxy request error or timeout, checking direct fallback:', proxyErr);
  }

  // 2. Direct cPanel endpoint fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const directRes = await fetch(directCpanelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: requestBody,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const directData = await directRes.json();
    if (directData && directData.success && directData.paymentLink) {
      directData.paymentLink = sanitizePaymentLink(directData.paymentLink, clientOrigin, directData.orderNo, amount, channel);
      return directData;
    }
  } catch (directErr: any) {
    console.warn('[DepositService] Direct cPanel request failed, generating client-side Cashier checkout:', directErr);
  }

  // 3. High-availability client-side Cashier link fallback
  const fallbackOrderNo = `DEP-${Date.now()}`;
  const fallbackPaymentLink = `${cleanOrigin}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}?amount=${amount}&method=${encodeURIComponent(method)}&channel=${encodeURIComponent(channel)}`;
  return {
    success: true,
    channel,
    paymentLink: fallbackPaymentLink,
    orderNo: fallbackOrderNo,
    isFallback: true,
  };
}
