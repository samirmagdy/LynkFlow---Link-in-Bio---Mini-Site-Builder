import { StandardTheme, ThemeValidationResult, ThemeAccessibilityIssue, PublishedThemeSnapshot, ViewportResponsiveRule } from '../types/themeSchema';
import { ThemeConfig } from '../types';

export const APPROVED_FONT_FAMILIES = [
  'Plus Jakarta Sans', 'Inter', 'Syne', 'DM Sans', 'Manrope', 'Space Grotesk',
  'Noto Kufi Arabic', 'Noto Sans Arabic', 'Tajawal', 'Cairo', 'IBM Plex Sans Arabic', 'Tahoma', 'Arial'
] as const;

const FALLBACK_FONT_STACK = 'ui-sans-serif, system-ui, sans-serif';

const isSafeHexColor = (value: unknown): value is string => typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());

const safeColor = (value: unknown, fallback: string): string => isSafeHexColor(value) ? String(value).trim() : fallback;

const safeFontStack = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string' || value.length > 180 || /url\s*\(|@import|[;<>]/i.test(value)) return fallback;
  const familyNames = value.split(',').map(part => part.trim().replace(/^['"]|['"]$/g, ''));
  if (!familyNames.length || familyNames.some(name => !name || (!APPROVED_FONT_FAMILIES.includes(name as typeof APPROVED_FONT_FAMILIES[number]) && !/^(ui-|system-ui|sans-serif|serif|monospace|cursive|fantasy|emoji)/i.test(name)))) return fallback;
  return value;
};

const safeCssFragment = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string' || value.length > 240 || /url\s*\(|javascript:|expression\s*\(|[;<>]/i.test(value)) return fallback;
  return value;
};

const safeLength = (value: unknown, fallback: string): string => typeof value === 'string' && /^(?:\d+(?:\.\d+)?)(?:px|rem|em|ch|%)$/.test(value.trim()) ? value.trim() : fallback;

const isApprovedMediaSource = (value: unknown): boolean => {
  if (typeof value !== 'string' || !/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return host === 'images.unsplash.com'
      || host === 'plus.unsplash.com'
      || host === 'images.pexels.com'
      || host === 'videos.pexels.com'
      || host === 'assets.production.linktr.ee'
      || host === 'd1ym67wyom4bkd.cloudfront.net'
      || host === 'd3rq6m369s8u39.cloudfront.net'
      || (host.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/public/'));
  } catch {
    return false;
  }
};

const safeMediaUrl = (value: unknown): string | null => isApprovedMediaSource(value) ? String(value) : null;

const isSafePlaceholder = (value: unknown): value is string => typeof value === 'string'
  && value.length <= 120000
  && /^data:image\/(?:jpeg|webp|png);base64,[a-z0-9+/=]+$/i.test(value);

/**
 * Parses hex color to RGB tuple [r, g, b]
 */
export function hexToRgb(hex: string): [number, number, number] {
  let c = hex.trim().replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  if (c.length === 8) {
    c = c.substring(0, 6);
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * Relative luminance calculation according to WCAG 2.1 specifications
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(val => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculates WCAG contrast ratio between two hex colors (returns ratio between 1 and 21)
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  try {
    const [r1, g1, b1] = hexToRgb(hex1);
    const [r2, g2, b2] = hexToRgb(hex2);
    const lum1 = getRelativeLuminance(r1, g1, b1);
    const lum2 = getRelativeLuminance(r2, g2, b2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return Math.round(ratio * 100) / 100;
  } catch {
    return 1;
  }
}

const THEME_KEYS = new Set(['id', 'profileId', 'schemaVersion', 'name', 'category', 'supportedGoals', 'supportsRTL', 'supportsDarkMode', 'mobileFirst', 'source', 'presetId', 'mode', 'previewImage', 'language', 'direction', 'tokens', 'background', 'header', 'layout', 'componentVariants', 'profile', 'buttons', 'cards', 'socialIcons', 'effects', 'blockDefaults', 'responsive', 'accessibility', 'conversion', 'presetComposition', 'createdAt', 'updatedAt', 'updatedBy']);
const THEME_COLOR_KEYS = new Set(['pageBackground', 'panelBackground', 'primaryText', 'secondaryText', 'accent', 'accentText', 'border', 'focusRing', 'cardBg', 'cardTextColor', 'cardSubtitleColor', 'cardBorder', 'surfaceBase', 'surfaceRaised', 'surfaceMuted', 'textPrimary', 'textSecondary', 'textDisabled', 'borderSubtle', 'borderStrong', 'accentPrimary', 'accentHover', 'accentPressed', 'accentDisabled', 'ctaText', 'success', 'warning', 'danger', 'overlay']);
const THEME_TYPOGRAPHY_KEYS = new Set(['bodyFamily', 'displayFamily', 'arabicFamily', 'bodySize', 'bodyWeight', 'headingWeight', 'bodyLineHeight', 'headingLineHeight', 'letterSpacing', 'headingScale', 'bodyScale', 'captionSize', 'buttonTextSize', 'maxLineLength', 'textTransform']);
const THEME_BACKGROUND_KEYS = new Set(['type', 'assetId', 'mobileAssetId', 'assetUrl', 'mobileAssetUrl', 'placeholderUrl', 'posterUrl', 'position', 'fit', 'focalPoint', 'scale', 'blur', 'autoplay', 'loop', 'muted', 'reducedMotionFallback', 'overlay', 'overlayColor', 'fallbackColor', 'gradientStops']);
const RESPONSIVE_VIEWPORT_KEYS = new Set(['maxWidth', 'pageX', 'pageY', 'blockGap', 'avatarSize', 'headingScale', 'imageHeight', 'textAlign', 'navigationPosition', 'blockVisibility']);
const TOKEN_GROUP_KEYS = new Set(['colors', 'typography', 'shape', 'spacing', 'elevation', 'motion']);
const SHAPE_KEYS = new Set(['pageRadius', 'cardRadius', 'buttonRadius', 'avatarRadius']);
const SPACING_KEYS = new Set(['pageX', 'pageY', 'blockGap', 'sectionGap']);
const ELEVATION_KEYS = new Set(['card', 'button']);
const MOTION_KEYS = new Set(['durationMs', 'easing', 'enabled', 'hoverEffect']);
const LAYOUT_KEYS = new Set(['templateId', 'maxWidth', 'alignment', 'headerStyle', 'blockWidth', 'navigationStyle', 'navigationPosition', 'sectionGrouping', 'sectionBackground', 'sectionDivider', 'imagePlacement', 'socialIconPlacement', 'ctaPosition', 'showFooter']);
const HEADER_KEYS = new Set(['alignment', 'avatarSize', 'showShare', 'showSocials']);
const VARIANT_KEYS = new Set(['link', 'image', 'socialIcons', 'form']);
const PROFILE_KEYS = new Set(['showAvatar', 'avatarShape']);
const BUTTON_KEYS = new Set(['background', 'text', 'border', 'shadow', 'height', 'blur']);
const CARD_KEYS = new Set(['background', 'text', 'border', 'radius', 'shadow', 'blur']);
const SOCIAL_ICON_KEYS = new Set(['color', 'size', 'style']);
const EFFECT_KEYS = new Set(['grain', 'blur', 'glow']);
const BLOCK_DEFAULT_KEYS = new Set(['link', 'text', 'media', 'folder']);
const ACCESSIBILITY_KEYS = new Set(['reducedMotion', 'minimumContrast']);
const CONVERSION_KEYS = new Set(['goal', 'primaryBlockId', 'secondaryBlockId', 'whatsappCountryCode', 'whatsappMessage', 'whatsappTrackingParameter', 'businessHours']);
const FOCAL_POINT_KEYS = new Set(['x', 'y']);
const PRESET_COMPOSITION_KEYS = new Set(['themeId', 'layoutId', 'brandKitId', 'starterSiteId', 'selectedBlockVariants', 'includesStarterContent', 'changesContent', 'changesLayout']);

const addSchemaIssue = (issues: ThemeAccessibilityIssue[], tokenKey: string, message: string) => {
  issues.push({ type: 'error', tokenKey, message });
};

/** Strict boundary validation used before persistence/import/publish. */
export function validateThemeSchema(raw: unknown): ThemeValidationResult {
  const errors: ThemeAccessibilityIssue[] = [];
  const warnings: ThemeAccessibilityIssue[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    addSchemaIssue(errors, 'schema', 'Theme must be a JSON object.');
    return { isValid: false, canPublish: false, errors, warnings };
  }
  const theme = raw as Record<string, any>;
  Object.keys(theme).filter(key => !THEME_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `schema.${key}`, 'Unknown theme property is not allowed.'));
  if (theme.schemaVersion !== undefined && theme.schemaVersion !== 1) addSchemaIssue(errors, 'schemaVersion', 'Unsupported theme schema version.');
  if (theme.mode !== undefined && !['light', 'dark', 'system'].includes(theme.mode)) addSchemaIssue(errors, 'mode', 'Theme mode must be light, dark, or system.');
  if (theme.category !== undefined && (typeof theme.category !== 'string' || theme.category.length > 80)) addSchemaIssue(errors, 'category', 'Theme category must be a short label.');
  if (theme.supportedGoals !== undefined && (!Array.isArray(theme.supportedGoals) || theme.supportedGoals.some((goal: unknown) => !['contact', 'book', 'buy', 'portfolio', 'newsletter', 'whatsapp', 'download', 'social'].includes(String(goal))))) addSchemaIssue(errors, 'supportedGoals', 'Theme goals must use supported conversion goal identifiers.');
  const tokens = theme.tokens;
  if (tokens && typeof tokens === 'object') Object.keys(tokens).filter(key => !TOKEN_GROUP_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `tokens.${key}`, 'Unknown token group is not allowed.'));
  const colors = theme.tokens?.colors;
  if (colors && typeof colors === 'object') {
    Object.keys(colors).filter(key => !THEME_COLOR_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `tokens.colors.${key}`, 'Unknown color token is not allowed.'));
    Object.entries(colors).forEach(([key, value]) => {
      if (value !== undefined && value !== null && !isSafeHexColor(value)) addSchemaIssue(errors, `tokens.colors.${key}`, 'Color tokens must be valid hexadecimal colors.');
    });
  }
  const typography = theme.tokens?.typography;
  if (typography) {
    Object.keys(typography).filter(key => !THEME_TYPOGRAPHY_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `tokens.typography.${key}`, 'Unknown typography token is not allowed.'));
    if (typography.bodyFamily !== undefined && safeFontStack(typography.bodyFamily, '') === '') addSchemaIssue(errors, 'tokens.typography.bodyFamily', 'Body font must use an approved font family.');
    if (typography.displayFamily !== undefined && safeFontStack(typography.displayFamily, '') === '') addSchemaIssue(errors, 'tokens.typography.displayFamily', 'Display font must use an approved font family.');
    if (typography.arabicFamily !== undefined && safeFontStack(typography.arabicFamily, '') === '') addSchemaIssue(errors, 'tokens.typography.arabicFamily', 'Arabic font must use an approved Arabic-capable font family.');
    for (const key of ['bodySize', 'letterSpacing', 'captionSize', 'buttonTextSize', 'maxLineLength']) {
      if (typography[key] !== undefined && safeLength(typography[key], '') === '') addSchemaIssue(errors, `tokens.typography.${key}`, 'Typography length must be a bounded CSS length.');
    }
    for (const key of ['bodyWeight', 'headingWeight']) {
      if (typography[key] !== undefined && (!Number.isFinite(Number(typography[key])) || Number(typography[key]) < 300 || Number(typography[key]) > 900)) addSchemaIssue(errors, `tokens.typography.${key}`, 'Font weight must be between 300 and 900.');
    }
    for (const key of ['bodyLineHeight', 'headingLineHeight', 'headingScale', 'bodyScale']) {
      if (typography[key] !== undefined && (!Number.isFinite(Number(typography[key])) || Number(typography[key]) < 0.75 || Number(typography[key]) > 2.5)) addSchemaIssue(errors, `tokens.typography.${key}`, 'Typography scale and line height must stay within safe bounds.');
    }
    if (typography.textTransform !== undefined && !['none', 'uppercase', 'capitalize'].includes(typography.textTransform)) addSchemaIssue(errors, 'tokens.typography.textTransform', 'Unsupported text transform.');
  }
  const background = theme.background;
  if (background && typeof background === 'object') {
    Object.keys(background).filter(key => !THEME_BACKGROUND_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `background.${key}`, 'Unknown background property is not allowed.'));
    if (background.focalPoint && typeof background.focalPoint === 'object') Object.keys(background.focalPoint).filter(key => !FOCAL_POINT_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `background.focalPoint.${key}`, 'Unknown focal-point property is not allowed.'));
  }
  if (background?.gradientStops && safeCssFragment(background.gradientStops, '') === '') addSchemaIssue(errors, 'background.gradientStops', 'Background gradients cannot contain unsafe CSS or external URLs.');
  for (const key of ['assetUrl', 'mobileAssetUrl', 'posterUrl']) {
    const value = background?.[key];
    if (value && !isApprovedMediaSource(value)) addSchemaIssue(errors, `background.${key}`, 'Media source is not approved. Use an uploaded asset, Supabase Storage, Pexels, Unsplash, or an approved gallery CDN.');
  }
  if (background?.placeholderUrl && !isSafePlaceholder(background.placeholderUrl)) addSchemaIssue(errors, 'background.placeholderUrl', 'Background placeholders must be small inline image data.');
  if (theme.previewImage && !isApprovedMediaSource(theme.previewImage)) addSchemaIssue(errors, 'previewImage', 'Theme preview media must use an approved HTTPS source.');
  if (theme.presetComposition && typeof theme.presetComposition === 'object') Object.keys(theme.presetComposition).filter(key => !PRESET_COMPOSITION_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `presetComposition.${key}`, 'Unknown preset composition property is not allowed.'));
  const nestedGroups: Array<[string, unknown, Set<string>]> = [
    ['tokens.shape', tokens?.shape, SHAPE_KEYS], ['tokens.spacing', tokens?.spacing, SPACING_KEYS], ['tokens.elevation', tokens?.elevation, ELEVATION_KEYS], ['tokens.motion', tokens?.motion, MOTION_KEYS],
    ['layout', theme.layout, LAYOUT_KEYS], ['header', theme.header, HEADER_KEYS], ['componentVariants', theme.componentVariants, VARIANT_KEYS], ['profile', theme.profile, PROFILE_KEYS],
    ['buttons', theme.buttons, BUTTON_KEYS], ['cards', theme.cards, CARD_KEYS], ['socialIcons', theme.socialIcons, SOCIAL_ICON_KEYS], ['effects', theme.effects, EFFECT_KEYS],
    ['blockDefaults', theme.blockDefaults, BLOCK_DEFAULT_KEYS], ['accessibility', theme.accessibility, ACCESSIBILITY_KEYS], ['conversion', theme.conversion, CONVERSION_KEYS]
  ];
  for (const [path, value, allowedKeys] of nestedGroups) {
    if (value && typeof value === 'object' && !Array.isArray(value)) Object.keys(value).filter(key => !allowedKeys.has(key)).forEach(key => addSchemaIssue(errors, `${path}.${key}`, 'Unknown theme property is not allowed.'));
  }
  if (theme.layout?.maxWidth !== undefined && safeLength(theme.layout.maxWidth, '') === '') addSchemaIssue(errors, 'layout.maxWidth', 'Layout width must be a bounded CSS length.');
  if (theme.responsive && typeof theme.responsive === 'object') {
    Object.entries(theme.responsive).forEach(([viewport, rule]) => {
      if (!['smallMobile', 'mobile', 'tablet', 'desktop'].includes(viewport) || !rule || typeof rule !== 'object') {
        addSchemaIssue(errors, `responsive.${viewport}`, 'Responsive overrides must use an approved viewport key.');
        return;
      }
      Object.keys(rule as Record<string, unknown>).filter(key => !RESPONSIVE_VIEWPORT_KEYS.has(key)).forEach(key => addSchemaIssue(errors, `responsive.${viewport}.${key}`, 'Unknown responsive override is not allowed.'));
      const responsiveRule = rule as Record<string, unknown>;
      for (const key of ['maxWidth', 'pageX', 'pageY', 'blockGap', 'avatarSize', 'headingScale', 'imageHeight']) {
        if (responsiveRule[key] !== undefined && !Number.isFinite(Number(responsiveRule[key]))) addSchemaIssue(errors, `responsive.${viewport}.${key}`, 'Responsive numeric values must be finite numbers.');
      }
      if (responsiveRule.textAlign !== undefined && !['left', 'center', 'right'].includes(String(responsiveRule.textAlign))) addSchemaIssue(errors, `responsive.${viewport}.textAlign`, 'Unsupported responsive text alignment.');
      if (responsiveRule.navigationPosition !== undefined && !['top', 'below-header', 'bottom'].includes(String(responsiveRule.navigationPosition))) addSchemaIssue(errors, `responsive.${viewport}.navigationPosition`, 'Unsupported responsive navigation position.');
      if (responsiveRule.blockVisibility !== undefined && !['all', 'hide-media', 'hide-socials'].includes(String(responsiveRule.blockVisibility))) addSchemaIssue(errors, `responsive.${viewport}.blockVisibility`, 'Unsupported responsive block visibility mode.');
    });
  }
  return { isValid: errors.length === 0, canPublish: errors.length === 0, errors, warnings };
}

