import { Profile, PublishedProfileSnapshot } from '../types';
import { normalizeTheme } from './themeEngine';

export function createPublishedSnapshot(profile: Profile, publisherEmail: string): PublishedProfileSnapshot {
  const version = profile.publishedVersion || 0;
  const now = new Date().toISOString();
  const standardTheme = normalizeTheme(profile.standardTheme || profile.theme);

  return {
    snapshotId: `snap-${profile.id}-v${version}-${Date.now()}`,
    version,
    profileId: profile.id,
    username: profile.username.toLowerCase(),
    displayName: profile.displayName || `@${profile.username}`,
    bio: profile.bio || '',
    nowStatus: profile.nowStatus?.text?.trim()
      ? {
          label: profile.nowStatus.label?.trim() || 'Now',
          text: profile.nowStatus.text.trim(),
          ...(profile.nowStatus.url?.trim() ? { url: profile.nowStatus.url.trim() } : {}),
          updatedAt: profile.nowStatus.updatedAt || now
        }
      : undefined,
    avatarUrl: profile.avatarUrl || '',
    category: profile.category || 'Creator',
    starterSiteId: profile.starterSiteId,
    verified: !!profile.verified,
    socialPosition: profile.socialPosition || 'top',
    socialLinks: (profile.socialLinks || []).filter(link => link.active && link.url),
    theme: profile.theme,
    standardTheme,
    tabs: JSON.parse(JSON.stringify(profile.tabs || [])),
    customDomain: profile.customDomain,
    qrConfig: profile.qrConfig,
    seo: {
      title: profile.seo?.title || `${profile.displayName || profile.username} | LynkFlow`,
      description: profile.seo?.description || profile.bio || 'Link in Bio and Mini-Site',
      noIndex: !!profile.seo?.noIndex,
      ogImage: profile.seo?.ogImage || profile.avatarUrl
    },
    publishedAt: now,
    publishedBy: publisherEmail
  };
}
