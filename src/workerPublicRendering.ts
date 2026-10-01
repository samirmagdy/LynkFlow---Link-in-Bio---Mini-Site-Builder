import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server.edge';
import { PublicProfileView } from './components/preview/PublicProfileView';
import type { Profile } from './types';
import { normalizeTheme } from './utils/themeEngine';



export type PublicJson = Record<string, unknown>;
export interface PublicSeo extends PublicJson {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
}
export interface PublicSocialLink extends PublicJson {
  active?: boolean;
  url?: string;
}
export interface PublicBlock extends PublicJson {
  type?: string;
  payload?: PublicJson;
}
export interface PublicTab extends PublicJson {
  blocks?: PublicBlock[];
}
export interface PublicSnapshot extends PublicJson {
  profileId?: string | number;
  id?: string | number;
  username?: string;
  handle?: string;
  displayName?: string;
  bio?: string;
  followerCount?: number;
  version?: number;
  publishedVersion?: number;
  publishedAt?: string;
  avatarUrl?: string;
  socialLinks?: PublicSocialLink[];
  tabs?: PublicTab[];
  standardTheme?: PublicJson;
  theme?: PublicJson;
  seo?: PublicSeo;
}
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safePublicHref(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (!['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function safePublicMediaUrl(value: unknown): string | null {
  const href = safePublicHref(value);
  if (!href) return null;
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    if (host === 'images.unsplash.com' || host === 'plus.unsplash.com' || host === 'images.pexels.com' || host === 'videos.pexels.com' || host === 'assets.production.linktr.ee' || host === 'd1ym67wyom4bkd.cloudfront.net' || host === 'd3rq6m369s8u39.cloudfront.net') return href;
    if (host.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/')) return href;
  } catch (error) {
    console.warn('[LynkFlow] public media URL validation failed', error instanceof Error ? error.message : String(error));
  }
  return null;
}

export function xmlEscape(value: unknown): string {
  return escapeHtml(value);
}

export function publicProfileUrl(origin: string, username: string): string {
  return `${origin.replace(/\/$/, '')}/@${encodeURIComponent(username.toLowerCase())}`;
}

/**
 * Server-render the same React profile renderer used by the editor preview
 * and browser public page. The Worker supplies no-op interaction actions only
 * for static HTML; hydration restores the real application context in the
 * browser. This keeps markup, block variants, locale handling and fallbacks
 * on one renderer instead of maintaining a second SSR switch statement.
 */
export function renderPublicProfileBody(snapshot: PublicSnapshot, _canonicalUrl: string): string {
  const normalizeStaticBlock = (block: PublicBlock): PublicBlock => {
    const payload = block?.payload && typeof block.payload === 'object' ? block.payload : {};
    const arrayDefaults: Record<string, unknown> = {
      folder: { items: [] },
      faq: { items: [] },
      gallery: { items: [] },
      carousel: { items: [] },
      form: { fields: [], successMessage: 'Thanks — your message was received.' },
      emailSignup: { fields: [], successMessage: 'Thanks — you are subscribed.' },
    };
    const defaults = block.type ? arrayDefaults[block.type] : undefined;
    return { ...block, payload: { ...(defaults as Record<string, unknown> || {}), ...payload } };
  };
  const profile = {
    ...snapshot,
    id: String(snapshot.profileId || snapshot.id || `published-${snapshot.username || 'profile'}`),
    username: String(snapshot.username || snapshot.handle || 'creator'),
    displayName: String(snapshot.displayName || snapshot.username || 'Creator'),
    bio: String(snapshot.bio || ''),
    status: 'published',
    publishedVersion: Number(snapshot.version || snapshot.publishedVersion || 1),
    socialLinks: Array.isArray(snapshot.socialLinks) ? snapshot.socialLinks : [],
    tabs: Array.isArray(snapshot.tabs) ? snapshot.tabs.map((tab: PublicTab) => ({
      ...tab,
      blocks: Array.isArray(tab?.blocks) ? tab.blocks.map(normalizeStaticBlock) : []
    })) : [],
    standardTheme: normalizeTheme(snapshot.standardTheme || snapshot.theme || {}),
    theme: snapshot.theme || snapshot.standardTheme || {},
  } as unknown as Profile;
  return renderToStaticMarkup(React.createElement(PublicProfileView, { profile, isStandalone: false }));
}

export function publicProfileStyles(snapshot: PublicSnapshot = {}): string {
  // SSR must use the same normalized theme boundary as the hydrated React
  // renderer. Reading the raw snapshot here caused contrast, responsive, and
  // CSS-safety differences until hydration completed.
  const theme = normalizeTheme(snapshot.standardTheme || snapshot.theme || {});
  const colors = theme.tokens.colors;
  const shape = theme.tokens.shape;
  const typography = theme.tokens.typography;
  const layout = theme.layout || { maxWidth: '680px', alignment: 'center' as const };
  const profile = theme.profile || { avatarShape: 'circle' as const };
  const background = theme.background;
  const pageBackground = escapeHtml(colors.pageBackground || background.fallbackColor || '#0a0a0a');
  const panel = escapeHtml(colors.panelBackground || '#171717');
  const text = escapeHtml(colors.primaryText || '#f5f5f5');
  const secondary = escapeHtml(colors.secondaryText || '#a3a3a3');
  const border = escapeHtml(colors.border || '#404040');
  const accent = escapeHtml(colors.accent || '#818cf8');
  const backgroundAsset = background.type === 'image' ? safePublicMediaUrl(background.assetUrl) : null;
  const mobileBackgroundAsset = background.type === 'image' ? safePublicMediaUrl(background.mobileAssetUrl) : null;
  const backgroundImageUrl = backgroundAsset ? `url("${escapeHtml(backgroundAsset)}")` : 'none';
  const mobileBackgroundImageUrl = mobileBackgroundAsset ? `url("${escapeHtml(mobileBackgroundAsset)}")` : backgroundImageUrl;
  const gradientStops = typeof background.gradientStops === 'string' ? escapeHtml(background.gradientStops) : null;
  const gradientImage = background.type === 'image' && gradientStops && backgroundImageUrl !== 'none'
    ? `${gradientStops}, ${backgroundImageUrl}`
    : (background.type === 'gradient' || background.type === 'pattern') && gradientStops ? gradientStops : backgroundImageUrl;
  const backgroundOverlay = Math.max(0, Math.min(1, Number(background.overlay ?? 0)));
  const overlayColor = escapeHtml(background.overlayColor || '#000000');
  const overlayLayer = `color-mix(in srgb, ${overlayColor} ${Math.round(backgroundOverlay * 100)}%, transparent)`;
  const backgroundLayer = backgroundOverlay > 0 && gradientImage !== 'none' ? `linear-gradient(${overlayLayer}, ${overlayLayer}), ${gradientImage}` : gradientImage;
  const backgroundPosition = background.focalPoint && Number.isFinite(Number(background.focalPoint.x)) && Number.isFinite(Number(background.focalPoint.y))
    ? `${Math.max(0, Math.min(100, Number(background.focalPoint.x)))}% ${Math.max(0, Math.min(100, Number(background.focalPoint.y)))}%`
    : escapeHtml(background.position || 'center');
  const videoTransform = Number(background.scale ?? 1) > 1 ? `transform:scale(${Math.max(1, Math.min(2, Number(background.scale ?? 1)))});transform-origin:${backgroundPosition};` : '';
  const backgroundSize = background.type === 'pattern' ? '24px 24px' : background.type === 'image' && background.fit === 'natural' ? 'auto' : `${Math.max(1, Math.min(2, Number(background.scale ?? 1))) * 100}%`;
  const maxWidth = escapeHtml(layout.maxWidth || '680px');
  const radius = Number(shape.cardRadius ?? 14);
  const avatarRadius = profile.avatarShape === 'square' ? 0 : profile.avatarShape === 'rounded' ? 18 : 999;
  const font = escapeHtml(typography.bodyFamily || 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif');
  const arabicFont = escapeHtml(typography.arabicFamily || 'Noto Kufi Arabic, Tahoma, sans-serif');
  const mode = theme.mode === 'dark' ? 'dark' : theme.mode === 'light' ? 'light' : 'light dark';
  const bodySize = escapeHtml(typography.bodySize || '16px');
  const bodyScale = Math.max(0.75, Math.min(1.5, Number(typography.bodyScale ?? 1)));
  const headingScale = Math.max(0.75, Math.min(2.5, Number(typography.headingScale ?? 1)));
  const captionSize = escapeHtml(typography.captionSize || '12px');
  const buttonTextSize = escapeHtml(typography.buttonTextSize || '14px');
  const maxLineLength = escapeHtml(typography.maxLineLength || '68ch');
  const textTransform = ['none', 'uppercase', 'capitalize'].includes(typography.textTransform || '') ? (typography.textTransform || 'none') : 'none';
  const mobileOverride = background.type === 'image' && mobileBackgroundAsset ? `@media (max-width:639px){body{background-image:${backgroundOverlay > 0 ? `linear-gradient(${overlayLayer}, ${overlayLayer}), ` : ''}${mobileBackgroundImageUrl}!important;background-size:${backgroundSize}!important;background-position:${backgroundPosition}!important}}` : '';
  const responsive = theme.responsive;
  const responsiveRule = (key: 'smallMobile' | 'mobile' | 'tablet' | 'desktop', fallback: Record<string, number | string>) => {
    const rule = (responsive[key] || {}) as Record<string, unknown>;
    const number = (name: string) => Number.isFinite(Number(rule[name])) ? Number(rule[name]) : Number(fallback[name]);
    const textValue = (name: string, allowed: string[]) => allowed.includes(String(rule[name])) ? String(rule[name]) : String(fallback[name]);
    const blockVisibility = textValue('blockVisibility', ['all', 'hide-media', 'hide-socials']);
    return `--theme-content-max-width:${Math.max(280, Math.min(1600, number('maxWidth')))}px;--theme-page-x:${Math.max(8, Math.min(48, number('pageX')))}px;--theme-page-y:${Math.max(8, Math.min(64, number('pageY')))}px;--theme-block-gap:${Math.max(6, Math.min(36, number('blockGap')))}px;--theme-avatar-size:${Math.max(48, Math.min(140, number('avatarSize')))}px;--theme-heading-scale:${Math.max(.75, Math.min(1.6, number('headingScale')))};--theme-image-height:${Math.max(120, Math.min(720, number('imageHeight')))}px;--theme-text-align:${textValue('textAlign', ['left', 'center', 'right'])};--theme-block-visibility:${blockVisibility};--theme-media-display:${blockVisibility === 'hide-media' ? 'none' : 'block'};`;
  };
  const responsiveCss = `.${'profile-shell'}{max-width:var(--theme-content-max-width,${maxWidth});padding:var(--theme-page-y,48px) var(--theme-page-x,20px)}.profile-header{text-align:var(--theme-text-align,${layout.alignment === 'left' ? 'left' : 'center'})}.profile-avatar{width:var(--theme-avatar-size,${Number(theme.header?.avatarSize ?? 88)}px);height:var(--theme-avatar-size,${Number(theme.header?.avatarSize ?? 88)}px)}.profile-header h1{font-size:calc(2rem * var(--theme-heading-scale,${headingScale}))}.profile-content ul{gap:var(--theme-block-gap,${Number(theme.tokens?.spacing?.blockGap ?? 14)}px)}.profile-content figure img,.profile-content figure video{height:var(--theme-image-height,auto);object-fit:cover}.profile-content .profile-media-block{display:var(--theme-media-display,block)}.profile-social{display:${theme.layout?.socialIconPlacement === 'footer' ? 'none' : 'block'}}@media (max-width:374px){.profile-shell{${responsiveRule('smallMobile', { maxWidth: 374, pageX: 12, pageY: 14, blockGap: 10, avatarSize: 72, headingScale: .9, imageHeight: 220, textAlign: 'center', blockVisibility: 'all' })}}}@media (min-width:375px) and (max-width:639px){.profile-shell{${responsiveRule('mobile', { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12, avatarSize: 80, headingScale: .96, imageHeight: 280, textAlign: 'center', blockVisibility: 'all' })}}}@media (min-width:640px) and (max-width:1023px){.profile-shell{${responsiveRule('tablet', { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14, avatarSize: 88, headingScale: 1, imageHeight: 320, textAlign: 'center', blockVisibility: 'all' })}}}@media (min-width:1024px){.profile-shell{${responsiveRule('desktop', { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16, avatarSize: 96, headingScale: 1.05, imageHeight: 380, textAlign: 'center', blockVisibility: 'all' })}}}`;
  return `<style>body{margin:0;background:${pageBackground};background-image:${backgroundLayer};background-size:${backgroundSize};background-position:${backgroundPosition};color:${text};font-family:${font};position:relative;direction:${theme.direction === 'rtl' ? 'rtl' : 'ltr'};color-scheme:${mode};font-size:calc(${bodySize} * ${bodyScale});line-height:${Number(typography.bodyLineHeight ?? 1.5)};letter-spacing:${escapeHtml(typography.letterSpacing || '0px')};text-transform:${textTransform}}${mobileOverride}${responsiveCss}.profile-shell[dir=rtl]{font-family:${arabicFont}}.profile-background-video{position:fixed;inset:0;width:100%;height:100%;object-fit:${theme.background?.fit === 'contain' ? 'contain' : 'cover'};object-position:${backgroundPosition};z-index:-1;opacity:.7;${videoTransform}${theme.background?.blur ? `filter:blur(${Number(theme.background.blur)}px);` : ''}}.profile-shell{max-width:${maxWidth};margin:0 auto;padding:48px 20px;position:relative}.profile-header{text-align:${layout.alignment === 'left' ? 'left' : 'center'}}.profile-avatar{border-radius:${avatarRadius}px;object-fit:cover;margin:0 auto 20px;display:block}.profile-header h1{font-size:calc(2rem * ${headingScale});font-weight:${Number(typography.headingWeight ?? 700)};line-height:${Number(typography.headingLineHeight ?? 1.15)};margin:0 0 4px}.profile-handle,.profile-bio{color:${secondary}}.profile-bio{line-height:1.6;max-width:${maxLineLength}}.profile-social{margin:20px 0;color:${accent};display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.profile-social a{color:inherit}.profile-tabs{display:flex;flex-wrap:wrap;justify-content:center;gap:6px;width:100%;margin:4px 0 20px;padding:4px;background:${panel};border:1px solid ${border};border-radius:${radius}px}.profile-tabs a{color:${secondary};text-decoration:none;padding:8px 12px;border-radius:${radius}px;font-size:${buttonTextSize}}.profile-tabs a[aria-selected=true]{background:${accent};color:${escapeHtml(colors.ctaText || '#ffffff')}}.profile-content ul{list-style:none;padding:0;display:grid;gap:${Number(theme.tokens?.spacing?.blockGap ?? 14)}px}.profile-link{display:block;padding:16px;border:1px solid ${border};border-radius:${radius}px;background:${panel};color:${text};text-decoration:none;font-size:${buttonTextSize}}.profile-link:hover{border-color:${accent}}.profile-content p{color:${secondary};line-height:1.6;max-width:${maxLineLength}}.profile-content figure{margin:18px 0}.profile-content figure img,.profile-content figure video{display:block;width:100%;height:auto;border-radius:${radius}px}.profile-content figcaption{color:${secondary};margin-top:8px;font-size:${captionSize}}.profile-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.profile-gallery.is-carousel{display:flex;overflow:auto}.profile-gallery.is-carousel>*{min-width:82%}.profile-gallery img{display:block;width:100%;aspect-ratio:1.2;object-fit:cover;border-radius:${radius}px}.profile-block-title{font-size:1rem;margin:.6rem 0}.profile-product{overflow:hidden;border:1px solid ${border};border-radius:${radius}px;background:${panel}}.profile-product img{display:block;width:100%;aspect-ratio:1.2;object-fit:cover}.profile-product>div{padding:16px}.profile-product h2{font-size:1rem;margin:0 0 6px}.profile-product p,.profile-form p,.profile-folder p{color:${secondary};line-height:1.5;max-width:${maxLineLength}}.profile-product-link{display:inline-block;margin-top:12px;color:${accent};font-weight:600;text-decoration:none;font-size:${buttonTextSize}}.profile-form{border:1px solid ${border};border-radius:${radius}px;background:${panel};padding:16px}.profile-form h2{font-size:1rem;margin:0}.profile-testimonial{border:1px solid ${border};border-radius:${radius}px;background:${panel};padding:16px}.profile-testimonial blockquote{margin:0 0 12px;line-height:1.6}.profile-testimonial span{color:${accent}}.profile-divider{margin:16px 0}.profile-divider hr{border:0;border-top:1px solid ${border}.profile-divider-spacer{height:24px}.profile-divider-sm{margin-block:8px}.profile-divider-lg{margin-block:24px}details{border-bottom:1px solid ${border};padding:14px 0}summary{cursor:pointer;font-weight:600}footer{text-align:center;margin-top:40px;color:${secondary};font-size:${captionSize}}footer a{color:inherit}</style>`;
}

export function publicProfileSupplementalStyles(): string {
  return '<style>.profile-divider hr{border:0;border-top:1px solid currentColor}.profile-divider-spacer{height:24px}.profile-divider-sm{margin-block:8px}.profile-divider-lg{margin-block:24px}.profile-testimonial span{color:var(--theme-accent, #818cf8)}</style>';
}

export function replaceDocumentMetadata(documentHtml: string, metadata: string, body: string): string {
  const withoutDynamicMetadata = documentHtml
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta name="description"[^>]*>/i, '')
    .replace(/\s*<meta name="robots"[^>]*>/i, '')
    .replace(/\s*<link rel="canonical"[^>]*>/i, '')
    .replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<meta name="twitter:[^"]+"[^>]*>/gi, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '');
  return withoutDynamicMetadata
    .replace('</head>', `${metadata}</head>`)
    .replace(/<div id="root"><\/div>/i, `<div id="root">${body}</div>`);
}
