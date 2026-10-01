import React, { useState, useEffect, useRef } from 'react';
import { Profile, ThemeConfig, Block, FormBlockPayload, FolderBlockPayload, FaqBlockPayload, LinkBlockPayload, MediaBlockPayload, GalleryBlockPayload, CarouselBlockPayload, ProductBlockPayload, TipBlockPayload, MembershipBlockPayload, EventBlockPayload, TextBlockPayload, DividerBlockPayload, TestimonialBlockPayload, FileBlockPayload, ContactBlockPayload } from '../../types';
import { Avatar } from '../common/Avatar';
import { 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Check, 
  ShieldCheck, 
  Mail, 
  Phone, 
  Instagram, 
  Youtube, 
  Twitter, 
  Github, 
  Linkedin, 
  Music, 
  MessageSquare, 
  Share2, 
  Flag, 
  ArrowLeft,
  Sparkles,
  AlertCircle,
  ShoppingBag
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { billingService } from '../../services/billingService';
import { createPublicProductCheckoutSession } from '../../services/publicProductCheckoutService';
import { sanitizeMediaEmbed, validateAppUrl, validateUrl } from '../../utils/blockValidator';
import { compileThemeToCssVariables } from '../../utils/themeEngine';
import type { StandardTheme } from '../../types/themeSchema';
import { getBlockVariantDefinition, resolveLinkVariant } from '../../utils/blockVariantRegistry';
import { resolveBlockStyle } from '../../utils/blockStyleVariants';
import { BLOCK_STYLE_CSS } from '../../utils/blockStyleCss';
import { resolveProfileRenderModel, selectInitialProfileTab } from '../../utils/profileRenderModel';
import { ThemeProvider } from './ThemeProvider';
import { AnimatedProfileBlock } from './AnimatedProfileBlock';
import type { AnimationTheme } from './AnimatedProfileBlock';
import { 
  runStaggeredEntrance, 
  triggerAnimeRipple, 
  animateHoverEnter, 
  animateHoverLeave, 
  triggerSuccessBurst,
  AnimeEntrancePreset
} from '../../utils/animeAnimations';

const safePublicHref = (value: unknown, allowRelative = false): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const result = validateUrl(value, allowRelative);
  return result.isValid ? result.sanitizedValue || value.trim() : null;
};

interface PublicProfileViewProps {
  profile: Profile;
  isStandalone?: boolean;
  onOpenReportModal?: () => void;
}

