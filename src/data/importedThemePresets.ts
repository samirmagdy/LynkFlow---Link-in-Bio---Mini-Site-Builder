import { StandardTheme } from '../types/themeSchema';
import { calculateContrastRatio } from '../utils/themeEngine';

type ExternalTheme = {
  id: string;
  name: string;
  buttonColor: string;
  buttonTextColor: string;
  borderRadiusRatio: number;
  borderWidthRatio: number;
  borderColor: string;
  spacingRatio: number;
  shadowRatio: number;
  shadowStyle: string;
  tactileLinkType: string;
  scrimAmount: number;
  headerLayout: string;
  enableSheet: boolean;
  sheetColor: string;
  foregroundColor: string;
  headerTextColor: string;
  profilePictureBorder: number;
  profilePictureBorderColor: string;
  background: { backgroundType: string; backgroundValue: string };
  fontStyle1: { style: string; family: string };
  fontStyle2: { style: string; family: string };
  backgroundImageUrl: string | null;
};

const importedThemes: ExternalTheme[] = [
  { id: 'template_1730382121193', name: 'elemental', buttonColor: '#FFFFFF', buttonTextColor: '#6B5B71', borderRadiusRatio: .722, borderWidthRatio: .233, borderColor: 'rgba(91, 91, 113, 1)', spacingRatio: .174, shadowRatio: 0, shadowStyle: 'SOLID', tactileLinkType: 'NONE', scrimAmount: 0, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#ebebeb', foregroundColor: 'rgba(107, 91, 113, 1)', headerTextColor: 'rgba(107, 91, 113, 1)', profilePictureBorder: 0, profilePictureBorderColor: 'rgba(91, 91, 113, 1)', background: { backgroundType: 'SOLID', backgroundValue: 'rgba(248, 245, 237, 1)' }, fontStyle1: { style: '700', family: 'Karla' }, fontStyle2: { style: '400', family: 'Karla' }, backgroundImageUrl: null },
  { id: 'tpl.1773081380488.tefmpksb', name: 'Minimal Fashion', buttonColor: '#FFFFFF', buttonTextColor: '#2C2C2C', borderRadiusRatio: .8, borderWidthRatio: .2, borderColor: '#666666', spacingRatio: .45, shadowRatio: .2, shadowStyle: 'SOFT', tactileLinkType: 'FLAT', scrimAmount: 0, headerLayout: 'HEADSHOT', enableSheet: true, sheetColor: '#EBEBEB', foregroundColor: '#2C2C2C', headerTextColor: '#2C2C2C', profilePictureBorder: 0, profilePictureBorderColor: '#666666', background: { backgroundType: 'SOLID', backgroundValue: '#F7F7F7' }, fontStyle1: { style: '600', family: 'Poppins' }, fontStyle2: { style: '400', family: 'Inter' }, backgroundImageUrl: null },
  { id: 'tpl.1773081060496.ww5vka1d', name: 'Studio Cozy', buttonColor: '#FFFFFF', buttonTextColor: '#3D2B1F', borderRadiusRatio: .48, borderWidthRatio: .18, borderColor: '#C67B5C', spacingRatio: .42, shadowRatio: .42, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: 0, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#F0DCC8', foregroundColor: '#3D2B1F', headerTextColor: '#3D2B1F', profilePictureBorder: 0, profilePictureBorderColor: '#C67B5C', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(135deg, hsl(26,71.1%,83.7%) 0%, hsl(16,53.4%,53.7%) 100%)' }, fontStyle1: { style: '700', family: 'Roboto Slab' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: null },
  { id: 'tpl.1771893558987.2h6hr45d', name: 'Pulse App Hub', buttonColor: '#1B5FE8', buttonTextColor: '#0A1A40', borderRadiusRatio: .4, borderWidthRatio: .04, borderColor: '#1B5FE8', spacingRatio: .45, shadowRatio: .85, shadowStyle: 'SOFT', tactileLinkType: 'CONVEX', scrimAmount: 0, headerLayout: 'BANNER', enableSheet: false, sheetColor: '#D6E2FF', foregroundColor: '#0A1A40', headerTextColor: '#0A1A40', profilePictureBorder: 0, profilePictureBorderColor: '#1B5FE8', background: { backgroundType: 'ANIMATED', backgroundValue: '{"colors":["rgb(235, 240, 255)","rgb(137, 167, 255)","#D6E2FF","#89A7FF"]}' }, fontStyle1: { style: '700', family: 'Space Mono' }, fontStyle2: { style: '400', family: 'IBM Plex Sans' }, backgroundImageUrl: null },
  { id: 'tpl.1771894913550.a3fjdgs3', name: 'Simple Creator', buttonColor: '#F5F5F5', buttonTextColor: '#1A1A1A', borderRadiusRatio: .75, borderWidthRatio: .02, borderColor: '#333333', spacingRatio: .45, shadowRatio: .15, shadowStyle: 'SOFT', tactileLinkType: 'FLAT', scrimAmount: 0, headerLayout: 'BANNER', enableSheet: true, sheetColor: '#F0F0F0', foregroundColor: '#1A1A1A', headerTextColor: '#1A1A1A', profilePictureBorder: 0, profilePictureBorderColor: '#333333', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(180deg, hsl(39,23.2%,72.9%) 0%, hsl(35,26.1%,91%) 100%)' }, fontStyle1: { style: '600', family: 'Poppins' }, fontStyle2: { style: '400', family: 'Inter' }, backgroundImageUrl: null },
  { id: 'tpl.1773081711714.xtsimneu', name: 'Community Hub', buttonColor: '#FFFFFF', buttonTextColor: '#3D3028', borderRadiusRatio: .5, borderWidthRatio: .2, borderColor: '#8B7355', spacingRatio: .4, shadowRatio: .4, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: 0, headerLayout: 'BUSINESS', enableSheet: false, sheetColor: '#F0ECE4', foregroundColor: '#3D3028', headerTextColor: '#3D3028', profilePictureBorder: 0, profilePictureBorderColor: '#8B7355', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(135deg, hsl(34,65.4%,89.8%) 0%, hsl(22,61.6%,61.2%) 100%)' }, fontStyle1: { style: '700', family: 'Cabin' }, fontStyle2: { style: '400', family: 'Cardo' }, backgroundImageUrl: null },
  { id: 'template_1730379032995', name: 'Chroma Muse', buttonColor: '#ffffff', buttonTextColor: '#333333', borderRadiusRatio: 0, borderWidthRatio: .063, borderColor: '#000000', spacingRatio: .279, shadowRatio: 1, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: .089, headerLayout: 'BANNER', enableSheet: true, sheetColor: '#fff9ff', foregroundColor: '#333333', headerTextColor: '#333333', profilePictureBorder: .25, profilePictureBorderColor: '#FFFFFF', background: { backgroundType: 'IMAGE', backgroundValue: 'transparent' }, fontStyle1: { style: '700', family: 'Open Sans' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: 'https://d3rq6m369s8u39.cloudfront.net/upload/kYtaJQRJt9P.png' },
  { id: 'template_1730374602088', name: 'Simpler Science Podcast', buttonColor: '#202020', buttonTextColor: '#FFFFFF', borderRadiusRatio: 1, borderWidthRatio: 0, borderColor: '#F0F0F0', spacingRatio: .171, shadowRatio: 1, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: .236, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#eeeeee', foregroundColor: '#000000', headerTextColor: '#000000', profilePictureBorder: .62, profilePictureBorderColor: '#FFFFFF', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(24deg, hsl(280,75%,34.5%) 0%, hsl(203,100%,50.6%) 100%)' }, fontStyle1: { style: '400', family: 'Inter' }, fontStyle2: { style: '400', family: 'Inter' }, backgroundImageUrl: 'https://d1ym67wyom4bkd.cloudfront.net/upload/vanGtu5fpea8.jpeg' },
  { id: 'tpl.1771897561644.q4iqa497', name: 'Noir & Co', buttonColor: '#122830', buttonTextColor: '#4ECDC4', borderRadiusRatio: .2, borderWidthRatio: .02, borderColor: '#4ECDC4', spacingRatio: .4, shadowRatio: .55, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: -.15, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#0F2228', foregroundColor: '#E0F0F0', headerTextColor: '#E0F0F0', profilePictureBorder: 0, profilePictureBorderColor: '#4ECDC4', background: { backgroundType: 'IMAGE', backgroundValue: '#0A1A1F' }, fontStyle1: { style: '600', family: 'Work Sans' }, fontStyle2: { style: '400', family: 'Libre Baskerville' }, backgroundImageUrl: 'https://d1ym67wyom4bkd.cloudfront.net/upload/2fb7sjBPX.png' },
  { id: 'template_1674961856766', name: 'Fit Coach', buttonColor: '#ffffff', buttonTextColor: '#333333', borderRadiusRatio: .297, borderWidthRatio: 0, borderColor: '#1b97f5', spacingRatio: .45, shadowRatio: 1, shadowStyle: 'SOFT', tactileLinkType: 'FLAT', scrimAmount: .199, headerLayout: 'BANNER', enableSheet: true, sheetColor: '#f6f6f6', foregroundColor: '#383737', headerTextColor: '#383737', profilePictureBorder: .592, profilePictureBorderColor: '#fcfcfc', background: { backgroundType: 'SOLID', backgroundValue: '#CCD1C3' }, fontStyle1: { style: '700', family: 'Open Sans' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: null },
  { id: 'template_1674961093936', name: 'DJ Vibes', buttonColor: '#202020', buttonTextColor: '#FFFFFF', borderRadiusRatio: 1, borderWidthRatio: .464, borderColor: '#F0F0F0', spacingRatio: .324, shadowRatio: 1, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: -.353, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#eeeeee', foregroundColor: '#FFFFFF', headerTextColor: '#FFFFFF', profilePictureBorder: .28, profilePictureBorderColor: '#FFFFFF', background: { backgroundType: 'IMAGE', backgroundValue: 'transparent' }, fontStyle1: { style: '500', family: 'Cabin' }, fontStyle2: { style: '300i', family: 'Libre Franklin' }, backgroundImageUrl: 'https://d1ym67wyom4bkd.cloudfront.net/upload/vanGtu5fpea8.jpeg' },
  { id: 'template_1674960069671', name: 'SocialSavvy', buttonColor: '#313131', buttonTextColor: '#FFFFFF', borderRadiusRatio: .591, borderWidthRatio: 0, borderColor: '#1b97f5', spacingRatio: 0, shadowRatio: .001, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: .026, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#eeeeee', foregroundColor: '#000000', headerTextColor: '#000000', profilePictureBorder: .285, profilePictureBorderColor: '#F4154A', background: { backgroundType: 'SOLID', backgroundValue: '#F8F8F8' }, fontStyle1: { style: '700', family: 'Open Sans' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: 'https://d1ym67wyom4bkd.cloudfront.net/upload/jzcFwMcNBaNg.jpeg' },
  { id: 'template_1674958915690', name: 'DreamHome', buttonColor: '#FFFFFF', buttonTextColor: '#000000', borderRadiusRatio: .395, borderWidthRatio: 0, borderColor: '#1b97f5', spacingRatio: 0, shadowRatio: 1, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: -.401, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#ebebeb', foregroundColor: '#FFFFFF', headerTextColor: '#FFFFFF', profilePictureBorder: 0, profilePictureBorderColor: '#1b97f5', background: { backgroundType: 'IMAGE', backgroundValue: 'transparent' }, fontStyle1: { style: '800', family: 'Poppins' }, fontStyle2: { style: '300', family: 'Inter' }, backgroundImageUrl: 'https://d1ym67wyom4bkd.cloudfront.net/upload/aFcKIfJ1C99s.jpeg' },
  { id: 'template_1674952997357', name: 'PenAndPaper', buttonColor: '#E9E4E4', buttonTextColor: '#373E48', borderRadiusRatio: 1, borderWidthRatio: 0, borderColor: '#090909', spacingRatio: .45, shadowRatio: 1, shadowStyle: 'SOFT', tactileLinkType: 'CONCAVE', scrimAmount: .158, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#F5F1E4', foregroundColor: '#373E48', headerTextColor: '#373E48', profilePictureBorder: .466, profilePictureBorderColor: '#F5F4EF', background: { backgroundType: 'SOLID', backgroundValue: '#F5F1E4' }, fontStyle1: { style: '700', family: 'Lato' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: 'https://d1ym67wyom4bkd.cloudfront.net/upload/O6GEVPlZGxIA.jpg' },
  { id: 'tpl.1773081134992.fiwpgble', name: 'Retro Reel Studio', buttonColor: '#E8D8B8', buttonTextColor: '#2B1D0E', borderRadiusRatio: .12, borderWidthRatio: 0, borderColor: '#B85C38', spacingRatio: .26, shadowRatio: .9, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: .122, headerLayout: 'BUSINESS', enableSheet: false, sheetColor: '#FFF9E1', foregroundColor: '#2B1D0E', headerTextColor: '#2B1D0E', profilePictureBorder: 0, profilePictureBorderColor: '#B85C38', background: { backgroundType: 'ANIMATED', backgroundValue: '{"colors":["#FFF9E1","#905946","#B85C38","#FFF9E1"]}' }, fontStyle1: { style: '700', family: 'Roboto Slab' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: null },
  { id: 'template_1674934778971', name: 'BrooklynSnap', buttonColor: '#F6F6F6', buttonTextColor: '#000000', borderRadiusRatio: .362, borderWidthRatio: 0, borderColor: '#333333', spacingRatio: .183, shadowRatio: 0, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: -.076, headerLayout: 'BANNER', enableSheet: true, sheetColor: '#2F2E2E', foregroundColor: '#FFFFFF', headerTextColor: '#FFFFFF', profilePictureBorder: .79, profilePictureBorderColor: '#FAFCFF', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(180deg, hsl(127,28.6%,30.2%) 0%, hsl(165,62.1%,81.4%) 100%)' }, fontStyle1: { style: '700', family: 'Open Sans' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: null },
  { id: 'tpl.1773081529247.5g6m3mhs', name: 'Portfolio Noir', buttonColor: '#191919', buttonTextColor: '#FFFFFF', borderRadiusRatio: .22, borderWidthRatio: .18, borderColor: '#000000', spacingRatio: .42, shadowRatio: .56, shadowStyle: 'SOFT', tactileLinkType: 'NONE', scrimAmount: 0, headerLayout: 'CLASSIC', enableSheet: false, sheetColor: '#F0F0F0', foregroundColor: '#D9D9D9', headerTextColor: '#D9D9D9', profilePictureBorder: 0, profilePictureBorderColor: '#000000', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(135deg, hsl(225,38.7%,12.2%) 0%, hsl(222,37.7%,12%) 100%)' }, fontStyle1: { style: '700', family: 'Roboto Slab' }, fontStyle2: { style: '400', family: 'Open Sans' }, backgroundImageUrl: null },
  { id: 'tpl.1773081772619.t4jh01rn', name: 'Clean Eating', buttonColor: '#FFFFFF', buttonTextColor: '#3D3028', borderRadiusRatio: .82, borderWidthRatio: .18, borderColor: '#8B7355', spacingRatio: .45, shadowRatio: .2, shadowStyle: 'SOFT', tactileLinkType: 'FLAT', scrimAmount: 0, headerLayout: 'BANNER', enableSheet: true, sheetColor: '#F0ECE4', foregroundColor: '#3D3028', headerTextColor: '#3D3028', profilePictureBorder: 0, profilePictureBorderColor: '#8B7355', background: { backgroundType: 'GRADIENT', backgroundValue: 'linear-gradient(180deg, hsl(36,33.3%,97.1%) 0%, hsl(40,28.6%,91.8%) 100%)' }, fontStyle1: { style: '600', family: 'Poppins' }, fontStyle2: { style: '400', family: 'Inter' }, backgroundImageUrl: null }
];

const hslToHex = (h: number, s: number, l: number): string => {
  const saturation = Math.max(0, Math.min(100, s)) / 100;
  const lightness = Math.max(0, Math.min(100, l)) / 100;
  const hue = ((h % 360) + 360) % 360 / 360;
  const hueToRgb = (p: number, q: number, t: number) => {
    const normalized = (t + 1) % 1;
    if (normalized < 1 / 6) return p + (q - p) * 6 * normalized;
    if (normalized < 1 / 2) return q;
    if (normalized < 2 / 3) return p + (q - p) * (2 / 3 - normalized) * 6;
    return p;
  };
  if (saturation === 0) {
    const channel = Math.round(lightness * 255).toString(16).padStart(2, '0');
    return `#${channel}${channel}${channel}`;
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return `#${[hue + 1 / 3, hue, hue - 1 / 3].map(value => Math.round(hueToRgb(p, q, value) * 255).toString(16).padStart(2, '0')).join('')}`;
};

const toHex = (value: string, fallback: string): string => {
  const hex = value.match(/#[0-9a-f]{3,8}/i)?.[0];
  if (hex) return hex;
  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return `#${[rgb[1], rgb[2], rgb[3]].map(channel => Number(channel).toString(16).padStart(2, '0')).join('')}`;
  const hsl = value.match(/hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%/i);
  if (hsl) return hslToHex(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]));
  return fallback;
};

const bestReadableColor = (requested: string, background: string, minimum: number): string => {
  const requestedHex = toHex(requested, '#000000');
  const candidates = [requestedHex, '#000000', '#FFFFFF'];
  const readable = candidates
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .filter(candidate => calculateContrastRatio(candidate, background) >= minimum)
    .sort((a, b) => calculateContrastRatio(b, background) - calculateContrastRatio(a, background));
  return readable[0] || (calculateContrastRatio('#000000', background) >= calculateContrastRatio('#FFFFFF', background) ? '#000000' : '#FFFFFF');
};

const representativeBackground = (theme: ExternalTheme): string => {
  const value = theme.background.backgroundValue;
  if (theme.background.backgroundType !== 'IMAGE') return toHex(value, '#F8F8F8');
  if (value !== 'transparent') return toHex(value, toHex(theme.sheetColor, '#F8F8F8'));
  const foreground = toHex(theme.foregroundColor, '#18181B');
  return calculateContrastRatio(foreground, '#000000') > calculateContrastRatio(foreground, '#FFFFFF') ? '#111827' : toHex(theme.sheetColor, '#F8F8F8');
};

const shadowFor = (theme: ExternalTheme): string => theme.shadowRatio <= 0 ? 'none' : `0 8px ${Math.max(8, Math.round(theme.shadowRatio * 28))}px rgba(15, 23, 42, ${Math.min(.24, .06 + theme.shadowRatio * .12)})`;

const mapExternalTheme = (theme: ExternalTheme): StandardTheme => {
  const pageBackground = representativeBackground(theme);
  const isGradient = theme.background.backgroundType === 'GRADIENT' || theme.background.backgroundType === 'ANIMATED';
  const backgroundImage = theme.background.backgroundType === 'IMAGE' && theme.backgroundImageUrl ? theme.backgroundImageUrl : null;
  const linkVariant = theme.tactileLinkType === 'CONCAVE' ? 'glass' : theme.tactileLinkType === 'FLAT' ? 'soft-card' : theme.tactileLinkType === 'NONE' ? 'outline' : 'solid';
  const headerStyle = theme.headerLayout === 'BUSINESS' ? 'compact' : theme.headerLayout === 'BANNER' ? 'hero' : 'standard';
  const radius = Math.round(Math.max(0, Math.min(1, theme.borderRadiusRatio)) * 24);
  const buttonRadius = theme.borderRadiusRatio > .78 ? 999 : Math.max(4, radius);
  const bodyWeight = Number(theme.fontStyle2.style.replace(/\D/g, '')) || 400;
  const headingWeight = Number(theme.fontStyle1.style.replace(/\D/g, '')) || 700;
  const border = toHex(theme.borderColor, '#D4D4D8');
  const primaryText = bestReadableColor(theme.headerTextColor || theme.foregroundColor, pageBackground, 4.5);
  const secondaryText = bestReadableColor(theme.foregroundColor, pageBackground, 3);
  const accent = toHex(theme.buttonColor, '#6366F1');
  const accentText = bestReadableColor(theme.buttonTextColor, accent, 4.5);
  const panel = toHex(theme.sheetColor, pageBackground);
  const cardTextColor = bestReadableColor(primaryText, panel, 4.5);
  const cardSubtitleColor = bestReadableColor(secondaryText, panel, 3);
  const focusRing = bestReadableColor(accent, pageBackground, 3);

  // Bug 7 fix: position was never written — omitting it caused the CSS compiler to
  // emit `background-position: undefined`, breaking image centering on all 5
  // imported image-backed themes (DJ Vibes, DreamHome, SocialSavvy, PenAndPaper,
  // Noir & Co).
  //
  // Bug 3 fix: scrimAmount can be negative (DJ Vibes −0.353, DreamHome −0.401).
  // Math.max(0, …) already floors them to 0, but that leaves a dark image with
  // no overlay at all, making white header text unreadable on bright image areas.
  // Enforce a minimum of 0.20 specifically for image-type backgrounds so text
  // always has at least a light scrim regardless of the original scrimAmount.
  const overlayValue = Math.max(0, Math.min(0.8, theme.scrimAmount));
  const safeOverlay = backgroundImage ? Math.max(0.20, overlayValue) : overlayValue;
  return {
    id: `imported-${theme.id.replace(/[^a-z0-9]+/gi, '-')}`,
    schemaVersion: 1,
    name: theme.name,
    source: 'imported',
    presetId: theme.id,
    tokens: {
      colors: { pageBackground, panelBackground: panel, primaryText, secondaryText, accent, accentText, border, focusRing, cardBg: panel, cardTextColor, cardSubtitleColor, cardBorder: border },
      typography: { bodyFamily: `${theme.fontStyle2.family}, ui-sans-serif, system-ui, sans-serif`, displayFamily: `${theme.fontStyle1.family}, ui-sans-serif, system-ui, sans-serif`, bodySize: '16px', bodyWeight, headingWeight, bodyLineHeight: 1.5, headingLineHeight: 1.15 },
      shape: { pageRadius: radius, cardRadius: radius, buttonRadius, avatarRadius: theme.profilePictureBorder > .6 ? 999 : 18 },
      spacing: { pageX: 12 + Math.round(theme.spacingRatio * 24), pageY: 18 + Math.round(theme.spacingRatio * 24), blockGap: 8 + Math.round(theme.spacingRatio * 14), sectionGap: 18 + Math.round(theme.spacingRatio * 20) },
      elevation: { card: shadowFor(theme), button: shadowFor(theme) },
      motion: { durationMs: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', enabled: true, hoverEffect: theme.tactileLinkType === 'NONE' ? 'none' : 'lift' }
    },
    background: backgroundImage
      ? { type: 'image', assetUrl: backgroundImage, fallbackColor: pageBackground, position: 'center', overlay: safeOverlay }
      : { type: isGradient ? 'gradient' : 'solid', gradientStops: isGradient ? theme.background.backgroundValue : undefined, fallbackColor: pageBackground, position: 'center', overlay: safeOverlay },
    header: { alignment: theme.headerLayout === 'BUSINESS' ? 'left' : 'center', avatarSize: theme.headerLayout === 'HEADSHOT' ? 104 : 86, showShare: true, showSocials: true },
    layout: { maxWidth: theme.spacingRatio > .4 ? '680px' : '620px', alignment: theme.headerLayout === 'BUSINESS' ? 'left' : 'center', headerStyle, blockWidth: theme.spacingRatio < .25 ? 'narrow' : 'full', navigationStyle: theme.enableSheet ? 'pills' : 'tabs' },
    componentVariants: { link: linkVariant, image: theme.headerLayout === 'HEADSHOT' ? 'polaroid' : 'rounded', socialIcons: theme.tactileLinkType === 'NONE' ? 'minimal' : 'filled', form: linkVariant === 'glass' ? 'glass' : 'card' },
    blockDefaults: { link: { variant: linkVariant === 'glass' ? 'glass' : linkVariant === 'soft-card' ? 'soft' : linkVariant === 'outline' ? 'outline' : 'filled', height: 58, thumbnail: theme.headerLayout === 'HEADSHOT' ? 'left' : 'none', shadow: theme.shadowRatio === 0 ? 'none' : 'sm' }, text: { alignment: theme.headerLayout === 'BUSINESS' ? 'left' : 'center' }, media: { radius: 'lg' }, folder: { variant: linkVariant === 'glass' ? 'glass' : 'filled' } },
    responsive: { mobile: { maxWidth: 680, pageX: 16, pageY: 18, blockGap: 12 }, tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 }, desktop: { maxWidth: 860, pageX: 28, pageY: 30, blockGap: 16 } },
    accessibility: { reducedMotion: 'respectUserPreference', minimumContrast: 'AA' }
  };
};

/**
 * Safe projection of the supplied Linktree `bliss` appearance response.
 * Authentication/profile tokens are intentionally not part of a theme preset.
 */
const blissAppearanceTheme: StandardTheme = {
  id: 'imported-linktree-bliss',
  schemaVersion: 1,
  name: 'Bliss — Samir Awwad',
  source: 'imported',
  presetId: 'linktree.bliss',
  tokens: {
    colors: {
      pageBackground: '#D9DFDE',
      panelBackground: '#E6E9E7',
      primaryText: '#22211C',
      secondaryText: '#3D3B35',
      accent: '#E6E9E7',
      accentText: '#22211C',
      border: '#859996',
      focusRing: '#22211C',
      cardBg: '#E6E9E7',
      cardTextColor: '#22211C',
      cardSubtitleColor: '#3D3B35',
      cardBorder: '#859996'
    },
    typography: {
      bodyFamily: 'Manrope, ui-sans-serif, system-ui, sans-serif',
      displayFamily: 'Playfair Display, Georgia, serif',
      bodySize: '16px',
      bodyWeight: 400,
      headingWeight: 700,
      bodyLineHeight: 1.5,
      headingLineHeight: 1.15
    },
    shape: { pageRadius: 18, cardRadius: 16, buttonRadius: 12, avatarRadius: 999 },
    spacing: { pageX: 18, pageY: 24, blockGap: 14, sectionGap: 24 },
    elevation: {
      card: '0 8px 24px rgba(133, 153, 150, 0.24)',
      button: '0 6px 18px rgba(133, 153, 150, 0.32)'
    },
    motion: { durationMs: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', enabled: true, hoverEffect: 'lift' }
  },
  background: {
    type: 'image',
    assetUrl: 'https://assets.production.linktr.ee/static/linktree_theme/astrid/076ad6d0-d737-46ce-9814-a14759d02fb0_background-image-20250827-180650.png',
    fallbackColor: '#D9DFDE',
    position: 'center',
    overlay: 0.45
  },
  header: { alignment: 'center', avatarSize: 112, showShare: true, showSocials: true },
  layout: { maxWidth: '680px', alignment: 'center', headerStyle: 'hero', blockWidth: 'full', navigationStyle: 'pills' },
  componentVariants: { link: 'soft-card', image: 'rounded', socialIcons: 'minimal', form: 'card' },
  blockDefaults: {
    link: { variant: 'soft', height: 58, thumbnail: 'none', shadow: 'sm' },
    text: { alignment: 'center' },
    media: { radius: 'lg' },
    folder: { variant: 'filled' }
  },
  responsive: {
    mobile: { maxWidth: 680, pageX: 16, pageY: 18, blockGap: 12 },
    tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 },
    desktop: { maxWidth: 860, pageX: 28, pageY: 30, blockGap: 16 }
  },
  accessibility: { reducedMotion: 'respectUserPreference', minimumContrast: 'AA' }
};

export const IMPORTED_THEME_PRESETS: StandardTheme[] = [
  ...importedThemes.map(mapExternalTheme),
  blissAppearanceTheme
];
