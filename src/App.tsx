import React, { useState, useEffect } from 'react';
import { CosmicBackground } from './components/CosmicBackground';
import { RegistrationCard } from './components/RegistrationCard';
import { LoginCard } from './components/LoginCard';
import { SuccessView } from './components/SuccessView';
import { LegalModal } from './components/LegalModal';
import { ProfilePage } from './components/ProfilePage';
import { SpinningLogo } from './components/SpinningLogo';
import { LegalDocType, RegisterFormData, Language, UserProfile } from './types';
import { scrollAppToTop } from './utils/scrollHelper';
import {
  getPersistedAuthUser,
  persistAuthUser,
  clearPersistedAuthUser,
  onAuthStateChanged,
  isSameUser,
  signOutFromFirebase,
} from './utils/authService';

type ProtectedTab = 'home' | 'invest' | 'transactions' | 'wallet' | 'referral' | 'profile';

const PROTECTED_TABS: ProtectedTab[] = ['home', 'invest', 'transactions', 'wallet', 'referral', 'profile'];

// Helper to get normalized path
const getCleanPath = (): string => {
  if (typeof window !== 'undefined') {
    const p = window.location.pathname.toLowerCase().trim();
    return p ? (p.endsWith('/') && p.length > 1 ? p.slice(0, -1) : p) : '/';
  }
  return '/';
};

