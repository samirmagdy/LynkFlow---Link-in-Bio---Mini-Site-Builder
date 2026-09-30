import { normalizeTheme, validateThemeAccessibility, validateThemeSchema, validateProfileAccessibility } from './utils/themeEngine';
import { validateBlockPayload, validateUrl } from './utils/blockValidator';
import type { BlockType } from './types';
import { ALL_API_SCOPES } from './types';
import { createThemeDesignPersistence, mergeSparseOverride } from './utils/designSystemPersistence';
import {
  escapeHtml,
  safePublicHref,
  xmlEscape,
  publicProfileUrl,
  renderPublicProfileBody,
  publicProfileStyles,
  publicProfileSupplementalStyles,
  replaceDocumentMetadata
} from './workerPublicRendering';
import type { PublicSnapshot } from './workerPublicRendering';
import { searchPexelsMedia } from './workerPexels';
export { publicProfileStyles, renderPublicProfileBody } from './workerPublicRendering';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  RESEND_API_KEY?: string;
  EMAIL_TEST_TOKEN?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  APP_URL?: string;
  STRIPE_PRICE_PRO_MONTHLY?: string;
  STRIPE_PRICE_PRO_ANNUAL?: string;
  STRIPE_PRICE_AGENCY_MONTHLY?: string;
  STRIPE_PRICE_AGENCY_ANNUAL?: string;
  FORM_IP_HASH_SECRET?: string;
  WEBHOOK_ENCRYPTION_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ZONE_ID?: string;
  PEXELS_API_KEY?: string;
}

