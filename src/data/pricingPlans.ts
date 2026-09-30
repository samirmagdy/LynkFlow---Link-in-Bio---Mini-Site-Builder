import { PlanType, BillingCycle } from '../types';

export interface PricingPlanConfig {
  id: PlanType;
  name: string;
  badge?: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  annualBilledTotal: number;
  currency: string;
  ctaText: string;
  ctaAction: 'start_trial' | 'current_plan' | 'create_page';
  features: string[];
  capabilities: {
    maxProfiles: number | 'Unlimited';
    customDomains: boolean;
    freeSsl: boolean;
    leadForms: boolean;
    analyticsHistoryDays: number;
    vectorQrStudio: boolean;
    customThemes: boolean;
    tokenDesignStudio: boolean;
    teamMembers: number;
    restApiWebhooks: boolean;
    removeBranding: boolean;
    slaSupport: string;
  };
}

export const PRICING_PLANS: PricingPlanConfig[] = [
  {
    id: 'free',
    name: 'Starter',
    tagline: 'Personal bio link presence',
    description: 'Essential link-in-bio presence for aspiring creators and hobbyists.',
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    annualBilledTotal: 0,
    currency: '$',
    ctaText: 'Start for Free',
    ctaAction: 'create_page',
    features: [
      '1 Active Public Profile',
      'Standard Link, Text & Divider Blocks',
      '3 Spec-Compliant Minimal Themes',
      '7-Day Privacy-First Analytics',
      'Standard LynkFlow Subdomain (lynkflow.me/handle)'
    ],
    capabilities: {
      maxProfiles: 1,
      customDomains: false,
      freeSsl: false,
      leadForms: false,
      analyticsHistoryDays: 7,
      vectorQrStudio: false,
      customThemes: false,
      tokenDesignStudio: false,
      teamMembers: 1,
      restApiWebhooks: false,
      removeBranding: false,
      slaSupport: 'Community Support'
    }
  },
  {
    id: 'pro',
    name: 'Creator Pro',
    badge: 'Most Popular',
    tagline: 'High-converting mini-sites',
    description: 'Everything solo creators, influencers, and artists need to monetize and capture leads.',
    monthlyPrice: 9,
    annualMonthlyPrice: 7,
    annualBilledTotal: 84,
    currency: '$',
    ctaText: 'Start 14-Day Free Trial',
    ctaAction: 'start_trial',
    features: [
      'Up to 3 Managed Profiles',
      'Lead Generation & Newsletter Intake Forms',
      'Full Rich Embeds (YouTube, Spotify, Media Kits)',
      'Theme Studio with WCAG AA Token Validation',
      'Dynamic Vector QR Code Studio with Target Retargeting',
      'Custom Domain Connection with Free Automated SSL',
      '365-Day Privacy-First Analytics & CSV Data Export',
      'Remove LynkFlow Platform Branding'
    ],
    capabilities: {
      maxProfiles: 3,
      customDomains: true,
      freeSsl: true,
      leadForms: true,
      analyticsHistoryDays: 365,
      vectorQrStudio: true,
      customThemes: true,
      tokenDesignStudio: true,
      teamMembers: 1,
      restApiWebhooks: false,
      removeBranding: true,
      slaSupport: 'Email Support (24h)'
    }
  },
  {
    id: 'agency',
    name: 'Agency Studio',
    badge: 'For Teams',
    tagline: 'Multi-client management',
    description: 'For design agencies, talent managers, and teams operating client profile portfolios.',
    monthlyPrice: 24,
    annualMonthlyPrice: 19,
    annualBilledTotal: 228,
    currency: '$',
    ctaText: 'Upgrade to Agency',
    ctaAction: 'start_trial',
    features: [
      'Up to 10 Managed Client Profiles',
      'Multi-Profile Workspace with Instant Switching',
      'Profile Duplication & Custom Theme Presets Export',
      'Developer REST API & Outbound Webhook Subscriptions',
      'Granular Team Member Roles & Tenant Isolation',
      'Dedicated Priority SLA & White-Glove Onboarding'
    ],
    capabilities: {
      maxProfiles: 10,
      customDomains: true,
      freeSsl: true,
      leadForms: true,
      analyticsHistoryDays: 730,
      vectorQrStudio: true,
      customThemes: true,
      tokenDesignStudio: true,
      teamMembers: 5,
      restApiWebhooks: true,
      removeBranding: true,
      slaSupport: 'Priority Dedicated SLA (2h)'
    }
  }
];

