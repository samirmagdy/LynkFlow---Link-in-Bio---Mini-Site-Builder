import { StandardTheme } from '../types/themeSchema';
import { calculateContrastRatio } from '../utils/themeEngine';

type GalleryThemeConfig = {
  slug: string;
  name: string;
  // Bug 5 fix: category is now required — all gallery themes must declare one
  // so normalizeTheme doesn't collapse them all to the 'Creator' default.
  category: string;
  page: string;
  panel: string;
  text: string;
  muted: string;
  accent: string;
  accentText?: string;
  border: string;
  display: string;
  body?: string;
  gradient?: string;
  alignment?: 'left' | 'center';
  headerStyle?: 'standard' | 'hero' | 'compact';
  link?: 'solid' | 'outline' | 'soft-card' | 'image-card' | 'glass';
  image?: 'rounded' | 'full-bleed' | 'polaroid';
  radius?: number;
  previewImage: string;
};

const readable = (preferred: string, background: string, minimum: number) => {
  const candidates = [preferred, '#000000', '#FFFFFF'];
  return candidates
    .filter((candidate, index, all) => all.indexOf(candidate) === index)
    .filter(candidate => calculateContrastRatio(candidate, background) >= minimum)
    .sort((a, b) => calculateContrastRatio(b, background) - calculateContrastRatio(a, background))[0]
    || (calculateContrastRatio('#000000', background) >= calculateContrastRatio('#FFFFFF', background) ? '#000000' : '#FFFFFF');
};

const galleryTheme = (config: GalleryThemeConfig): StandardTheme => {
  const radius = config.radius ?? 16;
  const link = config.link ?? 'soft-card';
  const accentText = readable(config.accentText || config.text, config.accent, 4.5);
  // Focus indicators are rendered around the full page surface as well as cards.
  // Derive them against the page background so the shared validator and renderer
  // enforce the same WCAG requirement.
  const focusRing = readable(config.accent, config.page, 3);
  const cardText = readable(config.text, config.panel, 4);
  const cardMuted = readable(config.muted, config.panel, 3);
  return {
    id: `liinks-${config.slug.replace(/[^a-z0-9]+/gi, '-')}`,
    schemaVersion: 1,
    name: config.name,
    // Bug 4 fix: gallery themes are first-party curated presets, not user imports.
    // 'imported' caused them to be excluded from the Presets tab filter and
    // produced incorrect analytics attribution.
    source: 'preset',
    presetId: `liinks.gallery.${config.slug}`,
    // Bug 5 fix: category propagated from config — no longer defaults to 'Creator'
    category: config.category,
    previewImage: config.previewImage,
    tokens: {
      colors: {
        pageBackground: config.page,
        panelBackground: config.panel,
        primaryText: readable(config.text, config.page, 4.5),
        secondaryText: readable(config.muted, config.page, 3),
        accent: config.accent,
        accentText,
        border: config.border,
        focusRing,
        cardBg: config.panel,
        cardTextColor: cardText,
        cardSubtitleColor: cardMuted,
        cardBorder: config.border
      },
      typography: {
        bodyFamily: `${config.body || 'Inter'}, ui-sans-serif, system-ui, sans-serif`,
        displayFamily: `${config.display}, ui-sans-serif, system-ui, sans-serif`,
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 700,
        bodyLineHeight: 1.5,
        headingLineHeight: 1.15
      },
      shape: { pageRadius: radius, cardRadius: radius, buttonRadius: radius > 20 ? 999 : radius, avatarRadius: 999 },
      spacing: { pageX: 18, pageY: 24, blockGap: 14, sectionGap: 24 },
      elevation: { card: '0 8px 24px rgba(15, 23, 42, 0.12)', button: '0 5px 15px rgba(15, 23, 42, 0.14)' },
      motion: { durationMs: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', enabled: true, hoverEffect: 'lift' }
    },
    background: {
      type: config.gradient ? 'gradient' : 'solid',
      gradientStops: config.gradient,
      fallbackColor: config.page,
      position: 'center',
      overlay: 0
    },
    header: { alignment: config.alignment || 'center', avatarSize: config.headerStyle === 'hero' ? 104 : 86, showShare: true, showSocials: true },
    layout: { maxWidth: config.alignment === 'left' ? '700px' : '680px', alignment: config.alignment || 'center', headerStyle: config.headerStyle || 'standard', blockWidth: 'full', navigationStyle: 'pills' },
    componentVariants: { link, image: config.image || 'rounded', socialIcons: link === 'solid' ? 'filled' : 'minimal', form: link === 'glass' ? 'glass' : 'card' },
    blockDefaults: {
      link: { variant: link === 'soft-card' ? 'soft' : link === 'glass' ? 'glass' : link === 'outline' ? 'outline' : 'filled', height: 58, thumbnail: 'none', shadow: 'sm' },
      text: { alignment: config.alignment || 'center' },
      media: { radius: config.image === 'full-bleed' ? 'none' : 'lg' },
      folder: { variant: link === 'glass' ? 'glass' : 'filled' }
    },
    responsive: { mobile: { maxWidth: 680, pageX: 16, pageY: 18, blockGap: 12 }, tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 }, desktop: { maxWidth: 860, pageX: 28, pageY: 30, blockGap: 16 } },
    accessibility: { reducedMotion: 'respectUserPreference', minimumContrast: 'AA' }
  };
};