export default function App() {
  const [authUser, setAuthUser] = useState<UserProfile | null>(() => getPersistedAuthUser());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const isAuthenticated = !!authUser;

  // Determine initial path based on auth state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const initial = getCleanPath();
    const isStoredAuth = !!getPersistedAuthUser();

    if (!isStoredAuth) {
      if (initial === '/register') return '/register';
      return '/login';
    } else {
      if (initial === '/login' || initial === '/register' || initial === '/') {
        return '/home';
      }
      return initial;
    }
  });

  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>(null);
  const [registeredSuccessData, setRegisteredSuccessData] = useState<RegisterFormData | null>(null);

  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      if (saved === 'bn' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  // Ensure any legacy 12,450 BDT demo balance is immediately corrected to real zero (0.0 BDT)
  useEffect(() => {
    if (authUser && authUser.walletBalance === 12450.0) {
      const corrected: UserProfile = { ...authUser, walletBalance: 0.0 };
      persistAuthUser(corrected);
      setAuthUser(corrected);
    }
  }, [authUser]);

  // Navigation helper to synchronize URL history and local route state
  const navigate = (toPath: string, replace = false) => {
    if (typeof window !== 'undefined') {
      try {
        if (replace) {
          window.history.replaceState(null, '', toPath);
        } else {
          window.history.pushState(null, '', toPath);
        }
      } catch {
        // In iframe or restricted environments, history updates might fail silently
      }
    }
    // Auto-scroll window to top on any navigation
    scrollAppToTop();
    setCurrentPath((prev) => (prev !== toPath ? toPath : prev));
  };

  // Auto-scroll window to top whenever currentPath changes
  useEffect(() => {
    scrollAppToTop();
  }, [currentPath]);

  // Auth State Listener: Sync user state
  useEffect(() => {
    // Continuous real-time subscription (mirrors Firebase onAuthStateChanged)
    const unsubscribe = onAuthStateChanged((updatedUser) => {
      setAuthUser((prev) => {
        if (isSameUser(prev, updatedUser)) {
          return prev; // Identical: preserve reference to avoid downstream cascade
        }
        return updatedUser;
      });
    });

    return () => unsubscribe();
  }, []);

  // Protected Route & Guard Enforcement
  useEffect(() => {
    if (isAuthLoading) return; // Never redirect while verifying session

    if (!authUser) {
      // Unauthenticated visitor: Only /login and /register allowed
      if (currentPath !== '/login' && currentPath !== '/register') {
        navigate('/login', true);
      }
    } else {
      // Authenticated user: Visiting /login or /register or / redirects to /home
      if (currentPath === '/login' || currentPath === '/register' || currentPath === '/') {
        navigate('/home', true);
      }
    }
  }, [authUser, isAuthLoading, currentPath]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      if (isAuthLoading) return;
      const path = getCleanPath();
      if (!authUser) {
        if (path !== '/login' && path !== '/register') {
          navigate('/login', true);
          return;
        }
      } else {
        if (path === '/login' || path === '/register' || path === '/') {
          navigate('/home', true);
          return;
        }
      }
      setCurrentPath((prev) => (prev !== path ? path : prev));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authUser, isAuthLoading]);

  const handleToggleLang = (newLang: Language) => {
    setCurrentLang(newLang);
    try {
      localStorage.setItem('app_language', newLang);
    } catch {
      // ignore
    }
  };

  const handleRegistrationSuccess = (data: RegisterFormData) => {
    setRegisteredSuccessData(data);
    const current = getPersistedAuthUser();
    if (current) {
      setAuthUser(current);
    } else {
      const generatedMemberId = `NVT${Math.floor(100000 + Math.random() * 900000)}`;
      const newUser: UserProfile = {
        name: data.username || 'NVT Member',
        phone: data.phone || '+880 1712-345678',
        email: data.email || 'user@novaterraenergy.io',
        memberId: generatedMemberId,
        referralCode: generatedMemberId.slice(-6).toUpperCase(),
        referredBy: data.referralCode || undefined,
        walletBalance: 0.0,
        memberSince: 'May 2024',
        isVerified: true,
      };
      persistAuthUser(newUser);
      setAuthUser(newUser);
    }
    navigate('/home');
  };

  const handleLoginSuccess = (identifier: string) => {
    const current = getPersistedAuthUser();
    if (current) {
      setAuthUser(current);
    } else {
      const newUser: UserProfile = {
        name: identifier.includes('@') ? identifier.split('@')[0] : 'NVT Member',
        phone: identifier.startsWith('+') || /^\d+$/.test(identifier) ? identifier : '+880 1712-345678',
        email: identifier.includes('@') ? identifier : 'user@novaterraenergy.io',
        memberId: `NVT${Math.floor(100000 + Math.random() * 900000)}`,
        walletBalance: 0.0,
        memberSince: 'May 2024',
        isVerified: true,
      };
      persistAuthUser(newUser);
      setAuthUser(newUser);
    }
    navigate('/home');
  };

  const handleLogout = async () => {
    await signOutFromFirebase();
    setAuthUser(null);
    setRegisteredSuccessData(null);
    navigate('/login', true);
  };

  // Convert current path to active protected tab (e.g. /profile -> 'profile', /invest -> 'invest', /promo or /bonus -> 'wallet')
  const pathSegment = currentPath.replace('/', '').toLowerCase();
  let currentTab: ProtectedTab = 'home';
  if (pathSegment === 'promo' || pathSegment === 'bonus') {
    currentTab = 'wallet';
  } else if (PROTECTED_TABS.includes(pathSegment as ProtectedTab)) {
    currentTab = pathSegment as ProtectedTab;
  }

  // Loading Screen while session check initializes
  if (isAuthLoading) {
    return (
      <CosmicBackground theme="cosmic-dark">
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
          <SpinningLogo size="md" showText={false} />
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <p className="text-xs font-mono text-cyan-300 tracking-wider">
              {currentLang === 'bn' ? 'NVT এনার্জি গ্রিড লোড হচ্ছে...' : 'AUTHENTICATING NVT SECURE GRID...'}
            </p>
          </div>
        </div>
      </CosmicBackground>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 1. PROTECTED APPLICATION VIEW (Strictly for Authenticated Users)
  // ─────────────────────────────────────────────────────────────
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050811] flex flex-col items-center justify-start overflow-x-hidden relative">
        <div id="page-top-anchor" className="w-full h-0 pointer-events-none opacity-0" />
        <ProfilePage
          initialTab={currentTab}
          currentLang={currentLang}
          onToggleLang={handleToggleLang}
          initialUser={authUser}
          onNavigateBack={() => navigate('/home')}
          onLogout={handleLogout}
          onGoToHome={() => navigate('/home')}
          onTabChange={(tab) => {
            scrollAppToTop();
            const targetPath = `/${tab}`;
            if (currentPath !== targetPath) {
              navigate(targetPath);
            }
          }}
        />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PUBLIC AUTHENTICATION VIEWS (Guests Only - Login / Register)
  // ─────────────────────────────────────────────────────────────
  return (
    <CosmicBackground theme="cosmic-dark">
      <div id="auth-top-anchor" className="w-full h-0 pointer-events-none opacity-0" />
      <main className="w-full max-w-[460px] mx-auto flex flex-col items-center justify-start select-none">
        {/* Compact 360° Spinning Brand Logo above Login & Register Card */}
        <div className="mb-2 sm:mb-3 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
          <SpinningLogo
            size="sm"
            showText={true}
            lang={currentLang}
            subtitle={currentLang === 'bn' ? 'জ্বালানী, গ্যাস ও বিদ্যুৎ গ্রিড' : 'Fuel, Gas & Electric Power Grid'}
          />
        </div>

        {/* Stable container to display Login & Register Card */}
        <div className="w-full flex flex-col items-center justify-start">
          {currentPath === '/register' ? (
            <div className="w-full animate-in fade-in duration-200">
              <RegistrationCard
                onSwitchToLogin={() => {
                  navigate('/login');
                }}
                onOpenLegal={(type) => setActiveLegalDoc(type)}
                onRegistrationSuccess={handleRegistrationSuccess}
                currentLang={currentLang}
                onToggleLang={handleToggleLang}
              />
            </div>
          ) : (
            <div className="w-full animate-in fade-in duration-200">
              <LoginCard
                onSwitchToRegister={() => {
                  navigate('/register');
                }}
                onLoginSuccess={handleLoginSuccess}
                currentLang={currentLang}
                onToggleLang={handleToggleLang}
              />
            </div>
          )}
        </div>

        {registeredSuccessData && (
          <SuccessView
            userData={registeredSuccessData}
            onReset={() => {
              setRegisteredSuccessData(null);
              navigate('/register');
            }}
            onGoToLogin={() => {
              setRegisteredSuccessData(null);
              navigate('/login');
            }}
            onGoToProfile={() => {
              setRegisteredSuccessData(null);
              navigate('/home');
            }}
          />
        )}
      </main>

      {/* Legal terms & privacy modal */}
      <LegalModal
        type={activeLegalDoc}
        onClose={() => setActiveLegalDoc(null)}
      />
    </CosmicBackground>
  );
}