export interface ThemeQualityScore {
  overall: number;
  categories: Array<{ id: 'mobile' | 'rtl' | 'accessibility' | 'conversion' | 'performance' | 'brand'; label: string; score: number; findings: string[] }>;
}

export function calculateThemeQualityScore(theme: StandardTheme): ThemeQualityScore {
  const resolved = normalizeTheme(theme);
  const a11y = validateThemeAccessibility(resolved);
  const categories: ThemeQualityScore['categories'] = [
    { id: 'mobile', label: 'Mobile readiness', score: resolved.responsive.mobile.pageX >= 8 && resolved.blockDefaults.link?.height !== undefined ? 100 : 70, findings: ['Responsive mobile tokens are defined.', `Primary touch target is ${resolved.blockDefaults.link?.height || 0}px.`] },
    { id: 'rtl', label: 'RTL readiness', score: resolved.direction === 'rtl' || resolved.language === 'ar' || (resolved.supportsRTL && Boolean(resolved.tokens.typography.arabicFamily)) ? 100 : 85, findings: resolved.direction === 'rtl' || resolved.language === 'ar' ? ['Arabic direction is explicitly configured.'] : resolved.supportsRTL ? ['RTL capability and Arabic typography fallback stack are verified.'] : ['Preview Arabic/RTL before publishing to validate mixed-language content.'] },
    { id: 'accessibility', label: 'Accessibility', score: Math.max(0, 100 - a11y.errors.length * 25 - a11y.warnings.length * 8), findings: [...a11y.errors.map(issue => issue.message), ...a11y.warnings.map(issue => issue.message)] },
    { id: 'conversion', label: 'Conversion clarity', score: resolved.conversion?.goal && resolved.layout?.ctaPosition ? 100 : 70, findings: resolved.conversion?.goal ? [`Goal: ${resolved.conversion.goal}. CTA placement: ${resolved.layout?.ctaPosition || 'priority-order'}.`] : ['Choose a visitor goal and primary CTA placement.'] },
    { id: 'performance', label: 'Performance readiness', score: resolved.background.type === 'video' && !resolved.background.posterUrl ? 70 : (resolved.background.type === 'image' && !resolved.background.placeholderUrl && !resolved.background.assetUrl ? 90 : 100), findings: resolved.background.type === 'video' && !resolved.background.posterUrl ? ['Add a video poster so the page has an immediate fallback frame.'] : ['Background performance and fallback path are optimized.'] },
    { id: 'brand', label: 'Brand consistency', score: resolved.tokens.typography.bodyFamily && resolved.tokens.colors.accent ? 100 : 70, findings: ['Resolved typography and accent tokens are present.'] }
  ];
  return { overall: Math.round(categories.reduce((sum, category) => sum + category.score, 0) / categories.length), categories };
}

