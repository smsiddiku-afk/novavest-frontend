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
  channel: string = 'channel1',
  method: string = 'bKash'
): string {
  if (!rawLink || typeof rawLink !== 'string') return rawLink;

  const origin = clientOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://nvtenergy.online');
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanOrderNo = orderNo || `ORD-${Date.now()}`;
  const numAmount = amount || 0;
  const cleanMethod = String(method || '').toLowerCase().includes('nagad') ? 'Nagad' : String(method || '').toLowerCase().includes('rocket') ? 'Rocket' : 'bKash';
  const returnTarget = `${cleanOrigin}/payment-result?payment_status=PENDING&payment_return=1&orderNo=${encodeURIComponent(cleanOrderNo)}&amount=${numAmount}&channel=channel1&method=${encodeURIComponent(cleanMethod)}&gateway=nekpay`;

  let processed = rawLink;

  // Direct replacement of any Firebase hosting URL occurrences (raw & encoded)
  try {
    processed = processed
      .replace(/https%3A%2F%2Fnovavest-a711c\.web\.app[^&"'\s]*/gi, encodeURIComponent(returnTarget))
      .replace(/https:\/\/novavest-a711c\.web\.app[^&"'\s]*/gi, encodeURIComponent(returnTarget))
      .replace(/https%3A%2F%2Fnovavest-a711c\.firebaseapp\.com[^&"'\s]*/gi, encodeURIComponent(returnTarget))
      .replace(/https:\/\/novavest-a711c\.firebaseapp\.com[^&"'\s]*/gi, encodeURIComponent(returnTarget));
  } catch (_) {}

  try {
    const url = new URL(processed);
    const redirectKeys = ['returnUrl', 'return_url', 'redirectUrl', 'redirect_url', 'callbackUrl', 'callback_url', 'successUrl', 'success_url'];
    for (const k of redirectKeys) {
      if (url.searchParams.has(k)) {
        url.searchParams.set(k, returnTarget);
      }
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
  isFallback?: boolean;
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
  const effectiveChannel = 'channel1';

  // Choose the appropriate target URL on the cPanel backend (Channel 1: Nekpay)
  const directCpanelUrl = CPANEL_ENDPOINTS.nekpayCreateOrder;
  const localProxyUrl = '/api/v1/nekpay/create-order';

  // Non-blocking broadcast deposit submission to cPanel deposit URL in parallel
  sendDepositToCpanel({
    amount,
    method,
    payerName,
    userId,
    channel: effectiveChannel,
    clientOrigin,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  const cleanOrigin = clientOrigin.replace(/\/+$/, '');
  const returnTarget = `${cleanOrigin}/payment-result?payment_status=PENDING&payment_return=1&amount=${amount}&channel=channel1&method=${encodeURIComponent(method)}&gateway=nekpay`;

  const requestBody = JSON.stringify({
    amount,
    payerName,
    userId,
    method,
    channel: effectiveChannel,
    clientOrigin,
    return_url: returnTarget,
    returnUrl: returnTarget,
    redirect_url: returnTarget,
    redirectUrl: returnTarget,
    callback_url: `${CPANEL_BASE_URL}/nekpay-callback`,
    callbackUrl: `${CPANEL_BASE_URL}/nekpay-callback`,
    notify_url: `${CPANEL_BASE_URL}/nekpay-callback`,
    notifyUrl: `${CPANEL_BASE_URL}/nekpay-callback`,
    ipn_url: `${CPANEL_BASE_URL}/nekpay-callback`,
    webhook_url: `${CPANEL_BASE_URL}/nekpay-callback`,
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
      if (data && data.success) {
        const orderId = data.orderNo || `DEP-${Date.now()}`;
        const cashierUrl = `${cleanOrigin}/pay/checkout/${encodeURIComponent(orderId)}?amount=${amount}&method=${encodeURIComponent(method)}&channel=channel1&userId=${encodeURIComponent(userId)}`;
        data.rawPaymentLink = data.paymentLink;
        // Keep real payment link from Nekpay/Go-Go-Pay, fall back to Cashier only if none provided
        data.paymentLink = data.paymentLink || cashierUrl;
        data.orderNo = orderId;
        data.channel = 'channel1';
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
    if (directData && directData.success) {
      const orderId = directData.orderNo || `DEP-${Date.now()}`;
      const cashierUrl = `${cleanOrigin}/pay/checkout/${encodeURIComponent(orderId)}?amount=${amount}&method=${encodeURIComponent(method)}&channel=channel1&userId=${encodeURIComponent(userId)}`;
      directData.rawPaymentLink = directData.paymentLink;
      directData.paymentLink = directData.paymentLink || cashierUrl;
      directData.orderNo = orderId;
      directData.channel = 'channel1';
      return directData;
    }
  } catch (directErr: any) {
    console.warn('[DepositService] Direct cPanel request failed, generating client-side Cashier checkout:', directErr);
  }

  // 3. High-availability client-side Cashier link fallback
  const fallbackOrderNo = `DEP-${Date.now()}`;
  const fallbackPaymentLink = `${cleanOrigin}/pay/checkout/${encodeURIComponent(fallbackOrderNo)}?amount=${amount}&method=${encodeURIComponent(method)}&channel=channel1&userId=${encodeURIComponent(userId)}`;
  return {
    success: true,
    channel: 'channel1',
    paymentLink: fallbackPaymentLink,
    orderNo: fallbackOrderNo,
    isFallback: true,
  };
}
