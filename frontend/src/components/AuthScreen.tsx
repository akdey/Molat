import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Lock, Mail, LogIn, UserPlus, AlertCircle, CheckCircle2, RefreshCw, ArrowLeft } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { sendVerificationEmail, verifyEmailOtp } from '../api/client';

export const AuthScreen: React.FC = () => {
  const { loginOwner, signupReader, completeVerificationLogin, addToast } = useLibraryStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginIdent, setLoginIdent] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  // Verification gate state
  const [pendingVerification, setPendingVerification] = useState<{ identifier: string; email?: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsVerificationPrompt, setNeedsVerificationPrompt] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdent.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setNeedsVerificationPrompt(false);
    try {
      await loginOwner(loginIdent.trim(), loginPassword.trim());
    } catch (err: any) {
      const msg = err.message || 'Invalid email/username or password.';
      setErrorMsg(msg);
      if (msg.toLowerCase().includes('not verified')) {
        setNeedsVerificationPrompt(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail.trim() || !signupUsername.trim() || !signupPassword.trim()) {
      setErrorMsg('Email, username, and password are required.');
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setNeedsVerificationPrompt(false);
    try {
      await signupReader(
        signupEmail.trim(),
        signupUsername.trim(),
        signupPassword.trim()
      );
      setPendingVerification({ identifier: signupEmail.trim(), email: signupEmail.trim() });
      setOtp('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingVerification) return;
    const clean = otp.replace(/\s+/g, '').trim();
    if (clean.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code from your email.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await verifyEmailOtp(clean, undefined, pendingVerification.identifier);
      await completeVerificationLogin(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!pendingVerification) return;
    setResending(true);
    setErrorMsg(null);
    try {
      await sendVerificationEmail(undefined, pendingVerification.identifier);
      addToast(`Verification code sent to ${pendingVerification.email || pendingVerification.identifier}`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FBF9F5] dark:bg-[#121316] text-[#1E293B] dark:text-[#F1F5F9] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#F4EFE6] dark:bg-[#1A1D24] border border-[#E2D9C8] dark:border-[#2A2F3A] rounded-2xl shadow-sm p-6 sm:p-8"
      >
        {/* Header / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#C2410C]/10 text-[#C2410C] dark:text-[#D97706] mb-3">
            <BookOpen size={24} />
          </div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
            Molat <span className="font-sans font-light text-sm opacity-60">মলাট</span>
          </h1>
          <p className="text-xs text-[#475569] dark:text-[#94A3B8] mt-1 font-serif italic">
            Personal Library & Reading Ledger
          </p>
        </div>

        {/* Tab Switcher */}
        {!pendingVerification && (
          <div className="flex bg-[#E8E2D5] dark:bg-[#232732] p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(null); setNeedsVerificationPrompt(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'login'
                ? 'bg-white dark:bg-[#1A1D24] text-[#1E293B] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]'
                }`}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(null); setNeedsVerificationPrompt(false); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${mode === 'signup'
                ? 'bg-white dark:bg-[#1A1D24] text-[#1E293B] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]'
                }`}
            >
              <UserPlus size={14} />
              <span>New Reader</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 space-y-2 text-xs text-red-700 dark:text-red-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
            {needsVerificationPrompt && (
              <button
                type="button"
                onClick={() => {
                  setPendingVerification({ identifier: loginIdent.trim() });
                  setErrorMsg(null);
                  setNeedsVerificationPrompt(false);
                }}
                className="ml-6 inline-flex items-center gap-1.5 font-semibold text-[#C2410C] dark:text-[#D97706] hover:underline cursor-pointer"
              >
                <Mail size={13} />
                <span>Verify email with 6-digit code</span>
              </button>
            )}
          </div>
        )}

        {/* Email Verification Gate View */}
        {pendingVerification ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-white/70 dark:bg-[#121316]/60 border border-[#E2D9C8] dark:border-[#2A2F3A] text-xs space-y-1">
              <div className="flex items-center gap-2 font-medium text-[#1E293B] dark:text-[#F1F5F9]">
                <Mail size={15} className="text-[#C2410C] dark:text-[#D97706]" />
                <span>Verify your email to sign in</span>
              </div>
              <p className="text-[#475569] dark:text-[#94A3B8]">
                Enter the 6-digit code sent to <strong className="text-[#1E293B] dark:text-[#F1F5F9]">{pendingVerification.email || pendingVerification.identifier}</strong> or click the link in your inbox.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="000000"
                autoFocus
                className="w-full text-center font-mono text-2xl tracking-[0.35em] py-3 rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-[#C2410C] hover:bg-[#9A3412] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{loading ? 'Verifying...' : 'Verify & Enter Library'}</span>
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setPendingVerification(null);
                  setMode('login');
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-1 text-[#475569] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9] cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>Back to Sign In</span>
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="inline-flex items-center gap-1.5 font-medium text-[#C2410C] dark:text-[#D97706] hover:underline disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                <span>{resending ? 'Sending...' : 'Resend Code'}</span>
              </button>
            </div>
          </form>
        ) : mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#475569] dark:text-[#94A3B8] font-serif font-bold text-xs select-none">
                  ex/
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. reader@molat.com or ex/username"
                  value={loginIdent}
                  onChange={(e) => setLoginIdent(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#475569] dark:text-[#94A3B8]">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-[#C2410C] hover:bg-[#9A3412] dark:bg-[#C2410C] dark:hover:bg-[#EA580C] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              <span>{loading ? 'Authenticating...' : 'Enter Library'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#475569] dark:text-[#94A3B8]">
                  <Mail size={15} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Ex Libris Handle
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 font-serif font-bold text-[#C2410C] dark:text-[#D97706] text-sm select-none pointer-events-none">
                  ex/
                </span>
                <input
                  type="text"
                  required
                  placeholder="handle"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="w-full pl-14 pr-3 py-2 text-sm font-mono rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
                />
              </div>
              <p className="text-3xs text-[#475569] dark:text-[#94A3B8] mt-1 pl-1">
                Your Ex Libris bookplate slug: <span className="font-mono text-[#C2410C] dark:text-[#D97706]">ex/{signupUsername || 'handle'}</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#475569] dark:text-[#94A3B8]">
                  <Lock size={15} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-[#C2410C] hover:bg-[#9A3412] dark:bg-[#C2410C] dark:hover:bg-[#EA580C] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              <span>{loading ? 'Creating Account...' : 'Create Reader Shelf'}</span>
            </button>
          </form>
        )}

        <div className="mt-6 pt-5 border-t border-[#E2D9C8] dark:border-[#2A2F3A] text-center">
          <p className="text-3xs text-[#475569] dark:text-[#94A3B8]">
            Multi-Tenant Architectural Library · Isolated Reader Catalogs
          </p>
        </div>
      </motion.div>
    </div>
  );
};
