import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { THEME_PRESETS } from '../../data/mockData';
import { PERSONA_TEMPLATES } from '../../data/personaTemplates';
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

const CATEGORIES = PERSONA_TEMPLATES.map(template => ({
  id: template.category,
  personaTemplateId: template.id,
  label: template.name,
  desc: template.description,
}));

const ThemePreviewCard: React.FC<{ theme: (typeof THEME_PRESETS)[number]; selected: boolean }> = ({ theme, selected }) => {
  const pageBackground = theme.bgGradient || theme.bgColor;
  return (
    <div
      className="relative h-36 overflow-hidden rounded-xl border border-black/10 p-2.5 shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
      style={{ background: pageBackground, color: theme.textColor, fontFamily: theme.fontBody }}
      aria-hidden="true"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ backgroundColor: theme.accentColor, color: theme.cardTextColor }}>LF</span>
        <span className="h-2 w-16 rounded-full opacity-90" style={{ backgroundColor: theme.textColor }} />
      </div>
      <span className="mt-2 block h-1.5 w-24 rounded-full opacity-60" style={{ backgroundColor: theme.subtitleColor }} />
      <div className="mt-3 space-y-1.5">
        {[0, 1, 2].map(index => (
          <div key={index} className="flex items-center gap-2 rounded-lg px-2 py-2" style={{ backgroundColor: theme.cardBg, border: `1px solid ${theme.cardBorder}`, color: theme.cardTextColor }}>
            <span className="h-1.5 flex-1 rounded-full opacity-85" style={{ backgroundColor: theme.cardTextColor }} />
            <span className="h-1.5 w-5 rounded-full opacity-55" style={{ backgroundColor: theme.cardSubtitleColor }} />
          </div>
        ))}
      </div>
      {selected && <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-white text-black shadow-sm"><Check className="h-3 w-3" /></span>}
    </div>
  );
};

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
  const [selectedPersonaId, setSelectedPersonaId] = useState(CATEGORIES[0].personaTemplateId);
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
      const selectedPersona = PERSONA_TEMPLATES.find(template => template.id === selectedPersonaId);
      const blueprint: StarterProfileBlueprint = {
        category: selectedPersona?.category || category,
        personaTemplateId: selectedPersona?.id,
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
              {step === 1 && 'What are you building?'}
              {step === 2 && 'Claim your handle & profile'}
              {step === 3 && 'Choose your page direction'}
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
                onClick={() => { setCategory(cat.id); setSelectedPersonaId(cat.personaTemplateId); }}
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
              Choose the look that feels most like you. You can change the colors, background, type, and layout at any time.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {THEME_PRESETS.map((thm) => {
                const isSelected = selectedThemeId === thm.id;
                return (
                  <button
                    key={thm.id}
                    type="button"
                    onClick={() => setSelectedThemeId(thm.id)}
                    aria-label={`Choose ${thm.name} page direction`}
                    className={`group rounded-2xl border p-2 text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected 
                        ? 'border-indigo-500 bg-accent-surface text-ink ring-2 ring-indigo-500/20' 
                        : 'border-line bg-canvas text-muted hover:border-line-strong hover:shadow-sm'
                    }`}
                  >
                    <ThemePreviewCard theme={thm} selected={isSelected} />
                    <div className="px-1.5 pb-1 pt-2">
                      <div className="truncate text-xs font-bold text-ink">{thm.name}</div>
                      <div className="mt-0.5 text-[10px] text-subtle">A ready-to-edit creator page</div>
                    </div>
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
