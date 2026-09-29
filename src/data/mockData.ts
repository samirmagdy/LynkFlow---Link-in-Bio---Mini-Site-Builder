import { Profile, ThemeConfig, Workspace, AnalyticsEvent, FormSubmission, AuditLog } from '../types';

export const THEME_PRESETS: ThemeConfig[] = [
  {
    id: 'onyx-minimal',
    name: 'Onyx Minimal',
    backgroundType: 'solid',
    bgColor: '#09090b',
    textColor: '#f4f4f5',
    subtitleColor: '#a1a1aa',
    cardBg: '#18181b',
    cardBorder: '#27272a',
    cardTextColor: '#fafafa',
    cardSubtitleColor: '#a1a1aa',
    cardShadow: 'sm',
    cardRadius: 'md',
    cardStyle: 'solid',
    fontDisplay: 'Syne',
    fontBody: 'Plus Jakarta Sans',
    buttonHoverAnimation: 'scale',
    accentColor: '#ffffff',
    animeEntrancePreset: 'springPop',
    animeMicroInteractions: true,
  },
  {
    id: 'nordic-clean',
    name: 'Nordic Clean',
    backgroundType: 'solid',
    bgColor: '#f8fafc',
    textColor: '#0f172a',
    subtitleColor: '#64748b',
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    cardTextColor: '#0f172a',
    cardSubtitleColor: '#64748b',
    cardShadow: 'sm',
    cardRadius: 'md',
    cardStyle: 'outline',
    fontDisplay: 'Plus Jakarta Sans',
    fontBody: 'Plus Jakarta Sans',
    buttonHoverAnimation: 'lift',
    accentColor: '#0f172a',
    animeEntrancePreset: 'cinematicGlide',
    animeMicroInteractions: true,
  },
  {
    id: 'editorial-fraunces',
    name: 'Editorial Cream',
    backgroundType: 'solid',
    bgColor: '#fbf9f5',
    textColor: '#1c1917',
    subtitleColor: '#78716c',
    cardBg: '#ffffff',
    cardBorder: '#e7e5e4',
    cardTextColor: '#1c1917',
    cardSubtitleColor: '#78716c',
    cardShadow: 'none',
    cardRadius: 'sm',
    cardStyle: 'outline',
    fontDisplay: 'Fraunces',
    fontBody: 'Plus Jakarta Sans',
    buttonHoverAnimation: 'lift',
    accentColor: '#78350f',
    animeEntrancePreset: 'backZoom',
    animeMicroInteractions: true,
  },
  {
    id: 'midnight-indigo',
    name: 'Midnight Indigo',
    backgroundType: 'gradient',
    bgColor: '#080d1a',
    bgGradient: 'linear-gradient(135deg, #090e1a 0%, #111a33 100%)',
    textColor: '#f8fafc',
    subtitleColor: '#94a3b8',
    cardBg: '#131e38',
    cardBorder: '#1e2f57',
    cardTextColor: '#ffffff',
    cardSubtitleColor: '#94a3b8',
    cardShadow: 'colored',
    cardRadius: 'lg',
    cardStyle: 'glass',
    fontDisplay: 'Syne',
    fontBody: 'Plus Jakarta Sans',
    buttonHoverAnimation: 'glow',
    accentColor: '#6366f1',
    animeEntrancePreset: 'elasticWave',
    animeMicroInteractions: true,
  },
  {
    id: 'botanical-sage',
    name: 'Botanical Forest',
    backgroundType: 'solid',
    bgColor: '#061a14',
    textColor: '#ecfdf5',
    subtitleColor: '#6ee7b7',
    cardBg: '#0b2920',
    cardBorder: '#134e3e',
    cardTextColor: '#f0fdf4',
    cardSubtitleColor: '#a7f3d0',
    cardShadow: 'sm',
    cardRadius: 'md',
    cardStyle: 'solid',
    fontDisplay: 'Syne',
    fontBody: 'Plus Jakarta Sans',
    buttonHoverAnimation: 'scale',
    accentColor: '#10b981',
    animeEntrancePreset: 'kineticDrop',
    animeMicroInteractions: true,
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Terracotta',
    backgroundType: 'gradient',
    bgColor: '#171114',
    bgGradient: 'linear-gradient(145deg, #1c1319 0%, #2b1720 100%)',
    textColor: '#fff1f2',
    subtitleColor: '#fda4af',
    cardBg: '#2c1822',
    cardBorder: '#4a2638',
    cardTextColor: '#ffffff',
    cardSubtitleColor: '#fbcfe8',
    cardShadow: 'colored',
    cardRadius: 'full',
    cardStyle: 'solid',
    fontDisplay: 'Syne',
    fontBody: 'Plus Jakarta Sans',
    buttonHoverAnimation: 'lift',
    accentColor: '#f43f5e',
    animeEntrancePreset: 'springPop',
    animeMicroInteractions: true,
  }
];

