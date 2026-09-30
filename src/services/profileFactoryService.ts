import type { Profile } from '../types';

interface CreateProfileInput {
  username: string;
  displayName: string;
  category: string;
  theme: Profile['theme'];
}

const createIdFactory = (prefix: string) => {
  let sequence = 0;
  return () => `${prefix}-${Date.now()}-${sequence++}`;
};

const profileId = createIdFactory('prof');
const socialId = createIdFactory('soc');
const tabId = createIdFactory('tab');
const blockId = createIdFactory('blk');

const cleanUsername = (username: string): string => username.toLowerCase().replace(/[^a-z0-9_]/g, '');

export function createProfile(input: CreateProfileInput): Profile {
  const username = cleanUsername(input.username) || `user_${Math.floor(Math.random() * 10000)}`;
  const displayName = input.displayName || username;
  const now = new Date().toISOString();
  const theme = input.theme;

  return {
    id: profileId(),
    username,
    displayName,
    bio: 'Welcome to my official links, portfolio, and projects.',
    avatarUrl: '',
    category: input.category || 'Creator',
    verified: false,
    status: 'draft',
    publishedVersion: 1,
    directLinkMode: false,
    socialPosition: 'top',
    socialLinks: [
      { id: socialId(), platform: 'instagram', url: 'https://instagram.com', active: true },
      { id: socialId(), platform: 'twitter', url: 'https://x.com', active: true },
      { id: socialId(), platform: 'email', url: 'mailto:contact@domain.com', active: true }
    ],
    theme,
    tabs: [{
      id: tabId(),
      title: 'Main',
      slug: 'main',
      position: 0,
      blocks: [
        {
          id: blockId(),
          type: 'link',
          title: 'My Official Website',
          position: 0,
          isHidden: false,
          clicks: 0,
          payload: { url: 'https://example.com', subtitle: 'Portfolio, client inquiries and store', highlightBadge: 'Official', animation: 'none' }
        },
        {
          id: blockId(),
          type: 'link',
          title: 'Featured Project / Recent Work',
          position: 1,
          isHidden: false,
          clicks: 0,
          payload: { url: 'https://example.com/project', subtitle: 'Check out our latest release', highlightBadge: 'New', animation: 'shimmer' }
        },
        {
          id: blockId(),
          type: 'form',
          title: 'Get In Touch',
          position: 2,
          isHidden: false,
          clicks: 0,
          payload: {
            formType: 'contact',
            description: 'Send a direct message or booking inquiry',
            fields: [
              { id: 'f-name', label: 'Your Name', type: 'text', required: true },
              { id: 'f-email', label: 'Email', type: 'email', required: true },
              { id: 'f-msg', label: 'Message', type: 'textarea', required: true }
            ],
            submitButtonText: 'Send Message',
            successMessage: 'Message received! Will respond shortly.'
          }
        }
      ]
    }],
    qrConfig: {
      fgColor: theme.textColor,
      bgColor: theme.bgColor,
      pattern: 'dots',
      showLogo: true,
      dynamicTargetUrl: `https://lynkflow.me/${username}`
    },
    seo: {
      title: `${displayName} | Official Link in Bio`,
      description: `Explore links, projects, and contact channels for ${displayName}.`,
      noIndex: false
    },
    createdAt: now,
    updatedAt: now,
    publishedAt: now
  };
}

export function duplicateProfile(source: Profile): Profile {
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();
  const newId = (oldId: string): string => {
    const existing = idMap.get(oldId);
    if (existing) return existing;
    const next = `${oldId.split('-')[0]}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    idMap.set(oldId, next);
    return next;
  };
  const copyUsername = `${source.username}_copy_${Date.now().toString().slice(-4)}`;
  const cloned = structuredClone(source);

  return {
    ...cloned,
    id: newId(source.id),
    username: copyUsername,
    displayName: `${source.displayName} (Copy)`,
    status: 'draft',
    publishedVersion: 1,
    publishedSnapshot: undefined,
    snapshotHistory: [],
    activePreviewTokens: [],
    scheduledPublish: null,
    customDomain: undefined,
    tabs: source.tabs.map(tab => ({
      ...tab,
      id: newId(tab.id),
      blocks: tab.blocks.map(block => ({ ...block, id: newId(block.id), clicks: 0 }))
    })),
    socialLinks: source.socialLinks.map(link => ({ ...link, id: newId(link.id) })),
    createdAt: now,
    updatedAt: now,
    publishedAt: undefined
  };
}
