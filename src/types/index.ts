export type PlanType = 'free' | 'pro' | 'agency';
export type BillingCycle = 'monthly' | 'annual';

/**
 * PRO-005: Workspace member roles for profile-level access scoping.
 * 'owner' has full access. 'manager' is scoped to assigned profileIds only.
 * 'viewer' has read-only access (analytics, form inbox) on assigned profiles.
 */
export type ProfileRole = 'owner' | 'manager' | 'viewer';

export interface ProfileMember {
  id: string;
  email: string;
  name: string;
  role: ProfileRole;
  /** Profiles this member can access. Empty means all (owner only). */
  assignedProfileIds: string[];
  addedAt: string;
  addedBy: string; // actor email
  /** null = invitation accepted; ISO string = pending */
  pendingInviteExpiresAt?: string;
}

export type BlockType = 
  | 'link' 
  | 'media' 
  | 'gallery'
  | 'carousel'
  | 'event'
  | 'product'
  | 'course'
  | 'tip'
  | 'membership'
  | 'text' 
  | 'divider' 
  | 'folder' 
  | 'faq' 
  | 'testimonial' 
  | 'file' 
  | 'form' 
  | 'emailSignup'
  | 'contact';

/** Premium visual treatments shared by the block editor and public renderer. */
export type BlockStyleVariant =
  | 'solid' | 'outline' | 'soft' | 'image' | 'featured'
  | 'framed' | 'cinematic' | 'full-bleed' | 'split' | 'captioned'
  | 'grid' | 'bento' | 'masonry' | 'filmstrip' | 'editorial'
  | 'peek' | 'card' | 'spotlight' | 'compact' | 'offer' | 'service'
  | 'display' | 'body' | 'quote' | 'announcement' | 'stat'
  | 'hairline' | 'gradient' | 'numbered' | 'icon' | 'spacer'
  | 'accordion' | 'directory' | 'tabbed' | 'nested' | 'glass'
  | 'columns' | 'searchable' | 'avatar' | 'logo' | 'rating'
  | 'download' | 'row' | 'media-kit' | 'stack' | 'gated'
  | 'inline' | 'conversational' | 'booking' | 'newsletter' | 'conversion' | 'benefits'
  | 'email' | 'whatsapp' | 'phone' | 'methods';

export interface SocialLink {
  id: string;
  platform: 'instagram' | 'tiktok' | 'twitter' | 'youtube' | 'spotify' | 'github' | 'linkedin' | 'email' | 'discord' | 'threads' | 'whatsapp';
  url: string;
  active: boolean;
}

export type AnimeBlockEffect = 
  // Attention & Ambient Loops
  | 'pulseGlow'
  | 'heartbeat'
  | 'floating'
  | 'gentleWobble'
  | 'shimmerGleam'
  | 'rainbowBorder'
  | 'rubberBand'
  | 'jiggleAlert'
  | 'springBounce'
  | 'neonFlicker'
  | 'breathScale'
  | 'glitchShift'
  | 'radarPing'
  | 'colorCycle'
  | 'orbitGlow'
  | 'pendulumSwing'
  // Entrance & Reveal FX
  | 'springPop'
  | 'elasticWave'
  | 'backZoom'
  | 'kineticDrop'
  | 'cinematicGlide'
  | 'flip3dX'
  | 'flip3dY'
  | 'spiralUnfold'
  | 'blurFocus'
  | 'slideSkew'
  | 'zoomRotate'
  | 'cascadeStagger'
  | 'swingDrop'
  | 'rubberSnap'
  | 'pulseExpand'
  | 'curtainOpen'
  | 'glitchFlicker'
  | 'floatAscend'
  | 'snapScale'
  | 'smoothFade'
  // Text & Typography
  | 'scrambleDecode'
  | 'typewriterStagger'
  | 'waveLetters'
  | 'blurToClearText'
  | 'fadeSlideWords'
  | 'neonTextFlicker'
  // None
  | 'none';

