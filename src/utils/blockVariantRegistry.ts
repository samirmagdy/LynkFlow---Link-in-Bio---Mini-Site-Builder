type BlockVariantState = 'mobile' | 'desktop' | 'hover' | 'focus' | 'pressed' | 'loading' | 'error';

export interface BlockVariantDefinition {
  id: string;
  supportedBlockTypes: string[];
  tokens: Record<string, string>;
  responsiveRules: Record<string, unknown>;
  interactionRules: Record<string, unknown>;
}

const definitions: BlockVariantDefinition[] = [
  ...[
    ['solid', 'Solid CTA'], ['outline', 'Outline'], ['soft-card', 'Soft card'], ['glass', 'Glass card'],
    ['image-card', 'Image card'], ['split-media-card', 'Split media card'], ['compact-list', 'Compact list item'],
    ['service-card', 'Service card'], ['product-card', 'Product card'], ['booking-card', 'Booking card'],
    ['whatsapp-cta', 'WhatsApp CTA'], ['download-card', 'Download card']
  ].map(([id, label]) => ({
    id,
    supportedBlockTypes: ['link', 'product', 'file', 'contact'],
    tokens: { label },
    responsiveRules: { mobile: { width: 'full', minHeight: '44px' }, desktop: { width: 'full' } },
    interactionRules: { hover: 'preserve-focus', focus: 'visible-ring', pressed: 'reduced-scale', loading: 'preserve-height', error: 'inline-message' }
  })),
  ...[
    ['rounded', 'Rounded image'], ['full-bleed', 'Full bleed'], ['polaroid', 'Polaroid'], ['editorial-crop', 'Editorial crop'],
    ['masonry', 'Masonry'], ['horizontal-carousel', 'Horizontal carousel'], ['before-after', 'Before/after'], ['caption', 'Image with caption']
  ].map(([id, label]) => ({
    id,
    supportedBlockTypes: ['media', 'gallery', 'carousel'],
    tokens: { label },
    responsiveRules: { mobile: { aspectRatio: '1 / 1' }, desktop: { aspectRatio: '1.2 / 1' } },
    interactionRules: { hover: 'preserve-caption', focus: 'visible-ring', pressed: 'none', loading: 'skeleton', error: 'fallback-color' }
  })),
  ...[
    ['intro', 'Intro statement'], ['section-heading', 'Section heading'], ['quote', 'Quote'], ['announcement', 'Announcement'],
    ['editorial', 'Rich editorial text'], ['highlight', 'Highlighted text'], ['marquee', 'Marquee/banner']
  ].map(([id, label]) => ({
    id,
    supportedBlockTypes: ['text'],
    tokens: { label },
    responsiveRules: { mobile: { maxLineLength: '32ch' }, desktop: { maxLineLength: '60ch' } },
    interactionRules: { hover: 'none', focus: 'none', pressed: 'none', loading: 'skeleton', error: 'inline-message' }
  })),
  ...['booking', 'services', 'testimonials', 'faq', 'contact', 'lead-form', 'newsletter', 'product-catalogue', 'pricing', 'location'].map(id => ({
    id,
    supportedBlockTypes: ['booking', 'service', 'testimonial', 'faq', 'contact', 'form', 'emailSignup', 'product'],
    tokens: { label: id },
    responsiveRules: { mobile: { width: 'full' }, desktop: { width: 'full' } },
    interactionRules: { hover: 'preserve-label', focus: 'visible-ring', pressed: 'pending-state', loading: 'skeleton', error: 'field-message' }
  }))
];

export const BLOCK_VARIANT_REGISTRY = definitions;

export function getBlockVariantDefinition(blockType: string, variantId?: string): BlockVariantDefinition | undefined {
  return definitions.find(definition => definition.id === variantId && definition.supportedBlockTypes.includes(blockType));
}

export function resolveLinkVariant(requested?: string, fallback?: string): string {
  const candidate = requested || fallback || 'solid';
  return getBlockVariantDefinition('link', candidate) ? candidate : 'solid';
}
