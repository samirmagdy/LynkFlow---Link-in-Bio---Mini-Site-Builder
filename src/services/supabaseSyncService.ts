import {
  AbuseReport, AnalyticsEvent, ApiKey, AuditLog, FormSubmission,
  Profile, Subscriber, StandardTheme, WebhookSubscription, Workspace, UserAccount, BrandKit, ProfileMember, ProfileRole
} from '../types';
import { normalizeTheme, validateThemeSchema } from '../utils/themeEngine';
import { mergeSparseOverride } from '../utils/designSystemPersistence';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface CloudProfileRow {
  id: string;
  username: string;
  data: Profile;
  active_theme_id?: string | null;
  active_layout_id?: string | null;
  theme_overrides_json?: Record<string, unknown> | null;
  layout_overrides_json?: Record<string, unknown> | null;
  active_starter_site_id?: string | null;
}
interface CloudWorkspaceRow {
  id: string;
  name: string;
  plan: Workspace['plan'];
  settings: Partial<Workspace>;
  billing_cycle: Workspace['billingCycle'];
  subscription_status: Workspace['status'];
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  trial_ends_at?: string;
  provider_customer_id?: string;
  provider_subscription_id?: string;
}

export interface CloudState {
  user: UserAccount;
  workspace: Workspace;
  profiles: Profile[];
  analytics: AnalyticsEvent[];
  submissions: FormSubmission[];
  auditLogs: AuditLog[];
  abuseReports: AbuseReport[];
  customThemes: StandardTheme[];
  apiKeys: ApiKey[];
  webhookSubscriptions: WebhookSubscription[];
  subscribers: Subscriber[];
}

function mapUser(user: { id: string; email?: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown>; created_at: string }, hasProfiles: boolean): UserAccount {
  const name = String(user.user_metadata?.name || user.email?.split('@')[0] || 'Creator');
  return {
    id: user.id,
    email: user.email || '',
    name,
    isVerified: Boolean(user.email_confirmed_at || user.user_metadata?.email_verified === true),
    createdAt: user.created_at,
    lastLoginAt: new Date().toISOString(),
    onboardingCompleted: hasProfiles || Boolean(user.user_metadata?.onboardingCompleted),
    onboardingStep: hasProfiles || Boolean(user.user_metadata?.onboardingCompleted) ? 'completed' : 'category',
    workspaceId: user.id,
  };
}