export type AnimeEntrancePreset = 
  | 'springPop' 
  | 'elasticWave' 
  | 'cinematicGlide' 
  | 'backZoom' 
  | 'kineticDrop'
  | 'bounceStagger'
  | 'flip3dX'
  | 'flip3dY'
  | 'spiralUnfold'
  | 'blurFocus'
  | 'slideSkew'
  | 'zoomRotate'
  | 'cascadeStagger'
  | 'swingDrop'
  | 'rubberSnap'
  | 'pulseExpand'
  | 'curtainOpen'
  | 'glitchFlicker'
  | 'floatAscend'
  | 'snapScale'
  | 'smoothFade';

export type AnimeHoverEffect = 
  | 'magneticLift' 
  | 'tilt3d' 
  | 'glowSurge' 
  | 'springPress' 
  | 'rotatePlayful'
  | 'harmonicPulse'
  | 'glitchMicro'
  | 'scalePop'
  | 'skewFloat'
  | 'none';

export type AnimeClickEffect = 
  | 'rippleWave' 
  | 'confettiBurst' 
  | 'shockwave' 
  | 'squashPop' 
  | 'flashBurst'
  | 'elasticBounce'
  | 'stampPress'
  | 'particleSparks'
  | 'hapticVibrate'
  | 'none';

export interface BlockAnimationConfig {
  effect: AnimeBlockEffect;
  hoverEffect?: AnimeHoverEffect;
  clickEffect?: AnimeClickEffect;
  speed?: 'slow' | 'normal' | 'fast';
  intensity?: 'subtle' | 'medium' | 'expressive';
  repeat?: 'infinite' | 'once' | 'hover';
}

export interface LinkBlockPayload {
  url: string;
  subtitle?: string;
  icon?: string;
  thumbnailUrl?: string;
  highlightBadge?: string;
  animation?: 'none' | 'pulse' | 'shimmer' | 'bounce' | AnimeBlockEffect;
  openInNewTab?: boolean;
}

export interface MediaBlockPayload {
  mediaType: 'video' | 'audio' | 'image';
  url: string;
  caption?: string;
  alt?: string;
  altText?: string;
  captionsUrl?: string;
  poster?: string;
  aspectRatio?: '16:9' | '4:3' | '1:1';
}

interface GalleryItem {
  id: string;
  image: string;
  title?: string;
  url?: string;
  alt?: string;
}

export interface GalleryBlockPayload {
  items: GalleryItem[];
  columns?: 1 | 2 | 3;
}

export interface CarouselBlockPayload {
  items: GalleryItem[];
  autoplay?: boolean;
}

export interface ProductBlockPayload {
  image?: string;
  description?: string;
  price?: string;
  currency?: string;
  url: string;
  buttonLabel?: string;
  checkoutEnabled?: boolean;
  deliveryUrl?: string;
}

export interface CourseLesson {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  preview?: boolean;
  contentUrl?: string;
}

export interface CourseBlockPayload extends ProductBlockPayload {
  lessons: CourseLesson[];
  level?: 'beginner' | 'intermediate' | 'advanced' | 'all-levels';
}

export interface EventBlockPayload {
  date: string;
  time?: string;
  location?: string;
  description?: string;
  url?: string;
  buttonLabel?: string;
}

export interface TextBlockPayload {
  textType: 'h1' | 'h2' | 'h3' | 'p' | 'quote';
  content: string;
  alignment: 'left' | 'center' | 'right';
}

export interface DividerBlockPayload {
  style: 'hairline' | 'solid' | 'dashed' | 'dotted' | 'spacer';
  height: 'sm' | 'md' | 'lg';
}

interface FolderItem {
  id: string;
  title: string;
  url: string;
  subtitle?: string;
  icon?: string;
}