/**
 * Validates theme against WCAG AA requirements
 */
export function validateThemeAccessibility(theme: StandardTheme): ThemeValidationResult {
  const errors: ThemeAccessibilityIssue[] = [];
  const warnings: ThemeAccessibilityIssue[] = [];
  const colors = theme.tokens.colors;

  // 1. Primary Text vs Page Background (Required: 4.5:1 for normal body text)
  const primaryTextOnPage = calculateContrastRatio(colors.primaryText, colors.pageBackground);
  if (primaryTextOnPage < 4.5) {
    errors.push({
      type: 'error',
      tokenKey: 'colors.primaryText',
      message: `Primary text has poor contrast (${primaryTextOnPage}:1) against page background. WCAG AA requires at least 4.5:1.`,
      ratio: primaryTextOnPage,
      requiredRatio: 4.5,
      suggestedFix: primaryTextOnPage < 3 ? '#FFFFFF or #000000' : '#F8FAFC'
    });
  }

  // 2. Secondary Text vs Page Background (Required: 3.0:1 minimum)
  const secondaryTextOnPage = calculateContrastRatio(colors.secondaryText, colors.pageBackground);
  if (secondaryTextOnPage < 3.0) {
    warnings.push({
      type: 'warning',
      tokenKey: 'colors.secondaryText',
      message: `Secondary text contrast (${secondaryTextOnPage}:1) is below recommended 3.0:1 readability threshold.`,
      ratio: secondaryTextOnPage,
      requiredRatio: 3.0
    });
  }

  // 3. Primary CTA Text vs Accent Fill (Required: 4.5:1 for action text)
  const ctaContrast = calculateContrastRatio(colors.accentText, colors.accent);
  if (ctaContrast < 4.5) {
    const whiteRatio = calculateContrastRatio('#FFFFFF', colors.accent);
    // Pure black is intentionally used here: near-black #09090B can still
    // miss the 4.5:1 boundary for mid-tone accents such as #6366F1.
    const darkRatio = calculateContrastRatio('#000000', colors.accent);
    const bestFix = darkRatio > whiteRatio ? '#09090B' : '#FFFFFF';

    errors.push({
      type: 'error',
      tokenKey: 'colors.accentText',
      message: `Button CTA text has insufficient contrast (${ctaContrast}:1) on accent background. Must meet 4.5:1.`,
      ratio: ctaContrast,
      requiredRatio: 4.5,
      suggestedFix: bestFix
    });
  }

  // 4. Focus Ring visibility vs Page Background (Required: 3.0:1)
  const focusContrast = calculateContrastRatio(colors.focusRing, colors.pageBackground);
  if (focusContrast < 3.0) {
    errors.push({
      type: 'error',
      tokenKey: 'colors.focusRing',
      message: `Keyboard focus ring contrast (${focusContrast}:1) is not sufficiently visible against the page background.`,
      ratio: focusContrast,
      requiredRatio: 3.0,
      suggestedFix: calculateContrastRatio('#FFFFFF', colors.pageBackground) >= calculateContrastRatio('#000000', colors.pageBackground) ? '#FFFFFF' : '#000000'
    });
  }

  // 5. Card Panel Text vs Card Panel Background
  const cardBg = colors.panelBackground || colors.cardBg || colors.pageBackground;
  const cardText = colors.cardTextColor || colors.primaryText;
  const cardTextContrast = calculateContrastRatio(cardText, cardBg);
  if (cardTextContrast < 4.0) {
    warnings.push({
      type: 'warning',
      tokenKey: 'colors.panelBackground',
      message: `Card panel content text contrast (${cardTextContrast}:1) is tight against panel surface.`,
      ratio: cardTextContrast,
      requiredRatio: 4.5
    });
  }

  return {
    isValid: errors.length === 0,
    canPublish: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Content-aware accessibility checks shared by the editor and the Worker.
 * Theme contrast alone cannot catch invalid forms, missing media alternatives,
 * broken heading order, or unsafe autoplay behavior.
 */
export function validateProfileAccessibility(profile: any, theme: StandardTheme): ThemeValidationResult {
  const errors: ThemeAccessibilityIssue[] = [];
  const warnings: ThemeAccessibilityIssue[] = [];
  const tabs = Array.isArray(profile?.tabs) ? profile.tabs : [];
  const headings: Array<{ level: number; tokenKey: string }> = [];
  let longestWord = '';

  const addWarning = (tokenKey: string, message: string) => warnings.push({ type: 'warning', tokenKey, message });
  const addError = (tokenKey: string, message: string) => errors.push({ type: 'error', tokenKey, message });
  const inspectText = (value: unknown, tokenKey: string) => {
    if (typeof value !== 'string') return;
    for (const word of value.split(/\s+/)) if (word.length > longestWord.length) longestWord = word;
    if (value.length > 0 && !/[\p{L}\p{N}]/u.test(value)) addWarning(tokenKey, 'Text contains no readable letters or numbers.');
  };

  tabs.forEach((tab: any, tabIndex: number) => {
    (Array.isArray(tab?.blocks) ? tab.blocks : []).forEach((block: any, blockIndex: number) => {
      if (block?.isHidden) return;
      const key = `tabs[${tabIndex}].blocks[${blockIndex}]`;
      const payload = block?.payload && typeof block.payload === 'object' ? block.payload : {};
      if (block?.type === 'text') {
        inspectText(payload.content, `${key}.content`);
        const level = Number(String(payload.textType || '').replace('h', ''));
        if ([1, 2, 3].includes(level)) headings.push({ level, tokenKey: `${key}.textType` });
      }
      if (block?.type === 'media') {
        if (payload.mediaType === 'image' && !String(payload.alt || payload.altText || '').trim()) addWarning(`${key}.alt`, 'Image media should include alternative text.');
        if (payload.mediaType === 'video' && !String(payload.captionsUrl || payload.caption || '').trim()) addWarning(`${key}.captions`, 'Video media should provide captions or a transcript.');
      }
      if (block?.type === 'gallery' || block?.type === 'carousel') {
        (Array.isArray(payload.items) ? payload.items : []).forEach((item: any, itemIndex: number) => {
          if (!String(item?.alt || '').trim()) addWarning(`${key}.items[${itemIndex}].alt`, 'Gallery images should include alternative text.');
          inspectText(item?.title, `${key}.items[${itemIndex}].title`);
        });
      }
      if (block?.type === 'form' || block?.type === 'emailSignup') {
        (Array.isArray(payload.fields) ? payload.fields : []).forEach((field: any, fieldIndex: number) => {
          if (!String(field?.label || '').trim()) addError(`${key}.fields[${fieldIndex}].label`, 'Every form field must have a visible label.');
        });
        if (!String(payload.submitButtonText || '').trim()) addError(`${key}.submitButtonText`, 'Forms must have an accessible submit button label.');
      }
      if (block?.type === 'link' || block?.type === 'product' || block?.type === 'contact' || block?.type === 'file') {
        if (Number(theme.blockDefaults?.link?.height || 0) < 44) addError('theme.blockDefaults.link.height', 'Interactive blocks must have a touch target of at least 44px.');
      }
      inspectText(block?.title, `${key}.title`);
    });
  });

  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level - headings[index - 1].level > 1) addWarning(headings[index].tokenKey, 'Heading levels should not skip from a lower level to a much deeper level.');
  }
  if (headings.filter(item => item.level === 1).length > 1) addWarning('content.headings', 'Use one primary h1 heading per page.');
  if (longestWord.length > 48) addWarning('content.longWord', 'A very long unbroken word may overflow narrow screens.');

  const background = theme.background;
  if (background.type === 'video' && background.autoplay && !background.muted) addError('background.muted', 'Autoplaying background video must be muted.');
  if (background.type === 'video' && background.autoplay && !background.reducedMotionFallback) addWarning('background.reducedMotionFallback', 'Provide a reduced-motion fallback for autoplaying video.');
  const rtlMode = theme.direction === 'rtl' || theme.language === 'ar';
  if (rtlMode && !/(Noto|Tajawal|Cairo|Plex Sans Arabic|Tahoma|Arabic)/i.test(`${theme.tokens.typography.arabicFamily || ''} ${theme.tokens.typography.bodyFamily} ${theme.tokens.typography.displayFamily}`)) addWarning('tokens.typography.arabicFamily', 'Arabic/RTL mode should use an Arabic-capable font family.');

  return { isValid: errors.length === 0, canPublish: errors.length === 0, errors, warnings };
}

