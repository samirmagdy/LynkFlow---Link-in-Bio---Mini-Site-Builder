import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ArrowRight, 
  Layers, 
  Palette, 
  BarChart2, 
  QrCode, 
  ShieldCheck, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { 
  runStaggeredEntrance, 
  triggerAnimeRipple, 
  animateHoverEnter, 
  animateHoverLeave,
  triggerSuccessBurst,
  animateIconBounce,
  animateTableRowCascade,
  animateAccordionExpand,
  animateHeroEntrance,
  prefersReducedMotion
} from '../../utils/animeAnimations';
import { 
  PRICING_PLANS, 
  CAPABILITY_COMPARISON_MATRIX, 
  formatPlanPrice 
} from '../../data/pricingPlans';
import { BillingCycle } from '../../types';
import { ProductIllustration } from '../illustration/ProductIllustration';
import { LandingMotionBackground } from './LandingMotionBackground';
import { HeroProductStage } from './HeroProductStage';
import './heroProductStage.css';

interface MarketingPageProps {
  onOpenAuth?: (mode: 'create' | 'login') => void;
}

export const MarketingPage: React.FC<MarketingPageProps> = ({ onOpenAuth }) => {
  const { setCurrentView, workspace, upgradePlan } = useApp();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState<string | null>(null);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);

  // Component refs for Anime.js animations
  const heroContainerRef = useRef<HTMLDivElement>(null);
  const featuredSectionRef = useRef<HTMLDivElement>(null);
  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const comparisonSectionRef = useRef<HTMLDivElement>(null);
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const ctaSectionRef = useRef<HTMLDivElement>(null);
  const faqAnswerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Setup Anime.js entrance and scroll animations
  useEffect(() => {
    const activeAnimations: Array<{ pause?: () => void; cancel?: () => void }> = [];
    if (prefersReducedMotion()) return;

    // 1. Hero elements orchestrally staggered
    if (heroContainerRef.current) {
      const heroAnimation = animateHeroEntrance(heroContainerRef.current);
      if (heroAnimation) activeAnimations.push(heroAnimation as { pause?: () => void; cancel?: () => void });
    }

    // 2. Scroll-triggered IntersectionObserver for all landing page components
    const animatedSections = new Set<string>();

    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const target = entry.target as HTMLElement;
        const sectionKey = target.dataset.sectionKey;
        if (!sectionKey || animatedSections.has(sectionKey)) return;
        animatedSections.add(sectionKey);

        // Run section-specific Anime.js stagger animations
        if (sectionKey === 'featured') {
          const cards = target.querySelectorAll<HTMLElement>('.featured-anime-card');
          const header = target.querySelectorAll<HTMLElement>('.featured-anime-header');
          runStaggeredEntrance(header, 'cinematicGlide');
          runStaggeredEntrance(cards, 'springPop');
        } else if (sectionKey === 'features') {
          const cards = target.querySelectorAll<HTMLElement>('.feature-anime-card');
          const header = target.querySelectorAll<HTMLElement>('.feature-anime-header');
          runStaggeredEntrance(header, 'cinematicGlide');
          runStaggeredEntrance(cards, 'springPop');
        } else if (sectionKey === 'playground') {
          const header = target.querySelectorAll<HTMLElement>('.playground-anime-header');
          runStaggeredEntrance(header, 'cinematicGlide');
        } else if (sectionKey === 'comparison') {
          const header = target.querySelectorAll<HTMLElement>('.comparison-anime-header');
          const rows = target.querySelectorAll<HTMLElement>('.comparison-table-row');
          runStaggeredEntrance(header, 'cinematicGlide');
          animateTableRowCascade(rows);
        } else if (sectionKey === 'faq') {
          const header = target.querySelectorAll<HTMLElement>('.faq-anime-header');
          const items = target.querySelectorAll<HTMLElement>('.faq-anime-item');
          runStaggeredEntrance(header, 'cinematicGlide');
          runStaggeredEntrance(items, 'elasticWave');
        } else if (sectionKey === 'cta') {
          const items = target.querySelectorAll<HTMLElement>('.cta-anime-item');
          runStaggeredEntrance(items, 'backZoom');
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    const sectionsToObserve = [
      featuredSectionRef.current,
      featuresSectionRef.current,
      comparisonSectionRef.current,
      faqSectionRef.current,
      ctaSectionRef.current,
    ];

    sectionsToObserve.forEach((sec) => {
      if (sec) observer.observe(sec);
    });

    // Fallback: trigger first two sections in case viewport is high resolution
    const timer = setTimeout(() => {
      if (featuredSectionRef.current && !animatedSections.has('featured')) {
        const cards = featuredSectionRef.current.querySelectorAll<HTMLElement>('.featured-anime-card');
        runStaggeredEntrance(cards, 'springPop');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      activeAnimations.forEach(animation => {
        animation.pause?.();
        animation.cancel?.();
      });
    };
  }, []);

  const toggleFaq = (idx: number) => {
    const willOpen = openFaq !== idx;
    setOpenFaq(willOpen ? idx : null);

    if (willOpen) {
      setTimeout(() => {
        const answerEl = faqAnswerRefs.current[idx];
        if (answerEl) {
          animateAccordionExpand(answerEl);
        }
      }, 20);
    }
  };

  const handleCardMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    animateHoverEnter(e.currentTarget);
    const icon = e.currentTarget.querySelector<HTMLElement>('.anime-icon-target');
    if (icon) {
      animateIconBounce(icon);
    }
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    animateHoverLeave(e.currentTarget);
  };

  const handleNewsletterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsletterMessage(null);
    setNewsletterSubmitted(false);
    setNewsletterSubmitting(true);

    try {
      const response = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: newsletterEmail.trim(),
          consent: newsletterConsent,
          source: 'landing_page'
        })
      });
      const payload = await response.json() as { data?: { subscribed?: boolean }; error?: { message?: string } };
      if (!response.ok || payload.data?.subscribed !== true) {
        throw new Error(payload.error?.message || 'We could not save your subscription. Please try again.');
      }
      setNewsletterSubmitted(true);
      setNewsletterEmail('');
      setNewsletterConsent(false);
    } catch (error) {
      setNewsletterMessage(error instanceof Error ? error.message : 'We could not save your subscription. Please try again.');
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const faqs = [
    {
      q: 'How is LynkFlow different from basic link-in-bio tools?',
      a: 'Basic link tools only allow a flat list of URL buttons. LynkFlow gives you complete modular block control — embed YouTube video reels, client inquiry forms, downloadable media kits, collapsible folders, FAQ accordions, and custom domain mapping with zero coding.'
    },
    {
      q: 'Can I connect my own custom domain?',
      a: 'Yes. With Creator Pro and Agency tiers, you can map any custom domain or subdomain (like links.yourbrand.com) with automated, high-performance SSL certificate provisioning.'
    },
    {
      q: 'How does dynamic QR code retargeting work?',
      a: 'When you print your QR code onto physical business cards, merchandise, or flyers, the QR code points to a permanent dynamic redirect. You can change your profile URL or campaign destination at any time without reprinting.'
    },
    {
      q: 'Are page views and link clicks privacy-compliant?',
      a: 'LynkFlow analytics are designed to be cookie-less and privacy-first. We aggregate device classes, referrers, and country distributions without intrusive third-party fingerprinting. Review our privacy documentation for implementation details.'
    },
    {
      q: 'Can multiple team members or clients manage profiles?',
      a: 'Agency Studio plans support multi-profile workspace management, allowing you to create, duplicate, and operate isolated profiles for different brands and clients from a single login.'
    }
  ];
  return (
    <div className="relative isolate w-full bg-canvas text-ink overflow-x-hidden">
      <LandingMotionBackground />
      {/* Hero Section (MKT-001 & Flow 1/2) */}
      <section id="overview" tabIndex={-1} ref={heroContainerRef} className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 focus:outline-none sm:px-6 sm:pb-28 sm:pt-20">
        <HeroProductStage
          onOpenAuth={onOpenAuth || (() => setCurrentView('editor'))}
          onOpenPreview={() => { window.location.assign('/@alexvance?demo=1'); }}
        />
      </section>

      {/* Featured Profiles Live Showcase Section */}
      <section 
        ref={featuredSectionRef}
        data-section-key="featured"
        className="py-16 px-4 sm:px-6 border-y border-line bg-surface/20"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="featured-anime-header text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-ink font-['Syne'] tracking-tight">
              Crafted for creators, studios & modern brands.
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Explore example LynkFlow sites built for different creator and agency goals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Alex Vance */}
            <a
              href="#get-started"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              className="featured-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-colors cursor-pointer group space-y-4"
            >
              <ProductIllustration variant="assembly" className="mb-2 max-h-24" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-ink group-hover:text-accent-soft transition-colors">Alex Vance</h3>
                  <p className="text-xs text-muted">Visual Director & Photographer</p>
                </div>
                <span className="text-[11px] font-mono text-subtle">@alexvance</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Features YouTube cinema reel, Lightroom preset sales, PDF media kit download, and newsletter signup.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-accent font-medium">
                <span className="flex items-center gap-1">
                  Use this creator direction
                  <ArrowRight className="anime-icon-target w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="text-subtle font-mono text-[10px] bg-canvas px-2 py-0.5 rounded border border-line">Onyx Minimal</span>
              </div>
            </a>

            {/* Studio Nova */}
            <a
              href="#get-started"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              className="featured-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-colors cursor-pointer group space-y-4"
            >
              <ProductIllustration variant="theme" className="mb-2 max-h-24" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-ink group-hover:text-accent-soft transition-colors">Studio Nova</h3>
                  <p className="text-xs text-muted">Brand Identity & Type Design</p>
                </div>
                <span className="text-[11px] font-mono text-subtle">@studionova_agency</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Features custom lead qualification intake form, typography license sales, and case study monograph.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-accent font-medium">
                <span className="flex items-center gap-1">
                  Use this agency direction
                  <ArrowRight className="anime-icon-target w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="text-subtle font-mono text-[10px] bg-canvas px-2 py-0.5 rounded border border-line">Nordic Clean</span>
              </div>
            </a>

            {/* Chef Maya Lin */}
            <a
              href="#get-started"
              onMouseEnter={handleCardMouseEnter}
              onMouseLeave={handleCardMouseLeave}
              className="featured-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 transition-colors cursor-pointer group space-y-4"
            >
              <ProductIllustration variant="onboarding" className="mb-2 max-h-24" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-ink group-hover:text-accent-soft transition-colors">Chef Maya Lin</h3>
                  <p className="text-xs text-muted">Pastry Chef & Cookbook Author</p>
                </div>
                <span className="text-[11px] font-mono text-subtle">@mayakitchen</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Features cookbook pre-orders, sourdough troubleshooting PDF guide, and workshop inquiries.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs text-accent font-medium">
                <span className="flex items-center gap-1">
                  Use this professional direction
                  <ArrowRight className="anime-icon-target w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="text-subtle font-mono text-[10px] bg-canvas px-2 py-0.5 rounded border border-line">Editorial Cream</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Breakdown (MKT-002: Themes, Blocks, Org, Analytics) */}
      <section 
        id="features"
        tabIndex={-1}
        ref={featuresSectionRef}
        data-section-key="features"
        className="py-20 px-4 sm:px-6 max-w-7xl mx-auto space-y-12 focus:outline-none"
      >
        <div className="feature-anime-header text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink font-['Syne'] tracking-tight">
            Engineered for conversion, not just navigation.
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Everything you need to turn visitors into followers, clients, and revenue.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(99, 102, 241, 0.25)')}
            className="feature-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-indigo-500/40 transition-colors space-y-3 cursor-default"
          >
            <ProductIllustration variant="assembly" className="mb-3 max-h-32" />
            <div className="anime-icon-target p-2.5 rounded-xl bg-indigo-500/10 text-accent w-fit">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink">Modular Block Architecture</h3>
            <p className="text-xs text-muted leading-relaxed">
              Combine video embeds, links with animation badges, collapsible folders, FAQ accordions, and downloadable resources with drag-and-drop ease.
            </p>
          </div>

          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(16, 185, 129, 0.25)')}
            className="feature-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-emerald-500/40 transition-colors space-y-3 cursor-default"
          >
            <ProductIllustration variant="theme" className="mb-3 max-h-32" />
            <div className="anime-icon-target p-2.5 rounded-xl bg-emerald-500/10 text-success w-fit">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink">Deep Token Theme Engine</h3>
            <p className="text-xs text-muted leading-relaxed">
              Customize fonts, border radii, shadows, background meshes, and color palettes. Your link-in-bio looks like an editorial mini-site, not a template clone.
            </p>
          </div>

          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(6, 182, 212, 0.25)')}
            className="feature-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-cyan-500/40 transition-colors space-y-3 cursor-default"
          >
            <ProductIllustration variant="privacy" className="mb-3 max-h-32" />
            <div className="anime-icon-target p-2.5 rounded-xl bg-cyan-500/10 text-info w-fit">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink">Privacy-First Analytics</h3>
            <p className="text-xs text-muted leading-relaxed">
              Real-time page views, unique visitors, link-level click counts, and CTR calculation with zero invasive cookies or tracking bloat.
            </p>
          </div>

          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(245, 158, 11, 0.25)')}
            className="feature-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-amber-500/40 transition-colors space-y-3 cursor-default"
          >
            <ProductIllustration variant="qr" className="mb-3 max-h-32" />
            <div className="anime-icon-target p-2.5 rounded-xl bg-amber-500/10 text-warning w-fit">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink">Dynamic QR Code Studio</h3>
            <p className="text-xs text-muted leading-relaxed">
              Generate styled vector QR codes with custom dots and colors. Update destination URLs anytime without reprinting packaging or physical cards.
            </p>
          </div>

          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(244, 63, 94, 0.25)')}
            className="feature-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-rose-500/40 transition-colors space-y-3 cursor-default"
          >
            <ProductIllustration variant="route" className="mb-3 max-h-32" />
            <div className="anime-icon-target p-2.5 rounded-xl bg-rose-500/10 text-danger w-fit">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink">Custom Domains &amp; Automated SSL</h3>
            <p className="text-xs text-muted leading-relaxed">
              Point your domain or subdomain directly with automatic CNAME diagnostics, verification checks, and automated TLS certificate issuance.
            </p>
          </div>

          <div 
            onMouseEnter={handleCardMouseEnter}
            onMouseLeave={handleCardMouseLeave}
            onClick={(e) => triggerAnimeRipple(e, e.currentTarget, 'rgba(139, 92, 246, 0.25)')}
            className="feature-anime-card relative overflow-hidden p-6 rounded-2xl bg-surface border border-line hover:border-violet-500/40 transition-colors space-y-3 cursor-default"
          >
            <ProductIllustration variant="profiles" className="mb-3 max-h-32" />
            <div className="anime-icon-target p-2.5 rounded-xl bg-violet-500/10 text-accent-soft w-fit">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-ink">Multi-Profile Agency Workspaces</h3>
            <p className="text-xs text-muted leading-relaxed">
              Isolate client profiles, duplicate structures, export CSV form submissions, and manage permissions from a centralized console.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing & Plan Comparison Section (MKT-003: Configuration-Driven Plans) */}
      <section
        id="pricing"
        tabIndex={-1}
        ref={comparisonSectionRef}
        data-section-key="comparison"
        className="py-20 px-4 sm:px-6 border-t border-line bg-surface/30 focus:outline-none"
      >
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="comparison-anime-header text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink font-['Syne'] tracking-tight">
              Simple, transparent pricing for every creator.
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              No hidden add-ons or fake feature gates. All plans include unlimited block creation and our shared design token engine.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="pt-2 inline-flex items-center gap-2 bg-canvas p-1.5 rounded-2xl border border-line text-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                aria-pressed={billingCycle === 'monthly'}
                className={`touch-target px-4 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                  billingCycle === 'monthly' ? 'bg-surface-2 text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('annual')}
                aria-pressed={billingCycle === 'annual'}
                className={`touch-target px-4 py-1.5 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual' ? 'bg-surface-2 text-ink shadow-xs' : 'text-muted hover:text-ink'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] font-bold text-success bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Save ~20%
                </span>
              </button>
            </div>
          </div>

          {/* Configuration-Driven Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PRICING_PLANS.map((plan) => {
              const isCurrent = workspace.plan === plan.id;
              const isPopular = plan.badge === 'Most Popular';

              return (
                <div
                  key={plan.id}
                  className={`relative p-6 sm:p-7 rounded-3xl border flex flex-col justify-between transition-all ${
                    isPopular 
                      ? 'bg-surface/90 border-indigo-500/60 shadow-xl shadow-indigo-500/10' 
                      : 'bg-surface/50 border-line hover:border-line-strong'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-ink tracking-tight">{plan.name}</h3>
                      <p className="text-xs text-muted mt-1">{plan.tagline}</p>
                    </div>

                    <div className="flex items-baseline gap-1 py-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight font-mono">
                        {formatPlanPrice(plan, billingCycle)}
                      </span>
                      <span className="text-xs text-muted font-medium">/ month</span>
                    </div>

                    {billingCycle === 'annual' && plan.annualBilledTotal > 0 && (
                      <div className="text-[11px] text-subtle">
                        ${plan.annualBilledTotal} billed annually
                      </div>
                    )}

                    <p className="text-xs text-body leading-relaxed pt-1">
                      {plan.description}
                    </p>

                    <div className="pt-3 border-t border-line/80 space-y-2.5">
                      <div className="text-[11px] font-bold text-muted uppercase tracking-wider">
                        Included Features
                      </div>
                      <ul className="space-y-2 text-xs text-body">
                        {plan.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-line">
                    <button
                      type="button"
                      onClick={(e) => {
                        triggerAnimeRipple(e, e.currentTarget, 'rgba(255, 255, 255, 0.2)');
                        if (isCurrent) {
                          setCurrentView('billing');
                        } else if (plan.id === 'free') {
                          if (onOpenAuth) onOpenAuth('create');
                          else setCurrentView('editor');
                        } else {
                          upgradePlan(plan.id, billingCycle);
                          setCurrentView('billing');
                        }
                      }}
                      className={`touch-target w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none ${
                        isPopular
                          ? 'bg-inverse hover:bg-inverse-hover text-inverse-text shadow-md'
                          : 'bg-surface-2 hover:bg-surface-3 text-ink border border-line-strong'
                      }`}
                    >
                      <span>{isCurrent ? 'Current Plan' : plan.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Deep Feature Entitlement Comparison Table */}
          <div className="pt-8 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-ink font-['Syne']">Detailed Plan Capability Comparison</h3>
              <p className="text-xs text-muted">Concrete limits without ambiguous or misleading promises.</p>
            </div>

            <div className="rounded-2xl border border-line bg-surface overflow-x-auto shadow-xl">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-canvas border-b border-line text-muted">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Capability</th>
                    <th className="py-3 px-4 font-medium text-center">Starter ($0)</th>
                    <th className="py-3 px-4 font-bold text-ink bg-accent-surface text-center">Creator Pro ({formatPlanPrice(PRICING_PLANS.find((plan) => plan.id === 'pro')!, billingCycle)}/mo)</th>
                    <th className="py-3 px-4 font-medium text-center">Agency ({formatPlanPrice(PRICING_PLANS.find((plan) => plan.id === 'agency')!, billingCycle)}/mo)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {CAPABILITY_COMPARISON_MATRIX.map((row, rIdx) => (
                    <tr 
                      key={rIdx}
                      className="comparison-table-row transition-colors hover:bg-surface-2/40 cursor-default"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink">{row.capability}</div>
                        <div className="text-[11px] text-muted">{row.description}</div>
                      </td>
                      <td className="py-3 px-4 text-center text-body">
                        {typeof row.starter === 'boolean' ? (
                          row.starter ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <span className="text-subtle">—</span>
                          )
                        ) : (
                          row.starter
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-accent-soft bg-accent-surface">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <span className="text-subtle">—</span>
                          )
                        ) : (
                          row.pro
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-body font-medium">
                        {typeof row.agency === 'boolean' ? (
                          row.agency ? (
                            <CheckCircle2 className="w-4 h-4 text-success mx-auto" />
                          ) : (
                            <span className="text-subtle">—</span>
                          )
                        ) : (
                          row.agency
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section 
        id="faq"
        tabIndex={-1}
        ref={faqSectionRef}
        data-section-key="faq"
        className="py-20 px-4 sm:px-6 max-w-4xl mx-auto space-y-8 focus:outline-none"
      >
        <div className="faq-anime-header text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink font-['Syne'] tracking-tight">
            Frequently Answered Questions
          </h2>
          <p className="text-xs text-muted">Everything you need to know before publishing.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className="faq-anime-item rounded-2xl border border-line bg-surface overflow-hidden transition-colors hover:border-line-strong"
              >
                <button
                  id={`faq-question-${idx}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  onClick={(e) => {
                    triggerAnimeRipple(e, e.currentTarget, 'rgba(100, 100, 100, 0.18)');
                    toggleFaq(idx);
                  }}
                  onMouseEnter={(e) => animateHoverEnter(e.currentTarget)}
                  onMouseLeave={(e) => animateHoverLeave(e.currentTarget)}
                  className="relative overflow-hidden w-full p-4 sm:p-5 flex items-center justify-between text-left text-sm font-semibold text-ink cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
                >
                  <span>{faq.q}</span>
                  <div className="w-6 h-6 rounded-full bg-surface-2/80 flex items-center justify-center shrink-0 ml-3 transition-transform">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-accent" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted" />
                    )}
                  </div>
                </button>
                <div
                    id={`faq-answer-${idx}`}
                    role="region"
                    aria-labelledby={`faq-question-${idx}`}
                    hidden={!isOpen}
                    ref={(el) => { faqAnswerRefs.current[idx] = el; }}
                    className="px-4 sm:px-5 pb-5 pt-1 text-xs text-muted leading-relaxed border-t border-line/60"
                  >
                    {faq.a}
                  </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Footer Banner (MKT-001 & Flow 3) */}
      <section 
        id="get-started"
        ref={ctaSectionRef}
        data-section-key="cta"
        className="py-20 px-4 sm:px-6 border-t border-line bg-gradient-to-b from-canvas via-surface/60 to-canvas text-center"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="cta-anime-item inline-flex items-center gap-2 text-xs font-mono text-accent bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            <Flame className="w-3.5 h-3.5 text-warning" />
            <span>Start Building in 60 Seconds</span>
          </div>

          <h2 className="cta-anime-item text-3xl sm:text-5xl font-extrabold text-ink font-['Syne'] tracking-tight">
            Ready to build your link-in-bio page?
          </h2>
          <p className="cta-anime-item text-sm text-muted max-w-xl mx-auto">
            Get started in under 3 minutes. Test out all block types, themes, dynamic QR codes, and Anime.js physics with a 14-day free trial.
          </p>
          <div className="cta-anime-item mx-auto max-w-xl rounded-3xl border border-indigo-500/15 bg-indigo-500/5 p-3">
            <ProductIllustration variant="assembly" />
          </div>
          <div className="cta-anime-item pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/signup"
              onClick={(e) => {
                e.preventDefault();
                triggerAnimeRipple(e, e.currentTarget, 'rgba(0, 0, 0, 0.25)');
                triggerSuccessBurst(e.currentTarget);
                if (onOpenAuth) {
                  onOpenAuth('create');
                } else {
                  setTimeout(() => setCurrentView('editor'), 220);
                }
              }}
              onMouseEnter={(e) => {
                animateHoverEnter(e.currentTarget);
                const icon = e.currentTarget.querySelector<HTMLElement>('.cta-arrow-icon');
                if (icon) animateIconBounce(icon);
              }}
              onMouseLeave={(e) => animateHoverLeave(e.currentTarget)}
              className="touch-target relative overflow-hidden w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-inverse-text bg-inverse hover:bg-inverse-hover rounded-xl transition-all shadow-xl inline-flex items-center justify-center gap-2 cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <span>Create your page</span>
              <ArrowRight className="cta-arrow-icon w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>

            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                onOpenAuth ? onOpenAuth('login') : setCurrentView('editor');
              }}
              className="touch-target relative overflow-hidden w-full sm:w-auto px-6 py-3.5 text-sm font-semibold text-body hover:text-ink bg-surface hover:bg-surface-2 border border-line rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 focus:outline-none"
            >
              <span>Log in to your account</span>
            </a>
          </div>
        </div>
      </section>

      {/* Clean Brand Footer with Legal & Help Entry Points */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 border-t border-line text-muted text-xs">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="relative isolate overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-surface to-emerald-400/5 p-6 shadow-xl shadow-black/5 sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" aria-hidden="true" />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,0.9fr)] lg:items-end">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-accent">
                  <Sparkles className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                  Product notes for creators
                </div>
                <h2 className="mt-4 max-w-xl font-['Syne'] text-3xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
                  Build less busywork into your next page.
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted">
                  Get practical ideas for better link-in-bio pages, new themes, and product updates. No noise, just useful notes.
                </p>
              </div>

              <form
                className="w-full"
                onSubmit={handleNewsletterSubmit}
              >
                <label htmlFor="marketing-newsletter-email" className="mb-2 block text-[11px] font-semibold text-ink">
                  Email address
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="marketing-newsletter-email"
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(event) => {
                      setNewsletterEmail(event.target.value);
                      setNewsletterMessage(null);
                    }}
                    placeholder="you@example.com"
                    aria-describedby={newsletterMessage ? 'newsletter-status' : undefined}
                    className="min-h-12 min-w-0 flex-1 rounded-xl border border-line-strong bg-canvas/80 px-4 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                  <button
                    type="submit"
                    disabled={newsletterSubmitting || !newsletterConsent}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-inverse px-5 text-sm font-bold text-inverse-text shadow-lg transition-colors hover:bg-inverse-hover disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {newsletterSubmitting ? 'Joining…' : 'Join the list'}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <label className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-subtle">
                  <input
                    type="checkbox"
                    required
                    checked={newsletterConsent}
                    onChange={(event) => {
                      setNewsletterConsent(event.target.checked);
                      setNewsletterMessage(null);
                    }}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--lf-accent)]"
                  />
                  <span>Keep me updated about LynkFlow. <a href="/unsubscribe" className="text-accent underline underline-offset-2">Unsubscribe anytime.</a></span>
                </label>
                {newsletterSubmitted && (
                  <p id="newsletter-status" role="status" className="mt-3 rounded-lg border border-success/30 bg-success-surface px-3 py-2 text-[11px] leading-relaxed text-success">
                    You’re on the list. We’ll send useful product updates occasionally.
                  </p>
                )}
                {newsletterMessage && (
                  <p id="newsletter-status" role="status" className="mt-3 rounded-lg border border-warning/30 bg-warning-surface px-3 py-2 text-[11px] leading-relaxed text-warning">
                    {newsletterMessage}
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="font-['Syne'] font-bold text-ink text-base">
                LynkFlow
              </div>
              <p className="text-subtle leading-relaxed text-[11px]">
                The modular, production-ready link-in-bio & mini-site platform with zero visual hacks and validated design tokens.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-ink uppercase text-[10px] tracking-wider">Product</h3>
              <ul className="space-y-1.5 text-muted text-xs">
                <li>
                  <a href="#features" className="hover:text-ink transition-colors">Features & Blocks</a>
                </li>
                <li>
                  <a href="/link-in-bio" className="hover:text-ink transition-colors">Link-in-Bio Builder</a>
                </li>
                <li>
                  <a href="/link-in-bio-for-creators" className="hover:text-ink transition-colors">For Creators</a>
                </li>
                <li>
                  <a href="/link-in-bio-for-agencies" className="hover:text-ink transition-colors">For Agencies</a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-ink transition-colors">Pricing & Plans</a>
                </li>
                <li>
                  <button onClick={() => setCurrentView('editor')} className="hover:text-ink transition-colors cursor-pointer">
                    Studio Builder
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-ink uppercase text-[10px] tracking-wider">Platform &amp; Dev</h3>
              <ul className="space-y-1.5 text-muted text-xs">
                <li>
                  <button onClick={() => setCurrentView('api')} className="hover:text-ink transition-colors cursor-pointer">
                    Developer REST API
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('analytics')} className="hover:text-ink transition-colors cursor-pointer">
                    Privacy-First Analytics
                  </button>
                </li>
                <li>
                  <a href="/custom-domain-link-in-bio" className="hover:text-ink transition-colors">Custom Domain Pages</a>
                </li>
                <li>
                  <a href="/features/dynamic-qr-codes" className="hover:text-ink transition-colors">Dynamic QR Codes</a>
                </li>
                <li>
                  <span className="text-subtle">Automated SSL Edge DNS</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-ink uppercase text-[10px] tracking-wider">Help &amp; Legal</h3>
              <ul className="space-y-1.5 text-muted text-xs">
                <li>
                  <a href="#faq" className="hover:text-ink transition-colors">Help Center & FAQ</a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-ink transition-colors">Contact Support</a>
                </li>
                <li>
                  <button 
                    onClick={() => onOpenAuth ? onOpenAuth('login') : setCurrentView('editor')}
                    className="hover:text-ink transition-colors cursor-pointer"
                  >
                    Account Recovery
                  </button>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-ink transition-colors">Terms of Service</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-subtle">
            <div>
              © 2026 LynkFlow Technologies. Production-ready link in bio platform with Anime.js.
            </div>
            <div className="flex items-center gap-4">
              <span>Status: All Systems Operational</span>
              <span>·</span>
                  <span>Accessibility foundations in place</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
