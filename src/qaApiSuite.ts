/** Minimal live contract smoke suite for the deployed API boundary. */
const baseUrl = process.env.LYNKFLOW_API_URL || 'https://lynkflow.samirmagdy80.workers.dev';
const checks = [
  ['deployment health', '/api/health', 'GET'],
  ['profile list', '/api/v1/profiles', 'GET'],
  ['profile update', '/api/v1/profiles/example', 'PATCH'],
  ['blocks list', '/api/v1/profiles/example/blocks', 'GET'],
  ['theme read', '/api/v1/profiles/example/themes', 'GET'],
  ['publish', '/api/v1/profiles/example/publish', 'POST'],
  ['webhook create', '/api/webhooks', 'POST'],
  ['domain verify', '/api/domains/verify', 'POST'],
  ['domain remove', '/api/domains/remove', 'POST'],
  ['billing portal', '/api/stripe/portal', 'POST'],
] as const;
let failed = 0;
for (const [name, path, method] of checks) {
  const response = await fetch(`${baseUrl}${path}`, { method, headers: ['PATCH', 'POST'].includes(method) ? { 'content-type': 'application/json' } : undefined, body: method === 'PATCH' ? JSON.stringify({ data: {} }) : method === 'POST' ? JSON.stringify({ profileId: 'example', domain: 'example.com', url: 'https://example.com', topics: ['profile.published'] }) : undefined });
  const body = await response.json() as { error?: { code?: string } };
  const passed = name === 'deployment health'
    ? (response.status === 503 && !body.error && typeof body === 'object')
    : response.status === 401 && body.error?.code === 'UNAUTHORIZED';
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: HTTP ${response.status}`);
  if (!passed) failed += 1;
}
if (failed) process.exit(1);