export interface CapabilityMatrixRow {
  category: string;
  capability: string;
  description: string;
  starter: string | boolean;
  pro: string | boolean;
  agency: string | boolean;
}

export const CAPABILITY_COMPARISON_MATRIX: CapabilityMatrixRow[] = [
  {
    category: 'Core Builder',
    capability: 'Managed Profiles',
    description: 'Number of active published handles in your workspace',
    starter: '1 Profile',
    pro: '3 Profiles',
    agency: '10 Profiles'
  },
  {
    category: 'Core Builder',
    capability: 'Drag-and-Drop Blocks',
    description: 'Links, text, embeds, media, and dividers',
    starter: true,
    pro: true,
    agency: true
  },
  {
    category: 'Core Builder',
    capability: 'Lead & Contact Forms',
    description: 'Capture email subscribers and client inquiries into inbox',
    starter: false,
    pro: true,
    agency: true
  },
  {
    category: 'Design & Themes',
    capability: 'Token Theme Studio',
    description: 'Full control of typography, shapes, elevation, and motion',
    starter: '3 Presets',
    pro: 'Full Token Studio',
    agency: 'Custom Presets & Export'
  },
  {
    category: 'Design & Themes',
    capability: 'WCAG AA A11y Gatekeeper',
    description: 'Real-time contrast calculation and publish blocking',
    starter: true,
    pro: true,
    agency: true
  },
  {
    category: 'Design & Themes',
    capability: 'Remove Platform Badge',
    description: 'Hide the LynkFlow footer badge on your public page',
    starter: false,
    pro: true,
    agency: true
  },
  {
    category: 'Growth & Distribution',
    capability: 'Dynamic Vector QR Studio',
    description: 'Custom styled QR codes with permanent redirect targets',
    starter: 'Static Subdomain',
    pro: 'Vector + Live Retarget',
    agency: 'Vector + Live Retarget'
  },
  {
    category: 'Growth & Distribution',
    capability: 'Custom Domain + Free SSL',
    description: 'Bring your own root or subdomain with automated TLS',
    starter: false,
    pro: true,
    agency: true
  },
  {
    category: 'Analytics',
    capability: 'Analytics Retention',
    description: 'Historical view and click log duration',
    starter: '7 Days',
    pro: '365 Days',
    agency: '2 Years (730 Days)'
  },
  {
    category: 'Analytics',
    capability: 'Cookie-less Privacy Architecture',
    description: 'GDPR / CCPA compliant by design without third-party tracking',
    starter: true,
    pro: true,
    agency: true
  },
  {
    category: 'Developer & Team',
    capability: 'REST API & Webhooks',
    description: 'Programmatic access to profiles, blocks, and submissions',
    starter: false,
    pro: false,
    agency: true
  },
  {
    category: 'Developer & Team',
    capability: 'Support Level',
    description: 'Service level agreement response time',
    starter: 'Community',
    pro: '24h Email',
    agency: '2h Priority Dedicated'
  }
];

export function formatPlanPrice(plan: PricingPlanConfig, cycle: BillingCycle): string {
  if (plan.monthlyPrice === 0) return '$0';
  const price = cycle === 'annual' ? plan.annualMonthlyPrice : plan.monthlyPrice;
  return `${plan.currency}${price}`;
}
