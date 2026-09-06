import React from 'react';
import { X, ShieldCheck, FileText, Lock } from 'lucide-react';
import { LegalDocType } from '../types';

interface LegalModalProps {
  type: LegalDocType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const isTerms = type === 'terms';

  return (
    <div
      id="legal-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="legal-modal-container"
        className="cosmic-glass relative w-full max-w-lg rounded-2xl p-6 md:p-8 max-h-[85vh] flex flex-col text-slate-200 shadow-2xl border border-slate-700/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {isTerms ? <FileText className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {isTerms ? 'Terms & Conditions' : 'Privacy & Security Policy'}
              </h2>
              <p className="text-xs text-slate-400">
                NovaVest Global Investment Platform • Updated September 2026
              </p>
            </div>
          </div>
          <button
            id="close-legal-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto my-4 pr-2 space-y-4 text-sm text-slate-300 leading-relaxed custom-scrollbar">
          {isTerms ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">1. Eligibility & Verification</h3>
                <p className="text-xs text-slate-400">
                  By creating an account on NovaVest, you confirm that you are at least 18 years of age and legally authorized to engage in capital investment activities. Each account is subject to AML (Anti-Money Laundering) and KYC identity validation.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">2. Referral Program Protocol</h3>
                <p className="text-xs text-slate-400">
                  A valid Referral Code is required during registration to connect you with an authorized investment syndicate or sponsor node. Referral bonuses and tiered allocations are credited in accordance with platform liquidity rules.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">3. Investment Risk Disclosure</h3>
                <p className="text-xs text-slate-400">
                  All investment portfolios, digital assets, and capital deployment programs entail market risk. Past yield performance is not an absolute indicator of future returns. You acknowledge that you allocate funds responsibly according to your personal risk tolerance.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">4. Account Security & Custody</h3>
                <p className="text-xs text-slate-400">
                  Users are strictly responsible for maintaining credential confidentiality, enabling two-factor authorization, and protecting withdrawal PINs. NovaVest will never ask for your private encryption keys or account passwords.
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">1. Bank-Grade Encryption Standards</h3>
                <p className="text-xs text-slate-400">
                  Your credentials and personal records are encrypted with AES-256 military-grade cipher protocols both at rest and in transit via TLS 1.3 cryptographic tunnels.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">2. Data Confidentiality</h3>
                <p className="text-xs text-slate-400">
                  We never monetize, rent, or distribute your email address, investment balance, or transactional records to third-party advertising networks. Information is utilized exclusively for financial auditability and regulatory compliance.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">3. Multi-Factor Protection</h3>
                <p className="text-xs text-slate-400">
                  Email verification codes (OTP) and hardware token authenticators are required for sensitive operations, withdrawals, and changes to credential pairs.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">4. Your Data Rights</h3>
                <p className="text-xs text-slate-400">
                  You have the right to request comprehensive account data export, review security logs, and initiate account closure at any time through your authenticated investor dashboard.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            id="acknowledge-legal-btn"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
};
