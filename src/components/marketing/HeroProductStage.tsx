import React from 'react';
import { BarChart2, Check, Layers, Palette, Smartphone, Sparkles } from 'lucide-react';
import { ProductIllustration } from '../illustration/ProductIllustration';

const FloatingCard: React.FC<React.PropsWithChildren<{ className?: string; label: string }>> = ({ className = '', label, children }) => (
  <div className={`hero-product-stage__card rounded-2xl border border-line bg-surface/90 p-3 text-left shadow-2xl backdrop-blur-xl ${className}`} aria-label={label}>
    {children}
  </div>
);

export const HeroProductStage: React.FC = () => (
  <div className="hero-product-stage anime-hero-item relative mx-auto mt-12 w-full max-w-6xl" aria-label="LynkFlow product preview">
    <div className="hero-product-stage__glow" aria-hidden="true" />

    <FloatingCard label="Theme studio preview" className="hero-product-stage__theme">
      <div className="mb-3 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-subtle">
        <span className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 text-accent" /> Theme Studio</span>
        <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] normal-case tracking-normal text-success">Draft</span>
      </div>
      <div className="rounded-xl border border-line bg-canvas/80 p-2.5">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-400 to-emerald-300" />
          <span className="space-y-1"><span className="block h-1.5 w-20 rounded-full bg-ink/70" /><span className="block h-1 w-12 rounded-full bg-subtle/50" /></span>
        </div>
        <div className="space-y-1.5">
          <span className="block h-7 rounded-lg bg-inverse" />
          <span className="block h-7 rounded-lg border border-line-strong bg-surface" />
          <span className="block h-7 rounded-lg border border-accent/30 bg-accent/10" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Tokens synced across the page</div>
    </FloatingCard>

    <FloatingCard label="Analytics preview" className="hero-product-stage__analytics">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-body"><BarChart2 className="h-3.5 w-3.5 text-success" /> Live signals</span>
        <span className="text-[9px] font-mono text-subtle">LAST 30D</span>
      </div>
      <div className="flex items-end gap-1.5 rounded-xl border border-line bg-canvas/70 px-3 pb-2 pt-4">
        {[35, 50, 42, 72, 58, 84, 66, 92, 76, 100].map((height, index) => <span key={index} className={`h-${height} hero-product-stage__bar rounded-t-sm ${index > 6 ? 'bg-accent' : 'bg-emerald-400/60'}`} style={{ height: `${height * 0.42}px` }} />)}
      </div>
      <div className="mt-3 flex items-center justify-between"><span className="text-[9px] text-subtle">Qualified clicks</span><strong className="text-sm text-ink">2,184 <span className="text-[9px] font-medium text-success">+18%</span></strong></div>
    </FloatingCard>

    <FloatingCard label="Live profile preview" className="hero-product-stage__profile">
      <div className="mb-3 flex items-center justify-between text-[10px] text-subtle"><span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-accent" /> Live view</span><span className="flex items-center gap-1 text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Online</span></div>
      <div className="mx-auto max-w-[148px] rounded-[1.25rem] border border-line-strong bg-canvas p-2 shadow-inner">
        <div className="rounded-[0.9rem] bg-gradient-to-b from-indigo-500/25 via-canvas to-emerald-400/10 px-2.5 pb-3 pt-4 text-center">
          <span className="mx-auto block h-9 w-9 rounded-full bg-gradient-to-br from-amber-300 to-rose-400 ring-2 ring-surface" />
          <span className="mx-auto mt-2 block h-1.5 w-16 rounded-full bg-ink/70" /><span className="mx-auto mt-1 block h-1 w-20 rounded-full bg-subtle/50" />
          <span className="mt-3 block h-6 rounded-lg bg-inverse" /><span className="mt-1.5 block h-6 rounded-lg border border-line-strong bg-surface" />
        </div>
      </div>
    </FloatingCard>

    <div className="hero-product-stage__center relative z-10 rounded-[2rem] border border-indigo-400/30 bg-[#101018]/95 p-2 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.18em] text-white/45"><span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-indigo-300" /> Build once</span><span className="flex items-center gap-1.5 text-emerald-300 normal-case tracking-normal"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Published preview</span></div>
      <div className="p-2 sm:p-4"><ProductIllustration variant="assembly" /></div>
    </div>

    <div className="hero-product-stage__status rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-medium text-emerald-200 shadow-lg backdrop-blur-xl"><Check className="mr-1 inline-block h-3.5 w-3.5" /> Draft → live in one controlled flow</div>
    <div className="hero-product-stage__sparkle text-indigo-300" aria-hidden="true"><Sparkles className="h-5 w-5" /></div>
  </div>
);