const JSON_HEADERS = {
  'content-type': 'application/json;charset=UTF-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'sha256-a8ky0ymeTUfWssXdCQZhiVmnzVP7h5n+nXH2lzGufw4='; connect-src 'self' https://*.supabase.co https://api.stripe.com; frame-src https://checkout.stripe.com https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com; font-src 'self' data: https://fonts.gstatic.com"
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function pexelsMediaResponse(request: Request, env: Env): Promise<Response> {
  return searchPexelsMedia(request, env, json);
}

function deploymentHealth(env: Env): Response {
  const requiredBindings = {
    supabase: ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'],
    email: ['RESEND_API_KEY'],
    stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_PRO_MONTHLY', 'STRIPE_PRICE_PRO_ANNUAL', 'STRIPE_PRICE_AGENCY_MONTHLY', 'STRIPE_PRICE_AGENCY_ANNUAL'],
    webhooks: ['WEBHOOK_ENCRYPTION_KEY'],
    customDomains: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID'],
  } as const;
  const envValues = env as unknown as Record<string, unknown>;
  const checks = {
    supabase: requiredBindings.supabase.every(binding => Boolean(envValues[binding])),
    email: requiredBindings.email.every(binding => Boolean(envValues[binding])),
    stripe: requiredBindings.stripe.every(binding => Boolean(envValues[binding])),
    webhooks: requiredBindings.webhooks.every(binding => Boolean(envValues[binding])),
    customDomains: requiredBindings.customDomains.every(binding => Boolean(envValues[binding])),
  };
  const missing = Object.values(requiredBindings).flat().filter(binding => !envValues[binding]);
  const requiredCore = checks.supabase && checks.email && checks.webhooks;
  const allServices = requiredCore && checks.stripe && checks.customDomains;
  return json({ status: allServices ? 'ready' : requiredCore ? 'degraded' : 'not_ready', checks, missing, checkedAt: new Date().toISOString() }, allServices ? 200 : 503);
}

function secureAssetResponse(response: Response, immutableAsset = false): Response {
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('content-security-policy', JSON_HEADERS['content-security-policy']);
  if (immutableAsset) headers.set('cache-control', 'public, max-age=31536000, immutable');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}


async function assetDocument(env: Env, request: Request): Promise<string> {
  const rootUrl = new URL('/', request.url);
  const response = await env.ASSETS.fetch(new Request(rootUrl.toString(), { method: 'GET', headers: request.headers }));
  return response.text();
}

async function publicProfileResponse(request: Request, env: Env, username: string, customDomain?: string): Promise<Response> {
  const cleanDomain = customDomain?.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
  const origin = cleanDomain
    ? `https://${cleanDomain}`
    : (env.APP_URL && !env.APP_URL.includes('workers.dev') ? env.APP_URL.replace(/\/$/, '') : PUBLIC_SITE_ORIGIN);
  const profileQuery = cleanDomain
    ? `published_profiles?snapshot->customDomain->>domain=eq.${encodeURIComponent(cleanDomain)}&select=username,snapshot,updated_at`
    : `published_profiles?username=eq.${encodeURIComponent(cleanUsername)}&select=username,snapshot,updated_at`;
  const profileResponse = await supabaseRequest(profileQuery, env);
  const rows = await profileResponse.json() as Array<{ username: string; snapshot: PublicSnapshot; updated_at?: string }>;
  const snapshot = rows[0]?.snapshot;
  const resolvedUsername = rows[0]?.username || String(snapshot?.handle || snapshot?.username || cleanUsername);
  const canonicalUrl = cleanDomain ? origin : publicProfileUrl(origin, resolvedUsername);
  const baseDocument = await assetDocument(env, request);
  if (!snapshot || snapshot.seo?.noIndex) {
    const title = snapshot ? `${String(snapshot.seo?.title || snapshot.displayName || resolvedUsername)} | LynkFlow` : 'Profile unavailable | LynkFlow';
    const description = snapshot ? String(snapshot.seo?.description || snapshot.bio || `Explore ${snapshot.displayName || resolvedUsername} on LynkFlow.`) : `The profile ${cleanDomain ? 'on this domain' : `@${cleanUsername}`} does not exist or is not published.`;
    const notFound = !snapshot;
    const metadata = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${snapshot?.seo?.noIndex ? 'noindex, nofollow' : 'noindex, follow'}"><link rel="canonical" href="${escapeHtml(canonicalUrl)}">`;
    const body = snapshot ? renderPublicProfileBody(snapshot, canonicalUrl) : `<main class="profile-shell"><h1>Profile unavailable</h1><p>The profile ${cleanDomain ? 'on this domain' : `@${escapeHtml(cleanUsername)}`} does not exist or is not published.</p><a href="${escapeHtml(origin)}/">Return to LynkFlow</a></main>`;
    return new Response(replaceDocumentMetadata(baseDocument, `${metadata}${publicProfileStyles(snapshot || {})}${publicProfileSupplementalStyles()}`, body), { status: notFound ? 404 : 200, headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=60, s-maxage=300' } });
  }
  const title = String(snapshot.seo?.title || `${snapshot.displayName || resolvedUsername} | LynkFlow`);
  const description = String(snapshot.seo?.description || snapshot.bio || `Explore ${snapshot.displayName || resolvedUsername} on LynkFlow.`).slice(0, 160);
  const image = safePublicHref(snapshot.seo?.ogImage || snapshot.avatarUrl);
  const schema = { '@context': 'https://schema.org', '@type': 'ProfilePage', 'mainEntity': { '@type': 'Person', name: snapshot.displayName || cleanUsername, identifier: cleanUsername, description: snapshot.bio || undefined, image: image || undefined, url: canonicalUrl, sameAs: Array.isArray(snapshot.socialLinks) ? snapshot.socialLinks.filter(link => link.active && safePublicHref(link.url)).map(link => safePublicHref(link.url)) : [] }, url: canonicalUrl, dateModified: snapshot.publishedAt || undefined };
  const metadata = `<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${escapeHtml(canonicalUrl)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${escapeHtml(canonicalUrl)}"><meta property="og:type" content="profile"><meta property="og:site_name" content="LynkFlow">${image ? `<meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:image" content="${escapeHtml(image)}">` : ''}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(title)}"><meta name="twitter:description" content="${escapeHtml(description)}"><script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  const html = replaceDocumentMetadata(baseDocument, `${metadata}${publicProfileStyles(snapshot)}${publicProfileSupplementalStyles()}`, renderPublicProfileBody(snapshot, canonicalUrl));
  return new Response(html, { headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=60, s-maxage=300' } });
}

async function sitemapResponse(_request: Request, env: Env): Promise<Response> {
  const origin = env.APP_URL && !env.APP_URL.includes('workers.dev') ? env.APP_URL.replace(/\/$/, '') : PUBLIC_SITE_ORIGIN;
  const response = await supabaseRequest('published_profiles?select=username,updated_at,snapshot&order=updated_at.desc', env);
  const rows = await response.json() as Array<{ username?: string; updated_at?: string; snapshot?: { seo?: { noIndex?: boolean } } }>;
  const urls = rows.filter(row => row.username && !row.snapshot?.seo?.noIndex).map(row => `<url><loc>${xmlEscape(publicProfileUrl(origin, row.username!))}</loc>${row.updated_at ? `<lastmod>${xmlEscape(row.updated_at)}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('');
  const marketingUrls = Object.keys(SEO_LANDING_PAGES).map(path => `<url><loc>${xmlEscape(`${origin}${path}`)}</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${xmlEscape(`${origin}/`)}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>${marketingUrls}${urls}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml;charset=UTF-8', 'cache-control': 'public, max-age=300, s-maxage=900' } });
}

const SEO_LANDING_PAGES: Record<string, { title: string; description: string; eyebrow: string; heading: string; intro: string; points: Array<{ title: string; body: string }>; related: Array<{ href: string; label: string }> }> = {
  '/pricing': {
    title: 'LynkFlow Pricing for Creators and Agencies',
    description: 'Compare LynkFlow plans for branded link-in-bio pages, themes, analytics, forms, custom domains, teams, APIs, and webhooks.',
    eyebrow: 'Simple pricing',
    heading: 'Choose the tools your audience and workflow need.',
    intro: 'Start with a free page, then add lead capture, advanced themes, analytics, domains, multi-profile workspaces, API access, and webhooks as you grow.',
    points: [
      { title: 'Starter', body: 'Publish an essential branded page with standard blocks and a LynkFlow subdomain.' },
      { title: 'Creator Pro', body: 'Capture leads, connect a custom domain, use advanced themes, and access extended analytics with a 14-day trial.' },
      { title: 'Agency Studio', body: 'Manage client profiles, permissions, theme presets, REST API access, and webhooks from one workspace.' }
    ],
    related: [{ href: '/link-in-bio', label: 'Link-in-bio builder' }, { href: '/link-in-bio-for-agencies', label: 'Agency plans' }, { href: '/contact', label: 'Contact support' }]
  },
  '/link-in-bio': {
    title: 'Link-in-Bio Page Builder for Creators | LynkFlow',
    description: 'Build a branded link-in-bio page for your links, content, products, forms, analytics, and audience.',
    eyebrow: 'Link-in-bio platform',
    heading: 'Turn your audience link into a branded destination.',
    intro: 'LynkFlow helps creators publish more than a list of buttons. Build a responsive mini-site for your content, offers, leads, and community.',
    points: [
      { title: 'Organize every destination', body: 'Combine social links, video, downloads, FAQs, forms, products, and calls to action in one page.' },
      { title: 'Match your visual identity', body: 'Use theme tokens for typography, colors, spacing, surfaces, backgrounds, and responsive layouts.' },
      { title: 'Understand what converts', body: 'Measure page views, visitors, link clicks, QR traffic, and conversion-focused engagement.' }
    ],
    related: [{ href: '/link-in-bio-for-creators', label: 'Link-in-bio for creators' }, { href: '/link-in-bio-analytics', label: 'Link-in-bio analytics' }, { href: '/features/themes', label: 'Explore themes' }]
  },
  '/mini-site-builder': {
    title: 'Mini-Site Builder for Creators, Brands, and Agencies | LynkFlow',
    description: 'Create a responsive mini-site with branded themes, forms, media, digital downloads, analytics, and custom domains.',
    eyebrow: 'Mini-site builder',
    heading: 'Publish a focused mini-site without starting from scratch.',
    intro: 'Create a polished destination for launches, portfolios, services, campaigns, and personal brands using modular blocks and reusable design systems.',
    points: [
      { title: 'Build with modular blocks', body: 'Arrange links, media, forms, downloads, FAQs, pricing, and social proof around a clear visitor journey.' },
      { title: 'Design once, stay consistent', body: 'Shared tokens keep your type, color, contrast, buttons, and surfaces aligned across every block.' },
      { title: 'Publish with confidence', body: 'Keep draft and published states separate, review accessibility, and publish authoritative page snapshots.' }
    ],
    related: [{ href: '/features/themes', label: 'Theme engine' }, { href: '/features/analytics', label: 'Analytics features' }, { href: '/link-in-bio-for-agencies', label: 'For agencies' }]
  },
  '/link-in-bio-for-creators': {
    title: 'Link-in-Bio for Creators, Artists, and Professionals | LynkFlow',
    description: 'Give your audience one branded creator page for social links, videos, products, bookings, downloads, and email capture.',
    eyebrow: 'For creators',
    heading: 'Give every follower a clearer next step.',
    intro: 'LynkFlow is built for creators who need one flexible page for their work, offers, content, bookings, and audience growth.',
    points: [
      { title: 'Show your best work', body: 'Feature reels, portfolios, playlists, case studies, products, and downloadable resources.' },
      { title: 'Capture interest', body: 'Collect qualified inquiries and newsletter opt-ins with consent-aware forms.' },
      { title: 'Own your brand', body: 'Use custom themes and an optional domain so your page feels like your home on the web.' }
    ],
    related: [{ href: '/link-in-bio', label: 'Link-in-bio builder' }, { href: '/custom-domain-link-in-bio', label: 'Custom domain pages' }, { href: '/features/dynamic-qr-codes', label: 'Dynamic QR codes' }]
  },
  '/link-in-bio-for-agencies': {
    title: 'Link-in-Bio Platform for Agencies and Client Workspaces | LynkFlow',
    description: 'Manage branded link-in-bio pages for multiple clients with isolated profiles, permissions, themes, API access, and webhooks.',
    eyebrow: 'For agencies',
    heading: 'Manage every client destination from one workspace.',
    intro: 'Agency Studio gives teams a repeatable way to build, duplicate, review, publish, and operate client mini-sites without mixing tenant data.',
    points: [
      { title: 'Separate client profiles', body: 'Keep profiles, drafts, themes, forms, domains, and analytics isolated by workspace and permissions.' },
      { title: 'Reuse proven systems', body: 'Duplicate structures and export theme presets so every new client starts from a validated foundation.' },
      { title: 'Automate operations', body: 'Use the scoped REST API, signed webhooks, audit logs, and publish workflows for repeatable delivery.' }
    ],
    related: [{ href: '/mini-site-builder', label: 'Mini-site builder' }, { href: '/features/agency-workspaces', label: 'Agency workspace features' }, { href: '/features/custom-domains', label: 'Custom domains' }]
  },
  '/link-in-bio-analytics': {
    title: 'Privacy-First Link-in-Bio Analytics | LynkFlow',
    description: 'Understand link-in-bio performance with privacy-first page views, visitors, clicks, CTR, referrals, and QR analytics.',
    eyebrow: 'Privacy-first analytics',
    heading: 'Know which links move your audience forward.',
    intro: 'Turn page activity into useful decisions without filling your creator page with invasive tracking scripts or bloated dashboards.',
    points: [
      { title: 'See page performance', body: 'Track page views, unique visitors, referrers, device classes, and country distributions.' },
      { title: 'Measure every destination', body: 'Review link-level clicks and CTR so you can improve ordering, copy, and calls to action.' },
      { title: 'Keep data proportional', body: 'Use privacy-first analytics designed to minimize invasive identifiers and unnecessary tracking.' }
    ],
    related: [{ href: '/features/analytics', label: 'Analytics feature details' }, { href: '/link-in-bio', label: 'Build a link-in-bio page' }, { href: '/privacy', label: 'Privacy policy' }]
  },
  '/custom-domain-link-in-bio': {
    title: 'Custom Domain Link-in-Bio Pages with Automated SSL | LynkFlow',
    description: 'Connect a custom domain or subdomain to your branded link-in-bio page with verification diagnostics and automated SSL on eligible plans.',
    eyebrow: 'Custom domains',
    heading: 'Put your link-in-bio page on your own domain.',
    intro: 'Move from a generic profile URL to a branded destination such as links.yourbrand.com with clear DNS diagnostics and managed certificate provisioning.',
    points: [
      { title: 'Use your own address', body: 'Connect a domain or subdomain that matches your name, studio, campaign, or client brand.' },
      { title: 'Diagnose DNS clearly', body: 'Follow CNAME verification checks and receive explicit recovery guidance when configuration is incomplete.' },
      { title: 'Protect the connection', body: 'Eligible plans include automated TLS certificate issuance and renewal support.' }
    ],
    related: [{ href: '/features/custom-domains', label: 'Custom domain features' }, { href: '/link-in-bio-for-agencies', label: 'Agency workspaces' }, { href: '/link-in-bio', label: 'Link-in-bio builder' }]
  },
  '/features/themes': {
    title: 'Link-in-Bio Themes and Visual Design System | LynkFlow',
    description: 'Choose and customize link-in-bio themes with typography, contrast, colors, backgrounds, buttons, surfaces, and responsive layout tokens.',
    eyebrow: 'Theme engine',
    heading: 'Start with a visual system, not a template clone.',
    intro: 'Preview a complete design direction before publishing, then tune the tokens that make your page feel unmistakably yours.',
    points: [
      { title: 'Preview before applying', body: 'Compare theme directions in the builder without saving changes until you choose the right system.' },
      { title: 'Design with tokens', body: 'Control type, color, radius, shadow, spacing, background, and component treatments consistently.' },
      { title: 'Protect readability', body: 'Theme validation checks contrast, focus states, reduced motion, and responsive behavior.' }
    ],
    related: [{ href: '/link-in-bio', label: 'Link-in-bio builder' }, { href: '/mini-site-builder', label: 'Mini-site builder' }, { href: '/signup', label: 'Start building' }]
  },
  '/features/dynamic-qr-codes': {
    title: 'Dynamic QR Codes for Link-in-Bio Pages | LynkFlow',
    description: 'Create branded dynamic QR codes for campaigns, packaging, events, and print materials, then update destinations without reprinting.',
    eyebrow: 'Dynamic QR codes',
    heading: 'Change the destination after you print.',
    intro: 'Connect physical touchpoints to a destination you can update as campaigns, products, and offers change.',
    points: [
      { title: 'Keep printed materials useful', body: 'Update the destination behind a QR code without replacing business cards, packaging, flyers, or signage.' },
      { title: 'Match your brand', body: 'Generate styled vector QR codes with controlled colors and visual treatment.' },
      { title: 'Measure scans', body: 'Use privacy-first analytics to understand QR traffic and campaign engagement.' }
    ],
    related: [{ href: '/link-in-bio-analytics', label: 'Analytics' }, { href: '/link-in-bio', label: 'Link-in-bio builder' }, { href: '/signup', label: 'Create your page' }]
  },
  '/features/analytics': {
    title: 'Link-in-Bio Analytics for Clicks, Visitors, and CTR | LynkFlow',
    description: 'Measure page views, unique visitors, link clicks, referrals, QR scans, and click-through rate with privacy-first analytics.',
    eyebrow: 'Analytics',
    heading: 'Replace guesswork with useful page signals.',
    intro: 'LynkFlow makes it easier to understand what visitors do after they arrive from social, search, email, print, or campaigns.',
    points: [
      { title: 'Measure the page', body: 'See page views, visitors, referrers, device classes, and country distributions.' },
      { title: 'Measure the action', body: 'Compare link-level clicks and CTR to identify the destinations worth promoting.' },
      { title: 'Respect the audience', body: 'Use an analytics approach designed to minimize invasive cookies and fingerprinting.' }
    ],
    related: [{ href: '/link-in-bio-analytics', label: 'Analytics overview' }, { href: '/privacy', label: 'Privacy policy' }, { href: '/signup', label: 'Start measuring' }]
  },
  '/features/custom-domains': {
    title: 'Custom Domains and SSL for Link-in-Bio Pages | LynkFlow',
    description: 'Connect a custom domain or subdomain to your LynkFlow page with DNS diagnostics and automated SSL on eligible plans.',
    eyebrow: 'Domains and SSL',
    heading: 'Make your page part of your brand.',
    intro: 'Use a branded URL that is easier to remember, share, print, and trust across every channel.',
    points: [
      { title: 'Connect a domain or subdomain', body: 'Use your primary domain or a focused address such as links.yourbrand.com.' },
      { title: 'Get guided verification', body: 'CNAME diagnostics and verification checks make DNS setup easier to recover.' },
      { title: 'Use managed HTTPS', body: 'Eligible plans support automated TLS provisioning and certificate renewal.' }
    ],
    related: [{ href: '/custom-domain-link-in-bio', label: 'Custom domain guide' }, { href: '/link-in-bio-for-agencies', label: 'For agencies' }, { href: '/signup', label: 'Connect your brand' }]
  },
  '/features/agency-workspaces': {
    title: 'Multi-Profile Agency Workspaces for Link-in-Bio Pages | LynkFlow',
    description: 'Build and manage multiple client link-in-bio profiles with isolated workspaces, permissions, themes, publishing, API access, and webhooks.',
    eyebrow: 'Agency workspaces',
    heading: 'Scale client pages without losing control.',
    intro: 'Give your team a repeatable system for creating, reviewing, publishing, and maintaining branded client destinations.',
    points: [
      { title: 'Keep tenants isolated', body: 'Separate client profiles, drafts, permissions, domains, and audit trails.' },
      { title: 'Reuse your best work', body: 'Duplicate structures and export theme presets to reduce repetitive production work.' },
      { title: 'Automate safely', body: 'Use scoped API keys, signed webhooks, idempotent mutations, and explicit publish operations.' }
    ],
    related: [{ href: '/link-in-bio-for-agencies', label: 'Agency overview' }, { href: '/features/themes', label: 'Theme systems' }, { href: '/signup', label: 'Start an agency workspace' }]
  },
  '/contact': {
    title: 'Contact LynkFlow Support',
    description: 'Contact LynkFlow for product support, billing questions, custom domains, API guidance, accessibility, and privacy requests.',
    eyebrow: 'Support and trust',
    heading: 'Get help with your LynkFlow page.',
    intro: 'We can help with publishing, themes, forms, domains, billing, APIs, accessibility, and privacy questions.',
    points: [
      { title: 'Product support', body: 'Bring your profile, block, theme, publishing, or analytics question.' },
      { title: 'Technical support', body: 'Ask about custom domains, API permissions, webhooks, Stripe billing, and integrations.' },
      { title: 'Privacy and safety', body: 'Use the privacy policy and Trust & Safety area for data, abuse, and account concerns.' }
    ],
    related: [{ href: '/privacy', label: 'Privacy policy' }, { href: '/terms', label: 'Terms of service' }, { href: '/signup', label: 'Open LynkFlow' }]
  }
};

function marketingSeoPageResponse(path: string, request: Request): Response {
  const page = SEO_LANDING_PAGES[path];
  const origin = new URL(request.url).origin;
  const publicOrigin = PUBLIC_SITE_ORIGIN;
  const canonical = `${publicOrigin}${path}`;
  const escape = escapeHtml;
  const cards = page.points.map(point => `<article><h2>${escape(point.title)}</h2><p>${escape(point.body)}</p></article>`).join('');
  const related = page.related.map(link => `<li><a href="${escape(link.href)}">${escape(link.label)}</a></li>`).join('');
  const schema = { '@context': 'https://schema.org', '@type': 'WebPage', name: page.title, description: page.description, url: canonical, isPartOf: { '@type': 'WebSite', name: 'LynkFlow', url: publicOrigin } };
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}"><meta name="robots" content="index, follow"><link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="website"><meta property="og:image" content="${publicOrigin}/og-default.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(page.title)}"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${publicOrigin}/og-default.png"><script type="application/ld+json">${JSON.stringify(schema)}</script><style> :root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#171717;background:#f8f8fb}body{margin:0}main{max-width:1080px;margin:auto;padding:32px 20px 80px}nav{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:96px}nav a{color:#4f46e5;text-decoration:none;font-weight:700}nav .links{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}header{max-width:760px;margin-bottom:64px}.eyebrow{color:#4f46e5;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{font-size:clamp(42px,7vw,78px);line-height:1.02;letter-spacing:-.05em;margin:18px 0}header p{font-size:20px;line-height:1.6;color:#5b5b66}header .cta{display:inline-block;margin-top:18px;padding:14px 20px;border-radius:12px;background:#111;color:#fff;text-decoration:none;font-weight:800}section{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}article{padding:24px;border:1px solid #dedee7;border-radius:20px;background:#fff;box-shadow:0 12px 32px #2020400d}article h2{font-size:20px;margin-top:0}article p{color:#5b5b66;line-height:1.6}footer{border-top:1px solid #dedee7;margin-top:72px;padding-top:24px;color:#5b5b66}footer ul{display:flex;gap:16px;flex-wrap:wrap;padding:0;list-style:none}footer a{color:#4f46e5}@media(max-width:720px){nav{align-items:flex-start;flex-direction:column;margin-bottom:64px}section{grid-template-columns:1fr}header p{font-size:17px}}</style></head><body><main><nav><a href="${origin}">LynkFlow</a><div class="links"><a href="${origin}/link-in-bio">Link-in-bio</a><a href="${origin}/features/themes">Themes</a><a href="${origin}/pricing">Pricing</a><a href="${origin}/contact">Support</a></div></nav><header><div class="eyebrow">${escape(page.eyebrow)}</div><h1>${escape(page.heading)}</h1><p>${escape(page.intro)}</p><a class="cta" href="${origin}/signup">Start building</a></header><section>${cards}</section><footer><strong>Keep building with LynkFlow</strong><ul>${related}</ul><p><a href="${origin}/privacy">Privacy</a> · <a href="${origin}/terms">Terms</a> · <a href="${origin}/contact">Contact support</a></p></footer></main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=300, s-maxage=1800' } });
}

function robotsResponse(_request: Request, env: Env): Response {
  const origin = env.APP_URL && !env.APP_URL.includes('workers.dev') ? env.APP_URL.replace(/\/$/, '') : PUBLIC_SITE_ORIGIN;
  return new Response(`User-agent: *\nDisallow: /api/\nDisallow: /admin/\nDisallow: /studio\nDisallow: /?view=\nAllow: /@\nSitemap: ${origin}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain;charset=UTF-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' } });
}

function legalResponse(kind: 'privacy' | 'terms', _request: Request): Response {
  const origin = PUBLIC_SITE_ORIGIN;
  const isPrivacy = kind === 'privacy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service';
  const description = isPrivacy ? 'Read the LynkFlow privacy policy and learn how account, profile, analytics, and form data are handled.' : 'Read the LynkFlow terms of service for using link-in-bio pages, forms, domains, billing, and APIs.';
  const body = isPrivacy
    ? '<p>LynkFlow processes account, profile, form, billing, and operational data to provide the service. Public profile data is published only when a creator explicitly publishes it.</p><h2>Analytics</h2><p>LynkFlow is designed around privacy-preserving analytics. We minimize identifiers, limit retention, and provide consent controls for optional third-party integrations.</p><h2>Contact</h2><p>For privacy questions, contact the LynkFlow support team through your account.</p>'
    : '<p>By using LynkFlow, you agree to use the platform lawfully, protect your credentials, and publish content for which you have the necessary rights.</p><h2>Published pages</h2><p>Creators are responsible for their profile content, links, forms, domains, and compliance with applicable law. LynkFlow may restrict content that violates safety or abuse policies.</p><h2>Billing and APIs</h2><p>Paid plans, API keys, webhooks, and custom domains are subject to the limits and permissions shown in the product.</p>';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | LynkFlow</title><meta name="description" content="${description}"><link rel="canonical" href="${origin}/${kind}"></head><body style="font-family:system-ui;max-width:760px;margin:40px auto;padding:0 20px;background:#0a0a0a;color:#f5f5f5;line-height:1.6"><a href="/" style="color:#a5b4fc">← LynkFlow</a><h1>${title}</h1>${body}<p style="color:#a3a3a3">Last updated: September 28, 2026</p></body></html>`, { headers: { 'content-type': 'text/html;charset=UTF-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' } });
}

function isAuthorized(request: Request, env: Env): boolean {
  const token = env.EMAIL_TEST_TOKEN;
  return Boolean(token && request.headers.get('authorization') === `Bearer ${token}`);
}

async function sendTestEmail(request: Request, env: Env): Promise<Response> {
  if (!env.RESEND_API_KEY || !env.EMAIL_TEST_TOKEN) {
    return json({ error: 'Email service is not configured.' }, 503);
  }
  if (!isAuthorized(request, env)) return json({ error: 'Unauthorized.' }, 401);

  let input: { to?: string; subject?: string; html?: string };
  try {
    input = await request.json();
  } catch {
    return json({ error: 'Request body must be valid JSON.' }, 400);
  }

  const to = input.to || 'samirmagdy80@gmail.com';
  const subject = input.subject || 'LynkFlow email delivery test';
  const html = input.html || '<p>Congrats on sending your <strong>first email</strong>!</p>';
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: 'onboarding@resend.dev', to, subject, html }),
  });

  const result = await resendResponse.json() as Record<string, unknown>;
  return json(result, resendResponse.status);
}

async function hashValue(value: string, secret: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${value}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value: string): Promise<string> {
  return hashValue(value, 'lynkflow-api-key-v1');
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

async function webhookCryptoKey(env: Env, usage: KeyUsage[]): Promise<CryptoKey> {
  if (!env.WEBHOOK_ENCRYPTION_KEY) throw new Error('Webhook encryption is not configured.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(env.WEBHOOK_ENCRYPTION_KEY));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, usage);
}

async function encryptWebhookSecret(secret: string, env: Env): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await webhookCryptoKey(env, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as unknown as BufferSource }, key, new TextEncoder().encode(secret));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

async function decryptWebhookSecret(ciphertext: string, env: Env): Promise<string> {
  const [ivValue, encryptedValue] = ciphertext.split('.', 2);
  if (!ivValue || !encryptedValue) throw new Error('Stored webhook secret is invalid.');
  const key = await webhookCryptoKey(env, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(ivValue) as unknown as BufferSource }, key, fromBase64(encryptedValue) as unknown as BufferSource);
  return new TextDecoder().decode(plain);
}

function webhookSecret(bytes = 32): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return `whsec_${toBase64(values).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

const DOMAIN_CNAME_TARGET = 'cname.lynkflow.io';
const DOMAIN_A_RECORD = '76.76.21.21';
const PUBLIC_SITE_ORIGIN = 'https://lynkflow.me';

function cleanHostname(value: string): string | null {
  const cleaned = value.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return /^[a-z0-9][a-z0-9-_.]*\.[a-z]{2,}$/.test(cleaned) ? cleaned : null;
}

async function resolveCname(hostname: string): Promise<string[]> {
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=CNAME`, { headers: { accept: 'application/dns-json' } });
  if (!response.ok) return [];
  const body = await response.json() as { Answer?: Array<{ type?: number; data?: string }> };
  return (body.Answer || []).filter(answer => answer.type === 5 && answer.data).map(answer => String(answer.data).replace(/\.$/, '').toLowerCase());
}

async function provisionCloudflareHostname(domain: string, env: Env): Promise<'active' | 'provisioning'> {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ZONE_ID) return 'provisioning';
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(env.CLOUDFLARE_ZONE_ID)}/custom_hostnames`, {
    method: 'POST', headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ hostname: domain, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } })
  });
  if (response.ok) return 'active';
  const body = await response.text();
  if (response.status === 409 || body.includes('already exists')) return 'provisioning';
  throw new Error('Cloudflare custom hostname provisioning failed.');
}

function profileDomainConfig(domain: string, status: 'verified' | 'failed' | 'conflict', sslStatus: 'active' | 'provisioning' | 'failed', failureReason?: string): Record<string, unknown> {
  return { domain, status, sslStatus, cnameTarget: DOMAIN_CNAME_TARGET, expectedIp: DOMAIN_A_RECORD, lastCheckedAt: new Date().toISOString(), failureReason };
}

async function verifyCustomDomain(request: Request, env: Env): Promise<Response> {
  const access = await requirePaidWorkspace(request, env);
  if (access instanceof Response) return access;
  let input: { profileId?: string; domain?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const domain = input.domain ? cleanHostname(input.domain) : null;
  if (!domain || !input.profileId) return apiError('VALIDATION_ERROR', 'A valid domain and profile ID are required.', 422);
  if (!canManageProfile(access.user, input.profileId)) return apiError('FORBIDDEN', 'You do not have permission to manage this profile.', 403);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(input.profileId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}&select=id,data`, env);
  const profiles = await profileResponse.json() as Array<{ id: string; data: Record<string, unknown> }>;
  if (!profiles[0]) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const existingResponse = await supabaseRequest(`custom_domains?domain=eq.${encodeURIComponent(domain)}&select=domain,workspace_id,profile_id`, env);
  const existing = await existingResponse.json() as Array<{ domain: string; workspace_id: string; profile_id: string }>;
  if (existing[0] && (existing[0].workspace_id !== access.user.id || existing[0].profile_id !== input.profileId)) return apiError('CONFLICT', 'This hostname is already connected to another profile.', 409);
  const cnames = await resolveCname(domain);
  if (!cnames.includes(DOMAIN_CNAME_TARGET)) {
    const config = profileDomainConfig(domain, 'failed', 'failed', `DNS CNAME not found. Point ${domain} to ${DOMAIN_CNAME_TARGET} and try again.`);
    await supabaseRequest('custom_domains?on_conflict=domain', env, { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ domain, workspace_id: access.user.id, profile_id: input.profileId, status: 'failed', ssl_status: 'failed', cname_target: DOMAIN_CNAME_TARGET, expected_ip: DOMAIN_A_RECORD, failure_reason: config.failureReason, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
    return json({ success: false, config, error: config.failureReason }, 422);
  }
  const sslStatus = await provisionCloudflareHostname(domain, env);
  const config = profileDomainConfig(domain, 'verified', sslStatus, sslStatus === 'provisioning' ? 'DNS verified. SSL is provisioning.' : undefined);
  const nextData = { ...profiles[0].data, customDomain: config };
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(input.profileId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: nextData, updated_at: new Date().toISOString() }) });
  await supabaseRequest('custom_domains?on_conflict=domain', env, { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ domain, workspace_id: access.user.id, profile_id: input.profileId, status: 'verified', ssl_status: sslStatus, cname_target: DOMAIN_CNAME_TARGET, expected_ip: DOMAIN_A_RECORD, failure_reason: config.failureReason || null, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
  await dispatchWebhookEvent(env, access.user.id, 'domain.verified', { profileId: input.profileId, domain, sslStatus });
  return json({ success: true, config });
}

async function removeCustomDomain(request: Request, env: Env): Promise<Response> {
  const access = await requirePaidWorkspace(request, env);
  if (access instanceof Response) return access;
  let input: { profileId?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  if (!input.profileId) return apiError('VALIDATION_ERROR', 'Profile ID is required.', 422);
  if (!canManageProfile(access.user, input.profileId)) return apiError('FORBIDDEN', 'You do not have permission to manage this profile.', 403);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(input.profileId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}&select=id,data`, env);
  const profiles = await profileResponse.json() as Array<{ id: string; data: Record<string, unknown> }>;
  if (!profiles[0]) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const domain = (profiles[0].data.customDomain as Record<string, unknown> | undefined)?.domain;
  const nextData = { ...profiles[0].data, customDomain: null };
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(input.profileId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: nextData, updated_at: new Date().toISOString() }) });
  if (domain) await supabaseRequest(`custom_domains?domain=eq.${encodeURIComponent(String(domain))}&workspace_id=eq.${encodeURIComponent(access.user.id)}`, env, { method: 'DELETE' });
  return json({ success: true });
}

async function isActiveCustomDomain(hostname: string, env: Env): Promise<boolean> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !hostname || hostname.endsWith('.workers.dev') || hostname === 'localhost') return false;
  const response = await supabaseRequest(`custom_domains?domain=eq.${encodeURIComponent(hostname.toLowerCase())}&status=eq.verified&ssl_status=eq.active&select=domain`, env);
  const rows = await response.json() as unknown[];
  return rows.length > 0;
}

