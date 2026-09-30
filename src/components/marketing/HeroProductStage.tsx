import React from 'react';
import {
  ArrowRight,
  BarChart3,
  BatteryFull,
  Check,
  ExternalLink,
  Globe2,
  Layers3,
  Link2,
  Palette,
  Signal,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { triggerAnimeRipple, triggerSuccessBurst } from '../../utils/animeAnimations';
import { SPEC_THEME_PRESETS } from '../../data/themePresets';

interface HeroProductStageProps {
  onOpenAuth?: (mode: 'create' | 'login') => void;
  onOpenPreview: () => void;
}

const RULES = [
  { label: 'Primary links', detail: '4 active destinations', icon: Link2, active: true },
  { label: 'Theme tokens', detail: 'Synced across page', icon: Palette, active: true },
  { label: 'Privacy analytics', detail: 'Last 30 days', icon: BarChart3, active: false },
];

const RECENT = [
  { label: 'Qualified clicks', value: '2,184', icon: BarChart3 },
  { label: 'Page status', value: 'Published', icon: Globe2 },
];

// Use a real shipped preset in the product mock so the landing page demonstrates
// the same theme model as the public renderer. The video is a muted Pexels CDN
// asset; the preset image remains the poster and visual fallback.
const HERO_THEME = SPEC_THEME_PRESETS.find(theme => theme.id === 'preset-midnight-studio') ?? SPEC_THEME_PRESETS[0];
const HERO_VIDEO_URL = 'https://videos.pexels.com/video-files/34715630/14715594_360_640_30fps.mp4';
const HERO_VIDEO_POSTER = 'https://images.pexels.com/videos/34715630/pexels-photo-34715630.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=630';
const HERO_THEME_COLORS = HERO_THEME.tokens.colors;
const HERO_THEME_LINKS = [
  { label: 'Explore my latest work', icon: Layers3 },
  { label: 'Book a discovery call', icon: Globe2 },
  { label: 'Download the media kit', icon: Link2 },
];

const FloatingCard: React.FC<React.PropsWithChildren<{ className?: string; label: string }>> = ({ className = '', label, children }) => (
  <div className={`hero-product-stage__card rounded-2xl border border-line bg-surface/95 p-3 text-left shadow-lg ${className}`} aria-label={label}>
    {children}
  </div>
);

/** Branded split hero: clear product promise on left, live editor preview on right. */
export const HeroProductStage: React.FC<HeroProductStageProps> = ({ onOpenAuth, onOpenPreview }) => {
  const handleCreate = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    triggerAnimeRipple(event, event.currentTarget, 'rgba(0, 0, 0, 0.25)');
    triggerSuccessBurst(event.currentTarget);
    onOpenAuth?.('create');
  };

  return (
    <div className="hero-product-stage relative mx-auto w-full max-w-7xl" aria-label="LynkFlow product preview">
      <div className="hero-product-stage__glow" aria-hidden="true" />
      <div className="relative z-10 grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:gap-10">
        <div className="max-w-xl text-left">
          <div className="anime-hero-item inline-flex items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse" aria-hidden="true" />
            Branded pages for creators, studios, and brands
          </div>

          <h1 className="anime-hero-item mt-7 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink text-balance sm:text-6xl lg:text-[4.4rem]">
            Turn every click into a <span className="text-accent">clear next step.</span>
          </h1>

          <p className="anime-hero-item mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Build one flexible destination for links, video, forms, downloads, and bookings. Make it yours, publish in minutes, and see what moves your audience.
          </p>

          <div className="anime-hero-item mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="/signup" onClick={handleCreate} className="touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-inverse px-6 py-3 text-sm font-bold text-inverse-text shadow-lg transition-colors hover:bg-inverse-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              Create your page <ArrowRight className="h-4 w-4" />
            </a>
            <button type="button" onClick={onOpenPreview} className="touch-target inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 py-3 text-sm font-semibold text-body transition-colors hover:border-line-strong hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <ExternalLink className="h-4 w-4 text-accent" /> See live preview
            </button>
          </div>

          <p className="anime-hero-item mt-3 text-xs text-subtle">Free to start · no credit card required · publish when ready</p>

          <ul className="anime-hero-item mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs text-muted" aria-label="Product benefits">
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Publish in minutes</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Custom domain ready</li>
            <li className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Privacy-first analytics</li>
          </ul>
        </div>

        <div className="relative flex min-h-[570px] items-center justify-center py-8 sm:min-h-[640px]">
          <div className="hero-product-stage__ripple" aria-hidden="true" />

          <FloatingCard label="Theme studio status" className="hero-product-stage__theme anime-hero-item hidden sm:block">
            <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-subtle"><span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-accent" /> Theme studio</span><span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-success">Ready</span></div>
            <div className="rounded-xl border border-line bg-canvas/80 p-2.5"><div className="mb-3 flex items-center gap-2"><span className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-300" /><span className="space-y-1"><span className="block h-1.5 w-20 rounded-full bg-ink/70" /><span className="block h-1 w-12 rounded-full bg-subtle/50" /></span></div><div className="space-y-1.5"><span className="block h-7 rounded-lg bg-inverse" /><span className="block h-7 rounded-lg border border-line-strong bg-surface" /><span className="block h-7 rounded-lg border border-accent/30 bg-accent/10" /></div></div>
            <p className="mt-2 text-[9px] text-muted">Contrast-safe tokens applied</p>
          </FloatingCard>

          <FloatingCard label="Live analytics status" className="hero-product-stage__analytics anime-hero-item hidden sm:block">
            <div className="mb-3 flex items-center justify-between text-[10px] font-semibold text-body"><span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-success" /> Live signals</span><span className="text-[9px] font-mono text-subtle">30 DAYS</span></div>
            <div className="flex h-20 items-end gap-1.5 rounded-xl border border-line bg-canvas/70 px-3 pb-2 pt-3">{[28, 42, 34, 58, 48, 68, 55, 76, 63, 84].map((height, index) => <span key={index} className={`hero-product-stage__bar rounded-t-sm ${index > 6 ? 'bg-accent' : 'bg-emerald-400/60'}`} style={{ height: `${height}%` }} />)}</div>
            <div className="mt-3 flex items-center justify-between"><span className="text-[9px] text-subtle">Qualified clicks</span><strong className="text-sm text-ink">2,184 <span className="text-[9px] font-medium text-success">+18%</span></strong></div>
          </FloatingCard>

          <div className="hero-product-stage__phone relative z-10 w-[min(78vw,300px)] overflow-hidden rounded-[2.45rem] border-[7px] border-[#1c1c22] bg-[#111117] p-1.5 shadow-xl shadow-indigo-950/20 sm:w-[300px]">
            <div className="relative overflow-hidden rounded-[2rem] text-[11px]" style={{ backgroundColor: HERO_THEME_COLORS.pageBackground, color: HERO_THEME_COLORS.primaryText }}>
              <video
                className="absolute inset-0 h-full w-full object-cover opacity-70"
                src={HERO_VIDEO_URL}
                poster={HERO_VIDEO_POSTER}
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                aria-hidden="true"
              />
              <div className="absolute inset-0" style={{ backgroundColor: `${HERO_THEME_COLORS.pageBackground}cc` }} aria-hidden="true" />
              <div className="relative z-10">
              <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#111117]" aria-hidden="true" />
              <div className="flex items-center justify-between px-6 pt-3.5 text-[10px] font-semibold"><span>9:41</span><span className="flex items-center gap-1"><Signal className="h-3 w-3" /><Wifi className="h-3 w-3" /><BatteryFull className="h-3.5 w-3.5" /></span></div>
              <div className="px-4 pt-6 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 text-base font-bold" style={{ backgroundColor: HERO_THEME_COLORS.panelBackground, borderColor: HERO_THEME_COLORS.accent, color: HERO_THEME_COLORS.primaryText }}>AV</span><div className="mt-2 text-base font-bold">Alex Vance</div><div className="mt-1 text-[10px]" style={{ color: HERO_THEME_COLORS.secondaryText }}>Visual director, photographer and storyteller.</div><div className="mt-3 flex justify-center gap-2" aria-label="Social links"><span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: HERO_THEME_COLORS.cardBg, color: HERO_THEME_COLORS.accent }}><Globe2 className="h-3 w-3" /></span><span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: HERO_THEME_COLORS.cardBg, color: HERO_THEME_COLORS.accent }}><Sparkles className="h-3 w-3" /></span><span className="grid h-6 w-6 place-items-center rounded-full" style={{ backgroundColor: HERO_THEME_COLORS.cardBg, color: HERO_THEME_COLORS.accent }}><Link2 className="h-3 w-3" /></span></div></div>
              <div className="mx-4 mt-4 space-y-2">{HERO_THEME_LINKS.map(({ label, icon: Icon }, index) => <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 text-[10px] font-semibold" style={{ backgroundColor: index === 0 ? HERO_THEME_COLORS.accent : HERO_THEME_COLORS.cardBg, color: index === 0 ? HERO_THEME_COLORS.accentText : HERO_THEME_COLORS.cardTextColor, border: `1px solid ${index === 0 ? HERO_THEME_COLORS.accent : HERO_THEME_COLORS.cardBorder}`, borderRadius: `${HERO_THEME.tokens.shape.buttonRadius}px`, boxShadow: HERO_THEME.componentVariants?.link === 'glass' ? '0 8px 18px rgba(0,0,0,.12)' : undefined }}><Icon className="h-3.5 w-3.5" /><span className="flex-1">{label}</span><ArrowRight className="h-3 w-3" /></div>)}</div>
              <div className="mx-4 mt-3 rounded-xl p-3" style={{ backgroundColor: HERO_THEME_COLORS.cardBg, border: `1px solid ${HERO_THEME_COLORS.cardBorder}` }}><div className="flex items-center justify-between text-[10px] font-semibold"><span>Work with me</span><span style={{ color: HERO_THEME_COLORS.accent }}>Open form</span></div><div className="mt-1 text-[9px]" style={{ color: HERO_THEME_COLORS.cardSubtitleColor }}>Tell me about your project and timeline.</div></div>
              <div className="mt-4 border-t px-6 pb-4 pt-2.5" style={{ backgroundColor: `${HERO_THEME_COLORS.cardBg}dd`, borderColor: HERO_THEME_COLORS.cardBorder }}><div className="flex justify-center gap-5" style={{ color: HERO_THEME_COLORS.secondaryText }}><Layers3 className="h-4 w-4" style={{ color: HERO_THEME_COLORS.accent }} /><Palette className="h-4 w-4" /><BarChart3 className="h-4 w-4" /><Globe2 className="h-4 w-4" /></div><div className="mx-auto mt-3 h-1 w-20 rounded-full" style={{ backgroundColor: HERO_THEME_COLORS.primaryText }} /></div>
              </div>
            </div>
          </div>

          <div className="hero-product-stage__status rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-[10px] font-medium text-success shadow-md"><Check className="mr-1 inline-block h-3.5 w-3.5" /> Draft to live in one controlled flow</div>
        </div>
      </div>
    </div>
  );
};
