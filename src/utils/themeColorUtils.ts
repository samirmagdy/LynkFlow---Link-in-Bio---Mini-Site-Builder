import type { StandardTheme } from '../types/themeSchema';

export type ColorFormat = 'hex' | 'rgb' | 'hsl';

export const COLOR_TOKEN_LABELS: Array<[keyof StandardTheme['tokens']['colors'], string]> = [
  ['pageBackground', 'Page background'], ['panelBackground', 'Panel surface'], ['primaryText', 'Primary text'], ['secondaryText', 'Secondary text'],
  ['accent', 'CTA accent'], ['accentText', 'CTA text'], ['border', 'Border'], ['focusRing', 'Focus ring'], ['surfaceBase', 'Surface base'],
  ['surfaceRaised', 'Raised surface'], ['surfaceMuted', 'Muted surface'], ['textDisabled', 'Disabled text'], ['borderSubtle', 'Subtle border'],
  ['borderStrong', 'Strong border'], ['accentHover', 'Accent hover'], ['accentPressed', 'Accent pressed'], ['accentDisabled', 'Accent disabled'],
  ['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger']
];

export const normalizeHex = (value: string): string | null => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value.toUpperCase() : null;

const hexRgb = (value: string) => {
  const hex = normalizeHex(value);
  if (!hex) return null;
  const raw = hex.slice(1).length === 3 ? hex.slice(1).split('').map(char => char + char).join('') : hex.slice(1);
  return { r: parseInt(raw.slice(0, 2), 16), g: parseInt(raw.slice(2, 4), 16), b: parseInt(raw.slice(4, 6), 16) };
};

export const colorToFormat = (value: string, format: ColorFormat): string => {
  const rgb = hexRgb(value);
  if (!rgb || format === 'hex') return normalizeHex(value) || value;
  if (format === 'rgb') return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const channels = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const max = Math.max(...channels), min = Math.min(...channels), delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === channels[0]) hue = ((channels[1] - channels[2]) / delta) % 6;
    else if (max === channels[1]) hue = (channels[2] - channels[0]) / delta + 2;
    else hue = (channels[0] - channels[1]) / delta + 4;
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
  }
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return `hsl(${hue}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`;
};

export const parseColorInput = (value: string, format: ColorFormat): string | null => {
  const trimmed = value.trim();
  if (format === 'hex') return normalizeHex(trimmed);
  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (format === 'rgb' && rgbMatch) {
    const channels = rgbMatch.slice(1).map(Number);
    if (channels.every(channel => channel >= 0 && channel <= 255)) return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  const hslMatch = trimmed.match(/^hsla?\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*\)$/i);
  if (format !== 'hsl' || !hslMatch) return null;
  const hue = ((Number(hslMatch[1]) % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, Number(hslMatch[2]))) / 100;
  const lightness = Math.max(0, Math.min(100, Number(hslMatch[3]))) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const match = lightness - chroma / 2;
  const [red, green, blue] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[red, green, blue].map(channel => Math.round((channel + match) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

export const mixHex = (source: string, target: string, amount: number): string => {
  const from = hexRgb(source), to = hexRgb(target);
  if (!from || !to) return source;
  return `#${(['r', 'g', 'b'] as const).map(channel => Math.round(from[channel] + (to[channel] - from[channel]) * amount).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};
