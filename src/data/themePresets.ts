import { StandardTheme } from '../types/themeSchema';
import { IMPORTED_THEME_PRESETS } from './importedThemePresets';
import { LIINKS_GALLERY_THEMES } from './liinksGalleryThemes';
import { calculateContrastRatio } from '../utils/themeEngine';

const concept = (config: {
  id: string; name: string; presetId: string; page: string; panel: string; text: string; muted: string; accent: string; accentText: string; border: string;
  display: string; background?: string; alignment?: 'left' | 'center'; headerStyle?: 'standard' | 'hero' | 'compact'; link: 'solid' | 'outline' | 'soft-card' | 'image-card' | 'glass'; image: 'rounded' | 'full-bleed' | 'polaroid';
  maxWidth?: string; blockWidth?: 'full' | 'narrow' | 'mixed'; cardRadius?: number; buttonRadius?: number; avatarSize?: number; thumbnail?: 'none' | 'left' | 'avatar';
}): StandardTheme => ({
  schemaVersion: 1, id: config.id, name: config.name, source: 'preset', presetId: config.presetId,
  tokens: {
    colors: (() => {
      const readableTone = (preferred: string, background: string, minimum: number) => {
        const candidates = [preferred, '#000000', '#FFFFFF'];
        return candidates
          .filter((candidate, index, all) => all.indexOf(candidate) === index)
          .filter(candidate => calculateContrastRatio(candidate, background) >= minimum)
          .sort((a, b) => calculateContrastRatio(b, background) - calculateContrastRatio(a, background))[0]
          || (calculateContrastRatio('#000000', background) >= calculateContrastRatio('#FFFFFF', background) ? '#000000' : '#FFFFFF');
      };
      return {
        pageBackground: config.page,
        panelBackground: config.panel,
        primaryText: config.text,
        secondaryText: config.muted,
        accent: config.accent,
        accentText: readableTone(config.accentText, config.accent, 4.5),
        border: config.border,
        focusRing: readableTone(config.accent, config.page, 3),
        cardBg: config.panel,
        cardTextColor: readableTone(config.text, config.panel, 4),
        cardSubtitleColor: readableTone(config.muted, config.panel, 3),
        cardBorder: config.border
      };
    })(),
    typography: { bodyFamily: 'DM Sans, ui-sans-serif, system-ui, sans-serif', displayFamily: config.display, bodySize: '16px', bodyWeight: 400, headingWeight: 700, bodyLineHeight: 1.5, headingLineHeight: 1.06 },
    shape: { pageRadius: config.cardRadius ?? 20, cardRadius: config.cardRadius ?? 16, buttonRadius: config.buttonRadius ?? 12, avatarRadius: 999 },
    spacing: { pageX: 18, pageY: 24, blockGap: 14, sectionGap: 26 },
    elevation: { card: '0 10px 26px rgba(0,0,0,0.12)', button: '0 4px 12px rgba(0,0,0,0.10)' },
    motion: { durationMs: 200, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', enabled: true, hoverEffect: 'lift' }
  },
  background: { type: config.background ? 'gradient' : 'solid', gradientStops: config.background, fallbackColor: config.page, position: 'center', overlay: 0 },
  header: { alignment: config.alignment ?? 'center', avatarSize: config.avatarSize ?? 86, showShare: true, showSocials: true },
  layout: { maxWidth: config.maxWidth ?? '680px', alignment: config.alignment ?? 'center', headerStyle: config.headerStyle ?? 'standard', blockWidth: config.blockWidth ?? 'full', navigationStyle: 'pills' },
  componentVariants: { link: config.link, image: config.image, socialIcons: config.link === 'soft-card' ? 'filled' : 'minimal', form: config.link === 'glass' ? 'glass' : 'card' },
  blockDefaults: { link: { variant: config.link === 'soft-card' ? 'soft' : config.link === 'glass' ? 'glass' : config.link === 'outline' ? 'outline' : 'filled', height: 58, thumbnail: config.thumbnail ?? 'none', shadow: 'sm' }, text: { alignment: config.alignment ?? 'center' }, media: { radius: config.image === 'full-bleed' ? 'none' : config.image === 'polaroid' ? 'sm' : 'lg' }, folder: { variant: config.link === 'glass' ? 'glass' : 'filled' } },
  responsive: { mobile: { maxWidth: 680, pageX: 16, pageY: 18, blockGap: 12 }, tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 }, desktop: { maxWidth: 860, pageX: 28, pageY: 32, blockGap: 16 } },
  accessibility: { reducedMotion: 'respectUserPreference', minimumContrast: 'AA' }
});

