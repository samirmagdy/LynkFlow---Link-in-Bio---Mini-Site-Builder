import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.VISUAL_BASE_URL || 'https://lynkflow.samirmagdy80.workers.dev').replace(/\/$/, '');
const outputDir = path.resolve('artifacts/theme-visual-smoke');
const viewports = [
  { id: 'small-mobile', width: 320, height: 780 },
  { id: 'mobile', width: 390, height: 844 },
  { id: 'tablet', width: 768, height: 1024 },
  { id: 'desktop', width: 1440, height: 900 },
  { id: 'wide', width: 1920, height: 1080 },
] as const;

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures: string[] = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    // The public page may keep media/font requests open; DOM readiness is the
    // relevant gate for layout, while the explicit settle delay below lets the
    // shared renderer mount before measurements and screenshots.
    const response = await page.goto(`${baseUrl}/@alexvance?demo=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(500);
    await page.locator('[data-profile-theme]').waitFor({ state: 'attached', timeout: 10_000 }).catch(() => undefined);
    const essentialOnly = page.getByRole('button', { name: 'Essential Only' });
    if (await essentialOnly.isVisible().catch(() => false)) await essentialOnly.click();

    if (!response || response.status() !== 200) failures.push(`${viewport.id}: expected HTTP 200, received ${response?.status() ?? 'no response'}`);
    if (await page.getByText('Profile unavailable').count()) failures.push(`${viewport.id}: demo rendered the unavailable state`);
    if (!(await page.locator('[data-profile-theme]').count())) failures.push(`${viewport.id}: shared profile renderer marker is missing`);

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      direction: document.documentElement.getAttribute('dir') || document.querySelector('[dir]')?.getAttribute('dir') || 'ltr'
    }));
    if (layout.documentWidth > layout.viewportWidth + 1 || layout.bodyWidth > layout.viewportWidth + 1) {
      failures.push(`${viewport.id}: horizontal overflow (${layout.documentWidth}/${layout.bodyWidth} > ${layout.viewportWidth})`);
    }

    await page.screenshot({ path: path.join(outputDir, `${viewport.id}.png`), fullPage: true });
    await page.close();
    console.log(`${viewport.id}: ${layout.direction}, ${layout.viewportWidth}px, no overflow`);
  }
} finally {
  await browser.close();
}

if (failures.length) {
  failures.forEach(failure => console.error(`[visual] ${failure}`));
  process.exit(1);
}

console.log(`Theme visual smoke: ${viewports.length} public demo viewports passed (${baseUrl})`);
