import { normalizeTheme, validateThemeSchema } from '../src/utils/themeEngine';

const theme = normalizeTheme({
  id: 'preset-contract', name: 'Contract preset', source: 'custom', presetId: null,
  presetComposition: {
    themeId: 'base-theme', layoutId: 'layout-service', brandKitId: 'brand-agency', starterSiteId: 'creator-portfolio',
    selectedBlockVariants: { link: 'solid' }, includesStarterContent: false, changesContent: false, changesLayout: true
  }
});
const validation = validateThemeSchema(theme);
const composition = theme.presetComposition;
if (!validation.isValid || composition?.themeId !== 'base-theme' || composition.layoutId !== 'layout-service' || composition.brandKitId !== 'brand-agency' || composition.starterSiteId !== 'creator-portfolio' || composition.changesContent !== false) {
  console.error('[preset-composition] normalized composition metadata was not preserved');
  process.exit(1);
}
console.log('Saved-preset composition contract: theme, layout, brand-kit, starter-site and content-change metadata passed');