export async function loadCloudState(): Promise<CloudState | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const [
    { data: workspaceData, error: workspaceError },
    { data: profileRows, error: profileError },
    { data: analyticsRows, error: analyticsError },
    { data: submissionRows, error: submissionsError },
    { data: auditRows, error: auditError },
    { data: reportRows, error: reportsError },
    { data: themeRows, error: themesError },
    { data: brandKitRows, error: brandKitError },
    { data: designThemeRows, error: designThemesError },
    { data: layoutRows, error: layoutsError },
    { data: themeVersionRows, error: themeVersionsError },
    { data: apiKeyRows, error: apiKeysError },
    { data: webhookRows, error: webhooksError },
    { data: subscriberRows, error: subscribersError },
  ] = await Promise.all([
    supabase.from('workspaces').select('id,name,plan,settings,billing_cycle,subscription_status,current_period_start,current_period_end,cancel_at_period_end,trial_ends_at,provider_customer_id,provider_subscription_id').eq('id', authData.user.id).single(),
    supabase.from('profiles').select('id,username,data,active_theme_id,active_layout_id,theme_overrides_json,layout_overrides_json,active_starter_site_id').eq('workspace_id', authData.user.id).order('created_at'),
    supabase.from('analytics_events').select('*').eq('workspace_id', authData.user.id),
    supabase.from('form_submissions').select('*').eq('workspace_id', authData.user.id),
    supabase.from('audit_logs').select('*').eq('workspace_id', authData.user.id).order('occurred_at', { ascending: false }).limit(500),
    supabase.from('abuse_reports').select('*').eq('workspace_id', authData.user.id),
    supabase.from('custom_themes').select('*').eq('workspace_id', authData.user.id),
    supabase.from('brand_kits').select('id,tokens_json,locked_fields_json,updated_at').eq('workspace_id', authData.user.id).order('updated_at', { ascending: false }).limit(1),
    supabase.from('themes').select('id,definition_json,updated_at').eq('workspace_id', authData.user.id).eq('is_active', true),
    supabase.from('layouts').select('id,definition_json,updated_at').eq('workspace_id', authData.user.id).eq('is_active', true),
    supabase.from('theme_versions').select('id,profile_id,theme_id,layout_id,overrides_json,status,created_at').eq('workspace_id', authData.user.id).in('status', ['draft', 'published']).order('created_at', { ascending: false }),
    supabase.from('api_keys').select('*').eq('workspace_id', authData.user.id),
    supabase.from('webhook_subscriptions').select('id,workspace_id,url,description,topics,signing_secret_prefix,status,created_at,created_by,last_delivery_at,last_delivery_status,consecutive_failures').eq('workspace_id', authData.user.id),
    supabase.from('subscribers').select('*').eq('workspace_id', authData.user.id),
  ]);
  const firstError = workspaceError || profileError || analyticsError || submissionsError || auditError || reportsError || themesError || brandKitError || designThemesError || layoutsError || themeVersionsError || apiKeysError || webhooksError || subscribersError;
  if (firstError || !workspaceData) throw firstError;

  const cloudWorkspace = workspaceData as CloudWorkspaceRow;
  const workspace: Workspace = {
    ...(cloudWorkspace.settings as Workspace),
    id: cloudWorkspace.id,
    name: cloudWorkspace.name,
    plan: cloudWorkspace.plan,
    billingCycle: cloudWorkspace.billing_cycle,
    status: cloudWorkspace.subscription_status,
    currentPeriodStart: cloudWorkspace.current_period_start,
    currentPeriodEnd: cloudWorkspace.current_period_end,
    cancelAtPeriodEnd: cloudWorkspace.cancel_at_period_end,
    trialEndsAt: cloudWorkspace.trial_ends_at,
    providerCustomerId: cloudWorkspace.provider_customer_id,
    providerSubscriptionId: cloudWorkspace.provider_subscription_id,
  };
  const storedBrandKit = (brandKitRows?.[0] as { tokens_json?: BrandKit; locked_fields_json?: Record<string, boolean> } | undefined);
  if (storedBrandKit?.tokens_json) {
    workspace.brandKit = {
      ...storedBrandKit.tokens_json,
      lockedFields: storedBrandKit.locked_fields_json || storedBrandKit.tokens_json.lockedFields,
    };
  }
  const designThemes = new Map((designThemeRows || []).map(row => [row.id, row.definition_json as Record<string, unknown>]));
  const layouts = new Map((layoutRows || []).map(row => [row.id, row.definition_json as Record<string, unknown>]));
  const latestDesignVersionByProfile = new Map<string, { theme_id?: string | null; layout_id?: string | null; overrides_json?: { theme?: Record<string, unknown>; layout?: Record<string, unknown> } }>();
  for (const version of themeVersionRows || []) {
    if (!latestDesignVersionByProfile.has(version.profile_id)) latestDesignVersionByProfile.set(version.profile_id, version);
  }
  const profiles = (profileRows as CloudProfileRow[]).map(row => {
    // The normalized identity lives in the Supabase row. Older records may
    // not have copied id/username into the JSON data payload, so always merge
    // the row values back before the profile enters React state and autosave.
    const base = {
      ...row.data,
      id: row.id,
      username: row.username,
    } as Profile;
    const version = latestDesignVersionByProfile.get(row.id);
    const themeId = version?.theme_id || row.active_theme_id;
    const layoutId = version?.layout_id || row.active_layout_id;
    const themeOverride = version?.overrides_json?.theme;
    const layoutOverride = version?.overrides_json?.layout;
    const storedThemeBase = themeId ? designThemes.get(themeId) : undefined;
    const storedLayoutBase = layoutId ? layouts.get(layoutId) : undefined;
    if (!storedThemeBase && !storedLayoutBase && !themeOverride && !layoutOverride) {
      return row.active_starter_site_id ? { ...base, starterSiteId: row.active_starter_site_id } : base;
    }
    const profileThemeOverride = row.theme_overrides_json || {};
    const profileLayoutOverride = row.layout_overrides_json || {};
    const baseResolvedTheme = storedThemeBase || base.standardTheme || base.theme || {};
    const versionTheme = mergeSparseOverride(baseResolvedTheme, themeOverride || {});
    const mergedTheme = mergeSparseOverride(versionTheme, profileThemeOverride);
    const mergedLayout = mergeSparseOverride(storedLayoutBase || (baseResolvedTheme as { layout?: Record<string, unknown> }).layout || {}, mergeSparseOverride(layoutOverride || {}, profileLayoutOverride));
    const resolvedTheme = normalizeTheme({
      ...mergedTheme,
      tokens: {
        ...(mergedTheme as { tokens?: Record<string, unknown> }).tokens,
        colors: {
          ...((mergedTheme as { tokens?: { colors?: Record<string, unknown> } }).tokens?.colors || {}),
        },
      },
      layout: mergedLayout,
    });
    return { ...base, starterSiteId: row.active_starter_site_id || base.starterSiteId, standardTheme: resolvedTheme };
  });
  return {
    user: mapUser(authData.user, (profileRows || []).length > 0),
    workspace,
    profiles,
    analytics: (analyticsRows || []).map(row => ({
      id: row.id, profileId: row.profile_id, type: row.event_type, blockId: row.block_id,
      blockTitle: row.block_title, tabId: row.tab_id, snapshotVersion: row.snapshot_version,
      visitorHash: row.visitor_hash, timestamp: new Date(row.occurred_at).getTime(),
      referrer: row.referrer, country: row.country, device: row.device,
      campaign: row.campaign, isBot: row.is_bot, consentGranted: row.consent_granted,
    })),
    submissions: (submissionRows || []).map(row => ({
      id: row.id, profileId: row.profile_id, blockId: row.block_id, formTitle: row.form_title,
      formType: row.form_type, data: row.data, responderEmail: row.responder_email,
      responderName: row.responder_name, timestamp: new Date(row.submitted_at).getTime(),
      consentGiven: row.consent_given, consentText: row.consent_text, ipHash: row.ip_hash,
      status: row.status, subscriberCreated: row.subscriber_created,
    })),
    auditLogs: (auditRows || []).map(row => ({
      id: row.id, actor: row.actor, action: row.action, target: row.target,
      timestamp: new Date(row.occurred_at).getTime(), details: row.details,
    })),
    abuseReports: (reportRows || []).map(row => ({
      id: row.id, profileUsername: row.profile_username, reason: row.reason,
      description: row.description, reporterEmail: row.reporter_email,
      timestamp: new Date(row.occurred_at).getTime(), status: row.status,
    })),
    customThemes: (themeRows || []).map(row => row.data),
    apiKeys: (apiKeyRows || []).map(row => ({
      id: row.id, workspaceId: row.workspace_id, name: row.name, keyPrefix: row.key_prefix,
      scopes: row.scopes, allowedProfileIds: row.allowed_profile_ids, status: row.status,
      createdAt: row.created_at, createdBy: row.created_by, lastUsedAt: row.last_used_at,
      revokedAt: row.revoked_at, expiresAt: row.expires_at,
    })),
    webhookSubscriptions: (webhookRows || []).map(row => ({
      id: row.id, workspaceId: row.workspace_id, url: row.url, description: row.description,
      topics: row.topics, signingSecretPrefix: row.signing_secret_prefix, status: row.status,
      createdAt: row.created_at, createdBy: row.created_by, lastDeliveryAt: row.last_delivery_at,
      lastDeliveryStatus: row.last_delivery_status, consecutiveFailures: row.consecutive_failures,
    })),
    subscribers: (subscriberRows || []).map(row => ({
      id: row.id, profileId: row.profile_id, email: row.email, name: row.name,
      status: row.status, sourceBlockId: row.source_block_id, sourceFormTitle: row.source_form_title,
      subscribedAt: row.subscribed_at, consentGiven: row.consent_given,
      consentText: row.consent_text, lastEngagementAt: row.last_engagement_at,
    })),
  };
}