async function consumePublicRateLimit(env: Env, keyId: string, maxRequests: number): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const response = await supabaseRequest('rpc/consume_public_rate_limit', env, {
    method: 'POST',
    body: JSON.stringify({ p_key_id: keyId, p_max_requests: maxRequests, p_window_ms: 60000 }),
  });
  const rows = await response.json() as Array<{ allowed: boolean; retry_after_seconds: number }>;
  const result = rows[0];
  if (!result) throw new Error('Public rate limiter returned no decision.');
  return { allowed: Boolean(result.allowed), retryAfterSeconds: Number(result.retry_after_seconds || 60) };
}

function rateLimitedResponse(message: string, retryAfterSeconds: number): Response {
  const response = json({ error: message, rateLimited: true }, 429);
  response.headers.set('retry-after', String(Math.max(1, retryAfterSeconds)));
  return response;
}

async function submitMarketingNewsletter(request: Request, env: Env): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError('SERVICE_UNAVAILABLE', 'Newsletter service is not configured.', 503);
  }

  let input: { email?: string; consent?: boolean; source?: string };
  try {
    input = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }

  const email = String(input.email || '').trim().toLowerCase();
  const source = String(input.source || 'landing_page').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || 'landing_page';
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return apiError('VALIDATION_ERROR', 'A valid email address is required.', 422);
  }
  if (input.consent !== true) {
    return apiError('CONSENT_REQUIRED', 'Explicit newsletter consent is required.', 422);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateKey = await hashValue('marketing-newsletter:' + ip, env.FORM_IP_HASH_SECRET || env.SUPABASE_URL);
  let rate: { allowed: boolean; retryAfterSeconds: number };
  try {
    rate = await consumePublicRateLimit(env, 'marketing-newsletter:' + rateKey, 5);
  } catch (error) {
    console.error('Marketing newsletter rate limiter failed', error);
    return apiError('SERVICE_UNAVAILABLE', 'Newsletter protection is temporarily unavailable. Please retry shortly.', 503);
  }
  if (!rate.allowed) {
    const response = apiError('RATE_LIMITED', 'Too many newsletter attempts. Please try again later.', 429);
    response.headers.set('retry-after', String(Math.max(1, rate.retryAfterSeconds)));
    return response;
  }

  const subscribedAt = new Date().toISOString();
  try {
    await supabaseRequest('marketing_subscribers?on_conflict=email', env, {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: 'mkt-sub-' + crypto.randomUUID(),
        email,
        source,
        consent_given: true,
        subscribed_at: subscribedAt,
        unsubscribed_at: null,
        updated_at: subscribedAt
      })
    });
  } catch (error) {
    console.error('Marketing newsletter persistence failed', error);
    return apiError('PERSISTENCE_ERROR', 'We could not save your subscription. Please try again.', 503);
  }

  return json({ data: { subscribed: true } });
}

async function unsubscribeMarketingNewsletter(request: Request, env: Env): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError('SERVICE_UNAVAILABLE', 'Newsletter service is not configured.', 503);
  }
  let input: { email?: string };
  try {
    input = await request.json();
  } catch {
    return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }
  const email = String(input.email || '').trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return apiError('VALIDATION_ERROR', 'A valid email address is required.', 422);
  }
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateKey = await hashValue('marketing-unsubscribe:' + ip, env.FORM_IP_HASH_SECRET || env.SUPABASE_URL);
  const rate = await consumePublicRateLimit(env, 'marketing-unsubscribe:' + rateKey, 5);
  if (!rate.allowed) {
    const response = apiError('RATE_LIMITED', 'Too many unsubscribe attempts. Please try again later.', 429);
    response.headers.set('retry-after', String(Math.max(1, rate.retryAfterSeconds)));
    return response;
  }
  const now = new Date().toISOString();
  try {
    await supabaseRequest(`marketing_subscribers?email=eq.${encodeURIComponent(email)}`, env, {
      method: 'PATCH',
      headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ unsubscribed_at: now, updated_at: now })
    });
  } catch (error) {
    console.error('Marketing newsletter unsubscribe failed', error);
    return apiError('PERSISTENCE_ERROR', 'We could not process your unsubscribe request. Please try again.', 503);
  }
  return json({ data: { unsubscribed: true } });
}


function extractFormContact(formPayload: Record<string, unknown>, data: Record<string, string>): { email?: string; name?: string } {
  const fields = Array.isArray(formPayload.fields) ? formPayload.fields as Array<Record<string, unknown>> : [];
  let email: string | undefined;
  let name: string | undefined;
  for (const field of fields) {
    const value = String(data[String(field.id)] || '').trim();
    if (!value) continue;
    if (field.type === 'email' && !email) email = value.toLowerCase();
    if ((String(field.label || '').toLowerCase().includes('name') || String(field.id || '').toLowerCase().includes('name')) && !name) name = value;
  }
  return { email, name };
}

async function submitPublicForm(request: Request, env: Env): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Form service is not configured.' }, 503);
  let input: {
    profileId?: string; blockId?: string; formTitle?: string;
    data?: Record<string, string>;
    consentGiven?: boolean; honeypotTrap?: string; idempotencyKey?: string;
  };
  try { input = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
  if (JSON.stringify(input.data || {}).length > 64 * 1024) return json({ error: 'Payload size exceeds safe limits.' }, 413);
  if (!input.profileId || !input.blockId || !input.data) return json({ error: 'Profile, block, and data are required.' }, 400);
  if (input.honeypotTrap?.trim()) return json({ error: 'Spam filter triggered.' }, 400);
  const idempotencyKey = input.idempotencyKey || request.headers.get('idempotency-key')?.trim();
  if (idempotencyKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) return json({ error: 'Idempotency-Key must be 8-128 safe characters.' }, 422);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateKey = await hashValue(`${ip}:${input.profileId}`, env.FORM_IP_HASH_SECRET || env.SUPABASE_URL);
  let rate: { allowed: boolean; retryAfterSeconds: number };
  try { rate = await consumePublicRateLimit(env, `form:${rateKey}`, 5); }
  catch (error) { console.error('Public form rate limiter failed', error); return json({ error: 'Form protection is temporarily unavailable. Please retry shortly.' }, 503); }
  if (!rate.allowed) return rateLimitedResponse('Too many submissions. Please wait 1 minute.', rate.retryAfterSeconds);

  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(input.profileId)}&select=id,workspace_id,data`, env);
  const profiles = await profileResponse.json() as Array<{ id: string; workspace_id: string; data: Record<string, unknown> }>;
  const profile = profiles[0];
  if (!profile) return json({ error: 'Published profile not found.' }, 404);
  const storedProfile = profile.data;
  const publishedSnapshot = storedProfile.publishedSnapshot as Record<string, unknown> | undefined;
  const publishedTabs = Array.isArray(publishedSnapshot?.tabs) ? publishedSnapshot.tabs as Array<Record<string, unknown>> : [];
  const publishedBlock = publishedTabs.flatMap(tab => Array.isArray(tab.blocks) ? tab.blocks as Array<Record<string, unknown>> : []).find(block => block.id === input.blockId);
  if (!publishedBlock || publishedBlock.type !== 'form') return json({ error: 'Form is not published.' }, 404);

  const payload = publishedBlock.payload as Record<string, unknown> | undefined;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return json({ error: 'Published form schema is invalid.' }, 422);
  const fields = Array.isArray(payload.fields) ? payload.fields as Array<Record<string, unknown>> : [];
  const fieldErrors: Record<string, string> = {};
  for (const field of fields) {
    const value = String(input.data[String(field.id)] || '').trim();
    if (field.required && !value) fieldErrors[String(field.id)] = `${String(field.label || 'Field')} is required.`;
    if (value && field.type === 'email' && !/^\S+@\S+\.\S{2,}$/.test(value)) fieldErrors[String(field.id)] = 'Please provide a valid email address.';
    if (value && field.type === 'select' && Array.isArray(field.options) && !(field.options as unknown[]).includes(value)) fieldErrors[String(field.id)] = 'Selected value is not allowed.';
    if (field.type === 'checkbox' && field.required && !['true', 'yes'].includes(value)) fieldErrors[String(field.id)] = `${String(field.label || 'Field')} must be checked.`;
  }
  if (payload.requireConsent && !input.consentGiven) fieldErrors._consent = 'Consent is required.';
  if (Object.keys(fieldErrors).length) return json({ error: 'Please correct the form fields.', fieldErrors }, 422);

  const { email, name } = extractFormContact(payload, input.data);
  const submissionId = idempotencyKey ? `sub-${await sha256(`${profile.id}:${input.blockId}:${idempotencyKey}`)}` : `sub-${crypto.randomUUID()}`;
  if (idempotencyKey) {
    const existingResponse = await supabaseRequest(`form_submissions?id=eq.${encodeURIComponent(submissionId)}&profile_id=eq.${encodeURIComponent(input.profileId)}&select=id`, env);
    const existingRows = await existingResponse.json() as Array<{ id: string }>;
    if (existingRows.length) return json({ success: true, submissionId });
  }
  const submittedAt = new Date().toISOString();
  const submissionResponse = await supabaseRequest('form_submissions?on_conflict=id', env, {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({
      id: submissionId, workspace_id: profile.workspace_id, profile_id: input.profileId,
      block_id: input.blockId, form_title: input.formTitle || String(publishedBlock.title || 'Form'),
      form_type: payload.formType || 'newsletter', data: input.data, responder_email: email,
      responder_name: name, submitted_at: submittedAt, consent_given: Boolean(input.consentGiven),
      consent_text: payload.consentText, ip_hash: rateKey, status: 'verified', subscriber_created: false
    })
  });
  const insertedSubmissions = await submissionResponse.json() as Array<{ id: string }>;
  // The deterministic id is the database-level idempotency claim. If another
  // request won the race, do not repeat subscriber or webhook side effects.
  if (idempotencyKey && !insertedSubmissions.length) return json({ success: true, submissionId });
  if (email && (payload.subscriberMode === true || payload.formType === 'newsletter')) {
    await supabaseRequest('subscribers?on_conflict=workspace_id,profile_id,email', env, {
      method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: `subr-${crypto.randomUUID()}`, workspace_id: profile.workspace_id,
        profile_id: input.profileId, email, name, status: 'active', source_block_id: input.blockId,
        source_form_title: input.formTitle || String(publishedBlock.title || 'Form'),
        subscribed_at: submittedAt, consent_given: Boolean(input.consentGiven), consent_text: payload.consentText,
        last_engagement_at: submittedAt
      })
    });
  }
  await dispatchWebhookEvent(env, profile.workspace_id, 'form.submitted', {
    submissionId, profileId: input.profileId, blockId: input.blockId, formType: payload.formType || 'newsletter', submittedAt
  });
  return json({ success: true, submissionId });
}

async function submitPublicAbuseReport(request: Request, env: Env): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Report service is not configured.' }, 503);
  let input: { profileUsername?: string; reason?: string; description?: string; reporterEmail?: string };
  try { input = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
  if (!input.profileUsername || !input.description || !['spam', 'phishing', 'copyright', 'harmful'].includes(input.reason || '')) {
    return json({ error: 'Profile, reason, and description are required.' }, 400);
  }
  if (input.description.length > 4000 || (input.reporterEmail && input.reporterEmail.length > 320)) return json({ error: 'Report fields exceed safe limits.' }, 413);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateKey = await hashValue(`report:${ip}`, env.FORM_IP_HASH_SECRET || env.SUPABASE_URL);
  let rate: { allowed: boolean; retryAfterSeconds: number };
  try { rate = await consumePublicRateLimit(env, `report:${rateKey}`, 5); }
  catch (error) { console.error('Public report rate limiter failed', error); return json({ error: 'Report protection is temporarily unavailable. Please retry shortly.' }, 503); }
  if (!rate.allowed) return rateLimitedResponse('Too many reports. Please try again later.', rate.retryAfterSeconds);
  await supabaseRequest('abuse_reports', env, {
    method: 'POST', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      id: `rep-${crypto.randomUUID()}`, workspace_id: null,
      profile_username: input.profileUsername.trim().toLowerCase(), reason: input.reason,
      description: input.description.trim(), reporter_email: input.reporterEmail?.trim() || null,
      occurred_at: new Date().toISOString(), status: 'pending'
    })
  });
  return json({ success: true });
}

type ApiKeyAuth = { keyId: string; workspaceId: string; scopes: string[]; allowedProfileIds: string[] | null };

function randomSecret(bytes = 32): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return btoa(String.fromCharCode(...values)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function apiError(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

function internalApiError(context: string, error: unknown, message: string, status = 500): Response {
  console.error(context, error);
  return apiError('INTERNAL_ERROR', message, status);
}

async function authenticateApiKey(request: Request, env: Env, requiredScope: string): Promise<ApiKeyAuth | Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return apiError('SERVICE_UNAVAILABLE', 'API service is not configured.', 503);
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer lf_live_')) return apiError('UNAUTHORIZED', 'A valid LynkFlow API key is required.', 401);
  const secretHash = await sha256(authorization.slice('Bearer '.length));
  const response = await supabaseRequest(`api_keys?secret_hash=eq.${encodeURIComponent(secretHash)}&status=eq.active&select=id,workspace_id,scopes,allowed_profile_ids,expires_at`, env);
  const rows = await response.json() as Array<{ id: string; workspace_id: string; scopes: string[]; allowed_profile_ids: string[] | null; expires_at?: string }>;
  const key = rows[0];
  if (!key || (key.expires_at && new Date(key.expires_at).getTime() <= Date.now())) return apiError('UNAUTHORIZED', 'API key is invalid or expired.', 401);
  if (!key.scopes.includes(requiredScope)) return apiError('FORBIDDEN', `API key lacks scope ${requiredScope}.`, 403);
  let rate: { limited: boolean; retryAfterSeconds: number };
  try { rate = await consumeApiRateLimit(env, key.id, key.workspace_id, 300); }
  catch (error) {
    console.error('API rate limiter failed', error);
    return apiError('SERVICE_UNAVAILABLE', 'API protection is temporarily unavailable. Please retry shortly.', 503);
  }
  if (rate.limited) {
    const response = apiError('RATE_LIMITED', 'Rate limit exceeded. Retry after the indicated delay.', 429);
    response.headers.set('retry-after', String(rate.retryAfterSeconds));
    response.headers.set('x-ratelimit-limit', '300');
    response.headers.set('x-ratelimit-remaining', '0');
    return response;
  }
  await supabaseRequest(`api_keys?id=eq.${encodeURIComponent(key.id)}`, env, {
    method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ last_used_at: new Date().toISOString() })
  });
  return { keyId: key.id, workspaceId: key.workspace_id, scopes: key.scopes, allowedProfileIds: key.allowed_profile_ids };
}

async function consumeApiRateLimit(env: Env, keyId: string, workspaceId: string, limit: number): Promise<{ limited: boolean; retryAfterSeconds: number }> {
  const response = await supabaseRequest('rpc/consume_api_rate_limit', env, {
    method: 'POST',
    body: JSON.stringify({ p_key_id: keyId, p_workspace_id: workspaceId, p_max_requests: limit, p_window_ms: 60000 }),
  });
  const rows = await response.json() as Array<{ allowed: boolean; retry_after_seconds: number }>;
  const result = rows[0];
  if (!result) throw new Error('API rate limiter returned no decision.');
  return { limited: !result.allowed, retryAfterSeconds: Number(result.retry_after_seconds || 0) };
}

async function idempotentReplay(env: Env, auth: ApiKeyAuth, request: Request, requestHash: string): Promise<Response | null> {
  const key = request.headers.get('idempotency-key')?.trim();
  if (!key) return null;
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) return apiError('VALIDATION_ERROR', 'Idempotency-Key must be 8-128 safe characters.', 422);
  const response = await supabaseRequest(`api_idempotency_keys?key_id=eq.${encodeURIComponent(auth.keyId)}&idempotency_key=eq.${encodeURIComponent(key)}&select=request_hash,response_status,response_body`, env);
  const rows = await response.json() as Array<{ request_hash: string; response_status: number; response_body: Record<string, unknown> }>;
  if (!rows[0]) return null;
  if (rows[0].request_hash !== requestHash) return apiError('CONFLICT', 'This Idempotency-Key was already used for a different request.', 409);
  return json(rows[0].response_body, rows[0].response_status);
}

async function saveIdempotentResponse(env: Env, auth: ApiKeyAuth, request: Request, requestHash: string, status: number, responseBody: Record<string, unknown>): Promise<void> {
  const key = request.headers.get('idempotency-key')?.trim();
  if (!key) return;
  await supabaseRequest('api_idempotency_keys', env, { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({
    workspace_id: auth.workspaceId, key_id: auth.keyId, idempotency_key: key, request_hash: requestHash,
    response_status: status, response_body: responseBody, expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  }) });
}

async function handleApiProfileSubresource(request: Request, env: Env, profileId: string, resource: string, blockId?: string): Promise<Response> {
  const readScope = resource === 'blocks' ? 'blocks:read' : 'themes:read';
  const writeScope = resource === 'blocks' ? 'blocks:write' : 'themes:write';
  const auth = await authenticateApiKey(request, env, request.method === 'GET' ? readScope : writeScope);
  if (auth instanceof Response) return auth;
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(auth.workspaceId)}&select=id,username,data,active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id`, env);
  const rows = await profileResponse.json() as Array<{ id: string; username: string; data: Record<string, unknown> } & DesignSystemColumns>;
  const profile = rows[0];
  if (!profile || (auth.allowedProfileIds && !auth.allowedProfileIds.includes(profile.id))) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const profileData = await hydrateProfileDesignSystem(env, auth.workspaceId, profile.id, profile.data, profile);

  if (resource === 'themes') {
    if (request.method === 'GET') return json({ data: profileData.standardTheme || null, requestId: crypto.randomUUID() });
    let input: { data?: Record<string, unknown> };
    try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
    if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return apiError('VALIDATION_ERROR', 'data must be an object.', 422);
    const requestHash = await sha256(JSON.stringify(input.data));
    const replay = await idempotentReplay(env, auth, request, requestHash);
    if (replay) return replay;
    const currentTheme = (profileData.standardTheme || normalizeTheme(profileData.theme || {})) as unknown as Record<string, unknown>;
    const candidateTheme = mergeThemePatch(currentTheme, input.data);
    const schemaResult = validateThemeSchema(candidateTheme);
    if (!schemaResult.isValid) return apiError('VALIDATION_ERROR', schemaResult.errors[0]?.message || 'Theme schema validation failed.', 422);
    const nextTheme = normalizeTheme(candidateTheme);
    const nextData = { ...profileData, theme: nextTheme, standardTheme: nextTheme, updatedAt: new Date().toISOString() };
    await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(auth.workspaceId)}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: withoutDraftDesignTheme(nextData), updated_at: new Date().toISOString() }) });
    await persistDesignSystem(env, auth.workspaceId, profileId, nextTheme as unknown as Record<string, unknown>, nextData);
    const result = { data: nextTheme, requestId: crypto.randomUUID() };
    await saveIdempotentResponse(env, auth, request, requestHash, 200, result);
    return json(result);
  }

  const tabs = Array.isArray(profile.data.tabs) ? profile.data.tabs as Array<Record<string, unknown>> : [];
  if (request.method === 'GET') {
    const blocks: Array<Record<string, unknown>> = tabs.flatMap(tab => Array.isArray(tab.blocks) ? (tab.blocks as Array<Record<string, unknown>>).map(block => ({ ...block, tabId: tab.id })) : []);
    return json({ data: blockId ? blocks.filter(block => block.id === blockId) : blocks, requestId: crypto.randomUUID() });
  }
  if (!blockId) return apiError('VALIDATION_ERROR', 'A block ID is required for mutations.', 422);
  let input: { data?: Record<string, unknown> };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return apiError('VALIDATION_ERROR', 'data must be an object.', 422);
  const requestHash = await sha256(JSON.stringify(input.data));
  const replay = await idempotentReplay(env, auth, request, requestHash);
  if (replay) return replay;
  let found = false;
  const existingBlock = tabs.flatMap(tab => Array.isArray(tab.blocks) ? tab.blocks as Array<Record<string, unknown>> : []).find(block => block.id === blockId);
  if (!existingBlock) return apiError('NOT_FOUND', 'Block not found.', 404);
  const mutableBlockFields = new Set(['title', 'payload', 'isHidden', 'schedule', 'conversionRole', 'animation', 'animationConfig', 'style']);
  if (Object.keys(input.data).some(key => !mutableBlockFields.has(key))) return apiError('VALIDATION_ERROR', 'Block identity and engagement fields cannot be changed.', 422);
  const candidateBlock = { ...existingBlock, ...input.data };
  const blockValidation = validateBlockPayload(String(candidateBlock.type) as BlockType, candidateBlock.payload);
  if (!blockValidation.isValid) return apiError('VALIDATION_ERROR', blockValidation.errors[0] || 'Block payload is invalid.', 422);
  const nextTabs = tabs.map(tab => ({ ...tab, blocks: Array.isArray(tab.blocks) ? (tab.blocks as Array<Record<string, unknown>>).map(block => {
    if (block.id !== blockId) return block;
    found = true;
    return candidateBlock;
  }) : tab.blocks }));
  if (!found) return apiError('NOT_FOUND', 'Block not found.', 404);
  const nextData = { ...profile.data, tabs: nextTabs };
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(auth.workspaceId)}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: nextData, updated_at: new Date().toISOString() }) });
  const updated = nextTabs.flatMap(tab => Array.isArray(tab.blocks) ? tab.blocks as Array<Record<string, unknown>> : []).find(block => block.id === blockId);
  const result = { data: updated, requestId: crypto.randomUUID() };
  await saveIdempotentResponse(env, auth, request, requestHash, 200, result);
  return json(result);
}

