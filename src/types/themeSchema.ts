export interface ThemeColorTokens {
  pageBackground: string;
  panelBackground: string;
  primaryText: string;
  secondaryText: string;
  accent: string;
  accentText: string;
  border: string;
  focusRing: string;
  cardBg?: string;
  cardTextColor?: string;
  cardSubtitleColor?: string;
  cardBorder?: string;
  /** Semantic aliases used by the resolved design-token system. Legacy keys remain for migration. */
  surfaceBase?: string;
  surfaceRaised?: string;
  surfaceMuted?: string;
  textPrimary?: string;
  textSecondary?: string;
  textDisabled?: string;
  borderSubtle?: string;
  borderStrong?: string;
  accentPrimary?: string;
  accentHover?: string;
  accentPressed?: string;
  accentDisabled?: string;
  ctaText?: string;
  success?: string;
  warning?: string;
  danger?: string;
  overlay?: string;
}

export interface ThemeTypographyTokens {
  bodyFamily: string;
  displayFamily: string;
  /** Approved Arabic-capable family used when the resolved direction is RTL. */
  arabicFamily?: string;
  bodySize: string; // e.g. "16px"
  bodyWeight: number; // e.g. 400
  headingWeight: number; // e.g. 700
  bodyLineHeight: number; // e.g. 1.5
  headingLineHeight: number; // e.g. 1.15
  letterSpacing?: string; // e.g. "0px"
  headingScale?: number;
  bodyScale?: number;
  captionSize?: string;
  buttonTextSize?: string;
  maxLineLength?: string;
  textTransform?: 'none' | 'uppercase' | 'capitalize';
}

export interface ThemeShapeTokens {
  pageRadius: number; // px
  cardRadius: number; // px
  buttonRadius: number; // px
  avatarRadius: number; // px (e.g. 999 for circle)
}

export interface ThemeSpacingTokens {
  pageX: number; // px
  pageY: number; // px
  blockGap: number; // px
  sectionGap: number; // px
}

export interface ThemeElevationTokens {
  card: string; // box-shadow string
  button?: string;
}

export interface ThemeMotionTokens {
  durationMs: number;
  easing: string;
  enabled: boolean;
  hoverEffect?: 'none' | 'scale' | 'lift' | 'glow';
}

export interface ThemeEffects {
  grain: boolean;
  blur: number;
  glow: boolean;
}

export interface ThemeProfileTokens {
  showAvatar: boolean;
  avatarShape: 'circle' | 'rounded' | 'square';
}

export interface ThemeButtonTokens {
  background: string;
  text: string;
  border: string;
  shadow: string;
  height: number;
  blur: number;
}

export interface ThemeCardTokens {
  background: string;
  text: string;
  border: string;
  radius: number;
  shadow: string;
  blur: number;
}

export interface ThemeSocialIconTokens {
  color: string;
  size: number;
  style: 'line' | 'filled' | 'minimal';
}

export interface ThemeTokens {
  colors: ThemeColorTokens;
  typography: ThemeTypographyTokens;
  shape: ThemeShapeTokens;
  spacing: ThemeSpacingTokens;
  elevation: ThemeElevationTokens;
  motion: ThemeMotionTokens;
}

export interface ThemeBackground {
  type: 'solid' | 'gradient' | 'image' | 'video' | 'pattern';
  assetId?: string | null;
  mobileAssetId?: string | null;
  assetUrl?: string | null;
  mobileAssetUrl?: string | null;
  /** Tiny same-image placeholder shown while a full background loads. */
  placeholderUrl?: string | null;
  posterUrl?: string | null;
  position?: 'center' | 'top' | 'bottom';
  fit?: 'cover' | 'contain' | 'natural';
  focalPoint?: { x: number; y: number };
  scale?: number;
  blur?: number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  reducedMotionFallback?: 'poster' | 'image' | 'solid';
  overlay?: number; // 0 to 1 opacity
  overlayColor?: string;
  fallbackColor?: string;
  gradientStops?: string; // e.g. 'linear-gradient(135deg, #090e1a 0%, #111a33 100%)'
}

export interface ThemeHeader {
  alignment: 'left' | 'center' | 'right';
  avatarSize: number; // px
  showShare: boolean;
  showSocials: boolean;
}

export interface ThemeLayout {
  templateId?: 'centered-creator' | 'left-professional' | 'editorial-portfolio' | 'service-conversion' | 'product-showcase' | 'gallery-portfolio' | 'booking-first' | 'link-collection';
  maxWidth: string;
  alignment: 'left' | 'center';
  headerStyle: 'standard' | 'hero' | 'compact';
  blockWidth: 'full' | 'narrow' | 'mixed';
  navigationStyle: 'none' | 'tabs' | 'pills';
  navigationPosition?: 'top' | 'below-header' | 'bottom';
  sectionGrouping?: 'flat' | 'grouped' | 'editorial';
  sectionBackground?: string;
  sectionDivider?: 'none' | 'line' | 'accent';
  imagePlacement?: 'inline' | 'full-bleed' | 'alternating';
  socialIconPlacement?: 'header' | 'footer' | 'inline';
  ctaPosition?: 'first' | 'after-header' | 'priority-order';
  showFooter?: boolean;
}

