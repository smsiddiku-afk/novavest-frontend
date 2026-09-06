import React from 'react';
import { CleanWalletScreen, PaymentMethodType, PaymentChannelType } from './CleanWalletScreen';
import { Language } from '../types';

interface WalletTabContentProps {
  userBalance: number;
  currentLang?: Language;
  onOpenRecharge?: () => void;
  onOpenWithdraw?: () => void;
  onOpenBankBinding?: () => void;
  onOpenGateway?: (amount: number, method: PaymentMethodType, channel?: PaymentChannelType) => void;
  onOpenHistory?: () => void;
  onBack?: () => void;
  onWithdrawSubmit?: (amount: number, method: PaymentMethodType, account: string) => void;
  showToast?: (msg: string) => void;
}

export const WalletTabContent: React.FC<WalletTabContentProps> = ({
  userBalance,
  currentLang = 'en',
  onOpenRecharge,
  onOpenWithdraw,
  onOpenGateway,
  onOpenHistory,
  onBack,
  onWithdrawSubmit,
  showToast,
}) => {
  return (
    <div className="w-full pb-20 animate-in fade-in">
      <CleanWalletScreen
        currentBalance={userBalance}
        currentLang={currentLang}
        initialTab="recharge"
        onBack={onBack}
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
    </div>
  );
};
