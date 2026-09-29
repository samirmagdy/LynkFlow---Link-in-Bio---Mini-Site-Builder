import { publicProfileStyles, renderPublicProfileBody } from '../src/worker';

const snapshot = {
  username: 'contract-test', displayName: 'Contract Test', bio: 'English and العربية content', avatarUrl: 'https://images.example/avatar.webp', socialLinks: [],
  standardTheme: { language: 'ar', direction: 'rtl', profile: { showAvatar: true } },
  tabs: [{ blocks: [
    { type: 'link', title: 'Link', payload: { url: 'https://example.com' } },
    { type: 'text', title: 'Intro', payload: { textType: 'p', content: 'Text' } },
    { type: 'media', title: 'Image', payload: { mediaType: 'image', url: 'https://images.example/image.webp' } },
    { type: 'media', title: 'Video', payload: { mediaType: 'video', url: 'https://cdn.example/video.mp4', captionsUrl: 'https://cdn.example/video.vtt' } },
    { type: 'gallery', title: 'Gallery', payload: { items: [{ image: 'https://images.example/gallery.webp' }] } },
    { type: 'carousel', title: 'Carousel', payload: { items: [{ image: 'https://images.example/carousel.webp' }] } },
    { type: 'product', title: 'Product', payload: { url: 'https://example.com/product', price: '10' } },
    { type: 'file', title: 'File', payload: { fileUrl: 'https://cdn.example/file.pdf', fileName: 'file.pdf' } },
    { type: 'contact', title: 'Contact', payload: { contactType: 'email', value: 'hello@example.com' } },
    { type: 'folder', title: 'Folder', payload: { items: [{ title: 'Nested link', url: 'https://example.com/nested' }] } },
    { type: 'divider', title: 'Divider', payload: { style: 'dashed', height: 'md' } },
    { type: 'testimonial', title: 'Testimonial', payload: { quote: 'Great work', authorName: 'Client', rating: 5 } },
    { type: 'faq', title: 'FAQ', payload: { items: [{ question: 'Q?', answer: 'A.' }] } },
    { type: 'form', title: 'Form', payload: { description: 'Contact us' } },
  ] }]
};

const html = renderPublicProfileBody(snapshot, 'https://lynkflow.me/@contract-test');
const backgroundStyles = publicProfileStyles({ standardTheme: { background: { type: 'image', assetUrl: 'https://images.unsplash.com/contract-background.jpg', focalPoint: { x: 30, y: 70 } } } });
const requiredMarkers = ['profile-link', 'profile-gallery', 'profile-product', 'profile-form', 'profile-folder', 'profile-divider', 'profile-testimonial', '<video', '<track', 'dir="rtl"'];
const failures = requiredMarkers.filter(marker => !html.includes(marker));
if (!backgroundStyles.includes('contract-background.jpg') || !backgroundStyles.includes('background-position:30% 70%')) failures.push('server background image/focal point');
console.log(`Public renderer contract: ${requiredMarkers.length} block/layout markers checked`);
if (failures.length) {
  failures.forEach(marker => console.error(`[public-render] missing ${marker}`));
  process.exit(1);
}
console.log('Public renderer contract: server-rendered block coverage passed');
