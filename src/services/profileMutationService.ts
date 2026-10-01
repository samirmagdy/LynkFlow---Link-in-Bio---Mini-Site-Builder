import type {
  Block,
  BlockType,
  ContactBlockPayload,
  DividerBlockPayload,
  EventBlockPayload,
  FaqBlockPayload,
  FileBlockPayload,
  FolderBlockPayload,
  FormBlockPayload,
  LinkBlockPayload,
  MediaBlockPayload,
  Profile,
  Tab,
  TestimonialBlockPayload,
  TextBlockPayload
} from '../types';

type IdFactory = () => string;

export interface ImportedLink {
  title: string;
  url: string;
}

export interface BulkLinkParseResult {
  links: ImportedLink[];
  invalidLines: number[];
  truncated: boolean;
}

const MAX_IMPORTED_LINKS = 50;

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const titleFromUrl = (value: string): string => {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '');
    return hostname.split('.')[0].replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  } catch {
    return 'New link';
  }
};

/** Parse one URL per line, or `Title | URL`, without accepting unsafe protocols. */
export function parseBulkLinks(raw: string): BulkLinkParseResult {
  const links: ImportedLink[] = [];
  const invalidLines: number[] = [];
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  lines.forEach((line, index) => {
    const separator = line.indexOf('|');
    const suppliedTitle = separator >= 0 ? line.slice(0, separator).trim() : '';
    const url = (separator >= 0 ? line.slice(separator + 1) : line).trim();
    if (!isHttpUrl(url)) {
      invalidLines.push(index + 1);
      return;
    }
    if (links.length < MAX_IMPORTED_LINKS) {
      links.push({ title: suppliedTitle || titleFromUrl(url), url });
    }
  });

  return { links, invalidLines, truncated: lines.length > MAX_IMPORTED_LINKS };
}

const createIdFactory = (prefix: string): IdFactory => {
  let sequence = 0;
  return () => `${prefix}-${Date.now()}-${sequence++}`;
};

const createBlockId = createIdFactory('blk');
const createTabId = createIdFactory('tab');