export async function saveCloudProfile(profile: Profile, _workspaceId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (!profile?.id?.trim() || !profile?.username?.trim()) {
    throw new Error('Cannot save cloud profile: profile id and username are required.');
  }
  // Legacy profiles use the flat theme shape. Migrate that shape before the
  // strict boundary check; current versioned themes are validated as-is.
  const rawTheme = profile.standardTheme || normalizeTheme(profile.theme);
  const schemaResult = validateThemeSchema(rawTheme);
  if (!schemaResult.isValid) {
    const details = schemaResult.errors.map(issue => `${issue.tokenKey}: ${issue.message}`).join('; ');
    throw new Error(`Theme validation failed. Draft was not saved. ${details}`);
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before saving a cloud draft.');
  const response = await fetch('/api/profile/draft', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ profile }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Cloud draft save failed.');
  }
}

/** Persist reusable design resources independently from the profile content snapshot. */
export async function saveCloudDesignSystem(profile: Profile, _workspaceId: string, brandKit?: BrandKit): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (!profile?.id?.trim() || !profile?.username?.trim()) {
    throw new Error('Cannot save cloud design system: profile id and username are required.');
  }
  const rawTheme = profile.standardTheme || normalizeTheme(profile.theme);
  const schemaResult = validateThemeSchema(rawTheme);
  if (!schemaResult.isValid) {
    const details = schemaResult.errors.map(issue => `${issue.tokenKey}: ${issue.message}`).join('; ');
    throw new Error(`Theme validation failed. Design system was not saved. ${details}`);
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before saving the design system.');
  const response = await fetch('/api/profile/draft', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ profile, brandKit }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Cloud design-system save failed.');
  }
}