export interface FolderBlockPayload {
  description?: string;
  items: FolderItem[];
  defaultOpen?: boolean;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface FaqBlockPayload {
  items: FaqItem[];
}

export interface TestimonialBlockPayload {
  quote: string;
  authorName: string;
  authorRole?: string;
  company?: string;
  avatarUrl?: string;
  rating?: number;
}

export interface FileBlockPayload {
  fileName: string;
  fileSize: string;
  fileUrl: string;
  description?: string;
  downloadCount: number;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'date' | 'time';
  placeholder?: string;
  options?: string[]; // for select dropdown
  required: boolean;
  helpText?: string;
}

export interface FormBlockPayload {
  formType: 'newsletter' | 'contact' | 'lead' | 'feedback' | 'booking' | 'custom';
  description?: string;
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
  consentText?: string;
  requireConsent?: boolean;
  subscriberMode?: boolean; // automatically syncs email fields to Subscriber Audience list
  bookingSettings?: {
    timezone?: string;
    days?: number[];
    startTime?: string;
    endTime?: string;
    durationMinutes?: 15 | 30 | 60 | 90 | 120;
  };
}

/** Email-signup has the same persisted field contract as a newsletter form,
 * but remains a distinct block type for API/editor clarity. */
type EmailSignupBlockPayload = FormBlockPayload;

export interface ContactBlockPayload {
  contactType: 'email' | 'phone' | 'whatsapp';
  value: string;
  presetSubject?: string;
}

export interface TipBlockPayload {
  description?: string;
  amount: string;
  currency: string;
  buttonLabel?: string;
  checkoutEnabled?: boolean;
}

export interface MembershipBlockPayload {
  description?: string;
  price: string;
  currency: string;
  interval?: 'month' | 'year';
  buttonLabel?: string;
  checkoutEnabled?: boolean;
  benefits?: string[];
  deliveryUrl?: string;
}

type BlockPayload =
  | LinkBlockPayload 
  | MediaBlockPayload 
  | GalleryBlockPayload
  | CarouselBlockPayload
  | EventBlockPayload
  | ProductBlockPayload
  | CourseBlockPayload
  | TipBlockPayload
  | MembershipBlockPayload
  | TextBlockPayload 
  | DividerBlockPayload 
  | FolderBlockPayload 
  | FaqBlockPayload 
  | TestimonialBlockPayload 
  | FileBlockPayload 
  | FormBlockPayload 
  | EmailSignupBlockPayload
  | ContactBlockPayload;

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  payload: BlockPayload;
  position: number;
  isHidden: boolean;
  /** Keep this conversion link at the top of its tab. */
  pinned?: boolean;
  schedule?: {
    enabled: boolean;
    start?: string; // ISO date
    end?: string;   // ISO date
  };
  clicks: number;
  conversionRole?: 'primary' | 'secondary' | 'supporting' | 'informational' | 'social-proof' | 'lead-capture';
  animation?: AnimeBlockEffect;
  animationConfig?: BlockAnimationConfig;
  style?: BlockStyleOverride;
}

interface BlockStyleOverride {
  /** Premium visual treatment selected per block; falls back to the theme family. */
  variant?: BlockStyleVariant;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  backgroundImage?: string;
  height?: number;
  alignment?: 'left' | 'center';
  fontFamily?: string;
}

export interface Tab {
  id: string;
  title: string;
  slug: string;
  position: number;
  icon?: string;
  blocks: Block[];
}

export interface ThemeConfig {
  id: string;
  name: string;
  backgroundType: 'solid' | 'gradient' | 'mesh' | 'image' | 'video';
  bgColor: string;
  bgGradient?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundPosterUrl?: string;
  backgroundPosition?: 'center' | 'top' | 'bottom';
  backgroundFit?: 'cover' | 'contain' | 'natural';
  backgroundOverlay?: number;
  textColor: string;
  subtitleColor: string;
  cardBg: string;
  cardBorder: string;
  cardTextColor: string;
  cardSubtitleColor: string;
  cardShadow: 'none' | 'sm' | 'md' | 'lg' | 'colored';
  cardRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  cardStyle: 'solid' | 'outline' | 'glass' | 'soft';
  fontDisplay: string;
  fontBody: string;
  buttonHoverAnimation: 'none' | 'scale' | 'lift' | 'glow';
  accentColor: string;
  animeEntrancePreset?: AnimeEntrancePreset;
  animeMicroInteractions?: boolean;
}

