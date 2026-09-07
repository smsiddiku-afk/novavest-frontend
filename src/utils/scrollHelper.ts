// Comprehensive Scroll to Top Utility
// Guarantees immediate, flicker-free reset to top across all devices, mobile viewports, and iframes.

export const scrollAppToTop = (options?: { smooth?: boolean }) => {
  if (typeof window === 'undefined') return;

  // 1. Unfocus any clicked bottom navigation button or active element
  if (document.activeElement && 'blur' in document.activeElement) {
    try {
      (document.activeElement as HTMLElement).blur();
    } catch {
      // ignore
    }
  }

  // 2. Prevent browser history API from restoring stale bottom scroll offsets
  if ('scrollRestoration' in window.history) {
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      // ignore
    }
  }

  const performScroll = () => {
    const behavior = options?.smooth ? 'smooth' : ('instant' as ScrollBehavior);

    // Window scroll
    try {
      window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
      window.scrollTo(0, 0);
    }

    // Standard document elements
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;

    // Root element and phone frame container
    const root = document.getElementById('root');
    if (root) root.scrollTop = 0;

    const cosmicWrapper = document.getElementById('cosmic-background-wrapper');
    if (cosmicWrapper) cosmicWrapper.scrollTop = 0;

    const phoneFrame = document.getElementById('profile-phone-frame');
    if (phoneFrame) phoneFrame.scrollTop = 0;

    const cleanWallet = document.getElementById('clean-wallet-screen');
    if (cleanWallet) cleanWallet.scrollTop = 0;

    // Anchor elements at the top of pages
    const anchors = [
      document.getElementById('auth-top-anchor'),
      document.getElementById('page-top-anchor'),
      document.getElementById('profile-top-anchor'),
      document.getElementById('promo-bonus-top'),
      document.getElementById('invest-tab-top'),
    ];

    for (const anchor of anchors) {
      if (anchor && 'scrollIntoView' in anchor) {
        try {
          anchor.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
          break;
        } catch {
          anchor.scrollIntoView(true);
          break;
        }
      }
    }
  };

  // Immediate execution
  performScroll();

  // Subsequent layout/paint cycles execution
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      performScroll();
      requestAnimationFrame(performScroll);
    });
  }

  setTimeout(performScroll, 10);
  setTimeout(performScroll, 40);
  setTimeout(performScroll, 100);
  setTimeout(performScroll, 250);
};
