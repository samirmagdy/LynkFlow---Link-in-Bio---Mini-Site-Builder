import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Profile, 
  Workspace, 
  AnalyticsEvent, 
  FormSubmission, 
  AuditLog, 
  AbuseReport, 
  ThemeConfig, 
  BlockType, 
  Block, 
  PlanType, 
  BillingCycle,
  FormBlockPayload,
  UserAccount,
  BrandKit,
  StarterProfileBlueprint,
} from '../types';
import {
  INITIAL_PROFILES, 
  INITIAL_WORKSPACE, 
  INITIAL_ANALYTICS, 
  INITIAL_SUBMISSIONS, 
  INITIAL_AUDIT_LOGS,
  THEME_PRESETS
} from '../data/mockData';
import { PERSONA_TEMPLATES } from '../data/personaTemplates';
import { StandardTheme } from '../types/themeSchema';
import { normalizeTheme, toLegacyCompatTheme } from '../utils/themeEngine';
import { enforceBrandKitThemePolicy } from '../utils/brandKitPermissions';
import { workspaceSyncService, SaveStatus } from '../services/workspaceSyncService';
import { contentLifecycleService } from '../services/contentLifecycleService';
import { formSubmissionService } from '../services/formSubmissionService';
import { analyticsEngineService } from '../services/analyticsEngineService';
import { billingService } from '../services/billingService';
import { domainService } from '../services/domainService';
import { apiKeyService, ApiGatewayResult } from '../services/apiKeyService';
import { ProfileMember, ProfileRole, ApiKey, ApiKeyScope, WebhookSubscription, WebhookEventTopic, ApiAuditEntry } from '../types';
import { isSupabaseConfigured } from '../lib/supabaseConfig';
import { supabase as configuredSupabase } from '../lib/supabase';
import { reportRecoverableError } from '../utils/reportError';
import { useLocalStoragePersistence } from '../hooks/useLocalStoragePersistence';
import {
  addBlock as addProfileBlock,
  addLinkBlocks as addProfileLinkBlocks,
  updateBlock as updateProfileBlock,
  removeBlock as removeProfileBlock,
  duplicateBlock as duplicateProfileBlock,
  reorderBlocks as reorderProfileBlocks,
  addTab as addProfileTab,
  updateTab as updateProfileTab,
  removeTab as removeProfileTab
} from '../services/profileMutationService';
import { createProfile as createProfileRecord, duplicateProfile as duplicateProfileRecord } from '../services/profileFactoryService';
import {
  signUp as signUpWithSupabase,
  logIn as logInWithSupabase,
  verifyEmail as verifySupabaseEmail,
  resendVerificationEmail as resendSupabaseVerificationEmail,
  requestPasswordReset as requestSupabasePasswordReset,
  resetPassword as resetSupabasePassword,
  authUnavailableMessage
} from '../services/supabaseAuthService';
import type { AuthResponse, PasswordResetResponse } from '../services/supabaseAuthService';

const supabase = configuredSupabase;

