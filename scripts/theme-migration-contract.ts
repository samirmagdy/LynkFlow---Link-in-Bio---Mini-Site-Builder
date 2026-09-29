import assert from 'node:assert/strict';
import { migrateTheme, upgradeTheme } from '../src/utils/themeEngine';

const legacy = {
  id: 'legacy-contract-theme',
  name: 'Legacy Contract Theme',
  backgroundType: 'gradient',
  bgColor: '#0B1020',
  bgGradient: 'linear-gradient(135deg, #0B1020 0%, #1E1B4B 100%)',
  textColor: '#FFFFFF',
  subtitleColor: '#CBD5E1',
  cardBg: '#111827',
  cardBorder: '#334155',
  accentColor: '#6366F1',
  fontBody: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontDisplay: 'Syne, Inter, ui-sans-serif, sans-serif'
};

const migrated = upgradeTheme(legacy, 0, 1);
assert.equal(migrated.schemaVersion, 1);
assert.equal(migrated.tokens.colors.pageBackground, '#0B1020');
assert.equal(migrated.background.type, 'gradient');
assert.equal(migrated.tokens.typography.bodyFamily.startsWith('Inter'), true);

const migratedByHelper = migrateTheme(legacy);
assert.deepEqual(migratedByHelper.tokens.colors, migrated.tokens.colors);

assert.throws(() => upgradeTheme(legacy, 2, 1), /downgraded/);
assert.throws(() => upgradeTheme(legacy, 1, 2), /No migration path/);
assert.throws(() => upgradeTheme(legacy, -1, 1), /non-negative/);

console.log('Theme migration contract: v0 legacy → v1 upgrade and unsupported paths passed');
