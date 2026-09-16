import { getDoc } from 'firebase/firestore';
import { safeDoc } from '../lib/firebase';
import { UserProfile } from '../types';

declare global {
  interface Window {
    $crisp: any[];
    CRISP_WEBSITE_ID: string;
    CRISP_TOKEN_ID?: string;
  }
}

export const DEFAULT_CRISP_WEBSITE_ID = '458178db-b2c7-4e37-b759-d377ae93554a';

export interface SupportSettings {
  whatsapp: string;
  telegram: string;
  hotline: string;
  crispWebsiteId: string;
  crispEnabled: boolean;
  supportEmail: string;
}

export const DEFAULT_SUPPORT_SETTINGS: SupportSettings = {
  whatsapp: 'https://chat.whatsapp.com/G4YxR5kXqZ01',
  telegram: 'https://t.me/NVTEnergySupport',
  hotline: '+880 9612-345678',
  crispWebsiteId: DEFAULT_CRISP_WEBSITE_ID,
  crispEnabled: true,
  supportEmail: 'support@novaterraenergy.io',
};

/**
 * Fetch support links and Crisp configuration from Firestore settings/support
 */
export const fetchSupportSettings = async (): Promise<SupportSettings> => {
  try {
    const sRef = safeDoc('settings', 'support');
    const snap = sRef ? await getDoc(sRef) : null;
    if (snap && snap.exists()) {
      const data = snap.data();
      return {
        whatsapp: data.whatsapp || DEFAULT_SUPPORT_SETTINGS.whatsapp,
        telegram: data.telegram || DEFAULT_SUPPORT_SETTINGS.telegram,
        hotline: data.hotline || DEFAULT_SUPPORT_SETTINGS.hotline,
        crispWebsiteId: data.crispWebsiteId || DEFAULT_CRISP_WEBSITE_ID,
        crispEnabled: data.crispEnabled !== false,
        supportEmail: data.supportEmail || DEFAULT_SUPPORT_SETTINGS.supportEmail,
      };
    }
  } catch (err) {
    console.warn('[CrispService] Failed to load support settings, using defaults:', err);
  }
  return DEFAULT_SUPPORT_SETTINGS;
};

/**
 * Initialize Crisp Chat Widget in the page
 */
export const initCrisp = (websiteId: string = DEFAULT_CRISP_WEBSITE_ID, enabled: boolean = true) => {
  if (typeof window === 'undefined') return;

  if (!enabled) {
    // If disabled, hide if already loaded
    if (window.$crisp) {
      try {
        window.$crisp.push(['do', 'chat:hide']);
      } catch {
        // ignore
      }
    }
    return;
  }

  // Set up crisp array and website ID
  window.$crisp = window.$crisp || [];
  window.CRISP_WEBSITE_ID = websiteId || DEFAULT_CRISP_WEBSITE_ID;

  // Safe mode prevents errors if blocked
  window.$crisp.push(['safe', true]);

  // Apply floating launcher offset so it floats above the bottom navigation bar and never blocks Profile
  applyCrispFloatingOffset();

  // Check if script already appended
  const existingScript = document.getElementById('crisp-chat-script');
  if (!existingScript) {
    const d = document;
    const s = d.createElement('script');
    s.id = 'crisp-chat-script';
    s.src = 'https://client.crisp.chat/l.js';
    s.async = true;
    d.getElementsByTagName('head')[0]?.appendChild(s);
  } else {
    // Already injected, make sure it is shown
    try {
      window.$crisp.push(['do', 'chat:show']);
    } catch {
      // ignore
    }
  }

  // Ensure offset remains applied after DOM injection
  setTimeout(applyCrispFloatingOffset, 300);
  setTimeout(applyCrispFloatingOffset, 1200);
};

/**
 * Ensures Crisp's floating chat launcher sits above the mobile bottom navigation bar,
 * completely clearing the Profile button and all bottom nav tabs.
 */
export const applyCrispFloatingOffset = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
    // Set Crisp's native CSS variables
    document.documentElement.style.setProperty('--crisp-customization-default-button-vertical', '82px', 'important');
    document.documentElement.style.setProperty('--crisp-customization-mobile-button-vertical', '82px', 'important');
    document.documentElement.style.setProperty('--crisp-override-env-safe-area-inset-bottom', '82px', 'important');

    // Also directly style any rendered launcher elements
    const adjustDomElements = () => {
      const selectors = [
        '.crisp-client .cc-13wro',
        '.crisp-client .cc-165wh .cc-lk42u .cc-13wro',
        '.crisp-client [data-is-launcher="true"]',
        '.crisp-client [data-chat-status]',
        '.crisp-client .cc-1gfkz',
        '.crisp-client .cc-tup6',
      ];
      const found = document.querySelectorAll<HTMLElement>(selectors.join(', '));
      found.forEach((el) => {
        el.style.setProperty('bottom', 'calc(82px + env(safe-area-inset-bottom, 0px))', 'important');
        el.style.setProperty('margin-bottom', '0px', 'important');
        el.style.setProperty('z-index', '45', 'important');
      });
    };

    adjustDomElements();

    // Attach observer if not already attached
    if (!(window as any).__crisp_observer_attached && document.body) {
      (window as any).__crisp_observer_attached = true;
      const observer = new MutationObserver(() => {
        adjustDomElements();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  } catch {
    // ignore
  }
};

// Immediately invoke offset if loaded in browser
if (typeof window !== 'undefined') {
  applyCrispFloatingOffset();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCrispFloatingOffset);
  }
}