async function publishApiProfile(request: Request, env: Env, profileId: string): Promise<Response> {
  const auth = await authenticateApiKey(request, env, 'publish:write');
  if (auth instanceof Response) return auth;
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(auth.workspaceId)}&select=id,username,data,active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id`, env);
  const rows = await profileResponse.json() as Array<{ id: string; username: string; data: Record<string, unknown> } & DesignSystemColumns>;
  const profile = rows[0];
  if (!profile || (auth.allowedProfileIds && !auth.allowedProfileIds.includes(profile.id))) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const profileData = await hydrateProfileDesignSystem(env, auth.workspaceId, profile.id, profile.data, profile);
  const validationError = validatePublishData(profileData);
  if (validationError) return apiError('VALIDATION_ERROR', validationError, 422);
  const requestHash = await sha256(`${profileId}:publish`);
  const replay = await idempotentReplay(env, auth, request, requestHash);
  if (replay) return replay;
  const version = Number(profileData.publishedVersion || 0) + 1;
  const publishedAt = new Date().toISOString();
  const snapshot = createPublicSnapshot(profileData, profile.id, version, publishedAt, `api-key:${auth.keyId}`);
  const themeSnapshot = createThemeSnapshot(snapshot, profileId, version, publishedAt, `api-key:${auth.keyId}`);
  const nextData = {
    ...profileData,
    status: 'published',
    publishedVersion: version,
    publishedAt,
    publishedSnapshot: snapshot,
    snapshotHistory: [snapshot, ...(Array.isArray(profileData.snapshotHistory) ? profileData.snapshotHistory : [])].slice(0, 50),
    themeSnapshots: [themeSnapshot, ...(Array.isArray(profileData.themeSnapshots) ? profileData.themeSnapshots : []).slice(0, 49)],
  };
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(auth.workspaceId)}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: withoutDraftDesignTheme(nextData), updated_at: publishedAt }) });
  await supabaseRequest(`published_profiles?on_conflict=profile_id`, env, { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ profile_id: profileId, workspace_id: auth.workspaceId, username: profile.username, snapshot, published_version: version, published_at: publishedAt, updated_at: publishedAt }) });
  await dispatchWebhookEvent(env, auth.workspaceId, 'profile.published', { profileId, username: profile.username, publishedVersion: version, publishedAt });
  const result = { data: { profileId, status: 'published', publishedVersion: version, publishedAt }, requestId: crypto.randomUUID() };
  await saveIdempotentResponse(env, auth, request, requestHash, 200, result);
  return json(result);
}

function validatePublishData(data: Record<string, unknown>): string | null {
  const username = typeof data.username === 'string' ? data.username.trim() : '';
  if (!/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/i.test(username)) return 'Choose a valid profile handle before publishing.';
  if (typeof data.displayName !== 'string' || !data.displayName.trim()) return 'A display name is required before publishing.';
  const tabs = Array.isArray(data.tabs) ? data.tabs as Array<Record<string, unknown>> : [];
  if (!tabs.length) return 'Add at least one tab before publishing.';
  for (const tab of tabs) {
    if (typeof tab.title !== 'string' || !tab.title.trim()) return 'Every tab must have a title.';
    if (!Array.isArray(tab.blocks)) return 'Every tab must contain a valid block list.';
    for (const block of tab.blocks as Array<Record<string, unknown>>) {
      const payload = block.payload && typeof block.payload === 'object' ? block.payload as Record<string, unknown> : {};
      const blockValidation = validateBlockPayload(String(block.type || '') as never, payload);
      if (!blockValidation.isValid) return blockValidation.errors[0] || `Block ${String(block.title || 'untitled')} is invalid.`;
    }
  }
  const rawTheme = data.standardTheme || normalizeTheme(data.theme || {});
  const schemaResult = validateThemeSchema(rawTheme);
  if (!schemaResult.isValid) return schemaResult.errors[0]?.message || 'Theme schema validation failed.';
  const theme = normalizeTheme(rawTheme);
  const accessibility = validateThemeAccessibility(theme);
  if (!accessibility.canPublish) return accessibility.errors[0]?.message || 'Theme accessibility validation failed.';
  const contentAccessibility = validateProfileAccessibility(data, theme);
  if (!contentAccessibility.canPublish) return contentAccessibility.errors[0]?.message || 'Profile accessibility validation failed.';
  return null;
}

function validateDraftData(data: Record<string, unknown>): string | null {
  const rawTheme = data.standardTheme || normalizeTheme(data.theme || {});
  const schemaResult = validateThemeSchema(rawTheme);
  if (!schemaResult.isValid) return schemaResult.errors[0]?.message || 'Theme schema validation failed.';

  const checkUrl = (value: unknown, label: string): string | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    return validateUrl(value).isValid ? null : `${label} contains an unsafe or invalid URL.`;
  };
  const tabs = Array.isArray(data.tabs) ? data.tabs as Array<Record<string, unknown>> : [];
  for (const tab of tabs) {
    const blocks = Array.isArray(tab.blocks) ? tab.blocks as Array<Record<string, unknown>> : [];
    for (const block of blocks) {
      const payload = block.payload && typeof block.payload === 'object' ? block.payload as Record<string, unknown> : {};
      const directUrls: Array<[unknown, string]> = [
        [payload.url, 'Block URL'], [payload.href, 'Block URL'], [payload.image, 'Block image'],
        [payload.fileUrl, 'File URL'], [payload.poster, 'Media poster'], [payload.captionsUrl, 'Media captions']
      ];
      for (const [value, label] of directUrls) {
        const error = checkUrl(value, label);
        if (error) return error;
      }
      if (Array.isArray(payload.items)) {
        for (const item of payload.items as Array<Record<string, unknown>>) {
          for (const [value, label] of [[item?.url, 'Nested block URL'], [item?.image, 'Nested block image']] as Array<[unknown, string]>) {
            const error = checkUrl(value, label);
            if (error) return error;
          }
        }
      }
    }
  }
  if (Array.isArray(data.socialLinks)) {
    for (const link of data.socialLinks as Array<Record<string, unknown>>) {
      const error = checkUrl(link.url, 'Social link');
      if (error) return error;
    }
  }
  return null;
}

type DesignSystemColumns = {
  active_theme_id?: string | null;
  active_layout_id?: string | null;
  theme_overrides_json?: Record<string, unknown> | null;
  layout_overrides_json?: Record<string, unknown> | null;
  active_starter_site_id?: string | null;
};

/** Hydrate a draft from its normalized design resources before validation/rendering. */
async function hydrateProfileDesignSystem(env: Env, workspaceId: string, profileId: string, data: Record<string, unknown>, columns?: DesignSystemColumns): Promise<Record<string, unknown>> {
  let design = columns;
  if (!design) {
    const response = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id`, env);
    const rows = await response.json() as DesignSystemColumns[];
    design = rows[0];
  }
  const themeId = design?.active_theme_id;
  const layoutId = design?.active_layout_id;
  const themeOverride = design?.theme_overrides_json || {};
  const layoutOverride = design?.layout_overrides_json || {};
  if (!themeId && !layoutId && !Object.keys(themeOverride).length && !Object.keys(layoutOverride).length) {
    return design?.active_starter_site_id ? { ...data, starterSiteId: design.active_starter_site_id } : data;
  }
  const [themeResponse, layoutResponse] = await Promise.all([
    themeId ? supabaseRequest(`themes?id=eq.${encodeURIComponent(themeId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=definition_json`, env) : Promise.resolve(null),
    layoutId ? supabaseRequest(`layouts?id=eq.${encodeURIComponent(layoutId)}&workspace_id=eq.${encodeURIComponent(workspaceId)}&select=definition_json`, env) : Promise.resolve(null),
  ]);
  const themeRows = themeResponse ? await themeResponse.json() as Array<{ definition_json?: Record<string, unknown> }> : [];
  const layoutRows = layoutResponse ? await layoutResponse.json() as Array<{ definition_json?: Record<string, unknown> }> : [];
  const baseTheme = (themeRows[0]?.definition_json || data.standardTheme || data.theme || {}) as Record<string, unknown>;
  const resolvedTheme = mergeSparseOverride(baseTheme, themeOverride) as Record<string, unknown>;
  const baseLayout = layoutRows[0]?.definition_json || (baseTheme.layout as Record<string, unknown> | undefined) || {};
  const legacyLayoutOverride = (themeOverride.layout as Record<string, unknown> | undefined) || {};
  const resolvedLayout = mergeSparseOverride(baseLayout, mergeSparseOverride(legacyLayoutOverride, layoutOverride)) as Record<string, unknown>;
  const normalized = normalizeTheme({ ...resolvedTheme, layout: resolvedLayout });
  return { ...data, starterSiteId: design?.active_starter_site_id || data.starterSiteId, standardTheme: normalized, theme: normalized };
}

function withoutDraftDesignTheme(data: Record<string, unknown>): Record<string, unknown> {
  const persisted = { ...data };
  delete persisted.standardTheme;
  delete persisted.theme;
  return persisted;
}

function createThemeSnapshot(snapshot: Record<string, unknown>, profileId: string, version: number, timestamp: string, publishedBy: string, changeNote?: string, versionName?: string, versionNotes?: string): Record<string, unknown> {
  const standardTheme = snapshot.standardTheme && typeof snapshot.standardTheme === 'object' ? snapshot.standardTheme as Record<string, unknown> : {};
  return {
    snapshotId: String(snapshot.snapshotId || `snap-${profileId}-v${version}`),
    version,
    profileId,
    schemaVersion: Number(standardTheme.schemaVersion || 1),
    rendererVersion: 'profile-renderer-v1',
    theme: standardTheme,
    timestamp,
    publishedBy,
    versionName: versionName || `Release v${version}`,
    ...(versionNotes ? { versionNotes } : {}),
    ...(changeNote ? { changeNote } : {}),
  };
}

function createPublicSnapshot(data: Record<string, unknown>, profileId: string, version: number, publishedAt: string, publisher: string): Record<string, unknown> {
  const username = String(data.username).trim().toLowerCase();
  return {
    snapshotId: `snap-${profileId}-v${version}-${Date.now()}`,
    version,
    profileId,
    username,
    displayName: String(data.displayName || `@${username}`),
    bio: String(data.bio || ''),
    avatarUrl: String(data.avatarUrl || ''),
    category: String(data.category || 'Creator'),
    starterSiteId: typeof data.starterSiteId === 'string' ? data.starterSiteId : undefined,
    verified: Boolean(data.verified),
    socialPosition: data.socialPosition || 'top',
    socialLinks: Array.isArray(data.socialLinks) ? (data.socialLinks as Array<Record<string, unknown>>).filter(link => link.active && link.url) : [],
    theme: data.theme || {},
    standardTheme: normalizeTheme(data.standardTheme || data.theme || {}),
    tabs: Array.isArray(data.tabs) ? data.tabs : [],
    customDomain: data.customDomain || undefined,
    qrConfig: data.qrConfig || undefined,
    seo: {
      title: (data.seo as Record<string, unknown> | undefined)?.title || `${String(data.displayName || username)} | LynkFlow`,
      description: (data.seo as Record<string, unknown> | undefined)?.description || data.bio || 'Link in Bio and Mini-Site',
      noIndex: Boolean((data.seo as Record<string, unknown> | undefined)?.noIndex),
      ogImage: (data.seo as Record<string, unknown> | undefined)?.ogImage || data.avatarUrl || undefined,
    },
    publishedAt,
    publishedBy: publisher,
  };
}