export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'prof-alexvance',
    username: 'alexvance',
    displayName: 'Alex Vance',
    bio: 'Photographer & Visual Director. Exploring natural light, analog emulsions, and cinematic moments worldwide.',
    avatarUrl: '', // Uses SVG avatar fallback
    category: 'Creator & Photographer',
    verified: true,
    status: 'published',
    publishedVersion: 14,
    directLinkMode: false,
    socialPosition: 'top',
    socialLinks: [
      { id: 'soc-1', platform: 'instagram', url: 'https://instagram.com/alexvance', active: true },
      { id: 'soc-2', platform: 'youtube', url: 'https://youtube.com/@alexvance', active: true },
      { id: 'soc-3', platform: 'twitter', url: 'https://twitter.com/alexvance', active: true },
      { id: 'soc-4', platform: 'spotify', url: 'https://open.spotify.com/user/alexvance', active: true },
      { id: 'soc-5', platform: 'email', url: 'mailto:alex@vancestudio.co', active: true },
    ],
    theme: THEME_PRESETS[0], // Onyx Minimal
    tabs: [
      {
        id: 'tab-main',
        title: 'Featured',
        slug: 'featured',
        position: 0,
        blocks: [
          {
            id: 'blk-yt',
            type: 'media',
            title: '2026 Reel: Scandinavian Coastline',
            position: 0,
            isHidden: false,
            clicks: 412,
            payload: {
              mediaType: 'video',
              url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
              caption: 'Shot on 16mm & Alexa Mini LF • Lofoten Archipelago',
              aspectRatio: '16:9'
            }
          },
          {
            id: 'blk-presets',
            type: 'link',
            title: 'Master Preset Pack Vol. 4',
            position: 1,
            isHidden: false,
            clicks: 894,
            animation: 'pulseGlow',
            animationConfig: {
              effect: 'pulseGlow',
              hoverEffect: 'magneticLift',
              clickEffect: 'rippleWave',
              speed: 'normal',
              intensity: 'medium'
            },
            payload: {
              url: 'https://gumroad.com/l/alex-presets',
              subtitle: '18 film simulations & Lightroom desktop/mobile profiles',
              highlightBadge: 'Popular',
              animation: 'pulseGlow',
              openInNewTab: true
            }
          },
          {
            id: 'blk-print',
            type: 'link',
            title: 'Limited Edition Fine Art Prints',
            position: 2,
            isHidden: false,
            clicks: 340,
            animation: 'rubberBand',
            animationConfig: {
              effect: 'rubberBand',
              hoverEffect: 'tilt3d',
              clickEffect: 'confettiBurst',
              speed: 'normal',
              intensity: 'medium'
            },
            payload: {
              url: 'https://shop.vancestudio.co/prints',
              subtitle: 'Archival Hahnemühle cotton rag, signed & numbered edition of 50',
              highlightBadge: 'New Release',
              animation: 'rubberBand',
              openInNewTab: true
            }
          },
          {
            id: 'blk-folder-projects',
            type: 'folder',
            title: 'Client Galleries & Case Studies',
            position: 3,
            isHidden: false,
            clicks: 215,
            animation: 'floating',
            animationConfig: {
              effect: 'floating',
              hoverEffect: 'magneticLift',
              clickEffect: 'shockwave',
              speed: 'normal',
              intensity: 'subtle'
            },
            payload: {
              description: 'Select editorial, architectural, and commercial client assignments.',
              items: [
                { id: 'fold-1', title: 'Vogue Scandinavia – Winter Solstice', url: 'https://vancestudio.co/vogue', subtitle: 'Editorial spread' },
                { id: 'fold-2', title: 'Polestar 4 – Alpine Road Series', url: 'https://vancestudio.co/polestar', subtitle: 'Automotive campaign' },
                { id: 'fold-3', title: 'Reykjavik Architectural Pavilions', url: 'https://vancestudio.co/reykjavik', subtitle: 'Spatial documentary' },
              ]
            }
          },
          {
            id: 'blk-newsletter',
            type: 'form',
            title: 'Join The Frame Letter',
            position: 4,
            isHidden: false,
            clicks: 182,
            animation: 'heartbeat',
            animationConfig: {
              effect: 'heartbeat',
              hoverEffect: 'glowSurge',
              clickEffect: 'confettiBurst',
              speed: 'normal',
              intensity: 'medium'
            },
            payload: {
              formType: 'newsletter',
              description: 'Weekly dispatches on light, gear experiments, and creative independence. No spam ever.',
              fields: [
                { id: 'f-email', label: 'Email address', type: 'email', placeholder: 'you@domain.com', required: true },
                { id: 'f-name', label: 'First name', type: 'text', placeholder: 'Alex', required: false }
              ],
              submitButtonText: 'Subscribe',
              successMessage: "You're on the list! Check your inbox for the welcome pack.",
              consentText: 'I agree to receive occasional emails about new tutorials and print releases.'
            }
          },
          {
            id: 'blk-mediakit',
            type: 'file',
            title: 'Official Media Kit & Rate Card 2026',
            position: 5,
            isHidden: false,
            clicks: 98,
            animation: 'springBounce',
            animationConfig: {
              effect: 'springBounce',
              hoverEffect: 'magneticLift',
              clickEffect: 'squashPop',
              speed: 'normal',
              intensity: 'medium'
            },
            payload: {
              fileName: 'AlexVance_MediaKit_2026.pdf',
              fileSize: '4.2 MB',
              fileUrl: '#',
              description: 'Audience demographics, past brand partners, and commercial rates',
              downloadCount: 98
            }
          },
          {
            id: 'blk-faq',
            type: 'faq',
            title: 'Frequently Asked Questions',
            position: 6,
            isHidden: false,
            clicks: 64,
            payload: {
              items: [
                { id: 'faq-1', question: 'What camera setup do you primarily shoot with?', answer: 'Leica M11 with Summilux 35mm f/1.4 for stills, and Sony FX3 / Alexa Mini LF for cinema projects.' },
                { id: 'faq-2', question: 'Are you available for international commissions?', answer: 'Yes, based in San Francisco and available worldwide. Commercial inquiries can be sent to booking@vancestudio.co.' },
                { id: 'faq-3', question: 'Do the presets work on mobile Lightroom?', answer: 'Yes, both .XMP desktop files and .DNG mobile-friendly files are included with step-by-step setup guides.' }
              ]
            }
          },
          {
            id: 'blk-gallery-demo',
            type: 'gallery',
            title: 'Selected Frames',
            position: 7,
            isHidden: false,
            clicks: 0,
            payload: {
              columns: 2,
              items: [
                { id: 'gallery-demo-1', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200', title: 'Editorial light', alt: 'Editorial portrait in natural light' },
                { id: 'gallery-demo-2', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200', title: 'Studio study', alt: 'Studio fashion portrait' },
                { id: 'gallery-demo-3', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200', title: 'Coastal palette', alt: 'Warm coastal portrait' },
                { id: 'gallery-demo-4', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200', title: 'Material notes', alt: 'Fashion details and materials' }
              ]
            }
          },
          {
            id: 'blk-carousel-demo',
            type: 'carousel',
            title: 'Campaign Stories',
            position: 8,
            isHidden: false,
            clicks: 0,
            payload: {
              autoplay: false,
              items: [
                { id: 'carousel-demo-1', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200', title: 'Campaign 01' },
                { id: 'carousel-demo-2', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1200', title: 'Campaign 02' }
              ]
            }
          },
          {
            id: 'blk-product-demo',
            type: 'product',
            title: 'Film Preset Pack Vol. 4',
            position: 9,
            isHidden: false,
            clicks: 0,
            payload: {
              image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?w=1200',
              description: '18 film simulations and Lightroom profiles for natural light.',
              price: '48',
              currency: 'USD',
              url: 'https://gumroad.com',
              buttonLabel: 'Explore pack'
            }
          },
          {
            id: 'blk-email-demo',
            type: 'emailSignup',
            title: 'Join The Frame Letter',
            position: 10,
            isHidden: false,
            clicks: 0,
            payload: {
              formType: 'newsletter',
              description: 'A monthly dispatch of creative process, new work, and field notes.',
              fields: [{ id: 'demo-email', label: 'Email address', type: 'email', placeholder: 'you@domain.com', required: true }],
              submitButtonText: 'Subscribe',
              successMessage: 'You are on the list.',
              consentText: 'I agree to receive occasional updates.',
              subscriberMode: true
            }
          }
        ]
      },
      {
        id: 'tab-workshops',
        title: 'Workshops',
        slug: 'workshops',
        position: 1,
        blocks: [
          {
            id: 'blk-ws-1',
            type: 'link',
            title: 'Lofoten Islands Winter Expedition 2027',
            position: 0,
            isHidden: false,
            clicks: 310,
            payload: {
              url: 'https://vancestudio.co/lofoten-2027',
              subtitle: '7-day intimate landscape & aurora masterclass (Limited to 6 photographers)',
              highlightBadge: '2 Spots Left',
              animation: 'pulse',
              openInNewTab: true
            }
          },
          {
            id: 'blk-testimonial-1',
            type: 'testimonial',
            title: 'What past students say',
            position: 1,
            isHidden: false,
            clicks: 45,
            payload: {
              quote: 'Alex changed how I see natural composition. The 1-on-1 critiques alone were worth 5 times the cost of the trip.',
              authorName: 'Marcus Lindholm',
              authorRole: 'Senior Art Director',
              company: 'Nordic Creative Co',
              rating: 5
            }
          }
        ]
      }
    ],
    customDomain: {
      domain: 'links.alexvance.me',
      status: 'verified',
      sslStatus: 'active',
      cnameTarget: 'cname.lynkflow.io',
      expectedIp: '76.76.21.21',
      lastCheckedAt: '2026-09-27T18:30:00Z'
    },
    qrConfig: {
      fgColor: '#ffffff',
      bgColor: '#09090b',
      pattern: 'dots',
      showLogo: true,
      dynamicTargetUrl: 'https://lynkflow.me/alexvance'
    },
    seo: {
      title: 'Alex Vance | Visual Director & Photographer',
      description: 'Official portfolio, presets, workshop dates, and media kit for photographer Alex Vance.',
      noIndex: false
    },
    createdAt: '2026-01-15T10:00:00Z',
    updatedAt: '2026-09-28T07:15:00Z',
    publishedAt: '2026-09-28T07:15:00Z'
  },
  {
    id: 'prof-studionova',
    username: 'studionova_agency',
    displayName: 'Studio Nova',
    bio: 'Independent typography & brand system studio in Zurich. Defining modern visual identities for ambitious companies.',
    avatarUrl: '',
    category: 'Design Agency & Studio',
    verified: true,
    status: 'published',
    publishedVersion: 8,
    directLinkMode: false,
    socialPosition: 'top',
    socialLinks: [
      { id: 'soc-sn-1', platform: 'instagram', url: 'https://instagram.com/studionova', active: true },
      { id: 'soc-sn-2', platform: 'twitter', url: 'https://x.com/studionova', active: true },
      { id: 'soc-sn-3', platform: 'github', url: 'https://github.com/studionova', active: true },
      { id: 'soc-sn-4', platform: 'email', url: 'mailto:hello@studionova.design', active: true }
    ],
    theme: THEME_PRESETS[1], // Nordic Clean
    tabs: [
      {
        id: 'tab-sn-main',
        title: 'Studio',
        slug: 'studio',
        position: 0,
        blocks: [
          {
            id: 'blk-sn-lead',
            type: 'form',
            title: 'Project Intake & Discovery',
            position: 0,
            isHidden: false,
            clicks: 142,
            payload: {
              formType: 'lead',
              description: 'We are currently accepting branding and type design commissions for Q4 2026.',
              fields: [
                { id: 'sn-f-name', label: 'Your name / company', type: 'text', placeholder: 'Acme Corp', required: true },
                { id: 'sn-f-email', label: 'Work email', type: 'email', placeholder: 'lead@company.com', required: true },
                { id: 'sn-f-budget', label: 'Estimated budget range ($)', type: 'text', placeholder: '$15k - $50k+', required: true },
                { id: 'sn-f-details', label: 'Brief overview of scope', type: 'textarea', placeholder: 'Brand identity, custom display font, guidelines...', required: false }
              ],
              submitButtonText: 'Submit Discovery Inquiry',
              successMessage: 'Thank you! Our studio director will reply with our credentials deck within 24 hours.'
            }
          },
          {
            id: 'blk-sn-case',
            type: 'link',
            title: '2026 Monograph & Case Studies',
            position: 1,
            isHidden: false,
            clicks: 520,
            payload: {
              url: 'https://studionova.design/monograph',
              subtitle: '12 complete identity systems designed between 2024–2026',
              highlightBadge: 'Archive',
              animation: 'none'
            }
          },
          {
            id: 'blk-sn-type',
            type: 'link',
            title: 'Nova Grotesk Font Family',
            position: 2,
            isHidden: false,
            clicks: 760,
            payload: {
              url: 'https://studionova.design/typefaces/nova-grotesk',
              subtitle: '16 weights with optical italics and variable font masters',
              highlightBadge: 'Commercial License',
              animation: 'lift' as any
            }
          }
        ]
      }
    ],
    qrConfig: {
      fgColor: '#0f172a',
      bgColor: '#ffffff',
      pattern: 'square',
      showLogo: true,
      dynamicTargetUrl: 'https://lynkflow.me/studionova_agency'
    },
    seo: {
      title: 'Studio Nova | Brand Systems & Typography',
      description: 'Zurich-based design consultancy specializing in identity systems, typography, and creative strategy.',
      noIndex: false
    },
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-09-25T14:20:00Z',
    publishedAt: '2026-09-25T14:20:00Z'
  },
  {
    id: 'prof-mayakitchen',
    username: 'mayakitchen',
    displayName: 'Chef Maya Lin',
    bio: 'Pastry chef, recipe developer, and host of "Sugar & Flour". Seasonal French techniques made approachable.',
    avatarUrl: '',
    category: 'Culinary & Hospitality',
    verified: true,
    status: 'published',
    publishedVersion: 11,
    directLinkMode: false,
    socialPosition: 'top',
    socialLinks: [
      { id: 'soc-mk-1', platform: 'instagram', url: 'https://instagram.com/mayakitchen', active: true },
      { id: 'soc-mk-2', platform: 'youtube', url: 'https://youtube.com/@mayakitchen', active: true },
      { id: 'soc-mk-3', platform: 'tiktok', url: 'https://tiktok.com/@mayakitchen', active: true }
    ],
    theme: THEME_PRESETS[2], // Editorial Cream
    tabs: [
      {
        id: 'tab-mk-main',
        title: 'Recipes & Books',
        slug: 'recipes',
        position: 0,
        blocks: [
          {
            id: 'blk-mk-book',
            type: 'link',
            title: 'Pre-Order My New Cookbook: "The Art of Lamination"',
            position: 0,
            isHidden: false,
            clicks: 1430,
            payload: {
              url: 'https://amazon.com/dp/art-of-lamination',
              subtitle: 'Hardcover edition with 80 step-by-step master recipes and photography',
              highlightBadge: 'Bestseller',
              animation: 'shimmer'
            }
          },
          {
            id: 'blk-mk-guide',
            type: 'file',
            title: 'Free Sourdough Croissant Troubleshooting Guide',
            position: 1,
            isHidden: false,
            clicks: 680,
            payload: {
              fileName: 'MayaLin_CroissantTroubleshooting.pdf',
              fileSize: '3.1 MB',
              fileUrl: '#',
              description: 'Butter temp charts, proofing schedules, and crumb structure troubleshooting',
              downloadCount: 680
            }
          }
        ]
      }
    ],
    qrConfig: {
      fgColor: '#78350f',
      bgColor: '#fbf9f5',
      pattern: 'rounded',
      showLogo: true,
      dynamicTargetUrl: 'https://lynkflow.me/mayakitchen'
    },
    seo: {
      title: 'Chef Maya Lin | Recipes & Pastry Masterclasses',
      description: 'Order "The Art of Lamination", download free pastry guides, and find seasonal baking recipes.',
      noIndex: false
    },
    createdAt: '2026-04-10T12:00:00Z',
    updatedAt: '2026-09-26T16:00:00Z',
    publishedAt: '2026-09-26T16:00:00Z'
  }
];

export const INITIAL_WORKSPACE: Workspace = {
  id: 'ws-main',
  name: "Samir's Studio Workspace",
  plan: 'pro',
  billingCycle: 'annual',
  trialEndsAt: '2026-10-12T00:00:00Z',
  status: 'trialing',
  currentPeriodStart: '2026-09-28T00:00:00Z',
  currentPeriodEnd: '2027-09-28T00:00:00Z',
  providerCustomerId: 'cus_sample_samir',
  providerSubscriptionId: 'sub_sample_pro_annual',
  profiles: ['prof-alexvance', 'prof-studionova', 'prof-mayakitchen'],
  brandKit: {
    id: 'brand-kit-main',
    name: 'Workspace Brand Kit',
    primaryColor: '#111827',
    secondaryColor: '#64748B',
    accentColor: '#6366F1',
    latinFont: 'Inter, ui-sans-serif, system-ui, sans-serif',
    arabicFont: 'Noto Kufi Arabic, Tahoma, sans-serif',
    buttonStyle: 'filled',
    imageStyle: 'rounded',
    socialIconStyle: 'minimal',
    updatedAt: '2026-09-29T00:00:00Z'
  },
  invoices: [
    {
      id: 'inv-1084',
      date: '28 Sep 2026',
      amount: '$84.00',
      plan: 'Pro Plan (Annual - 14 Day Trial Active)',
      status: 'pending',
      billingPeriodStart: '2026-09-28T00:00:00Z',
      billingPeriodEnd: '2027-09-28T00:00:00Z',
      pdfUrl: '#'
    },
    {
      id: 'inv-1032',
      date: '28 Sep 2025',
      amount: '$0.00',
      plan: 'Starter Free Tier',
      status: 'paid',
      billingPeriodStart: '2025-09-28T00:00:00Z',
      billingPeriodEnd: '2026-09-28T00:00:00Z',
      pdfUrl: '#'
    }
  ]
};

export const INITIAL_ANALYTICS: AnalyticsEvent[] = [
  // Generate realistic events over the past 7 days
  ...Array.from({ length: 48 }, (_, i) => ({
    id: `ev-pv-${i}`,
    profileId: 'prof-alexvance',
    type: 'page_view' as const,
    timestamp: Date.now() - (i * 3.5 * 3600 * 1000),
    referrer: ['Instagram', 'YouTube', 'Twitter/X', 'Direct', 'TikTok', 'Google'][i % 6],
    country: ['United States', 'United Kingdom', 'Germany', 'Canada', 'France', 'Japan', 'Australia'][i % 7],
    device: (i % 3 === 0 ? 'desktop' : i % 3 === 1 ? 'mobile' : 'tablet') as 'mobile' | 'desktop' | 'tablet',
    campaign: i % 4 === 0 ? 'autumn_reel_launch' : undefined
  })),
  ...Array.from({ length: 26 }, (_, i) => ({
    id: `ev-bc-${i}`,
    profileId: 'prof-alexvance',
    type: 'block_click' as const,
    blockId: ['blk-presets', 'blk-yt', 'blk-print', 'blk-mediakit'][i % 4],
    tabId: 'tab-main',
    timestamp: Date.now() - (i * 6 * 3600 * 1000),
    referrer: ['Instagram', 'YouTube', 'Twitter/X', 'Direct'][i % 4],
    country: ['United States', 'United Kingdom', 'Germany', 'Canada'][i % 4],
    device: (i % 2 === 0 ? 'mobile' : 'desktop') as 'mobile' | 'desktop'
  })),
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `ev-qr-${i}`,
    profileId: 'prof-alexvance',
    type: 'qr_scan' as const,
    timestamp: Date.now() - (i * 18 * 3600 * 1000),
    referrer: 'Print Gallery Card',
    country: 'United States',
    device: 'mobile' as const
  }))
];

export const INITIAL_SUBMISSIONS: FormSubmission[] = [
  {
    id: 'sub-1',
    profileId: 'prof-alexvance',
    blockId: 'blk-newsletter',
    formTitle: 'Join The Frame Letter',
    formType: 'newsletter',
    responderEmail: 'elena.rostova@berlinarts.de',
    responderName: 'Elena',
    data: {
      'Email address': 'elena.rostova@berlinarts.de',
      'First name': 'Elena'
    },
    timestamp: Date.now() - 1000 * 60 * 45,
    consentGiven: true,
    status: 'verified',
    subscriberCreated: true
  },
  {
    id: 'sub-2',
    profileId: 'prof-alexvance',
    blockId: 'blk-newsletter',
    formTitle: 'Join The Frame Letter',
    formType: 'newsletter',
    responderEmail: 'julian.k@monocle.ch',
    responderName: 'Julian',
    data: {
      'Email address': 'julian.k@monocle.ch',
      'First name': 'Julian'
    },
    timestamp: Date.now() - 1000 * 60 * 180,
    consentGiven: true,
    status: 'verified',
    subscriberCreated: true
  },
  {
    id: 'sub-3',
    profileId: 'prof-studionova',
    blockId: 'blk-sn-lead',
    formTitle: 'Project Intake & Discovery',
    formType: 'lead',
    responderEmail: 'marcus@valtoria-energy.com',
    responderName: 'Valtoria Clean Energy Ltd',
    data: {
      'Your name / company': 'Valtoria Clean Energy Ltd',
      'Work email': 'marcus@valtoria-energy.com',
      'Estimated budget range ($)': '$35,000',
      'Brief overview of scope': 'Complete rebrand, custom wordmark font, and design system for series-B expansion.'
    },
    timestamp: Date.now() - 1000 * 3600 * 12,
    consentGiven: true,
    status: 'verified',
    subscriberCreated: true
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    actor: 'SamirMagdy80@gmail.com',
    action: 'profile_published',
    target: '@alexvance',
    timestamp: Date.now() - 1000 * 60 * 12,
    details: 'Published version 14 with 7 live blocks'
  },
  {
    id: 'aud-2',
    actor: 'SamirMagdy80@gmail.com',
    action: 'theme_updated',
    target: '@alexvance',
    timestamp: Date.now() - 1000 * 60 * 40,
    details: 'Applied Onyx Minimal theme tokens'
  },
  {
    id: 'aud-3',
    actor: 'SamirMagdy80@gmail.com',
    action: 'domain_verified',
    target: 'links.alexvance.me',
    timestamp: Date.now() - 1000 * 3600 * 24,
    details: 'CNAME verified and SSL certificate provisioned successfully'
  }
];
