export interface RegisterFormData {
  phone?: string;
  countryCode?: string;
  username: string; // nickname / ডাকনাম
  password: string;
  confirmPassword: string;
  verificationCode?: string;
  referralCode: string;
  agreeTerms?: boolean;
  email?: string;
}

export interface FormErrors {
  phone?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  verificationCode?: string;
  referralCode?: string;
  agreeTerms?: string;
  email?: string;
}

export type AuthMode = 'home' | 'profile' | 'login' | 'register' | 'success';

export interface EnergySystem {
  id: string;
  name: string;
  category: string;
  image: string;
  capacity: string;
  annualOutput: string;
  status: 'Operational & Delivering' | 'Grid Synchronized' | 'AI Optimization Active' | 'Phase II Expansion';
  statusColor: string;
  efficiency: string;
  location: string;
  gridFrequency: string;
  description: string;
  highlights: string[];
  minParticipation?: string;
  expectedAnnualYield?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'monitoring' | 'finance' | 'risk';
}

export interface UserProfile {
  uid?: string;
  name: string;
  memberId: string;
  referralCode?: string;
  referredBy?: string;
  memberSince: string;
  isVerified: boolean;
  walletBalance: number;
  phone: string;
  email?: string;
  avatarUrl?: string;
  fullName?: string;
  transactions?: any[];
}

export type LegalDocType = 'terms' | 'privacy' | null;

export type Language = 'bn' | 'en';