async function publishDashboardProfile(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  if (!user.emailConfirmed) return apiError('EMAIL_VERIFICATION_REQUIRED', 'Verify your email before publishing to the live web.', 403);
  let input: { profileId?: string; changeNote?: string; versionName?: string; versionNotes?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const profileId = input.profileId?.trim();
  if (!profileId) return apiError('VALIDATION_ERROR', 'profileId is required.', 422);
  if (!canManageProfile(user, profileId)) return apiError('FORBIDDEN', 'You do not have permission to publish this profile.', 403);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(user.id)}&select=id,username,data,active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id`, env);
  const rows = await profileResponse.json() as Array<{ id: string; username: string; data: Record<string, unknown> } & DesignSystemColumns>;
  const profile = rows[0];
  if (!profile) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const profileData = await hydrateProfileDesignSystem(env, user.id, profile.id, profile.data, profile);
  const validationError = validatePublishData(profileData);
  if (validationError) return apiError('VALIDATION_ERROR', validationError, 422);

  const requestHash = await sha256(JSON.stringify({ profileId, changeNote: input.changeNote || '', versionName: input.versionName || '', versionNotes: input.versionNotes || '' }));
  const auth: ApiKeyAuth = { keyId: user.id, workspaceId: user.id, scopes: [], allowedProfileIds: null };
  const replay = await idempotentReplay(env, auth, request, requestHash);
  if (replay) return replay;

  const publishedAt = new Date().toISOString();
  const version = Number(profileData.publishedVersion || 0) + 1;
  const snapshot = createPublicSnapshot(profileData, profile.id, version, publishedAt, user.email);
  const themeSnapshot = createThemeSnapshot(snapshot, profile.id, version, publishedAt, user.email, input.changeNote, input.versionName, input.versionNotes);
  const nextData = {
    ...profileData,
    status: 'published',
    publishedVersion: version,
    publishedAt,
    publishedSnapshot: snapshot,
    snapshotHistory: [snapshot, ...(Array.isArray(profileData.snapshotHistory) ? profileData.snapshotHistory : [])].slice(0, 50),
    themeSnapshots: [themeSnapshot, ...(Array.isArray(profileData.themeSnapshots) ? profileData.themeSnapshots : []).slice(0, 49)],
    updatedAt: publishedAt,
  };
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profile.id)}&workspace_id=eq.${encodeURIComponent(user.id)}`, env, {
    method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: withoutDraftDesignTheme(nextData), updated_at: publishedAt })
  });
  await supabaseRequest('published_profiles?on_conflict=profile_id', env, {
    method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ profile_id: profile.id, workspace_id: user.id, username: String(snapshot.username), snapshot, published_version: version, published_at: publishedAt, updated_at: publishedAt })
  });
  await dispatchWebhookEvent(env, user.id, 'profile.published', { profileId: profile.id, username: profile.username, publishedVersion: version, publishedAt });
  const result = { data: { profile: { ...nextData, id: profile.id, username: profile.username }, publishedVersion: version, publishedAt }, requestId: crypto.randomUUID() };
  await saveIdempotentResponse(env, auth, request, requestHash, 200, result);
  return json(result);
}

type ScheduledProfileRow = {
  id: string;
  username: string;
  workspace_id: string;
  data: Record<string, unknown>;
} & DesignSystemColumns;

async function executeScheduledProfilePublishes(env: Env, scheduledTime = Date.now()): Promise<void> {
  const response = await supabaseRequest('profiles?select=id,username,workspace_id,data,active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id&limit=1000', env);
  if (!response.ok) throw new Error('Scheduled publish profiles could not be loaded.');
  const profiles = await response.json() as ScheduledProfileRow[];

  for (const profile of profiles) {
    const schedule = profile.data.scheduledPublish as Record<string, unknown> | null | undefined;
    if (!schedule || schedule.status !== 'pending') continue;
    const scheduledAt = Date.parse(String(schedule.scheduledTimeUtc || ''));
    if (!Number.isFinite(scheduledAt) || scheduledAt > scheduledTime) continue;
    let latestData = profile.data;

    const markSchedule = async (status: 'executed' | 'failed', failureReason?: string) => {
      const nextSchedule = { ...schedule, status, ...(failureReason ? { failureReason } : {}), ...(status === 'executed' ? { executedAt: new Date(scheduledTime).toISOString() } : {}) };
      await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profile.id)}&workspace_id=eq.${encodeURIComponent(profile.workspace_id)}`, env, {
        method: 'PATCH', headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ data: withoutDraftDesignTheme({ ...latestData, scheduledPublish: nextSchedule }), updated_at: new Date().toISOString() })
      });
    };

    try {
      const target = schedule.targetSnapshotDraft;
      if (!target || typeof target !== 'object' || Array.isArray(target)) throw new Error('Scheduled draft is missing.');
      const targetDraft = await hydrateProfileDesignSystem(env, profile.workspace_id, profile.id, target as Record<string, unknown>, profile);
      const validationError = validatePublishData(targetDraft);
      if (validationError) { await markSchedule('failed', validationError); continue; }

      const publishedAt = new Date(scheduledTime).toISOString();
      const version = Number(profile.data.publishedVersion || targetDraft.publishedVersion || 0) + 1;
      const publisher = String(schedule.createdBy || 'scheduled-publish');
      const snapshot = createPublicSnapshot(targetDraft, profile.id, version, publishedAt, publisher);
      const themeSnapshot = createThemeSnapshot(snapshot, profile.id, version, publishedAt, publisher, 'Scheduled release');
      const nextData = {
        ...targetDraft,
        scheduledPublish: { ...schedule, status: 'executed', executedAt: publishedAt },
        status: 'published', publishedVersion: version, publishedAt, publishedSnapshot: snapshot,
        snapshotHistory: [snapshot, ...(Array.isArray(profile.data.snapshotHistory) ? profile.data.snapshotHistory : [])].slice(0, 50),
        themeSnapshots: [themeSnapshot, ...(Array.isArray(profile.data.themeSnapshots) ? profile.data.themeSnapshots : [])].slice(0, 50),
        updatedAt: publishedAt,
      };
      latestData = nextData;
      const profileUpdate = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profile.id)}&workspace_id=eq.${encodeURIComponent(profile.workspace_id)}`, env, {
        method: 'PATCH', headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ data: withoutDraftDesignTheme(nextData), updated_at: publishedAt })
      });
      if (!profileUpdate.ok) throw new Error('Scheduled profile could not be updated.');
      const publishedUpdate = await supabaseRequest('published_profiles?on_conflict=profile_id', env, {
        method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ profile_id: profile.id, workspace_id: profile.workspace_id, username: String(snapshot.username), snapshot, published_version: version, published_at: publishedAt, updated_at: publishedAt })
      });
      if (!publishedUpdate.ok) throw new Error('Scheduled public snapshot could not be updated.');
      await dispatchWebhookEvent(env, profile.workspace_id, 'profile.published', { profileId: profile.id, username: profile.username, publishedVersion: version, publishedAt });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Scheduled publish failed.';
      try { await markSchedule('failed', reason); } catch (markError) { console.error('Scheduled publish failure state could not be saved', markError); }
      console.error(`Scheduled publish failed for profile ${profile.id}`, error);
    }
  }
}

async function unpublishDashboardProfile(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  let input: { profileId?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const profileId = input.profileId?.trim();
  if (!profileId) return apiError('VALIDATION_ERROR', 'profileId is required.', 422);
  if (!canManageProfile(user, profileId)) return apiError('FORBIDDEN', 'You do not have permission to unpublish this profile.', 403);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(user.id)}&select=id`, env);
  const rows = await profileResponse.json() as Array<{ id: string }>;
  if (!rows[0]) return apiError('NOT_FOUND', 'Profile not found.', 404);
  await supabaseRequest(`published_profiles?profile_id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(user.id)}`, env, { method: 'DELETE', headers: { prefer: 'return=minimal' } });
  return json({ data: { profileId, status: 'unpublished' }, requestId: crypto.randomUUID() });
}

async function saveDashboardDraft(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  let input: { profile?: Record<string, unknown>; brandKit?: Record<string, unknown> };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const draft = input.profile;
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return apiError('VALIDATION_ERROR', 'profile must be an object.', 422);
  const profileId = typeof draft.id === 'string' ? draft.id.trim() : '';
  const username = typeof draft.username === 'string' ? draft.username.trim() : '';
  if (!profileId || !username) return apiError('VALIDATION_ERROR', 'Profile id and username are required.', 422);
  if (!canManageProfile(user, profileId)) return apiError('FORBIDDEN', 'You do not have permission to edit this profile.', 403);
  const validationError = validateDraftData(draft);
  if (validationError) return apiError('VALIDATION_ERROR', validationError, 422);
  const now = new Date().toISOString();
  const normalizedTheme = normalizeTheme(draft.standardTheme || draft.theme || {});
  const designPersistence = createThemeDesignPersistence(normalizedTheme);
  const nextData = { ...draft, standardTheme: normalizedTheme, theme: normalizedTheme, updatedAt: now };
  await supabaseRequest('profiles?on_conflict=id', env, {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: profileId, workspace_id: user.id, username, data: withoutDraftDesignTheme(nextData),
      active_theme_id: `${user.id}:${designPersistence.baseTheme.id}`,
      active_layout_id: `${user.id}:${profileId}:layout`,
      active_starter_site_id: typeof draft.starterSiteId === 'string' ? draft.starterSiteId : null,
      theme_overrides_json: designPersistence.themeOverride, layout_overrides_json: designPersistence.layoutOverride,
      published_snapshot_id: (draft.publishedSnapshot as Record<string, unknown> | undefined)?.snapshotId || null,
      updated_at: now,
    })
  });
  await persistDesignSystem(env, user.id, profileId, normalizedTheme as unknown as Record<string, unknown>, draft, input.brandKit);
  return json({ data: { profile: { ...nextData, id: profileId, username } }, requestId: crypto.randomUUID() });
}

async function saveCustomThemes(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  let input: { themes?: unknown[] };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  if (!Array.isArray(input.themes) || input.themes.length > 50) return apiError('VALIDATION_ERROR', 'themes must be an array with at most 50 presets.', 422);
  const now = new Date().toISOString();
  const rows: Array<Record<string, unknown>> = [];
  for (const rawTheme of input.themes) {
    if (!rawTheme || typeof rawTheme !== 'object' || Array.isArray(rawTheme)) return apiError('VALIDATION_ERROR', 'Each preset must be a theme object.', 422);
    const theme = rawTheme as Record<string, unknown>;
    const schemaResult = validateThemeSchema(theme);
    if (!schemaResult.isValid) return apiError('VALIDATION_ERROR', schemaResult.errors[0]?.message || 'Preset theme schema validation failed.', 422);
    const normalized = normalizeTheme(theme);
    const composition = normalized.presetComposition;
    rows.push({
      id: normalized.id,
      workspace_id: user.id,
      name: normalized.name,
      data: normalized,
      theme_id: composition?.themeId || normalized.id,
      layout_id: composition?.layoutId || normalized.layout?.templateId || null,
      brand_kit_id: composition?.brandKitId || null,
      starter_site_id: composition?.starterSiteId || null,
      selected_block_variants: composition?.selectedBlockVariants || {},
      includes_starter_content: composition?.includesStarterContent === true,
      changes_content: composition?.changesContent === true,
      changes_layout: composition?.changesLayout !== false,
      updated_at: now
    });
  }
  if (rows.length) {
    const response = await supabaseRequest('custom_themes?on_conflict=id', env, {
      method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows)
    });
    if (!response.ok) throw new Error('Custom presets could not be persisted.');
  }
  return json({ data: { count: rows.length }, requestId: crypto.randomUUID() });
}

async function deleteCustomTheme(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  let input: { id?: unknown };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  if (typeof input.id !== 'string' || !input.id.trim()) return apiError('VALIDATION_ERROR', 'Preset id is required.', 422);
  const response = await supabaseRequest(`custom_themes?id=eq.${encodeURIComponent(input.id)}&workspace_id=eq.${encodeURIComponent(user.id)}`, env, {
    method: 'DELETE',
    headers: { prefer: 'return=minimal' },
  });
  if (!response.ok) throw new Error('Custom preset could not be deleted.');
  return json({ data: { deleted: true }, requestId: crypto.randomUUID() });
}

async function persistDesignSystem(env: Env, workspaceId: string, profileId: string, theme: Record<string, unknown>, profile: Record<string, unknown>, brandKit?: Record<string, unknown>): Promise<void> {
  const persistence = createThemeDesignPersistence(theme as unknown as ReturnType<typeof normalizeTheme>);
  const baseTheme = persistence.baseTheme as unknown as Record<string, unknown>;
  const themeId = `${workspaceId}:${String(baseTheme.id)}`;
  const layoutId = `${workspaceId}:${profileId}:layout`;
  const now = new Date().toISOString();
  const themeResponse = await supabaseRequest('themes?on_conflict=id', env, {
    method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: themeId, workspace_id: workspaceId, name: baseTheme.name, category: String(baseTheme.category || 'profile'), definition_json: baseTheme, preview_image_url: baseTheme.previewImage || null, schema_version: Number(baseTheme.schemaVersion || 1), is_active: true, updated_at: now })
  });
  if (!themeResponse.ok) throw new Error('Theme resource could not be persisted.');
  const layoutResponse = await supabaseRequest('layouts?on_conflict=id', env, {
    method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: layoutId, workspace_id: workspaceId, name: (baseTheme.layout as Record<string, unknown> | undefined)?.templateId || 'Profile layout', definition_json: baseTheme.layout || {}, schema_version: 1, is_active: true, updated_at: now })
  });
  if (!layoutResponse.ok) throw new Error('Layout resource could not be persisted.');
  const versionResponse = await supabaseRequest('theme_versions?on_conflict=id', env, {
    method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: `draft:${profileId}`, workspace_id: workspaceId, profile_id: profileId, theme_id: themeId, layout_id: layoutId, overrides_json: { theme: persistence.themeOverride, layout: persistence.layoutOverride }, status: profile.status === 'published' ? 'published' : 'draft', version_name: `Draft v${profile.publishedVersion || 0}`, version_notes: 'Autosaved design-system snapshot', created_by: workspaceId, published_at: profile.status === 'published' ? (profile.publishedAt || now) : null })
  });
  if (!versionResponse.ok) throw new Error('Theme version could not be persisted.');
  if (brandKit) {
    const brandResponse = await supabaseRequest('brand_kits?on_conflict=id', env, {
      method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: brandKit.id, workspace_id: workspaceId, tokens_json: brandKit, locked_fields_json: brandKit.lockedFields || {}, updated_at: now })
    });
    if (!brandResponse.ok) throw new Error('Brand kit could not be persisted.');
  }
}

async function rollbackDashboardProfile(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  if (!user.emailConfirmed) return apiError('EMAIL_VERIFICATION_REQUIRED', 'Verify your email before rolling back a live profile.', 403);
  let input: { profileId?: string; snapshotId?: string; reason?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const profileId = input.profileId?.trim();
  const snapshotId = input.snapshotId?.trim();
  if (!profileId || !snapshotId) return apiError('VALIDATION_ERROR', 'profileId and snapshotId are required.', 422);
  if (!canManageProfile(user, profileId)) return apiError('FORBIDDEN', 'You do not have permission to roll back this profile.', 403);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(user.id)}&select=id,username,data`, env);
  const rows = await profileResponse.json() as Array<{ id: string; username: string; data: Record<string, unknown> }>;
  const profile = rows[0];
  if (!profile) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const history = Array.isArray(profile.data.snapshotHistory) ? profile.data.snapshotHistory as Array<Record<string, unknown>> : [];
  const target = history.find(snapshot => snapshot.snapshotId === snapshotId);
  if (!target) return apiError('NOT_FOUND', 'This immutable snapshot is not available for server rollback.', 404);

  const restoredData: Record<string, unknown> = {
    ...profile.data,
    username: target.username,
    displayName: target.displayName,
    bio: target.bio,
    avatarUrl: target.avatarUrl,
    category: target.category,
    verified: target.verified,
    socialPosition: target.socialPosition,
    socialLinks: target.socialLinks || [],
    theme: target.theme || {},
    standardTheme: target.standardTheme || normalizeTheme(target.theme || {}),
    tabs: target.tabs || [],
    customDomain: target.customDomain || null,
    qrConfig: target.qrConfig || null,
    seo: target.seo || {},
  };
  const validationError = validatePublishData(restoredData);
  if (validationError) return apiError('VALIDATION_ERROR', validationError, 422);
  const requestHash = await sha256(JSON.stringify({ profileId, snapshotId, reason: input.reason || '' }));
  const auth: ApiKeyAuth = { keyId: user.id, workspaceId: user.id, scopes: [], allowedProfileIds: null };
  const replay = await idempotentReplay(env, auth, request, requestHash);
  if (replay) return replay;

  const now = new Date().toISOString();
  const version = Number(profile.data.publishedVersion || 0) + 1;
  const snapshot = createPublicSnapshot(restoredData, profile.id, version, now, user.email);
  const themeSnapshot = createThemeSnapshot(snapshot, profile.id, version, now, user.email, input.reason || `Rollback to ${snapshotId}`);
  const nextData = {
    ...restoredData,
    status: 'published',
    publishedVersion: version,
    publishedAt: now,
    publishedSnapshot: snapshot,
    snapshotHistory: [snapshot, ...history].slice(0, 50),
    themeSnapshots: [themeSnapshot, ...(Array.isArray(profile.data.themeSnapshots) ? profile.data.themeSnapshots : [])].slice(0, 50),
    updatedAt: now,
  };
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(user.id)}`, env, {
    method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ data: nextData, updated_at: now })
  });
  await supabaseRequest('published_profiles?on_conflict=profile_id', env, {
    method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ profile_id: profileId, workspace_id: user.id, username: String(snapshot.username), snapshot, published_version: version, published_at: now, updated_at: now })
  });
  await supabaseRequest('audit_logs', env, {
    method: 'POST', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ id: `aud-${crypto.randomUUID()}`, workspace_id: user.id, actor: user.email, action: 'profile_rollback', target: `@${String(snapshot.username)}`, occurred_at: now, details: input.reason || `Rolled back to snapshot ${snapshotId}. New release v${version}.` })
  });
  await dispatchWebhookEvent(env, user.id, 'profile.published', { profileId, username: snapshot.username, publishedVersion: version, publishedAt: now, rollbackOf: snapshotId });
  const result = { data: { profile: { ...nextData, id: profile.id, username: String(snapshot.username) }, publishedVersion: version, publishedAt: now }, requestId: crypto.randomUUID() };
  await saveIdempotentResponse(env, auth, request, requestHash, 200, result);
  return json(result);
}

async function createPreviewToken(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  if (!user.emailConfirmed) return apiError('EMAIL_VERIFICATION_REQUIRED', 'Verify your email before creating preview links.', 403);
  let input: { profileId?: string; ttlMinutes?: number };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const profileId = input.profileId?.trim();
  const ttlMinutes = Math.min(10080, Math.max(5, Math.floor(Number(input.ttlMinutes || 60))));
  if (!profileId) return apiError('VALIDATION_ERROR', 'profileId is required.', 422);
  if (!canManageProfile(user, profileId)) return apiError('FORBIDDEN', 'You do not have permission to create a preview for this profile.', 403);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(user.id)}&select=id`, env);
  const rows = await profileResponse.json() as Array<{ id: string }>;
  if (!rows[0]) return apiError('NOT_FOUND', 'Profile not found.', 404);
  const token = `prev_live_${randomSecret(24)}`;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  await supabaseRequest('preview_tokens', env, {
    method: 'POST', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ id: `pt_${crypto.randomUUID()}`, token_hash: await sha256(token), workspace_id: user.id, profile_id: profileId, expires_at: expiresAt, created_by: user.email })
  });
  return json({ data: { token, expiresAt }, requestId: crypto.randomUUID() });
}

