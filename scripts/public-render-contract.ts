import { publicProfileStyles, renderPublicProfileBody } from '../src/worker';

const snapshot = {
  username: 'contract-test', displayName: 'Contract Test', bio: 'English and العربية content', avatarUrl: 'https://images.example/avatar.webp', verified: true, followerCount: 12500, socialLinks: [{ id: 'social-1', platform: 'instagram', url: 'https://instagram.com/contract', active: true }],
  standardTheme: { language: 'ar', direction: 'rtl', profile: { showAvatar: true } },
  tabs: [{ blocks: [
    { type: 'link', title: 'Link', payload: { url: 'https://example.com' } },
    { type: 'text', title: 'Intro', payload: { textType: 'p', content: 'Text' } },
    { type: 'media', title: 'Image', payload: { mediaType: 'image', url: 'https://images.example/image.webp' } },
    { type: 'media', title: 'Video', payload: { mediaType: 'video', url: 'https://cdn.example/video.mp4', captionsUrl: 'https://cdn.example/video.vtt' } },
    { type: 'gallery', title: 'Gallery', payload: { items: [{ image: 'https://images.example/gallery.webp' }] } },
    { type: 'carousel', title: 'Carousel', payload: { items: [{ image: 'https://images.example/carousel.webp' }] } },
    { type: 'event', title: 'Launch event', payload: { date: '2026-06-15', time: '7:00 PM', location: 'Online', description: 'Join the launch.', url: 'https://example.com/tickets', buttonLabel: 'Get tickets' } },
    { type: 'product', title: 'Product', payload: { url: 'https://example.com/product', price: '10' } },
    { type: 'tip', title: 'Support', payload: { amount: '5', currency: 'USD', checkoutEnabled: true } },
    { type: 'file', title: 'File', payload: { fileUrl: 'https://cdn.example/file.pdf', fileName: 'file.pdf' } },
    { type: 'contact', title: 'Contact', payload: { contactType: 'email', value: 'hello@example.com' } },
    { type: 'folder', title: 'Folder', payload: { items: [{ title: 'Nested link', url: 'https://example.com/nested' }] } },
    { type: 'divider', title: 'Divider', payload: { style: 'dashed', height: 'md' } },
    { type: 'testimonial', title: 'Testimonial', payload: { quote: 'Great work', authorName: 'Client', rating: 5 } },
    { type: 'faq', title: 'FAQ', payload: { items: [{ question: 'Q?', answer: 'A.' }] } },
    { type: 'form', title: 'Form', payload: { description: 'Contact us' } },
  ] }]
};

snapshot.tabs[0].blocks = snapshot.tabs[0].blocks.map((block, index) => ({ ...block, id: `contract-${index}` }));

const html = renderPublicProfileBody(snapshot, 'https://lynkflow.me/@contract-test');
const tabHtml = renderPublicProfileBody({
  ...snapshot,
  standardTheme: { ...snapshot.standardTheme, layout: { navigationStyle: 'pills' }, conversion: { primaryBlockId: 'primary' } },
  tabs: [
    { id: 'first', slug: 'first', title: 'First', blocks: [{ id: 'secondary', type: 'link', title: 'Secondary', position: 0, payload: { url: 'https://example.com/secondary' } }, { id: 'primary', type: 'link', title: 'Primary', position: 1, payload: { url: 'https://example.com/primary' } }] },
    { id: 'second', slug: 'second', title: 'Second', blocks: [{ id: 'hidden-tab', type: 'text', title: 'Must not render', position: 0, payload: { content: 'Hidden from initial tab' } }] }
  ]
}, 'https://lynkflow.me/@contract-test');

const footerHiddenHtml = renderPublicProfileBody({
  ...snapshot,
  standardTheme: { ...(snapshot.standardTheme as any), layout: { ...((snapshot.standardTheme as any).layout || {}), showFooter: false } },
}, 'https://lynkflow.me/@contract-test');
if (footerHiddenHtml.includes('on LynkFlow')) throw new Error('Public renderer must honor layout.showFooter=false.');

