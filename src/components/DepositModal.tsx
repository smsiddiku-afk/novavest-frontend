import React from 'react';
import { CleanWalletScreen, PaymentMethodType, PaymentChannelType } from './CleanWalletScreen';
import { Language } from '../types';

export type DepositMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Card';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  currentLang?: Language;
  onProceed: (amount: number, method: DepositMethod, channel?: PaymentChannelType) => void;
  onOpenHistory?: () => void;
  onWithdraw?: (amount: number, method: PaymentMethodType, account: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  currentLang = 'en',
  onProceed,
  onOpenHistory,
  onWithdraw,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="deposit-modal-full-overlay"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#050c14] flex flex-col items-center justify-start animate-in fade-in"
    >
      <CleanWalletScreen
        currentBalance={currentBalance}
        currentLang={currentLang}
        initialTab="recharge"
        onBack={onClose}
        onOpenHistory={onOpenHistory}
        onConfirmRecharge={(amt, method, channel) => {
          onProceed(amt, method, channel);
        }}
        onConfirmWithdraw={onWithdraw}
      />
    </div>
  );
};