export interface CustomDomainConfig {
  domain: string;
  /** pending = DNS job running, verified = CNAME resolved, failed = mismatched/conflict */
  status: 'pending' | 'verified' | 'failed' | 'conflict';
  sslStatus: 'active' | 'provisioning' | 'failed' | 'renewal_failed';
  cnameTarget: string;
  expectedIp: string;
  lastCheckedAt: string;
  /** Set when hostname is already claimed by another workspace */
  conflictOwnerId?: string;
  /** Human-readable failure detail (DNS mismatch, propagation delay, etc.) */
  failureReason?: string;
  /** ISO timestamp of last SSL renewal attempt */
  lastRenewalAttemptAt?: string;
  /** ISO timestamp of next scheduled SSL renewal */
  nextRenewalAt?: string;
}

interface QrConfig {
  fgColor: string;
  bgColor: string;
  pattern: 'dots' | 'square' | 'rounded';
  showLogo: boolean;
  centerIcon?: string;
  dynamicTargetUrl?: string;
}

export * from './themeSchema';

export interface PublishedProfileSnapshot {
  snapshotId: string;
  version: number;
  profileId: string;
  username: string;
  displayName: string;
  bio: string;
  nowStatus?: ProfileNowStatus;
  avatarUrl: string;
  category: string;
  starterSiteId?: string;
  verified: boolean;
  followerCount?: number;
  socialPosition: 'top' | 'bottom';
  socialLinks: SocialLink[];
  theme: ThemeConfig;
  standardTheme?: import('./themeSchema').StandardTheme;
  tabs: Tab[];
  customDomain?: CustomDomainConfig;
  qrConfig: QrConfig;
  seo: {
    title: string;
    description: string;
    noIndex: boolean;
    ogImage?: string;
    keywords?: string;
  };
  publishedAt: string;
  publishedBy: string;
}

export interface ProfileNowStatus {
  label: string;
  text: string;
  url?: string;
  updatedAt?: string;
}

export interface PreviewToken {
  token: string;
  profileId: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
}

export interface ScheduledPublishConfig {
  id: string;
  profileId: string;
  scheduledTimeUtc: string; // ISO 8601 UTC
  timezone: string; // e.g. "America/New_York", "UTC", "Africa/Cairo"
  createdAt: string;
  createdBy: string;
  status: 'pending' | 'executed' | 'cancelled' | 'failed';
  failureReason?: string;
  targetSnapshotDraft: Profile;
}

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  /** A lightweight, time-stamped status shown near the public profile header. */
  nowStatus?: ProfileNowStatus;
  avatarUrl: string;
  category: string;
  verified: boolean;
  followerCount?: number;
  status: 'draft' | 'published' | 'suspended' | 'deleted';
  publishedVersion: number;
  publishedSnapshot?: PublishedProfileSnapshot;
  /** Server-published capabilities used by the public renderer; never client-authoritative. */
  publicEntitlements?: { removeBranding: boolean };
  snapshotHistory?: PublishedProfileSnapshot[];
  etag?: string;
  draftVersion?: number;
  activePreviewTokens?: PreviewToken[];
  scheduledPublish?: ScheduledPublishConfig | null;
  directLinkMode: boolean;
  directLinkUrl?: string;
  socialPosition: 'top' | 'bottom';
  socialLinks: SocialLink[];
  theme: ThemeConfig;
  standardTheme?: import('./themeSchema').StandardTheme;
  /** Built-in or workspace starter-site catalog entry used to seed this profile. */
  starterSiteId?: string;
  themeSnapshots?: import('./themeSchema').PublishedThemeSnapshot[];
  tabs: Tab[];
  customDomain?: CustomDomainConfig;
  qrConfig: QrConfig;
  seo: {
    title: string;
    description: string;
    noIndex: boolean;
    ogImage?: string;
    keywords?: string;
  };
  trackingIntegrations?: TrackingIntegrations;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'grace_period';

