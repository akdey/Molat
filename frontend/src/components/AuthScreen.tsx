import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Lock, Mail, AtSign, LogIn, UserPlus, AlertCircle, Sparkles } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';

export const AuthScreen: React.FC = () => {
  const { loginOwner, signupReader } = useLibraryStore();

  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login form state
  const [loginIdent, setLoginIdent] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdent.trim() || !loginPassword.trim()) {
      setErrorMsg('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await loginOwner(loginIdent.trim(), loginPassword.trim());
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email/username or password.');
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
    try {
      await signupReader(
        signupEmail.trim(),
        signupUsername.trim(),
        signupPassword.trim()
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
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
        <div className="flex bg-[#E8E2D5] dark:bg-[#232732] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white dark:bg-[#1A1D24] text-[#1E293B] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <LogIn size={14} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white dark:bg-[#1A1D24] text-[#1E293B] dark:text-[#F1F5F9] shadow-xs'
                : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F1F5F9]'
            }`}
          >
            <UserPlus size={14} />
            <span>New Reader</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#475569] dark:text-[#94A3B8] mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#475569] dark:text-[#94A3B8]">
                  <AtSign size={15} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. reader@molat.local or akdey"
                  value={loginIdent}
                  onChange={(e) => setLoginIdent(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
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
                Reader Handle (Ex Libris Handle)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#475569] dark:text-[#94A3B8]">
                  <AtSign size={15} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. reader_jane"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white dark:bg-[#121316] border border-[#E2D9C8] dark:border-[#2A2F3A] text-[#1E293B] dark:text-[#F1F5F9] focus:outline-hidden focus:ring-2 focus:ring-[#C2410C]/40 transition-shadow"
                />
              </div>
              {signupUsername && (
                <p className="text-3xs text-[#475569] dark:text-[#94A3B8] mt-1 pl-1">
                  Provenance tag: <span className="font-mono text-[#C2410C] dark:text-[#D97706]">❧ ex/{signupUsername}</span>
                </p>
              )}
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