function createDefaultBlock(blockType: BlockType, customTitle?: string): Block {
  let title = customTitle || 'New Block';
  let payload: Block['payload'];

  switch (blockType) {
    case 'link':
      title = customTitle || 'My Link Title';
      payload = { url: 'https://', subtitle: 'Add brief context or call to action', highlightBadge: '', animation: 'none', openInNewTab: true } as LinkBlockPayload;
      break;
    case 'media':
      title = customTitle || 'Watch Featured Video';
      payload = { mediaType: 'video', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', caption: 'Video description or notes', aspectRatio: '16:9' } as MediaBlockPayload;
      break;
    case 'gallery':
      title = customTitle || 'Featured Gallery';
      payload = { columns: 2, items: [
        { id: 'gallery-1', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1200', title: 'Gallery image 1' },
        { id: 'gallery-2', image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=1200', title: 'Gallery image 2' }
      ] };
      break;
    case 'carousel':
      title = customTitle || 'Image Carousel';
      payload = { autoplay: false, items: [
        { id: 'carousel-1', image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=1200', title: 'Carousel image 1' },
        { id: 'carousel-2', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200', title: 'Carousel image 2' }
      ] };
      break;
    case 'product':
      title = customTitle || 'Featured Product';
      payload = { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200', description: 'Add a product description', price: '49', currency: 'USD', url: 'https://example.com', buttonLabel: 'Shop now', checkoutEnabled: false };
      break;
    case 'course':
      title = customTitle || 'Creator Course';
      payload = { image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200', description: 'A practical course your audience can start today.', price: '79', currency: 'USD', url: 'https://example.com/course', buttonLabel: 'View course', checkoutEnabled: false, level: 'all-levels', lessons: [
        { id: 'lesson-1', title: 'Welcome and getting started', duration: '8 min', preview: true },
        { id: 'lesson-2', title: 'Build your first system', duration: '24 min' },
        { id: 'lesson-3', title: 'Publish and grow', duration: '18 min' },
      ] };
      break;
    case 'tip':
      title = customTitle || 'Support my work';
      payload = { description: 'If you enjoy what I make, you can leave a small tip.', amount: '5', currency: 'USD', buttonLabel: 'Leave a tip', checkoutEnabled: true };
      break;
    case 'membership':
      title = customTitle || 'Join the community';
      payload = { description: 'Get member-only resources, updates, and community access.', price: '9', currency: 'USD', interval: 'month', buttonLabel: 'Become a member', checkoutEnabled: true, benefits: ['Member-only resources', 'Monthly updates', 'Direct community access'] };
      break;
    case 'event':
      title = customTitle || 'Upcoming Event';
      payload = { date: '2026-06-15', time: '7:00 PM', location: 'Add venue or online details', description: 'Share what visitors can expect.', url: 'https://example.com', buttonLabel: 'Get tickets' } as EventBlockPayload;
      break;
    case 'text':
      title = customTitle || 'Heading Text';
      payload = { textType: 'h2', content: 'Write an announcement or introductory message for your audience.', alignment: 'center' } as TextBlockPayload;
      break;
    case 'divider':
      title = 'Divider';
      payload = { style: 'hairline', height: 'md' } as DividerBlockPayload;
      break;
    case 'folder':
      title = customTitle || 'Resource Collection';
      payload = { description: 'Group of related links & resources', items: [
        { id: 'item-1', title: 'Resource #1', url: 'https://example.com' },
        { id: 'item-2', title: 'Resource #2', url: 'https://example.com' }
      ] } as FolderBlockPayload;
      break;
    case 'faq':
      title = customTitle || 'Frequently Asked Questions';
      payload = { items: [
        { id: 'f-1', question: 'How can I collaborate with you?', answer: 'Reach out via our inquiry form below!' },
        { id: 'f-2', question: 'What is your turnaround time?', answer: 'Typical project timelines run 2 to 4 weeks.' }
      ] } as FaqBlockPayload;
      break;
    case 'testimonial':
      title = customTitle || 'Client Feedback';
      payload = { quote: 'Working with this team transformed our brand metrics completely.', authorName: 'Sarah Jenkins', authorRole: 'Founder & CEO', company: 'Lumina Studio', rating: 5 } as TestimonialBlockPayload;
      break;
    case 'file':
      title = customTitle || 'Download Media Kit';
      payload = { fileName: 'Media_Kit_2026.pdf', fileSize: '2.8 MB', fileUrl: '#', description: 'Full portfolio, reach statistics, and booking pricing', downloadCount: 0 } as FileBlockPayload;
      break;
    case 'form':
      title = customTitle || 'Join Newsletter';
      payload = { formType: 'newsletter', description: 'Subscribe to receive exclusive drops and weekly thoughts.', fields: [{ id: 'f-email', label: 'Email', type: 'email', required: true, placeholder: 'name@email.com' }], submitButtonText: 'Subscribe', successMessage: 'Welcome to the circle! Check your email.', consentText: 'I agree to receive occasional updates.' } as FormBlockPayload;
      break;
    case 'emailSignup':
      title = customTitle || 'Join the Email List';
      payload = { formType: 'newsletter', description: 'Get updates directly in your inbox.', fields: [{ id: 'signup-email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' }], submitButtonText: 'Subscribe', successMessage: 'You are subscribed.', consentText: 'I agree to receive updates.', subscriberMode: true } as FormBlockPayload;
      break;
    case 'contact':
      title = customTitle || 'Direct Contact';
      payload = { contactType: 'email', value: 'hello@mybrand.com', presetSubject: 'Inquiry via LynkFlow' } as ContactBlockPayload;
      break;
  }

  return { id: createBlockId(), type: blockType, title, payload, position: 0, isHidden: false, clicks: 0 };
}

const updateTabBlocks = (profile: Profile, tabId: string, update: (tab: Tab) => Tab): Profile => ({
  ...profile,
  tabs: profile.tabs.map(tab => tab.id === tabId ? update(tab) : tab)
});

export function addBlock(profile: Profile, tabId: string, blockType: BlockType, customTitle?: string): Profile {
  const target = profile.tabs.find(tab => tab.id === tabId) || profile.tabs[0];
  if (!target) return profile;
  const block = { ...createDefaultBlock(blockType, customTitle), position: target.blocks.length };
  return updateTabBlocks(profile, target.id, tab => ({ ...tab, blocks: [...tab.blocks, block] }));
}

export function addLinkBlocks(profile: Profile, tabId: string, links: ImportedLink[]): Profile {
  const target = profile.tabs.find(tab => tab.id === tabId) || profile.tabs[0];
  if (!target || links.length === 0) return profile;
  const blocks = links.map(({ title, url }, index) => ({
    ...createDefaultBlock('link', title),
    payload: { url, subtitle: '', highlightBadge: '', animation: 'none', openInNewTab: true } as LinkBlockPayload,
    position: target.blocks.length + index
  }));
  return updateTabBlocks(profile, target.id, tab => ({ ...tab, blocks: [...tab.blocks, ...blocks] }));
}

export function updateBlock(profile: Profile, tabId: string, blockId: string, updates: Partial<Block>): Profile {
  return updateTabBlocks(profile, tabId, tab => ({ ...tab, blocks: tab.blocks.map(block => block.id === blockId ? { ...block, ...updates } : block) }));
}

export function removeBlock(profile: Profile, tabId: string, blockId: string): Profile {
  return updateTabBlocks(profile, tabId, tab => ({ ...tab, blocks: tab.blocks.filter(block => block.id !== blockId) }));
}

export function duplicateBlock(profile: Profile, tabId: string, blockId: string): Profile {
  return updateTabBlocks(profile, tabId, tab => {
    const index = tab.blocks.findIndex(block => block.id === blockId);
    if (index < 0) return tab;
    const source = tab.blocks[index];
    const clone: Block = { ...structuredClone(source), id: createBlockId(), title: `${source.title} (Copy)`, position: index + 1, clicks: 0 };
    const blocks = [...tab.blocks];
    blocks.splice(index + 1, 0, clone);
    return { ...tab, blocks: blocks.map((block, position) => ({ ...block, position })) };
  });
}

export function reorderBlocks(profile: Profile, tabId: string, fromIndex: number, toIndex: number): Profile {
  return updateTabBlocks(profile, tabId, tab => {
    if (fromIndex < 0 || fromIndex >= tab.blocks.length || toIndex < 0 || toIndex >= tab.blocks.length) return tab;
    const blocks = [...tab.blocks];
    const [moved] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, moved);
    return { ...tab, blocks: blocks.map((block, position) => ({ ...block, position })) };
  });
}

export function addTab(profile: Profile, title: string): Profile {
  const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const tab: Tab = { id: createTabId(), title, slug: slug || `tab-${profile.tabs.length + 1}`, position: profile.tabs.length, blocks: [] };
  return { ...profile, tabs: [...profile.tabs, tab] };
}

export function updateTab(profile: Profile, tabId: string, title: string): Profile {
  return { ...profile, tabs: profile.tabs.map(tab => tab.id === tabId ? { ...tab, title } : tab) };
}

export function removeTab(profile: Profile, tabId: string): Profile {
  if (profile.tabs.length <= 1) return profile;
  return { ...profile, tabs: profile.tabs.filter(tab => tab.id !== tabId) };
}
