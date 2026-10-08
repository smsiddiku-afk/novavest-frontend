import React, { useState, useEffect } from 'react';
import { CleanWalletScreen, PaymentMethodType, PaymentChannelType, ManualDepositDetails } from './CleanWalletScreen';
import { Language } from '../types';

export type DepositMethod = 'bKash' | 'Nagad' | 'Rocket' | 'Card';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  currentLang?: Language;
  onProceed: (
    amount: number,
    method: DepositMethod,
    channel?: PaymentChannelType,
    manualDetails?: ManualDepositDetails
  ) => Promise<any> | void;
  onOpenHistory?: () => void;
  onWithdraw?: (amount: number, method: PaymentMethodType, account: string) => void;
  isAuthenticatorSet?: boolean;
  authenticatorSecret?: string;
  onOpenSecuritySettings?: () => void;
  showToast?: (msg: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  currentLang = 'en',
  onProceed,
  onOpenHistory,
  onWithdraw,
  isAuthenticatorSet = false,
  authenticatorSecret,
  onOpenSecuritySettings,
  showToast,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="deposit-modal-full-overlay"
      className="fixed inset-0 z-[99999] overflow-y-auto bg-[#06483A] flex flex-col items-center justify-start animate-in fade-in"
      style={{ isolation: 'isolate' }}
    >
      <CleanWalletScreen
        currentBalance={currentBalance}
        currentLang={currentLang}
        initialTab="recharge"
        onBack={onClose}
        onOpenHistory={onOpenHistory}
        onConfirmRecharge={async (amt, method, channel, manualDetails) => {
          return await onProceed(amt, method, channel, manualDetails);
        }}
        onConfirmWithdraw={onWithdraw}
        isAuthenticatorSet={isAuthenticatorSet}
        authenticatorSecret={authenticatorSecret}
        onOpenSecuritySettings={onOpenSecuritySettings}
        showToast={showToast}
      />
    </div>
  );
};
