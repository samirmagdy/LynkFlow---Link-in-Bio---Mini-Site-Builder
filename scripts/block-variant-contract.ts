import { BLOCK_VARIANT_REGISTRY } from '../src/utils/blockVariantRegistry';

const expected = {
  link: ['solid', 'outline', 'soft-card', 'glass', 'image-card', 'split-media-card', 'compact-list', 'service-card', 'product-card', 'booking-card', 'whatsapp-cta', 'download-card'],
  media: ['rounded', 'full-bleed', 'polaroid', 'editorial-crop', 'masonry', 'horizontal-carousel', 'before-after', 'caption'],
  text: ['intro', 'section-heading', 'quote', 'announcement', 'editorial', 'highlight', 'marquee'],
  business: ['booking', 'services', 'testimonials', 'faq', 'contact', 'lead-form', 'newsletter', 'product-catalogue', 'pricing', 'location']
} as const;
const requiredStates = ['hover', 'focus', 'pressed', 'loading', 'error'] as const;
const failures: string[] = [];

for (const [group, ids] of Object.entries(expected)) {
  for (const id of ids) {
    const definition = BLOCK_VARIANT_REGISTRY.find(candidate => candidate.id === id);
    if (!definition) {
      failures.push(`${group}/${id}: definition missing`);
      continue;
    }
    if (!definition.supportedBlockTypes.length) failures.push(`${id}: supported block types missing`);
    if (!definition.responsiveRules.mobile || !definition.responsiveRules.desktop) failures.push(`${id}: mobile/desktop responsive rules missing`);
    for (const state of requiredStates) {
      if (!(state in definition.interactionRules)) failures.push(`${id}: ${state} interaction state missing`);
    }
  }
}

const duplicateIds = BLOCK_VARIANT_REGISTRY.map(definition => definition.id).filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length) failures.push(`duplicate variant ids: ${[...new Set(duplicateIds)].join(', ')}`);

console.log(`Block variant contract: ${BLOCK_VARIANT_REGISTRY.length} definitions`);
if (failures.length) {
  failures.forEach(failure => console.error(`[variant] ${failure}`));
  process.exit(1);
}
console.log('Block variant contract: all required states and variant definitions passed');
