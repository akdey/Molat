import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, CheckCircle2, X, RefreshCw } from 'lucide-react';
import { sendVerificationEmail, verifyEmailOtp } from '../api/client';
import { useLibraryStore } from '../store/useLibraryStore';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({ isOpen, onClose }) => {
  const { authEmail, setEmailVerified, addToast, loadAllData } = useLibraryStore();
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = otp.replace(/\s+/g, '').trim();
    if (clean.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      await verifyEmailOtp(clean);
      setEmailVerified(true);
      addToast('Email verified! You can now create and join Family Alcoves.', 'success');
      await loadAllData(true);
      setOtp('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await sendVerificationEmail();
      addToast(`Verification code sent to ${authEmail || 'your email'}`, 'success');
    } catch (err: any) {
      setError(err.message || 'Could not send verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 dark:bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-md rounded-3xl border border-rule dark:border-rule-dark bg-surface dark:bg-surface-dark p-6 shadow-xl space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-medium text-ink dark:text-ink-dark">
                    Verify Your Email
                  </h3>
                  <p className="text-xs text-ink-muted truncate max-w-[260px]">
                    {authEmail || 'Enter the 6-digit code sent to your inbox'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-canvas dark:hover:bg-canvas-dark text-ink-muted min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="000000"
                  className="w-full text-center font-mono text-2xl tracking-[0.35em] py-3 rounded-xl border border-rule dark:border-rule-dark bg-canvas dark:bg-canvas-dark focus:outline-none focus:border-accent"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline cursor-pointer disabled:opacity-50 min-h-[40px]"
                  >
                    <RefreshCw size={13} className={resending ? 'animate-spin' : ''} />
                    <span>{resending ? 'Sending...' : 'Resend Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-xs text-ink-muted hover:text-ink cursor-pointer min-h-[40px]"
                  >
                    Verify later
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={verifying || otp.length !== 6}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-medium min-h-[44px] cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 size={15} />
                  <span>{verifying ? 'Verifying...' : 'Verify Email'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
