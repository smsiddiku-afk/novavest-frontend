import React, { useState } from 'react';
import { CosmicBackground } from './components/CosmicBackground';
import { RegistrationCard } from './components/RegistrationCard';
import { LoginCard } from './components/LoginCard';
import { SuccessView } from './components/SuccessView';
import { LegalModal } from './components/LegalModal';
import { ProfilePage } from './components/ProfilePage';
import { AuthMode, LegalDocType, RegisterFormData, Language } from './types';
import { User, Home, Building2 } from 'lucide-react';

export default function App() {
  // Default to 'home' to present the premium AI energy homepage requested
  const [authMode, setAuthMode] = useState<AuthMode>('home');
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType>(null);
  const [registeredUser, setRegisteredUser] = useState<RegisterFormData | null>(null);
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      if (saved === 'bn' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'en';
  });

  const handleToggleLang = (newLang: Language) => {
    setCurrentLang(newLang);
    try {
      localStorage.setItem('app_language', newLang);
    } catch {
      // ignore
    }
  };

  const handleRegistrationSuccess = (data: RegisterFormData) => {
    setRegisteredUser(data);
    setAuthMode('home');
  };

  const handleLoginSuccess = (identifier: string) => {
    setRegisteredUser({
      username: identifier.includes('@') ? identifier.split('@')[0] : 'John Doe',
      phone: identifier.startsWith('+') || /^\d+$/.test(identifier) ? identifier : '+880 1712-345678',
      password: '',
      confirmPassword: '',
      referralCode: 'SDRL123456',
    });
    setAuthMode('home');
  };

  return (
    <>
      {/* 1. Main Unified Experience (Home, Invest, Transactions, Wallet, Profile) */}
      {(authMode === 'home' || authMode === 'profile') && (
        <div className="min-h-screen w-full bg-[#050811] flex flex-col items-center justify-start overflow-x-hidden">
          <ProfilePage
            initialTab={authMode === 'profile' ? 'profile' : 'home'}
            currentLang={currentLang}
            onToggleLang={handleToggleLang}
            initialUser={
              registeredUser
                ? {
                    name: registeredUser.username || 'John Doe',
                    phone: registeredUser.phone || '+880 1712-345678',
                    email: registeredUser.email || 'john.doe@novavest.io',
                    memberId: registeredUser.referralCode || 'SDRL123456',
                    walletBalance: 12450.0,
                    memberSince: 'May 2024',
                    isVerified: true,
                  }
                : undefined
            }
            onNavigateBack={() => setAuthMode('login')}
            onLogout={() => setAuthMode('login')}
            onGoToHome={() => setAuthMode('home')}
          />
        </div>
      )}

      {/* 3. Auth Views (Login & Register & Success) */}
      {(authMode === 'login' || authMode === 'register' || authMode === 'success') && (
        <CosmicBackground theme="cosmic-dark">
          {/* Main Viewport Container - Perfectly Centered */}
          <main className="w-full flex flex-col items-center justify-center">
            {authMode === 'register' && (
              <div className="w-full flex flex-col items-center justify-center">
                <RegistrationCard
                  onSwitchToLogin={() => setAuthMode('login')}
                  onOpenLegal={(type) => setActiveLegalDoc(type)}
                  onRegistrationSuccess={handleRegistrationSuccess}
                  currentLang={currentLang}
                  onToggleLang={handleToggleLang}
                />
              </div>
            )}

            {authMode === 'login' && (
              <div className="w-full flex flex-col items-center justify-center">
                <LoginCard
                  onSwitchToRegister={() => setAuthMode('register')}
                  onLoginSuccess={handleLoginSuccess}
                  currentLang={currentLang}
                  onToggleLang={handleToggleLang}
                />
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAuthMode('home')}
                    className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer py-1 px-3 rounded-full hover:bg-slate-800/60"
                  >
                    <Home className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{currentLang === 'bn' ? 'হোম পেজ দেখুন' : 'Go to Home'}</span>
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('profile')}
                    className="text-xs text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1 cursor-pointer py-1 px-3 rounded-full hover:bg-slate-800/60"
                  >
                    <User className="w-3.5 h-3.5 text-blue-400" />
                    <span>{currentLang === 'bn' ? 'প্রোফাইল' : 'Profile'}</span>
                  </button>
                </div>
              </div>
            )}

            {authMode === 'success' && registeredUser && (
              <SuccessView
                userData={registeredUser}
                onReset={() => setAuthMode('register')}
                onGoToLogin={() => setAuthMode('login')}
                onGoToProfile={() => setAuthMode('home')}
              />
            )}
          </main>

          {/* Legal terms & privacy modal */}
          <LegalModal
            type={activeLegalDoc}
            onClose={() => setActiveLegalDoc(null)}
          />
        </CosmicBackground>
      )}
    </>
  );
}
