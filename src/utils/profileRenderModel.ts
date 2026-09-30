import { migrateTheme } from './themeEngine';

export interface RenderableBlockLike {
  id?: string;
  isHidden?: boolean;
  position?: number;
  conversionRole?: string;
  schedule?: { enabled?: boolean; start?: string; end?: string } | null;
}

export interface RenderableTabLike<TBlock extends RenderableBlockLike = RenderableBlockLike> {
  id?: string;
  slug?: string;
  title?: string;
  blocks?: TBlock[];
}

interface RenderConversionLike {
  primaryBlockId?: string | null;
  secondaryBlockId?: string | null;
}

interface RenderLayoutLike {
  ctaPosition?: string;
}

export interface RenderThemeLike {
  conversion?: RenderConversionLike;
  layout?: RenderLayoutLike;
}

/**
 * The profile shape shared by the browser renderer and the edge renderer.
 * Keeping this intentionally structural means snapshots and API responses can
 * use it without importing the React Profile type.
 */
export interface ProfileRenderSource {
  id?: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  standardTheme?: any;
  theme?: any;
  socialLinks?: Array<{ id?: string; platform?: string; url?: string; active?: boolean }>;
  tabs?: Array<RenderableTabLike>;
}

export interface ProfileRenderModel<TProfile extends ProfileRenderSource = ProfileRenderSource> {
  profile: TProfile;
  theme: any;
  layout: Record<string, any>;
  language: 'en' | 'ar';
  direction: 'ltr' | 'rtl';
  socialLinks: NonNullable<TProfile['socialLinks']>;
  tabs: NonNullable<TProfile['tabs']>;
  currentTab: RenderableTabLike | undefined;
  blocks: RenderableBlockLike[];
}

export function selectInitialProfileTab<TTab extends RenderableTabLike>(tabs: TTab[], hash?: string | null): TTab | undefined {
  const normalizedHash = (hash || '').replace(/^#/, '').replace(/^tab=/, '');
  return (normalizedHash ? tabs.find(tab => tab.slug === normalizedHash || tab.id === normalizedHash) : undefined) || tabs[0];
}

/**
 * Resolve all state that affects profile composition in one place. React and
 * SSR still own their respective markup, but they consume the same validated
 * theme, locale, tab, social-link and block decisions.
 */
export function resolveProfileRenderModel<TProfile extends ProfileRenderSource>(
  profile: TProfile,
  options: { tabIdOrHash?: string | null; now?: number } = {}
): ProfileRenderModel<TProfile> {
  const theme = migrateTheme(profile.standardTheme || profile.theme || {});
  const tabs = (Array.isArray(profile.tabs) ? profile.tabs : []) as NonNullable<TProfile['tabs']>;
  const currentTab = selectInitialProfileTab(tabs, options.tabIdOrHash);
  const layout = theme.layout || {};
  const socialLinks = (Array.isArray(profile.socialLinks) ? profile.socialLinks : []).filter(link => link?.active !== false && Boolean(link?.url)) as NonNullable<TProfile['socialLinks']>;
  return {
    profile,
    theme,
    layout,
    language: theme.language === 'ar' ? 'ar' : 'en',
    direction: theme.direction === 'rtl' ? 'rtl' : 'ltr',
    socialLinks,
    tabs,
    currentTab,
    blocks: resolveRenderableBlocks(currentTab, theme, options.now),
  };
}


export function resolveRenderableBlocks<TBlock extends RenderableBlockLike>(tab: RenderableTabLike<TBlock> | undefined, theme: RenderThemeLike, now = Date.now()): TBlock[] {
  const visible = (tab?.blocks || []).filter(block => {
    if (block.isHidden) return false;
    if (block.schedule?.enabled) {
      if (block.schedule.start && new Date(block.schedule.start).getTime() > now) return false;
      if (block.schedule.end && new Date(block.schedule.end).getTime() < now) return false;
    }
    return true;
  });
  const score = (block: TBlock) => {
    if (theme.conversion?.primaryBlockId === block.id) return 0;
    if (theme.conversion?.secondaryBlockId === block.id) return 1;
    if (theme.layout?.ctaPosition === 'first' && block.conversionRole === 'primary') return 0;
    if (block.conversionRole === 'secondary') return 1;
    if (block.conversionRole === 'supporting') return 3;
    if (block.conversionRole === 'informational') return 4;
    return 2;
  };
  return [...visible].sort((left, right) => score(left) - score(right) || Number(left.position || 0) - Number(right.position || 0));
}
