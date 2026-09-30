const baseUrl = (process.env.MARKETING_BASE_URL || process.env.VISUAL_BASE_URL || 'https://lynkflow.samirmagdy80.workers.dev').replace(/\/$/, '');

const canonicalRoutes = [
  '/link-in-bio',
  '/mini-site-builder',
  '/link-in-bio-for-creators',
  '/link-in-bio-for-agencies',
  '/link-in-bio-analytics',
  '/custom-domain-link-in-bio',
  '/features/themes',
  '/features/dynamic-qr-codes',
  '/features/analytics',
  '/features/custom-domains',
  '/features/agency-workspaces',
  '/contact',
  '/pricing'
];

const aliases: Record<string, string> = {
  '/features': '/link-in-bio',
  '/themes': '/features/themes',
  '/faq': '/contact'
};

const failures: string[] = [];

for (const path of canonicalRoutes) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
  if (response.status !== 200) failures.push(`${path}: expected 200, received ${response.status}`);
}

for (const [alias, target] of Object.entries(aliases)) {
  const response = await fetch(`${baseUrl}${alias}`, { redirect: 'manual' });
  const location = response.headers.get('location') || '';
  if (response.status !== 301 || !location.endsWith(target)) {
    failures.push(`${alias}: expected 301 to ${target}, received ${response.status} ${location}`);
  }
}

if (failures.length) {
  failures.forEach(failure => console.error(`Marketing route contract: ${failure}`));
  process.exit(1);
}

console.log(`Marketing route contract: ${canonicalRoutes.length} canonical routes and ${Object.keys(aliases).length} aliases passed (${baseUrl})`);