async function resolvePreviewToken(request: Request, env: Env): Promise<Response> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return apiError('SERVICE_UNAVAILABLE', 'Preview service is not configured.', 503);
  const url = new URL(request.url);
  const username = (url.searchParams.get('u') || '').trim().toLowerCase().replace(/^@/, '');
  const token = url.searchParams.get('token') || '';
  if (!username || !token) return apiError('NOT_FOUND', 'Preview link is invalid or expired.', 404);
  const tokenResponse = await supabaseRequest(`preview_tokens?token_hash=eq.${encodeURIComponent(await sha256(token))}&revoked_at=is.null&select=profile_id,expires_at`, env);
  const tokens = await tokenResponse.json() as Array<{ profile_id: string; expires_at: string }>;
  const preview = tokens[0];
  if (!preview || new Date(preview.expires_at).getTime() <= Date.now()) return apiError('NOT_FOUND', 'Preview link is invalid or expired.', 404);
  const profileResponse = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(preview.profile_id)}&select=id,username,workspace_id,data,active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id`, env);
  const profiles = await profileResponse.json() as Array<{ id: string; username: string; workspace_id: string; data: Record<string, unknown> } & DesignSystemColumns>;
  const profile = profiles[0];
  if (!profile || profile.username.toLowerCase() !== username) return apiError('NOT_FOUND', 'Preview link is invalid or expired.', 404);
  const profileData = await hydrateProfileDesignSystem(env, profile.workspace_id, profile.id, profile.data, profile);
  return json({ data: { profile: { ...profileData, id: profile.id, username: profile.username } }, requestId: crypto.randomUUID() });
}

function profileApiResource(profile: { id: string; username: string; data: Record<string, unknown> }): Record<string, unknown> {
  return {
    id: profile.id, username: profile.username,
    displayName: profile.data.displayName, bio: profile.data.bio,
    status: profile.data.status, publishedVersion: profile.data.publishedVersion,
    customDomain: (profile.data.customDomain as Record<string, unknown> | undefined)?.domain || null,
    tabsCount: Array.isArray(profile.data.tabs) ? profile.data.tabs.length : 0,
    blocksCount: Array.isArray(profile.data.tabs)
      ? (profile.data.tabs as Array<Record<string, unknown>>).reduce((total, tab) => total + (Array.isArray(tab.blocks) ? tab.blocks.length : 0), 0)
      : 0,
  };
}

async function handleApiProfiles(request: Request, env: Env, profileId?: string): Promise<Response> {
  const auth = await authenticateApiKey(request, env, request.method === 'GET' ? 'profiles:read' : 'profiles:write');
  if (auth instanceof Response) return auth;
  const profileFilter = profileId ? `&id=eq.${encodeURIComponent(profileId)}` : '';
  const response = await supabaseRequest(`profiles?workspace_id=eq.${encodeURIComponent(auth.workspaceId)}${profileFilter}&select=id,username,data&order=created_at`, env);
  const profiles = await response.json() as Array<{ id: string; username: string; data: Record<string, unknown> }>;
  const visible = auth.allowedProfileIds ? profiles.filter(profile => auth.allowedProfileIds?.includes(profile.id)) : profiles;
  if (profileId && !visible.length) return apiError('NOT_FOUND', 'Profile not found.', 404);
  if (request.method === 'GET') return json({ data: visible.map(profileApiResource), requestId: crypto.randomUUID() });

  if (!profileId || !visible.length) return apiError('NOT_FOUND', 'Profile not found.', 404);
  let input: { data?: Record<string, unknown> };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) return apiError('VALIDATION_ERROR', 'data must be an object.', 422);
  const mutableProfileFields = new Set(['username', 'displayName', 'bio', 'avatarUrl', 'category', 'socialLinks', 'seo', 'qrConfig', 'directLinkMode', 'socialPosition']);
  const invalidFields = Object.keys(input.data).filter(field => !mutableProfileFields.has(field) && field !== 'theme' && field !== 'standardTheme');
  if (invalidFields.length) return apiError('VALIDATION_ERROR', `Fields cannot be changed through this endpoint: ${invalidFields.join(', ')}.`, 422);
  if (input.data.username !== undefined && typeof input.data.username !== 'string') return apiError('VALIDATION_ERROR', 'username must be a string.', 422);
  if (typeof input.data.username === 'string' && !/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/i.test(input.data.username.trim())) return apiError('VALIDATION_ERROR', 'Username must use 3-30 letters, numbers, underscores, or hyphens.', 422);
  for (const field of ['displayName', 'bio', 'category', 'avatarUrl'] as const) {
    if (field in input.data && typeof input.data[field] !== 'string') return apiError('VALIDATION_ERROR', `${field} must be a string.`, 422);
  }
  if (input.data.socialLinks !== undefined && !Array.isArray(input.data.socialLinks)) return apiError('VALIDATION_ERROR', 'socialLinks must be an array.', 422);
  const requestHash = await sha256(JSON.stringify(input.data));
  const replay = await idempotentReplay(env, auth, request, requestHash);
  if (replay) return replay;
  if (typeof input.data.username === 'string') {
    const normalizedUsername = input.data.username.trim().toLowerCase();
    const duplicateResponse = await supabaseRequest(`profiles?username=eq.${encodeURIComponent(normalizedUsername)}&id=neq.${encodeURIComponent(profileId)}&select=id`, env);
    if (((await duplicateResponse.json()) as unknown[]).length) return apiError('CONFLICT', 'That username is already in use.', 409);
    input.data.username = normalizedUsername;
  }
  const nextData = { ...visible[0].data, ...input.data };
  if (Object.prototype.hasOwnProperty.call(input.data, 'theme') || Object.prototype.hasOwnProperty.call(input.data, 'standardTheme')) {
    const currentTheme = (visible[0].data.standardTheme || normalizeTheme(visible[0].data.theme || {})) as unknown as Record<string, unknown>;
    const patchTheme = input.data.standardTheme || input.data.theme;
    if (!patchTheme || typeof patchTheme !== 'object' || Array.isArray(patchTheme)) return apiError('VALIDATION_ERROR', 'theme must be an object.', 422);
    const candidateTheme = mergeThemePatch(currentTheme, patchTheme as Record<string, unknown>);
    const schemaResult = validateThemeSchema(candidateTheme);
    if (!schemaResult.isValid) return apiError('VALIDATION_ERROR', schemaResult.errors[0]?.message || 'Theme schema validation failed.', 422);
    const normalizedTheme = normalizeTheme(candidateTheme);
    nextData.standardTheme = normalizedTheme;
    nextData.theme = normalizedTheme;
  }
  await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profileId)}&workspace_id=eq.${encodeURIComponent(auth.workspaceId)}`, env, {
    method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ ...(typeof input.data.username === 'string' ? { username: input.data.username } : {}), data: nextData, updated_at: new Date().toISOString() })
  });
  const result = { data: profileApiResource({ ...visible[0], data: nextData }), requestId: crypto.randomUUID() };
  await saveIdempotentResponse(env, auth, request, requestHash, 200, result);
  return json(result);
}

function mergeThemePatch(current: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
  const currentTokens = (current.tokens && typeof current.tokens === 'object' ? current.tokens : {}) as Record<string, unknown>;
  const patchTokens = (patch.tokens && typeof patch.tokens === 'object' ? patch.tokens : {}) as Record<string, unknown>;
  const currentColors = (currentTokens.colors && typeof currentTokens.colors === 'object' ? currentTokens.colors : {}) as Record<string, unknown>;
  const patchColors = (patchTokens.colors && typeof patchTokens.colors === 'object' ? patchTokens.colors : {}) as Record<string, unknown>;
  const currentTypography = (currentTokens.typography && typeof currentTokens.typography === 'object' ? currentTokens.typography : {}) as Record<string, unknown>;
  const patchTypography = (patchTokens.typography && typeof patchTokens.typography === 'object' ? patchTokens.typography : {}) as Record<string, unknown>;
  const currentBackground = (current.background && typeof current.background === 'object' ? current.background : {}) as Record<string, unknown>;
  const patchBackground = (patch.background && typeof patch.background === 'object' ? patch.background : {}) as Record<string, unknown>;
  return {
    ...current,
    ...patch,
    tokens: { ...currentTokens, ...patchTokens, colors: { ...currentColors, ...patchColors }, typography: { ...currentTypography, ...patchTypography } },
    background: { ...currentBackground, ...patchBackground },
  };
}

type SupabaseWorkspaceUser = { id: string; email: string; emailConfirmed: boolean; role: 'owner' | 'manager' | 'viewer'; assignedProfileIds: string[] };

function canManageProfile(user: SupabaseWorkspaceUser, profileId: string): boolean {
  return user.role === 'owner' || (user.role === 'manager' && user.assignedProfileIds.includes(profileId));
}

async function getSupabaseUser(request: Request, env: Env): Promise<SupabaseWorkspaceUser | Response> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ') || !env.SUPABASE_PUBLISHABLE_KEY) return apiError('UNAUTHORIZED', 'Authentication required.', 401);
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization } });
  if (!response.ok) return apiError('UNAUTHORIZED', 'Authentication expired. Please sign in again.', 401);
  const user = await response.json() as { id?: string; email?: string; email_confirmed_at?: string | null; user_metadata?: { email_verified?: boolean } };
  if (!user.id || !user.email) return apiError('UNAUTHORIZED', 'Authenticated user is incomplete.', 401);
  let workspaceId = user.id;
  let role: SupabaseWorkspaceUser['role'] = 'owner';
  let assignedProfileIds: string[] = [];
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    const membershipResponse = await supabaseRequest(`workspace_members?user_id=eq.${encodeURIComponent(user.id)}&status=in.(pending,active)&select=workspace_id,role,assigned_profile_ids&order=created_at.asc&limit=1`, env);
    const memberships = await membershipResponse.json() as Array<{ workspace_id?: string; role?: 'manager' | 'viewer'; assigned_profile_ids?: unknown }>;
    if (memberships[0]?.workspace_id) {
      workspaceId = memberships[0].workspace_id;
      role = memberships[0].role || 'viewer';
      assignedProfileIds = Array.isArray(memberships[0].assigned_profile_ids) ? memberships[0].assigned_profile_ids.filter((id): id is string => typeof id === 'string') : [];
    }
  }
  return { id: workspaceId, email: user.email, emailConfirmed: Boolean(user.email_confirmed_at || user.user_metadata?.email_verified === true), role, assignedProfileIds };
}

async function issueApiKey(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  if (!user.emailConfirmed) return apiError('EMAIL_VERIFICATION_REQUIRED', 'Verify your email before creating API keys.', 403);
  if (user.role !== 'owner') return apiError('FORBIDDEN', 'Only the workspace owner can manage API keys.', 403);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return apiError('SERVICE_UNAVAILABLE', 'API service is not configured.', 503);
  let input: { name?: string; scopes?: string[]; allowedProfileIds?: string[] | null; expiresAt?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const name = input.name?.trim();
  const scopes = Array.isArray(input.scopes) ? input.scopes.filter(scope => typeof scope === 'string') : [];
  if (!name || !scopes.length) return apiError('VALIDATION_ERROR', 'Key name and at least one scope are required.', 422);
  if (input.expiresAt !== undefined && (!input.expiresAt || Number.isNaN(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now())) return apiError('VALIDATION_ERROR', 'expiresAt must be a valid future timestamp.', 422);
  if (scopes.some(scope => !ALL_API_SCOPES.includes(scope as typeof ALL_API_SCOPES[number]))) return apiError('VALIDATION_ERROR', 'One or more API scopes are invalid.', 422);
  const workspaceResponse = await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}&select=id,plan`, env);
  const workspaces = await workspaceResponse.json() as Array<{ id: string; plan: string }>;
  const workspace = workspaces[0];
  if (!workspace || !['pro', 'agency'].includes(workspace.plan)) return apiError('ENTITLEMENT_REQUIRED', 'REST API access requires a paid plan.', 403);
  if (input.allowedProfileIds) {
    const profileIds = input.allowedProfileIds.filter(id => typeof id === 'string' && id.trim());
    if (profileIds.length !== input.allowedProfileIds.length) return apiError('VALIDATION_ERROR', 'allowedProfileIds must contain valid profile IDs.', 422);
    const profileResponse = await supabaseRequest(`profiles?workspace_id=eq.${encodeURIComponent(user.id)}&id=in.(${profileIds.map(id => encodeURIComponent(id)).join(',')})&select=id`, env);
    const ownedProfiles = await profileResponse.json() as Array<{ id: string }>;
    if (ownedProfiles.length !== profileIds.length) return apiError('VALIDATION_ERROR', 'All allowed profiles must belong to your workspace.', 422);
  }
  const existingResponse = await supabaseRequest(`api_keys?workspace_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=id`, env);
  const existing = await existingResponse.json() as unknown[];
  if (existing.length >= (workspace.plan === 'agency' ? 20 : 5)) return apiError('ENTITLEMENT_REQUIRED', 'Active API key limit reached.', 403);
  const secret = `lf_live_${randomSecret()}`;
  const keyId = `key_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  await supabaseRequest('api_keys', env, {
    method: 'POST', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      id: keyId, workspace_id: user.id, name, key_prefix: `${secret.slice(0, 14)}…`,
      secret_hash: await sha256(secret), scopes, allowed_profile_ids: input.allowedProfileIds || null,
      status: 'active', created_at: createdAt, created_by: user.email, expires_at: input.expiresAt || null
    })
  });
  return json({ data: { id: keyId, workspaceId: user.id, name, keyPrefix: `${secret.slice(0, 14)}…`, scopes, allowedProfileIds: input.allowedProfileIds || null, status: 'active', createdAt, createdBy: user.email, expiresAt: input.expiresAt }, secret });
}

async function rotateApiKey(request: Request, env: Env, keyId: string): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  const keyResponse = await supabaseRequest(`api_keys?id=eq.${encodeURIComponent(keyId)}&workspace_id=eq.${encodeURIComponent(user.id)}&select=id,name,scopes,allowed_profile_ids,status,created_at,created_by,expires_at`, env);
  const rows = await keyResponse.json() as Array<Record<string, unknown>>;
  if (!rows[0] || rows[0].status !== 'active') return apiError('NOT_FOUND', 'Active API key not found.', 404);
  const secret = `lf_live_${randomSecret()}`;
  await supabaseRequest(`api_keys?id=eq.${encodeURIComponent(keyId)}&workspace_id=eq.${encodeURIComponent(user.id)}`, env, {
    method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ key_prefix: `${secret.slice(0, 14)}…`, secret_hash: await sha256(secret), last_used_at: null })
  });
  return json({ data: { ...rows[0], key_prefix: `${secret.slice(0, 14)}…` }, secret });
}

async function revokeApiKey(request: Request, env: Env, keyId: string): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  const revokeResponse = await supabaseRequest(`api_keys?id=eq.${encodeURIComponent(keyId)}&workspace_id=eq.${encodeURIComponent(user.id)}&status=eq.active&select=id`, env, {
    method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ status: 'revoked', revoked_at: new Date().toISOString() })
  });
  if (!((await revokeResponse.json()) as unknown[]).length) return apiError('NOT_FOUND', 'Active API key not found.', 404);
  return json({ success: true });
}

type WebhookTopic = 'profile.published' | 'profile.updated' | 'form.submitted' | 'subscriber.created' | 'domain.verified' | 'domain.ssl_failed';

function publicWebhook(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row.id, workspaceId: row.workspace_id, url: row.url, description: row.description,
    topics: row.topics, signingSecretPrefix: row.signing_secret_prefix, status: row.status,
    createdAt: row.created_at, createdBy: row.created_by, lastDeliveryAt: row.last_delivery_at,
    lastDeliveryStatus: row.last_delivery_status, consecutiveFailures: row.consecutive_failures,
  };
}