const CONCEPT_THEME_PRESETS: StandardTheme[] = [
  concept({ id: 'preset-ayre-coat', name: 'Ayre Coat Editorial', presetId: 'preset.ayre-coat', page: '#EEE9DF', panel: '#F7F3EB', text: '#332B25', muted: '#6D6258', accent: '#9B765B', accentText: '#FFFFFF', border: '#D9CDBD', display: 'Fraunces, Georgia, serif', alignment: 'left', headerStyle: 'hero', link: 'soft-card', image: 'polaroid', maxWidth: '720px', blockWidth: 'mixed', cardRadius: 18, buttonRadius: 10, thumbnail: 'left' }),
  concept({ id: 'preset-grace-bakery', name: 'Grace & Co. Bakery', presetId: 'preset.grace-bakery', page: '#F8E7E8', panel: '#FFF8F2', text: '#3B2927', muted: '#765957', accent: '#D58A9A', accentText: '#3B2927', border: '#E4B9BD', display: 'DM Sans, sans-serif', background: 'linear-gradient(155deg, #FCEFF0 0%, #F7E0D3 100%)', link: 'soft-card', image: 'polaroid', maxWidth: '640px', blockWidth: 'narrow', cardRadius: 22, buttonRadius: 999, thumbnail: 'none' }),
  concept({ id: 'preset-xavier-finance', name: 'Xavier Finance', presetId: 'preset.xavier-finance', page: '#063B3B', panel: '#F4F3EF', text: '#F6F5EE', muted: '#D4E2DC', accent: '#D99A54', accentText: '#172220', border: '#17605E', display: 'DM Sans, sans-serif', headerStyle: 'hero', link: 'image-card', image: 'rounded', maxWidth: '680px', blockWidth: 'full', cardRadius: 14, buttonRadius: 10, thumbnail: 'left' }),
  concept({ id: 'preset-danisha-beauty', name: 'Danisha Beauty', presetId: 'preset.danisha-beauty', page: '#202020', panel: '#2B2B2B', text: '#F7F4EF', muted: '#D0CBC4', accent: '#F7F4EF', accentText: '#202020', border: '#4A4744', display: 'Cormorant Garamond, Georgia, serif', headerStyle: 'hero', link: 'glass', image: 'full-bleed', maxWidth: '680px', blockWidth: 'full', cardRadius: 6, buttonRadius: 4 }),
  concept({ id: 'preset-kd-salon', name: 'KD & Co. Salon', presetId: 'preset.kd-salon', page: '#F7F7F5', panel: '#FFFFFF', text: '#111111', muted: '#494949', accent: '#111111', accentText: '#FFFFFF', border: '#D9D9D5', display: 'DM Sans, sans-serif', headerStyle: 'compact', link: 'soft-card', image: 'rounded', maxWidth: '680px', blockWidth: 'narrow', cardRadius: 18, buttonRadius: 999 })
];