export interface ThemeComponentVariants {
  link: 'solid' | 'outline' | 'soft-card' | 'image-card' | 'glass';
  image: 'rounded' | 'full-bleed' | 'polaroid';
  socialIcons: 'line' | 'filled' | 'minimal';
  form: 'card' | 'bordered' | 'glass';
}

export interface LinkBlockDefaults {
  variant: 'filled' | 'outline' | 'soft' | 'glass';
  height: number;
  thumbnail: 'none' | 'left' | 'avatar';
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'colored';
}

export interface TextBlockDefaults {
  alignment: 'left' | 'center' | 'right';
}

export interface MediaBlockDefaults {
  radius: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export interface FolderBlockDefaults {
  variant: 'filled' | 'outline' | 'glass';
}

export interface BlockDefaultStyles {
  link?: LinkBlockDefaults;
  text?: TextBlockDefaults;
  media?: MediaBlockDefaults;
  folder?: FolderBlockDefaults;
}

export interface ViewportResponsiveRule {
  maxWidth: number;
  pageX: number;
  pageY: number;
  blockGap: number;
  /** Optional viewport-specific composition overrides. */
  avatarSize?: number;
  headingScale?: number;
  imageHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  navigationPosition?: 'top' | 'below-header' | 'bottom';
  blockVisibility?: 'all' | 'hide-media' | 'hide-socials';
}

export interface ResponsiveThemeRules {
  smallMobile?: ViewportResponsiveRule;
  mobile: ViewportResponsiveRule;
  tablet: ViewportResponsiveRule;
  desktop: ViewportResponsiveRule;
}

export interface AccessibilityThemeRules {
  reducedMotion: 'respectUserPreference' | 'alwaysDisable' | 'alwaysEnable';
  minimumContrast: 'AA' | 'AAA';
}

export type ThemeConversionGoal = 'contact' | 'book' | 'buy' | 'portfolio' | 'newsletter' | 'whatsapp' | 'download' | 'social';

export interface ThemeConversionSettings {
  goal: ThemeConversionGoal;
  primaryBlockId?: string | null;
  secondaryBlockId?: string | null;
  whatsappCountryCode?: string;
  whatsappMessage?: string;
  whatsappTrackingParameter?: string;
  businessHours?: string;
}

export interface SavedPresetComposition {
  themeId: string;
  layoutId?: string;
  brandKitId?: string;
  starterSiteId?: string;
  selectedBlockVariants?: Record<string, string>;
  includesStarterContent: boolean;
  changesContent: boolean;
  changesLayout: boolean;
}

export interface StandardTheme {
  id: string;
  profileId?: string;
  schemaVersion: number;
  name: string;
  category?: string;
  supportedGoals?: ThemeConversionGoal[];
  supportsRTL?: boolean;
  supportsDarkMode?: boolean;
  mobileFirst?: boolean;
  source: 'preset' | 'custom' | 'imported';
  presetId: string | null;
  mode?: 'light' | 'dark' | 'system';
  /** Optional public reference image used when a theme originated from a visual gallery. */
  previewImage?: string | null;
  language?: 'en' | 'ar' | 'auto';
  direction?: 'ltr' | 'rtl' | 'auto';
  tokens: ThemeTokens;
  background: ThemeBackground;
  header: ThemeHeader;
  layout?: ThemeLayout;
  componentVariants?: ThemeComponentVariants;
  profile?: ThemeProfileTokens;
  buttons?: ThemeButtonTokens;
  cards?: ThemeCardTokens;
  socialIcons?: ThemeSocialIconTokens;
  effects?: ThemeEffects;
  blockDefaults: BlockDefaultStyles;
  responsive: ResponsiveThemeRules;
  accessibility: AccessibilityThemeRules;
  conversion?: ThemeConversionSettings;
  /** Composition metadata for reusable presets; content is never included implicitly. */
  presetComposition?: SavedPresetComposition;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface PublishedThemeSnapshot {
  snapshotId: string;
  version: number;
  profileId: string;
  schemaVersion: number;
  rendererVersion: string;
  theme: StandardTheme;
  timestamp: string;
  publishedBy: string;
  versionName?: string;
  versionNotes?: string;
  changeNote?: string;
}

export interface ThemeAccessibilityIssue {
  type: 'error' | 'warning';
  tokenKey: string;
  message: string;
  ratio?: number;
  requiredRatio?: number;
  suggestedFix?: string;
}

export interface ThemeValidationResult {
  isValid: boolean;
  canPublish: boolean;
  errors: ThemeAccessibilityIssue[];
  warnings: ThemeAccessibilityIssue[];
}
