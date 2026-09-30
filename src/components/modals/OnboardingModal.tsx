import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { THEME_PRESETS } from '../../data/mockData';
import { validateHandle } from '../../utils/handleValidator';
import { StarterProfileBlueprint } from '../../types';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  AlertCircle
} from 'lucide-react';
import { triggerAnimeRipple } from '../../utils/animeAnimations';
import { Dialog } from '../common/Dialog';
import { ProductIllustration } from '../illustration/ProductIllustration';

const CATEGORIES = [
  { id: 'Creator & Artist', label: 'Creator & Visual Artist', desc: 'Photography, portfolio, YouTube cinema reels & digital prints' },
  { id: 'Design Agency & Studio', label: 'Agency & Studio', desc: 'Client case studies, quote intake forms & font licenses' },
  { id: 'Hospitality & Culinary', label: 'Culinary & Hospitality', desc: 'Menus, reservations, cookbook preorders & masterclasses' },
  { id: 'Podcaster & Musician', label: 'Musician & Audio', desc: 'Spotify streams, tour tickets, merch shop & newsletter' },
  { id: 'Tech & Startup', label: 'Tech & Modern Founder', desc: 'Product demos, investor deck, beta signups & calendar booking' }
];

export const OnboardingModal: React.FC = () => {
  const { 
    isOnboardingOpen, 
    completeOnboarding, 
    skipOnboarding, 
    profiles, 
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState(THEME_PRESETS[0].id);
  const [handleTouched, setHandleTouched] = useState(false);

  if (!isOnboardingOpen) return null;

  const existingHandles = profiles.map(p => p.username);
  const handleCheck = validateHandle(handle, existingHandles);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setHandleTouched(true);
      if (!handleCheck.isValid) return;
      setStep(3);
    } else if (step === 3) {
      const blueprint: StarterProfileBlueprint = {
        category,
        handle: handleCheck.normalized,
        displayName: displayName.trim() || handleCheck.normalized,
        bio: bio.trim() || `Official links, portfolio and releases for ${displayName.trim() || handleCheck.normalized}.`,
        themeId: selectedThemeId
      };
      completeOnboarding(blueprint);
    }
  };

  return (
    <Dialog open={isOnboardingOpen} onClose={skipOnboarding} labelledBy="onboarding-modal-title" className="w-full max-w-xl bg-surface border border-line rounded-3xl p-6 sm:p-8 shadow-2xl text-ink space-y-6">
        {/* Header & Step Tracker */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-accent text-[10px] font-mono border border-indigo-500/20 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Step {step} of 3</span>
            </div>
            <h2 id="onboarding-modal-title" className="text-xl font-extrabold text-ink font-display tracking-tight">
              {step === 1 && 'What is your primary goal?'}
              {step === 2 && 'Claim your handle & profile'}
              {step === 3 && 'Choose your starting visual system'}
            </h2>
          </div>

          {/* ACC-004: Skip option */}
          <button
            type="button"
            onClick={skipOnboarding}
            className="text-xs text-muted hover:text-ink underline cursor-pointer self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1"
          >
            Skip for now & customize later
          </button>
        </div>

        <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-2">
          <ProductIllustration variant={step === 1 ? 'onboarding' : step === 2 ? 'route' : 'theme'} />
        </div>

        {/* Step 1: Goal / Category */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-xs text-muted">
              Select the option that best describes your presence. We will preload 3 curated starter blocks tailored to your field.
            </p>

            <div className="grid grid-cols-1 gap-2.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'border-indigo-500 bg-accent-surface text-ink' 
                        : 'border-line bg-canvas text-muted hover:border-line-strong'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-ink">{cat.label}</div>
                      <div className="text-[11px] text-muted mt-0.5">{cat.desc}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-accent shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="py-2.5 px-6 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-text text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Handle & Details (ACC-002: Normalization & Collision Validation) */}
        {step === 2 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Your Public Handle <span className="text-danger">*</span>
              </label>
              <div className="flex items-center rounded-xl bg-canvas border border-line px-3 py-2 text-xs font-mono focus-within:border-indigo-500 transition-colors">
                <span className="text-subtle select-none">lynkflow.me/</span>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="yourhandle"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setHandleTouched(true);
                  }}
                  className="bg-transparent text-ink focus:outline-none flex-1 ml-0.5"
                />
              </div>

              {/* Real-time validation feedback */}
              {handleTouched && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                  {handleCheck.isValid ? (
                    <span className="text-success flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Handle <strong>@{handleCheck.normalized}</strong> is available!
                    </span>
                  ) : (
                    <span className="text-danger flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {handleCheck.error}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jordan Vance or Studio Nova"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-body mb-1">
                Short Bio (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Brief intro for your visitors..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!handleCheck.isValid}
                className={`py-2.5 px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  handleCheck.isValid 
                    ? 'bg-inverse hover:bg-inverse-hover text-inverse-text cursor-pointer shadow-md' 
                    : 'bg-surface-2 text-subtle cursor-not-allowed'
                }`}
              >
                <span>Continue to Theme</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Theme Selection & Starter Profile Creation (ACC-003) */}
        {step === 3 && (
          <form onSubmit={handleNextStep} className="space-y-4">
            <p className="text-xs text-muted">
              Pick an initial theme preset. Every theme enforces WCAG AA contrast compliance and can be customized with our design token studio.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_PRESETS.map((thm) => {
                const isSelected = selectedThemeId === thm.id;
                return (
                  <button
                    key={thm.id}
                    type="button"
                    onClick={() => setSelectedThemeId(thm.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected 
                        ? 'border-indigo-500 bg-accent-surface text-ink ring-2 ring-indigo-500/20' 
                        : 'border-line bg-canvas text-muted hover:border-line-strong'
                    }`}
                  >
                    <div 
                      className="w-full h-8 rounded-lg mb-2 border border-ink/10 shadow-xs"
                      style={{ background: thm.bgGradient || thm.bgColor }}
                    />
                    <div className="text-xs font-bold text-ink truncate">{thm.name}</div>
                    <div className="text-[10px] text-subtle font-mono mt-0.5">{thm.fontDisplay}</div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-canvas border border-line text-xs text-muted flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success shrink-0" />
              <span>
                Your starter page will be provisioned at <strong>lynkflow.me/{handleCheck.normalized}</strong> with pre-populated links and inquiry form.
              </span>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(255, 255, 255, 0.25)')}
                className="py-2.5 px-6 rounded-xl bg-inverse hover:bg-inverse-hover text-inverse-text text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <span>Launch Creator Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
    </Dialog>
  );
};
