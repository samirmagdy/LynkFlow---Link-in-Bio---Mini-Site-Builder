import { SPEC_THEME_PRESETS } from '../data/themePresets';
import { StandardTheme } from '../types/themeSchema';
import { normalizeTheme } from './themeEngine';

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const sameJson = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => sameJson(item, right[index]));
  }
  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) return false;
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length && leftKeys.every(key => key in right && sameJson(left[key], right[key]));
  }
  return false;
};

/** Return only the values that differ from the selected base resource. */
export function createSparseOverride(base: unknown, current: unknown): unknown {
  if (sameJson(base, current)) return undefined;
  if (isRecord(base) && isRecord(current)) {
    const result: JsonRecord = {};
    for (const key of Object.keys(current)) {
      const difference = createSparseOverride(base[key], current[key]);
      if (difference !== undefined) result[key] = difference;
    }
    // A removed property is meaningful and must be persisted explicitly.
    for (const key of Object.keys(base)) {
      if (!(key in current)) result[key] = null;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return current;
}

/** Merge persisted sparse overrides without allowing them to replace the base resource. */
export function mergeSparseOverride<T>(base: T, override: unknown): T {
  if (!isRecord(base) || !isRecord(override)) return (override === undefined ? base : override as T);
  const result: JsonRecord = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === null) delete result[key];
    else if (isRecord(value) && isRecord(result[key])) result[key] = mergeSparseOverride(result[key] as JsonRecord, value);
    else result[key] = value;
  }
  return result as T;
}

function resolveThemeBase(theme: StandardTheme): StandardTheme {
  const match = SPEC_THEME_PRESETS.find(preset => preset.id === theme.id || (theme.presetId && preset.presetId === theme.presetId));
  return normalizeTheme(match || theme);
}

export function createThemeDesignPersistence(theme: StandardTheme): {
  baseTheme: StandardTheme;
  themeOverride: JsonRecord;
  layoutOverride: JsonRecord;
} {
  const baseTheme = resolveThemeBase(theme);
  const themeOverride = (createSparseOverride(baseTheme, theme) || {}) as JsonRecord;
  // Layout has a separate resource and should not be duplicated in the theme override.
  if ('layout' in themeOverride) delete themeOverride.layout;
  const layoutOverride = (createSparseOverride(baseTheme.layout || {}, theme.layout || {}) || {}) as JsonRecord;
  return { baseTheme, themeOverride, layoutOverride };
}