async function requirePaidWorkspace(request: Request, env: Env): Promise<{ user: SupabaseWorkspaceUser; plan: string } | Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  if (!user.emailConfirmed) return apiError('EMAIL_VERIFICATION_REQUIRED', 'Verify your email before managing automation.', 403);
  const response = await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}&select=id,plan`, env);
  const rows = await response.json() as Array<{ id: string; plan: string }>;
  if (!rows[0] || !['pro', 'agency'].includes(rows[0].plan)) return apiError('ENTITLEMENT_REQUIRED', 'Webhooks require a paid plan.', 403);
  return { user, plan: rows[0].plan };
}

async function inviteWorkspaceMember(request: Request, env: Env): Promise<Response> {
  const user = await getSupabaseUser(request, env);
  if (user instanceof Response) return user;
  if (!user.emailConfirmed) return apiError('EMAIL_VERIFICATION_REQUIRED', 'Verify your email before inviting team members.', 403);
  if (user.role !== 'owner') return apiError('FORBIDDEN', 'Only the workspace owner can invite team members.', 403);
  if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_URL) return apiError('SERVICE_UNAVAILABLE', 'Team invitations are not configured.', 503);

  let input: { email?: string; name?: string; role?: string; assignedProfileIds?: unknown[] };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const email = input.email?.trim().toLowerCase() || '';
  const name = input.name?.trim() || '';
  const role = input.role === 'viewer' ? 'viewer' : input.role === 'manager' ? 'manager' : '';
  const assignedProfileIds = Array.isArray(input.assignedProfileIds) ? input.assignedProfileIds.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())).map(id => id.trim()) : [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !role) return apiError('VALIDATION_ERROR', 'A valid email, name and role are required.', 422);
  if (!assignedProfileIds.length) return apiError('VALIDATION_ERROR', 'Assign at least one profile to the team member.', 422);

  const workspaceResponse = await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}&select=id,settings`, env);
  const workspaces = await workspaceResponse.json() as Array<{ id: string; settings?: Record<string, unknown> }>;
  const workspace = workspaces[0];
  if (!workspace) return apiError('NOT_FOUND', 'Workspace not found.', 404);
  const profileResponse = await supabaseRequest(`profiles?workspace_id=eq.${encodeURIComponent(user.id)}&id=in.(${assignedProfileIds.map(encodeURIComponent).join(',')})&select=id`, env);
  const profileRows = await profileResponse.json() as Array<{ id: string }>;
  if (profileRows.length !== new Set(assignedProfileIds).size) return apiError('NOT_FOUND', 'One or more assigned profiles were not found.', 404);
  const settings = workspace.settings || {};
  const members = Array.isArray(settings.members) ? settings.members as Array<Record<string, unknown>> : [];
  if (members.some(member => String(member.email || '').toLowerCase() === email)) return apiError('CONFLICT', 'This email is already a workspace member.', 409);

  const redirectTo = `${new URL(request.url).origin}/login`;
  const inviteResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/invite`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email, data: { name, workspaceId: user.id, role, assignedProfileIds }, redirect_to: redirectTo })
  });
  if (!inviteResponse.ok) {
    const inviteBody = await inviteResponse.json().catch(() => ({})) as { msg?: string; error_description?: string };
    return apiError('INVITE_DELIVERY_FAILED', inviteBody.error_description || inviteBody.msg || 'Supabase could not send the invitation email.', 503);
  }
  const invitedUser = await inviteResponse.json().catch(() => ({})) as { id?: string };

  const member = {
    id: `mem-${crypto.randomUUID()}`, email, name, role, assignedProfileIds,
    addedAt: new Date().toISOString(), addedBy: user.email,
    pendingInviteExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
  };
  const memberRecord = await supabaseRequest('workspace_members', env, {
    method: 'POST', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ id: member.id, workspace_id: user.id, user_id: invitedUser.id || null, email, name, role, assigned_profile_ids: assignedProfileIds, status: 'pending', added_by: user.id, invite_expires_at: member.pendingInviteExpiresAt, created_at: member.addedAt, updated_at: member.addedAt })
  });
  if (!memberRecord.ok) return apiError('PERSISTENCE_ERROR', 'Invitation was sent, but the membership record could not be saved. Retry member setup.', 503);
  const workspaceUpdate = await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}`, env, {
    method: 'PATCH', headers: { prefer: 'return=minimal' },
    body: JSON.stringify({ settings: { ...settings, members: [...members, member] }, updated_at: new Date().toISOString() })
  });
  if (!workspaceUpdate.ok) return apiError('PERSISTENCE_ERROR', 'Invitation was sent, but the workspace member record could not be saved. Retry member setup.', 503);
  return json({ data: { member }, requestId: crypto.randomUUID() });
}

async function createWebhookSubscription(request: Request, env: Env): Promise<Response> {
  if (!env.WEBHOOK_ENCRYPTION_KEY) return apiError('SERVICE_UNAVAILABLE', 'Webhook delivery is not configured.', 503);
  const access = await requirePaidWorkspace(request, env);
  if (access instanceof Response) return access;
  if (access.user.role !== 'owner') return apiError('FORBIDDEN', 'Only the workspace owner can manage webhooks.', 403);
  let input: { url?: string; topics?: string[]; description?: string };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  const url = input.url?.trim();
  const topics = Array.isArray(input.topics) ? input.topics.filter(topic => ['profile.published', 'profile.updated', 'form.submitted', 'subscriber.created', 'domain.verified', 'domain.ssl_failed'].includes(topic)) as WebhookTopic[] : [];
  if (!url || !url.startsWith('https://')) return apiError('VALIDATION_ERROR', 'Webhook endpoint must use HTTPS.', 422);
  if (!topics.length) return apiError('VALIDATION_ERROR', 'Select at least one event topic.', 422);
  if (url.length > 2048 || (input.description && input.description.length > 500)) return apiError('VALIDATION_ERROR', 'Webhook fields exceed safe limits.', 422);
  const countResponse = await supabaseRequest(`webhook_subscriptions?workspace_id=eq.${encodeURIComponent(access.user.id)}&status=neq.failed&select=id`, env);
  const count = await countResponse.json() as unknown[];
  if (count.length >= 10) return apiError('ENTITLEMENT_REQUIRED', 'Maximum of 10 active webhook subscriptions reached.', 403);
  const id = `wh_${crypto.randomUUID()}`;
  const secret = webhookSecret();
  const now = new Date().toISOString();
  const row = {
    id, workspace_id: access.user.id, url, description: input.description?.trim() || null, topics,
    signing_secret_prefix: `${secret.slice(0, 14)}…`, signing_secret_ciphertext: await encryptWebhookSecret(secret, env),
    status: 'active', created_at: now, created_by: access.user.email, consecutive_failures: 0
  };
  await supabaseRequest('webhook_subscriptions', env, { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(row) });
  return json({ data: publicWebhook(row), secret });
}

async function updateWebhookSubscription(request: Request, env: Env, hookId: string): Promise<Response> {
  const access = await requirePaidWorkspace(request, env);
  if (access instanceof Response) return access;
  if (access.user.role !== 'owner') return apiError('FORBIDDEN', 'Only the workspace owner can manage webhooks.', 403);
  let input: { status?: 'active' | 'paused' };
  try { input = await request.json(); } catch { return apiError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400); }
  if (!['active', 'paused'].includes(input.status || '')) return apiError('VALIDATION_ERROR', 'Status must be active or paused.', 422);
  const updateResponse = await supabaseRequest(`webhook_subscriptions?id=eq.${encodeURIComponent(hookId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}&select=id,status`, env, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ status: input.status }) });
  const updatedRows = await updateResponse.json() as Array<{ id: string; status: string }>;
  if (!updatedRows.length) return apiError('NOT_FOUND', 'Webhook subscription not found.', 404);
  return json({ success: true });
}

async function deleteWebhookSubscription(request: Request, env: Env, hookId: string): Promise<Response> {
  const access = await requirePaidWorkspace(request, env);
  if (access instanceof Response) return access;
  if (access.user.role !== 'owner') return apiError('FORBIDDEN', 'Only the workspace owner can manage webhooks.', 403);
  const deleteResponse = await supabaseRequest(`webhook_subscriptions?id=eq.${encodeURIComponent(hookId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}&select=id`, env, { method: 'DELETE', headers: { prefer: 'return=representation' } });
  const deletedRows = await deleteResponse.json() as Array<{ id: string }>;
  if (!deletedRows.length) return apiError('NOT_FOUND', 'Webhook subscription not found.', 404);
  return json({ success: true });
}

async function signWebhookBody(secret: string, timestamp: number, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function deliverWebhook(row: Record<string, unknown>, event: Record<string, unknown>, env: Env, existingDeliveryId?: string): Promise<{ delivered: boolean; deliveryId: string }> {
  const deliveryId = existingDeliveryId || `del_${crypto.randomUUID()}`;
  const body = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = await decryptWebhookSecret(String(row.signing_secret_ciphertext || ''), env);
  const signature = await signWebhookBody(secret, timestamp, body);
  const headers = {
    'content-type': 'application/json',
    'user-agent': 'LynkFlow-Webhooks/1.0',
    'x-lynkflow-event-id': deliveryId,
    'x-lynkflow-signature': `t=${timestamp},v1=${signature}`,
  };
  let delivered = false;
  let lastError = '';
  let attemptsMade = 0;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    attemptsMade = attempt;
    try {
      const response = await fetch(String(row.url), { method: 'POST', headers, body });
      delivered = response.ok;
      if (delivered) break;
      lastError = `HTTP ${response.status}`;
    } catch (error) { lastError = error instanceof Error ? error.message : 'Network failure'; }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 250 * 2 ** (attempt - 1)));
  }
  const delivery = {
    id: deliveryId, subscription_id: row.id, workspace_id: row.workspace_id, topic: event.type,
    payload: event, signature: headers['x-lynkflow-signature'], status: delivered ? 'delivered' : 'failed',
    attempt_count: Number(row.attempt_count || 0) + attemptsMade, delivered_at: delivered ? new Date().toISOString() : null,
    next_attempt_at: delivered ? null : new Date(Date.now() + 60_000).toISOString()
  };
  if (existingDeliveryId) {
    await supabaseRequest(`webhook_deliveries?id=eq.${encodeURIComponent(existingDeliveryId)}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify(delivery) });
  } else {
    await supabaseRequest('webhook_deliveries', env, { method: 'POST', headers: { prefer: 'return=minimal' }, body: JSON.stringify(delivery) });
  }
  await supabaseRequest(`webhook_subscriptions?id=eq.${encodeURIComponent(String(row.id))}`, env, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({
    last_delivery_at: new Date().toISOString(), last_delivery_status: delivered ? 'success' : 'failed',
    consecutive_failures: delivered ? 0 : Number(row.consecutive_failures || 0) + 1,
    status: !delivered && Number(row.consecutive_failures || 0) + 1 >= 5 ? 'failed' : row.status
  }) });
  if (!delivered) console.error(`Webhook ${String(row.id)} delivery failed: ${lastError}`);
  return { delivered, deliveryId };
}

async function dispatchWebhookEvent(env: Env, workspaceId: string, topic: WebhookTopic, data: Record<string, unknown>): Promise<void> {
  if (!env.WEBHOOK_ENCRYPTION_KEY) return;
  try {
    const response = await supabaseRequest(`webhook_subscriptions?workspace_id=eq.${encodeURIComponent(workspaceId)}&status=eq.active&topics=cs.{${encodeURIComponent(topic)}}&select=*`, env);
    const rows = await response.json() as Array<Record<string, unknown>>;
    const event = { id: `evt_${crypto.randomUUID()}`, type: topic, createdAt: new Date().toISOString(), data };
    await Promise.allSettled(rows.map(row => deliverWebhook(row, event, env)));
  } catch (error) {
    console.error(`Webhook dispatch failed for ${topic}`, error);
  }
}

async function retryPendingWebhooks(env: Env): Promise<void> {
  if (!env.WEBHOOK_ENCRYPTION_KEY) return;
  const now = new Date().toISOString();
  const response = await supabaseRequest(`webhook_deliveries?status=eq.failed&next_attempt_at=lte.${encodeURIComponent(now)}&attempt_count=lt.10&select=*`, env);
  const deliveries = await response.json() as Array<Record<string, unknown>>;
  await Promise.allSettled(deliveries.map(async delivery => {
    const subscriptionResponse = await supabaseRequest(`webhook_subscriptions?id=eq.${encodeURIComponent(String(delivery.subscription_id))}&status=neq.failed&select=*`, env);
    const subscriptions = await subscriptionResponse.json() as Array<Record<string, unknown>>;
    const subscription = subscriptions[0];
    if (!subscription) return;
    await deliverWebhook({ ...subscription, attempt_count: delivery.attempt_count }, delivery.payload as Record<string, unknown>, env, String(delivery.id));
  }));
}

async function testWebhookSubscription(request: Request, env: Env, hookId: string): Promise<Response> {
  const access = await requirePaidWorkspace(request, env);
  if (access instanceof Response) return access;
  if (access.user.role !== 'owner') return apiError('FORBIDDEN', 'Only the workspace owner can manage webhooks.', 403);
  const response = await supabaseRequest(`webhook_subscriptions?id=eq.${encodeURIComponent(hookId)}&workspace_id=eq.${encodeURIComponent(access.user.id)}&select=*`, env);
  const rows = await response.json() as Array<Record<string, unknown>>;
  if (!rows[0] || rows[0].status !== 'active') return apiError('NOT_FOUND', 'Active webhook subscription not found.', 404);
  const result = await deliverWebhook(rows[0], { id: `evt_${crypto.randomUUID()}`, type: 'test.delivery', createdAt: new Date().toISOString(), data: { test: true } }, env);
  return json({ data: result });
}

type BillingPlan = 'pro' | 'agency';
type BillingCycle = 'monthly' | 'annual';

function stripeConfigured(env: Env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.APP_URL);
}

function stripeCheckoutConfigured(env: Env): boolean {
  return Boolean(env.STRIPE_SECRET_KEY && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.APP_URL);
}

function stripePrice(env: Env, planId: BillingPlan, billingCycle: BillingCycle): string | undefined {
  const prices: Record<string, string | undefined> = {
    'pro:monthly': env.STRIPE_PRICE_PRO_MONTHLY,
    'pro:annual': env.STRIPE_PRICE_PRO_ANNUAL,
    'agency:monthly': env.STRIPE_PRICE_AGENCY_MONTHLY,
    'agency:annual': env.STRIPE_PRICE_AGENCY_ANNUAL,
  };
  return prices[`${planId}:${billingCycle}`];
}

async function stripeRequest(path: string, env: Env, params: URLSearchParams, idempotencyKey?: string): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': idempotencyKey || crypto.randomUUID(),
    },
    body: params,
  });
  const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(String(body.error && typeof body.error === 'object' ? (body.error as { message?: string }).message : 'Stripe request failed.'));
  return body;
}

async function supabaseRequest(path: string, env: Env, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || '',
      authorization: init.headers instanceof Headers ? init.headers.get('authorization') || `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` : `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase request failed with status ${response.status}.`);
  return response;
}

async function createCheckout(request: Request, env: Env): Promise<Response> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);
  if (!stripeCheckoutConfigured(env) || !env.SUPABASE_PUBLISHABLE_KEY) return json({ error: 'Stripe is not configured.' }, 503);

  let input: { planId?: BillingPlan; billingCycle?: BillingCycle };
  try { input = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400); }
  if (!['pro', 'agency'].includes(input.planId || '') || !['monthly', 'annual'].includes(input.billingCycle || '')) {
    return json({ error: 'A valid paid plan and billing cycle are required.' }, 400);
  }
  const price = stripePrice(env, input.planId!, input.billingCycle!);
  if (!price) return json({ error: 'The selected Stripe Price is not configured.' }, 503);

  const userToken = authorization.slice('Bearer '.length);
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${userToken}` },
  });
  if (!userResponse.ok) return json({ error: 'Authentication expired. Please sign in again.' }, 401);
  const user = await userResponse.json() as { id?: string; email?: string; email_confirmed_at?: string | null; user_metadata?: { email_verified?: boolean } };
  if (!user.id || !user.email) return json({ error: 'Authenticated user is missing an email.' }, 400);
  if (!user.email_confirmed_at && user.user_metadata?.email_verified !== true) return json({ error: 'Verify your email before starting billing.' }, 403);
  const workspaceResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/workspaces?id=eq.${encodeURIComponent(user.id)}&select=id,provider_customer_id,provider_subscription_id`, {
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization, accept: 'application/json' },
  });
  const workspaces = await workspaceResponse.json() as Array<{ id: string; provider_customer_id?: string; provider_subscription_id?: string }>;
  if (!workspaceResponse.ok || !workspaces.length) return json({ error: 'Workspace not found.' }, 404);
  const workspace = workspaces[0];
  if (workspace.provider_subscription_id) return json({ error: 'An active subscription already exists. Use billing management to change it.' }, 409);
  const requestKey = request.headers.get('idempotency-key')?.trim();
  if (requestKey && !/^[A-Za-z0-9._:-]{8,128}$/.test(requestKey)) return json({ error: 'Idempotency-Key must be 8-128 safe characters.' }, 422);
  const stableCustomerKey = `customer-${user.id}`;
  const stableCheckoutKey = requestKey || `checkout-${user.id}-${input.planId}-${input.billingCycle}-${new Date().toISOString().slice(0, 10)}`;
  const customer = workspace.provider_customer_id
    ? { id: workspace.provider_customer_id }
    : await stripeRequest('/v1/customers', env, new URLSearchParams({ email: user.email, 'metadata[workspace_id]': user.id }), stableCustomerKey);
  if (!workspace.provider_customer_id) {
    await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}`, env, {
      method: 'PATCH', headers: { prefer: 'return=minimal' },
      body: JSON.stringify({ provider_customer_id: String(customer.id), updated_at: new Date().toISOString() })
    });
  }
  const params = new URLSearchParams({
    mode: 'subscription',
    customer: String(customer.id),
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: `${env.APP_URL}/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/billing?stripe=cancelled`,
    'subscription_data[metadata][workspace_id]': user.id,
    'subscription_data[metadata][plan_id]': input.planId!,
    'subscription_data[metadata][billing_cycle]': input.billingCycle!,
    'subscription_data[trial_period_days]': '14',
    'metadata[workspace_id]': user.id,
    'metadata[plan_id]': input.planId!,
    'metadata[billing_cycle]': input.billingCycle!,
  });
  const session = await stripeRequest('/v1/checkout/sessions', env, params, stableCheckoutKey);
  return json({ url: session.url, sessionId: session.id });
}

