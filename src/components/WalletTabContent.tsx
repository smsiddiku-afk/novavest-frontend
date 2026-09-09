import React, { useState } from 'react';
import { PromoBonusScreen } from './PromoBonusScreen';
import { CleanWalletScreen, PaymentMethodType, PaymentChannelType } from './CleanWalletScreen';
import { Language } from '../types';
import { Award, Wallet as WalletIcon } from 'lucide-react';

interface WalletTabContentProps {
  userBalance: number;
  currentLang?: Language;
  themeMode?: 'night' | 'day';
  onOpenRecharge?: () => void;
  onOpenWithdraw?: () => void;
  onOpenBankBinding?: () => void;
  onOpenGateway?: (amount: number, method: PaymentMethodType, channel?: PaymentChannelType) => void;
  onOpenHistory?: () => void;
  onBack?: () => void;
  onWithdrawSubmit?: (amount: number, method: PaymentMethodType, account: string) => void;
  onClaimPromoReward?: (amount: number, level: string) => void;
  showToast?: (msg: string) => void;
}

export const WalletTabContent: React.FC<WalletTabContentProps> = ({
  userBalance,
  currentLang = 'bn',
  themeMode = 'night',
  onOpenRecharge,
  onOpenWithdraw,
  onOpenGateway,
  onOpenHistory,
  onBack,
  onWithdrawSubmit,
  onClaimPromoReward,
  showToast,
}) => {
  // Sub-view within Promo Bonus / Wallet tab: default is 'promo' (হোস্টিং লেভেল বিবরণী)
  const [subView, setSubView] = useState<'promo' | 'wallet'>('promo');

  return (
    <div className="w-full animate-in fade-in flex flex-col items-center">
      {/* View 1: Promo Bonus / Referral & Tier-based Incentive Dashboard (Matches user screenshot) */}
      {subView === 'promo' && (
        <PromoBonusScreen
          currentLang={currentLang}
          themeMode={themeMode}
          onBack={onBack}
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
          onConfirmRecharge={(amount, method, channel) => {
            if (onOpenGateway) {
              onOpenGateway(amount, method, channel);
            } else if (onOpenRecharge) {
              onOpenRecharge();
            }
          }}
          onConfirmWithdraw={onWithdrawSubmit}
          showToast={showToast}
        />
      )}
    </div>
  );
};