export interface WorkspaceEntitlements {
  maxProfiles: number | 'Unlimited';
  customDomains: boolean;
  freeSsl: boolean;
  leadForms: boolean;
  analyticsHistoryDays: number;
  vectorQrStudio: boolean;
  customThemes: boolean;
  tokenDesignStudio: boolean;
  teamMembers: number;
  restApiWebhooks: boolean;
  removeBranding: boolean;
  slaSupport: string;
}

export interface WorkspaceInvoice {
  id: string;
  date: string;
  amount: string;
  plan: string;
  status: 'paid' | 'pending' | 'failed';
  billingPeriodStart: string;
  billingPeriodEnd: string;
  pdfUrl: string;
}

export interface BrandKit {
  id: string;
  name: string;
  logoUrl?: string;
  lightLogoUrl?: string;
  darkLogoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  latinFont: string;
  arabicFont: string;
  buttonStyle: 'filled' | 'outline' | 'soft' | 'pill';
  imageStyle: 'rounded' | 'full-bleed' | 'polaroid';
  socialIconStyle: 'line' | 'filled' | 'minimal';
  /** Controls what collaborators may change while using this kit. */
  editingMode?: 'full' | 'content-only' | 'selected-overrides';
  allowedThemeOverrides?: Array<'colors' | 'fonts' | 'spacing' | 'background' | 'layout' | 'components'>;
  lockedFields?: {
    logo?: boolean;
    colors?: boolean;
    fonts?: boolean;
    spacing?: boolean;
  };
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  plan: PlanType;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  gracePeriodEndsAt?: string; // For payment failure grace state
  trialEndsAt?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  profiles: string[]; // profile IDs
  invoices: WorkspaceInvoice[];
  /** PRO-005: Workspace-level member roster */
  members?: ProfileMember[];
  brandKit?: BrandKit;
}

export type WebhookEventType =
  | 'checkout.session.completed'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted';

export interface ProviderWebhookPayload {
  id: string;
  type: WebhookEventType;
  created: number;
  data: {
    workspaceId: string;
    customerId: string;
    subscriptionId?: string;
    planId: PlanType;
    billingCycle: BillingCycle;
    amountPaid?: string;
    periodStart: string;
    periodEnd: string;
    status: SubscriptionStatus;
    cancelAtPeriodEnd?: boolean;
    failureReason?: string;
  };
}

export interface TrackingIntegrations {
  metaPixelId?: string;
  googleAnalyticsId?: string;
  tiktokPixelId?: string;
  consentRequired: boolean;
  userConsented?: boolean;
}

export interface AnalyticsEvent {
  id: string;
  profileId: string;
  type: 'page_view' | 'block_click' | 'qr_scan' | 'form_submit';
  blockId?: string;
  blockTitle?: string;
  tabId?: string;
  snapshotVersion?: number;
  visitorHash?: string; // One-way daily salted hash (AN-001 / AN-003)
  timestamp: number;
  referrer: string;
  country: string;
  device: 'mobile' | 'desktop' | 'tablet';
  campaign?: string;
  isBot?: boolean;
  consentGranted?: boolean;
}

