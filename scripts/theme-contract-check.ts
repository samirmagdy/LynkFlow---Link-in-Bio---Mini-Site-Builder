import { PERSONA_TEMPLATES } from '../src/data/personaTemplates';
import { SPEC_THEME_PRESETS } from '../src/data/themePresets';
import { IMPORTED_THEME_PRESETS } from '../src/data/importedThemePresets';
import { LIINKS_GALLERY_THEMES } from '../src/data/liinksGalleryThemes';
import { normalizeTheme, validateProfileAccessibility, validateThemeAccessibility, validateThemeSchema } from '../src/utils/themeEngine';

const themes = [
  ...SPEC_THEME_PRESETS,
  ...IMPORTED_THEME_PRESETS,
  ...LIINKS_GALLERY_THEMES,
  ...PERSONA_TEMPLATES.map(persona => persona.theme),
];

const sampleProfile = {
  tabs: [{
    title: 'Links',
    blocks: [
      { type: 'text', title: 'Introduction', isHidden: false, payload: { textType: 'h1', content: 'مرحباً بكم — Welcome', alignment: 'center' } },
      { type: 'text', title: 'Services', isHidden: false, payload: { textType: 'h2', content: 'A long biography with Arabic العربية and English content that should wrap safely on narrow screens.', alignment: 'left' } },
      { type: 'media', title: 'Featured image', isHidden: false, payload: { mediaType: 'image', url: 'https://example.com/image.webp', alt: 'A professional portrait' } },
      { type: 'form', title: 'Contact', isHidden: false, payload: { fields: [{ label: 'Email address', type: 'email' }], submitButtonText: 'Send message' } },
    ],
  }],
};

let schemaFailures = 0;
let contrastFailures = 0;
let contentFailures = 0;
const seen = new Set<string>();

for (const sourceTheme of themes) {
  const theme = normalizeTheme(sourceTheme);
  if (seen.has(theme.id)) continue;
  seen.add(theme.id);
  const schema = validateThemeSchema(theme);
  const contrast = validateThemeAccessibility(theme);
  const content = validateProfileAccessibility(sampleProfile, theme);
  if (!schema.isValid) {
    schemaFailures += 1;
    console.error(`[schema] ${theme.id}: ${schema.errors.map(issue => issue.message).join('; ')}`);
  }
  if (!theme.responsive.smallMobile || theme.responsive.mobile.pageX < 8 || theme.responsive.desktop.pageX < 8) {
    schemaFailures += 1;
    console.error(`[responsive] ${theme.id}: missing or invalid responsive tokens`);
  }
  if (!theme.category || !theme.supportedGoals?.length || theme.supportsRTL !== true || theme.supportsDarkMode !== true || theme.mobileFirst !== true) {
    schemaFailures += 1;
    console.error(`[metadata] ${theme.id}: missing normalized category, goal, capability, or mobile-first metadata`);
  }
  if (!contrast.canPublish) {
    contrastFailures += 1;
    console.warn(`[contrast] ${theme.id}: ${contrast.errors.map(issue => issue.tokenKey).join(', ')}`);
  }
  if (!content.canPublish) {
    contentFailures += 1;
    console.error(`[content-a11y] ${theme.id}: ${content.errors.map(issue => issue.message).join('; ')}`);
  }
}

const unsafe = validateThemeSchema({ ...normalizeTheme({}), externalStylesheet: 'https://evil.example/style.css' });
if (unsafe.isValid) {
  schemaFailures += 1;
  console.error('[security] unsafe theme property was accepted');
}

const unsafeTypography = validateThemeSchema({ ...normalizeTheme({}), tokens: { ...normalizeTheme({}).tokens, typography: { ...normalizeTheme({}).tokens.typography, bodyScale: 9, textTransform: 'rotate' } } });
if (unsafeTypography.isValid) {
  schemaFailures += 1;
  console.error('[security] unsafe typography bounds or enum was accepted');
}

const unsafeMedia = validateThemeSchema({ ...normalizeTheme({}), background: { ...normalizeTheme({}).background, type: 'image', assetUrl: 'https://unapproved.example/background.jpg' } });
if (unsafeMedia.isValid) {
  schemaFailures += 1;
  console.error('[security] unapproved background media source was accepted');
}

const safePlaceholder = validateThemeSchema({ ...normalizeTheme({}), background: { ...normalizeTheme({}).background, type: 'image', placeholderUrl: 'data:image/jpeg;base64,AAAA' } });
if (!safePlaceholder.isValid) {
  schemaFailures += 1;
  console.error('[media] approved inline background placeholder was rejected');
}

const unsafePlaceholder = validateThemeSchema({ ...normalizeTheme({}), background: { ...normalizeTheme({}).background, type: 'image', placeholderUrl: 'data:text/html;base64,PHNjcmlwdD4=' } });
if (unsafePlaceholder.isValid) {
  schemaFailures += 1;
  console.error('[security] unsafe inline background placeholder was accepted');
}

console.log(`Theme contract check: ${seen.size} unique themes; schema failures=${schemaFailures}; contrast failures=${contrastFailures}; content failures=${contentFailures}`);
if (schemaFailures || contentFailures) process.exit(1);
