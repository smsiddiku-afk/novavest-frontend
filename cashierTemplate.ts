export interface CashierOrderData {
  orderId: string;
  amount: number;
  channel?: string;
  channelName?: string;
  method?: string;
  userId?: string;
  payerName?: string;
  status?: string;
}

export function generateCashierHtml(order: CashierOrderData, clientOrigin: string = ''): string {
  const safeOrderId = String(order.orderId || 'NVT-DEP-' + Date.now()).replace(/[<>"']/g, '');
  const safeAmount = Number(order.amount || 100);
  const safeMethod = String(order.method || 'bKash').toLowerCase().includes('nagad')
    ? 'Nagad'
    : String(order.method || '').toLowerCase().includes('rocket')
    ? 'Rocket'
    : 'bKash';
  const safeUserId = String(order.userId || 'USER1001').replace(/[<>"']/g, '');
  const safeChannel = String(order.channel || 'channel1').replace(/[<>"']/g, '');

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>NVT Energy - সিকিউর পেমেন্ট ক্যাশিয়ার</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    body {
      background: #04140e;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 16px 12px 32px;
    }
    .container {
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #062c22;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 20px;
      margin-bottom: 14px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #10b981, #059669);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      color: #022c22;
      box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
    }
    .brand-title {
      font-size: 15px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.2;
    }
    .brand-sub {
      font-size: 11px;
      color: #34d399;
      font-weight: 600;
    }
    .timer-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #021a13;
      border: 1px solid rgba(245, 158, 11, 0.4);
      padding: 6px 10px;
      border-radius: 12px;
      font-family: monospace;
      font-size: 13px;
      font-weight: 800;
      color: #fbbf24;
    }
    .timer-dot {
      width: 7px;
      height: 7px;
      background: #fbbf24;
      border-radius: 50%;
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.3; transform: scale(0.8); }
    }
    .card {
      background: #062c22;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 24px;
      padding: 20px 16px;
      margin-bottom: 14px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
    }
    .amount-box {
      text-align: center;
      padding: 18px 12px;
      background: linear-gradient(180deg, #031c15, #02130e);
      border: 1px solid rgba(16, 185, 129, 0.35);
      border-radius: 18px;
      margin-bottom: 18px;
      position: relative;
      overflow: hidden;
    }
    .amount-label {
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .amount-value {
      font-size: 32px;
      font-weight: 900;
      color: #34d399;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      text-shadow: 0 0 20px rgba(52, 211, 153, 0.4);
    }
    .order-meta {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed rgba(16, 185, 129, 0.2);
      font-size: 11px;
      color: #94a3b8;
    }
    .order-meta span strong {
      color: #e2e8f0;
      font-family: monospace;
    }
    .method-selector {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }
    .method-btn {
      padding: 12px 6px;
      background: #031c15;
      border: 2px solid rgba(16, 185, 129, 0.25);
      border-radius: 16px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      color: #cbd5e1;
    }
    .method-btn.active.bkash {
      background: #180911;
      border-color: #e2136e;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(226, 19, 110, 0.35);
    }
    .method-btn.active.nagad {
      background: #190c05;
      border-color: #f7941d;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(247, 148, 29, 0.35);
    }
    .method-btn.active.rocket {
      background: #14081c;
      border-color: #8c3494;
      color: #ffffff;
      box-shadow: 0 0 15px rgba(140, 52, 148, 0.35);
    }
    .method-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 12px;
    }
    .bkash-icon { background: #e2136e; color: #fff; }
    .nagad-icon { background: #f7941d; color: #fff; }
    .rocket-icon { background: #8c3494; color: #fff; }
    .method-name {
      font-size: 12px;
      font-weight: 800;
    }
    .agent-box {
      background: #021a13;
      border: 2px dashed rgba(16, 185, 129, 0.5);
      border-radius: 18px;
      padding: 16px;
      margin-bottom: 16px;
      text-align: center;
    }
    .agent-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      margin-bottom: 8px;
    }
    .agent-number {
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: #ffffff;
      font-family: monospace;
      margin-bottom: 10px;
    }
    .copy-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #10b981;
      color: #022c22;
      border: none;
      padding: 8px 18px;
      border-radius: 12px;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .copy-btn:active {
      transform: scale(0.96);
    }
    .copy-btn.copied {
      background: #059669;
      color: #ffffff;
    }
    .instructions {
      background: #031c15;
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 18px;
      font-size: 12px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .instructions-title {
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .instructions ol {
      padding-left: 18px;
    }
    .instructions li {
      margin-bottom: 4px;
    }
    .instructions li strong {
      color: #34d399;
    }
    .instructions .warning {
      color: #fbbf24;
      font-weight: 700;
      display: block;
      margin-top: 6px;
    }
    .input-group {
      margin-bottom: 14px;
    }
    .input-label {
      display: block;
      font-size: 12px;
      font-weight: 800;
      color: #f1f5f9;
      margin-bottom: 6px;
    }
    .trx-input {
      width: 100%;
      background: #021a13;
      border: 2px solid rgba(16, 185, 129, 0.4);
      border-radius: 14px;
      padding: 14px 16px;
      color: #ffffff;
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      outline: none;
      transition: border-color 0.2s;
    }
    .trx-input:focus {
      border-color: #34d399;
      box-shadow: 0 0 15px rgba(52, 211, 153, 0.25);
    }
    .submit-btn {
      width: 100%;
      padding: 16px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #022c22;
      border: none;
      border-radius: 16px;
      font-size: 15px;
      font-weight: 900;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
      transition: all 0.2s ease;
    }
    .submit-btn:hover {
      background: linear-gradient(135deg, #34d399, #10b981);
    }
    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .cancel-link {
      display: block;
      text-align: center;
      margin-top: 14px;
      font-size: 13px;
      font-weight: 700;
      color: #94a3b8;
      text-decoration: none;
      transition: color 0.2s;
    }
    .cancel-link:hover {
      color: #e2e8f0;
    }
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(2, 20, 15, 0.9);
      backdrop-filter: blur(8px);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1000;
    }
    .modal-card {
      background: #062c22;
      border: 2px solid #10b981;
      border-radius: 24px;
      padding: 24px 20px;
      text-align: center;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
      animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes popIn {
      from { transform: scale(0.85); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .success-icon {
      width: 60px;
      height: 60px;
      background: rgba(16, 185, 129, 0.2);
      border: 2px solid #10b981;
      border-radius: 50%;
      margin: 0 auto 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #34d399;
      font-size: 32px;
    }
    .status-msg {
      margin-top: 10px;
      font-size: 12px;
      font-weight: 700;
      min-height: 18px;
      text-align: center;
    }
    .status-msg.error { color: #f87171; }
    .status-msg.success { color: #34d399; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Header -->
    <div class="header">
      <div class="brand">
        <div class="brand-icon">⚡</div>
        <div>
          <div class="brand-title">NVT Energy Pay</div>
          <div class="brand-sub">সিকিউর পেমেন্ট ক্যাশিয়ার</div>
        </div>
      </div>
      <div class="timer-badge">
        <div class="timer-dot"></div>
        <span id="countdown">14:59</span>
      </div>
    </div>

    <!-- Main Payment Card -->
    <div class="card">
      <!-- Amount Display -->
      <div class="amount-box">
        <div class="amount-label">প্রদেয় রিচার্জ পরিমাণ</div>
        <div class="amount-value">
          <span>৳</span>
          <span>${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div class="order-meta">
          <span>অর্ডার: <strong>${safeOrderId}</strong></span>
          <span>আইডি: <strong>${safeUserId}</strong></span>
        </div>
      </div>

      <!-- Payment Method Switcher -->
      <div class="method-selector">
        <div class="method-btn ${safeMethod === 'bKash' ? 'active bkash' : ''}" onclick="selectMethod('bKash')">
          <div class="method-icon bkash-icon">৳</div>
          <div class="method-name">bKash</div>
        </div>
        <div class="method-btn ${safeMethod === 'Nagad' ? 'active nagad' : ''}" onclick="selectMethod('Nagad')">
          <div class="method-icon nagad-icon">ন</div>
          <div class="method-name">Nagad</div>
        </div>
        <div class="method-btn ${safeMethod === 'Rocket' ? 'active rocket' : ''}" onclick="selectMethod('Rocket')">
          <div class="method-icon rocket-icon">R</div>
          <div class="method-name">Rocket</div>
        </div>
      </div>

      <!-- Official Agent Number Box -->
      <div class="agent-box">
        <div class="agent-badge" id="agentBadgeTitle">বিকাশ এজেন্ট (Cash Out)</div>
        <div class="agent-number" id="agentNumberDisplay">01712-345678</div>
        <button class="copy-btn" id="copyBtn" onclick="copyAgentNumber()">
          <span>📋</span>
          <span id="copyBtnText">নম্বর কপি করুন</span>
        </button>
      </div>

      <!-- Instructions -->
      <div class="instructions">
        <div class="instructions-title">
          <span>ℹ️</span>
          <span>ডিপোজিট করার সহজ নিয়ম:</span>
        </div>
        <ol>
          <li>আপনার <strong id="stepMethodName">bKash</strong> অ্যাপে গিয়ে <strong>"Cash Out" (ক্যাশ আউট)</strong> সিলেক্ট করুন।</li>
          <li>উপরে দেওয়া এজেন্ট নম্বরটি দিন এবং সঠিক পরিমাণ <strong>৳${safeAmount}</strong> সেন্ড করুন।</li>
          <li>ক্যাশ আউট সফল হলে SMS বা স্টেটমেন্ট থেকে প্রাপ্ত <strong>TrxID (ট্রানজেকশন আইডি)</strong> নিচের ঘরে দিন।</li>
        </ol>
        <span class="warning">⚠️ সতর্কতা: শুধুমাত্র ক্যাশ আউট করবেন। Send Money প্রযোজ্য নয়।</span>
      </div>

      <!-- TrxID Form -->
      <div class="input-group">
        <label class="input-label" for="trxIdInput">ট্রানজেকশন আইডি (TrxID) লিখুন:</label>
        <input
          type="text"
          id="trxIdInput"
          class="trx-input"
          placeholder="যেমন: BKD3X79KL9"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          maxlength="25"
        />
      </div>

      <div class="status-msg" id="statusMessage"></div>

      <button id="submitBtn" class="submit-btn" onclick="submitDeposit()">
        <span>✓</span>
        <span>ভেরিফাই ও রিচার্জ সম্পন্ন করুন</span>
      </button>

      <a href="/profile" class="cancel-link">← বাতিল করে অ্যাপে ফিরে যান</a>
    </div>
  </div>

  <!-- Success Modal Overlay -->
  <div class="modal-overlay" id="successModal">
    <div class="modal-card">
      <div class="success-icon">✓</div>
      <h3 style="color:#ffffff;font-size:18px;font-weight:900;margin-bottom:6px;">ডিপোজিট সফল হয়েছে!</h3>
      <p style="color:#34d399;font-size:13px;font-weight:700;margin-bottom:14px;">
        ৳${safeAmount} আপনার অ্যাকাউন্টে যোগ করা হচ্ছে...
      </p>
      <div style="font-size:12px;color:#94a3b8;">অনুগ্রহ করে অপেক্ষা করুন, অ্যাপে রিডাইরেক্ট করা হচ্ছে।</div>
    </div>
  </div>

  <script>
    const orderData = {
      orderId: "${safeOrderId}",
      amount: ${safeAmount},
      userId: "${safeUserId}",
      channel: "${safeChannel}",
      initialMethod: "${safeMethod}",
      origin: "${clientOrigin || ''}"
    };

    const CASHOUT_NUMBERS = {
      bKash: { number: "01712-345678", label: "বিকাশ এজেন্ট (Cash Out)" },
      Nagad: { number: "01844-992211", label: "নগদ এজেন্ট (Cash Out)" },
      Rocket: { number: "01911-223344", label: "রকেট এজেন্ট (Cash Out)" }
    };

    let activeMethod = orderData.initialMethod || 'bKash';

    function selectMethod(method) {
      activeMethod = method;
      document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.remove('active', 'bkash', 'nagad', 'rocket');
      });
      const selectedBtn = Array.from(document.querySelectorAll('.method-btn')).find(btn =>
        btn.innerText.includes(method)
      );
      if (selectedBtn) {
        selectedBtn.classList.add('active', method.toLowerCase());
      }

      const info = CASHOUT_NUMBERS[method] || CASHOUT_NUMBERS.bKash;
      document.getElementById('agentBadgeTitle').innerText = info.label;
      document.getElementById('agentNumberDisplay').innerText = info.number;
      document.getElementById('stepMethodName').innerText = method;

      const copyBtn = document.getElementById('copyBtn');
      copyBtn.classList.remove('copied');
      document.getElementById('copyBtnText').innerText = 'নম্বর কপি করুন';
    }

    function copyAgentNumber() {
      const num = document.getElementById('agentNumberDisplay').innerText.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(num).then(onCopied).catch(fallbackCopy);
      } else {
        fallbackCopy();
      }
    }

    function fallbackCopy() {
      const num = document.getElementById('agentNumberDisplay').innerText.trim();
      const ta = document.createElement('textarea');
      ta.value = num;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); onCopied(); } catch(e){}
      document.body.removeChild(ta);
    }

    function onCopied() {
      const copyBtn = document.getElementById('copyBtn');
      copyBtn.classList.add('copied');
      document.getElementById('copyBtnText').innerText = '✓ নম্বর কপি হয়েছে!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        document.getElementById('copyBtnText').innerText = 'নম্বর কপি করুন';
      }, 2500);
    }

    // 15-Minute Countdown Timer
    let totalSeconds = 15 * 60;
    const timerElem = document.getElementById('countdown');
    const timerInterval = setInterval(() => {
      totalSeconds--;
      if (totalSeconds <= 0) {
        clearInterval(timerInterval);
        timerElem.innerText = "00:00";
        return;
      }
      const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const s = (totalSeconds % 60).toString().padStart(2, '0');
      timerElem.innerText = m + ':' + s;
    }, 1000);

    // Auto-poll order status in case user paid via gateway webhook
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/payments/order-status/' + encodeURIComponent(orderData.orderId));
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.order && (data.order.status === 'COMPLETED' || data.order.status === 'SUCCESS')) {
            clearInterval(pollInterval);
            showSuccessAndRedirect(data.order.trxId || orderData.orderId);
          }
        }
      } catch (e) {}
    }, 3500);

    async function submitDeposit() {
      const trxInput = document.getElementById('trxIdInput');
      const statusElem = document.getElementById('statusMessage');
      const submitBtn = document.getElementById('submitBtn');
      const rawTrx = (trxInput.value || '').trim().toUpperCase();

      if (!rawTrx || rawTrx.length < 4) {
        statusElem.className = 'status-msg error';
        statusElem.innerText = 'অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) লিখুন';
        trxInput.focus();
        return;
      }

      submitBtn.disabled = true;
      statusElem.className = 'status-msg';
      statusElem.innerText = 'যাচাই করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...';

      try {
        // 1. Submit TrxID to backend
        const res = await fetch('/api/payments/submit-txnid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNo: orderData.orderId,
            trxId: rawTrx,
            amount: orderData.amount,
            method: activeMethod,
            userId: orderData.userId,
            channel: orderData.channel
          })
        });

        // 2. Complete order status in server orders database
        try {
          await fetch('/api/payments/complete-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNo: orderData.orderId })
          });
        } catch (_) {}

        showSuccessAndRedirect(rawTrx);
      } catch (err) {
        console.error('Submit error:', err);
        statusElem.className = 'status-msg error';
        statusElem.innerText = 'সংযোগ বিচ্ছিন্ন হয়েছে, পুনরায় চেষ্টা করুন।';
        submitBtn.disabled = false;
      }
    }

    function showSuccessAndRedirect(trxId) {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
      const modal = document.getElementById('successModal');
      modal.style.display = 'flex';

      setTimeout(() => {
        const returnUrl = (orderData.origin || window.location.origin) +
          '/?payment_status=SUCCESS' +
          '&orderNo=' + encodeURIComponent(orderData.orderId) +
          '&amount=' + encodeURIComponent(orderData.amount) +
          '&trxId=' + encodeURIComponent(trxId) +
          '&channel=' + encodeURIComponent(orderData.channel) +
          '&method=' + encodeURIComponent(activeMethod) +
          '&gateway=cashier';
        window.location.href = returnUrl;
      }, 1400);
    }

    // Set initial method
    selectMethod(orderData.initialMethod);
  </script>
</body>
</html>`;
}
