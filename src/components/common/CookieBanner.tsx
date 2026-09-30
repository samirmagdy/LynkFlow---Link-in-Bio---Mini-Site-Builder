import React, { useEffect, useState } from 'react';
import { Cookie, Settings2 } from 'lucide-react';
import { analyticsEngineService } from '../../services/analyticsEngineService';

const CONSENT_STORAGE_KEY = 'lynkflow_cookie_consent_v1';
type ConsentChoice = 'accepted' | 'rejected' | 'custom';

interface CookieBannerProps {
  /** Keeps the banner clear of the fixed mobile workspace tabs. */
  inStudio?: boolean;
}

const readConsentChoice = (): ConsentChoice | null => {
  if (typeof window === 'undefined') return null;
  try {
    const choice = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return choice === 'accepted' || choice === 'rejected' || choice === 'custom' ? choice : null;
  } catch {
    return null;
  }
};

export const CookieBanner: React.FC<CookieBannerProps> = ({ inStudio = false }) => {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [optionalAnalytics, setOptionalAnalytics] = useState(false);

  useEffect(() => {
    const storedChoice = readConsentChoice();
    setChoice(storedChoice);
    setOptionalAnalytics(storedChoice === 'accepted' || analyticsEngineService.getUserConsent());
  }, []);

  const saveChoice = (nextChoice: ConsentChoice, analyticsEnabled: boolean) => {
    analyticsEngineService.setUserConsent(analyticsEnabled);
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, nextChoice);
    } catch {
      // The in-memory consent service still applies when storage is unavailable.
    }
    setChoice(nextChoice);
    setSettingsOpen(false);
  };

  if (choice) return null;

  const placementClass = inStudio ? 'bottom-24 md:bottom-6' : 'bottom-4';

  return (
    <aside
      aria-label="Cookie preferences"
      className={`fixed inset-x-3 ${placementClass} z-[60] w-auto max-w-md rounded-2xl border border-line-strong bg-surface/95 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-200 sm:left-6 sm:right-auto sm:p-5`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent" aria-hidden="true">
          <Cookie className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Your privacy, your choice</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            We use essential storage to keep LynkFlow working. Optional analytics help us improve the product.
          </p>
        </div>
      </div>

      {settingsOpen && (
        <div className="mt-4 space-y-2 rounded-xl border border-line bg-canvas/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ink">Essential storage</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-subtle">Required for preferences and secure sessions.</p>
            </div>
            <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">Always on</span>
          </div>
          <label className="flex cursor-pointer items-start justify-between gap-3 border-t border-line pt-2.5">
            <span>
              <span className="block text-xs font-semibold text-ink">Optional analytics</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-subtle">Privacy-first product usage insights.</span>
            </span>
            <input
              type="checkbox"
              checked={optionalAnalytics}
              onChange={(event) => setOptionalAnalytics(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--lf-accent)]"
            />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => saveChoice('accepted', true)}
          className="min-h-10 rounded-xl bg-inverse px-3.5 py-2 text-xs font-semibold text-inverse-text transition-colors hover:bg-inverse-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Accept all
        </button>
        <button
          type="button"
          onClick={() => saveChoice('rejected', false)}
          className="min-h-10 rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Reject optional
        </button>
        {settingsOpen ? (
          <button
            type="button"
            onClick={() => saveChoice('custom', optionalAnalytics)}
            className="min-h-10 rounded-xl px-2.5 py-2 text-xs font-semibold text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Save preferences
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Cookie settings
          </button>
        )}
      </div>
    </aside>
  );
};