// Global error guard for third-party Crisp Chat SDK
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event?.message?.includes('Invalid data') ||
      event?.filename?.includes('crisp.chat') ||
      event?.message?.includes('crisp')
    ) {
      try {
        event.preventDefault?.();
        event.stopPropagation?.();
      } catch {
        // ignore
      }
      console.warn('[Crisp] Safely handled client event:', event?.message);
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = String(event?.reason?.message || event?.reason || '');
    if (reasonMsg.includes('Invalid data') || reasonMsg.includes('crisp')) {
      try {
        event.preventDefault?.();
        event.stopPropagation?.();
      } catch {
        // ignore
      }
      console.warn('[Crisp] Safely handled unhandled rejection:', reasonMsg);
    }
  });
}

/**
 * Sync logged-in user profile with Crisp session
 * Admin will see User Name, Phone, Member ID and Balance right in Crisp dashboard / mobile app!
 */
export const syncUserWithCrisp = (user: UserProfile | null) => {
  if (typeof window === 'undefined' || !window.$crisp) return;

  try {
    if (!user) {
      // Guest / Anonymous visitor
      return;
    }

    // 1. Nickname / Display Name (must be non-empty string <= 50 chars)
    const displayName = (user.name?.trim() || user.phone?.trim() || `NVT User ${user.memberId || ''}`).slice(0, 50);
    if (displayName) {
      window.$crisp.push(['set', 'user:nickname', [displayName]]);
    }

    // 2. Real Email (skip internal temporary email)
    if (user.email && !user.email.endsWith('@novavest.local') && user.email.includes('@')) {
      const cleanEmail = user.email.trim();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        window.$crisp.push(['set', 'user:email', [cleanEmail]]);
      }
    }

    // 3. Phone number (must adhere to phone format)
    if (user.phone && typeof user.phone === 'string') {
      const cleanPhone = user.phone.trim();
      if (/^\+?[0-9\s\-()]{7,25}$/.test(cleanPhone)) {
        window.$crisp.push(['set', 'user:phone', [cleanPhone]]);
      }
    }

    // 4. Session data for admin dashboard
    // NOTE: Crisp session:data keys MUST conform strictly to /^[A-Za-z0-9_-]{1,50}$/ (NO SPACES ALLOWED!)
    // and values must be string, number, or boolean. Spaces in keys cause Crisp to throw "Invalid data".
    const sessionEntries: [string, string | number | boolean][] = [
      ['member_id', String(user.memberId || 'N/A')],
      ['phone', String(user.phone || 'N/A')],
      ['wallet_balance', typeof user.walletBalance === 'number' && Number.isFinite(user.walletBalance) ? user.walletBalance : 0],
      ['member_since', String(user.memberSince || 'N/A')],
      ['status', user.isVerified ? 'Verified' : 'Standard'],
    ];

    window.$crisp.push([
      'set',
      'session:data',
      [sessionEntries],
    ]);
  } catch (err) {
    console.warn('[CrispService] Error syncing user with Crisp:', err);
  }
};

/**
 * Opens the Crisp chatbox on screen
 */
export const openCrispChat = () => {
  if (typeof window === 'undefined') return;

  if (!window.$crisp) {
    initCrisp();
  }

  try {
    window.$crisp = window.$crisp || [];
    window.$crisp.push(['do', 'chat:show']);
    window.$crisp.push(['do', 'chat:open']);

    // Also trigger the launcher element if present in DOM to ensure immediate expansion
    setTimeout(() => {
      try {
        if (window.$crisp) {
          window.$crisp.push(['do', 'chat:show']);
          window.$crisp.push(['do', 'chat:open']);
        }
        const launcher = document.querySelector(
          '.crisp-client [data-is-launcher="true"], .crisp-client .cc-tup6, .crisp-client [data-chat-status]'
        ) as HTMLElement | null;
        if (launcher) {
          launcher.click();
        }
      } catch {
        // ignore
      }
    }, 80);
  } catch (err) {
    console.warn('[CrispService] Error opening Crisp chat:', err);
  }
};

/**
 * Closes the Crisp chatbox
 */
export const closeCrispChat = () => {
  if (typeof window === 'undefined' || !window.$crisp) return;
  try {
    window.$crisp.push(['do', 'chat:close']);
  } catch {
    // ignore
  }
};