export const SPEC_THEME_PRESETS: StandardTheme[] = [
  ...CONCEPT_THEME_PRESETS,
  ...LIINKS_GALLERY_THEMES,
  {
    schemaVersion: 1,
    id: 'preset-midnight-studio',
    name: 'Midnight Studio',
    source: 'preset',
    presetId: 'preset.midnight-studio',
    tokens: {
      colors: {
        pageBackground: '#0B0F19',
        panelBackground: '#151B2A',
        primaryText: '#F8FAFC',
        secondaryText: '#B8C1D1',
        accent: '#6366F1',
        accentText: '#000000',
        border: '#30394D',
        focusRing: '#A5B4FC'
      },
      typography: {
        bodyFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        displayFamily: 'Manrope, Inter, ui-sans-serif, sans-serif',
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 700,
        bodyLineHeight: 1.5,
        headingLineHeight: 1.15
      },
      shape: {
        pageRadius: 24,
        cardRadius: 16,
        buttonRadius: 12,
        avatarRadius: 999
      },
      spacing: {
        pageX: 20,
        pageY: 24,
        blockGap: 14,
        sectionGap: 24
      },
      elevation: {
        card: '0 8px 30px rgba(0,0,0,0.18)',
        button: '0 2px 8px rgba(0,0,0,0.1)'
      },
      motion: {
        durationMs: 180,
        easing: 'ease-out',
        enabled: true,
        hoverEffect: 'lift'
      }
    },
    background: {
      type: 'solid',
      assetId: null,
      position: 'center',
      overlay: 0,
      fallbackColor: '#0B0F19'
    },
    header: {
      alignment: 'center',
      avatarSize: 88,
      showShare: true,
      showSocials: true
    },
    blockDefaults: {
      link: {
        variant: 'filled',
        height: 56,
        thumbnail: 'none',
        shadow: 'sm'
      },
      text: {
        alignment: 'left'
      },
      media: {
        radius: 'lg'
      },
      folder: {
        variant: 'filled'
      }
    },
    responsive: {
      mobile: {
        maxWidth: 680,
        pageX: 16,
        pageY: 16,
        blockGap: 12
      },
      tablet: {
        maxWidth: 760,
        pageX: 24,
        pageY: 24,
        blockGap: 14
      },
      desktop: {
        maxWidth: 860,
        pageX: 28,
        pageY: 28,
        blockGap: 16
      }
    },
    accessibility: {
      reducedMotion: 'respectUserPreference',
      minimumContrast: 'AA'
    }
  },
  {
    schemaVersion: 1,
    id: 'preset-onyx-minimal',
    name: 'Onyx Minimal',
    source: 'preset',
    presetId: 'preset.onyx-minimal',
    tokens: {
      colors: {
        pageBackground: '#09090B',
        panelBackground: '#18181B',
        primaryText: '#FAFAFA',
        secondaryText: '#A1A1AA',
        accent: '#FAFAFA',
        accentText: '#09090B',
        border: '#27272A',
        focusRing: '#FAFAFA'
      },
      typography: {
        bodyFamily: 'Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif',
        displayFamily: 'Syne, ui-sans-serif, system-ui, sans-serif',
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 700,
        bodyLineHeight: 1.5,
        headingLineHeight: 1.15
      },
      shape: {
        pageRadius: 20,
        cardRadius: 14,
        buttonRadius: 10,
        avatarRadius: 999
      },
      spacing: {
        pageX: 20,
        pageY: 24,
        blockGap: 12,
        sectionGap: 20
      },
      elevation: {
        card: '0 4px 20px rgba(0,0,0,0.3)',
        button: '0 2px 4px rgba(0,0,0,0.1)'
      },
      motion: {
        durationMs: 160,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        enabled: true,
        hoverEffect: 'scale'
      }
    },
    background: {
      type: 'solid',
      assetId: null,
      position: 'center',
      overlay: 0,
      fallbackColor: '#09090B'
    },
    header: {
      alignment: 'center',
      avatarSize: 84,
      showShare: true,
      showSocials: true
    },
    blockDefaults: {
      link: {
        variant: 'filled',
        height: 52,
        thumbnail: 'none',
        shadow: 'sm'
      },
      text: { alignment: 'center' },
      media: { radius: 'md' },
      folder: { variant: 'filled' }
    },
    responsive: {
      mobile: { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12 },
      tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 },
      desktop: { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16 }
    },
    accessibility: {
      reducedMotion: 'respectUserPreference',
      minimumContrast: 'AA'
    }
  },
  {
    schemaVersion: 1,
    id: 'preset-nordic-clean',
    name: 'Nordic Clean',
    source: 'preset',
    presetId: 'preset.nordic-clean',
    tokens: {
      colors: {
        pageBackground: '#F8FAFC',
        panelBackground: '#FFFFFF',
        primaryText: '#0F172A',
        secondaryText: '#475569',
        accent: '#0F172A',
        accentText: '#FFFFFF',
        border: '#E2E8F0',
        focusRing: '#2563EB'
      },
      typography: {
        bodyFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        displayFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 600,
        bodyLineHeight: 1.5,
        headingLineHeight: 1.2
      },
      shape: {
        pageRadius: 20,
        cardRadius: 12,
        buttonRadius: 10,
        avatarRadius: 999
      },
      spacing: {
        pageX: 20,
        pageY: 24,
        blockGap: 12,
        sectionGap: 24
      },
      elevation: {
        card: '0 2px 10px rgba(0,0,0,0.05)',
        button: '0 1px 3px rgba(0,0,0,0.08)'
      },
      motion: {
        durationMs: 200,
        easing: 'ease-out',
        enabled: true,
        hoverEffect: 'lift'
      }
    },
    background: {
      type: 'solid',
      assetId: null,
      position: 'center',
      overlay: 0,
      fallbackColor: '#F8FAFC'
    },
    header: {
      alignment: 'center',
      avatarSize: 84,
      showShare: true,
      showSocials: true
    },
    blockDefaults: {
      link: {
        variant: 'outline',
        height: 52,
        thumbnail: 'none',
        shadow: 'none'
      },
      text: { alignment: 'left' },
      media: { radius: 'md' },
      folder: { variant: 'outline' }
    },
    responsive: {
      mobile: { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12 },
      tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 },
      desktop: { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16 }
    },
    accessibility: {
      reducedMotion: 'respectUserPreference',
      minimumContrast: 'AA'
    }
  },
  {
    schemaVersion: 1,
    id: 'preset-editorial-cream',
    name: 'Editorial Cream',
    source: 'preset',
    presetId: 'preset.editorial-cream',
    tokens: {
      colors: {
        pageBackground: '#FBF9F5',
        panelBackground: '#FFFFFF',
        primaryText: '#1C1917',
        secondaryText: '#57534E',
        accent: '#78350F',
        accentText: '#FFFFFF',
        border: '#E7E5E4',
        focusRing: '#B45309'
      },
      typography: {
        bodyFamily: 'Plus Jakarta Sans, sans-serif',
        displayFamily: 'Fraunces, serif',
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 700,
        bodyLineHeight: 1.55,
        headingLineHeight: 1.15
      },
      shape: {
        pageRadius: 16,
        cardRadius: 8,
        buttonRadius: 6,
        avatarRadius: 999
      },
      spacing: {
        pageX: 20,
        pageY: 28,
        blockGap: 14,
        sectionGap: 24
      },
      elevation: {
        card: '0 4px 16px rgba(120,53,15,0.06)',
        button: '0 1px 3px rgba(0,0,0,0.06)'
      },
      motion: {
        durationMs: 220,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        enabled: true,
        hoverEffect: 'lift'
      }
    },
    background: {
      type: 'solid',
      assetId: null,
      position: 'center',
      overlay: 0,
      fallbackColor: '#FBF9F5'
    },
    header: {
      alignment: 'center',
      avatarSize: 92,
      showShare: true,
      showSocials: true
    },
    blockDefaults: {
      link: {
        variant: 'outline',
        height: 54,
        thumbnail: 'none',
        shadow: 'none'
      },
      text: { alignment: 'center' },
      media: { radius: 'sm' },
      folder: { variant: 'outline' }
    },
    responsive: {
      mobile: { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12 },
      tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 },
      desktop: { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16 }
    },
    accessibility: {
      reducedMotion: 'respectUserPreference',
      minimumContrast: 'AA'
    }
  },
  {
    schemaVersion: 1,
    id: 'preset-midnight-gradient',
    name: 'Midnight Indigo',
    source: 'preset',
    presetId: 'preset.midnight-indigo',
    tokens: {
      colors: {
        pageBackground: '#080D1A',
        panelBackground: '#131E38',
        primaryText: '#F8FAFC',
        secondaryText: '#94A3B8',
        accent: '#6366F1',
        accentText: '#000000',
        border: '#1E2F57',
        focusRing: '#818CF8'
      },
      typography: {
        bodyFamily: 'Plus Jakarta Sans, sans-serif',
        displayFamily: 'Syne, sans-serif',
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 700,
        bodyLineHeight: 1.5,
        headingLineHeight: 1.15
      },
      shape: {
        pageRadius: 24,
        cardRadius: 18,
        buttonRadius: 14,
        avatarRadius: 999
      },
      spacing: {
        pageX: 20,
        pageY: 24,
        blockGap: 14,
        sectionGap: 24
      },
      elevation: {
        card: '0 8px 32px rgba(99,102,241,0.18)',
        button: '0 4px 14px rgba(99,102,241,0.25)'
      },
      motion: {
        durationMs: 180,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        enabled: true,
        hoverEffect: 'glow'
      }
    },
    background: {
      type: 'gradient',
      assetId: null,
      position: 'center',
      overlay: 0,
      gradientStops: 'linear-gradient(135deg, #090e1a 0%, #111a33 100%)',
      fallbackColor: '#080D1A'
    },
    header: {
      alignment: 'center',
      avatarSize: 88,
      showShare: true,
      showSocials: true
    },
    blockDefaults: {
      link: {
        variant: 'glass',
        height: 56,
        thumbnail: 'none',
        shadow: 'colored'
      },
      text: { alignment: 'left' },
      media: { radius: 'lg' },
      folder: { variant: 'glass' }
    },
    responsive: {
      mobile: { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12 },
      tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 },
      desktop: { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16 }
    },
    accessibility: {
      reducedMotion: 'respectUserPreference',
      minimumContrast: 'AA'
    }
  },
  {
    schemaVersion: 1,
    id: 'preset-botanical-forest',
    name: 'Botanical Forest',
    source: 'preset',
    presetId: 'preset.botanical-forest',
    tokens: {
      colors: {
        pageBackground: '#061A14',
        panelBackground: '#0B2920',
        primaryText: '#ECFDF5',
        secondaryText: '#A7F3D0',
        accent: '#10B981',
        accentText: '#000000',
        border: '#134E3E',
        focusRing: '#34D399'
      },
      typography: {
        bodyFamily: 'Plus Jakarta Sans, sans-serif',
        displayFamily: 'Fraunces, serif',
        bodySize: '16px',
        bodyWeight: 400,
        headingWeight: 700,
        bodyLineHeight: 1.5,
        headingLineHeight: 1.15
      },
      shape: {
        pageRadius: 20,
        cardRadius: 14,
        buttonRadius: 12,
        avatarRadius: 999
      },
      spacing: {
        pageX: 20,
        pageY: 24,
        blockGap: 14,
        sectionGap: 24
      },
      elevation: {
        card: '0 6px 24px rgba(0,0,0,0.22)',
        button: '0 2px 8px rgba(16,185,129,0.2)'
      },
      motion: {
        durationMs: 180,
        easing: 'ease-out',
        enabled: true,
        hoverEffect: 'lift'
      }
    },
    background: {
      type: 'solid',
      assetId: null,
      position: 'center',
      overlay: 0,
      fallbackColor: '#061A14'
    },
    header: {
      alignment: 'center',
      avatarSize: 88,
      showShare: true,
      showSocials: true
    },
    blockDefaults: {
      link: {
        variant: 'filled',
        height: 54,
        thumbnail: 'none',
        shadow: 'sm'
      },
      text: { alignment: 'center' },
      media: { radius: 'md' },
      folder: { variant: 'filled' }
    },
    responsive: {
      mobile: { maxWidth: 680, pageX: 16, pageY: 16, blockGap: 12 },
      tablet: { maxWidth: 760, pageX: 24, pageY: 24, blockGap: 14 },
      desktop: { maxWidth: 860, pageX: 28, pageY: 28, blockGap: 16 }
    },
    accessibility: {
      reducedMotion: 'respectUserPreference',
      minimumContrast: 'AA'
    }
  },
  ...IMPORTED_THEME_PRESETS
];
