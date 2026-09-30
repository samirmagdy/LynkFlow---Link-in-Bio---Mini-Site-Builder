import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Sparkles, 
  LogIn, 
  ArrowRight, 
  UserPlus, 
  CheckCircle2, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { triggerAnimeRipple } from '../../utils/animeAnimations';
import { Dialog } from '../common/Dialog';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'create' | 'login' | 'forgot' | 'verify' | 'reset';
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  initialMode = 'create', 
  onClose 
}) => {
  const { 
    signUp, 
    logIn, 
    requestPasswordReset, 
    verifyEmail, 
    resendVerificationEmail, 
    setCurrentView, resetPassword
  } = useApp();

  const [mode, setMode] = useState<'create' | 'login' | 'forgot' | 'verify' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsLoading(true);

    const res = await signUp(email, password, name);
    setIsLoading(false);

    if (res.success) {
      setMode('login');
      setFormSuccess('Account created! Please verify your email to unlock all publishing features.');
    } else {
      setFormError(res.error || 'Failed to create account.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsLoading(true);

    const res = await logIn(email, password);
    setIsLoading(false);

    if (res.success) {
      onClose();
      setCurrentView('editor');
    } else {
      // ACC-005: Generic error preventing account enumeration
      setFormError(res.error || 'Invalid email or password.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsLoading(true);

    const res = await requestPasswordReset(email);
    setIsLoading(false);

    setFormSuccess(res.message);
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsLoading(true);

    const res = await verifyEmail();
    setIsLoading(false);

    if (res.success) {
      setFormSuccess('Email verified successfully! You have full access.');
      setTimeout(() => {
        onClose();
        setCurrentView('editor');
      }, 1200);
    } else {
      setFormError(res.error || 'Invalid or expired token.');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsLoading(true);
    const res = await resetPassword('supabase-recovery-session', newPassword);
    setIsLoading(false);
    if (res.success) {
      setFormSuccess('Password reset successfully.');
      setTimeout(() => { onClose(); setCurrentView('editor'); }, 800);
    } else {
      setFormError(res.error || 'Unable to reset password. Please request a new link.');
    }
  };

  const handleResend = async () => {
    const res = await resendVerificationEmail();
    if (res.success) setFormSuccess('Verification email sent.');
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      labelledBy="auth-modal-title"
      describedBy="auth-modal-description"
      className="w-full max-w-4xl max-h-[calc(100vh-1.5rem)] overflow-y-auto overflow-x-hidden rounded-3xl border border-line bg-surface text-ink shadow-2xl"
    >
      <div className="grid min-h-[min(620px,calc(100vh-1.5rem))] grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.78fr)]">
        <section className="order-2 flex min-w-0 flex-col p-5 sm:p-7 md:order-1">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            {mode === 'create' && <UserPlus className="w-5 h-5 text-accent" />}
            {mode === 'login' && <LogIn className="w-5 h-5 text-success" />}
            {mode === 'forgot' && <KeyRound className="w-5 h-5 text-warning" />}
            {mode === 'verify' && <Mail className="w-5 h-5 text-info" />}
            {mode === 'reset' && <KeyRound className="w-5 h-5 text-success" />}
            <h3 id="auth-modal-title" className="text-base font-bold text-ink tracking-tight">
              {mode === 'create' && 'Create Your Creator Account'}
              {mode === 'login' && 'Sign in to Creator Studio'}
              {mode === 'forgot' && 'Reset Your Password'}
              {mode === 'verify' && 'Verify Your Email Address'}
              {mode === 'reset' && 'Choose a New Password'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="touch-target p-1 text-muted hover:text-ink rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p id="auth-modal-description" className="mt-4 max-w-md text-xs leading-relaxed text-muted">
          {mode === 'create' && 'Build a polished link-in-bio page and bring every destination into one place.'}
          {mode === 'login' && 'Sign in to manage your pages, themes, analytics, and publishing workflow.'}
          {mode === 'forgot' && 'We will send a secure reset link to the email connected to your account.'}
          {mode === 'verify' && 'Verify your email to unlock live publishing and creator workspace features.'}
          {mode === 'reset' && 'Choose a new password to secure your LynkFlow creator workspace.'}
        </p>
        {mode === 'create' && (
          <p className="mt-2 max-w-md text-[11px] leading-relaxed text-subtle">
            Start with a starter site, tune your theme, and publish your first page when it is ready. No credit card required.
          </p>
        )}

        {/* Mode Selector for Create vs Login */}
        {(mode === 'create' || mode === 'login') && (
          <div className="grid grid-cols-2 p-1 rounded-xl bg-canvas border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                mode === 'create' 
                  ? 'bg-surface-2 text-ink shadow-xs' 
                  : 'text-muted hover:text-ink-strong'
              }`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                mode === 'login' 
                  ? 'bg-surface-2 text-ink shadow-xs' 
                  : 'text-muted hover:text-ink-strong'
              }`}
            >
              Log In
            </button>
          </div>
        )}

        {/* Feedback Messages */}
        {formError && (
          <div className="p-3 rounded-xl bg-danger-surface border border-danger/40 text-danger text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="p-3 rounded-xl bg-success-surface border border-success/40 text-success text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-success" />
            <span>{formSuccess}</span>
          </div>
        )}

        {/* Mode 1: Sign Up (ACC-001) */}
        {mode === 'create' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Your Full Name or Brand
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jordan Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Email Address <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Choose Password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-subtle mt-1 block">
                Must include 8+ characters. Handled securely with zero plain-text storage.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(255, 255, 255, 0.25)')}
                className="w-full py-2.5 px-4 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-text text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>{isLoading ? 'Creating Account...' : 'Continue to Onboarding'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-subtle pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-success" />
              <span>Free 14-day trial included · No credit card required</span>
            </div>
          </form>
        )}

        {/* Mode 2: Log In (ACC-001 & ACC-005) */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Account Email
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="SamirMagdy80@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-body">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="text-[11px] text-accent hover:text-accent-soft underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(255, 255, 255, 0.25)')}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Mode 3: Forgot Password (ACC-001 & ACC-005: Non-enumerating) */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-muted">
              Enter your email address and we will dispatch a secure, single-use password reset token valid for 30 minutes.
            </p>

            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Your Email Address
              </label>
              <input
                type="email"
                required
                autoFocus
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-muted hover:text-ink cursor-pointer"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="py-2 px-5 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-text text-xs font-bold transition-colors cursor-pointer"
              >
                Send Reset Link
              </button>
            </div>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <p className="text-xs text-muted">Choose a new password for your LynkFlow account.</p>
            <div>
              <label className="block text-xs font-medium text-body mb-1">New Password</label>
              <input type="password" required minLength={8} autoFocus value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer">
              {isLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}

        {/* Mode 4: Email Verification Prompt (ACC-001) */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <p className="text-xs text-muted">
              Open the confirmation link in your inbox, then return here and check your verification status.
            </p>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResend}
                className="text-xs text-accent hover:text-accent-soft flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Resend Email</span>
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="py-2 px-5 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-text text-xs font-bold transition-colors cursor-pointer"
              >
                Verify & Continue
              </button>
            </div>
          </form>
        )}
        </section>

        <aside className="order-1 relative isolate flex min-h-48 flex-col overflow-hidden border-b border-line bg-[#101014] p-5 text-white md:order-2 md:min-h-0 md:border-b-0 md:border-l md:p-7">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-14 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-mono tracking-wide text-indigo-200">
              <Sparkles className="h-3 w-3 text-indigo-300" aria-hidden="true" />
              lynkflow / creator studio
            </span>
            <span className="text-[10px] font-mono text-white/45">01 / 04</span>
          </div>

          <div className="relative z-10 mt-6 md:mt-auto">
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-300/80">One link. More momentum.</p>
            <h4 className="mt-2 max-w-xs font-['Syne'] text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              Your best work deserves a better home.
            </h4>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/60">
              Shape your page, publish with confidence, and understand what moves your audience.
            </p>
          </div>

          <div className="relative z-10 mt-5 rounded-2xl border border-white/12 bg-white/8 p-3 shadow-2xl backdrop-blur-sm md:mt-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-400 text-[9px] font-bold text-indigo-950">LF</span>
                <div>
                  <p className="text-[10px] font-semibold text-white">Creator page</p>
                  <p className="text-[9px] text-white/45">@yourhandle</p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" aria-label="Published" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-2.5 w-3/5 rounded-full bg-white/75" />
              <div className="h-2 w-2/5 rounded-full bg-white/25" />
              <div className="mt-3 h-9 rounded-xl border border-indigo-300/20 bg-indigo-400/20" />
              <div className="h-9 rounded-xl border border-white/10 bg-white/8" />
            </div>
          </div>
        </aside>
      </div>
    </Dialog>
  );
};
