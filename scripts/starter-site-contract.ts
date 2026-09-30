import { PERSONA_TEMPLATES, composeStarterSiteTheme } from '../src/data/personaTemplates';

const expectedIds = [
  'creator-portfolio',
  'coach-consultant',
  'small-business-shop',
  'music-artist',
  'beauty-service',
  'nonprofit-community',
];

if (PERSONA_TEMPLATES.length !== expectedIds.length) {
  throw new Error(`Expected ${expectedIds.length} starter sites, found ${PERSONA_TEMPLATES.length}.`);
}

const ids = PERSONA_TEMPLATES.map(template => template.id);
if (new Set(ids).size !== ids.length || expectedIds.some(id => !ids.includes(id))) {
  throw new Error('Starter-site IDs must be unique and cover every defined persona.');
}

for (const template of PERSONA_TEMPLATES) {
  if (!template.name || !template.description || !template.category || template.fields.length < 4 || template.blocks.length < 2) {
    throw new Error(`Starter site ${template.id} is missing required content metadata.`);
  }
  const composed = composeStarterSiteTheme(template);
  const composition = composed.presetComposition;
  if (composition?.starterSiteId !== template.id || composition.includesStarterContent !== true || composition.changesContent !== true || composition.changesLayout !== true) {
    throw new Error(`Starter site ${template.id} does not produce explicit composition metadata.`);
  }

  const serialized = JSON.stringify(template);
  if (/example\.com|your-name|your-business|your-release|your-artist-name|hello@example|\$0\.00/i.test(serialized)) {
    throw new Error(`Starter site ${template.id} contains a fake destination or placeholder identity.`);
  }
}

console.log(`Starter-site contract passed: ${PERSONA_TEMPLATES.length} catalog entries with explicit content/theme/layout composition.`);
