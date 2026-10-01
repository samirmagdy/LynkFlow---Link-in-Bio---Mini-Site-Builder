import { resolveRenderableBlocks, selectInitialProfileTab } from '../src/utils/profileRenderModel';

const now = Date.parse('2026-09-29T12:00:00.000Z');
const tabs = [
  { id: 'home', slug: 'home', title: 'Home', blocks: [
    { id: 'supporting', position: 0, conversionRole: 'supporting' },
    { id: 'primary', position: 1, pinned: true },
    { id: 'pinned-secondary', position: 4, pinned: true },
    { id: 'hidden', position: 2, isHidden: true },
    { id: 'scheduled', position: 3, schedule: { enabled: true, start: '2026-10-01T00:00:00.000Z' } },
  ] },
  { id: 'work', slug: 'work', title: 'Work', blocks: [{ id: 'other', position: 0 }] },
];
const theme = { conversion: { primaryBlockId: 'primary' }, layout: { ctaPosition: 'priority-order' } };
const ordered = resolveRenderableBlocks(tabs[0], theme, now).map(block => block.id);
const failures: string[] = [];
if (selectInitialProfileTab(tabs, '#work')?.id !== 'work') failures.push('hash tab selection');
if (ordered.join(',') !== 'primary,pinned-secondary,supporting') failures.push(`visibility/CTA ordering (${ordered.join(',')})`);
if (selectInitialProfileTab(tabs)?.id !== 'home') failures.push('default tab selection');

if (failures.length) {
  failures.forEach(failure => console.error(`[render-model] ${failure}`));
  process.exit(1);
}
console.log('Profile render model contract: tab selection, scheduling, visibility and CTA ordering passed');