/**
 * Normalizes and clamps theme values to guarantee schema invariants
 */
export function normalizeTheme(raw: any): StandardTheme {
  const colors = raw?.tokens?.colors || {};
  const typography = raw?.tokens?.typography || {};
  const shape = raw?.tokens?.shape || {};
  const spacing = raw?.tokens?.spacing || {};
  const elevation = raw?.tokens?.elevation || {};
  const motion = raw?.tokens?.motion || {};
  const background = raw?.background || {};
  const header = raw?.header || {};
  const layout = raw?.layout || {};
  const componentVariants = raw?.componentVariants || {};
  const profile = raw?.profile || {};
  const buttons = raw?.buttons || {};
  const cards = raw?.cards || {};
  const socialIcons = raw?.socialIcons || {};
  const effects = raw?.effects || {};
  const blockDefaults = raw?.blockDefaults || {};
  const responsive = raw?.responsive || {};
  const accessibility = raw?.accessibility || {};
  const normalizeResponsiveRule = (value: any, fallback: ViewportResponsiveRule): ViewportResponsiveRule => ({
    maxWidth: Math.max(280, Math.min(1600, Number(value?.maxWidth ?? fallback.maxWidth))),
    pageX: Math.max(8, Math.min(48, Number(value?.pageX ?? fallback.pageX))),
    pageY: Math.max(8, Math.min(64, Number(value?.pageY ?? fallback.pageY))),
    blockGap: Math.max(6, Math.min(36, Number(value?.blockGap ?? fallback.blockGap))),
    avatarSize: Math.max(48, Math.min(140, Number(value?.avatarSize ?? fallback.avatarSize ?? 88))),
    headingScale: Math.max(0.75, Math.min(1.6, Number(value?.headingScale ?? fallback.headingScale ?? 1))),
    imageHeight: Math.max(120, Math.min(720, Number(value?.imageHeight ?? fallback.imageHeight ?? 320))),
    textAlign: ['left', 'center', 'right'].includes(value?.textAlign) ? value.textAlign : (fallback.textAlign || 'center'),
    navigationPosition: ['top', 'below-header', 'bottom'].includes(value?.navigationPosition) ? value.navigationPosition : (fallback.navigationPosition || 'below-header'),
    blockVisibility: ['all', 'hide-media', 'hide-socials'].includes(value?.blockVisibility) ? value.blockVisibility : (fallback.blockVisibility || 'all')
  });

  // Normalize colors
  const pageBg = safeColor(colors.pageBackground || colors.surfaceBase || raw.bgColor, '#0B0F19');
  const panelBg = safeColor(colors.panelBackground || colors.surfaceRaised || raw.cardBg, '#151B2A');
  const primaryText = safeColor(colors.primaryText || colors.textPrimary || raw.textColor, '#F8FAFC');
  const secondaryText = safeColor(colors.secondaryText || colors.textSecondary || raw.subtitleColor, '#B8C1D1');
  const accent = safeColor(colors.accent || colors.accentPrimary || raw.accentColor, '#6366F1');
  // Preserve the authored CTA color. Validation reports failures and the UI offers an explicit fix.
  // Legacy themes did not have a CTA text token; derive a safe default only for
  // that migration case so an old `accentColor` cannot create an unusable button.
  const legacyAccentText = calculateContrastRatio('#FFFFFF', accent) >= calculateContrastRatio('#000000', accent) ? '#FFFFFF' : '#000000';
  const accentText = safeColor(colors.accentText || colors.ctaText || raw.buttonTextColor, legacyAccentText);
  const surfaceBase = safeColor(colors.surfaceBase, panelBg);
  const surfaceRaised = safeColor(colors.surfaceRaised, panelBg);
  const border = safeColor(colors.border || colors.borderSubtle || raw.cardBorder, '#30394D');
  const cardBg = safeColor(colors.cardBg || colors.panelBackground || colors.surfaceRaised || raw.cardBg, panelBg);
  const cardTextColor = safeColor(colors.cardTextColor || raw.cardTextColor, calculateContrastRatio(primaryText, cardBg) >= 4.0 ? primaryText : (calculateContrastRatio('#FFFFFF', cardBg) >= calculateContrastRatio('#000000', cardBg) ? '#FFFFFF' : '#000000'));
  const cardSubtitleColor = safeColor(colors.cardSubtitleColor || raw.cardSubtitleColor, secondaryText);
  const cardBorder = safeColor(colors.cardBorder || raw.cardBorder, border);
  const focusRing = safeColor(colors.focusRing, '#A5B4FC');
  const surfaceMuted = safeColor(colors.surfaceMuted, pageBg);
  const textDisabled = safeColor(colors.textDisabled, secondaryText);
  const borderStrong = safeColor(colors.borderStrong, border);
  const accentHover = safeColor(colors.accentHover, accent);
  const accentPressed = safeColor(colors.accentPressed, accent);
  const accentDisabled = safeColor(colors.accentDisabled, secondaryText);
  const semanticSuccess = safeColor(colors.success, '#22C55E');
  const semanticWarning = safeColor(colors.warning, '#F59E0B');
  const semanticDanger = safeColor(colors.danger, '#EF4444');
  const semanticOverlay = safeColor(colors.overlay, '#000000');

  // Radius conversion
  let buttonRad = 12;
  if (typeof shape.buttonRadius === 'number') {
    buttonRad = Math.max(0, Math.min(999, shape.buttonRadius));
  } else if (raw.cardRadius === 'none') buttonRad = 0;
  else if (raw.cardRadius === 'sm') buttonRad = 6;
  else if (raw.cardRadius === 'md') buttonRad = 12;
  else if (raw.cardRadius === 'lg') buttonRad = 16;
  else if (raw.cardRadius === 'full') buttonRad = 999;

  let cardRad = 16;
  if (typeof shape.cardRadius === 'number') {
    cardRad = Math.max(0, Math.min(48, shape.cardRadius));
  } else {
    cardRad = buttonRad;
  }

  const normalized: StandardTheme = {
    id: raw.id || `thm-${Date.now()}`,
    profileId: raw.profileId,
    schemaVersion: 1,
    name: raw.name || 'Custom Theme',
    category: typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : 'Creator',
    supportedGoals: Array.isArray(raw.supportedGoals) && raw.supportedGoals.length > 0 ? raw.supportedGoals.filter((goal: unknown) => ['contact', 'book', 'buy', 'portfolio', 'newsletter', 'whatsapp', 'download', 'social'].includes(String(goal))) : [raw.conversion?.goal || 'contact'],
    supportsRTL: raw.supportsRTL !== false,
    supportsDarkMode: raw.supportsDarkMode !== false,
    mobileFirst: raw.mobileFirst !== false,
    source: raw.source || (raw.presetId ? 'preset' : 'custom'),
    presetId: raw.presetId || null,
    mode: ['light', 'dark', 'system'].includes(raw.mode) ? raw.mode : 'system',
    previewImage: safeMediaUrl(raw.previewImage),
    language: raw.language || 'en',
    direction: raw.direction || 'ltr',
    tokens: {
      colors: {
        pageBackground: pageBg,
        panelBackground: panelBg,
        primaryText,
        secondaryText,
        accent,
        accentText,
        border,
        focusRing,
        cardBg,
        cardTextColor,
        cardSubtitleColor,
        cardBorder,
        surfaceBase,
        surfaceRaised,
        surfaceMuted,
        textPrimary: primaryText,
        textSecondary: secondaryText,
        textDisabled,
        borderSubtle: border,
        borderStrong,
        accentPrimary: accent,
        accentHover,
        accentPressed,
        accentDisabled,
        ctaText: accentText,
        success: semanticSuccess,
        warning: semanticWarning,
        danger: semanticDanger,
        overlay: semanticOverlay
      },
      typography: {
        bodyFamily: safeFontStack(typography.bodyFamily || raw.fontBody, 'Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif'),
        displayFamily: safeFontStack(typography.displayFamily || raw.fontDisplay, 'Syne, Inter, ui-sans-serif, sans-serif'),
        arabicFamily: safeFontStack(typography.arabicFamily || raw.fontArabic, 'Noto Kufi Arabic, Tahoma, sans-serif'),
        bodySize: safeLength(typography.bodySize, '16px'),
        bodyWeight: Math.max(300, Math.min(900, Number(typography.bodyWeight) || 400)),
        headingWeight: Math.max(300, Math.min(900, Number(typography.headingWeight) || 700)),
        bodyLineHeight: Math.max(0.75, Math.min(2.5, Number(typography.bodyLineHeight) || 1.5)),
        headingLineHeight: Math.max(0.75, Math.min(2.5, Number(typography.headingLineHeight) || 1.15)),
        letterSpacing: safeLength(typography.letterSpacing, '0px'),
        headingScale: Math.max(0.75, Math.min(2.5, Number(typography.headingScale) || 1)),
        bodyScale: Math.max(0.75, Math.min(1.5, Number(typography.bodyScale) || 1)),
        captionSize: safeLength(typography.captionSize, '12px'),
        buttonTextSize: safeLength(typography.buttonTextSize, '14px'),
        maxLineLength: safeLength(typography.maxLineLength, '68ch'),
        textTransform: ['none', 'uppercase', 'capitalize'].includes(typography.textTransform) ? typography.textTransform : 'none'
      },
      shape: {
        pageRadius: Math.max(0, Math.min(48, Number(shape.pageRadius ?? 24))),
        cardRadius: cardRad,
        buttonRadius: buttonRad,
        avatarRadius: Math.max(0, Math.min(999, Number(shape.avatarRadius ?? 999)))
      },
      spacing: {
        pageX: Math.max(8, Math.min(48, Number(spacing.pageX ?? 20))),
        pageY: Math.max(8, Math.min(64, Number(spacing.pageY ?? 24))),
        blockGap: Math.max(6, Math.min(36, Number(spacing.blockGap ?? 14))),
        sectionGap: Math.max(12, Math.min(48, Number(spacing.sectionGap ?? 24)))
      },
      elevation: {
        card: safeCssFragment(elevation.card, raw.cardShadow === 'none' ? 'none' : raw.cardShadow === 'lg' ? '0 12px 36px rgba(0,0,0,0.25)' : '0 4px 20px rgba(0,0,0,0.15)'),
        button: safeCssFragment(elevation.button, '0 2px 8px rgba(0,0,0,0.08)')
      },
      motion: {
        durationMs: Math.max(0, Math.min(1000, Number(motion.durationMs ?? 180))),
        easing: safeCssFragment(motion.easing, 'cubic-bezier(0.16, 1, 0.3, 1)'),
        enabled: motion.enabled ?? true,
        hoverEffect: motion.hoverEffect || raw.buttonHoverAnimation || 'lift'
      }
    },
    background: {
      type: ['solid', 'gradient', 'image', 'video', 'pattern'].includes(background.type) ? background.type : (raw.backgroundType === 'gradient' ? 'gradient' : 'solid'),
      assetId: background.assetId || null,
      mobileAssetId: background.mobileAssetId || null,
      assetUrl: safeMediaUrl(background.assetUrl),
      mobileAssetUrl: safeMediaUrl(background.mobileAssetUrl),
      placeholderUrl: isSafePlaceholder(background.placeholderUrl) ? background.placeholderUrl : null,
      posterUrl: safeMediaUrl(background.posterUrl),
      position: background.position || 'center',
      fit: ['cover', 'contain', 'natural'].includes(background.fit) ? background.fit : 'cover',
      focalPoint: {
        x: Math.max(0, Math.min(100, Number(background.focalPoint?.x ?? 50))),
        y: Math.max(0, Math.min(100, Number(background.focalPoint?.y ?? 50)))
      },
      scale: Math.max(1, Math.min(2, Number(background.scale ?? 1))),
      blur: Math.max(0, Math.min(32, Number(background.blur ?? 0))),
      autoplay: background.autoplay ?? true,
      loop: background.loop ?? true,
      muted: background.muted ?? true,
      reducedMotionFallback: ['poster', 'image', 'solid'].includes(background.reducedMotionFallback) ? background.reducedMotionFallback : 'poster',
      overlay: Math.max(0, Math.min(1, Number(background.overlay ?? 0))),
      overlayColor: safeColor(background.overlayColor, '#000000'),
      fallbackColor: safeColor(background.fallbackColor, pageBg),
      gradientStops: safeCssFragment(background.gradientStops || raw.bgGradient, '') || undefined
    },
    header: {
      alignment: header.alignment || 'center',
      avatarSize: Math.max(48, Math.min(140, Number(header.avatarSize ?? 88))),
      showShare: header.showShare ?? true,
      showSocials: header.showSocials ?? true
    },
    layout: {
      templateId: ['centered-creator', 'left-professional', 'editorial-portfolio', 'service-conversion', 'product-showcase', 'gallery-portfolio', 'booking-first', 'link-collection'].includes(layout.templateId) ? layout.templateId : 'centered-creator',
      maxWidth: safeLength(layout.maxWidth, '680px'),
      alignment: ['left', 'center'].includes(layout.alignment) ? layout.alignment : 'center',
      headerStyle: ['standard', 'hero', 'compact'].includes(layout.headerStyle) ? layout.headerStyle : 'standard',
      blockWidth: ['full', 'narrow', 'mixed'].includes(layout.blockWidth) ? layout.blockWidth : 'full',
      navigationStyle: ['none', 'tabs', 'pills'].includes(layout.navigationStyle) ? layout.navigationStyle : 'pills',
      navigationPosition: ['top', 'below-header', 'bottom'].includes(layout.navigationPosition) ? layout.navigationPosition : 'below-header',
      sectionGrouping: ['flat', 'grouped', 'editorial'].includes(layout.sectionGrouping) ? layout.sectionGrouping : 'flat',
      sectionBackground: safeColor(layout.sectionBackground, panelBg),
      sectionDivider: ['none', 'line', 'accent'].includes(layout.sectionDivider) ? layout.sectionDivider : 'none',
      imagePlacement: ['inline', 'full-bleed', 'alternating'].includes(layout.imagePlacement) ? layout.imagePlacement : 'inline',
      socialIconPlacement: ['header', 'footer', 'inline'].includes(layout.socialIconPlacement) ? layout.socialIconPlacement : 'header',
      ctaPosition: ['first', 'after-header', 'priority-order'].includes(layout.ctaPosition) ? layout.ctaPosition : 'priority-order',
      showFooter: layout.showFooter ?? true
    },
    componentVariants: {
      link: componentVariants.link || (blockDefaults?.link?.variant === 'outline' ? 'outline' : blockDefaults?.link?.variant === 'soft' ? 'soft-card' : blockDefaults?.link?.variant === 'glass' ? 'glass' : 'solid'),
      image: componentVariants.image || 'rounded',
      socialIcons: componentVariants.socialIcons || 'line',
      form: componentVariants.form || 'card'
    },
    profile: {
      showAvatar: profile.showAvatar ?? true,
      avatarShape: profile.avatarShape || (Number(shape.avatarRadius ?? 999) >= 999 ? 'circle' : 'rounded')
    },
    buttons: {
      background: safeColor(buttons.background, accent),
      text: safeColor(buttons.text, accentText),
      border: safeColor(buttons.border, border),
      shadow: safeCssFragment(buttons.shadow, elevation.button || 'none'),
      height: Math.max(40, Math.min(96, Number(buttons.height ?? blockDefaults?.link?.height ?? 56))),
      blur: Math.max(0, Math.min(32, Number(buttons.blur ?? 0)))
    },
    cards: {
      background: safeColor(cards.background, cardBg),
      text: safeColor(cards.text, cardTextColor),
      border: safeColor(cards.border, cardBorder),
      radius: Math.max(0, Math.min(48, Number(cards.radius ?? cardRad))),
      shadow: safeCssFragment(cards.shadow, elevation.card || 'none'),
      blur: Math.max(0, Math.min(32, Number(cards.blur ?? effects.blur ?? 0)))
    },
    socialIcons: {
      color: socialIcons.color || primaryText,
      size: Math.max(28, Math.min(64, Number(socialIcons.size ?? 36))),
      style: socialIcons.style || componentVariants.socialIcons || 'line'
    },
    effects: {
      grain: effects.grain ?? false,
      blur: Math.max(0, Math.min(32, Number(effects.blur ?? 0))),
      glow: effects.glow ?? false
    },
    blockDefaults: {
      link: {
        variant: blockDefaults?.link?.variant || (raw.cardStyle === 'glass' ? 'glass' : raw.cardStyle === 'outline' ? 'outline' : 'filled'),
        height: Math.max(44, Math.min(84, Number(blockDefaults?.link?.height ?? 56))),
        thumbnail: blockDefaults?.link?.thumbnail || 'none',
        shadow: blockDefaults?.link?.shadow || (raw.cardShadow || 'sm')
      },
      text: {
        alignment: blockDefaults?.text?.alignment || 'left'
      },
      media: {
        radius: blockDefaults?.media?.radius || 'lg'
      },
      folder: {
        variant: blockDefaults?.folder?.variant || 'filled'
      }
    },
    responsive: {
      smallMobile: normalizeResponsiveRule(responsive?.smallMobile, { maxWidth: 374, pageX: 12, pageY: 14, blockGap: 10, avatarSize: 72, headingScale: .9, imageHeight: 220, textAlign: 'center', navigationPosition: 'below-header', blockVisibility: 'all' }),
      mobile: normalizeResponsiveRule(responsive?.mobile, { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12, avatarSize: 80, headingScale: .96, imageHeight: 280, textAlign: 'center', navigationPosition: 'below-header', blockVisibility: 'all' }),
      tablet: normalizeResponsiveRule(responsive?.tablet, { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14, avatarSize: 88, headingScale: 1, imageHeight: 320, textAlign: 'center', navigationPosition: 'below-header', blockVisibility: 'all' }),
      desktop: normalizeResponsiveRule(responsive?.desktop, { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16, avatarSize: 96, headingScale: 1.05, imageHeight: 380, textAlign: 'center', navigationPosition: 'below-header', blockVisibility: 'all' })
    },
    accessibility: {
      reducedMotion: accessibility?.reducedMotion || 'respectUserPreference',
      minimumContrast: accessibility?.minimumContrast || 'AA'
    },
    conversion: {
      goal: ['contact', 'book', 'buy', 'portfolio', 'newsletter', 'whatsapp', 'download', 'social'].includes(raw.conversion?.goal) ? raw.conversion.goal : 'contact',
      primaryBlockId: typeof raw.conversion?.primaryBlockId === 'string' ? raw.conversion.primaryBlockId : null,
      secondaryBlockId: typeof raw.conversion?.secondaryBlockId === 'string' ? raw.conversion.secondaryBlockId : null,
      whatsappCountryCode: typeof raw.conversion?.whatsappCountryCode === 'string' ? raw.conversion.whatsappCountryCode.replace(/[^0-9+]/g, '').slice(0, 16) : undefined,
      whatsappMessage: typeof raw.conversion?.whatsappMessage === 'string' ? raw.conversion.whatsappMessage.slice(0, 240) : undefined,
      whatsappTrackingParameter: typeof raw.conversion?.whatsappTrackingParameter === 'string' ? raw.conversion.whatsappTrackingParameter.replace(/[^a-zA-Z0-9_=-]/g, '').slice(0, 80) : undefined,
      businessHours: typeof raw.conversion?.businessHours === 'string' ? raw.conversion.businessHours.slice(0, 120) : undefined
    },
    presetComposition: raw.presetComposition && typeof raw.presetComposition === 'object' ? {
      themeId: typeof raw.presetComposition.themeId === 'string' ? raw.presetComposition.themeId.slice(0, 120) : (raw.id || 'theme'),
      layoutId: typeof raw.presetComposition.layoutId === 'string' ? raw.presetComposition.layoutId.slice(0, 120) : undefined,
      brandKitId: typeof raw.presetComposition.brandKitId === 'string' ? raw.presetComposition.brandKitId.slice(0, 120) : undefined,
      starterSiteId: typeof raw.presetComposition.starterSiteId === 'string' ? raw.presetComposition.starterSiteId.slice(0, 120) : undefined,
      selectedBlockVariants: raw.presetComposition.selectedBlockVariants && typeof raw.presetComposition.selectedBlockVariants === 'object' ? raw.presetComposition.selectedBlockVariants : undefined,
      includesStarterContent: raw.presetComposition.includesStarterContent === true,
      changesContent: raw.presetComposition.changesContent === true,
      changesLayout: raw.presetComposition.changesLayout !== false,
    } : undefined,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return normalized;
}

/**
 * Migration pipeline: converts older schemas or legacy objects into StandardTheme v1
 */
export function migrateTheme(oldTheme: any): StandardTheme {
  if (!oldTheme) return normalizeTheme({});
  const fromVersion = Number.isFinite(Number(oldTheme.schemaVersion)) ? Number(oldTheme.schemaVersion) : 0;
  return upgradeTheme(oldTheme, fromVersion, 1);
}

/**
 * Upgrade a theme through explicit schema versions before normalization.
 *
 * Version 0 represents the pre-standard-theme legacy shape. Version 1 is the
 * current contract. Keeping this as a real migration boundary prevents future
 * schema changes from being hidden inside UI code or silently accepted by an
 * API endpoint.
 */
export function upgradeTheme(rawTheme: unknown, fromVersion: number, toVersion: number): StandardTheme {
  if (!Number.isInteger(fromVersion) || fromVersion < 0) {
    throw new Error('Theme source schema version must be a non-negative integer.');
  }
  if (!Number.isInteger(toVersion) || toVersion < 1) {
    throw new Error('Theme target schema version must be a positive integer.');
  }
  if (fromVersion > toVersion) {
    throw new Error(`Theme schema cannot be downgraded from v${fromVersion} to v${toVersion}.`);
  }
  if (toVersion > 1 || fromVersion > 1) {
    throw new Error(`No migration path exists for theme schema v${fromVersion} → v${toVersion}.`);
  }

  // v0 had legacy flat keys (bgColor, cardBg, fontBody, etc.). normalizeTheme
  // is the authoritative v0 → v1 migration and also clamps unsafe values.
  const candidate = rawTheme && typeof rawTheme === 'object' && !Array.isArray(rawTheme)
    ? { ...(rawTheme as Record<string, unknown>), schemaVersion: 1 }
    : {};
  return normalizeTheme(candidate);
}

/**
 * Derives a legacy ThemeConfig representation from a StandardTheme
 * ensuring backwards compatibility across undo/redo and legacy renderers.
 */
export function toLegacyCompatTheme(theme: StandardTheme): ThemeConfig {
  const norm = normalizeTheme(theme);
  return {
    id: norm.id,
    name: norm.name,
    backgroundType: norm.background.type === 'gradient' ? 'gradient' : 'solid',
    bgColor: norm.tokens.colors.pageBackground,
    bgGradient: norm.background.gradientStops,
    textColor: norm.tokens.colors.primaryText,
    subtitleColor: norm.tokens.colors.secondaryText,
    cardBg: norm.tokens.colors.panelBackground,
    cardBorder: norm.tokens.colors.border,
    cardTextColor: norm.tokens.colors.primaryText,
    cardSubtitleColor: norm.tokens.colors.secondaryText,
    cardShadow: norm.blockDefaults?.link?.shadow || 'sm',
    cardRadius: norm.tokens.shape.buttonRadius > 20 ? 'full' : norm.tokens.shape.buttonRadius > 10 ? 'md' : 'sm',
    cardStyle: norm.blockDefaults?.link?.variant === 'glass' ? 'glass' : norm.blockDefaults?.link?.variant === 'outline' ? 'outline' : 'solid',
    fontDisplay: norm.tokens.typography.displayFamily,
    fontBody: norm.tokens.typography.bodyFamily,
    buttonHoverAnimation: (norm.tokens.motion.hoverEffect as any) || 'lift',
    accentColor: norm.tokens.colors.accent,
    animeEntrancePreset: (norm as any).animeEntrancePreset,
    animeMicroInteractions: (norm as any).animeMicroInteractions
  };
}

/**
 * Section 6.3 CSS Generation Strategy
 * Converts normalized theme into CSS custom properties dictionary at profile-root boundary
 */
export function compileThemeToCssVariables(theme: StandardTheme): Record<string, string> {
  const { colors, typography, shape, spacing, elevation, motion } = theme.tokens;
  const layout = theme.layout || { maxWidth: '680px' };

  return {
    '--theme-page-bg': colors.pageBackground,
    '--theme-panel-bg': colors.panelBackground,
    '--theme-text-primary': colors.primaryText,
    '--theme-text-secondary': colors.secondaryText,
    '--theme-accent': colors.accent,
    '--theme-accent-text': colors.accentText,
    '--theme-border': colors.border,
    '--theme-focus-ring': colors.focusRing,
    '--theme-surface-base': colors.surfaceBase || colors.panelBackground,
    '--theme-surface-raised': colors.surfaceRaised || colors.panelBackground,
    '--theme-surface-muted': colors.surfaceMuted || colors.pageBackground,
    '--theme-text-disabled': colors.textDisabled || colors.secondaryText,
    '--theme-border-subtle': colors.borderSubtle || colors.border,
    '--theme-border-strong': colors.borderStrong || colors.border,
    '--theme-accent-primary': colors.accentPrimary || colors.accent,
    '--theme-accent-hover': colors.accentHover || colors.accent,
    '--theme-accent-pressed': colors.accentPressed || colors.accent,
    '--theme-accent-disabled': colors.accentDisabled || colors.secondaryText,
    '--theme-cta-text': colors.ctaText || colors.accentText,
    '--theme-success': colors.success || '#22C55E',
    '--theme-warning': colors.warning || '#F59E0B',
    '--theme-danger': colors.danger || '#EF4444',
    '--theme-overlay': colors.overlay || '#000000',
    '--theme-page-radius': `${shape.pageRadius}px`,
    '--theme-card-radius': `${shape.cardRadius}px`,
    '--theme-button-radius': `${shape.buttonRadius}px`,
    '--theme-avatar-radius': `${shape.avatarRadius}px`,
    '--theme-page-x': `${spacing.pageX}px`,
    '--theme-page-y': `${spacing.pageY}px`,
    '--theme-block-gap': `${spacing.blockGap}px`,
    '--theme-section-gap': `${spacing.sectionGap}px`,
    '--theme-card-elevation': elevation.card,
    '--theme-body-font': typography.bodyFamily,
    '--theme-display-font': typography.displayFamily,
    '--theme-arabic-font': typography.arabicFamily || 'Noto Kufi Arabic, Tahoma, sans-serif',
    '--theme-body-size': typography.bodySize,
    '--theme-body-weight': String(typography.bodyWeight),
    '--theme-heading-weight': String(typography.headingWeight),
    '--theme-body-lh': String(typography.bodyLineHeight),
    '--theme-heading-lh': String(typography.headingLineHeight),
    '--theme-letter-spacing': typography.letterSpacing || '0px',
    '--theme-heading-scale': String(typography.headingScale || 1),
    '--theme-body-scale': String(typography.bodyScale || 1),
    '--theme-caption-size': typography.captionSize || '12px',
    '--theme-button-text-size': typography.buttonTextSize || '14px',
    '--theme-max-line-length': typography.maxLineLength || '68ch',
    '--theme-text-transform': typography.textTransform || 'none',
    '--theme-motion-duration': `${motion.durationMs}ms`,
    '--theme-motion-ease': motion.easing,
    '--theme-content-max-width': layout.maxWidth
    ,'--theme-button-bg': theme.buttons?.background || colors.accent
    ,'--theme-button-text': theme.buttons?.text || colors.accentText
    ,'--theme-button-border': theme.buttons?.border || colors.border
    ,'--theme-button-height': `${theme.buttons?.height || 56}px`
    ,'--theme-button-blur': `${theme.buttons?.blur || 0}px`
    ,'--theme-card-bg': theme.cards?.background || colors.cardBg || colors.panelBackground
    ,'--theme-card-text': theme.cards?.text || colors.cardTextColor || colors.primaryText
    ,'--theme-card-border': theme.cards?.border || colors.cardBorder || colors.border
    ,'--theme-card-radius-explicit': `${theme.cards?.radius ?? shape.cardRadius}px`
    ,'--theme-card-shadow': theme.cards?.shadow || elevation.card
    ,'--theme-card-blur': `${theme.cards?.blur || 0}px`
    ,'--theme-social-color': theme.socialIcons?.color || colors.primaryText
    ,'--theme-social-size': `${theme.socialIcons?.size || 36}px`
    ,'--theme-surface-blur': `${theme.effects?.blur || 0}px`
  };
}

/**
 * THM-002 Token Inheritance Resolver:
 * Implements deterministic precedence:
 * Platform Defaults -> Preset Tokens -> Profile Customizations -> Block-level Overrides
 */
export function resolveThemeTokens(
  presetTokens?: Partial<StandardTheme['tokens']>,
  profileCustomizations?: Partial<StandardTheme['tokens']>,
  blockOverrides?: Partial<StandardTheme['tokens']>
): StandardTheme['tokens'] {
  const base = normalizeTheme({}).tokens;

  const mergedColors = {
    ...base.colors,
    ...(presetTokens?.colors || {}),
    ...(profileCustomizations?.colors || {}),
    ...(blockOverrides?.colors || {})
  };

  const mergedTypography = {
    ...base.typography,
    ...(presetTokens?.typography || {}),
    ...(profileCustomizations?.typography || {}),
    ...(blockOverrides?.typography || {})
  };

  const mergedShape = {
    ...base.shape,
    ...(presetTokens?.shape || {}),
    ...(profileCustomizations?.shape || {}),
    ...(blockOverrides?.shape || {})
  };

  const mergedSpacing = {
    ...base.spacing,
    ...(presetTokens?.spacing || {}),
    ...(profileCustomizations?.spacing || {}),
    ...(blockOverrides?.spacing || {})
  };

  const mergedElevation = {
    ...base.elevation,
    ...(presetTokens?.elevation || {}),
    ...(profileCustomizations?.elevation || {}),
    ...(blockOverrides?.elevation || {})
  };

  const mergedMotion = {
    ...base.motion,
    ...(presetTokens?.motion || {}),
    ...(profileCustomizations?.motion || {}),
    ...(blockOverrides?.motion || {})
  };

  return {
    colors: mergedColors,
    typography: mergedTypography,
    shape: mergedShape,
    spacing: mergedSpacing,
    elevation: mergedElevation,
    motion: mergedMotion
  };
}

/**
 * Resolves full StandardTheme inheritance hierarchy:
 * Platform Defaults -> Preset -> Profile Customizations -> Block/Local Overrides
 */
export function resolveStandardTheme(
  presetTheme?: Partial<StandardTheme>,
  profileCustomizations?: Partial<StandardTheme>,
  blockOverrides?: Partial<StandardTheme>
): StandardTheme {
  const base = normalizeTheme({});

  const tokens = resolveThemeTokens(
    presetTheme?.tokens,
    profileCustomizations?.tokens,
    blockOverrides?.tokens
  );

  const background = {
    ...base.background,
    ...(presetTheme?.background || {}),
    ...(profileCustomizations?.background || {}),
    ...(blockOverrides?.background || {})
  };

  const effects = {
    ...base.effects,
    ...(presetTheme?.effects || {}),
    ...(profileCustomizations?.effects || {}),
    ...(blockOverrides?.effects || {})
  };

  const componentVariants = {
    ...(base.componentVariants || { link: 'solid', image: 'rounded', socialIcons: 'line', form: 'card' }),
    ...(presetTheme?.componentVariants || {}),
    ...(profileCustomizations?.componentVariants || {}),
    ...(blockOverrides?.componentVariants || {})
  };

  const blockDefaults = {
    ...base.blockDefaults,
    ...(presetTheme?.blockDefaults || {}),
    ...(profileCustomizations?.blockDefaults || {}),
    ...(blockOverrides?.blockDefaults || {})
  };

  return normalizeTheme({
    ...base,
    ...(presetTheme || {}),
    ...(profileCustomizations || {}),
    ...(blockOverrides || {}),
    tokens,
    background,
    effects,
    componentVariants,
    blockDefaults
  });
}
