import React, { useState, useEffect } from 'react';
import { PromoBonusScreen } from './PromoBonusScreen';
import { CleanWalletScreen, PaymentMethodType, PaymentChannelType, ManualDepositDetails } from './CleanWalletScreen';
import { Language } from '../types';
import { Award, Wallet as WalletIcon } from 'lucide-react';

interface WalletTabContentProps {
  userBalance: number;
  userCode?: string;
  userMemberId?: string;
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  onOpenRecharge?: () => void;
  onOpenWithdraw?: () => void;
  onOpenBankBinding?: () => void;
  onOpenGateway?: (
    amount: number,
    method: PaymentMethodType,
    channel?: PaymentChannelType,
    manualDetails?: ManualDepositDetails
  ) => void;
  onOpenHistory?: () => void;
  onBack?: () => void;
  onNavigateToReferral?: () => void;
  onWithdrawSubmit?: (amount: number, method: PaymentMethodType, account: string) => void;
  onClaimPromoReward?: (amount: number, level: string) => void;
  showToast?: (msg: string) => void;
  isAuthenticatorSet?: boolean;
  authenticatorSecret?: string;
  onOpenSecuritySettings?: () => void;
}

export const WalletTabContent: React.FC<WalletTabContentProps> = ({
  userBalance,
  userCode,
  userMemberId,
  currentLang = 'bn',
  themeMode = 'night',
  onOpenRecharge,
  onOpenWithdraw,
  onOpenGateway,
  onOpenHistory,
  onBack,
  onNavigateToReferral,
  onWithdrawSubmit,
  onClaimPromoReward,
  showToast,
  isAuthenticatorSet,
  authenticatorSecret,
  onOpenSecuritySettings,
}) => {
  // Sub-view within Promo Bonus / Wallet tab: default is 'promo' (হোস্টিং লেভেল বিবরণী)
  const [subView, setSubView] = useState<'promo' | 'wallet'>('promo');

  return (
    <div className="w-full animate-in fade-in flex flex-col items-center">
      {/* Top Tab Bar: Switch between Promo Bonus and Wallet Recharge/Withdraw */}
      <div className="w-full max-w-md px-3.5 pt-2 pb-1.5 flex items-center justify-center">
        <div className="w-full p-1 rounded-2xl bg-[#042018] border border-emerald-500/30 flex items-center gap-1 shadow-lg">
          <button
            type="button"
            onClick={() => setSubView('wallet')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subView === 'wallet'
                ? 'bg-emerald-400 text-slate-950 shadow-md scale-[1.01]'
                : 'text-emerald-200/80 hover:text-white font-bold'
            }`}
          >
            <WalletIcon className="w-4 h-4 stroke-[2.5]" />
            <span>{currentLang === 'bn' ? 'ডিপোজিট ও ওয়ালেট' : 'Deposit & Wallet'}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubView('promo')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subView === 'promo'
                ? 'bg-emerald-400 text-slate-950 shadow-md scale-[1.01]'
                : 'text-emerald-200/80 hover:text-white font-bold'
            }`}
          >
            <Award className="w-4 h-4 stroke-[2.5]" />
            <span>{currentLang === 'bn' ? 'প্রমো বোনাস ও টাস্ক' : 'Promo Bonus'}</span>
          </button>
        </div>
      </div>

      {/* View 1: Promo Bonus / Referral & Tier-based Incentive Dashboard (Matches user screenshot) */}
      {subView === 'promo' && (
        <PromoBonusScreen
          currentLang={currentLang}
          themeMode={themeMode}
          userCode={userCode}
          userMemberId={userMemberId}
          onBack={onBack}
          onNavigateToReferral={onNavigateToReferral}
          onClaimReward={(amount, level) => {
            if (onClaimPromoReward) {
              onClaimPromoReward(amount, level);
            }
          }}
          showToast={showToast}
          onOpenWalletDeposit={() => setSubView('wallet')}
        />
      )}

      {/* View 2: Wallet Recharge & Withdraw (CleanWalletScreen) */}
      {subView === 'wallet' && (
        <CleanWalletScreen
          currentBalance={userBalance}
          currentLang={currentLang}
          themeMode={themeMode}
          initialTab="recharge"
          onBack={() => setSubView('promo')}
          onOpenHistory={onOpenHistory}
          onConfirmRecharge={async (amount, method, channel, manualDetails) => {
            if (onOpenGateway) {
              return await onOpenGateway(amount, method, channel, manualDetails);
            } else if (onOpenRecharge) {
              onOpenRecharge();
            }
          }}
          onConfirmWithdraw={onWithdrawSubmit}
          showToast={showToast}
          isAuthenticatorSet={isAuthenticatorSet}
          authenticatorSecret={authenticatorSecret}
          onOpenSecuritySettings={onOpenSecuritySettings}
        />
      )}
    </div>
  );
};