export async function unpublishCloudProfile(profileId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before changing publication state.');
  const response = await fetch('/api/profile/unpublish', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ profileId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Unable to unpublish profile.');
  }
}

export async function rollbackCloudProfile(profileId: string, snapshotId: string, reason?: string): Promise<Profile> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase authentication is required for rollback.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before rolling back a profile.');
  const response = await fetch('/api/profile/rollback', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ profileId, snapshotId, reason }),
  });
  const body = await response.json() as { data?: { profile?: Profile }; error?: string | { message?: string } };
  if (!response.ok || !body.data?.profile) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Unable to roll back profile.');
  }
  return body.data.profile;
}

export async function publishCloudProfile(
  profileId: string,
  changeNote?: string,
  idempotencyKey?: string,
  versionName?: string,
  versionNotes?: string
): Promise<Profile> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase authentication is required for publishing.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before publishing.');
  const response = await fetch('/api/profile/publish', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${session.access_token}`,
      'content-type': 'application/json',
      ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
    },
    body: JSON.stringify({ profileId, changeNote, versionName, versionNotes }),
  });
  const body = await response.json() as { data?: { profile?: Profile }; error?: string | { message?: string } };
  if (!response.ok || !body.data?.profile) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Unable to publish profile.');
  }
  return body.data.profile;
}

export async function createCloudPreviewToken(profileId: string, ttlMinutes: number): Promise<{ token: string; expiresAt: string }> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase authentication is required for shared previews.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before creating a preview link.');
  const response = await fetch('/api/profile/preview-token', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ profileId, ttlMinutes }),
  });
  const body = await response.json() as { data?: { token?: string; expiresAt?: string }; error?: string | { message?: string } };
  if (!response.ok || !body.data?.token || !body.data.expiresAt) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Unable to create preview link.');
  }
  return { token: body.data.token, expiresAt: body.data.expiresAt };
}

export async function saveCloudWorkspace(workspace: Workspace): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const {
    id, name, plan, billingCycle, status, currentPeriodStart, currentPeriodEnd,
    cancelAtPeriodEnd, trialEndsAt, providerCustomerId, providerSubscriptionId,
    ...settings
  } = workspace;
  const { error } = await supabase.from('workspaces').upsert({
    id, name, plan, settings,
    billing_cycle: billingCycle,
    subscription_status: status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    cancel_at_period_end: cancelAtPeriodEnd ?? false,
    trial_ends_at: trialEndsAt,
    provider_customer_id: providerCustomerId,
    provider_subscription_id: providerSubscriptionId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  if (workspace.brandKit) {
    const { error: brandError } = await supabase.from('brand_kits').upsert({
      id: workspace.brandKit.id, workspace_id: workspace.id, tokens_json: workspace.brandKit,
      locked_fields_json: workspace.brandKit.lockedFields || {}, updated_at: new Date().toISOString()
    });
    if (brandError) throw brandError;
  }
}

export async function inviteCloudWorkspaceMember(input: { email: string; name: string; role: ProfileRole; assignedProfileIds: string[] }): Promise<ProfileMember> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase authentication is required for team invitations.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before inviting a team member.');
  const response = await fetch('/api/workspace/invite', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({})) as { data?: { member?: ProfileMember }; error?: string | { message?: string } };
  if (!response.ok || !body.data?.member) {
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Team invitation could not be sent.');
  }
  return body.data.member;
}

export async function saveCloudAnalytics(events: AnalyticsEvent[], workspaceId: string): Promise<void> {
  if (!supabase) return;
  if (!events.length) return;
  const { error } = await supabase.from('analytics_events').upsert(events.map(event => ({
    id: event.id, workspace_id: workspaceId, profile_id: event.profileId, event_type: event.type,
    block_id: event.blockId, block_title: event.blockTitle, tab_id: event.tabId,
    snapshot_version: event.snapshotVersion, visitor_hash: event.visitorHash,
    occurred_at: new Date(event.timestamp).toISOString(), referrer: event.referrer,
    country: event.country, device: event.device, campaign: event.campaign,
    is_bot: event.isBot ?? false, consent_granted: event.consentGranted ?? false,
  })));
  if (error) throw error;
}

export async function saveCloudSubmissions(submissions: FormSubmission[], workspaceId: string): Promise<void> {
  if (!supabase || !submissions.length) return;
  const { error } = await supabase.from('form_submissions').upsert(submissions.map(submission => ({
    id: submission.id, workspace_id: workspaceId, profile_id: submission.profileId,
    block_id: submission.blockId, form_title: submission.formTitle, form_type: submission.formType,
    data: submission.data, responder_email: submission.responderEmail, responder_name: submission.responderName,
    submitted_at: new Date(submission.timestamp).toISOString(), consent_given: submission.consentGiven,
    consent_text: submission.consentText, ip_hash: submission.ipHash, status: submission.status,
    subscriber_created: submission.subscriberCreated ?? false,
  })));
  if (error) throw error;
}

export async function saveCloudSubscribers(subscribers: Subscriber[], workspaceId: string): Promise<void> {
  if (!supabase || !subscribers.length) return;
  const { error } = await supabase.from('subscribers').upsert(subscribers.map(subscriber => ({
    id: subscriber.id, workspace_id: workspaceId, profile_id: subscriber.profileId,
    email: subscriber.email, name: subscriber.name, status: subscriber.status,
    source_block_id: subscriber.sourceBlockId, source_form_title: subscriber.sourceFormTitle,
    subscribed_at: subscriber.subscribedAt, consent_given: subscriber.consentGiven,
    consent_text: subscriber.consentText, last_engagement_at: subscriber.lastEngagementAt,
  })));
  if (error) throw error;
}

export async function saveCloudAuditLogs(logs: AuditLog[], workspaceId: string): Promise<void> {
  if (!supabase || !logs.length) return;
  const { error } = await supabase.from('audit_logs').upsert(logs.map(log => ({
    id: log.id, workspace_id: workspaceId, actor: log.actor, action: log.action,
    target: log.target, occurred_at: new Date(log.timestamp).toISOString(), details: log.details,
  })));
  if (error) throw error;
}

export async function saveCloudReports(reports: AbuseReport[], workspaceId: string): Promise<void> {
  if (!supabase || !reports.length) return;
  const { error } = await supabase.from('abuse_reports').upsert(reports.map(report => ({
    id: report.id, workspace_id: workspaceId, profile_username: report.profileUsername,
    reason: report.reason, description: report.description, reporter_email: report.reporterEmail,
    occurred_at: new Date(report.timestamp).toISOString(), status: report.status,
  })));
  if (error) throw error;
}

export async function saveCloudThemes(themes: StandardTheme[], workspaceId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !themes.length) return;
  void workspaceId;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before saving custom presets.');
  const response = await fetch('/api/design/custom-themes', {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ themes }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Custom presets could not be saved.');
  }
}

export async function deleteCloudTheme(themeId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !themeId) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in before deleting custom presets.');
  const response = await fetch('/api/design/custom-themes', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ id: themeId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string | { message?: string } };
    const message = typeof body.error === 'string' ? body.error : body.error?.message;
    throw new Error(message || 'Custom preset could not be deleted.');
  }
}

export async function saveCloudApiKeys(keys: ApiKey[], workspaceId: string): Promise<void> {
  if (!supabase || !keys.length) return;
  const { error } = await supabase.from('api_keys').upsert(keys.map(key => ({
    id: key.id, workspace_id: workspaceId, name: key.name, key_prefix: key.keyPrefix,
    scopes: key.scopes, allowed_profile_ids: key.allowedProfileIds, status: key.status,
    created_at: key.createdAt, created_by: key.createdBy, last_used_at: key.lastUsedAt,
    revoked_at: key.revokedAt, expires_at: key.expiresAt,
  })));
  if (error) throw error;
}

export async function saveCloudWebhooks(hooks: WebhookSubscription[], workspaceId: string): Promise<void> {
  if (!supabase || !hooks.length) return;
  const { error } = await supabase.from('webhook_subscriptions').upsert(hooks.map(hook => ({
    id: hook.id, workspace_id: workspaceId, url: hook.url, description: hook.description,
    topics: hook.topics, signing_secret_prefix: hook.signingSecretPrefix, status: hook.status,
    created_at: hook.createdAt, created_by: hook.createdBy, last_delivery_at: hook.lastDeliveryAt,
    last_delivery_status: hook.lastDeliveryStatus, consecutive_failures: hook.consecutiveFailures,
  })));
  if (error) throw error;
}

export async function deleteCloudRecord(table: 'profiles' | 'form_submissions' | 'api_keys' | 'webhook_subscriptions', id: string, workspaceId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('id', id).eq('workspace_id', workspaceId);
  if (error) throw error;
}