export interface AnalyticsExportRequest {
  id: string;
  profileId: string;
  requestedBy: string;
  dateRange: string;
  status: 'processing' | 'completed' | 'failed';
  totalEvents: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface FormSubmission {
  id: string;
  profileId: string;
  blockId: string;
  formTitle: string;
  formType?: 'newsletter' | 'contact' | 'lead' | 'feedback' | 'booking' | 'custom';
  data: Record<string, string>;
  responderEmail?: string;
  responderName?: string;
  timestamp: number;
  consentGiven: boolean;
  consentText?: string;
  ipHash?: string;
  status: 'verified' | 'flagged_spam' | 'archived';
  subscriberCreated?: boolean;
}

export interface Subscriber {
  id: string;
  profileId: string;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed';
  sourceBlockId: string;
  sourceFormTitle: string;
  subscribedAt: string;
  consentGiven: boolean;
  consentText?: string;
  lastEngagementAt?: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: number;
  details?: string;
}

export interface AbuseReport {
  id: string;
  profileUsername: string;
  reason: 'spam' | 'phishing' | 'copyright' | 'harmful';
  description: string;
  reporterEmail?: string;
  timestamp: number;
  status: 'pending' | 'resolved' | 'dismissed';
}

export type OnboardingStep = 'category' | 'details' | 'theme' | 'completed';

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  isVerified: boolean;
  verificationToken?: string;
  verificationExpiresAt?: number;
  passwordResetToken?: string;
  passwordResetExpiresAt?: number;
  createdAt: string;
  lastLoginAt: string;
  onboardingCompleted: boolean;
  onboardingStep: OnboardingStep;
  workspaceId: string;
}

export interface StarterProfileBlueprint {
  category: string;
  handle: string;
  displayName: string;
  bio: string;
  themeId: string;
}

// ─── Feature 12: API & Automation ─────────────────────────────────────────────

/**
 * API-002: Scoped API key permissions.
 * Granular — a key may have only a subset of these scopes.
 */
export type ApiKeyScope =
  | 'profiles:read'
  | 'profiles:write'
  | 'blocks:read'
  | 'blocks:write'
  | 'themes:read'
  | 'themes:write'
  | 'analytics:read'
  | 'forms:read'
  | 'publish:write'
  | 'webhooks:manage';

export const ALL_API_SCOPES: ApiKeyScope[] = [
  'profiles:read', 'profiles:write',
  'blocks:read', 'blocks:write',
  'themes:read', 'themes:write',
  'analytics:read', 'forms:read',
  'publish:write', 'webhooks:manage'
];

/**
 * API-002: The secret is shown exactly once (at creation/rotation).
 * After that, only the keyPrefix is stored for display.
 */
export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  keyPrefix: string; // e.g. "lf_live_a1b2" — safe to display
  /** ONLY present immediately after creation/rotation. Cleared from store immediately after. */
  secretOnce?: string;
  scopes: ApiKeyScope[];
  /** null = all profiles; otherwise scoped to listed profile IDs */
  allowedProfileIds: string[] | null;
  status: 'active' | 'revoked';
  createdAt: string;
  createdBy: string;
  lastUsedAt?: string;
  revokedAt?: string;
  expiresAt?: string; // optional expiry
}

/**
 * API-005: Webhook subscription with HMAC-SHA256 signing.
 */
export type WebhookEventTopic =
  | 'profile.published'
  | 'profile.updated'
  | 'form.submitted'
  | 'subscriber.created'
  | 'domain.verified'
  | 'domain.ssl_failed';

export interface WebhookSubscription {
  id: string;
  workspaceId: string;
  url: string;
  description?: string;
  topics: WebhookEventTopic[];
  /** HMAC-SHA256 signing secret — shown once at creation */
  signingSecretOnce?: string;
  signingSecretPrefix: string; // e.g. "whsec_a1b2..."
  status: 'active' | 'paused' | 'failed';
  createdAt: string;
  createdBy: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: 'success' | 'failed';
  consecutiveFailures: number;
}

/**
 * API-004: Rate limit bucket state per API key.
 */
export interface ApiRateLimitBucket {
  keyId: string;
  windowStart: number; // unix ms
  requestCount: number;
  maxRequests: number; // per window
  windowMs: number;
}

/**
 * API-003 / Audit: Auditable API operation log entry.
 */
export interface ApiAuditEntry {
  id: string;
  keyId: string;
  keyName: string;
  method: string;
  endpoint: string;
  statusCode: number;
  profileId?: string;
  timestamp: number;
  durationMs: number;
  ipHash?: string;
}