async function cancelStripeSubscription(request: Request, env: Env): Promise<Response> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);
  if (!stripeConfigured(env) || !env.SUPABASE_PUBLISHABLE_KEY) return json({ error: 'Stripe is not configured.' }, 503);
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization } });
  if (!userResponse.ok) return json({ error: 'Authentication expired. Please sign in again.' }, 401);
  const user = await userResponse.json() as { id?: string; email_confirmed_at?: string | null; user_metadata?: { email_verified?: boolean } };
  if (!user.id) return json({ error: 'Authenticated user is missing.' }, 401);
  if (!user.email_confirmed_at && user.user_metadata?.email_verified !== true) return json({ error: 'Verify your email before managing billing.' }, 403);
  const workspaceResponse = await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}&select=provider_subscription_id`, env);
  const rows = await workspaceResponse.json() as Array<{ provider_subscription_id?: string }>;
  const subscriptionId = rows[0]?.provider_subscription_id;
  if (!subscriptionId) return json({ error: 'No active Stripe subscription found.' }, 404);
  const subscription = await stripeRequest(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, env, new URLSearchParams({ cancel_at_period_end: 'true' }));
  return json({ subscriptionId: subscription.id, cancelAtPeriodEnd: subscription.cancel_at_period_end });
}

async function createStripeBillingPortal(request: Request, env: Env): Promise<Response> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Authentication required.' }, 401);
  if (!stripeConfigured(env) || !env.SUPABASE_PUBLISHABLE_KEY) return json({ error: 'Stripe is not configured.' }, 503);
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, authorization } });
  if (!userResponse.ok) return json({ error: 'Authentication expired. Please sign in again.' }, 401);
  const user = await userResponse.json() as { id?: string; email_confirmed_at?: string | null; user_metadata?: { email_verified?: boolean } };
  if (!user.id) return json({ error: 'Authenticated user is missing.' }, 401);
  if (!user.email_confirmed_at && user.user_metadata?.email_verified !== true) return json({ error: 'Verify your email before managing billing.' }, 403);
  const workspaceResponse = await supabaseRequest(`workspaces?id=eq.${encodeURIComponent(user.id)}&select=provider_customer_id`, env);
  const rows = await workspaceResponse.json() as Array<{ provider_customer_id?: string }>;
  const customerId = rows[0]?.provider_customer_id;
  if (!customerId) return json({ error: 'No Stripe customer is linked to this workspace.' }, 404);
  const session = await stripeRequest('/v1/billing_portal/sessions', env, new URLSearchParams({ customer: customerId, return_url: `${env.APP_URL}/studio/billing` }), `portal-${user.id}-${new Date().toISOString().slice(0, 10)}`);
  return json({ url: session.url });
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

function hexToBytes(value: string): Uint8Array {
  return new Uint8Array(value.match(/.{2}/g)?.map(byte => parseInt(byte, 16)) || []);
}

async function verifyStripeSignature(body: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(',').reduce<Record<string, string[]>>((result, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) (result[key] ||= []).push(value);
    return result;
  }, {});
  const timestamp = Number(parts.t?.[0]);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`)));
  return (parts.v1 || []).some(candidate => equalBytes(signature, hexToBytes(candidate)));
}

async function updateBillingWorkspace(env: Env, workspaceId: string | undefined, customerId: string | undefined, subscriptionId: string | undefined, values: Record<string, unknown>): Promise<void> {
  const selector = workspaceId
    ? `id=eq.${encodeURIComponent(workspaceId)}`
    : `provider_customer_id=eq.${encodeURIComponent(customerId || '')}`;
  const response = await supabaseRequest(`workspaces?${selector}&select=id`, env);
  const rows = await response.json() as Array<{ id: string }>;
  if (!rows[0]) return;
  const filter = encodeURIComponent(rows[0].id);
  await supabaseRequest(`workspaces?id=eq.${filter}`, env, {
    method: 'PATCH',
    headers: { prefer: 'return=minimal' },
    body: JSON.stringify({
      ...values,
      ...(customerId ? { provider_customer_id: customerId } : {}),
      ...(subscriptionId ? { provider_subscription_id: subscriptionId } : {}),
      updated_at: new Date().toISOString()
    }),
  });
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  if (!stripeConfigured(env) || !env.STRIPE_WEBHOOK_SECRET) return json({ error: 'Stripe webhook is not configured.' }, 503);
  const body = await request.text();
  if (!await verifyStripeSignature(body, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)) return json({ error: 'Invalid Stripe signature.' }, 400);
  const event = JSON.parse(body) as { id: string; type: string; data: { object: Record<string, unknown> } };
  const existing = await supabaseRequest(`stripe_events?id=eq.${encodeURIComponent(event.id)}&select=id`, env);
  if (((await existing.json()) as unknown[]).length) return json({ received: true, duplicate: true });

  const object = event.data.object;
  const metadata = (object.metadata || {}) as Record<string, string>;
  const customerId = String(object.customer || metadata.customer_id || '');
  const subscriptionCandidate = String(object.subscription || '');
  const subscriptionId = subscriptionCandidate.startsWith('sub_') ? subscriptionCandidate : undefined;
  const workspaceId = metadata.workspace_id;
  if (!customerId && !workspaceId) return json({ received: true });
  const status = event.type === 'invoice.payment_failed' ? 'past_due' : event.type === 'customer.subscription.deleted' ? 'canceled' : String(object.status || 'active');
  await updateBillingWorkspace(env, workspaceId, customerId || undefined, subscriptionId, {
    ...(customerId ? { provider_customer_id: customerId } : {}),
    subscription_status: ['trialing', 'active', 'past_due', 'canceled', 'grace_period'].includes(status) ? status : 'past_due',
    ...(metadata.plan_id ? { plan: metadata.plan_id } : {}),
    ...(metadata.billing_cycle ? { billing_cycle: metadata.billing_cycle } : {}),
    ...(typeof object.cancel_at_period_end === 'boolean' ? { cancel_at_period_end: object.cancel_at_period_end } : {}),
    ...(object.current_period_start ? { current_period_start: new Date(Number(object.current_period_start) * 1000).toISOString() } : {}),
    ...(object.current_period_end ? { current_period_end: new Date(Number(object.current_period_end) * 1000).toISOString() } : {}),
  });
  await supabaseRequest('stripe_events', env, { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ id: event.id, event_type: event.type }) });
  return json({ received: true });
}

export default {
  async scheduled(controller: { scheduledTime: number }, env: Env, _context: { waitUntil(promise: Promise<unknown>): void }): Promise<void> {
    await executeScheduledProfilePublishes(env, controller.scheduledTime);
    await retryPendingWebhooks(env);
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/privacy' || url.pathname === '/privacy.html') {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', { status: 405 });
      return legalResponse('privacy', request);
    }
    if (url.pathname === '/terms' || url.pathname === '/terms.html') {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', { status: 405 });
      return legalResponse('terms', request);
    }
    if (url.pathname === '/robots.txt') {
      if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });
      return robotsResponse(request, env);
    }
    if (url.pathname === '/sitemap.xml') {
      if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });
      try { return await sitemapResponse(request, env); } catch { return new Response('Sitemap temporarily unavailable.', { status: 503 }); }
    }
    if (url.pathname.startsWith('/@')) {
      if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });
      if (url.searchParams.get('demo') === '1') {
        const demoResponse = await env.ASSETS.fetch(new Request(new URL('/', request.url), { method: 'GET', headers: request.headers }));
        const headers = new Headers(demoResponse.headers);
        headers.set('x-robots-tag', 'noindex, nofollow');
        return secureAssetResponse(new Response(demoResponse.body, { status: demoResponse.status, statusText: demoResponse.statusText, headers }));
      }
      try { return await publicProfileResponse(request, env, decodeURIComponent(url.pathname.slice(2))); } catch (error) {
        console.error('Public profile SEO rendering failed', error);
        return new Response('Profile temporarily unavailable.', { status: 503, headers: { 'content-type': 'text/plain;charset=UTF-8', 'cache-control': 'no-store' } });
      }
    }
    if (url.pathname === '/' && url.searchParams.get('view') === 'public_standalone' && url.searchParams.get('u') && !url.searchParams.get('previewToken')) {
      const handle = url.searchParams.get('u')!.trim().replace(/^@/, '');
      if (/^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/i.test(handle)) {
        const destination = new URL(`/@${encodeURIComponent(handle)}`, request.url);
        if (url.searchParams.get('demo') === '1') destination.searchParams.set('demo', '1');
        return Response.redirect(destination.toString(), 301);
      }
    }
    if (url.pathname === '/api/health') {
      if (request.method !== 'GET') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      return deploymentHealth(env);
    }
    if (url.pathname === '/api/media/pexels') {
      if (request.method !== 'GET') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await pexelsMediaResponse(request, env); } catch (error) {
        console.error('Pexels search failed', error);
        return json({ error: 'Pexels search is temporarily unavailable.' }, 502);
      }
    }
    if (url.pathname === '/api/email/test') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      return sendTestEmail(request, env);
    }
    if (url.pathname === '/api/profile/publish') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await publishDashboardProfile(request, env); } catch (error) { return internalApiError('Publish profile failed', error, 'Unable to publish profile.'); }
    }
    if (url.pathname === '/api/profile/unpublish') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await unpublishDashboardProfile(request, env); } catch (error) { return internalApiError('Unpublish profile failed', error, 'Unable to unpublish profile.'); }
    }
    if (url.pathname === '/api/profile/draft') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await saveDashboardDraft(request, env); } catch (error) { return internalApiError('Save draft failed', error, 'Unable to save draft.'); }
    }
    if (url.pathname === '/api/design/custom-themes') {
      if (request.method !== 'POST' && request.method !== 'DELETE') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try {
        return request.method === 'DELETE'
          ? await deleteCustomTheme(request, env)
          : await saveCustomThemes(request, env);
      } catch (error) { return internalApiError('Custom preset mutation failed', error, 'Unable to update custom presets.'); }
    }
    if (url.pathname === '/api/profile/rollback') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await rollbackDashboardProfile(request, env); } catch (error) { return internalApiError('Rollback profile failed', error, 'Unable to roll back profile.'); }
    }
    if (url.pathname === '/api/profile/preview-token') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await createPreviewToken(request, env); } catch (error) { return internalApiError('Create preview token failed', error, 'Unable to create preview link.'); }
    }
    if (url.pathname === '/api/public/preview') {
      if (request.method !== 'GET') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await resolvePreviewToken(request, env); } catch (error) { return internalApiError('Resolve preview token failed', error, 'Unable to resolve preview link.'); }
    }
    if (url.pathname === '/api/stripe/checkout') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      try { return await createCheckout(request, env); } catch (error) { return internalApiError('Create checkout failed', error, 'Unable to start checkout.', 502); }
    }
    if (url.pathname === '/api/stripe/cancel') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      try { return await cancelStripeSubscription(request, env); } catch (error) { return internalApiError('Cancel subscription failed', error, 'Unable to cancel subscription.', 502); }
    }
    if (url.pathname === '/api/stripe/portal') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      try { return await createStripeBillingPortal(request, env); } catch (error) { return internalApiError('Create billing portal session failed', error, 'Unable to open billing portal.', 502); }
    }
    if (url.pathname === '/api/stripe/webhook') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      try { return await handleStripeWebhook(request, env); } catch (error) { return internalApiError('Stripe webhook processing failed', error, 'Webhook processing failed.'); }
    }
    if (url.pathname === '/api/public/forms') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      try { return await submitPublicForm(request, env); } catch (error) { return internalApiError('Public form submission failed', error, 'Form submission failed.'); }
    }
    if (url.pathname === '/api/public/newsletter') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await submitMarketingNewsletter(request, env); } catch (error) {
        console.error('Marketing newsletter submission failed', error);
        return apiError('INTERNAL_ERROR', 'Newsletter submission failed. Please try again.', 500);
      }
    }
    if (url.pathname === '/api/public/newsletter/unsubscribe') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await unsubscribeMarketingNewsletter(request, env); } catch (error) {
        console.error('Marketing newsletter unsubscribe failed', error);
        return apiError('INTERNAL_ERROR', 'Newsletter unsubscribe failed. Please try again.', 500);
      }
    }
    if (url.pathname === '/api/public/abuse-reports') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      try { return await submitPublicAbuseReport(request, env); } catch (error) { return internalApiError('Abuse report submission failed', error, 'Report submission failed.'); }
    }
    if (url.pathname === '/api/webhooks') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await createWebhookSubscription(request, env); } catch (error) { return internalApiError('Create webhook failed', error, 'Unable to create webhook.'); }
    }
    if (url.pathname === '/api/workspace/invite') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await inviteWorkspaceMember(request, env); } catch (error) { return internalApiError('Invite workspace member failed', error, 'Unable to send team invitation.'); }
    }
    if (url.pathname.startsWith('/api/webhooks/') && url.pathname.endsWith('/test')) {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      const hookId = url.pathname.split('/')[3];
      try { return await testWebhookSubscription(request, env, hookId); } catch (error) { return internalApiError('Test webhook failed', error, 'Webhook delivery failed.'); }
    }
    if (url.pathname.startsWith('/api/webhooks/')) {
      const hookId = url.pathname.split('/')[3];
      if (request.method === 'PATCH') {
        try { return await updateWebhookSubscription(request, env, hookId); } catch (error) { return internalApiError('Update webhook failed', error, 'Unable to update webhook.'); }
      }
      if (request.method === 'DELETE') {
        try { return await deleteWebhookSubscription(request, env, hookId); } catch (error) { return internalApiError('Delete webhook failed', error, 'Unable to delete webhook.'); }
      }
      return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
    }
    if (url.pathname === '/api/domains/verify' || url.pathname === '/api/domains/recheck') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await verifyCustomDomain(request, env); } catch (error) { return internalApiError('Verify custom domain failed', error, 'Domain verification failed.'); }
    }
    if (url.pathname === '/api/domains/remove') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await removeCustomDomain(request, env); } catch (error) { return internalApiError('Remove custom domain failed', error, 'Domain removal failed.'); }
    }
    if (url.pathname === '/api/v1/profiles' || url.pathname.startsWith('/api/v1/profiles/')) {
      const parts = url.pathname.split('/').filter(Boolean);
      const profileId = parts[3];
      if (parts[4] === 'publish') {
        if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
        try { return await publishApiProfile(request, env, profileId); } catch (error) { return internalApiError('API publish failed', error, 'Publish request failed.'); }
      }
      if (parts[4] === 'blocks' || parts[4] === 'themes') {
        if (!['GET', 'PATCH'].includes(request.method)) return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
        try { return await handleApiProfileSubresource(request, env, profileId, parts[4], parts[5]); } catch (error) { return internalApiError('API resource request failed', error, 'Resource request failed.'); }
      }
      if (!['GET', 'PATCH'].includes(request.method)) return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await handleApiProfiles(request, env, profileId); } catch (error) { return internalApiError('API profile request failed', error, 'API request failed.'); }
    }
    if (url.pathname === '/api/api-keys') {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      try { return await issueApiKey(request, env); } catch (error) { return internalApiError('Issue API key failed', error, 'Unable to issue API key.'); }
    }
    if (url.pathname.startsWith('/api/api-keys/') && url.pathname.endsWith('/rotate')) {
      if (request.method !== 'POST') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      const keyId = url.pathname.split('/')[3];
      try { return await rotateApiKey(request, env, keyId); } catch (error) { return internalApiError('Rotate API key failed', error, 'Unable to rotate API key.'); }
    }
    if (url.pathname.startsWith('/api/api-keys/')) {
      if (request.method !== 'DELETE') return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
      const keyId = url.pathname.split('/')[3];
      try { return await revokeApiKey(request, env, keyId); } catch (error) { return internalApiError('Revoke API key failed', error, 'Unable to revoke API key.'); }
    }
    if (request.method === 'GET' && SEO_LANDING_PAGES[url.pathname]) {
      return marketingSeoPageResponse(url.pathname, request);
    }
    if (request.method === 'GET' && !url.pathname.startsWith('/api/') && !url.pathname.includes('.')) {
      try {
        if (await isActiveCustomDomain(url.hostname, env)) {
          return await publicProfileResponse(request, env, '', url.hostname.toLowerCase());
        }
      } catch (error) { console.error('Custom domain lookup failed', error); }
    }
    // Serve the SPA shell for dashboard routes so deep links such as
    // /studio/themes survive refresh and can be shared directly.
    if (request.method === 'GET' && (url.pathname === '/studio' || url.pathname.startsWith('/studio/')) && !url.pathname.includes('.')) {
      return secureAssetResponse(await env.ASSETS.fetch(new Request(new URL('/', request.url), request)), false);
    }
    if (request.method === 'GET' && (url.pathname === '/signup' || url.pathname === '/login')) {
      return secureAssetResponse(await env.ASSETS.fetch(new Request(new URL('/', request.url), request)), false);
    }
    if (request.method === 'GET' && url.pathname === '/unsubscribe') {
      return secureAssetResponse(await env.ASSETS.fetch(new Request(new URL('/unsubscribe', request.url), request)), false);
    }
    if (request.method === 'GET' && url.pathname !== '/' && !url.pathname.includes('.')) {
      return secureAssetResponse(new Response('Not found.', { status: 404, headers: { 'content-type': 'text/plain;charset=UTF-8' } }));
    }
    return secureAssetResponse(await env.ASSETS.fetch(request), url.pathname.startsWith('/assets/') || ['/favicon.svg', '/og-default.svg', '/og-default.png'].includes(url.pathname));
  },
};
