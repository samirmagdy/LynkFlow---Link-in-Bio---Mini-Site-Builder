import type { BlockStyleVariant, BlockType } from '../types';

export const BLOCK_STYLE_VARIANTS = {
  link: ['solid', 'outline', 'soft', 'image', 'featured'] as const,
  media: ['framed', 'cinematic', 'full-bleed', 'split', 'captioned'] as const,
  gallery: ['grid', 'bento', 'masonry', 'filmstrip', 'editorial'] as const,
  carousel: ['peek', 'full-bleed', 'card', 'filmstrip', 'editorial'] as const,
  event: ['spotlight', 'compact', 'calendar', 'featured', 'row'] as const,
  product: ['spotlight', 'compact', 'offer', 'service', 'editorial'] as const,
  course: ['spotlight', 'featured', 'editorial', 'stack', 'gated'] as const,
  tip: ['offer', 'compact', 'spotlight', 'conversion', 'benefits'] as const,
  membership: ['spotlight', 'featured', 'offer', 'benefits', 'conversion'] as const,
  text: ['display', 'body', 'quote', 'announcement', 'stat'] as const,
  divider: ['hairline', 'gradient', 'numbered', 'icon', 'spacer'] as const,
  folder: ['accordion', 'directory', 'tabbed', 'nested', 'glass'] as const,
  faq: ['accordion', 'numbered', 'columns', 'featured', 'searchable'] as const,
  testimonial: ['editorial', 'avatar', 'logo', 'rating', 'compact'] as const,
  file: ['download', 'row', 'media-kit', 'stack', 'gated'] as const,
  form: ['card', 'inline', 'split', 'conversational', 'booking'] as const,
  emailSignup: ['inline', 'newsletter', 'conversion', 'editorial', 'benefits'] as const,
  contact: ['email', 'whatsapp', 'phone', 'booking', 'methods'] as const,
} as const satisfies Record<BlockType, readonly string[]>;

export const BLOCK_STYLE_LABELS: Record<string, string> = {
  'media-kit': 'Media kit', 'full-bleed': 'Full bleed', 'soft': 'Soft card',
  'featured': 'Featured', 'bento': 'Bento grid', 'filmstrip': 'Filmstrip',
  'spotlight': 'Spotlight', 'compact': 'Compact', 'announcement': 'Announcement',
  'directory': 'Resource directory', 'numbered': 'Numbered', 'searchable': 'Searchable',
  'conversational': 'Conversational', 'benefits': 'Benefits first',
};

export function getBlockStyleVariants(type: BlockType): readonly string[] {
  return BLOCK_STYLE_VARIANTS[type];
}

export function resolveBlockStyle(type: BlockType, requested?: BlockStyleVariant | string, themeFallback?: string): string {
  const options = BLOCK_STYLE_VARIANTS[type];
  const candidate = requested || themeFallback;
  return candidate && (options as readonly string[]).includes(candidate) ? candidate : options[0];
}
