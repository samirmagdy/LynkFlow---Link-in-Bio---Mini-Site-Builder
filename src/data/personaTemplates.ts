import { BlockType, SocialLink } from '../types';
import { StandardTheme } from '../types/themeSchema';
import { LIINKS_GALLERY_THEMES } from './liinksGalleryThemes';

type PersonaBlockTemplate = {
  type: BlockType;
  title: string;
  payload: Record<string, unknown>;
};

export type PersonaTemplate = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  category: string;
  bio: string;
  theme: StandardTheme;
  fields: string[];
  socialLinks: Array<Pick<SocialLink, 'platform'>>;
  blocks: PersonaBlockTemplate[];
};

/**
 * Keeps starter-site composition explicit when a content starter is applied.
 * The starter catalog owns content; the theme remains an appearance resource.
 */
export const composeStarterSiteTheme = (template: PersonaTemplate): StandardTheme => ({
  ...template.theme,
  presetComposition: {
    ...(template.theme.presetComposition || {}),
    themeId: template.theme.id,
    layoutId: template.theme.layout?.templateId,
    starterSiteId: template.id,
    includesStarterContent: true,
    changesContent: true,
    changesLayout: true,
  },
});

const theme = (slug: string, defaultBackgroundImage?: string) => {
  const found = LIINKS_GALLERY_THEMES.find(item => item.id === `liinks-${slug}`);
  if (!found) throw new Error(`Missing persona theme: ${slug}`);
  if (!defaultBackgroundImage) return found;
  return {
    ...found,
    background: {
      ...found.background,
      type: 'image' as const,
      assetUrl: defaultBackgroundImage,
      // Keep the photo visible while adding enough scrim for the theme's
      // existing foreground tokens to remain readable over varied imagery.
      overlay: found.tokens.colors.primaryText === '#352326' ? 0.3 : 0.42,
      overlayColor: found.tokens.colors.primaryText === '#352326' ? '#FFFFFF' : '#000000',
      gradientStops: `linear-gradient(135deg, ${found.tokens.colors.accent} 0%, transparent 78%)`
    }
  };
};

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: 'creator-portfolio',
    name: 'Creator & Portfolio',
    eyebrow: 'Showcase your work',
    description: 'A visual-first page for photographers, designers, filmmakers, and independent creators.',
    category: 'Creator',
    bio: 'Independent creator sharing selected work, projects, and ways to collaborate.',
    theme: theme('lashxarchitect', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1800&q=85'),
    fields: ['Display name', 'Bio', 'Avatar', 'Social links', 'Featured media', 'Portfolio links', 'Contact form', 'SEO title'],
    socialLinks: [{ platform: 'instagram' }, { platform: 'youtube' }, { platform: 'tiktok' }, { platform: 'email' }],
    blocks: [
      { type: 'media', title: 'Featured reel or project', payload: { mediaType: 'video', url: '', caption: 'Add your strongest project here.', aspectRatio: '16:9' } },
      { type: 'link', title: 'View my portfolio', payload: { url: '', subtitle: 'Selected work, case studies, and collaborations', highlightBadge: 'Featured', animation: 'none', openInNewTab: true } },
      { type: 'gallery', title: 'Selected work', payload: { items: [], columns: 2 } },
      { type: 'form', title: 'Work with me', payload: { formType: 'contact', description: 'Tell me about your project and timeline.', fields: [{ id: 'name', label: 'Your name', type: 'text', required: true }, { id: 'email', label: 'Email', type: 'email', required: true }, { id: 'message', label: 'Project details', type: 'textarea', required: true }], submitButtonText: 'Send inquiry', successMessage: 'Thanks — your inquiry has been received.' } }
    ]
  },
  {
    id: 'coach-consultant',
    name: 'Coach & Consultant',
    eyebrow: 'Turn attention into conversations',
    description: 'A trust-led page for coaches, advisors, educators, and service businesses.',
    category: 'Coach & Consultant',
    bio: 'Helping people and teams make clearer decisions, build momentum, and do their best work.',
    theme: theme('xavier-ballesteros', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1800&q=85'),
    fields: ['Display name', 'Bio', 'Category', 'Avatar', 'Social links', 'Primary offer', 'Testimonials', 'Lead form', 'SEO description'],
    socialLinks: [{ platform: 'linkedin' }, { platform: 'instagram' }, { platform: 'youtube' }, { platform: 'email' }],
    blocks: [
      { type: 'text', title: 'What I help with', payload: { textType: 'h2', content: 'Clarity, strategy, and practical next steps.', alignment: 'left' } },
      { type: 'link', title: 'Book a discovery call', payload: { url: '', subtitle: 'A focused 30-minute conversation to see if we fit', highlightBadge: 'Start here', animation: 'none', openInNewTab: true } },
      { type: 'testimonial', title: 'Client result', payload: { quote: 'Add a short, specific result from a client or partner.', authorName: 'Client name', authorRole: 'Role or company' } },
      { type: 'form', title: 'Tell me what you need', payload: { formType: 'lead', description: 'Share a little context and I will follow up.', fields: [{ id: 'name', label: 'Your name', type: 'text', required: true }, { id: 'email', label: 'Work email', type: 'email', required: true }, { id: 'goal', label: 'What would you like help with?', type: 'textarea', required: true }], submitButtonText: 'Start the conversation', successMessage: 'Thanks — I will be in touch soon.' } }
    ]
  },
  {
    id: 'small-business-shop',
    name: 'Small Business & Shop',
    eyebrow: 'Make it easy to buy',
    description: 'A product-led page for shops, makers, food businesses, and local services.',
    category: 'Small Business',
    bio: 'Thoughtfully made products, useful services, and updates from our small business.',
    theme: theme('grace-co-bakery', 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1800&q=85'),
    fields: ['Business name', 'Short description', 'Location', 'Avatar or logo', 'Social links', 'Featured product', 'Store link', 'FAQ', 'Contact details'],
    socialLinks: [{ platform: 'instagram' }, { platform: 'linkedin' }, { platform: 'tiktok' }, { platform: 'email' }],
    blocks: [
      { type: 'product', title: 'Featured product', payload: { description: 'Add your best-selling product or current offer.', price: '', currency: 'USD', url: '', buttonLabel: 'Shop now' } },
      { type: 'link', title: 'Shop everything', payload: { url: '', subtitle: 'Browse the full collection', highlightBadge: 'Shop', animation: 'none', openInNewTab: true } },
      { type: 'faq', title: 'Before you order', payload: { items: [{ id: 'shipping', question: 'How long does delivery take?', answer: 'Add your shipping timeline here.' }, { id: 'returns', question: 'What is your returns policy?', answer: 'Add your returns policy here.' }] } },
      { type: 'contact', title: 'Contact the shop', payload: { contactType: 'email', value: '', presetSubject: 'Customer question' } }
    ]
  },
  {
    id: 'music-artist',
    name: 'Music Artist',
    eyebrow: 'Put the next release first',
    description: 'A release-focused page for artists, DJs, bands, and producers.',
    category: 'Music & Entertainment',
    bio: 'Artist, producer, and storyteller. New music, live dates, and everything in between.',
    theme: theme('srod-almenara', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1800&q=85'),
    fields: ['Artist name', 'Bio', 'Avatar or cover art', 'Social links', 'Featured release', 'Streaming links', 'Tour dates', 'Email signup'],
    socialLinks: [{ platform: 'instagram' }, { platform: 'tiktok' }, { platform: 'youtube' }, { platform: 'spotify' }],
    blocks: [
      { type: 'media', title: 'Listen to the latest release', payload: { mediaType: 'audio', url: '', caption: 'Add your newest single, album, or playlist.', aspectRatio: '1:1' } },
      { type: 'link', title: 'Stream everywhere', payload: { url: '', subtitle: 'Spotify, Apple Music, YouTube, and more', highlightBadge: 'New release', animation: 'pulseGlow', openInNewTab: true } },
      { type: 'link', title: 'Upcoming shows', payload: { url: '', subtitle: 'Tickets, dates, and venues', animation: 'none', openInNewTab: true } },
      { type: 'emailSignup', title: 'Join the mailing list', payload: { formType: 'newsletter', description: 'Get new music and show announcements first.', fields: [{ id: 'email', label: 'Email address', type: 'email', required: true }], submitButtonText: 'Join the list', successMessage: 'You are on the list.' } }
    ]
  },
  {
    id: 'beauty-service',
    name: 'Beauty & Service Professional',
    eyebrow: 'Show the result, then book',
    description: 'A polished page for salons, makeup artists, stylists, wellness, and appointment-based services.',
    category: 'Beauty & Wellness',
    bio: 'Personal, thoughtful service with a focus on confidence, care, and beautiful results.',
    theme: theme('kdandco', 'https://images.unsplash.com/photo-1522337360788-8b13def7a37e?auto=format&fit=crop&w=1800&q=85'),
    fields: ['Business name', 'Service description', 'Profile image', 'Social links', 'Service menu', 'Results gallery', 'Booking link', 'Contact form'],
    socialLinks: [{ platform: 'instagram' }, { platform: 'linkedin' }, { platform: 'tiktok' }, { platform: 'email' }],
    blocks: [
      { type: 'link', title: 'Book an appointment', payload: { url: '', subtitle: 'Choose a service and a time that works for you', highlightBadge: 'Book now', animation: 'none', openInNewTab: true } },
      { type: 'gallery', title: 'Recent work', payload: { items: [], columns: 2 } },
      { type: 'folder', title: 'Services & pricing', payload: { description: 'Add your core services and starting prices.', items: [{ id: 'service-1', title: 'Signature service', url: '', subtitle: 'Add starting price' }], defaultOpen: true } },
      { type: 'form', title: 'Ask a question', payload: { formType: 'contact', description: 'Not sure what to book? Send a message.', fields: [{ id: 'name', label: 'Your name', type: 'text', required: true }, { id: 'email', label: 'Email', type: 'email', required: true }, { id: 'message', label: 'How can we help?', type: 'textarea', required: true }], submitButtonText: 'Send message', successMessage: 'Thanks — we will reply soon.' } }
    ]
  },
  {
    id: 'nonprofit-community',
    name: 'Nonprofit & Community',
    eyebrow: 'Make participation simple',
    description: 'A clear, action-oriented page for nonprofits, communities, churches, and public-interest projects.',
    category: 'Community & Nonprofit',
    bio: 'Building a more connected community through practical action, shared care, and open participation.',
    theme: theme('greenbuildermedia', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=85'),
    fields: ['Organization name', 'Mission statement', 'Logo', 'Social links', 'Primary action', 'Program links', 'FAQ', 'Volunteer or contact form', 'SEO title'],
    socialLinks: [{ platform: 'instagram' }, { platform: 'twitter' }, { platform: 'linkedin' }, { platform: 'email' }],
    blocks: [
      { type: 'text', title: 'Our mission', payload: { textType: 'h2', content: 'Small actions create a stronger community.', alignment: 'center' } },
      { type: 'link', title: 'Support the work', payload: { url: '', subtitle: 'Donate, volunteer, or share our mission', highlightBadge: 'Take action', animation: 'none', openInNewTab: true } },
      { type: 'link', title: 'Current programs', payload: { url: '', subtitle: 'See what is happening in your community', animation: 'none', openInNewTab: true } },
      { type: 'form', title: 'Stay connected', payload: { formType: 'newsletter', description: 'Receive updates, events, and ways to help.', fields: [{ id: 'name', label: 'Your name', type: 'text', required: false }, { id: 'email', label: 'Email address', type: 'email', required: true }], submitButtonText: 'Keep me updated', successMessage: 'Thanks for joining us.' } }
    ]
  }
];