const image = (file: string) => `https://d1ym67wyom4bkd.cloudfront.net/upload/${file}`;

// ---------------------------------------------------------------------------
// Bug 5 fix: every theme now declares a specific category. Previously absent,
// causing normalizeTheme to collapse all gallery themes to 'Creator'.
// ---------------------------------------------------------------------------
export const LIINKS_GALLERY_THEMES: StandardTheme[] = [
  galleryTheme({ slug: 'workithealth',           category: 'Health',       name: 'Workit Health',           page: '#073C38', panel: '#0E514A', text: '#F5F4E9', muted: '#D5E4D3', accent: '#C9F227', accentText: '#073C38', border: '#3A756B', display: 'Inter',              gradient: 'linear-gradient(160deg, #073C38 0%, #0D554C 100%)', link: 'solid',      headerStyle: 'hero',    previewImage: image('tl_Bz7_Zs.jpg') }),
  galleryTheme({ slug: 'ayrecoat',               category: 'Editorial',    name: 'Ayre Coat Editorial',     page: '#F0E9DD', panel: '#FFFDF8', text: '#302822', muted: '#6C6258', accent: '#302822', accentText: '#FFFFFF', border: '#D5C5B2', display: 'Fraunces',         body: 'Inter',   alignment: 'left', headerStyle: 'hero', link: 'soft-card', image: 'polaroid', previewImage: image('FdR40MlXz.jpg') }),
  galleryTheme({ slug: 'grace-co-bakery',        category: 'Bakery',       name: 'Grace & Co. Bakery',      page: '#F9E4E6', panel: '#FFF9F6', text: '#352326', muted: '#765B60', accent: '#E8A6AD', accentText: '#352326', border: '#E5BFC4', display: 'DM Sans',          gradient: 'linear-gradient(155deg, #F9E4E6 0%, #F4D4C7 100%)', link: 'soft-card', image: 'polaroid', previewImage: image('iJXRJXGzX.jpg') }),
  galleryTheme({ slug: 'xavier-ballesteros',     category: 'Finance',      name: 'Xavier Ballesteros',      page: '#003B39', panel: '#F7F5EA', text: '#F7F5EA', muted: '#D4E4D7', accent: '#F28B31', accentText: '#172B29', border: '#2A6660', display: 'Inter',            body: 'Inter',   headerStyle: 'hero', link: 'soft-card', previewImage: image('4MopQM-6F.jpg') }),
  galleryTheme({ slug: 'lashxarchitect',         category: 'Beauty',       name: 'Lash X Architect',        page: '#151515', panel: '#F4F0E8', text: '#FFFFFF', muted: '#D6D0C8', accent: '#E2D6C4', accentText: '#151515', border: '#514B46', display: 'Playfair Display', body: 'Inter',   headerStyle: 'hero', link: 'image-card', previewImage: image('3B01MxCXu.jpg') }),
  galleryTheme({ slug: 'kdandco',                category: 'Salon',        name: 'KD & Co. Salon',          page: '#080808', panel: '#FFFFFF', text: '#FFFFFF', muted: '#D0D0D0', accent: '#FFFFFF', accentText: '#080808', border: '#565656', display: 'Cormorant Garamond', body: 'Inter', link: 'outline', previewImage: image('dXxCNazPk.jpg') }),
  galleryTheme({ slug: 'mosaiccampuschurch',     category: 'Community',    name: 'Mosaic Campus Church',    page: '#FF5A31', panel: '#FFED26', text: '#FFFFFF', muted: '#FFF3CF', accent: '#FFED26', accentText: '#5B2116', border: '#FF9B56', display: 'Inter',             headerStyle: 'hero', link: 'solid', previewImage: image('dVBhe45xjRb3.jpg') }),
  galleryTheme({ slug: 'silv-rlv',               category: 'Lifestyle',    name: 'Silv RLV',                page: '#F4F0E7', panel: '#FFFFFF', text: '#3B3935', muted: '#777169', accent: '#D8CDC0', accentText: '#3B3935', border: '#DDD5CC', display: 'Inter',             link: 'soft-card', previewImage: image('mr3390E3nrxp.jpg') }),
  galleryTheme({ slug: 'haniverse',              category: 'Art',          name: 'Haniverse Handmade',      page: '#EEE5F8', panel: '#FFF9FF', text: '#342C3F', muted: '#706681', accent: '#BCA7DD', accentText: '#342C3F', border: '#D8C8ED', display: 'Space Mono',       body: 'Inter',   gradient: 'linear-gradient(145deg, #E9D9F7 0%, #FFF2FA 100%)', link: 'soft-card', previewImage: image('anmA4Lh1hp3a.jpg') }),
  galleryTheme({ slug: 'before-its-scone',       category: 'Bakery',       name: 'Before It\'s Scone',      page: '#A94C00', panel: '#FFF7E6', text: '#FFF7E6', muted: '#F0D4B4', accent: '#FFF7E6', accentText: '#A94C00', border: '#D27A26', display: 'Roboto Slab',      body: 'Inter',   headerStyle: 'hero', link: 'soft-card', previewImage: image('prXIC6lig1aG.jpg') }),
  galleryTheme({ slug: '3reofum',                category: 'Food',         name: '3reofum',                 page: '#331112', panel: '#B72D1F', text: '#FFF2DC', muted: '#E8B2A2', accent: '#F46A18', accentText: '#30120C', border: '#8E2821', display: 'Playfair Display', body: 'Inter',   gradient: 'linear-gradient(150deg, #301012 0%, #B9271C 100%)', link: 'solid', previewImage: image('yU_65AC5LWg-.jpg') }),
  galleryTheme({ slug: 'tanjeryne',              category: 'Creator',      name: 'Tanjeryne',               page: '#6C8798', panel: '#20303A', text: '#FFFFFF', muted: '#E0E7E8', accent: '#FFFFFF', accentText: '#20303A', border: '#AFC0C7', display: 'Playfair Display', body: 'Inter',   headerStyle: 'hero', link: 'glass', previewImage: image('i4unW1bry8RB.jpg') }),
  galleryTheme({ slug: 'arabella-stokes',        category: 'Lifestyle',    name: 'Arabella Stokes',         page: '#CDBAA5', panel: '#FFFDF9', text: '#3F3630', muted: '#796A5F', accent: '#8F705D', accentText: '#FFFFFF', border: '#BBA18D', display: 'Cormorant Garamond', body: 'Inter', link: 'soft-card', previewImage: image('5rg88eoJNiha.jpg') }),
  galleryTheme({ slug: 'katie-mccaskill',        category: 'Photography',  name: 'Katie McCaskill',         page: '#F5D6D2', panel: '#FFFFFF', text: '#343238', muted: '#6D6870', accent: '#343238', accentText: '#FFFFFF', border: '#D6B1B0', display: 'Inter',             link: 'image-card', previewImage: image('mQbWvUAMZBlh.jpg') }),
  galleryTheme({ slug: 'jorge-powell',           category: 'Professional', name: 'Jorge Powell',            page: '#FFFFFF', panel: '#F4F4F4', text: '#171717', muted: '#5B5B5B', accent: '#2C2C2C', accentText: '#FFFFFF', border: '#D4D4D4', display: 'Inter',             link: 'solid', previewImage: image('PAuvQPQffRZS.jpg') }),
  galleryTheme({ slug: 'eliot-ash',              category: 'Creator',      name: 'Eliot Ash',               page: '#F2EEFA', panel: '#FFFFFF', text: '#24212D', muted: '#6E687A', accent: '#6945D8', accentText: '#FFFFFF', border: '#D8CFF0', display: 'Inter',             headerStyle: 'hero', link: 'image-card', previewImage: image('7wq8oQouTIlc.jpg') }),
  galleryTheme({ slug: 'journeyious',            category: 'Travel',       name: 'Journeyious',             page: '#D9D2BF', panel: '#F4F0E7', text: '#26352D', muted: '#5B655A', accent: '#29483B', accentText: '#FFFFFF', border: '#B6B09D', display: 'Inter',             link: 'soft-card', previewImage: image('s1k0eq5czVZG.jpg') }),
  galleryTheme({ slug: 'chef-jungstedt',         category: 'Food',         name: 'Chef Jungstedt',          page: '#202020', panel: '#F7F3E9', text: '#FFFFFF', muted: '#D9D1C1', accent: '#D7A80E', accentText: '#1E1E1E', border: '#554E44', display: 'Inter',             headerStyle: 'hero', link: 'image-card', previewImage: image('mdC0yDYGyR2f.jpg') }),
  galleryTheme({ slug: 'canadian-jerky',         category: 'Food',         name: 'Canadian Jerky',          page: '#D9D9D9', panel: '#FFFFFF', text: '#161616', muted: '#555555', accent: '#4B8D27', accentText: '#FFFFFF', border: '#B7B7B7', display: 'Inter',             link: 'image-card', previewImage: image('oFkd-teQC95O.jpg') }),
  galleryTheme({ slug: 'bramdmedia',             category: 'Business',     name: 'Bramd Media',             page: '#DCE2D7', panel: '#FFFFFF', text: '#28312C', muted: '#657168', accent: '#3B5947', accentText: '#FFFFFF', border: '#B4C2B4', display: 'Inter',             link: 'soft-card', previewImage: image('UmBUVgOcBRqE.jpg') }),
  galleryTheme({ slug: 'atomic-coffee-roasters', category: 'Food',         name: 'Atomic Coffee Roasters',  page: '#FFFFFF', panel: '#F7F7F5', text: '#161616', muted: '#666666', accent: '#161616', accentText: '#FFFFFF', border: '#D8D8D8', display: 'Space Mono',       body: 'Inter',   link: 'image-card', previewImage: image('ohHLuvI2uW93.jpg') }),
  galleryTheme({ slug: 'srod-almenara',          category: 'Food',         name: 'Srod Almenara',           page: '#C0640D', panel: '#FFF0D8', text: '#FFF6E5', muted: '#F6D3A5', accent: '#FFF0D8', accentText: '#87400A', border: '#DF8E34', display: 'Playfair Display', body: 'Inter',   link: 'soft-card', previewImage: image('k9G686ig-Mse.jpg') }),
  galleryTheme({ slug: 'mikayla-nadia',          category: 'Lifestyle',    name: 'Mikayla Nadia',           page: '#F6F1E8', panel: '#FFFFFF', text: '#3B3531', muted: '#736A65', accent: '#A58BB0', accentText: '#FFFFFF', border: '#DDD3C8', display: 'Inter',             link: 'soft-card', previewImage: image('VWkHrJg1N6EM.jpg') }),
  galleryTheme({ slug: 'greenbuildermedia',      category: 'Business',     name: 'Green Builder Media',     page: '#08443B', panel: '#F4F7E9', text: '#FFFFFF', muted: '#D7E7D2', accent: '#D9F512', accentText: '#143529', border: '#397A65', display: 'Inter',            body: 'Inter',   headerStyle: 'hero', link: 'solid', previewImage: image('gNFUbd0HZnWr.jpg') })
];
