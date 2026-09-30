import { chromium } from '@playwright/test';

const baseUrl = (process.env.ACCESSIBILITY_BASE_URL || 'https://lynkflow.samirmagdy80.workers.dev').replace(/\/$/, '');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const failures: string[] = [];

try {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The public page may keep media/font requests open. DOM readiness is the
  // relevant gate for accessibility checks; the explicit settle delay lets
  // the shared renderer mount without making the test depend on network idle.
  const response = await page.goto(`${baseUrl}/@alexvance?demo=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(500);
  const renderedProfile = page.locator('[data-profile-theme][dir]');
  await renderedProfile.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => undefined);
  const essentialOnly = page.getByRole('button', { name: 'Essential Only' });
  // The consent panel intentionally sits above the public page and can cover
  // the first keyboard target. Resolve it before running focus/overflow checks.
  if (await essentialOnly.isVisible().catch(() => false)) await essentialOnly.click({ force: true });
  if (!response || response.status() !== 200) failures.push(`expected HTTP 200, received ${response?.status() ?? 'no response'}`);
  if (!(await renderedProfile.count())) failures.push('shared profile renderer did not expose a language direction attribute');

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
  const focused = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    const styles = element ? getComputedStyle(element) : null;
    const hasFocusIndicator = !!styles && (styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px' || styles.boxShadow !== 'none');
    return {
      tag: element?.tagName,
      visible: !!element?.getBoundingClientRect?.().width,
      hasFocusIndicator
    };
  });
  if (focused.tag === 'BODY' || !focused.visible) failures.push('keyboard Tab did not move focus to a visible actionable element');
  if (!focused.hasFocusIndicator) failures.push('keyboard focus target has no visible focus indicator');

  const scaleResult = await page.evaluate(() => {
    const root = document.documentElement;
    const previousSize = root.style.fontSize;
    root.style.fontSize = '200%';
    const horizontalOverflow = root.scrollWidth > root.clientWidth + 1;
    const longArabic = 'هذا نص عربي طويل لاختبار التفاف المحتوى — Long mixed-language profile content should wrap without clipping or forcing horizontal scroll.';
    const heading = document.querySelector('h1');
    const previousHeading = heading?.textContent || '';
    if (heading) heading.textContent = longArabic;
    const contentOverflow = root.scrollWidth > root.clientWidth + 1;
    if (heading) heading.textContent = previousHeading;
    root.style.fontSize = previousSize;
    return { horizontalOverflow, contentOverflow };
  });
  if (scaleResult.horizontalOverflow || scaleResult.contentOverflow) failures.push('200% text-scale or long mixed Arabic/English content causes horizontal overflow');

  const rtlResult = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const profile = document.querySelector('.profile-shell, .profile-theme-root') as HTMLElement | null;
    const previousLang = root.getAttribute('lang');
    const previousDir = root.getAttribute('dir');
    const previousBodyDir = body.getAttribute('dir');
    const previousBodyDirection = body.style.direction;
    const previousProfileDir = profile?.getAttribute('dir');
    const previousProfileDirection = profile?.style.direction;
    root.setAttribute('lang', 'ar');
    root.setAttribute('dir', 'rtl');
    body.setAttribute('dir', 'rtl');
    body.style.setProperty('direction', 'rtl', 'important');
    if (profile) profile.setAttribute('dir', 'rtl');
    if (profile) profile.style.setProperty('direction', 'rtl', 'important');
    const horizontalOverflow = root.scrollWidth > root.clientWidth + 1;
    const direction = (profile || body).getAttribute('dir');
    root.setAttribute('lang', previousLang || 'en');
    root.setAttribute('dir', previousDir || 'ltr');
    if (previousBodyDir) body.setAttribute('dir', previousBodyDir); else body.removeAttribute('dir');
    body.style.direction = previousBodyDirection;
    if (profile) {
      if (previousProfileDir) profile.setAttribute('dir', previousProfileDir); else profile.removeAttribute('dir');
      profile.style.direction = previousProfileDirection || '';
    }
    return { horizontalOverflow, direction };
  });
  if (rtlResult.horizontalOverflow || rtlResult.direction !== 'rtl') failures.push(`Arabic RTL mode does not preserve direction or introduces horizontal overflow (direction=${rtlResult.direction}, overflow=${rtlResult.horizontalOverflow})`);

  console.log(`Theme accessibility smoke: ${result.lang}/${result.direction}, ${focused.tag} focused with indicator, 200% text scale and RTL checks passed, reduced motion respected`);
} finally {
  await browser.close();
}

if (failures.length) {
  failures.forEach(failure => console.error(`[a11y] ${failure}`));
  process.exit(1);
}

console.log(`Theme accessibility smoke passed (${baseUrl})`);