export const PublicProfileView: React.FC<PublicProfileViewProps> = ({
  profile,
  isStandalone = false,
  onOpenReportModal
}) => {
  const { trackEvent, submitForm, setCurrentView, animationTrigger, triggerReplayAnimation, workspace } = useApp();

  // BIL-003: Derive removeBranding entitlement — the footer badge is ONLY hidden when
  // the workspace plan explicitly grants removeBranding AND the theme toggle is off.
  // Free-tier users can never hide the badge, even via the theme layout toggle.
  const entitlements = billingService.getWorkspaceEntitlements(workspace);
  const canRemoveBranding = profile.publicEntitlements?.removeBranding === true || entitlements.removeBranding;

  // Support deep-link tab URL routing (e.g. #tab=slug or #slug)
  const getInitialTabId = (): string => {
    const requested = typeof window !== 'undefined' ? window.location.hash : null;
    return selectInitialProfileTab(profile.tabs, requested)?.id || '';
  };

  const [activeTabId, setActiveTabId] = useState<string>(getInitialTabId);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [openFaqs, setOpenFaqs] = useState<Record<string, boolean>>({});
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [formConsents, setFormConsents] = useState<Record<string, boolean>>({});
  const [formSubmitted, setFormSubmitted] = useState<Record<string, boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, Record<string, string>>>({});
  const [formHoneypots, setFormHoneypots] = useState<Record<string, string>>({});
  const [formIdempotencyKeys, setFormIdempotencyKeys] = useState<Record<string, string>>({});
  const [isSubmittingForm, setIsSubmittingForm] = useState<Record<string, boolean>>({});
  const [productCheckoutStatus, setProductCheckoutStatus] = useState<Record<string, 'loading' | 'error'>>({});
  const [productCheckoutErrors, setProductCheckoutErrors] = useState<Record<string, string>>({});
  const [copiedLink, setCopiedLink] = useState(false);

  // Consent Gating (AN-005)
  const [cookieConsentDismissed, setCookieConsentDismissed] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('lynkflow_consent_dismissed') === 'true' : true;
  });
  const [hasUserConsented, setHasUserConsented] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('lynkflow_tracking_consent_v1') === 'true' : false;
  });

  const handleAcceptTrackingConsent = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lynkflow_consent_dismissed', 'true');
      localStorage.setItem('lynkflow_tracking_consent_v1', 'true');
    }
    setHasUserConsented(true);
    setCookieConsentDismissed(true);
  };

  const handleDeclineTrackingConsent = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lynkflow_consent_dismissed', 'true');
      localStorage.setItem('lynkflow_tracking_consent_v1', 'false');
    }
    setHasUserConsented(false);
    setCookieConsentDismissed(true);
  };

  // AN-005: Gate optional tracking integrations behind explicit user consent
  useEffect(() => {
    if (!hasUserConsented) {
      // Remove any previously injected tracking tags if consent is declined
      const existing = document.getElementById('lf-gated-integrations');
      if (existing) existing.remove();
      return;
    }

    const integrations = profile.trackingIntegrations;
    if (!integrations) return;

    // Only inject if at least one ID exists and consent is granted
    if (integrations.metaPixelId || integrations.googleAnalyticsId || integrations.tiktokPixelId) {
      let scriptContainer = document.getElementById('lf-gated-integrations');
      if (!scriptContainer) {
        scriptContainer = document.createElement('div');
        scriptContainer.id = 'lf-gated-integrations';
        scriptContainer.setAttribute('data-consent-verified', 'true');
        scriptContainer.setAttribute('data-meta-pixel', integrations.metaPixelId || '');
        scriptContainer.setAttribute('data-google-analytics', integrations.googleAnalyticsId || '');
        scriptContainer.setAttribute('data-tiktok-pixel', integrations.tiktokPixelId || '');
        document.body.appendChild(scriptContainer);
      }
    }
  }, [hasUserConsented, profile.trackingIntegrations]);

  // Sync hash when activeTabId changes in standalone mode
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    if (isStandalone && typeof window !== 'undefined' && window.history.replaceState) {
      const targetTab = profile.tabs.find(t => t.id === tabId);
      if (targetTab?.slug) {
        window.history.replaceState(null, '', `#${targetTab.slug}`);
      }
    }
  };

  const profileContainerRef = useRef<HTMLDivElement>(null);

  const renderModel = resolveProfileRenderModel(profile, { tabIdOrHash: activeTabId });
  const standardTheme = renderModel.theme as StandardTheme;
  const cssVars = compileThemeToCssVariables(standardTheme);
  const colors = standardTheme.tokens.colors;
  // Older cloud profiles may only have `standardTheme` (or no legacy theme
  // object at all). The renderer still supports the legacy animation preset,
  // but it must never dereference a missing legacy payload.
  const legacyTheme: Partial<ThemeConfig> = profile.theme || {};
  const animationTheme: AnimationTheme = {
    ...standardTheme,
    accentColor: legacyTheme.accentColor || colors.accent,
    animeMicroInteractions: legacyTheme.animeMicroInteractions
  };
  const currentTab = renderModel.currentTab as typeof profile.tabs[number] | undefined;

  // Background styling behavior per Section 8
  const bgType = standardTheme.background.type;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const videoFallbackImage = bgType === 'video' && prefersReducedMotion && (standardTheme.background.reducedMotionFallback === 'image' || standardTheme.background.reducedMotionFallback === 'poster') && standardTheme.background.posterUrl
    ? `url(${standardTheme.background.posterUrl})`
    : undefined;
  const imageBackground = bgType === 'image' && standardTheme.background.assetUrl
    ? `url(${standardTheme.background.assetUrl})`
    : undefined;
  const mobileImageBackground = bgType === 'image' && standardTheme.background.mobileAssetUrl
    ? `url(${standardTheme.background.mobileAssetUrl})`
    : undefined;
  const placeholderBackground = bgType === 'image' && standardTheme.background.placeholderUrl
    ? `url(${standardTheme.background.placeholderUrl})`
    : undefined;
  const imageLayers = [imageBackground, placeholderBackground].filter(Boolean).join(', ') || undefined;
  const mobileImageLayers = [mobileImageBackground, placeholderBackground].filter(Boolean).join(', ') || undefined;
  const composedImageBackground = bgType === 'image' && standardTheme.background.gradientStops && imageBackground
    ? `${standardTheme.background.gradientStops}, ${imageLayers}`
    : imageLayers;
  const composedMobileImageBackground = bgType === 'image' && standardTheme.background.gradientStops && mobileImageBackground
    ? `${standardTheme.background.gradientStops}, ${mobileImageLayers}`
    : mobileImageLayers;
  const layout = standardTheme.layout || { maxWidth: '680px', alignment: 'center' as const, headerStyle: 'standard' as const, blockWidth: 'full' as const, navigationStyle: 'pills' as const };
  const socialIconPlacement = layout.socialIconPlacement || (profile.socialPosition === 'bottom' ? 'footer' : 'header');
  const language = renderModel.language;
  const direction = renderModel.direction;
  const backgroundScale = standardTheme.background.scale || 1;
  const bgStyle: React.CSSProperties = {
    backgroundColor: standardTheme.background.fallbackColor || colors.pageBackground,
    backgroundImage: standardTheme.effects?.grain
      ? `${bgType === 'gradient' && standardTheme.background.gradientStops ? standardTheme.background.gradientStops : composedImageBackground || 'none'}, radial-gradient(rgba(255,255,255,0.055) 1px, transparent 1px)`
      : (bgType === 'gradient' || bgType === 'pattern') && standardTheme.background.gradientStops
      ? standardTheme.background.gradientStops
      : videoFallbackImage || composedImageBackground,
    backgroundSize: standardTheme.effects?.grain ? `${bgType === 'image' ? (standardTheme.background.fit === 'contain' ? 'contain, contain' : backgroundScale > 1 ? `${backgroundScale * 100}%` : 'cover, cover') : 'auto'}, 4px 4px` : bgType === 'pattern' ? '24px 24px' : (bgType === 'image' || videoFallbackImage) && standardTheme.background.fit !== 'natural' ? (backgroundScale > 1 ? `${backgroundScale * 100}%` : (standardTheme.background.fit || 'cover')) : undefined,
    backgroundPosition: standardTheme.background.focalPoint
      ? `${standardTheme.background.focalPoint.x}% ${standardTheme.background.focalPoint.y}%`
      : (standardTheme.background.position || 'center'),
    color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))',
    colorScheme: standardTheme.mode === 'dark' ? 'dark' : standardTheme.mode === 'light' ? 'light' : 'light dark',
    fontFamily: direction === 'rtl' ? 'var(--theme-arabic-font, var(--theme-body-font, sans-serif))' : 'var(--theme-body-font, sans-serif)',
    boxShadow: standardTheme.effects?.glow ? 'inset 0 0 180px color-mix(in srgb, var(--theme-accent, #6366F1) 18%, transparent)' : undefined,
    ...cssVars
  };
  const variants = standardTheme.componentVariants || { link: 'solid' as const, image: 'rounded' as const, socialIcons: 'line' as const, form: 'card' as const };
  const hasShopOffers = profile.tabs.some(tab => tab.blocks.some(block => ['product', 'course', 'tip', 'membership'].includes(block.type)));
  const responsiveVisibility = (rule: NonNullable<StandardTheme['responsive']['mobile']>) => {
    const mode = rule.blockVisibility || 'all';
    return `--theme-media-display:${mode === 'hide-media' ? 'none' : 'block'};--theme-social-display:${mode === 'hide-socials' ? 'none' : 'flex'};`;
  };
  const orderedCurrentBlocks = renderModel.blocks as Block[];

  // Anime.js Staggered Entrance Animation on load, tab switch, theme change or trigger
  useEffect(() => {
    // Check WCAG Reduced Motion constraints
    const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMotionDisabled = 
      standardTheme.accessibility?.reducedMotion === 'alwaysDisable' ||
      (standardTheme.accessibility?.reducedMotion === 'respectUserPreference' && prefersReducedMotion) ||
      standardTheme.tokens.motion.enabled === false;

    if (isMotionDisabled) {
      return;
    }

    if (profileContainerRef.current) {
      const items = profileContainerRef.current.querySelectorAll<HTMLElement>('.anime-profile-item');
      if (items.length > 0) {
        runStaggeredEntrance(items, (legacyTheme.animeEntrancePreset as AnimeEntrancePreset) || 'springPop');
      }
    }
  }, [profile.id, activeTabId, legacyTheme.animeEntrancePreset, animationTrigger, standardTheme.accessibility?.reducedMotion, standardTheme.tokens.motion.enabled]);

  // Page View Telemetry Emission (AN-001)
  useEffect(() => {
    // Determine client device type accurately
    let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) device = 'mobile';
      else if (width < 1024) device = 'tablet';
    }

    // Check if traffic originated from a QR Code scan
    const isQrScan = typeof window !== 'undefined' && (
      window.location.search.includes('source=qr') || 
      window.location.search.includes('utm_source=qr') ||
      window.location.hash.includes('qr')
    );

    if (isQrScan) {
      trackEvent({
        profileId: profile.id,
        tabId: activeTabId,
        snapshotVersion: profile.publishedVersion,
        type: 'qr_scan',
        referrer: 'QR Code Scan',
        country: 'United States',
        device,
        consentGranted: hasUserConsented
      });
    }

    trackEvent({
      profileId: profile.id,
      tabId: activeTabId,
      snapshotVersion: profile.publishedVersion,
      type: 'page_view',
      referrer: isQrScan ? 'QR Code Scan' : (typeof document !== 'undefined' ? document.referrer || 'Direct' : 'Direct'),
      country: 'United States',
      device,
      consentGranted: hasUserConsented
    });
  }, [profile.id, hasUserConsented]);

  const handleLinkClick = (blockId: string, url: string, e?: React.MouseEvent<HTMLElement>) => {
    const safeUrl = safePublicHref(url);
    e?.preventDefault();
    if (e && legacyTheme.animeMicroInteractions !== false) {
      triggerAnimeRipple(e, e.currentTarget, colors.accent ? `${colors.accent}33` : 'rgba(255, 255, 255, 0.2)');
    }

    const clickedBlock = currentTab?.blocks?.find(b => b.id === blockId);

    let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width < 640) device = 'mobile';
      else if (width < 1024) device = 'tablet';
    }

    trackEvent({
      profileId: profile.id,
      blockId,
      blockTitle: clickedBlock?.title || 'Untitled Link',
      tabId: currentTab?.id,
      snapshotVersion: profile.publishedVersion,
      type: 'block_click',
      referrer: typeof document !== 'undefined' ? document.referrer || 'Direct' : 'Direct',
      country: 'United States',
      device,
      consentGranted: hasUserConsented
    });

    if (safeUrl && safeUrl !== '#') {
      setTimeout(() => {
        window.open(safeUrl, '_blank', 'noopener,noreferrer');
      }, 140);
    }
  };

  const handleProductCheckout = async (blockId: string) => {
    setProductCheckoutStatus(previous => ({ ...previous, [blockId]: 'loading' }));
    setProductCheckoutErrors(previous => ({ ...previous, [blockId]: '' }));
    try {
      const checkoutUrl = await createPublicProductCheckoutSession(profile.username, blockId);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setProductCheckoutStatus(previous => ({ ...previous, [blockId]: 'error' }));
      setProductCheckoutErrors(previous => ({ ...previous, [blockId]: error instanceof Error ? error.message : 'Unable to open secure checkout.' }));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleDownloadVCard = () => {
    const escapeVCard = (value: string) => value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const email = profile.socialLinks.find(link => link.active && link.platform === 'email')?.url.replace(/^mailto:/i, '').split('?')[0];
    const socialUrls = profile.socialLinks.filter(link => link.active && link.platform !== 'email' && safePublicHref(link.url)).map(link => `item1.X-SOCIALPROFILE;type=${link.platform.toUpperCase()}:${safePublicHref(link.url)}`).join('\n');
    const lines = [
      'BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeVCard(profile.displayName || profile.username)}`, `N:${escapeVCard(profile.displayName || profile.username)};;;;`, `URL:${window.location.href}`,
      profile.bio ? `NOTE:${escapeVCard(profile.bio)}` : '', email ? `EMAIL;TYPE=INTERNET:${escapeVCard(email)}` : '', socialUrls, 'END:VCARD'
    ].filter(Boolean).join('\n');
    const url = URL.createObjectURL(new Blob([lines], { type: 'text/vcard;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(profile.username || 'creator').replace(/[^a-z0-9_-]/gi, '-')}.vcf`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const toggleFolder = (blockId: string) => {
    setOpenFolders(prev => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const toggleFaq = (faqId: string) => {
    setOpenFaqs(prev => ({ ...prev, [faqId]: !prev[faqId] }));
  };

  const handleFormInputChange = (blockId: string, fieldId: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [blockId]: {
        ...(prev[blockId] || {}),
        [fieldId]: value
      }
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent, block: Block) => {
    e.preventDefault();
    const payload = block.payload as FormBlockPayload;
    const values = formValues[block.id] || {};
    const consent = formConsents[block.id] !== false;
    const honeypot = formHoneypots[block.id] || '';
    const idempotencyKey = formIdempotencyKeys[block.id] || crypto.randomUUID();
    setFormIdempotencyKeys(prev => ({ ...prev, [block.id]: idempotencyKey }));

    // Clear previous errors for this block
    setFormErrors(prev => ({ ...prev, [block.id]: {} }));
    setIsSubmittingForm(prev => ({ ...prev, [block.id]: true }));

    const targetElement = e.currentTarget as HTMLElement;

    // Call authoritative submitForm
    const result = await submitForm(profile.id, block.id, block.title, payload, values, consent, honeypot, idempotencyKey);

    setIsSubmittingForm(prev => ({ ...prev, [block.id]: false }));

    if (result.success) {
      setFormSubmitted(prev => ({ ...prev, [block.id]: true }));
      // Trigger Anime.js success particle burst
      if (targetElement) {
        triggerSuccessBurst(targetElement);
      }
    } else {
      if (result.fieldErrors) {
        setFormErrors(prev => ({ ...prev, [block.id]: result.fieldErrors || {} }));
      } else if (result.error) {
        setFormErrors(prev => ({ ...prev, [block.id]: { _form: result.error || 'Submission failed' } }));
      }
    }
  };

  // Card border, radius and shadow styling based on theme tokens
  const getCardStyle = () => {
    return 'rounded-[var(--theme-card-radius,16px)] shadow-[var(--theme-card-elevation,none)]';
  };

  const renderSocialIcon = (platform: string) => {
    const props = { className: 'w-4 h-4' };
    switch (platform) {
      case 'instagram': return <Instagram {...props} />;
      case 'youtube': return <Youtube {...props} />;
      case 'twitter': return <Twitter {...props} />;
      case 'github': return <Github {...props} />;
      case 'linkedin': return <Linkedin {...props} />;
      case 'spotify': return <Music {...props} />;
      case 'email': return <Mail {...props} />;
      case 'phone': return <Phone {...props} />;
      case 'discord':
      case 'threads':
      case 'whatsapp':
      case 'tiktok':
        return <MessageSquare {...props} />;
      default: return <ExternalLink {...props} />;
    }
  };

  return (
    <ThemeProvider theme={standardTheme}>
    <style>{`.profile-theme-root{font-size:calc(var(--theme-body-size,16px) * var(--theme-body-scale,1));line-height:var(--theme-body-lh,1.5);letter-spacing:var(--theme-letter-spacing,0);text-transform:var(--theme-text-transform,none)}.profile-theme-root h1,.profile-theme-root h2,.profile-theme-root h3{font-family:var(--theme-display-font,inherit);font-weight:var(--theme-heading-weight,700);line-height:var(--theme-heading-lh,1.15)}.profile-theme-root[dir=rtl] h1,.profile-theme-root[dir=rtl] h2,.profile-theme-root[dir=rtl] h3{font-family:var(--theme-arabic-font,var(--theme-display-font,inherit))}.profile-theme-root h1{font-size:calc(2rem * var(--theme-heading-scale,1))}.profile-theme-root button,.profile-theme-root a[role=button]{font-size:var(--theme-button-text-size,14px)}.profile-theme-root small,.profile-theme-root figcaption{font-size:var(--theme-caption-size,12px)}.profile-theme-root p,.profile-theme-root li{max-width:var(--theme-max-line-length,68ch)}.profile-theme-root .profile-header{text-align:var(--theme-text-align,center)}.profile-theme-root .profile-avatar{width:var(--theme-avatar-size,88px)!important;height:var(--theme-avatar-size,88px)!important}.profile-theme-root .profile-media-block img,.profile-theme-root .profile-media-block video{height:var(--theme-image-height,auto);object-fit:cover}.profile-theme-root[data-image-placement=full-bleed] .profile-media-block{margin-left:calc(var(--theme-page-x,20px) * -1);margin-right:calc(var(--theme-page-x,20px) * -1);border-radius:0}.profile-theme-root[data-image-placement=alternating] .profile-media-block:nth-of-type(even){transform:translateX(3%)}.profile-theme-root[data-section-grouping=grouped] main{padding:var(--theme-page-x,20px);border-radius:var(--theme-card-radius,16px)}.profile-theme-root[data-section-grouping=editorial] main{padding-top:var(--theme-page-x,20px);border-top:1px solid var(--theme-border, #30394D)}.profile-theme-root[data-navigation-position=bottom] [role=tablist]{position:sticky;bottom:0;z-index:20;margin-top:auto;margin-bottom:0;backdrop-filter:blur(14px)}.profile-theme-root[data-block-visibility=hide-media] .profile-media-block{display:none}.profile-theme-root[data-block-visibility=hide-socials] .profile-social{display:none}.profile-theme-root [data-block-style]{--block-accent:var(--theme-accent,#6366f1)}.profile-theme-root [data-block-style=featured]>*:first-child,.profile-theme-root [data-block-style=spotlight]>*:first-child{box-shadow:0 18px 44px color-mix(in srgb,var(--block-accent) 22%,transparent)}.profile-theme-root [data-block-style=image] a,.profile-theme-root [data-block-style=media-kit] a{background-size:cover;background-position:center}.profile-theme-root [data-block-style=cinematic] .profile-media-block,.profile-theme-root [data-block-style=cinematic]{box-shadow:0 20px 50px rgba(0,0,0,.22)}.profile-theme-root [data-block-style=full-bleed] .profile-media-block,.profile-theme-root [data-block-style=full-bleed]{border-radius:0!important;margin-inline:calc(var(--theme-page-x,20px) * -1)}.profile-theme-root [data-block-style=bento] .grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.profile-theme-root [data-block-style=bento] .grid>*:first-child{grid-column:span 2;grid-row:span 2}.profile-theme-root [data-block-style=masonry] .grid{columns:2;display:block}.profile-theme-root [data-block-style=masonry] .grid>*{break-inside:avoid;margin-bottom:.5rem}.profile-theme-root [data-block-style=editorial] .grid{gap:1rem}.profile-theme-root [data-block-style=editorial] .grid img{border-radius:0}.profile-theme-root [data-block-style=filmstrip] .grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory}.profile-theme-root [data-block-style=filmstrip] .grid>*{min-width:72%;scroll-snap-align:center}.profile-theme-root [data-block-style=quote] blockquote,.profile-theme-root [data-block-style=editorial] blockquote{font-family:var(--theme-display-font,inherit);font-size:1.2em;border-left-width:3px;padding-left:1rem}.profile-theme-root [data-block-style=stat] h2,.profile-theme-root [data-block-style=stat] h3{font-size:2rem}.profile-theme-root [data-block-style=gradient] hr{border-image:linear-gradient(90deg,transparent,var(--block-accent),transparent) 1}.profile-theme-root [data-block-style=spacer]{min-height:3rem}.profile-theme-root [data-block-style=glass],.profile-theme-root [data-block-style=conversion]{backdrop-filter:blur(18px);background:color-mix(in srgb,var(--theme-card-bg,#fff) 58%,transparent)!important}.profile-theme-root [data-block-style=compact]{border-radius:calc(var(--theme-card-radius,16px) / 2);padding:0!important}.profile-theme-root [data-block-style=compact] img{max-height:9rem}.profile-theme-root [data-block-style=avatar] blockquote{padding-left:3.25rem;position:relative}.profile-theme-root [data-block-style=avatar] blockquote:before{content:'“';position:absolute;left:.25rem;top:-.3rem;font-size:3rem;color:var(--block-accent);font-family:Georgia,serif}.profile-theme-root [data-block-style=numbered] button:before{counter-increment:block-item;content:counter(block-item,decimal-leading-zero);color:var(--block-accent);margin-right:.5rem;font-variant-numeric:tabular-nums}.profile-theme-root [data-block-style=numbered]{counter-reset:block-item}.profile-theme-root [data-block-style=inline],.profile-theme-root [data-block-style=methods],.profile-theme-root [data-block-style=row]{border-radius:999px!important}.profile-theme-root [data-block-style=split]{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:center}.profile-theme-root [data-block-style=split] .profile-media-block{min-height:100%}@media(max-width:639px){.profile-theme-root [data-block-style=bento] .grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.profile-theme-root [data-block-style=bento] .grid>*:first-child{grid-column:span 2}.profile-theme-root [data-block-style=split]{display:block}.profile-theme-root [data-block-style=full-bleed]{margin-inline:0}.profile-theme-root [data-block-style=masonry] .grid{columns:1}}`}</style>
    <style>{`.profile-theme-root{--theme-content-max-width:${layout.maxWidth};--theme-page-x:${standardTheme.tokens.spacing.pageX}px;--theme-block-gap:${standardTheme.tokens.spacing.blockGap}px;--theme-page-y:${standardTheme.tokens.spacing.pageY}px;--theme-avatar-size:${standardTheme.header.avatarSize}px;--theme-heading-scale:${standardTheme.tokens.typography.headingScale || 1};--theme-image-height:auto;--theme-text-align:${layout.alignment === 'left' ? 'left' : 'center'};--theme-navigation-position:${layout.navigationPosition || 'below-header'};--theme-block-visibility:all}@media (max-width:374px){.profile-theme-root{--theme-content-max-width:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).maxWidth}px!important;--theme-page-x:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).pageX}px!important;--theme-page-y:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).pageY}px!important;--theme-block-gap:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).blockGap}px!important;--theme-avatar-size:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).avatarSize || standardTheme.header.avatarSize}px!important;--theme-heading-scale:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).headingScale || 1}!important;--theme-image-height:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).imageHeight || 220}px!important;--theme-text-align:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).textAlign || 'center'}!important;--theme-navigation-position:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).navigationPosition || 'below-header'}!important;--theme-block-visibility:${(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile).blockVisibility || 'all'}!important}}@media (min-width:375px) and (max-width:639px){.profile-theme-root{--theme-content-max-width:${standardTheme.responsive.mobile.maxWidth}px!important;--theme-page-x:${standardTheme.responsive.mobile.pageX}px!important;--theme-page-y:${standardTheme.responsive.mobile.pageY}px!important;--theme-block-gap:${standardTheme.responsive.mobile.blockGap}px!important;--theme-avatar-size:${standardTheme.responsive.mobile.avatarSize || standardTheme.header.avatarSize}px!important;--theme-heading-scale:${standardTheme.responsive.mobile.headingScale || 1}!important;--theme-image-height:${standardTheme.responsive.mobile.imageHeight || 280}px!important;--theme-text-align:${standardTheme.responsive.mobile.textAlign || 'center'}!important;--theme-navigation-position:${standardTheme.responsive.mobile.navigationPosition || 'below-header'}!important;--theme-block-visibility:${standardTheme.responsive.mobile.blockVisibility || 'all'}!important}}@media (min-width:640px) and (max-width:1023px){.profile-theme-root{--theme-content-max-width:${standardTheme.responsive.tablet.maxWidth}px!important;--theme-page-x:${standardTheme.responsive.tablet.pageX}px!important;--theme-page-y:${standardTheme.responsive.tablet.pageY}px!important;--theme-block-gap:${standardTheme.responsive.tablet.blockGap}px!important;--theme-avatar-size:${standardTheme.responsive.tablet.avatarSize || standardTheme.header.avatarSize}px!important;--theme-heading-scale:${standardTheme.responsive.tablet.headingScale || 1}!important;--theme-image-height:${standardTheme.responsive.tablet.imageHeight || 320}px!important;--theme-text-align:${standardTheme.responsive.tablet.textAlign || 'center'}!important;--theme-navigation-position:${standardTheme.responsive.tablet.navigationPosition || 'below-header'}!important;--theme-block-visibility:${standardTheme.responsive.tablet.blockVisibility || 'all'}!important}}@media (min-width:1024px){.profile-theme-root{--theme-content-max-width:${standardTheme.responsive.desktop.maxWidth}px!important;--theme-page-x:${standardTheme.responsive.desktop.pageX}px!important;--theme-page-y:${standardTheme.responsive.desktop.pageY}px!important;--theme-block-gap:${standardTheme.responsive.desktop.blockGap}px!important;--theme-avatar-size:${standardTheme.responsive.desktop.avatarSize || standardTheme.header.avatarSize}px!important;--theme-heading-scale:${standardTheme.responsive.desktop.headingScale || 1}!important;--theme-image-height:${standardTheme.responsive.desktop.imageHeight || 380}px!important;--theme-text-align:${standardTheme.responsive.desktop.textAlign || 'center'}!important;--theme-navigation-position:${standardTheme.responsive.desktop.navigationPosition || 'below-header'}!important;--theme-block-visibility:${standardTheme.responsive.desktop.blockVisibility || 'all'}!important}}`}</style>
    {composedMobileImageBackground && <style>{`@media (max-width:639px){.profile-theme-root{background-image:${composedMobileImageBackground}!important;background-size:${backgroundScale > 1 ? `${backgroundScale * 100}%` : (standardTheme.background.fit || 'cover')}!important;background-position:${standardTheme.background.focalPoint ? `${standardTheme.background.focalPoint.x}% ${standardTheme.background.focalPoint.y}%` : (standardTheme.background.position || 'center')}!important}}`}</style>}
    <style>{`.profile-theme-root .profile-media-block{display:var(--theme-media-display,block)}.profile-theme-root .profile-social{display:var(--theme-social-display,flex)}@media (max-width:374px){.profile-theme-root{${responsiveVisibility(standardTheme.responsive.smallMobile || standardTheme.responsive.mobile)}}}@media (min-width:375px) and (max-width:639px){.profile-theme-root{${responsiveVisibility(standardTheme.responsive.mobile)}}}@media (min-width:640px) and (max-width:1023px){.profile-theme-root{${responsiveVisibility(standardTheme.responsive.tablet)}}}@media (min-width:1024px){.profile-theme-root{${responsiveVisibility(standardTheme.responsive.desktop)}}}`}</style>
    <style>{BLOCK_STYLE_CSS}</style>
    <div 
      data-profile-theme={standardTheme.id || `profile_${profile.id}`}
      data-image-placement={layout.imagePlacement || 'inline'}
      data-section-grouping={layout.sectionGrouping || 'flat'}
      data-navigation-position={layout.navigationPosition || 'below-header'}
      className="profile-theme-root min-h-full w-full relative flex flex-col items-center justify-between transition-colors"
      lang={language}
      dir={direction}
      style={{ ...bgStyle, textAlign: layout.alignment, paddingBottom: isStandalone && !cookieConsentDismissed ? '14rem' : '2.5rem' }}
    >
      {/* Background Overlay layer if configured */}
      {(standardTheme.background.overlay ?? 0) > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none z-0" 
          style={{ 
            backgroundColor: standardTheme.background.overlayColor || '#000000',
            opacity: standardTheme.background.overlay 
          }} 
        />
      )}
      {bgType === 'video' && standardTheme.background.assetUrl && !(prefersReducedMotion && standardTheme.background.reducedMotionFallback === 'solid') && (
        <video
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
          src={standardTheme.background.assetUrl}
          poster={standardTheme.background.posterUrl || undefined}
          autoPlay={standardTheme.background.autoplay !== false && !prefersReducedMotion}
          muted={standardTheme.background.muted !== false}
          loop={standardTheme.background.loop !== false}
          preload="auto"
          playsInline
          aria-hidden="true"
          style={{ objectFit: standardTheme.background.fit === 'contain' ? 'contain' : 'cover', objectPosition: standardTheme.background.focalPoint ? `${standardTheme.background.focalPoint.x}% ${standardTheme.background.focalPoint.y}%` : (standardTheme.background.position || 'center'), filter: standardTheme.background.blur ? `blur(${standardTheme.background.blur}px)` : undefined, transform: backgroundScale > 1 ? `scale(${backgroundScale})` : undefined, transformOrigin: standardTheme.background.focalPoint ? `${standardTheme.background.focalPoint.x}% ${standardTheme.background.focalPoint.y}%` : 'center' }}
        >
          {standardTheme.background.mobileAssetUrl && <source media="(max-width: 639px)" src={standardTheme.background.mobileAssetUrl} />}
        </video>
      )}
      {/* Standalone Top Floating Control Bar */}
      {isStandalone && (
        <div className="w-full sticky top-0 z-30 px-4 py-2.5 bg-canvas/80 backdrop-blur-md border-b border-line flex items-center justify-between text-body text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('editor')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface hover:bg-surface-2 text-ink-strong border border-line-strong transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Studio</span>
            </button>
            <span className="hidden sm:inline text-subtle font-mono">Viewing live @{profile.username}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerReplayAnimation}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-surface hover:bg-accent-surface text-accent-soft border border-accent/40 transition-colors cursor-pointer text-xs"
              title="Replay Anime.js staggered entrance"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Replay Motion</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface hover:bg-surface-2 text-ink-strong border border-line-strong transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied URL!' : 'Share Page'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container with Anime.js Animation Ref */}
      <div
        ref={profileContainerRef}
        className={`relative z-10 w-full mx-auto px-5 pt-8 sm:pt-10 flex-1 flex flex-col ${layout.blockWidth === 'narrow' ? 'max-w-md' : layout.blockWidth === 'mixed' ? 'max-w-2xl' : 'max-w-3xl'}`}
        style={{ maxWidth: 'var(--theme-content-max-width)', paddingLeft: 'var(--theme-page-x)', paddingRight: 'var(--theme-page-x)' }}
      >
        {/* Profile Header */}
        <header
          className={`profile-header flex flex-col mb-6 ${layout.alignment === 'left' ? 'items-start text-left' : 'items-center text-center'} ${layout.headerStyle === 'hero' ? 'mb-8' : layout.headerStyle === 'compact' ? 'mb-4' : ''}`}
          style={{ alignItems: layout.alignment === 'left' ? 'flex-start' : 'center', textAlign: layout.alignment }}
        >
          {standardTheme.profile?.showAvatar !== false && <div className="relative mb-3.5 group anime-profile-item">
            <div className="profile-avatar" style={{ borderRadius: standardTheme.profile?.avatarShape === 'square' ? '0' : standardTheme.profile?.avatarShape === 'rounded' ? '18px' : '999px', overflow: 'hidden' }}>
              <Avatar
                name={profile.displayName || profile.username}
                size="2xl"
                avatarUrl={profile.avatarUrl}
                className="profile-avatar ring-2 ring-ink/10 shadow-lg"
                style={{ width: `${standardTheme.header.avatarSize}px`, height: `${standardTheme.header.avatarSize}px`, borderRadius: standardTheme.profile?.avatarShape === 'square' ? '0' : standardTheme.profile?.avatarShape === 'rounded' ? '18px' : '999px' }}
              />
            </div>
            {profile.verified && (
              <div 
                className="absolute bottom-0 right-0 p-1 rounded-full bg-blue-500 text-white shadow-md ring-2 ring-line"
                title="Verified Profile"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>}

          <h1 
            className="text-xl sm:text-2xl font-bold tracking-tight mb-1 anime-profile-item"
            style={{ 
              fontFamily: 'var(--theme-display-font, inherit)',
              color: 'var(--theme-text-primary, inherit)'
            }}
          >
            {profile.displayName || `@${profile.username}`}
          </h1>

          {profile.bio && (
            <p 
              className="text-xs sm:text-sm max-w-xs leading-relaxed mb-4 anime-profile-item"
              style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}
            >
              {profile.bio}
            </p>
          )}

          {profile.nowStatus?.text?.trim() && (
            <div
              className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] shadow-sm anime-profile-item"
              style={{
                borderColor: 'var(--theme-border, #30394D)',
                backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
              }}
              aria-label={`${profile.nowStatus.label || 'Now'}: ${profile.nowStatus.text}`}
            >
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--theme-accent,#6366F1)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--theme-accent,#6366F1)]" />
              </span>
              <span className="font-semibold">{profile.nowStatus.label || 'Now'}</span>
              <span className="opacity-60">·</span>
              {safePublicHref(profile.nowStatus.url) ? (
                <a href={safePublicHref(profile.nowStatus.url) || '#'} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">
                  {profile.nowStatus.text}
                  <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="truncate">{profile.nowStatus.text}</span>
              )}
            </div>
          )}

          {(profile.verified || Number(profile.followerCount) > 0) && <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-[11px]" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
            {profile.verified && <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--theme-border, #30394D)', backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))' }}><ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Verified</span>}
            {Number(profile.followerCount) > 0 && <span className="rounded-full border px-2.5 py-1" style={{ borderColor: 'var(--theme-border, #30394D)', backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))' }}>{new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(profile.followerCount))} followers</span>}
          </div>}

          <button type="button" onClick={handleDownloadVCard} className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition hover:scale-[1.02]" style={{ borderColor: 'var(--theme-border, #30394D)', backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}>
            <Download className="h-3.5 w-3.5" /> Save contact
          </button>

          {hasShopOffers && (
            <a href={`/@${encodeURIComponent(profile.username)}/shop`} className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition hover:scale-[1.02]" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>
              <ShoppingBag className="h-3.5 w-3.5" /> Shop offers
            </a>
          )}

          {/* Social Icons Bar (Top Position) */}
          {socialIconPlacement === 'header' && profile.socialLinks.some(s => s.active && safePublicHref(s.url)) && (
            <div className="profile-social flex items-center justify-center gap-2 flex-wrap mb-4 anime-profile-item">
              {profile.socialLinks.filter(s => s.active && safePublicHref(s.url)).map((link, linkIdx) => (
                <a
                  key={link.id || `header-social-${linkIdx}`}
                  href={safePublicHref(link.url) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.platform}
                  onMouseEnter={(e) => legacyTheme.animeMicroInteractions !== false && animateHoverEnter(e.currentTarget)}
                  onMouseLeave={(e) => legacyTheme.animeMicroInteractions !== false && animateHoverLeave(e.currentTarget)}
                  className="touch-target rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    width: 'var(--theme-social-size, 36px)', height: 'var(--theme-social-size, 36px)',
                    backgroundColor: variants.socialIcons === 'filled' ? 'var(--theme-accent, #6366F1)' : variants.socialIcons === 'minimal' ? 'transparent' : 'var(--theme-panel-bg, #151B2A)',
                    border: `1px solid var(--theme-border, #30394D)`,
                    color: variants.socialIcons === 'filled' ? 'var(--theme-accent-text, #FFFFFF)' : 'var(--theme-social-color, var(--theme-text-primary, #F8FAFC))'
                  }}
                >
                  {renderSocialIcon(link.platform)}
                </a>
              ))}
            </div>
          )}

          {/* Tabs Navigation (if multiple tabs exist) */}
          {profile.tabs.length > 1 && layout.navigationStyle !== 'none' && (
            <div 
              className={`flex items-center gap-1.5 p-1 mb-5 w-full overflow-x-auto justify-center anime-profile-item ${layout.navigationStyle === 'tabs' ? 'rounded-md' : 'rounded-xl'}`}
              role="tablist"
              aria-label="Profile sections"
              style={{
                backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                border: `1px solid var(--theme-border, #30394D)`
              }}
            >
              {profile.tabs.map((tab, tabIdx) => {
                const isActive = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id || `tab-${tabIdx}`}
                    onClick={() => handleTabChange(tab.id)}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`profile-tab-panel-${tab.id}`}
                    id={`profile-tab-${tab.id}`}
                    className={`touch-target px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${layout.navigationStyle === 'tabs' ? 'rounded-md' : 'rounded-lg'}`}
                    style={{
                      backgroundColor: isActive ? 'var(--theme-accent, #6366F1)' : 'transparent',
                      color: isActive 
                        ? 'var(--theme-accent-text, #FFFFFF)' 
                        : 'var(--theme-text-secondary, #94A3B8)'
                    }}
                  >
                    {tab.title}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        {socialIconPlacement === 'inline' && profile.socialLinks.some(s => s.active && safePublicHref(s.url)) && (
          <div className="profile-social flex items-center justify-center gap-2 flex-wrap mb-5" aria-label="Social links">
            {profile.socialLinks.filter(s => s.active && safePublicHref(s.url)).map((link, linkIdx) => (
              <a key={link.id || `inline-social-${linkIdx}`} href={safePublicHref(link.url) || '#'} target="_blank" rel="noopener noreferrer" aria-label={link.platform} className="touch-target rounded-full flex items-center justify-center transition-all hover:scale-110" style={{ width: 'var(--theme-social-size, 36px)', height: 'var(--theme-social-size, 36px)', backgroundColor: variants.socialIcons === 'filled' ? 'var(--theme-accent, #6366F1)' : variants.socialIcons === 'minimal' ? 'transparent' : 'var(--theme-panel-bg, #151B2A)', border: '1px solid var(--theme-border, #30394D)', color: variants.socialIcons === 'filled' ? 'var(--theme-accent-text, #FFFFFF)' : 'var(--theme-social-color, var(--theme-text-primary, #F8FAFC))' }}>
                {renderSocialIcon(link.platform)}
              </a>
            ))}
          </div>
        )}

        {/* Blocks Render List */}
        <main
          id={currentTab && profile.tabs.length > 1 ? `profile-tab-panel-${currentTab.id}` : undefined}
          role={currentTab && profile.tabs.length > 1 ? 'tabpanel' : undefined}
          aria-labelledby={currentTab && profile.tabs.length > 1 ? `profile-tab-${currentTab.id}` : undefined}
          className="w-full flex-1"
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--theme-block-gap, 14px)', backgroundColor: layout.sectionGrouping === 'flat' ? undefined : layout.sectionBackground, borderTop: layout.sectionDivider === 'line' ? '1px solid var(--theme-border, #30394D)' : layout.sectionDivider === 'accent' ? '2px solid var(--theme-accent, #6366F1)' : undefined }}
        >
          {(!currentTab || currentTab.blocks.length === 0) && (
            <div 
              className="text-center py-10 px-4 rounded-xl text-xs"
              style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))', border: `1px dashed var(--theme-border, #30394D)` }}
            >
              No content published in this tab yet.
            </div>
          )}

          {orderedCurrentBlocks.map((block, blockIdx) => {
            const cardClasses = `${getCardStyle()} transition-all duration-200 overflow-hidden`;
            const requestedVariant = block.type === 'link'
              ? variants.link
              : block.type === 'media' || block.type === 'gallery' || block.type === 'carousel'
                ? variants.image
                : undefined;
            const registeredVariant = getBlockVariantDefinition(block.type, requestedVariant);
            const blockStyle = resolveBlockStyle(
              block.type,
              block.style?.variant,
              block.type === 'link' ? variants.link : block.type === 'media' || block.type === 'gallery' || block.type === 'carousel' ? variants.image : undefined
            );
            const isFeaturedBlock = blockIdx === 0 && (
              block.pinned === true ||
              block.conversionRole === 'primary' ||
              block.style?.variant === 'featured' ||
              blockStyle === 'featured'
            );

            const renderBlockContent = () => {
              switch (block.type) {
                case 'link': {
                  const payload = block.payload as LinkBlockPayload;
                  const linkHref = safePublicHref(payload.url);
                  const linkDefaults = standardTheme.blockDefaults?.link;
                  const defaultVariant = linkDefaults?.variant === 'outline' ? 'outline' : linkDefaults?.variant === 'soft' ? 'soft-card' : linkDefaults?.variant === 'glass' ? 'glass' : 'solid';
                  const requestedLinkVariant = block.style?.variant === 'image' ? 'image-card' : block.style?.variant === 'featured' ? 'solid' : block.style?.variant;
                  const linkVariant = resolveLinkVariant(requestedLinkVariant, variants.link || defaultVariant);
                  const minH = linkDefaults?.height ? `${linkDefaults.height}px` : '56px';
                  const thumbnailHref = safePublicHref(payload.thumbnailUrl);
                  const appHref = validateAppUrl(payload.appUrl || '').isValid ? payload.appUrl?.trim() : null;

                  return (
                    <a
                      key={block.id}
                      href={linkHref || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!linkHref || undefined}
                      title={!linkHref ? 'This destination still needs to be configured.' : undefined}
                      onClick={(e) => {
                        if (!linkHref) {
                          e.preventDefault();
                          return;
                        }
                        if (appHref) {
                          e.preventDefault();
                          window.location.assign(appHref);
                          window.setTimeout(() => {
                            if (document.visibilityState === 'visible') window.location.assign(linkHref);
                          }, 900);
                          return;
                        }
                        handleLinkClick(block.id, linkHref, e);
                      }}
                      onMouseEnter={(e) => legacyTheme.animeMicroInteractions !== false && animateHoverEnter(e.currentTarget)}
                      onMouseLeave={(e) => legacyTheme.animeMicroInteractions !== false && animateHoverLeave(e.currentTarget)}
                      className={`p-4 flex items-center justify-between group relative transition-all duration-200 overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-[var(--theme-focus-ring)] ${linkHref ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                      style={{
                        backgroundColor: block.style?.backgroundColor || (
                          linkVariant === 'outline' ? 'transparent'
                          : linkVariant === 'soft-card' ? 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))'
                          : linkVariant === 'glass' ? 'rgba(255,255,255,0.08)'
                          : 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))'
                        ),
                        backgroundImage: block.style?.backgroundImage ? `url(${block.style.backgroundImage})` : undefined,
                        border: `1px solid var(--theme-card-border, var(--theme-border, #30394D))`,
                        // Use card-text so the token is correct for the panel surface on both light
                        // and dark themes. Falls back to the page primaryText only as a last resort.
                        color: block.style?.textColor || 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))',
                        borderRadius: block.style?.borderRadius !== undefined ? `${block.style.borderRadius}px` : 'var(--theme-button-radius, 12px)',
                        boxShadow: linkVariant === 'solid' ? 'var(--theme-card-shadow, var(--theme-card-elevation, none))' : 'var(--theme-card-elevation, none)',
                        borderColor: linkVariant === 'solid' ? 'var(--theme-card-border, var(--theme-button-border, var(--theme-border, #30394D)))' : 'var(--theme-card-border, var(--theme-border, #30394D))',
                        backdropFilter: linkVariant === 'glass' || (standardTheme.buttons?.blur || standardTheme.effects?.blur || 0) > 0 ? `blur(var(--theme-button-blur, var(--theme-surface-blur, 0px)))` : undefined,
                        minHeight: block.style?.height ? `${block.style.height}px` : minH,
                        textAlign: block.style?.alignment || undefined,
                        fontFamily: block.style?.fontFamily || undefined
                      }}
                    >
                      {payload.animation === 'shimmer' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-ink/5 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />
                      )}

                      {thumbnailHref && <img src={thumbnailHref} alt="" loading="lazy" className="mr-3 h-11 w-11 shrink-0 rounded-lg object-cover" aria-hidden="true" />}
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm tracking-tight truncate group-hover:underline">
                            {block.title}
                          </span>
                          {payload.highlightBadge && (
                            <span 
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: 'var(--theme-accent, #6366F1)',
                                color: 'var(--theme-accent-text, #FFFFFF)'
                              }}
                            >
                              {payload.highlightBadge}
                            </span>
                          )}
                        </div>
                        {payload.subtitle && (
                          <p 
                            className="text-xs truncate"
                            style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}
                          >
                            {payload.subtitle}
                          </p>
                        )}
                      </div>
                      <ExternalLink 
                        className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}
                      />
                    </a>
                  );
                }

              case 'media': {
                const payload = block.payload as MediaBlockPayload;
                const embedInfo = sanitizeMediaEmbed(payload.url || '');
                const mediaHref = safePublicHref(payload.url);
                const posterHref = safePublicHref(payload.poster);
                const captionsHref = safePublicHref(payload.captionsUrl);
                const isDirectVideo = payload.mediaType === 'video' && !!mediaHref && /\.(?:mp4|webm|mov)(?:$|[?#])/i.test(mediaHref);

                return (
                  <div
                    key={block.id}
                    className={`${cardClasses} overflow-hidden profile-media-block`}
                    style={{
                      backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                      border: `1px solid var(--theme-card-border, var(--theme-border, #30394D))`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))',
                      borderRadius: standardTheme.blockDefaults?.media?.radius === 'none' ? 0 : standardTheme.blockDefaults?.media?.radius === 'sm' ? '8px' : standardTheme.blockDefaults?.media?.radius === 'md' ? '14px' : standardTheme.blockDefaults?.media?.radius === 'full' ? '999px' : 'var(--theme-card-radius, 16px)'
                    }}
                  >
                    {isDirectVideo ? (
                      <div className="relative w-full aspect-video bg-black/60">
                        <video
                          controls
                          preload="metadata"
                          poster={posterHref || undefined}
                          className="h-full w-full object-contain"
                          aria-label={block.title}
                        >
                          <source src={mediaHref || undefined} />
                          {captionsHref && <track kind="captions" src={captionsHref} srcLang="en" label="English captions" />}
                        </video>
                      </div>
                    ) : payload.mediaType === 'video' && embedInfo.isValid ? (
                      <div className="relative w-full aspect-video bg-black/60">
                        <iframe
                          src={embedInfo.embedUrl}
                          title={block.title}
                          loading="lazy"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                ) : payload.mediaType === 'image' && mediaHref ? (
                      <div className="w-full relative overflow-hidden bg-surface">
                        <img 
                          src={mediaHref}
                          alt={block.title} 
                          width={1200}
                          height={800}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-auto object-cover max-h-72" 
                          onError={(e) => {
                            e.currentTarget.classList.add('hidden');
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden min-h-32 flex-col items-center justify-center gap-1 p-4 text-center text-muted">
                          <AlertCircle className="h-5 w-5 text-warning" aria-hidden="true" />
                          <span className="text-xs font-semibold text-body">Media Preview Unavailable</span>
                          <span className="text-[10px]">This image could not be loaded.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-surface/80 border-b border-line flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="w-6 h-6 text-warning mb-1" />
                        <span className="text-xs font-semibold text-body">Media Preview Unavailable</span>
                        <span className="text-[10px] text-subtle mt-0.5">Please provide a valid YouTube, Vimeo, Spotify, or image URL</span>
                      </div>
                    )}
                    <div className="p-3">
                      <h4 className="text-xs font-semibold">{block.title}</h4>
                      {payload.caption && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                          {payload.caption}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              case 'gallery': {
                const payload = block.payload as GalleryBlockPayload;
                const columns = payload.columns || 2;
                return (
                  <div key={block.id} className={`${cardClasses} p-2`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))' }}>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                      {payload.items.map((item, itemIdx) => {
                        const imageHref = safePublicHref(item.image);
                        if (!imageHref) return null;
                        const itemHref = safePublicHref(item.url);
                        const image = <img src={imageHref} alt={item.alt || item.title || block.title} loading="lazy" className="aspect-square w-full object-cover" style={{ borderRadius: 'var(--theme-card-radius, 16px)' }} />;
                        const itemKey = item.id || `${block.id}-gallery-${itemIdx}`;
                        return itemHref ? <a key={itemKey} href={itemHref} target="_blank" rel="noopener noreferrer">{image}</a> : <div key={itemKey}>{image}</div>;
                      })}
                    </div>
                    <h4 className="px-2 pt-2 pb-1 text-xs font-semibold">{block.title}</h4>
                  </div>
                );
              }

              case 'carousel': {
                const payload = block.payload as CarouselBlockPayload;
                return (
                  <div key={block.id} className={`${cardClasses} overflow-x-auto snap-x snap-mandatory flex gap-2 p-2`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))' }}>
                    {payload.items.map((item, itemIdx) => {
                      const imageHref = safePublicHref(item.image);
                      if (!imageHref) return null;
                      const itemHref = safePublicHref(item.url);
                      const image = <img src={imageHref} alt={item.alt || item.title || block.title} loading="lazy" className="w-full aspect-[4/3] object-cover" style={{ borderRadius: 'var(--theme-card-radius, 16px)' }} />;
                      return <div key={item.id || `${block.id}-carousel-${itemIdx}`} className="min-w-[82%] snap-center">{itemHref ? <a href={itemHref} target="_blank" rel="noopener noreferrer">{image}</a> : image}{item.title && <p className="text-xs mt-2" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{item.title}</p>}</div>;
                    })}
                  </div>
                );
              }

              case 'course': {
                const payload = block.payload as ProductBlockPayload & { lessons?: Array<{ id?: string; title?: string; duration?: string; preview?: boolean }>; level?: string };
                const checkoutLoading = productCheckoutStatus[block.id] === 'loading';
                const checkoutError = productCheckoutErrors[block.id];
                const coverHref = safePublicHref(payload.image);
                const courseHref = safePublicHref(payload.url);
                const lessons = Array.isArray(payload.lessons) ? payload.lessons : [];
                const courseBody = <div className="p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-sm">{block.title}</h4>{payload.level && <p className="mt-1 text-[11px] uppercase tracking-[0.12em]" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{payload.level}</p>}</div>{payload.price && <span className="font-bold text-sm" style={{ color: 'var(--theme-accent, #6366F1)' }}>{payload.currency || 'USD'} {payload.price}</span>}</div>{payload.description && <p className="text-xs mt-2" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{payload.description}</p>}<div className="mt-3 space-y-2">{lessons.map((lesson, index) => <div key={lesson.id || `${block.id}-lesson-${index}`} className="flex items-center gap-2 rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--theme-card-border, var(--theme-border, #30394D))' }}><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{index + 1}</span><span className="min-w-0 flex-1 truncate text-xs">{lesson.title || `Lesson ${index + 1}`}</span>{lesson.preview && <span className="text-[10px] font-semibold" style={{ color: 'var(--theme-accent, #6366F1)' }}>Preview</span>}{lesson.duration && <span className="text-[10px]" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{lesson.duration}</span>}</div>)}</div>{payload.checkoutEnabled ? <><button type="button" disabled={checkoutLoading} onClick={() => void handleProductCheckout(block.id)} className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{checkoutLoading ? 'Opening checkout…' : payload.buttonLabel || 'Enroll now'}</button>{checkoutError && <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--theme-danger, #B42318)' }}>{checkoutError}</p>}</> : courseHref && <a href={courseHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{payload.buttonLabel || 'View course'} <ExternalLink className="ml-1 h-3 w-3" /></a>}</div>;
                return <div key={block.id} className={`${cardClasses} overflow-hidden block`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}>{coverHref && <img src={coverHref} alt={block.title} loading="lazy" className="w-full aspect-[16/8] object-cover" style={{ borderRadius: 'var(--theme-card-radius, 16px) var(--theme-card-radius, 16px) 0 0' }} />}{courseBody}</div>;
              }

              case 'product': {
                const payload = block.payload as ProductBlockPayload;
                const productHref = safePublicHref(payload.url);
                const productImageHref = safePublicHref(payload.image);
                const checkoutEnabled = payload.checkoutEnabled === true;
                const checkoutLoading = productCheckoutStatus[block.id] === 'loading';
                const checkoutError = productCheckoutErrors[block.id];
                const productContent = <div className="p-4"><div className="flex items-start justify-between gap-3"><h4 className="font-semibold text-sm">{block.title}</h4>{payload.price && <span className="font-bold text-sm" style={{ color: 'var(--theme-accent, #6366F1)' }}>{payload.currency || '$'} {payload.price}</span>}</div>{payload.description && <p className="text-xs mt-1" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{payload.description}</p>}{checkoutEnabled ? <><button type="button" disabled={checkoutLoading} onClick={() => void handleProductCheckout(block.id)} className="mt-3 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{checkoutLoading ? 'Opening checkout…' : payload.buttonLabel || 'Buy now'}</button>{checkoutError && <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--theme-danger, #B42318)' }}>{checkoutError}</p>}</> : <span className="inline-flex mt-3 text-xs font-semibold" style={{ color: 'var(--theme-accent, #6366F1)' }}>{payload.buttonLabel || 'View product'} <ExternalLink className="w-3 h-3 ml-1" /></span>}</div>;
                if (checkoutEnabled) {
                  return <div key={block.id} className={`${cardClasses} overflow-hidden block`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}>{productImageHref && <img src={productImageHref} alt={block.title} loading="lazy" className="w-full aspect-[4/3] object-cover" style={{ borderRadius: 'var(--theme-card-radius, 16px) var(--theme-card-radius, 16px) 0 0' }} />}{productContent}</div>;
                }
                return (
                  <a key={block.id} href={productHref || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!productHref || undefined} title={!productHref ? 'This product destination still needs to be configured.' : undefined} className={`${cardClasses} overflow-hidden block ${productHref ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}>
                    {productImageHref && <img src={productImageHref} alt={block.title} loading="lazy" className="w-full aspect-[4/3] object-cover" style={{ borderRadius: 'var(--theme-card-radius, 16px) var(--theme-card-radius, 16px) 0 0' }} />}
                    {productContent}
                  </a>
                );
              }

              case 'tip': {
                const payload = block.payload as TipBlockPayload;
                const checkoutLoading = productCheckoutStatus[block.id] === 'loading';
                const checkoutError = productCheckoutErrors[block.id];
                return <div key={block.id} className={`${cardClasses} p-4`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-sm">{block.title}</h4>{payload.description && <p className="mt-1 text-xs" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{payload.description}</p>}</div><span className="font-bold text-sm" style={{ color: 'var(--theme-accent, #6366F1)' }}>{payload.currency || 'USD'} {payload.amount}</span></div>{payload.checkoutEnabled !== false && <><button type="button" disabled={checkoutLoading} onClick={() => void handleProductCheckout(block.id)} className="mt-3 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{checkoutLoading ? 'Opening checkout…' : payload.buttonLabel || 'Leave a tip'}</button>{checkoutError && <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--theme-danger, #B42318)' }}>{checkoutError}</p>}</>}</div>;
              }

              case 'membership': {
                const payload = block.payload as MembershipBlockPayload;
                const checkoutLoading = productCheckoutStatus[block.id] === 'loading';
                const checkoutError = productCheckoutErrors[block.id];
                const membershipHref = safePublicHref((payload as MembershipBlockPayload & { url?: string }).url);
                const benefits = Array.isArray(payload.benefits) ? payload.benefits.filter(Boolean).slice(0, 8) : [];
                return <div key={block.id} className={`${cardClasses} p-4`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-semibold">{block.title}</h4>{payload.description && <p className="mt-1 text-xs" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{payload.description}</p>}</div><span className="shrink-0 text-right font-bold text-sm" style={{ color: 'var(--theme-accent, #6366F1)' }}>{payload.currency || 'USD'} {payload.price}<small className="block text-[10px] font-medium" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>/{payload.interval === 'year' ? 'year' : 'month'}</small></span></div>{benefits.length > 0 && <ul className="mt-3 space-y-1.5 text-xs" aria-label="Membership benefits">{benefits.map((benefit, index) => <li key={`${benefit}-${index}`} className="flex items-start gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--theme-accent, #6366F1)' }} />{benefit}</li>)}</ul>}{payload.checkoutEnabled !== false ? <><button type="button" disabled={checkoutLoading} onClick={() => void handleProductCheckout(block.id)} className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-70" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{checkoutLoading ? 'Opening checkout…' : payload.buttonLabel || 'Become a member'}</button>{checkoutError && <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--theme-danger, #B42318)' }}>{checkoutError}</p>}</> : membershipHref && <a href={membershipHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{payload.buttonLabel || 'Join now'} <ExternalLink className="ml-1 h-3 w-3" /></a>}</div>;
              }

              case 'event': {
                const payload = block.payload as EventBlockPayload;
                const eventHref = safePublicHref(payload.url);
                const eventDate = payload.date ? new Date(`${payload.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date to be announced';
                return (
                  <div key={block.id} className={`${cardClasses} flex items-start gap-3 p-4`} style={{ backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))', border: '1px solid var(--theme-card-border, var(--theme-border, #30394D))', color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}>
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>
                      <span className="text-[10px] font-bold uppercase leading-tight">{eventDate.split(' ')[0]}</span>
                      <span className="text-lg font-bold leading-none">{eventDate.match(/\d+/)?.[0] || '—'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold">{block.title}</h4>
                      <p className="mt-1 text-xs" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{eventDate}{payload.time ? ` · ${payload.time}` : ''}{payload.location ? ` · ${payload.location}` : ''}</p>
                      {payload.description && <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>{payload.description}</p>}
                      {eventHref && <a href={eventHref} target="_blank" rel="noopener noreferrer" onClick={(event) => handleLinkClick(block.id, eventHref, event)} className="mt-3 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold" style={{ backgroundColor: 'var(--theme-accent, #6366F1)', color: 'var(--theme-accent-text, #FFFFFF)' }}>{payload.buttonLabel || 'Learn more'} <ExternalLink className="ml-1 h-3 w-3" /></a>}
                    </div>
                  </div>
                );
              }

              case 'text': {
                const payload = block.payload as TextBlockPayload;
                const alignClass = payload.alignment === 'left' ? 'text-left' : payload.alignment === 'right' ? 'text-right' : 'text-center';
                return (
                  <div key={block.id} className={`w-full py-1 px-2 ${alignClass}`}>
                    {payload.textType === 'h1' && (
                      <h2 className="text-lg font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--theme-display-font, inherit)' }}>
                        {block.title}
                      </h2>
                    )}
                    {payload.textType === 'h2' && (
                      <h3 className="text-base font-semibold tracking-tight mb-1">
                        {block.title}
                      </h3>
                    )}
                    {payload.textType === 'quote' && (
                      <blockquote className="italic text-xs border-l-2 pl-3 py-1 my-1" style={{ borderColor: 'var(--theme-accent, #6366F1)' }}>
                        {payload.content}
                      </blockquote>
                    )}
                    {payload.textType === 'p' && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                        {payload.content}
                      </p>
                    )}
                  </div>
                );
              }

              case 'divider': {
                const payload = block.payload as DividerBlockPayload;
                const heightClasses = {
                  sm: 'my-2',
                  md: 'my-4',
                  lg: 'my-6'
                };
                if (payload.style === 'spacer') {
                  return <div key={block.id} className={heightClasses[payload.height]} />;
                }
                return (
                  <div key={block.id} className={`w-full ${heightClasses[payload.height]}`}>
                    <hr 
                      style={{
                        borderColor: 'var(--theme-border, #30394D)',
                        borderStyle: payload.style === 'dashed' ? 'dashed' : payload.style === 'dotted' ? 'dotted' : 'solid',
                        borderTopWidth: '1px'
                      }}
                    />
                  </div>
                );
              }

              case 'folder': {
                const payload = block.payload as FolderBlockPayload;
                const isOpen = openFolders[block.id] ?? !!payload.defaultOpen;
                return (
                  <div
                    key={block.id}
                    className={`${cardClasses}`}
                    style={{
                      backgroundColor: standardTheme.blockDefaults?.folder?.variant === 'glass' ? 'rgba(255,255,255,0.08)' : 'var(--theme-panel-bg, #151B2A)',
                      border: `1px solid var(--theme-border, #30394D)`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))',
                      backdropFilter: standardTheme.blockDefaults?.folder?.variant === 'glass' ? 'blur(16px)' : undefined
                    }}
                  >
                    <button
                      onClick={() => toggleFolder(block.id)}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={`folder-content-${block.id}`}
                  className="touch-target w-full p-4 flex items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-sm">{block.title}</div>
                        {payload.description && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                            {payload.description}
                          </div>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }} />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }} />
                      )}
                    </button>

                    {isOpen && (
                      <div 
                        id={`folder-content-${block.id}`}
                        className="px-4 pb-4 pt-1 space-y-2 border-t"
                        style={{ borderColor: 'var(--theme-border, #30394D)' }}
                      >
                        {payload.items.map((item, itemIdx) => (
                          <a
                            key={item.id || `${block.id}-folder-${itemIdx}`}
                            href={safePublicHref(item.url) || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-disabled={!safePublicHref(item.url) || undefined}
                            title={!safePublicHref(item.url) ? 'This destination still needs to be configured.' : undefined}
                            onClick={(e) => {
                              const itemHref = safePublicHref(item.url);
                              if (!itemHref) {
                                e.preventDefault();
                                return;
                              }
                              handleLinkClick(block.id, itemHref, e);
                            }}
                            className={`p-2.5 rounded-lg flex items-center justify-between text-xs transition-opacity ${safePublicHref(item.url) ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-70'}`}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              border: `1px solid var(--theme-border, #30394D)`
                            }}
                          >
                            <span className="font-medium truncate">{item.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              case 'faq': {
                const payload = block.payload as FaqBlockPayload;
                return (
                  <div
                    key={block.id}
                    className={`${cardClasses} p-4`}
                    style={{
                      backgroundColor: standardTheme.componentVariants?.form === 'glass' ? 'rgba(255,255,255,0.08)' : 'var(--theme-panel-bg, #151B2A)',
                      border: `1px solid var(--theme-border, #30394D)`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))',
                      backdropFilter: standardTheme.componentVariants?.form === 'glass' ? 'blur(16px)' : undefined
                    }}
                  >
                    <h4 className="font-semibold text-xs tracking-wider uppercase mb-3" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                      {block.title}
                    </h4>
                    <div className="space-y-2">
                      {payload.items.map((faq, faqIdx) => {
                        const isExpanded = openFaqs[faq.id];
                        return (
                          <div 
                            key={faq.id || `${block.id}-faq-${faqIdx}`} 
                            className="rounded-lg overflow-hidden border"
                            style={{ borderColor: 'var(--theme-border, #30394D)' }}
                          >
                            <button
                              onClick={() => toggleFaq(faq.id)}
                              type="button"
                              aria-expanded={isExpanded}
                              aria-controls={`faq-answer-${faq.id}`}
                              className="touch-target w-full p-2.5 flex items-center justify-between text-left text-xs font-medium cursor-pointer"
                            >
                              <span>{faq.question}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 shrink-0 ml-2" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-2" />
                              )}
                            </button>
                            {isExpanded && (
                              <div 
                                id={`faq-answer-${faq.id}`}
                                className="px-2.5 pb-2.5 text-[11px] leading-relaxed border-t pt-2"
                                style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))', borderColor: 'var(--theme-border, #30394D)' }}
                              >
                                {faq.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              case 'testimonial': {
                const payload = block.payload as TestimonialBlockPayload;
                return (
                  <div
                    key={block.id}
                    className={`${cardClasses} p-4 relative`}
                    style={{
                      backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                      border: `1px solid var(--theme-border, #30394D)`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                    }}
                  >
                    <p className="text-xs italic leading-relaxed mb-3">
                      "{payload.quote}"
                    </p>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold">{payload.authorName}</div>
                        {(payload.authorRole || payload.company) && (
                          <div className="text-[11px]" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                            {payload.authorRole} {payload.company ? `• ${payload.company}` : ''}
                          </div>
                        )}
                      </div>
                      {payload.rating && (
                        <div className="flex text-warning text-xs">
                          {'★'.repeat(payload.rating)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              case 'file': {
                const payload = block.payload as FileBlockPayload;
                const fileHref = safePublicHref(payload.fileUrl);
                return (
                  <a
                    key={block.id}
                    href={fileHref || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => handleLinkClick(block.id, fileHref || '', e)}
                    className={`${cardClasses} p-4 cursor-pointer flex items-center justify-between group`}
                    style={{
                      backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                      border: `1px solid var(--theme-border, #30394D)`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                    }}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="font-semibold text-sm truncate group-hover:underline">
                        {block.title}
                      </div>
                      <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                        <span>{payload.fileName}</span>
                        <span>•</span>
                        <span>{payload.fileSize}</span>
                      </div>
                    </div>
                    <div 
                      className="p-2 rounded-lg shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </div>
                  </a>
                );
              }

              case 'form':
              case 'emailSignup': {
                const payload = block.payload as FormBlockPayload;
                const isSent = formSubmitted[block.id];

                return (
                  <div
                    key={block.id}
                    className={`${cardClasses} p-4`}
                    style={{
                      backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                      border: `1px solid var(--theme-border, #30394D)`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                    }}
                  >
                    <h4 className="font-bold text-sm tracking-tight mb-1">{block.title}</h4>
                    {payload.description && (
                      <p className="text-xs mb-3" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                        {payload.description}
                      </p>
                    )}

                    {isSent ? (
                      <div className="py-4 text-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-success flex items-center justify-center mx-auto mb-2">
                          <Check className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-medium text-success">
                          {payload.successMessage}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={(e) => handleFormSubmit(e, block)} className="space-y-2.5">
                        {/* Hidden Honeypot bot trap field (FORM-003) */}
                        <div style={{ display: 'none', position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true">
                          <label htmlFor={`hp_trap_${block.id}`}>Leave this field empty</label>
                          <input
                            type="text"
                            id={`hp_trap_${block.id}`}
                            name="_hp_trap"
                            tabIndex={-1}
                            autoComplete="off"
                            value={formHoneypots[block.id] || ''}
                            onChange={(e) => setFormHoneypots(prev => ({ ...prev, [block.id]: e.target.value }))}
                          />
                        </div>

                        {/* Top-level Form Error Alert */}
                        {formErrors[block.id]?._form && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-danger text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{formErrors[block.id]._form}</span>
                          </div>
                        )}

                        {payload.fields.map((field, fieldIdx) => {
                          const fieldError = formErrors[block.id]?.[field.id];
                          const currentValue = formValues[block.id]?.[field.id] || '';

                          return (
                          <div key={field.id || `${block.id}-field-${fieldIdx}`} className="space-y-1">
                              <label htmlFor={`form-${block.id}-${field.id}`} className="block text-sm sm:text-[11px] font-medium" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                                {field.label} {field.required && <span className="text-danger">*</span>}
                              </label>

                              {field.type === 'textarea' ? (
                                <textarea
                                  id={`form-${block.id}-${field.id}`}
                                  name={field.id}
                                  aria-invalid={fieldError ? 'true' : undefined}
                                  placeholder={field.placeholder || ''}
                                  rows={3}
                                  value={currentValue}
                                  onChange={(e) => handleFormInputChange(block.id, field.id, e.target.value)}
                                  className={`w-full text-xs p-2 rounded-lg border focus:outline-none transition-colors ${
                                    fieldError ? 'border-rose-500/80 focus:ring-1 focus:ring-rose-500' : 'focus:ring-1 focus:ring-ink/40'
                                  }`}
                                  style={{ 
                                    backgroundColor: 'color-mix(in srgb, var(--theme-card-bg, var(--theme-panel-bg, #1E2636)) 90%, transparent)',
                                    borderColor: fieldError ? '#F43F5E' : 'var(--theme-card-border, var(--theme-border, #30394D))',
                                    color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                                  }}
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  id={`form-${block.id}-${field.id}`}
                                  name={field.id}
                                  aria-invalid={fieldError ? 'true' : undefined}
                                  value={currentValue}
                                  onChange={(e) => handleFormInputChange(block.id, field.id, e.target.value)}
                                  className={`w-full text-xs p-2 rounded-lg border focus:outline-none transition-colors ${
                                    fieldError ? 'border-rose-500/80 focus:ring-1 focus:ring-rose-500' : 'focus:ring-1 focus:ring-ink/40'
                                  }`}
                                  style={{ 
                                    backgroundColor: 'color-mix(in srgb, var(--theme-card-bg, var(--theme-panel-bg, #1E2636)) 90%, transparent)',
                                    borderColor: fieldError ? '#F43F5E' : 'var(--theme-card-border, var(--theme-border, #30394D))',
                                    color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                                  }}
                                >
                                  <option value="">{field.placeholder || 'Select an option...'}</option>
                                  {(field.options || []).map((opt, optIdx) => (
                                    <option key={`${field.id || fieldIdx}-option-${optIdx}`} value={opt} className="bg-surface text-ink">
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : field.type === 'checkbox' ? (
                                <label className="flex items-center gap-2 text-xs cursor-pointer py-1" style={{ color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))' }}>
                                  <input
                                    id={`form-${block.id}-${field.id}`}
                                    name={field.id}
                                    aria-label={field.label}
                                    type="checkbox"
                                    checked={currentValue === 'true'}
                                    onChange={(e) => handleFormInputChange(block.id, field.id, e.target.checked ? 'true' : 'false')}
                                    className="rounded border-line-strong text-accent focus:ring-0"
                                  />
                                  <span>{field.placeholder || field.label}</span>
                                </label>
                              ) : (
                                <input
                                  id={`form-${block.id}-${field.id}`}
                                  name={field.id}
                                  aria-invalid={fieldError ? 'true' : undefined}
                                  type={field.type === 'phone' ? 'tel' : field.type}
                                  placeholder={field.placeholder || ''}
                                  value={currentValue}
                                  onChange={(e) => handleFormInputChange(block.id, field.id, e.target.value)}
                                  className={`w-full text-xs p-2 rounded-lg border focus:outline-none transition-colors ${
                                    fieldError ? 'border-rose-500/80 focus:ring-1 focus:ring-rose-500' : 'focus:ring-1 focus:ring-ink/40'
                                  }`}
                                  style={{ 
                                    backgroundColor: 'color-mix(in srgb, var(--theme-card-bg, var(--theme-panel-bg, #1E2636)) 90%, transparent)',
                                    borderColor: fieldError ? '#F43F5E' : 'var(--theme-card-border, var(--theme-border, #30394D))',
                                    color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                                  }}
                                />
                              )}

                              {field.helpText && !fieldError && (
                                <p className="text-xs sm:text-[10px]" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                                  {field.helpText}
                                </p>
                              )}

                              {fieldError && (
                                <p className="text-[10px] text-danger font-medium">
                                  {fieldError}
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {payload.consentText && (
                          <div className="space-y-1 mt-1">
                            <label className="flex items-start gap-2 text-xs sm:text-[10px] cursor-pointer" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                              <input
                                type="checkbox"
                                checked={formConsents[block.id] !== false}
                                onChange={(e) => setFormConsents(prev => ({ ...prev, [block.id]: e.target.checked }))}
                                className="mt-0.5 rounded border-line-strong text-accent focus:ring-0"
                              />
                              <span>{payload.consentText}</span>
                            </label>
                            {formErrors[block.id]?._consent && (
                              <p className="text-[10px] text-danger font-medium pl-5">
                                {formErrors[block.id]._consent}
                              </p>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmittingForm[block.id]}
                          className="touch-target w-full py-2.5 px-4 text-sm sm:text-xs font-semibold rounded-lg transition-all hover:opacity-90 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          style={{
                            backgroundColor: 'var(--theme-accent, #6366F1)',
                            color: 'var(--theme-accent-text, #FFFFFF)'
                          }}
                        >
                          {isSubmittingForm[block.id] ? (
                            <span>Submitting...</span>
                          ) : (
                            <span>{payload.submitButtonText || 'Submit'}</span>
                          )}
                        </button>
                      </form>
                    )}
                  </div>
                );
              }

              case 'contact': {
                const payload = block.payload as ContactBlockPayload;
                const isEmail = payload.contactType === 'email';
                const isWhatsApp = payload.contactType === 'whatsapp';
                const href = isEmail
                  ? `mailto:${payload.value}?subject=${encodeURIComponent(payload.presetSubject || '')}`
                  : isWhatsApp
                    ? `https://wa.me/${payload.value.replace(/[^\d+]/g, '')}${payload.presetSubject ? `?text=${encodeURIComponent(payload.presetSubject)}` : ''}`
                    : `tel:${payload.value}`;
                const safeHref = safePublicHref(href);

                return (
                  <a
                    key={block.id}
                    href={safeHref || '#'}
                    onClick={() => trackEvent({
                      profileId: profile.id,
                      blockId: block.id,
                      type: 'block_click',
                      referrer: 'Public Page',
                      country: 'United States',
                      device: 'mobile'
                    })}
                    className={`${cardClasses} p-4 flex items-center justify-between group cursor-pointer`}
                    style={{
                      backgroundColor: 'var(--theme-card-bg, var(--theme-panel-bg, #151B2A))',
                      border: `1px solid var(--theme-border, #30394D)`,
                      color: 'var(--theme-card-text, var(--theme-text-primary, #F8FAFC))'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-ink/10">
                        {isEmail ? <Mail className="w-4 h-4" /> : isWhatsApp ? <MessageSquare className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{block.title}</div>
                        <div className="text-xs" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
                          {payload.value}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                  </a>
                );
              }

              default:
                return null;
            }
          };

          return (
            <AnimatedProfileBlock
              key={block.id || `block-${blockIdx}`}
              block={block}
              theme={animationTheme}
              className="w-full"
              data-variant-id={registeredVariant?.id || 'default'}
              data-block-style={blockStyle}
              data-featured-block={isFeaturedBlock ? 'true' : undefined}
            >
              {isFeaturedBlock && <span className="profile-featured-label" aria-hidden="true">Featured</span>}
              {renderBlockContent()}
            </AnimatedProfileBlock>
          );
        })}
        </main>

        {/* Social Icons Bar (Bottom Position) */}
        {socialIconPlacement === 'footer' && profile.socialLinks.some(s => s.active && safePublicHref(s.url)) && (
          <div className="profile-social flex items-center justify-center gap-2 flex-wrap mt-8 mb-4">
            {profile.socialLinks.filter(s => s.active && safePublicHref(s.url)).map((link, linkIdx) => (
              <a
                key={link.id || `footer-social-${linkIdx}`}
                href={safePublicHref(link.url) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.platform}
                className="touch-target rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  width: 'var(--theme-social-size, 36px)', height: 'var(--theme-social-size, 36px)',
                  backgroundColor: variants.socialIcons === 'filled' ? 'var(--theme-accent, #6366F1)' : variants.socialIcons === 'minimal' ? 'transparent' : 'var(--theme-panel-bg, #151B2A)',
                  border: `1px solid var(--theme-border, #30394D)`,
                  color: variants.socialIcons === 'filled' ? 'var(--theme-accent-text, #FFFFFF)' : 'var(--theme-social-color, var(--theme-text-primary, #F8FAFC))'
                }}
              >
                {renderSocialIcon(link.platform)}
              </a>
            ))}
          </div>
        )}

        {/* Public Footer */}
        {/* Platform badge: only suppressed when plan grants removeBranding AND theme explicitly hides it */}
        {(layout.showFooter !== false || !canRemoveBranding) && (
          <footer className="mt-12 text-center text-xs pb-4">
            <div className="flex items-center justify-center gap-3" style={{ color: 'var(--theme-card-subtitle, var(--theme-text-secondary, #94A3B8))' }}>
              <span className="font-medium">
                Powered by <span className="font-bold text-ink tracking-tight">LynkFlow</span>
              </span>
              <span>·</span>
              <button
                onClick={() => onOpenReportModal?.()}
                className="hover:underline flex items-center gap-1 opacity-70 hover:opacity-100 cursor-pointer"
              >
                <Flag className="w-3 h-3" />
                <span>Report page</span>
              </button>
            </div>
          </footer>
        )}

        {/* Privacy & Optional Tracking Consent Banner (AN-005) */}
        {isStandalone && !cookieConsentDismissed && (
          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 p-4 rounded-2xl bg-surface/95 border border-line-strong/80 shadow-2xl backdrop-blur-xl text-ink-strong text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-ink">Privacy & Telemetry Consent</span>
                <p className="text-[11px] text-muted leading-relaxed">
                  This page uses privacy-preserving, cookieless metrics to measure link clicks. Optional third-party integrations (e.g. Meta Pixel, Google Analytics) remain disabled until you consent.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleDeclineTrackingConsent}
                className="touch-target px-3 py-1.5 rounded-lg text-[11px] font-medium text-body hover:text-ink bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
              >
                Essential Only
              </button>
              <button
                onClick={handleAcceptTrackingConsent}
                className="touch-target px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors cursor-pointer shadow-md shadow-indigo-600/30"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </ThemeProvider>
  );
};
