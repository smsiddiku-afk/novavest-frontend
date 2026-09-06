import React, { useState, useEffect } from 'react';
import { CosmicBackground } from './components/CosmicBackground';
import { RegistrationCard } from './components/RegistrationCard';
import { LoginCard } from './components/LoginCard';
import { SuccessView } from './components/SuccessView';
import { LegalModal } from './components/LegalModal';
import { ProfilePage } from './components/ProfilePage';
import { SpinningLogo } from './components/SpinningLogo';
import { LegalDocType, RegisterFormData, Language, UserProfile } from './types';

type ProtectedTab = 'home' | 'invest' | 'transactions' | 'wallet' | 'referral' | 'profile';

const PROTECTED_TABS: ProtectedTab[] = ['home', 'invest', 'transactions', 'wallet', 'referral', 'profile'];

// Helper to get initial stored authenticated user
const getStoredAuthUser = (): UserProfile | null => {
  try {
    const raw = localStorage.getItem('nvt_auth_user') || localStorage.getItem('novavest_auth_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.name || parsed.username || parsed.phone)) {
        return {
          name: parsed.name || parsed.username || 'NVT Member',
          phone: parsed.phone || '+880 1712-345678',
          email: parsed.email || 'user@novaterraenergy.io',
          memberId: parsed.memberId || parsed.referralCode || 'NVT123456',
          walletBalance: typeof parsed.walletBalance === 'number' ? parsed.walletBalance : 12450.0,
          memberSince: parsed.memberSince || 'May 2024',
          isVerified: parsed.isVerified ?? true,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored auth user:', err);
  }
  return null;
};

// Helper to get initial path
const getCleanPath = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.pathname.toLowerCase() || '/';
  }
  return '/';
};

export default function App() {
  const [authUser, setAuthUser] = useState<UserProfile | null>(getStoredAuthUser);
  const isAuthenticated = !!authUser;

  // Determine initial path based on auth state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const initial = getCleanPath();
    const isStoredAuth = !!getStoredAuthUser();

    if (!isStoredAuth) {
      // Guest visitor: Only /login and /register are accessible
      if (initial === '/register') return '/register';
      return '/login';
    } else {
      // Authenticated user: Visiting auth pages or root defaults to /home
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

  // Navigation helper to synchronize URL history and local route state
  const navigate = (toPath: string, replace = false) => {
    if (typeof window !== 'undefined') {
      if (replace) {
        window.history.replaceState(null, '', toPath);
      } else {
        window.history.pushState(null, '', toPath);
      }
    }
    setCurrentPath(toPath);
  };

  // Guard / Protected Route enforcement effect
  useEffect(() => {
    const path = getCleanPath();

    if (!isAuthenticated) {
      // Unauthenticated / Guest visitor:
      // Must NOT access root (/) or any protected route. Automatically redirect to /login or /register.
      if (path !== '/login' && path !== '/register') {
        navigate('/login', true);
      } else if (currentPath !== path) {
        setCurrentPath(path);
      }
    } else {
      // Authenticated user:
      // If landing on /login, /register, or /, redirect to /home
      if (path === '/login' || path === '/register' || path === '/') {
        navigate('/home', true);
      } else if (currentPath !== path) {
        setCurrentPath(path);
      }
    }
  }, [isAuthenticated]);

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = getCleanPath();
      if (!isAuthenticated) {
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
      setCurrentPath(path);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated]);

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
    const newUser: UserProfile = {
      name: data.username || 'NVT Member',
      phone: data.phone || '+880 1712-345678',
      email: data.email || 'user@novaterraenergy.io',
      memberId: data.referralCode || `NVT${Math.floor(100000 + Math.random() * 900000)}`,
      walletBalance: 12450.0,
      memberSince: 'May 2024',
      isVerified: true,
    };

    try {
      localStorage.setItem('nvt_auth_user', JSON.stringify(newUser));
      localStorage.removeItem('novavest_auth_user');
    } catch (err) {
      console.warn('Failed to save registered user:', err);
    }

    setAuthUser(newUser);
    navigate('/home');
  };

  const handleLoginSuccess = (identifier: string) => {
    const newUser: UserProfile = {
      name: identifier.includes('@') ? identifier.split('@')[0] : 'NVT Member',
      phone: identifier.startsWith('+') || /^\d+$/.test(identifier) ? identifier : '+880 1712-345678',
      email: identifier.includes('@') ? identifier : 'user@novaterraenergy.io',
      memberId: `NVT${Math.floor(100000 + Math.random() * 900000)}`,
      walletBalance: 12450.0,
      memberSince: 'May 2024',
      isVerified: true,
    };

    try {
      localStorage.setItem('nvt_auth_user', JSON.stringify(newUser));
      localStorage.removeItem('novavest_auth_user');
    } catch (err) {
      console.warn('Failed to save login user:', err);
    }

    setAuthUser(newUser);
    navigate('/home');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('nvt_auth_user');
      localStorage.removeItem('novavest_auth_user');
    } catch {
      // ignore
    }
    setAuthUser(null);
    setRegisteredSuccessData(null);
    navigate('/login', true);
  };

  // Convert current path to active protected tab (e.g. /wallet -> 'wallet')
  const pathSegment = currentPath.replace('/', '') as ProtectedTab;
  const currentTab: ProtectedTab = PROTECTED_TABS.includes(pathSegment) ? pathSegment : 'home';

  // ─────────────────────────────────────────────────────────────
  // 1. PROTECTED APPLICATION VIEW (Strictly for Authenticated Users)
  // ─────────────────────────────────────────────────────────────
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050811] flex flex-col items-center justify-start overflow-x-hidden">
        <ProfilePage
          initialTab={currentTab}
          currentLang={currentLang}
          onToggleLang={handleToggleLang}
          initialUser={authUser}
          onNavigateBack={() => navigate('/home')}
          onLogout={handleLogout}
          onGoToHome={() => navigate('/home')}
          onTabChange={(tab) => {
            if (currentPath !== `/${tab}`) {
              navigate(`/${tab}`);
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
      <main className="w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12">
        {/* Animated 360° Spinning Brand Logo above Login & Register Card */}
        <div className="mb-6 sm:mb-8 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-500">
          <SpinningLogo
            size="lg"
            showText={true}
            lang={currentLang}
            subtitle={currentLang === 'bn' ? 'জ্বালানী, গ্যাস ও বিদ্যুৎ গ্রিড' : 'Fuel, Gas & Electric Power Grid'}
          />
        </div>

        {currentPath === '/register' ? (
          <div className="w-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-3 duration-300">
            <RegistrationCard
              onSwitchToLogin={() => navigate('/login')}
              onOpenLegal={(type) => setActiveLegalDoc(type)}
              onRegistrationSuccess={handleRegistrationSuccess}
              currentLang={currentLang}
              onToggleLang={handleToggleLang}
            />
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-3 duration-300">
            <LoginCard
              onSwitchToRegister={() => navigate('/register')}
              onLoginSuccess={handleLoginSuccess}
              currentLang={currentLang}
              onToggleLang={handleToggleLang}
            />
          </div>
        )}

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
