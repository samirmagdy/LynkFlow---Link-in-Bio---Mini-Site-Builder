import { normalizeTheme } from '../src/utils/themeEngine';
import { enforceBrandKitThemePolicy } from '../src/utils/brandKitPermissions';
import type { BrandKit } from '../src/types';

const current = normalizeTheme({ id: 'current', name: 'Current' });
const next = normalizeTheme({ ...current, id: 'next', tokens: { ...current.tokens, colors: { ...current.tokens.colors, accent: '#FF0000' }, spacing: { ...current.tokens.spacing, pageX: 40 } }, background: { ...current.background, type: 'gradient', gradientStops: 'linear-gradient(90deg,#000,#fff)' } });
const kit: BrandKit = { id: 'kit', name: 'Agency', primaryColor: '#112233', secondaryColor: '#445566', accentColor: '#667788', latinFont: current.tokens.typography.bodyFamily, arabicFont: current.tokens.typography.arabicFamily || 'Noto Kufi Arabic, Tahoma, sans-serif', buttonStyle: 'filled', imageStyle: 'rounded', socialIconStyle: 'line', updatedAt: new Date().toISOString() };

const contentOnly = enforceBrandKitThemePolicy(current, next, { ...kit, editingMode: 'content-only' }, kit);
if (contentOnly.id !== current.id || contentOnly.background.type !== current.background.type) throw new Error('Content-only policy allowed a theme mutation.');

const selected = enforceBrandKitThemePolicy(current, next, { ...kit, editingMode: 'selected-overrides', allowedThemeOverrides: ['background'] }, kit);
if (selected.background.type !== 'gradient' || selected.tokens.spacing.pageX !== current.tokens.spacing.pageX) throw new Error('Selected override policy did not isolate the allowed group.');

const lockedColors = enforceBrandKitThemePolicy(current, next, { ...kit, lockedFields: { colors: true } }, kit);
if (lockedColors.tokens.colors.accent !== kit.accentColor) throw new Error('Brand color lock was bypassed.');

console.log('Brand-kit policy contract: content-only, selected override and color-lock enforcement passed');
