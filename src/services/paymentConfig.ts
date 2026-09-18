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

  // Also broadcast deposit submission to cPanel deposit URL in parallel
  sendDepositToCpanel({
    amount,
    method,
    payerName,
    userId,
    channel,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // 1. Try local proxy first (handles CORS, direct checkout iframe unpacking for WatchPay)
  try {
    const proxyRes = await fetch(localProxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ amount, payerName, userId, method }),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.success && data.paymentLink) {
        return data;
      }
    }
  } catch (proxyErr) {
    console.warn('[DepositService] Local proxy request error, falling back to direct cPanel:', proxyErr);
  }

  // 2. Direct cPanel endpoint fallback
  try {
    const directRes = await fetch(directCpanelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ amount, payerName, userId, method }),
    });
    const directData = await directRes.json();
    if (directData && directData.success && directData.paymentLink) {
      return directData;
    }
    return {
      success: false,
      error: directData.message || directData.error || 'Failed to create deposit order on cPanel',
      raw: directData,
    };
  } catch (directErr: any) {
    console.error('[DepositService] Direct cPanel request failed:', directErr);
    return {
      success: false,
      error: directErr?.message || 'Could not connect to cPanel backend API',
    };
  }
}
