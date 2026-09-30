import {
  calculateContrastRatio,
  compileThemeToCssVariables,
  normalizeTheme,
  resolveStandardTheme,
  validateThemeAccessibility,
  validateThemeSchema,
  toLegacyCompatTheme,
} from '../src/utils/themeEngine';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const base = normalizeTheme({
  id: 'edge-base',
  name: 'Edge base',
  layout: { maxWidth: '900px', alignment: 'left' },
  header: { avatarSize: 120 },
  tokens: { colors: {
    pageBackground: '#F8F8F8', panelBackground: '#FFF8E8', primaryText: '#111111',
    secondaryText: '#FFFFFF', accent: '#FF8800', accentText: '#000000', border: '#111111', focusRing: '#111111'
  } }
});

const malformed = normalizeTheme({
  id: 'malformed',
  source: 'unsafe-source',
  direction: 'unsafe-direction',
  tokens: { shape: { cardRadius: 'not-a-number' }, spacing: { pageX: 'not-a-number' } },
  background: { position: 'center; color:red', focalPoint: { x: 'not-a-number' } }
});

assert(Number.isFinite(malformed.tokens.shape.cardRadius) && malformed.tokens.shape.cardRadius === 12, 'Malformed card radius must use a finite fallback.');
assert(Number.isFinite(malformed.tokens.spacing.pageX) && malformed.tokens.spacing.pageX === 20, 'Malformed spacing must use a finite fallback.');
assert(malformed.background.position === 'center' && malformed.background.focalPoint?.x === 50, 'Unsafe background positioning must be constrained.');
assert(malformed.source === 'custom' && malformed.direction === 'ltr', 'Unsafe enum values must use safe defaults.');

const merged = resolveStandardTheme(base, { layout: { alignment: 'center' } as any, header: { showSocials: false } as any });
assert(merged.layout?.maxWidth === '900px' && merged.layout?.alignment === 'center', 'Layout inheritance must preserve unspecified preset fields.');
assert(merged.header.avatarSize === 120 && merged.header.showSocials === false, 'Header inheritance must preserve unspecified preset fields.');

const nestedInvalid = validateThemeSchema({ ...base, cards: { background: 'not-a-color' } });
assert(!nestedInvalid.isValid && nestedInvalid.errors.some(issue => issue.tokenKey === 'cards.background'), 'Nested card colors must be schema validated.');
const invalidFlags = validateThemeSchema({ ...base, profile: { showAvatar: 'false' }, layout: { showFooter: 'false' } });
assert(!invalidFlags.isValid, 'Non-boolean visibility flags must fail schema validation.');
const normalizedFlags = normalizeTheme({ ...base, profile: { showAvatar: 'false' }, layout: { showFooter: 'false' } });
assert(normalizedFlags.profile?.showAvatar === true && normalizedFlags.layout?.showFooter === true, 'Invalid visibility flags must not become truthy strings.');
const legacyMedia = toLegacyCompatTheme(normalizeTheme({ background: { type: 'video', assetUrl: 'https://videos.pexels.com/video-files/contract.mp4', posterUrl: 'https://images.pexels.com/contract.jpg' } }));
assert(legacyMedia.backgroundType === 'video' && legacyMedia.backgroundVideoUrl?.includes('videos.pexels.com') && legacyMedia.backgroundPosterUrl?.includes('images.pexels.com'), 'Legacy compatibility must preserve media background semantics.');

const variables = compileThemeToCssVariables(normalizeTheme({
  ...base,
  cards: { background: '#FFF8E8', text: '#FFFFFF' },
  buttons: { background: '#FFF8E8', text: '#FFFFFF' }
}));
assert(calculateContrastRatio(variables['--theme-card-text'], variables['--theme-card-bg']) >= 4.5, 'Effective card text must meet WCAG AA.');
assert(calculateContrastRatio(variables['--theme-card-subtitle'], variables['--theme-card-bg']) >= 4.5, 'Effective card subtitle must meet WCAG AA.');
assert(calculateContrastRatio(variables['--theme-button-text'], variables['--theme-button-bg']) >= 4.5, 'Effective button text must meet WCAG AA.');
assert(validateThemeAccessibility(normalizeTheme({ ...base, cards: { background: '#FFF8E8', text: '#FFFFFF' } })).canPublish, 'Normalized effective surfaces must be publishable.');

const first = normalizeTheme({ id: 'stable' });
const second = normalizeTheme({ id: 'stable' });
assert(JSON.stringify(first) === JSON.stringify(second), 'Normalizing the same theme must be deterministic.');

console.log('Theme engine edge contract: normalization, inheritance, nested validation, effective contrast, and determinism passed');
