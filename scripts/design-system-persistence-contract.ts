import { SPEC_THEME_PRESETS } from '../src/data/themePresets';
import { createSparseOverride, createThemeDesignPersistence, mergeSparseOverride } from '../src/utils/designSystemPersistence';
import { normalizeTheme } from '../src/utils/themeEngine';

const base = normalizeTheme(SPEC_THEME_PRESETS[0]);
const edited = normalizeTheme({ ...base, tokens: { ...base.tokens, colors: { ...base.tokens.colors, accent: '#123456' } }, layout: { ...base.layout, alignment: 'left' } });
const persistence = createThemeDesignPersistence(edited);
const restored = mergeSparseOverride(persistence.baseTheme, persistence.themeOverride) as typeof edited;
const failures: string[] = [];

if (persistence.baseTheme.id !== base.id) failures.push('preset base resource was not selected');
if (JSON.stringify(persistence.themeOverride).includes('layout')) failures.push('layout leaked into theme override');
if ((persistence.themeOverride.tokens as Record<string, unknown> | undefined)?.colors === undefined) failures.push('changed semantic color was not persisted sparsely');
if (JSON.stringify(persistence.themeOverride).includes(JSON.stringify(base.tokens.typography))) failures.push('unchanged typography was duplicated');
if (restored.tokens.colors.accent !== '#123456') failures.push('sparse theme override did not restore edited color');
if ((createSparseOverride({ a: 1, removed: true }, { a: 1 }) as Record<string, unknown>).removed !== null) failures.push('removed values are not represented safely');

if (failures.length) {
  failures.forEach(failure => console.error(`[design-persistence] ${failure}`));
  process.exit(1);
}
console.log('Design-system persistence contract: sparse theme/layout overrides and restoration passed');