const footerSocialHtml = renderPublicProfileBody({
  ...snapshot,
  standardTheme: { ...(snapshot.standardTheme as any), layout: { ...((snapshot.standardTheme as any).layout || {}), socialIconPlacement: 'footer' } },
}, 'https://lynkflow.me/@contract-test');
const socialHeaderIndex = footerSocialHtml.indexOf('class="profile-header"');
const socialFooterIndex = footerSocialHtml.indexOf('class="profile-social"');
if (socialFooterIndex < socialHeaderIndex) throw new Error('Public renderer social placement contract could not locate footer socials.');
const unsafeHtml = renderPublicProfileBody({
  ...snapshot,
  socialLinks: [{ id: 'unsafe-social', platform: 'x', url: 'javascript:alert(1)', active: true }],
  tabs: [{ blocks: [
    { id: 'unsafe-link', type: 'link', title: 'Unsafe', payload: { url: 'javascript:alert(1)' } },
    { id: 'unsafe-image', type: 'media', title: 'Unsafe image', payload: { mediaType: 'image', url: 'javascript:alert(1)' } }
  ] }]
}, 'https://lynkflow.me/@contract-test');
if (/href="javascript:|src="javascript:/.test(unsafeHtml)) throw new Error('Public renderer must reject unsafe persisted URLs.');
const backgroundStyles = publicProfileStyles({ standardTheme: { background: { type: 'image', assetUrl: 'https://images.unsplash.com/contract-background.jpg', focalPoint: { x: 30, y: 70 } }, responsive: { mobile: { maxWidth: 680, pageX: 12, pageY: 16, blockGap: 10, avatarSize: 72, headingScale: .9, imageHeight: 240, textAlign: 'left', blockVisibility: 'all' } } } });
const normalizedSafetyStyles = publicProfileStyles({ standardTheme: { background: { type: 'image', assetUrl: 'https://images.unsplash.com/contract-background.jpg', position: 'center; color:red', focalPoint: { x: 'bad', y: 'bad' } }, tokens: { spacing: { pageX: 'bad' } } } });
const requiredMarkers = ['data-block-id="contract-0"', 'data-block-id="contract-1"', 'data-block-id="contract-2"', 'data-block-id="contract-3"', 'data-block-id="contract-4"', 'data-block-id="contract-5"', 'data-block-id="contract-6"', 'data-block-id="contract-7"', 'data-block-id="contract-8"', 'data-block-id="contract-9"', 'data-block-id="contract-10"', 'data-block-id="contract-11"', 'data-block-id="contract-12"', 'data-block-id="contract-13"', 'data-block-id="contract-14"', 'data-block-id="contract-15"', 'Get tickets', 'Leave a tip', 'Save contact', 'Verified', 'followers', '<video', '<track', 'dir="rtl"'];
const failures = requiredMarkers.filter(marker => !html.includes(marker));
if ((html.match(/data-block-style="/g) || []).length !== snapshot.tabs[0].blocks.length) failures.push('every rendered block must carry a resolved premium style');
if (!tabHtml.includes('role="tablist"') || !tabHtml.includes('aria-selected="true"') || tabHtml.indexOf('Primary') > tabHtml.indexOf('Secondary') || tabHtml.includes('Must not render')) failures.push('server tab navigation, active-tab isolation or CTA ordering');
if (!backgroundStyles.includes('contract-background.jpg') || !backgroundStyles.includes('background-position:30% 70%')) failures.push('server background image/focal point');
if (!backgroundStyles.includes('--theme-avatar-size:72px') || !backgroundStyles.includes('--theme-heading-scale:0.9') || !backgroundStyles.includes('@media (min-width:375px) and (max-width:639px)')) failures.push('server responsive theme tokens');
if (normalizedSafetyStyles.includes('color:red') || normalizedSafetyStyles.includes('NaN')) failures.push('server styles must use normalized safe values');
console.log(`Public renderer contract: ${requiredMarkers.length} block/layout markers checked`);
if (failures.length) {
  failures.forEach(marker => console.error(`[public-render] missing ${marker}`));
  process.exit(1);
}
console.log('Public renderer contract: server-rendered block coverage passed');
