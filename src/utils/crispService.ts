import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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
    const snap = await getDoc(doc(db, 'settings', 'support'));
    if (snap.exists()) {
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
};

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

    // 1. Nickname / Display Name
    const displayName = user.name?.trim() || user.phone?.trim() || `NVT User ${user.memberId || ''}`;
    window.$crisp.push(['set', 'user:nickname', [displayName]]);

    // 2. Real Email (skip internal temporary email)
    if (user.email && !user.email.endsWith('@novavest.local') && user.email.includes('@')) {
      window.$crisp.push(['set', 'user:email', [user.email]]);
    }

    // 3. Phone number
    if (user.phone) {
      window.$crisp.push(['set', 'user:phone', [user.phone]]);
    }

    // 4. Session data for admin dashboard
    window.$crisp.push([
      'set',
      'session:data',
      [
        [
          ['Member ID', user.memberId || 'N/A'],
          ['Phone', user.phone || 'N/A'],
          ['Wallet Balance', user.walletBalance !== undefined ? `BDT ${user.walletBalance}` : 'BDT 0'],
          ['Member Since', user.memberSince || 'N/A'],
          ['Status', user.isVerified ? 'Verified' : 'Standard'],
        ],
      ],
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
