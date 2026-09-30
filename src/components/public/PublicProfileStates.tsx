import React from 'react';
import { 
  HelpCircle, 
  Home, 
  ShieldAlert, 
  Lock, 
  ArrowRight, 
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ProductIllustration } from '../illustration/ProductIllustration';

interface PublicProfileStateProps {
  username?: string;
  onGoHome?: () => void;
  onOpenAuth?: () => void;
}

/**
 * PUB-003: 404 Profile Not Found state with clear, accessible messaging & handle registration CTA
 */
export const ProfileNotFoundState: React.FC<PublicProfileStateProps> = ({ username = '', onGoHome }) => {
  const { setCurrentView } = useApp();

  const handleClaim = () => {
    setCurrentView('marketing');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-canvas text-ink selection:bg-indigo-500/30">
      <div className="w-full max-w-md bg-surface/70 border border-line rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-4 rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-2">
          <ProductIllustration variant="route" />
        </div>
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-surface-2/80 border border-line-strong/80 flex items-center justify-center text-muted">
          <HelpCircle className="w-8 h-8 text-accent" />
        </div>

        <span className="inline-block text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-surface-2 text-muted mb-3">
          404 · Page Not Found
        </span>

        <h1 className="text-2xl font-bold tracking-tight mb-2 text-ink font-display">
          Profile Unavailable
        </h1>

        <p className="text-sm text-muted leading-relaxed mb-6">
          The creator profile <strong className="text-ink-strong">@{username || 'unknown'}</strong> doesn't exist, may have changed handle, or has been unpublished.
        </p>

        {/* Claim CTA Card */}
        <div className="p-4 rounded-xl bg-canvas/80 border border-line/80 mb-6 text-left flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <div className="text-xs font-semibold text-ink-strong truncate">
              Claim @{username || 'your-name'}
            </div>
            <div className="text-[11px] text-muted">
              This handle might be available to reserve now.
            </div>
          </div>
          <button
            onClick={handleClaim}
            className="touch-target px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
          >
            Claim handle
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onGoHome || (() => setCurrentView('marketing'))}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-strong text-xs font-semibold flex items-center justify-center gap-2 border border-line-strong transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to LynkFlow</span>
          </button>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-subtle">
        Powered by <strong className="text-muted">LynkFlow</strong> · Link-in-Bio & Mini-Site Platform
      </footer>
    </div>
  );
};

/**
 * PUB-003: Unpublished / Private Draft Profile State
 */
export const ProfileUnpublishedState: React.FC<PublicProfileStateProps> = ({ username = '', onGoHome }) => {
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-canvas text-ink">
      <div className="w-full max-w-md bg-surface/70 border border-line rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-2">
          <ProductIllustration variant="onboarding" />
        </div>
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-warning">
          <Lock className="w-8 h-8" />
        </div>

        <span className="inline-block text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-amber-500/10 text-warning border border-amber-500/20 mb-3">
          Private · Draft Profile
        </span>

        <h1 className="text-2xl font-bold tracking-tight mb-2 text-ink font-display">
          Profile Not Published
        </h1>

        <p className="text-sm text-muted leading-relaxed mb-6">
          The creator at <strong className="text-ink-strong">@{username}</strong> is currently editing this page in private draft mode. It hasn't been published to the live web yet.
        </p>

        <div className="p-4 rounded-xl bg-canvas/80 border border-line/80 mb-6 text-xs text-muted text-left space-y-3">
          <div className="flex items-center gap-2 text-body font-semibold">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>Have a private preview link or token?</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem('tokenInput') as HTMLInputElement)?.value;
              if (input && input.trim()) {
                window.location.search = `?view=public_standalone&u=${username}&previewToken=${input.trim()}`;
              }
            }}
            className="flex items-center gap-2"
          >
            <input
              name="tokenInput"
              type="text"
              placeholder="Enter preview token (e.g. prev_...)"
              className="flex-1 px-3 py-1.5 rounded-lg bg-surface border border-line-strong text-xs text-ink placeholder-subtle focus:outline-hidden focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
            className="touch-target px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-strong text-xs font-semibold cursor-pointer border border-line-strong transition-colors"
            >
              Verify
            </button>
          </form>
          <p className="text-[11px] text-subtle">
            If you are the profile owner, log in to your LynkFlow creator dashboard to review and publish your changes to visitors.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setCurrentView('editor')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
          >
            <span>Open in Editor</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onGoHome || (() => setCurrentView('marketing'))}
            className="w-full py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-body text-xs font-semibold flex items-center justify-center gap-2 border border-line-strong transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * PUB-003: Suspended Profile State (Trust & Safety)
 */
export const ProfileSuspendedState: React.FC<PublicProfileStateProps> = ({ username = '', onGoHome }) => {
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-canvas text-ink">
      <div className="w-full max-w-md bg-surface/70 border border-danger/40 rounded-3xl p-8 text-center shadow-2xl backdrop-blur-xl">
        <div className="mb-4 rounded-2xl border border-rose-500/15 bg-rose-500/5 p-2">
          <ProductIllustration variant="profiles" />
        </div>
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-danger">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <span className="inline-block text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-rose-500/10 text-danger border border-rose-500/20 mb-3">
          Suspended Profile
        </span>

        <h1 className="text-2xl font-bold tracking-tight mb-2 text-ink font-display">
          Profile Suspended
        </h1>

        <p className="text-sm text-muted leading-relaxed mb-6">
          The public page for <strong className="text-ink-strong">@{username}</strong> has been suspended due to community guidelines or safety compliance review.
        </p>

        <button
          onClick={onGoHome || (() => setCurrentView('marketing'))}
          className="w-full py-2.5 px-4 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink-strong text-xs font-semibold flex items-center justify-center gap-2 border border-line-strong transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to LynkFlow</span>
        </button>
      </div>
    </div>
  );
};

/**
 * PUB-005: High-speed profile loading skeleton
 */
export const ProfileLoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center p-6 bg-canvas text-ink animate-pulse">
      <div className="w-full max-w-md mx-auto pt-10 flex flex-col items-center">
        {/* Avatar skeleton */}
        <div className="w-24 h-24 rounded-full bg-surface-2 mb-4 ring-2 ring-line" />
        {/* Name skeleton */}
        <div className="w-44 h-6 rounded-md bg-surface-2 mb-2" />
        {/* Bio skeleton */}
        <div className="w-64 h-4 rounded-md bg-surface-2/80 mb-6" />

        {/* Socials bar skeleton */}
        <div className="flex gap-2 mb-8">
          <div className="w-9 h-9 rounded-full bg-surface-2" />
          <div className="w-9 h-9 rounded-full bg-surface-2" />
          <div className="w-9 h-9 rounded-full bg-surface-2" />
        </div>

        {/* Blocks skeleton */}
        <div className="w-full space-y-3">
          <div className="w-full h-14 rounded-xl bg-surface-2/70" />
          <div className="w-full h-14 rounded-xl bg-surface-2/70" />
          <div className="w-full h-40 rounded-xl bg-surface-2/70" />
          <div className="w-full h-14 rounded-xl bg-surface-2/70" />
        </div>
      </div>
    </div>
  );
};
