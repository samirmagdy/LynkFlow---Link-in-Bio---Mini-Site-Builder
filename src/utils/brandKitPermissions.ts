import type { BrandKit } from '../types';
import type { StandardTheme } from '../types/themeSchema';
import { calculateContrastRatio } from './themeEngine';

type ThemeOverrideGroup = 'colors' | 'fonts' | 'spacing' | 'background' | 'layout' | 'components';

/** Apply workspace brand-kit editing policy to an incoming theme mutation. */
export function enforceBrandKitThemePolicy(
  current: StandardTheme,
  next: StandardTheme,
  brandKit: BrandKit,
  fallbackBrandKit: BrandKit
): StandardTheme {
  const kit = brandKit || fallbackBrandKit;
  const locks = kit.lockedFields || {};
  const editingMode = kit.editingMode || 'full';
  if (editingMode === 'content-only') return current;
  const allowed = new Set(kit.allowedThemeOverrides || []);
  const isLocked = (group: ThemeOverrideGroup) => editingMode === 'selected-overrides'
    ? !allowed.has(group)
    : Boolean(locks[group as keyof NonNullable<BrandKit['lockedFields']>]);

  const guarded = { ...next };
  if (isLocked('colors')) {
    const accentText = calculateContrastRatio('#FFFFFF', kit.accentColor) >= calculateContrastRatio('#000000', kit.accentColor) ? '#FFFFFF' : '#000000';
    guarded.tokens = {
      ...guarded.tokens,
      colors: {
        ...guarded.tokens.colors,
        primaryText: kit.primaryColor,
        textPrimary: kit.primaryColor,
        secondaryText: kit.secondaryColor,
        textSecondary: kit.secondaryColor,
        accent: kit.accentColor,
        accentPrimary: kit.accentColor,
        accentText,
        ctaText: accentText,
      },
    };
    guarded.buttons = { ...current.buttons!, ...guarded.buttons, background: kit.accentColor, text: accentText };
    guarded.socialIcons = { ...current.socialIcons!, ...guarded.socialIcons, color: kit.primaryColor };
  }
  if (isLocked('fonts')) {
    guarded.tokens = {
      ...guarded.tokens,
      typography: { ...guarded.tokens.typography, bodyFamily: kit.latinFont, displayFamily: kit.latinFont, arabicFamily: kit.arabicFont },
    };
  }
  if (isLocked('spacing')) {
    guarded.tokens = { ...guarded.tokens, spacing: current.tokens.spacing };
    guarded.responsive = current.responsive;
  }
  if (isLocked('background')) guarded.background = current.background;
  if (isLocked('layout')) guarded.layout = current.layout;
  if (isLocked('spacing')) guarded.layout = current.layout;
  if (isLocked('components')) {
    guarded.componentVariants = current.componentVariants;
    guarded.blockDefaults = current.blockDefaults;
    guarded.buttons = current.buttons;
    guarded.cards = current.cards;
    guarded.socialIcons = current.socialIcons;
    guarded.effects = current.effects;
    guarded.tokens = { ...guarded.tokens, shape: current.tokens.shape, elevation: current.tokens.elevation, motion: current.tokens.motion };
  }
  return guarded;
}