type CloudSyncModule = typeof import('../services/supabaseSyncService');
let cloudSyncPromise: Promise<CloudSyncModule> | null = null;
const getCloudSync = () => cloudSyncPromise || (cloudSyncPromise = import('../services/supabaseSyncService'));
const lazyCall = <T extends (...args: never[]) => unknown>(loader: () => Promise<unknown>, name: string) => (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => loader().then(module => {
  const fn = (module as Record<string, unknown>)[name] as T;
  return fn(...args) as ReturnType<T>;
}) as Promise<Awaited<ReturnType<T>>>;
const loadCloudState = lazyCall<CloudSyncModule['loadCloudState']>(getCloudSync, 'loadCloudState');
const saveCloudAnalytics = lazyCall<CloudSyncModule['saveCloudAnalytics']>(getCloudSync, 'saveCloudAnalytics');
const saveCloudAuditLogs = lazyCall<CloudSyncModule['saveCloudAuditLogs']>(getCloudSync, 'saveCloudAuditLogs');
const saveCloudProfile = lazyCall<CloudSyncModule['saveCloudProfile']>(getCloudSync, 'saveCloudProfile');
const saveCloudReports = lazyCall<CloudSyncModule['saveCloudReports']>(getCloudSync, 'saveCloudReports');
const saveCloudSubmissions = lazyCall<CloudSyncModule['saveCloudSubmissions']>(getCloudSync, 'saveCloudSubmissions');
const saveCloudThemes = lazyCall<CloudSyncModule['saveCloudThemes']>(getCloudSync, 'saveCloudThemes');
const deleteCloudTheme = lazyCall<CloudSyncModule['deleteCloudTheme']>(getCloudSync, 'deleteCloudTheme');
const saveCloudWebhooks = lazyCall<CloudSyncModule['saveCloudWebhooks']>(getCloudSync, 'saveCloudWebhooks');
const saveCloudApiKeys = lazyCall<CloudSyncModule['saveCloudApiKeys']>(getCloudSync, 'saveCloudApiKeys');
const saveCloudSubscribers = lazyCall<CloudSyncModule['saveCloudSubscribers']>(getCloudSync, 'saveCloudSubscribers');
const saveCloudWorkspace = lazyCall<CloudSyncModule['saveCloudWorkspace']>(getCloudSync, 'saveCloudWorkspace');
const inviteCloudWorkspaceMember = lazyCall<CloudSyncModule['inviteCloudWorkspaceMember']>(getCloudSync, 'inviteCloudWorkspaceMember');
const removeCloudWorkspaceMember = lazyCall<CloudSyncModule['removeCloudWorkspaceMember']>(getCloudSync, 'removeCloudWorkspaceMember');
const updateCloudWorkspaceMember = lazyCall<CloudSyncModule['updateCloudWorkspaceMember']>(getCloudSync, 'updateCloudWorkspaceMember');
const deleteCloudRecord = lazyCall<CloudSyncModule['deleteCloudRecord']>(getCloudSync, 'deleteCloudRecord');
const publishCloudProfile = lazyCall<CloudSyncModule['publishCloudProfile']>(getCloudSync, 'publishCloudProfile');
const bulkPublishCloudProfiles = lazyCall<CloudSyncModule['bulkPublishCloudProfiles']>(getCloudSync, 'bulkPublishCloudProfiles');
const rollbackCloudProfile = lazyCall<CloudSyncModule['rollbackCloudProfile']>(getCloudSync, 'rollbackCloudProfile');
const createCloudPreviewToken = lazyCall<CloudSyncModule['createCloudPreviewToken']>(getCloudSync, 'createCloudPreviewToken');

const stripeService = () => import('../services/stripeService');
const createStripeCheckoutSession = lazyCall<Awaited<ReturnType<typeof stripeService>>['createStripeCheckoutSession']>(stripeService, 'createStripeCheckoutSession');
const cancelStripeSubscription = lazyCall<Awaited<ReturnType<typeof stripeService>>['cancelStripeSubscription']>(stripeService, 'cancelStripeSubscription');
const createStripeBillingPortalSession = lazyCall<Awaited<ReturnType<typeof stripeService>>['createStripeBillingPortalSession']>(stripeService, 'createStripeBillingPortalSession');
const submitPublicForm = lazyCall<typeof import('../services/publicFormService')['submitPublicForm']>(() => import('../services/publicFormService'), 'submitPublicForm');
const submitPublicAbuseReport = lazyCall<typeof import('../services/publicAbuseReportService')['submitPublicAbuseReport']>(() => import('../services/publicAbuseReportService'), 'submitPublicAbuseReport');
const createManagedApiKey = lazyCall<typeof import('../services/apiManagementService')['createManagedApiKey']>(() => import('../services/apiManagementService'), 'createManagedApiKey');
const revokeManagedApiKey = lazyCall<typeof import('../services/apiManagementService')['revokeManagedApiKey']>(() => import('../services/apiManagementService'), 'revokeManagedApiKey');
const rotateManagedApiKey = lazyCall<typeof import('../services/apiManagementService')['rotateManagedApiKey']>(() => import('../services/apiManagementService'), 'rotateManagedApiKey');
const createManagedWebhook = lazyCall<typeof import('../services/webhookManagementService')['createManagedWebhook']>(() => import('../services/webhookManagementService'), 'createManagedWebhook');
const deleteManagedWebhook = lazyCall<typeof import('../services/webhookManagementService')['deleteManagedWebhook']>(() => import('../services/webhookManagementService'), 'deleteManagedWebhook');
const testManagedWebhook = lazyCall<typeof import('../services/webhookManagementService')['testManagedWebhook']>(() => import('../services/webhookManagementService'), 'testManagedWebhook');
const updateManagedWebhook = lazyCall<typeof import('../services/webhookManagementService')['updateManagedWebhook']>(() => import('../services/webhookManagementService'), 'updateManagedWebhook');
const removeManagedDomain = lazyCall<typeof import('../services/domainManagementService')['removeManagedDomain']>(() => import('../services/domainManagementService'), 'removeManagedDomain');
const recheckManagedDomain = lazyCall<typeof import('../services/domainManagementService')['recheckManagedDomain']>(() => import('../services/domainManagementService'), 'recheckManagedDomain');
const verifyManagedDomain = lazyCall<typeof import('../services/domainManagementService')['verifyManagedDomain']>(() => import('../services/domainManagementService'), 'verifyManagedDomain');

type AppView =
  | 'marketing' 
  | 'editor' 
  | 'themes' 
  | 'analytics' 
  | 'forms' 
  | 'sales'
  | 'social'
  | 'growth' 
  | 'profiles'
  | 'settings' 
  | 'billing' 
  | 'api' 
  | 'support'
  | 'admin' 
  | 'public_standalone';

const APP_VIEW_PATHS: Partial<Record<AppView, string>> = {
  marketing: '/',
  editor: '/studio',
  themes: '/studio/themes',
  analytics: '/studio/analytics',
  forms: '/studio/forms',
  sales: '/studio/sales',
  social: '/studio/social',
  growth: '/studio/growth',
  profiles: '/studio/profiles',
  settings: '/studio/settings',
  billing: '/studio/billing',
  api: '/studio/api',
  support: '/studio/support',
  admin: '/studio/admin'
};

const viewFromLocation = (): AppView => {
  if (typeof window === 'undefined') return 'marketing';
  const pathname = window.location.pathname === '/' ? '/' : window.location.pathname.replace(/\/$/, '');
  const params = new URLSearchParams(window.location.search);
  if (pathname.startsWith('/@') || params.has('customDomain') || params.get('view') === 'public_standalone') return 'public_standalone';
  const route = Object.entries(APP_VIEW_PATHS).find(([, path]) => path === pathname)?.[0] as AppView | undefined;
  return route || 'marketing';
};

interface AppContextType {
  user: UserAccount;
  workspace: Workspace;
  profiles: Profile[];
  activeProfile: Profile;
  publishedProfile: Profile;
  hasUnpublishedChanges: boolean;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  previewDevice: 'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'wide';
  setPreviewDevice: (device: 'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'wide') => void;
  previewSource: 'draft' | 'published';
  setPreviewSource: (source: 'draft' | 'published') => void;
  publicViewingUsername: string | null;
  setPublicViewingUsername: (username: string | null) => void;
  publicDemo: boolean;
  setPublicDemo: (enabled: boolean) => void;
  updateBrandKit: (updater: (prev: NonNullable<Workspace['brandKit']>) => NonNullable<Workspace['brandKit']>) => void;
  applyBrandKitToTheme: () => void;
  
  // Auth & Identity Actions (ACC-001)
  signUp: (email: string, password: string, name?: string) => Promise<AuthResponse>;
  logIn: (email: string, password: string) => Promise<AuthResponse>;
  logOut: () => void;
  verifyEmail: () => Promise<AuthResponse>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<PasswordResetResponse>;
  resetPassword: (token: string, newPass: string) => Promise<AuthResponse>;
  completeOnboarding: (starter?: StarterProfileBlueprint) => Promise<void>;
  skipOnboarding: () => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;

  // Profile Actions
  updateDraftProfile: (updater: (prev: Profile) => Profile) => void;
  saveDraftNow: () => Promise<void>;
  publishProfile: (changeNote?: string, idempotencyKey?: string, versionName?: string, versionNotes?: string) => Promise<boolean>;
  bulkPublishProfiles: (profileIds: string[], changeNote?: string, versionName?: string, versionNotes?: string) => Promise<{ published: number; failed: number }>;
  revertDraftToPublished: () => void;
  resetThemeToPublished: () => void;
  rollbackToPublishedSnapshot: (snapshotId: string, reason?: string) => Promise<boolean>;
  generatePreviewLink: (ttlMinutes?: number) => Promise<{ previewUrl: string; token: string; expiresAt: string }>;
  scheduleRelease: (scheduledIsoString: string, timezone: string) => Promise<boolean>;
  cancelScheduledRelease: () => Promise<boolean>;
  switchActiveProfile: (id: string) => void;
  createNewProfile: (username: string, displayName: string, category: string, themeId?: string) => Promise<string>;
  duplicateProfile: (profileId: string) => Promise<boolean>;
  deleteProfile: (profileId: string) => Promise<boolean>;

  // Block Actions
  addBlock: (tabId: string, blockType: BlockType, customTitle?: string) => void;
  addLinkBlocks: (tabId: string, links: Array<{ title: string; url: string }>) => void;
  updateBlock: (tabId: string, blockId: string, updates: Partial<Block>) => void;
  removeBlock: (tabId: string, blockId: string) => void;
  reorderBlocks: (tabId: string, fromIndex: number, toIndex: number) => void;
  duplicateBlock: (tabId: string, blockId: string) => void;

  // Tab Actions
  addTab: (title: string) => void;
  updateTab: (tabId: string, title: string) => void;
  removeTab: (tabId: string) => void;

  // Theme & Styling
  applyTheme: (theme: ThemeConfig | import('../types/themeSchema').StandardTheme) => void;
  standardTheme: import('../types/themeSchema').StandardTheme;
  updateStandardTheme: (updater: (prev: import('../types/themeSchema').StandardTheme) => import('../types/themeSchema').StandardTheme) => void;
  undoThemeChange: () => void;
  redoThemeChange: () => void;
  canUndoTheme: boolean;
  canRedoTheme: boolean;
  rollbackToSnapshot: (snapshotId: string) => void;
  saveCustomPreset: (name: string) => Promise<void>;
  deleteCustomPreset: (id: string) => Promise<void>;
  customPresets: import('../types/themeSchema').StandardTheme[];

  // Analytics & Submissions
  analytics: AnalyticsEvent[];
  trackEvent: (event: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => void;
  submissions: FormSubmission[];
  submitForm: (
    profileId: string, 
    blockId: string, 
    formTitle: string, 
    formPayload: FormBlockPayload, 
    data: Record<string, string>, 
    consent: boolean,
    honeypotTrap?: string,
    idempotencyKey?: string
  ) => Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string>; rateLimited?: boolean }>;
  deleteSubmission: (id: string) => Promise<boolean>;
  unsubscribeSubscriber: (email: string) => Promise<boolean>;

  // Growth, Custom Domain & Billing
  verifyDomain: (profileId: string, domain: string) => Promise<{ success: boolean; failureReason?: string }>;
  removeDomain: (profileId: string) => void;
  recheckDomain: (profileId: string) => Promise<void>;
  upgradePlan: (plan: PlanType, cycle: BillingCycle) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  openBillingPortal: () => Promise<void>;
  processWebhookEvent: (eventType: string, planId?: PlanType, billingCycle?: BillingCycle) => void;

  // PRO-005: Workspace Member Management
  addMember: (email: string, name: string, role: ProfileRole, assignedProfileIds: string[]) => Promise<{ success: boolean; error?: string }>;
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberRole: (memberId: string, role: ProfileRole, assignedProfileIds: string[]) => Promise<boolean>;

  // Compliance & Admin
  auditLogs: AuditLog[];
  abuseReports: AbuseReport[];
  submitAbuseReport: (report: Omit<AbuseReport, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  updateAbuseReportStatus: (id: string, status: AbuseReport['status']) => Promise<boolean>;
  appendAuditLog: (action: string, target: string, details?: string) => void;
  exportAccountData: () => void;
  resetAllData: () => void;

  // API-002: API Key Management
  apiKeys: ApiKey[];
  createApiKey: (name: string, scopes: ApiKeyScope[], allowedProfileIds: string[] | null, expiresAt?: string) => Promise<{ key: ApiKey; secret: string } | { error: string }>;
  revokeApiKey: (keyId: string) => Promise<{ success: boolean; error?: string }>;
  rotateApiKey: (keyId: string) => Promise<{ key: ApiKey; secret: string } | { error: string }>;
  // API-005: Webhook Subscriptions
  webhookSubscriptions: WebhookSubscription[];
  createWebhookSubscription: (url: string, topics: WebhookEventTopic[], description?: string) => Promise<{ hook: WebhookSubscription; signingSecret: string } | { error: string }>;
  deleteWebhookSubscription: (hookId: string) => Promise<void>;
  toggleWebhookStatus: (hookId: string, status: 'active' | 'paused') => Promise<void>;
  dispatchTestWebhook: (hookId: string, topic: WebhookEventTopic) => Promise<{ deliveryId: string; status: 'delivered' | 'failed' }>;
  // API-001: Sandbox request execution
  executeApiRequest: (keyId: string, scope: ApiKeyScope, method: string, endpoint: string) => ApiGatewayResult;
  // API audit
  apiAuditLog: ApiAuditEntry[];

  // Animation Trigger
  animationTrigger: number;
  triggerReplayAnimation: () => void;

  // Workspace Concurrency & Autosave (EDT-003, EDT-004)
  saveStatus: SaveStatus;
  lastSavedAt: string | null;
  saveErrorMessage: string | null;
  retrySave: () => void;
  isConflictOpen: boolean;
  resolveConflictReload: () => void;
  resolveConflictOverwrite: () => void;
  simulateNetworkError: () => void;

  // Session hydration guard — true once the Supabase session check (or the
  // non-Supabase local-auth path) has completed. Use this before gating UI on
  // user.id to avoid a race where the Guest placeholder fires redirects before
  // the async loadCloudState() can restore a valid existing session.
  authReady: boolean;

  // Notification / Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PROFILES: 'lynkflow_profiles_v1',
  DRAFT_PROFILE_PREFIX: 'lynkflow_draft_profile_v1_',
  WORKSPACE: 'lynkflow_workspace_v1',
  ANALYTICS: 'lynkflow_analytics_v1',
  SUBMISSIONS: 'lynkflow_submissions_v1',
  AUDIT: 'lynkflow_audit_v1',
  REPORTS: 'lynkflow_reports_v1',
  ACTIVE_PROFILE_ID: 'lynkflow_active_prof_id_v1',
  CUSTOM_THEMES: 'lynkflow_custom_themes_v1',
  OFFLINE_DRAFT_PREFIX: 'lynkflow_offline_draft_v1_'
};

const EMPTY_CLOUD_PROFILE: Profile = {
  ...JSON.parse(JSON.stringify(INITIAL_PROFILES[0])),
  id: 'empty-profile',
  username: '',
  displayName: '',
  bio: '',
  status: 'draft',
  publishedVersion: 0,
  publishedSnapshot: undefined,
  tabs: [],
  socialLinks: [],
  snapshotHistory: [],
  customDomain: undefined,
  publishedAt: undefined,
};

export const AppProvider: React.FC<{ children: React.ReactNode; lightweight?: boolean }> = ({ children, lightweight = false }) => {
  const cloudReady = React.useRef(false);
  const cloudApiState = React.useRef<{ apiKeys: ApiKey[]; webhookSubscriptions: WebhookSubscription[] } | null>(null);
  const cloudWriteQueue = React.useRef(Promise.resolve());
  const [cloudHydrated, setCloudHydrated] = React.useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [forceSimulateNetworkError, setForceSimulateNetworkError] = useState(false);

  const enqueueCloudWrite = React.useCallback((write: () => Promise<void>, errorMessage: string) => {
    const nextWrite = cloudWriteQueue.current.catch(() => undefined).then(write);
    cloudWriteQueue.current = nextWrite;
    return nextWrite.catch(error => {
      setSaveStatus('error');
      setSaveErrorMessage(error instanceof Error ? error.message : errorMessage);
      throw error;
    });
  }, []);

  const [user, setUser] = useState<UserAccount>(() => {
    return {
      id: 'usr-guest',
      email: '',
      name: 'Guest',
      isVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      onboardingCompleted: false,
      onboardingStep: 'category',
      workspaceId: ''
    };
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [currentView, setCurrentViewState] = useState<AppView>(viewFromLocation);
  const [previewDevice, setPreviewDevice] = useState<'mobile-small' | 'mobile' | 'tablet' | 'desktop' | 'wide'>('mobile');
  const [previewSource, setPreviewSource] = useState<'draft' | 'published'>('draft');
  const [publicViewingUsername, setPublicViewingUsername] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const pathnameHandle = window.location.pathname.startsWith('/@') ? window.location.pathname.slice(2) : '';
    return pathnameHandle || new URLSearchParams(window.location.search).get('u');
  });
  const [publicDemo, setPublicDemo] = useState<boolean>(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom User Themes saved to Workspace
  const [customPresets, setCustomPresets] = useState<StandardTheme[]>(() => {
    // Supabase is the source of truth in the configured build. Do not render
    // stale device-only presets while the workspace is hydrating.
    if (lightweight || isSupabaseConfigured) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Semantic Undo/Redo stacks for theme design studio
  const [themeUndoStack, setThemeUndoStack] = useState<StandardTheme[]>([]);
  const [themeRedoStack, setThemeRedoStack] = useState<StandardTheme[]>([]);
  const [animationTrigger, setAnimationTrigger] = useState(0);

  const triggerReplayAnimation = () => {
    setAnimationTrigger(prev => prev + 1);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // State initialization from localStorage or seed
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    if (lightweight) return [];
    if (isSupabaseConfigured) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILES);
      return saved ? JSON.parse(saved) : INITIAL_PROFILES;
    } catch {
      return INITIAL_PROFILES;
    }
  });

  const [activeProfileId, setActiveProfileId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      if (saved && profiles.some(p => p.id === saved)) return saved;
      return profiles[0]?.id || 'prof-alexvance';
    } catch {
      return 'prof-alexvance';
    }
  });

  // Keep a separate draft profile per active profile
  const [draftProfile, setDraftProfile] = useState<Profile>(() => {
    const found = profiles.find(p => p.id === activeProfileId) || profiles[0] || (isSupabaseConfigured ? EMPTY_CLOUD_PROFILE : INITIAL_PROFILES[0]);
    if (typeof localStorage === 'undefined') return JSON.parse(JSON.stringify(found));
    try {
      const pendingDraft = localStorage.getItem(`${STORAGE_KEYS.OFFLINE_DRAFT_PREFIX}${found.id}`);
      if (pendingDraft) return JSON.parse(pendingDraft);
      const savedDraft = localStorage.getItem(`${STORAGE_KEYS.DRAFT_PROFILE_PREFIX}${found.id}`);
      if (savedDraft) return JSON.parse(savedDraft);
    } catch (error) {
      reportRecoverableError('draft state hydration failed', error);
    }
    return JSON.parse(JSON.stringify(found));
  });

  React.useEffect(() => {
    if (!lastSavedAt && draftProfile.updatedAt) setLastSavedAt(draftProfile.updatedAt);
  }, [draftProfile.updatedAt, lastSavedAt]);

  const [workspace, setWorkspace] = useState<Workspace>(() => {
    if (lightweight) return INITIAL_WORKSPACE;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKSPACE);
      return saved ? JSON.parse(saved) : INITIAL_WORKSPACE;
    } catch {
      return INITIAL_WORKSPACE;
    }
  });

  const defaultBrandKit = INITIAL_WORKSPACE.brandKit!;
  const updateBrandKit = (updater: (prev: NonNullable<Workspace['brandKit']>) => NonNullable<Workspace['brandKit']>) => {
    setWorkspace(prev => {
      const current = prev.brandKit || { ...defaultBrandKit, updatedAt: new Date().toISOString() };
      const requested = updater(current);
      const locks = current.lockedFields || {};
      const locked = new Set<keyof BrandKit>([
        ...(locks.logo ? ['logoUrl', 'lightLogoUrl', 'darkLogoUrl', 'faviconUrl'] as const : []),
        ...(locks.colors ? ['primaryColor', 'secondaryColor', 'accentColor'] as const : []),
        ...(locks.fonts ? ['latinFont', 'arabicFont'] as const : []),
        ...(locks.spacing ? [] as const : [])
      ]);
      const protectedValues = Array.from(locked).reduce<Record<string, unknown>>((values, key) => {
        values[key] = current[key];
        return values;
      }, {});
      return {
        ...prev,
        brandKit: { ...requested, ...protectedValues, updatedAt: new Date().toISOString() }
      };
    });
  };

  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>(() => {
    if (lightweight) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
      return saved ? JSON.parse(saved) : INITIAL_ANALYTICS;
    } catch {
      return INITIAL_ANALYTICS;
    }
  });

  const [submissions, setSubmissions] = useState<FormSubmission[]>(() => {
    if (lightweight) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
    } catch {
      return INITIAL_SUBMISSIONS;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    if (lightweight) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [abuseReports, setAbuseReports] = useState<AbuseReport[]>(() => {
    if (lightweight) return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.REPORTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (lightweight) return;
    if (!isSupabaseConfigured) {
      cloudReady.current = true;
      setCloudHydrated(true);
      return;
    }
    let cancelled = false;
    const hydrate = async () => {
      if (!supabase) {
        cloudReady.current = true;
        setCloudHydrated(true);
        return;
      }
      const cloudState = await loadCloudState();
      if (cancelled) return;
      if (!cloudState) {
        cloudReady.current = true;
        setCloudHydrated(true);
        setUser({
          id: 'usr-guest', email: '', name: 'Guest', isVerified: false,
          createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(),
          onboardingCompleted: false, onboardingStep: 'category', workspaceId: ''
        });
        return;
      }
      setUser(cloudState.user);
      setIsOnboardingOpen(!cloudState.user.onboardingCompleted);
      setWorkspace(cloudState.workspace);
      setAnalytics(cloudState.analytics);
      setSubmissions(cloudState.submissions);
      setAuditLogs(cloudState.auditLogs);
      setAbuseReports(cloudState.abuseReports);
      setCustomPresets(cloudState.customThemes);
      cloudApiState.current = {
        apiKeys: cloudState.apiKeys,
        webhookSubscriptions: cloudState.webhookSubscriptions,
      };
      formSubmissionService.replaceSubscribers(cloudState.subscribers);
      if (cloudState.profiles.length > 0) {
        setProfiles(cloudState.profiles);
        const hydratedProfile = cloudState.profiles.find(profile => profile.id === activeProfileId) || cloudState.profiles[0];
        setActiveProfileId(hydratedProfile.id);
        setDraftProfile(JSON.parse(JSON.stringify(hydratedProfile)));
      }
      cloudReady.current = true;
      setCloudHydrated(true);
    };
    let unsubscribeAuth: (() => void) | undefined;
    void hydrate().then(() => {
      if (!cancelled && supabase) {
        const authSubscription = supabase.auth.onAuthStateChange(() => { void hydrate(); });
        unsubscribeAuth = () => authSubscription.data.subscription.unsubscribe();
      }
    }).catch(error => {
      reportRecoverableError('Supabase hydration failed', error);
      cloudReady.current = true;
      setCloudHydrated(true);
    });
    return () => { cancelled = true; unsubscribeAuth?.(); };
  }, [lightweight]);

  useLocalStoragePersistence(STORAGE_KEYS.PROFILES, profiles, !lightweight, 'Profile');
  useLocalStoragePersistence(`${STORAGE_KEYS.DRAFT_PROFILE_PREFIX}${draftProfile.id}`, draftProfile, !lightweight, 'Draft');

  useEffect(() => {
    if (lightweight) return;
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void enqueueCloudWrite(
      () => Promise.all(profiles.map(profile => saveCloudProfile(profile, user.id))).then(() => undefined),
      'Supabase profile save failed'
    ).catch(() => undefined);
  }, [profiles, user.id, workspace.id]);

  useLocalStoragePersistence(STORAGE_KEYS.ACTIVE_PROFILE_ID, activeProfileId, !lightweight, 'Active profile');
  useLocalStoragePersistence(STORAGE_KEYS.WORKSPACE, workspace, !lightweight, 'Workspace');

  useEffect(() => {
    if (lightweight) return;
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void enqueueCloudWrite(() => saveCloudWorkspace(workspace), 'Supabase workspace save failed').catch(() => undefined);
  }, [workspace, user.id, workspace.id]);

  useEffect(() => {
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void enqueueCloudWrite(() => saveCloudAnalytics(analytics, user.id), 'Supabase analytics save failed').catch(() => undefined);
  }, [analytics, user.id, workspace.id]);

  useEffect(() => {
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void enqueueCloudWrite(() => saveCloudSubmissions(submissions, user.id), 'Supabase submissions save failed').catch(() => undefined);
    const subscribers = profiles.flatMap(profile => formSubmissionService.getSubscribers(profile.id));
    void enqueueCloudWrite(() => saveCloudSubscribers(subscribers, user.id), 'Supabase subscribers save failed').catch(() => undefined);
  }, [submissions, profiles, user.id, workspace.id]);

  useEffect(() => {
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void enqueueCloudWrite(() => saveCloudAuditLogs(auditLogs, user.id), 'Supabase audit save failed').catch(() => undefined);
  }, [auditLogs, user.id, workspace.id]);

  useEffect(() => {
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void enqueueCloudWrite(() => saveCloudReports(abuseReports, user.id), 'Supabase reports save failed').catch(() => undefined);
  }, [abuseReports, user.id, workspace.id]);

  useLocalStoragePersistence(STORAGE_KEYS.ANALYTICS, analytics, !lightweight, 'Analytics');
  useLocalStoragePersistence(STORAGE_KEYS.SUBMISSIONS, submissions, !lightweight, 'Submission');
  useLocalStoragePersistence(STORAGE_KEYS.AUDIT, auditLogs, !lightweight, 'Audit');
  useLocalStoragePersistence(STORAGE_KEYS.REPORTS, abuseReports, !lightweight, 'Abuse report');

  // When activeProfileId changes, sync draftProfile
  useEffect(() => {
    const curr = profiles.find(p => p.id === activeProfileId);
    if (curr) {
      if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
        setDraftProfile(JSON.parse(JSON.stringify(curr)));
        return;
      }
      try {
        const draftKey = isSupabaseConfigured
          ? STORAGE_KEYS.OFFLINE_DRAFT_PREFIX
          : STORAGE_KEYS.DRAFT_PROFILE_PREFIX;
        const savedDraft = localStorage.getItem(`${draftKey}${curr.id}`);
        setDraftProfile(savedDraft ? JSON.parse(savedDraft) : JSON.parse(JSON.stringify(curr)));
      } catch {
        setDraftProfile(JSON.parse(JSON.stringify(curr)));
      }
    }
  }, [activeProfileId]);

  const activePublished = profiles.find(p => p.id === activeProfileId) || profiles[0] || (isSupabaseConfigured ? draftProfile : INITIAL_PROFILES[0]);

  // Compare draft vs published to determine if there are unsaved/unpublished changes
  const hasUnpublishedChanges = JSON.stringify(draftProfile) !== JSON.stringify(activePublished);

  // Keep workspace views addressable and restorable on refresh. Public
  // profiles retain their canonical /@handle URL.
  const setCurrentView = (view: AppView) => {
    setCurrentViewState(view);
    if (typeof window === 'undefined') return;

    if (view === 'public_standalone') {
      if (window.location.pathname.startsWith('/@')) return;
      const handle = publicViewingUsername || activePublished.username || draftProfile.username;
      if (handle) window.history.pushState({}, '', `/@${encodeURIComponent(handle)}`);
      return;
    }

    const targetPath = APP_VIEW_PATHS[view] || '/';
    if (window.location.pathname !== targetPath || window.location.search) {
      window.history.pushState({}, '', targetPath);
    }
  };

  React.useEffect(() => {
    const handlePopState = () => setCurrentViewState(viewFromLocation());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Autosave and Concurrency States (EDT-003, EDT-004)
  const queueOfflineDraft = (profile: Profile) => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.OFFLINE_DRAFT_PREFIX}${profile.id}`, JSON.stringify(profile));
    } catch (error) {
      reportRecoverableError('offline draft persistence failed', error);
    }
  };

  const clearOfflineDraft = (profileId: string) => {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.OFFLINE_DRAFT_PREFIX}${profileId}`);
    } catch (error) {
      reportRecoverableError('offline draft cleanup failed', error);
    }
  };

  // Concurrency listener from other tabs
  useEffect(() => {
    const unsubscribe = workspaceSyncService.onRemoteUpdate((updatedProfileId) => {
      if (updatedProfileId === activeProfileId) {
        // Read fresh profiles
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
          if (raw) {
            const freshProfiles: Profile[] = JSON.parse(raw);
            const fresh = freshProfiles.find(p => p.id === activeProfileId);
            if (fresh && fresh.publishedVersion > draftProfile.publishedVersion) {
              setIsConflictOpen(true);
            }
          }
        } catch (error) {
          reportRecoverableError('workspace conflict lookup failed', error);
        }
      }
    });
    return () => unsubscribe();
  }, [activeProfileId, draftProfile.publishedVersion]);

  // Debounced Autosave Pipeline
  useEffect(() => {
    // Supabase hydration replaces the local seed/draft with the authoritative
    // profile rows. Never autosave the pre-hydration placeholder, which can
    // lack the row-level id and username required by the API.
    if (isSupabaseConfigured && !cloudReady.current) return;
    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        queueOfflineDraft(draftProfile);
        setSaveStatus('offline');
        setSaveErrorMessage('Changes are stored on this device and will sync when you are back online.');
        return;
      }
      const res = await workspaceSyncService.saveDraftAuthoritative(draftProfile, forceSimulateNetworkError);
      if (res.success) {
        try {
          if (isSupabaseConfigured && user.id !== 'usr-guest') {
            await enqueueCloudWrite(() => saveCloudProfile(res.updatedProfile || draftProfile, user.id), 'Cloud draft save failed');
          }
        } catch (error) {
          setSaveStatus('error');
          setSaveErrorMessage(error instanceof Error ? error.message : 'Cloud save failed');
          return;
        }
        clearOfflineDraft(draftProfile.id);
        setSaveStatus('saved');
        setLastSavedAt(res.updatedProfile?.updatedAt || new Date().toISOString());
        setSaveErrorMessage(null);
      } else if (res.isConflict) {
        setSaveStatus('conflict');
        setIsConflictOpen(true);
      } else {
        const isOfflineFailure = typeof navigator !== 'undefined' && !navigator.onLine;
        if (isOfflineFailure) {
          queueOfflineDraft(draftProfile);
          setSaveStatus('offline');
          setSaveErrorMessage('Changes are stored on this device and will sync when you are back online.');
        } else {
          setSaveStatus('error');
          setSaveErrorMessage(res.error || 'Autosave failed');
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [draftProfile, forceSimulateNetworkError, cloudHydrated]);

  // Re-run the authoritative autosave pipeline when connectivity returns.
  useEffect(() => {
    const handleOnline = () => {
      setSaveStatus('saving');
      setSaveErrorMessage(null);
      setDraftProfile(prev => ({ ...prev, updatedAt: new Date().toISOString() }));
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const retrySave = async () => {
    setForceSimulateNetworkError(false);
    setSaveStatus('saving');
    const res = await workspaceSyncService.saveDraftAuthoritative(draftProfile, false);
    if (res.success) {
      try {
        if (isSupabaseConfigured && user.id !== 'usr-guest') {
          await enqueueCloudWrite(() => saveCloudProfile(res.updatedProfile || draftProfile, user.id), 'Cloud draft save failed');
        }
      } catch (error) {
        setSaveStatus('error');
        setSaveErrorMessage(error instanceof Error ? error.message : 'Cloud save failed');
        return;
      }
      clearOfflineDraft(draftProfile.id);
      setSaveStatus('saved');
      setLastSavedAt(res.updatedProfile?.updatedAt || new Date().toISOString());
      setSaveErrorMessage(null);
      showToast('Changes saved successfully.');
    } else {
      setSaveStatus('error');
      setSaveErrorMessage(res.error || 'Retry failed');
    }
  };

  const simulateNetworkError = () => {
    setForceSimulateNetworkError(true);
    setSaveStatus('error');
    setSaveErrorMessage('Simulated network error during draft synchronization.');
    showToast('Network error simulated. Notice the retry banner in workspace.');
  };

  const resolveConflictReload = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (raw) {
        const freshProfiles: Profile[] = JSON.parse(raw);
        const fresh = freshProfiles.find(p => p.id === activeProfileId);
        if (fresh) {
          setDraftProfile(JSON.parse(JSON.stringify(fresh)));
          setProfiles(freshProfiles);
          setSaveStatus('saved');
          setIsConflictOpen(false);
          showToast('Updated local workspace to latest server version.');
          return;
        }
      }
    } catch (error) {
      reportRecoverableError('conflict reload failed', error);
    }
    setIsConflictOpen(false);
  };

  const resolveConflictOverwrite = async () => {
    const updatedDraft: Profile = {
      ...draftProfile,
      publishedVersion: draftProfile.publishedVersion + 1,
      updatedAt: new Date().toISOString()
    };
    setSaveStatus('saving');
    try {
      // Deliberately omit the stale ETag: this is the explicit user decision
      // to replace the competing draft with the local version.
      const result = await workspaceSyncService.saveDraftAuthoritative(updatedDraft, false);
      if (!result.success || !result.updatedProfile) {
        setSaveStatus('error');
        setSaveErrorMessage(result.error || 'Unable to overwrite the conflicting draft.');
        return;
      }
      const savedDraft = result.updatedProfile;
      if (isSupabaseConfigured && user.id !== 'usr-guest') {
        await enqueueCloudWrite(() => saveCloudProfile(savedDraft, user.id), 'Cloud conflict overwrite failed');
      }
      setDraftProfile(savedDraft);
      setProfiles(prev => prev.map(p => (p.id === savedDraft.id ? savedDraft : p)));
      setIsConflictOpen(false);
      setSaveStatus('saved');
      setLastSavedAt(savedDraft.updatedAt || new Date().toISOString());
      setSaveErrorMessage(null);
      workspaceSyncService.broadcastProfileUpdate(savedDraft.id, savedDraft.publishedVersion);
      showToast('Overwrote the server draft with your local changes.');
    } catch (error) {
      setSaveStatus('error');
      setSaveErrorMessage(error instanceof Error ? error.message : 'Unable to overwrite the conflicting draft.');
    }
  };

  // Actions
  const updateDraftProfile = (updater: (prev: Profile) => Profile) => {
    setDraftProfile(prev => {
      const updated = updater(prev);
      return {
        ...updated,
        updatedAt: new Date().toISOString()
      };
    });
  };

  const saveDraftNow = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueOfflineDraft(draftProfile);
      setSaveStatus('offline');
      setSaveErrorMessage('Changes are stored on this device and will sync when you are back online.');
      return;
    }
    setSaveStatus('saving');
    const res = await workspaceSyncService.saveDraftAuthoritative(draftProfile, forceSimulateNetworkError, draftProfile.etag);
    if (res.success) {
      try {
        if (isSupabaseConfigured && user.id !== 'usr-guest') {
          await enqueueCloudWrite(() => saveCloudProfile(res.updatedProfile || draftProfile, user.id), 'Cloud draft save failed');
        }
      } catch (error) {
        setSaveStatus('error');
        setSaveErrorMessage(error instanceof Error ? error.message : 'Cloud save failed');
        return;
      }
      clearOfflineDraft(draftProfile.id);
      setSaveStatus('saved');
      setLastSavedAt(res.updatedProfile?.updatedAt || new Date().toISOString());
      setSaveErrorMessage(null);
      if (res.updatedProfile) {
        setDraftProfile(res.updatedProfile);
      }
      showToast('Draft manually saved.');
    } else if (res.isConflict) {
      setSaveStatus('conflict');
      setIsConflictOpen(true);
    } else {
      setSaveStatus('error');
      setSaveErrorMessage(res.error || 'Failed to save draft');
    }
  };

  const publishProfile = async (changeNote?: string, idempotencyKey?: string, versionName?: string, versionNotes?: string): Promise<boolean> => {
    // ACC-001 & ACC-004: Unverified users cannot publish to production public web
    if (!user.isVerified) {
      showToast('Action restricted: Please verify your email address before publishing to live web.');
      return false;
    }

    setSaveStatus('saving');
    const idempKey = idempotencyKey || `pub-${draftProfile.id}-${Date.now()}`;

    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        // Persist the draft first; the Worker performs validation and is the
        // only writer allowed to create/update the public snapshot.
        await enqueueCloudWrite(() => saveCloudProfile(draftProfile, user.id), 'Cloud draft save failed');
        const published = await publishCloudProfile(draftProfile.id, changeNote, idempKey, versionName, versionNotes);
        setProfiles(prev => prev.map(profile => profile.id === published.id ? published : profile));
        setDraftProfile(published);
        setSaveStatus('saved');
        setLastSavedAt(published.updatedAt || new Date().toISOString());
        showToast(`Published @${published.username} live (v${published.publishedVersion})!`);
        return true;
      } catch (error) {
        setSaveStatus('error');
        setSaveErrorMessage(error instanceof Error ? error.message : 'Cloud publish failed');
        showToast(error instanceof Error ? error.message : 'Cloud publish failed');
        return false;
      }
    }

    const result = await contentLifecycleService.publishAuthoritative(
      draftProfile,
      user.email,
      idempKey,
      changeNote,
      versionName,
      versionNotes
    );

    if (!result.success) {
      setSaveStatus('error');
      setSaveErrorMessage(result.error || 'Publish failed');
      showToast(result.error || 'Publish failed validation check');
      return false;
    }

    // Refresh stored profiles
    try {
      const rawStored = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (rawStored) {
        const fresh: Profile[] = JSON.parse(rawStored);
        setProfiles(fresh);
        const updated = fresh.find(p => p.id === draftProfile.id);
        if (updated) {
          setDraftProfile(updated);
        }
      }
    } catch (error) {
      reportRecoverableError('published profile refresh failed', error);
    }

    if (result.auditLog) {
      setAuditLogs(prev => [result.auditLog!, ...prev]);
    }

    setSaveStatus('saved');
    setLastSavedAt(new Date().toISOString());
    showToast(`Published @${draftProfile.username} live (v${result.publishedVersion})!`);
    return true;
  };

  const bulkPublishProfiles = async (profileIds: string[], changeNote?: string, versionName?: string, versionNotes?: string): Promise<{ published: number; failed: number }> => {
    if (!isSupabaseConfigured || user.id === 'usr-guest') {
      showToast('Bulk publishing requires a connected workspace.');
      return { published: 0, failed: profileIds.length };
    }
    if (!user.isVerified) {
      showToast('Verify your email before publishing profiles.');
      return { published: 0, failed: profileIds.length };
    }
    try {
      const result = await bulkPublishCloudProfiles(profileIds, changeNote, versionName, versionNotes);
      const publishedById = new Map(result.published.map(item => [item.profileId, item]));
      setProfiles(prev => prev.map(profile => {
        const published = publishedById.get(profile.id);
        return published ? { ...profile, status: 'published', publishedVersion: published.publishedVersion, publishedAt: published.publishedAt, updatedAt: published.publishedAt } : profile;
      }));
      setDraftProfile(prev => {
        const published = publishedById.get(prev.id);
        return published ? { ...prev, status: 'published', publishedVersion: published.publishedVersion, publishedAt: published.publishedAt, updatedAt: published.publishedAt } : prev;
      });
      const message = result.failures.length ? `Published ${result.published.length}; ${result.failures.length} profile${result.failures.length === 1 ? '' : 's'} need attention.` : `Published ${result.published.length} profiles live.`;
      showToast(message);
      return { published: result.published.length, failed: result.failures.length };
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Bulk publishing failed.');
      return { published: 0, failed: profileIds.length };
    }
  };

  const rollbackToPublishedSnapshot = async (snapshotId: string, reason?: string): Promise<boolean> => {
    const isOwner = user.isVerified && (user.id !== 'usr-guest');
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        const rolledBack = await rollbackCloudProfile(draftProfile.id, snapshotId, reason);
        setProfiles(prev => prev.map(p => (p.id === draftProfile.id ? rolledBack : p)));
        setDraftProfile(rolledBack);
        showToast(`Successfully rolled back to snapshot ${snapshotId}. New release v${rolledBack.publishedVersion} is now live.`);
        return true;
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Cloud rollback failed');
        return false;
      }
    }
    const result = await contentLifecycleService.rollbackToSnapshot(
      draftProfile.id,
      snapshotId,
      user.email,
      isOwner,
      reason
    );

    if (!result.success) {
      showToast(result.error || 'Rollback failed');
      return false;
    }

    if (result.rolledBackProfile) {
      setProfiles(prev => prev.map(p => (p.id === draftProfile.id ? result.rolledBackProfile! : p)));
      setDraftProfile(result.rolledBackProfile);
    }

    if (result.auditLog) {
      setAuditLogs(prev => [result.auditLog!, ...prev]);
    }

    showToast(`Successfully rolled back to snapshot ${snapshotId}. New release v${result.rolledBackProfile?.publishedVersion} is now live.`);
    return true;
  };

  const generatePreviewLink = async (ttlMinutes = 60) => {
    const tokenObj = isSupabaseConfigured && user.id !== 'usr-guest'
      ? await createCloudPreviewToken(draftProfile.id, ttlMinutes)
      : contentLifecycleService.createPreviewToken(draftProfile.id, user.email, ttlMinutes);
    const previewUrl = `${window.location.origin}/?view=public_standalone&u=${draftProfile.username}&previewToken=${tokenObj.token}`;
    return {
      previewUrl,
      token: tokenObj.token,
      expiresAt: tokenObj.expiresAt
    };
  };

  const scheduleRelease = async (scheduledIsoString: string, timezone: string): Promise<boolean> => {
    try {
      const config = contentLifecycleService.schedulePublish(
        draftProfile,
        scheduledIsoString,
        timezone,
        user.email
      );
      const nextProfile = { ...draftProfile, scheduledPublish: config, updatedAt: new Date().toISOString() };
      if (isSupabaseConfigured && user.id !== 'usr-guest') await saveCloudProfile(nextProfile, user.id);
      setDraftProfile(nextProfile);
      showToast(`Release scheduled for ${new Date(config.scheduledTimeUtc).toLocaleString()} (${config.timezone})`);
      return true;
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Failed to schedule release');
      return false;
    }
  };

  const cancelScheduledRelease = async (): Promise<boolean> => {
    const success = contentLifecycleService.cancelScheduledPublish(draftProfile.id, user.email);
    if (success) {
      const nextProfile = { ...draftProfile, scheduledPublish: null, updatedAt: new Date().toISOString() };
      try {
        if (isSupabaseConfigured && user.id !== 'usr-guest') await saveCloudProfile(nextProfile, user.id);
        setDraftProfile(nextProfile);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Failed to cancel scheduled release');
        return false;
      }
      showToast('Scheduled release cancelled.');
    }
    return success;
  };

  const revertDraftToPublished = () => {
    setDraftProfile(JSON.parse(JSON.stringify(activePublished)));
    showToast('Draft reverted to published version');
  };

  const resetThemeToPublished = () => {
    setDraftProfile(prev => ({
      ...prev,
      standardTheme: activePublished.standardTheme ? JSON.parse(JSON.stringify(activePublished.standardTheme)) : undefined,
      theme: JSON.parse(JSON.stringify(activePublished.theme)),
      updatedAt: new Date().toISOString()
    }));
    showToast('Unsaved theme changes were reset. Your content was preserved.');
  };

  const switchActiveProfile = (id: string) => {
    const target = profiles.find(p => p.id === id);
    if (target) {
      setActiveProfileId(id);
      setDraftProfile(JSON.parse(JSON.stringify(target)));
      showToast(`Switched profile to @${target.username}`);
    }
  };

  const createNewProfile = async (
    username: string,
    displayName: string,
    category: string,
    themeId?: string,
    starter?: StarterProfileBlueprint
  ): Promise<string> => {
    // BIL-003: Authoritative entitlement check for profile creation
    const check = billingService.checkFeatureEntitlement(workspace, 'create_profile', {
      currentProfileCount: profiles.length
    });

    if (!check.allowed) {
      showToast(check.reason || 'Profile limit reached for current plan. Please upgrade.');
      return '';
    }

    const selectedTheme = THEME_PRESETS.find(t => t.id === themeId) || THEME_PRESETS[0];
    const normalizedCategory = category.toLowerCase();
    const personaId = starter?.personaTemplateId || (normalizedCategory.includes('music')
      ? 'music-artist'
      : normalizedCategory.includes('beauty')
        ? 'beauty-service'
        : normalizedCategory.includes('hospitality')
          ? 'small-business-shop'
          : normalizedCategory.includes('tech')
            ? 'coach-consultant'
            : normalizedCategory.includes('agency')
              ? 'creator-portfolio'
              : 'creator-portfolio');
    const persona = PERSONA_TEMPLATES.find(template => template.id === personaId);
    const newProfile = createProfileRecord({
      username,
      displayName,
      category,
      theme: selectedTheme,
      bio: starter?.bio || persona?.bio,
      socialLinks: persona?.socialLinks,
      starterBlocks: persona?.blocks
    });
    if (persona) newProfile.starterSiteId = persona.id;

    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudProfile(newProfile, user.id);
      } catch (error) {
        reportRecoverableError('Supabase profile creation failed', error);
        showToast(error instanceof Error ? error.message : 'Profile could not be created. Try again.');
        return '';
      }
    }

    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    setDraftProfile(newProfile);

    setWorkspace(prev => ({
      ...prev,
      profiles: [...prev.profiles, newProfile.id]
    }));

    showToast(`Created new profile @${newProfile.username}!`);
    return newProfile.id;
  };

  const duplicateProfile = async (profileId: string): Promise<boolean> => {
    // BIL-003: Check entitlement before allowing duplicate
    const check = billingService.checkFeatureEntitlement(workspace, 'create_profile', {
      currentProfileCount: profiles.length
    });
    if (!check.allowed) {
      showToast(check.reason || 'Profile limit reached. Upgrade to duplicate.');
      return false;
    }

    const source = profiles.find(p => p.id === profileId);
    if (!source) return false;

    const newProfile = duplicateProfileRecord(source);

    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudProfile(newProfile, user.id);
      } catch (error) {
        reportRecoverableError('Supabase profile duplication failed', error);
        showToast(error instanceof Error ? error.message : 'Profile could not be duplicated. Try again.');
        return false;
      }
    }

    setProfiles(prev => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
    setDraftProfile(newProfile);
    setWorkspace(prev => ({
      ...prev,
      profiles: [...prev.profiles, newProfile.id]
    }));
    showToast(`Duplicated to @${newProfile.username}`);
    return true;
  };

  const deleteProfile = async (profileId: string): Promise<boolean> => {
    if (profiles.length <= 1) {
      showToast('Cannot delete the only profile in the workspace');
      return false;
    }

    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await deleteCloudRecord('profiles', profileId, user.id);
      } catch (error) {
        reportRecoverableError('Supabase profile deletion failed', error);
        showToast('Profile could not be deleted. Try again.');
        return false;
      }
    }

    const remaining = profiles.filter(p => p.id !== profileId);
    setProfiles(remaining);
    const nextId = remaining[0].id;
    setActiveProfileId(nextId);
    setDraftProfile(JSON.parse(JSON.stringify(remaining[0])));
    setWorkspace(prev => ({
      ...prev,
      profiles: prev.profiles.filter(id => id !== profileId)
    }));
    showToast('Profile deleted');
    return true;
  };

  // Block management
  const addBlock = (tabId: string, blockType: BlockType, customTitle?: string) => {
    const workspaceMember = workspace.members?.find(member => member.email.toLowerCase() === user.email.toLowerCase());
    if (workspaceMember?.role === 'viewer') {
      showToast('Viewers cannot add blocks. Ask a workspace manager for edit access.');
      return;
    }
    if (blockType === 'form' || blockType === 'emailSignup') {
      const check = billingService.checkFeatureEntitlement(workspace, 'lead_form');
      if (!check.allowed) {
        showToast(check.reason || 'Lead capture forms require a paid plan.');
        return;
      }
    }
    updateDraftProfile(prev => addProfileBlock(prev, tabId, blockType, customTitle));
    showToast(`Added ${blockType} block`);
  };

  const addLinkBlocks = (tabId: string, links: Array<{ title: string; url: string }>) => {
    if (links.length === 0) return;
    updateDraftProfile(prev => addProfileLinkBlocks(prev, tabId, links));
    showToast(`${links.length} link${links.length === 1 ? '' : 's'} added`);
  };

  const updateBlock = (tabId: string, blockId: string, updates: Partial<Block>) => {
    updateDraftProfile(prev => updateProfileBlock(prev, tabId, blockId, updates));
  };

  const removeBlock = (tabId: string, blockId: string) => {
    updateDraftProfile(prev => removeProfileBlock(prev, tabId, blockId));
    showToast('Block removed');
  };

  const duplicateBlock = (tabId: string, blockId: string) => {
    updateDraftProfile(prev => duplicateProfileBlock(prev, tabId, blockId));
    showToast('Block duplicated');
  };

  const reorderBlocks = (tabId: string, fromIndex: number, toIndex: number) => {
    updateDraftProfile(prev => reorderProfileBlocks(prev, tabId, fromIndex, toIndex));
  };

  // Tabs
  const addTab = (title: string) => {
    updateDraftProfile(prev => addProfileTab(prev, title));
    showToast(`Added tab "${title}"`);
  };

  const updateTab = (tabId: string, title: string) => {
    updateDraftProfile(prev => updateProfileTab(prev, tabId, title));
  };

  const removeTab = (tabId: string) => {
    if (draftProfile.tabs.length <= 1) {
      showToast('Profile must have at least one tab');
      return;
    }
    updateDraftProfile(prev => removeProfileTab(prev, tabId));
    showToast('Tab removed');
  };

  // Current active standard theme
  const standardTheme = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);

  const applyTheme = (newTheme: ThemeConfig | StandardTheme) => {
    const currentStd = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);
    // Push current to undo stack
    setThemeUndoStack(prev => [JSON.parse(JSON.stringify(currentStd)), ...prev.slice(0, 30)]);
    setThemeRedoStack([]);

    const norm = enforceBrandKitThemePolicy(currentStd, normalizeTheme(newTheme), workspace.brandKit || defaultBrandKit, defaultBrandKit);
    const legacyCompat = toLegacyCompatTheme(norm);

    updateDraftProfile(prev => ({
      ...prev,
      standardTheme: norm,
      theme: legacyCompat,
      qrConfig: {
        ...prev.qrConfig,
        fgColor: norm.tokens.colors.primaryText,
        bgColor: norm.tokens.colors.pageBackground
      }
    }));
    showToast(`Theme draft updated. Saving ${norm.name}…`);
  };

  const updateStandardTheme = (updater: (prev: StandardTheme) => StandardTheme) => {
    const currentStd = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);
    setThemeUndoStack(prev => [JSON.parse(JSON.stringify(currentStd)), ...prev.slice(0, 30)]);
    setThemeRedoStack([]);

    const updated = updater(currentStd);
    const norm = enforceBrandKitThemePolicy(currentStd, normalizeTheme(updated), workspace.brandKit || defaultBrandKit, defaultBrandKit);

    const legacyCompat = toLegacyCompatTheme(norm);

    updateDraftProfile(prev => ({
      ...prev,
      standardTheme: norm,
      theme: legacyCompat
    }));
  };

  const applyBrandKitToTheme = () => {
    const kit = workspace.brandKit || defaultBrandKit;
    updateStandardTheme(prev => ({
      ...prev,
      tokens: {
        ...prev.tokens,
      colors: {
        ...prev.tokens.colors,
          primaryText: kit.primaryColor, secondaryText: kit.secondaryColor, accent: kit.accentColor
        },
        typography: {
          ...prev.tokens.typography,
          bodyFamily: kit.latinFont, displayFamily: kit.latinFont, arabicFamily: kit.arabicFont
        }
      },
      componentVariants: {
        ...(prev.componentVariants || { link: 'solid', image: 'rounded', socialIcons: 'line', form: 'card' }),
        link: kit.buttonStyle === 'pill' || kit.buttonStyle === 'filled' ? 'solid' : kit.buttonStyle === 'soft' ? 'soft-card' : kit.buttonStyle,
        image: kit.imageStyle,
        socialIcons: kit.socialIconStyle
      },
      socialIcons: { ...(prev.socialIcons || { color: kit.primaryColor, size: 36, style: kit.socialIconStyle }), style: kit.socialIconStyle, color: kit.primaryColor }
    }));
    showToast(`Applied ${kit.name} styles without changing content.`);
  };

  const undoThemeChange = () => {
    if (themeUndoStack.length === 0) return;
    const [previous, ...restUndo] = themeUndoStack;
    const current = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);

    setThemeRedoStack(prev => [JSON.parse(JSON.stringify(current)), ...prev]);
    setThemeUndoStack(restUndo);

    updateDraftProfile(prev => ({
      ...prev,
      standardTheme: previous,
      theme: toLegacyCompatTheme(previous)
    }));
    showToast('Undo theme change');
  };

  const redoThemeChange = () => {
    if (themeRedoStack.length === 0) return;
    const [next, ...restRedo] = themeRedoStack;
    const current = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);

    setThemeUndoStack(prev => [JSON.parse(JSON.stringify(current)), ...prev]);
    setThemeRedoStack(restRedo);

    updateDraftProfile(prev => ({
      ...prev,
      standardTheme: next,
      theme: toLegacyCompatTheme(next)
    }));
    showToast('Redo theme change');
  };

  const rollbackToSnapshot = (snapshotId: string) => {
    const snapshots = draftProfile.themeSnapshots || [];
    const target = snapshots.find(s => s.snapshotId === snapshotId);
    if (!target) {
      showToast('Snapshot not found');
      return;
    }

    applyTheme(target.theme);
    showToast(`Theme draft restored to version v${target.version}. Saving…`);
  };

  const saveCustomPreset = async (name: string): Promise<void> => {
    const current = normalizeTheme(draftProfile.standardTheme || draftProfile.theme);
    const custom: StandardTheme = {
      ...JSON.parse(JSON.stringify(current)),
      id: `custom-${Date.now()}`,
      name: name.trim() || 'My Custom Style',
      source: 'custom',
      presetId: null,
      presetComposition: {
        themeId: current.id,
        layoutId: current.layout?.templateId ? `${current.id}:layout:${current.layout.templateId}` : undefined,
        brandKitId: workspace.brandKit?.id,
        selectedBlockVariants: current.componentVariants as unknown as Record<string, string>,
        includesStarterContent: false,
        changesContent: false,
        changesLayout: true,
      },
      createdAt: new Date().toISOString()
    };

    // A configured workspace must confirm the authoritative server write
    // before the preset appears as saved in the UI.
    if (isSupabaseConfigured) {
      if (!user.id || user.id === 'usr-guest') throw new Error('Please sign in before saving a custom preset.');
      await saveCloudThemes([custom], user.id);
    }

    setCustomPresets(prev => {
      const next = [custom, ...prev];
      try {
        if (!isSupabaseConfigured) localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(next));
      } catch (e) {
        reportRecoverableError('Custom preset local storage write failed', e);
      }
      return next;
    });

    showToast(`Saved "${custom.name}" as reusable custom preset!`);
  };

  const deleteCustomPreset = async (id: string): Promise<void> => {
    const preset = customPresets.find(item => item.id === id);
    if (!preset) return;
    if (isSupabaseConfigured) {
      if (!user.id || user.id === 'usr-guest') throw new Error('Please sign in before deleting a custom preset.');
      await deleteCloudTheme(id);
    }
    setCustomPresets(prev => {
      const next = prev.filter(item => item.id !== id);
      if (!isSupabaseConfigured) localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(next));
      return next;
    });
    showToast(`Deleted "${preset.name}" preset.`);
  };

  // Tracking (PUB-004: Privacy-preserving sanitization)
  const trackEvent = (eventData: Omit<AnalyticsEvent, 'id' | 'timestamp'>) => {
    const newEvent = analyticsEngineService.recordVisitorEvent(eventData);
    setAnalytics(prev => [newEvent, ...prev.slice(0, 500)]);

    // Persist anonymous public traffic at the edge so creator analytics do not
    // depend on the visitor's browser storage. The public route re-validates
    // profile/block ownership, sanitizes the referrer, and applies rate limits.
    if (typeof window !== 'undefined' && user.id === 'usr-guest') {
      void fetch('/api/public/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          profileId: newEvent.profileId,
          blockId: newEvent.blockId,
          type: newEvent.type,
          referrer: newEvent.referrer,
          device: newEvent.device,
          campaign: newEvent.campaign,
          consentGranted: newEvent.consentGranted
        })
      }).catch(() => undefined);
    }

    // Also increment block click counter if applicable
    if (eventData.type === 'block_click' && eventData.blockId) {
      setProfiles(prev => prev.map(p => {
        if (p.id !== eventData.profileId) return p;
        return {
          ...p,
          tabs: p.tabs.map(t => ({
            ...t,
            blocks: t.blocks.map(b => (b.id === eventData.blockId ? { ...b, clicks: b.clicks + 1 } : b))
          }))
        };
      }));
    }
  };

  // Forms (FORM-001, FORM-002, FORM-003, FORM-004, FORM-005)
  const submitForm = async (
    profileId: string, 
    blockId: string, 
    formTitle: string, 
    formPayload: FormBlockPayload, 
    data: Record<string, string>, 
    consent: boolean,
    honeypotTrap?: string,
    idempotencyKey?: string
  ): Promise<{ success: boolean; error?: string; fieldErrors?: Record<string, string>; rateLimited?: boolean }> => {
    // 1. Authoritative server-side validation, spam & rate-limit check, audience sync
    if (isSupabaseConfigured && user.id === 'usr-guest') {
      return submitPublicForm({ profileId, blockId, formTitle, data, consentGiven: consent, honeypotTrap, idempotencyKey });
    }

    const result = formSubmissionService.submitFormAuthoritative({
      profileId,
      blockId,
      formTitle,
      formPayload,
      data,
      consentGiven: consent,
      honeypotTrap,
      clientIpHash: typeof window !== 'undefined' ? (window.location.hostname || 'client-browser') : 'server-node'
    });

    if (!result.success) {
      if (result.error) {
        showToast(result.error);
      }
      return result;
    }

    // 2. Refresh local submissions state from authoritative store
    const updated = formSubmissionService.getSubmissions(profileId);
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudSubmissions(updated, user.id);
        await saveCloudSubscribers(formSubmissionService.getSubscribers(profileId), user.id);
      } catch (error) {
        if (result.submissionId) formSubmissionService.deleteSubmission(profileId, result.submissionId, user.email);
        const message = error instanceof Error ? error.message : 'Cloud submission failed';
        showToast('Submission was not saved. Please retry.');
        return { success: false, error: message };
      }
    }
    setSubmissions(prev => {
      // Keep other profiles' submissions intact in state
      const otherProfiles = prev.filter(s => s.profileId !== profileId);
      return [...updated, ...otherProfiles];
    });

    // 3. Track analytics event
    trackEvent({
      profileId,
      blockId,
      type: 'form_submit',
      referrer: 'Public Profile Page',
      country: 'United States',
      device: 'mobile'
    });

    showToast(formPayload.successMessage || 'Submission confirmed!');
    return { success: true };
  };

  const deleteSubmission = async (id: string): Promise<boolean> => {
    const submission = submissions.find(item => item.id === id && item.profileId === activeProfileId);
    if (!submission) return false;
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await deleteCloudRecord('form_submissions', id, user.id);
      } catch (error) {
        showToast('Submission deletion was not saved. Please retry.');
        return false;
      }
    }
    formSubmissionService.deleteSubmission(activeProfileId, id, user.email);
    setSubmissions(prev => prev.filter(s => s.id !== id));
    showToast('Submission deleted');
    return true;
  };

  const unsubscribeSubscriber = async (email: string): Promise<boolean> => {
    const previousSubscribers = profiles.flatMap(profile => formSubmissionService.getSubscribers(profile.id));
    const changed = formSubmissionService.unsubscribeSubscriber(activeProfileId, email, user.email);
    if (!changed) return false;
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        const subscribers = profiles.flatMap(profile => formSubmissionService.getSubscribers(profile.id));
        await saveCloudSubscribers(subscribers, user.id);
      } catch (error) {
        formSubmissionService.replaceSubscribers(previousSubscribers);
        reportRecoverableError('Supabase subscriber unsubscribe failed', error);
        showToast('Unsubscribe was not saved. Please retry.');
        return false;
      }
    }
    showToast(`Subscriber ${email} marked as unsubscribed.`);
    return true;
  };

  // Domains — all mutations go through domainService for PRO-001/003/004 compliance
  const verifyDomain = async (profileId: string, domain: string): Promise<{ success: boolean; failureReason?: string }> => {
    const check = billingService.checkFeatureEntitlement(workspace, 'custom_domain');
    if (!check.allowed) {
      showToast(check.reason || 'Custom domains require Creator Pro or Agency plan.');
      return { success: false, failureReason: check.reason };
    }

    if (isSupabaseConfigured) {
      const remote = await verifyManagedDomain(profileId, domain);
      if (!remote.config) { showToast(remote.error || 'Domain verification failed.'); return { success: false, failureReason: remote.error }; }
      updateDraftProfile(prev => ({ ...prev, customDomain: remote.config }));
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, customDomain: remote.config } : p));
      if (remote.success) showToast(remote.config.sslStatus === 'active' ? 'Domain verified and SSL is active.' : 'DNS verified. SSL is provisioning.');
      else showToast(remote.error || remote.config.failureReason || 'DNS verification failed.');
      return { success: Boolean(remote.success), failureReason: remote.error || remote.config.failureReason };
    }

    const result = await domainService.verifyDomain(domain, profileId, workspace.id, profiles);

    updateDraftProfile(prev => ({ ...prev, customDomain: result.config }));
    // Also update the source profiles array so other profile views see the state
    setProfiles(prev => prev.map(p =>
      p.id === profileId ? { ...p, customDomain: result.config } : p
    ));

    if (result.success) {
      showToast(`Domain ${result.domain} verified & SSL provisioned!`);
    } else {
      showToast(result.failureReason || 'Domain verification failed. Check DNS settings.');
    }
    return { success: result.success, failureReason: result.failureReason };
  };

  const removeDomain = async (profileId: string): Promise<void> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile?.customDomain) return;
    if (isSupabaseConfigured) {
      const remote = await removeManagedDomain(profileId);
      if (remote.error) { showToast(remote.error); return; }
    } else {
      domainService.removeDomain(profile.customDomain.domain, workspace.id);
    }
    const updater = (p: Profile) => ({ ...p, customDomain: undefined });
    updateDraftProfile(updater);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, customDomain: undefined } : p));
    showToast('Custom domain disconnected.');
  };

  const recheckDomain = async (profileId: string): Promise<void> => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile?.customDomain) return;
    if (isSupabaseConfigured) {
      const remote = await recheckManagedDomain(profileId, profile.customDomain.domain);
      if (!remote.config) { showToast(remote.error || 'DNS check failed.'); return; }
      updateDraftProfile(prev => ({ ...prev, customDomain: remote.config }));
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, customDomain: remote.config } : p));
      showToast(remote.config.failureReason || (remote.config.sslStatus === 'active' ? 'DNS and SSL check complete.' : 'DNS verified; SSL remains in provisioning.'));
      return;
    }
    const result = await domainService.recheckDomain(profile.customDomain, workspace.id);
    const updater = (p: Profile) => ({ ...p, customDomain: result.config });
    updateDraftProfile(updater);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, customDomain: result.config } : p));
    if (result.changed) {
      showToast(result.failureReason || 'Domain status updated.');
    } else {
      showToast('DNS check complete — no change detected.');
    }
  };

  // PRO-005: Member management
  const addMember = async (email: string, name: string, role: ProfileRole, assignedProfileIds: string[]): Promise<{ success: boolean; error?: string }> => {
    const existing = workspace.members?.find(m => m.email === email);
    if (existing) return { success: false, error: `${email} is already a workspace member.` };
    let member: ProfileMember = {
      id: `mem-${Date.now()}`,
      email,
      name,
      role,
      assignedProfileIds,
      addedAt: new Date().toISOString(),
      addedBy: user.email,
      pendingInviteExpiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    };
    try {
      if (isSupabaseConfigured && user.id !== 'usr-guest') {
        member = await inviteCloudWorkspaceMember({ email, name, role, assignedProfileIds });
      }
      const nextWorkspace = { ...workspace, members: [...(workspace.members || []), member] };
      if (!isSupabaseConfigured || user.id === 'usr-guest') await saveCloudWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Member could not be saved.';
      showToast(message);
      return { success: false, error: message };
    }
    showToast(`Invitation sent to ${email}`);
    return { success: true };
  };

  const removeMember = async (memberId: string): Promise<boolean> => {
    const nextWorkspace = { ...workspace, members: (workspace.members || []).filter(m => m.id !== memberId) };
    try {
      if (isSupabaseConfigured && user.id !== 'usr-guest') await removeCloudWorkspaceMember(memberId);
      else await saveCloudWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Member removal was not saved.');
      return false;
    }
    showToast('Member removed from workspace.');
    return true;
  };

  const updateMemberRole = async (memberId: string, role: ProfileRole, assignedProfileIds: string[]): Promise<boolean> => {
    const nextWorkspace = {
      ...workspace,
      members: (workspace.members || []).map(m => m.id === memberId ? { ...m, role, assignedProfileIds } : m)
    };
    try {
      if (isSupabaseConfigured && user.id !== 'usr-guest') await updateCloudWorkspaceMember(memberId, role, assignedProfileIds);
      else await saveCloudWorkspace(nextWorkspace);
      setWorkspace(nextWorkspace);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Member permissions were not saved.');
      return false;
    }
    showToast('Member permissions updated.');
    return true;
  };

  // ─── Feature 12: API Keys & Webhooks ────────────────────────────────────────

  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>(() => apiKeyService.listKeys(workspace.id));
  const [webhookSubscriptions, setWebhookSubscriptions] = React.useState<WebhookSubscription[]>(() => apiKeyService.listWebhooks(workspace.id));
  const [apiAuditLog, setApiAuditLog] = React.useState<ApiAuditEntry[]>(() => apiKeyService.getAuditLog());

  useEffect(() => {
    if (!cloudHydrated || !cloudApiState.current) return;
    const { apiKeys: remoteKeys, webhookSubscriptions: remoteWebhooks } = cloudApiState.current;
    setApiKeys(remoteKeys);
    setWebhookSubscriptions(remoteWebhooks);
    apiKeyService.replaceKeys(workspace.id, remoteKeys);
    apiKeyService.replaceWebhooks(workspace.id, remoteWebhooks);
  }, [cloudHydrated, workspace.id]);

  useEffect(() => {
    if (!cloudReady.current || !isSupabaseConfigured || !user.id || user.id === 'usr-guest') return;
    if (user.id !== workspace.id) return;
    void saveCloudApiKeys(apiKeys, user.id).catch(error => reportRecoverableError('Supabase API key save failed', error));
    void saveCloudWebhooks(webhookSubscriptions, user.id).catch(error => reportRecoverableError('Supabase webhook save failed', error));
  }, [apiKeys, webhookSubscriptions, user.id, workspace.id]);

  const refreshApiState = () => {
    setApiKeys(apiKeyService.listKeys(workspace.id));
    setWebhookSubscriptions(apiKeyService.listWebhooks(workspace.id));
    setApiAuditLog(apiKeyService.getAuditLog());
  };

  /** API-002: Create a new scoped key. Returns full secret exactly once. */
  const createApiKey = async (name: string, scopes: ApiKeyScope[], allowedProfileIds: string[] | null, expiresAt?: string) => {
    if (isSupabaseConfigured) {
      const remote = await createManagedApiKey({ name, scopes, allowedProfileIds, expiresAt });
      if (remote.error || !remote.data || !remote.secret) { showToast(remote.error || 'API key creation failed.'); return { error: remote.error || 'API key creation failed.' }; }
      apiKeyService.replaceKeys(workspace.id, [...apiKeys, remote.data]);
      setApiKeys(prev => [...prev, remote.data!]);
      showToast(`API key "${name}" created. Copy the secret now — it will not be shown again.`);
      return { key: remote.data, secret: remote.secret };
    }
    const result = apiKeyService.createKey(workspace, name, scopes, allowedProfileIds, user.email, expiresAt);
    if ('error' in result) { showToast(result.error); return result; }
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudApiKeys([result.key], user.id);
      } catch (error) {
        apiKeyService.replaceKeys(workspace.id, apiKeys);
        const message = error instanceof Error ? error.message : 'Cloud API key save failed';
        showToast(message);
        return { error: message };
      }
    }
    showToast(`API key "${name}" created. Copy the secret now — it will not be shown again.`);
    refreshApiState();
    return result;
  };

  /** API-002: Revoke key immediately. */
  const revokeApiKey = async (keyId: string) => {
    if (isSupabaseConfigured) {
      const remote = await revokeManagedApiKey(keyId);
      if (remote.error) { showToast(remote.error); return { success: false, error: remote.error }; }
      setApiKeys(prev => prev.map(key => key.id === keyId ? { ...key, status: 'revoked', revokedAt: new Date().toISOString() } : key));
      showToast('API key revoked.');
      return { success: true };
    }
    const previousKeys = apiKeys;
    const result = apiKeyService.revokeKey(workspace.id, keyId, user.email);
    if (result.success && isSupabaseConfigured && user.id !== 'usr-guest') {
      const nextKeys = apiKeyService.listKeys(workspace.id);
      try {
        await saveCloudApiKeys(nextKeys, user.id);
      } catch (error) {
        apiKeyService.replaceKeys(workspace.id, previousKeys);
        const message = error instanceof Error ? error.message : 'Cloud API key revoke failed';
        showToast(message);
        return { success: false, error: message };
      }
    }
    if (result.success) showToast('API key revoked. Any in-flight requests using this key will be rejected.');
    else showToast(result.error || 'Could not revoke key.');
    refreshApiState();
    return result;
  };

  /** API-002: Rotate key — old key invalidated, new secret shown once. */
  const rotateApiKey = async (keyId: string) => {
    if (isSupabaseConfigured) {
      const remote = await rotateManagedApiKey(keyId);
      if (remote.error || !remote.data || !remote.secret) { showToast(remote.error || 'API key rotation failed.'); return { error: remote.error || 'API key rotation failed.' }; }
      setApiKeys(prev => prev.map(key => key.id === keyId ? remote.data! : key));
      apiKeyService.replaceKeys(workspace.id, apiKeys.map(key => key.id === keyId ? remote.data! : key));
      showToast('Key rotated. Copy the new secret — the old key is now revoked.');
      return { key: remote.data, secret: remote.secret };
    }
    const previousKeys = apiKeys;
    const result = apiKeyService.rotateKey(workspace.id, keyId, user.email);
    if ('error' in result) { showToast(result.error); return result; }
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudApiKeys([result.key], user.id);
      } catch (error) {
        apiKeyService.replaceKeys(workspace.id, previousKeys);
        const message = error instanceof Error ? error.message : 'Cloud API key rotation failed';
        showToast(message);
        return { error: message };
      }
    }
    showToast('Key rotated. Copy the new secret — the old one is now revoked.');
    refreshApiState();
    return result;
  };

  /** API-005: Subscribe to webhook events. */
  const createWebhookSubscription = async (url: string, topics: WebhookEventTopic[], description?: string) => {
    if (isSupabaseConfigured) {
      const remote = await createManagedWebhook({ url, topics, description });
      if (remote.error || !remote.data || !remote.secret) { showToast(remote.error || 'Webhook creation failed.'); return { error: remote.error || 'Webhook creation failed.' }; }
      const hook = remote.data;
      apiKeyService.replaceWebhooks(workspace.id, [...webhookSubscriptions, hook]);
      setWebhookSubscriptions(prev => [...prev, hook]);
      showToast('Webhook subscription created. Copy the signing secret now.');
      return { hook, signingSecret: remote.secret };
    }
    const result = apiKeyService.createWebhook(workspace, url, topics, user.email, description);
    if ('error' in result) { showToast(result.error); return result; }
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudWebhooks([result.hook], user.id);
      } catch (error) {
        apiKeyService.replaceWebhooks(workspace.id, webhookSubscriptions);
        const message = error instanceof Error ? error.message : 'Cloud webhook save failed';
        showToast(message);
        return { error: message };
      }
    }
    showToast('Webhook subscription created. Copy the signing secret now.');
    refreshApiState();
    return result;
  };

  const deleteWebhookSubscription = async (hookId: string) => {
    if (isSupabaseConfigured) {
      const remote = await deleteManagedWebhook(hookId);
      if (remote.error) { showToast(remote.error); return; }
      setWebhookSubscriptions(prev => prev.filter(hook => hook.id !== hookId));
      apiKeyService.replaceWebhooks(workspace.id, webhookSubscriptions.filter(hook => hook.id !== hookId));
      showToast('Webhook subscription removed.');
      return;
    }
    const previousHooks = webhookSubscriptions;
    apiKeyService.deleteWebhook(workspace.id, hookId);
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await deleteCloudRecord('webhook_subscriptions', hookId, user.id);
      } catch (error) {
        apiKeyService.replaceWebhooks(workspace.id, previousHooks);
        showToast(error instanceof Error ? error.message : 'Cloud webhook deletion failed');
        return;
      }
    }
    showToast('Webhook subscription removed.');
    refreshApiState();
  };

  const toggleWebhookStatus = async (hookId: string, status: 'active' | 'paused') => {
    if (isSupabaseConfigured) {
      const remote = await updateManagedWebhook(hookId, status);
      if (remote.error) { showToast(remote.error); return; }
      setWebhookSubscriptions(prev => prev.map(hook => hook.id === hookId ? { ...hook, status } : hook));
      apiKeyService.replaceWebhooks(workspace.id, webhookSubscriptions.map(hook => hook.id === hookId ? { ...hook, status } : hook));
      showToast(`Webhook ${status === 'active' ? 'resumed' : 'paused'}.`);
      return;
    }
    const previousHooks = webhookSubscriptions;
    apiKeyService.updateWebhookStatus(workspace.id, hookId, status);
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudWebhooks(apiKeyService.listWebhooks(workspace.id), user.id);
      } catch (error) {
        apiKeyService.replaceWebhooks(workspace.id, previousHooks);
        showToast(error instanceof Error ? error.message : 'Cloud webhook update failed');
        return;
      }
    }
    showToast(`Webhook ${status === 'active' ? 'resumed' : 'paused'}.`);
    refreshApiState();
  };

  const dispatchTestWebhook = async (hookId: string, topic: WebhookEventTopic) => {
    if (isSupabaseConfigured) {
      const remote = await testManagedWebhook(hookId);
      const status: 'delivered' | 'failed' = remote.error ? 'failed' : remote.delivered ? 'delivered' : 'failed';
      showToast(status === 'delivered' ? `Test delivered — delivery ID: ${(remote.deliveryId || '').slice(0, 14)}` : remote.error || 'Test delivery failed.');
      return { deliveryId: remote.deliveryId || '', signatureHeader: '', status };
    }
    const result = await apiKeyService.simulateWebhookDispatch(workspace.id, hookId, topic, {
      topic, profileId: activeProfileId, timestamp: Date.now()
    });
    showToast(result.status === 'delivered'
      ? `Test delivered (${topic}) — delivery ID: ${result.deliveryId.slice(0, 14)}`
      : 'Test delivery failed — endpoint returned an error. Check webhook logs.');
    refreshApiState();
    return result;
  };

  /** API-001/003/004: Execute a sandboxed API request through the gateway. */
  const executeApiRequest = (keyId: string, scope: ApiKeyScope, method: string, endpoint: string): ApiGatewayResult => {
    if (isSupabaseConfigured) {
      return {
        ok: false,
        statusCode: 501,
        error: { code: 'SANDBOX_DISABLED', message: 'The dashboard does not retain API secrets. Run this request from your server using the one-time key secret.' },
        requestId: `req_${crypto.randomUUID()}`,
        durationMs: 0,
      };
    }
    const result = apiKeyService.executeRequest({
      workspaceId: workspace.id,
      keyId,
      requiredScope: scope,
      method,
      endpoint,
      workspace,
      profile: draftProfile,
      handler: () => {
        // Return normalized profile/block/analytics data matching OpenAPI schema
        if (scope === 'profiles:read') {
          return {
            id: draftProfile.id, username: draftProfile.username, displayName: draftProfile.displayName,
            bio: draftProfile.bio, status: draftProfile.status, publishedVersion: draftProfile.publishedVersion,
            customDomain: draftProfile.customDomain?.domain ?? null,
            tabsCount: draftProfile.tabs.length,
            blocksCount: draftProfile.tabs.reduce((t, tab) => t + tab.blocks.length, 0)
          };
        }
        if (scope === 'blocks:read') {
          return {
            profileId: draftProfile.id,
            tabs: draftProfile.tabs.map(tab => ({
              id: tab.id, title: tab.title, slug: tab.slug,
              blocks: tab.blocks.map(b => ({ id: b.id, type: b.type, title: b.title, isHidden: b.isHidden, clicks: b.clicks }))
            }))
          };
        }
        if (scope === 'themes:read') {
          return { id: draftProfile.theme.id, name: draftProfile.theme.name, accentColor: draftProfile.theme.accentColor, cardStyle: draftProfile.theme.cardStyle };
        }
        if (scope === 'analytics:read') {
          return { profileId: draftProfile.id, period: '7d', pageViews: 1420, uniqueVisitors: 1022, clicks: 648, ctr: '45.6%' };
        }
        if (scope === 'forms:read') {
          return { profileId: draftProfile.id, total: 0, data: [], cursor: null };
        }
        return { acknowledged: true };
      }
    });
    setApiAuditLog(apiKeyService.getAuditLog());
    return result;
  };

  // Billing — all mutations go through billingService for idempotency + audit trail
  const upgradePlan = async (plan: PlanType, cycle: BillingCycle): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        const checkoutUrl = await createStripeCheckoutSession(plan, cycle);
        window.location.assign(checkoutUrl);
        return true;
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to start checkout.');
        return false;
      }
    }
    const planConfig = billingService.getPlanConfig(plan);
    const amountPaid = cycle === 'annual' ? `$${planConfig.annualBilledTotal}.00` : `$${planConfig.monthlyPrice}.00`;
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();

    const webhookEvent = {
      id: `evt_checkout_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'checkout.session.completed' as const,
      created: Date.now(),
      data: {
        workspaceId: workspace.id,
        planId: plan,
        billingCycle: cycle,
        status: 'active' as const,
        customerId: workspace.providerCustomerId || `cus_${Math.random().toString(36).substr(2, 8)}`,
        subscriptionId: workspace.providerSubscriptionId || `sub_${Math.random().toString(36).substr(2, 8)}`,
        periodStart: now,
        periodEnd,
        amountPaid,
        cancelAtPeriodEnd: false
      }
    };

    const result = billingService.processWebhookEvent(webhookEvent);
    if (result.updatedWorkspace) {
      setWorkspace({ ...result.updatedWorkspace, profiles: workspace.profiles });
    }
    showToast(`Subscribed to ${plan.toUpperCase()} plan successfully!`);
    return true;
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (isSupabaseConfigured) {
      try {
        await cancelStripeSubscription();
        setWorkspace(prev => ({ ...prev, cancelAtPeriodEnd: true }));
        showToast('Subscription will remain active until the end of the current billing period.');
        return true;
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to cancel subscription.');
        return false;
      }
    }
    const updated = billingService.cancelSubscription(workspace, user.email);
    setWorkspace(prev => ({ ...updated, profiles: prev.profiles }));
    showToast('Subscription will remain active until the end of the current billing period.');
    return true;
  };

  const openBillingPortal = async () => {
    if (isSupabaseConfigured) {
      try {
        const portalUrl = await createStripeBillingPortalSession();
        window.location.assign(portalUrl);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to open billing portal.');
      }
      return;
    }
    showToast('Billing portal requires a configured Stripe account.');
  };

  const processWebhookEvent = (eventType: string, planId?: PlanType, cycle?: BillingCycle) => {
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const event = {
      id: `evt_sim_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: eventType as 'invoice.payment_failed' | 'invoice.payment_succeeded' | 'customer.subscription.deleted' | 'customer.subscription.updated' | 'checkout.session.completed',
      created: Date.now(),
      data: {
        workspaceId: workspace.id,
        planId: planId || workspace.plan,
        billingCycle: cycle || workspace.billingCycle || 'annual',
        status: 'active' as const,
        customerId: workspace.providerCustomerId || `cus_${Math.random().toString(36).substr(2, 8)}`,
        periodStart: now,
        periodEnd,
        amountPaid: '$84.00'
      }
    };
    const result = billingService.processWebhookEvent(event);
    if (result.updatedWorkspace) {
      setWorkspace(prev => ({ ...result.updatedWorkspace!, profiles: prev.profiles }));
    }
    showToast(`[Billing] ${result.duplicate ? 'Duplicate event ignored.' : result.message}`);
  };

  // Abuse Reports
  const submitAbuseReport = async (report: Omit<AbuseReport, 'id' | 'timestamp' | 'status'>) => {
    if (isSupabaseConfigured) {
      const result = await submitPublicAbuseReport(report);
      if (!result.success) {
        showToast(result.error || 'Report could not be submitted.');
        return;
      }
      showToast('Report submitted for compliance review.');
      return;
    }
    const newReport: AbuseReport = {
      ...report,
      id: `rep-${Date.now()}`,
      timestamp: Date.now(),
      status: 'pending'
    };
    setAbuseReports(prev => [newReport, ...prev]);
    showToast('Report submitted for compliance review. Ticket #'+ newReport.id);
  };

  const updateAbuseReportStatus = async (id: string, status: AbuseReport['status']): Promise<boolean> => {
    const current = abuseReports.find(report => report.id === id);
    if (!current) return false;
    const updated = { ...current, status };
    const next = abuseReports.map(report => report.id === id ? updated : report);
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      try {
        await saveCloudReports(next, user.id);
      } catch (error) {
        reportRecoverableError('Supabase abuse report update failed', error);
        showToast('Report status could not be saved. Try again.');
        return false;
      }
    }
    setAbuseReports(next);
    showToast(`Report ${status}.`);
    return true;
  };

  const appendAuditLog = (action: string, target: string, details?: string) => {
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actor: user.email || 'operator@lynkflow.internal',
      action,
      target,
      timestamp: Date.now(),
      details,
    };
    setAuditLogs(prev => [entry, ...prev].slice(0, 500));
  };

  // Export & Reset
  const exportAccountData = () => {
    const exportBundle = {
      workspace,
      profiles,
      analyticsSummary: { totalEvents: analytics.length },
      submissions,
      auditLogs,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lynkflow_export_${user.email.split('@')[0]}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Account data exported successfully');
  };

  const resetAllData = () => {
    if (isSupabaseConfigured && user.id !== 'usr-guest') {
      showToast('Factory reset is available only in demo mode.');
      return;
    }
    localStorage.clear();
    setProfiles(INITIAL_PROFILES);
    setActiveProfileId(INITIAL_PROFILES[0].id);
    setDraftProfile(JSON.parse(JSON.stringify(INITIAL_PROFILES[0])));
    setWorkspace(INITIAL_WORKSPACE);
    setAnalytics(INITIAL_ANALYTICS);
    setSubmissions(INITIAL_SUBMISSIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setAbuseReports([]);
    showToast('Demo data reset to factory seed');
  };

  // Auth & Onboarding Handlers (ACC-001 through ACC-005)
  const signUp = async (email: string, pass: string, name?: string): Promise<AuthResponse> => {
    const result = await signUpWithSupabase(email, pass, name);
    if (!result.success) {
      showToast(result.error || authUnavailableMessage);
      return result;
    }
    if (result.user) {
      setUser(result.user);
      setIsOnboardingOpen(true);
      showToast(`Account created for ${result.user.email}! Check your inbox to verify it.`);
    }
    return result;
  };

  const logIn = async (email: string, pass: string): Promise<AuthResponse> => {
    const result = await logInWithSupabase(email, pass);
    if (!result.success) {
      showToast(result.error || authUnavailableMessage);
      return result;
    }
    if (result.user) {
      setUser(result.user);
      setIsOnboardingOpen(!result.user.onboardingCompleted);
      showToast(`Welcome back, ${result.user.name}!`);
    }
    return result;
  };

  const logOut = () => {
    if (isSupabaseConfigured && supabase) void supabase.auth.signOut();
    if (isSupabaseConfigured) {
      setProfiles([]);
      setActiveProfileId('');
      setDraftProfile(JSON.parse(JSON.stringify(EMPTY_CLOUD_PROFILE)));
      setAnalytics([]);
      setSubmissions([]);
      setAuditLogs([]);
      setAbuseReports([]);
      setCustomPresets([]);
      setIsOnboardingOpen(false);
      cloudApiState.current = null;
    }
    setUser({
      id: 'usr-guest',
      email: 'creator@example.com',
      name: 'Logged Out',
      isVerified: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      onboardingCompleted: false,
      onboardingStep: 'category',
      workspaceId: 'ws-main'
    });
    setCurrentView('marketing');
    showToast('Logged out of workspace.');
  };

  const verifyEmail = async (): Promise<AuthResponse> => {
    const result = await verifySupabaseEmail();
    if (!result.success) {
      showToast(result.error || authUnavailableMessage);
      return result;
    }
    setUser(prev => ({ ...prev, isVerified: true }));
    showToast('Email verified successfully! Full publishing privileges enabled.');
    return { success: true };
  };

  const resendVerificationEmail = async () => {
    const result = await resendSupabaseVerificationEmail(user.email);
    showToast(result.success ? 'Verification email sent.' : result.error || 'Unable to send verification email.');
    return result;
  };

  const requestPasswordReset = async (email: string): Promise<PasswordResetResponse> => {
    const result = await requestSupabasePasswordReset(email);
    showToast(result.message);
    return result;
  };

  const resetPassword = async (token: string, newPass: string): Promise<AuthResponse> => {
    void token;
    const result = await resetSupabasePassword(newPass);
    if (result.success) {
      showToast('Password reset successfully.');
    }
    if (!result.success && result.error) showToast(result.error);
    return result;
  };

  const completeOnboarding = async (starter?: StarterProfileBlueprint) => {
    if (starter) {
      const profileId = await createNewProfile(
        starter.handle,
        starter.displayName || starter.handle,
        starter.category,
        starter.themeId,
        starter
      );
      if (!profileId) return;
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.auth.updateUser({ data: { onboardingCompleted: true, onboardingStep: 'completed' } });
      setUser(prev => ({ ...prev, onboardingCompleted: true, onboardingStep: 'completed' }));
    } else {
      showToast(authUnavailableMessage);
      return;
    }
    setIsOnboardingOpen(false);
    setCurrentView('editor');
    showToast('Onboarding complete! Welcome to your creator studio.');
  };

  const skipOnboarding = () => {
    if (isSupabaseConfigured && supabase) {
      void supabase.auth.updateUser({ data: { onboardingCompleted: true, onboardingStep: 'completed' } });
      setUser(prev => ({ ...prev, onboardingCompleted: true, onboardingStep: 'completed' }));
    } else {
      showToast(authUnavailableMessage);
      return;
    }
    setIsOnboardingOpen(false);
    setCurrentView('editor');
    showToast('You can customize your handle and profile anytime in Settings.');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        signUp,
        logIn,
        logOut,
        verifyEmail,
        resendVerificationEmail,
        requestPasswordReset,
        resetPassword,
        completeOnboarding,
        skipOnboarding,
        isOnboardingOpen,
        setIsOnboardingOpen,

        workspace,
        profiles,
        activeProfile: draftProfile,
        publishedProfile: activePublished,
        hasUnpublishedChanges,
        currentView,
        setCurrentView,
        previewDevice,
        setPreviewDevice,
        previewSource,
        setPreviewSource,
        publicViewingUsername,
        setPublicViewingUsername,
        publicDemo,
        setPublicDemo,
        updateBrandKit,
        applyBrandKitToTheme,

        updateDraftProfile,
        saveDraftNow,
        publishProfile,
        bulkPublishProfiles,
        revertDraftToPublished,
        resetThemeToPublished,
        rollbackToPublishedSnapshot,
        generatePreviewLink,
        scheduleRelease,
        cancelScheduledRelease,
        switchActiveProfile,
        createNewProfile,
        duplicateProfile,
        deleteProfile,

        addBlock,
        addLinkBlocks,
        updateBlock,
        removeBlock,
        reorderBlocks,
        duplicateBlock,

        addTab,
        updateTab,
        removeTab,

        applyTheme,
        standardTheme,
        updateStandardTheme,
        undoThemeChange,
        redoThemeChange,
        canUndoTheme: themeUndoStack.length > 0,
        canRedoTheme: themeRedoStack.length > 0,
        rollbackToSnapshot,
        saveCustomPreset,
        deleteCustomPreset,
        customPresets,

        analytics,
        trackEvent,
        submissions,
        submitForm,
      deleteSubmission,
      unsubscribeSubscriber,

        verifyDomain,
        removeDomain,
        recheckDomain,
        upgradePlan,
        cancelSubscription,
        openBillingPortal,
        processWebhookEvent,

        addMember,
        removeMember,
        updateMemberRole,

        auditLogs,
        abuseReports,
        submitAbuseReport,
        updateAbuseReportStatus,
        appendAuditLog,
        exportAccountData,
        resetAllData,

        // Feature 12: API & Automation
        apiKeys,
        createApiKey,
        revokeApiKey,
        rotateApiKey,
        webhookSubscriptions,
        createWebhookSubscription,
        deleteWebhookSubscription,
        toggleWebhookStatus,
        dispatchTestWebhook,
        executeApiRequest,
        apiAuditLog,

        toastMessage,
        showToast,

        animationTrigger,
        triggerReplayAnimation,

        // Workspace Concurrency & Autosave (EDT-003, EDT-004)
        saveStatus,
        lastSavedAt,
        saveErrorMessage,
        retrySave,
        isConflictOpen,
        resolveConflictReload,
        resolveConflictOverwrite,
        simulateNetworkError,

        // authReady: true after Supabase session check (or local-auth path)
        // completes. Prevents login modal from flashing on refresh when a valid
        // Supabase session is already persisted in storage.
        authReady: cloudHydrated

      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context && typeof window === 'undefined') {
    // The edge renderer uses the same profile component without mounting the
    // browser-only application provider. Interactive actions are intentionally
    // inert in static HTML; the browser hydrates the real provider afterward.
    return {
      trackEvent: () => undefined,
      submitForm: async () => ({ success: false, error: 'Interactive form actions require the browser.' }),
      setCurrentView: () => undefined,
      animationTrigger: 0,
      triggerReplayAnimation: () => undefined,
    } as unknown as AppContextType;
  }
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
