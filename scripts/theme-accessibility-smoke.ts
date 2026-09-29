import { chromium } from '@playwright/test';

const baseUrl = (process.env.ACCESSIBILITY_BASE_URL || 'https://lynkflow.samirmagdy80.workers.dev').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const failures: string[] = [];

try {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const response = await page.goto(`${baseUrl}/@alexvance?demo=1`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(500);
  const essentialOnly = page.getByRole('button', { name: 'Essential Only' });
  if (await essentialOnly.isVisible().catch(() => false)) await essentialOnly.click();
  if (!response || response.status() !== 200) failures.push(`expected HTTP 200, received ${response?.status() ?? 'no response'}`);

  const result = await page.evaluate(() => {
    const actionable = Array.from(document.querySelectorAll('a,button,input,select,textarea,[role="button"]')).filter(element => element.getAttribute('aria-hidden') !== 'true' && (element as HTMLElement).offsetParent !== null);
    const unnamed: string[] = [];
    for (const element of actionable) {
      const type = element.getAttribute('type');
      const labelledBy = element.getAttribute('aria-labelledby');
      const name = (element.getAttribute('aria-label') || (labelledBy ? labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ') : '') || element.getAttribute('title') || element.textContent || element.getAttribute('placeholder') || '').replace(/\s+/g, ' ').trim();
      if (!(element.matches('input') && ['hidden', 'checkbox', 'radio'].includes(type || '')) && !name) unnamed.push(element.outerHTML.slice(0, 160));
    }
    const unlabeledFields: string[] = [];
    for (const element of Array.from(document.querySelectorAll('input,select,textarea')).filter(candidate => candidate.getAttribute('aria-hidden') !== 'true' && (candidate as HTMLElement).offsetParent !== null)) {
      const type = element.getAttribute('type');
      const hasLabel = !!element.closest('label') || (!!element.id && !!document.querySelector(`label[for="${CSS.escape(element.id)}"]`));
      if (type !== 'hidden' && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby') && !hasLabel) unlabeledFields.push(element.outerHTML.slice(0, 160));
    }
    const missingAlt: string[] = [];
    for (const image of Array.from(document.querySelectorAll('img')).filter(element => element.getAttribute('aria-hidden') !== 'true' && (element as HTMLElement).offsetParent !== null)) {
      if (!image.getAttribute('alt')) missingAlt.push(image.outerHTML.slice(0, 160));
    }
    const animatedInReducedMode: string[] = [];
    for (const element of Array.from(document.querySelectorAll('.anime-profile-item')).filter(candidate => candidate.getAttribute('aria-hidden') !== 'true' && (candidate as HTMLElement).offsetParent !== null)) {
      const animationName = getComputedStyle(element).animationName;
      if (animationName !== 'none') animatedInReducedMode.push(animationName);
    }
    return {
      unnamed,
      unlabeledFields,
      missingAlt,
      animatedInReducedMode,
      lang: document.querySelector('[lang]')?.getAttribute('lang'),
      direction: document.querySelector('[dir]')?.getAttribute('dir')
    };
  });

  if (result.unnamed.length) failures.push(`unnamed actionable elements: ${result.unnamed.join(' | ')}`);
  if (result.unlabeledFields.length) failures.push(`unlabeled form fields: ${result.unlabeledFields.join(' | ')}`);
  if (result.missingAlt.length) failures.push(`images missing alt text: ${result.missingAlt.join(' | ')}`);
  if (result.animatedInReducedMode.length) failures.push(`non-essential entrance animations remain under reduced motion: ${result.animatedInReducedMode.join(', ')}`);
  if (result.lang !== 'en') failures.push(`expected lang=en, received ${result.lang || 'missing'}`);
  if (result.direction !== 'ltr') failures.push(`expected dir=ltr, received ${result.direction || 'missing'}`);

  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName, visible: !!(document.activeElement as HTMLElement)?.getBoundingClientRect?.().width }));
  if (focused.tag === 'BODY' || !focused.visible) failures.push('keyboard Tab did not move focus to a visible actionable element');
  console.log(`Theme accessibility smoke: ${result.lang}/${result.direction}, ${focused.tag} focused, reduced motion respected`);
} finally {
  await browser.close();
}

if (failures.length) {
  failures.forEach(failure => console.error(`[a11y] ${failure}`));
  process.exit(1);
}

console.log(`Theme accessibility smoke passed (${baseUrl})`);
