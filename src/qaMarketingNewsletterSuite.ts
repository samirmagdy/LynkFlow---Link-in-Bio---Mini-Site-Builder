const baseUrl = process.env.LYNKFLOW_API_URL || 'https://lynkflow.samirmagdy80.workers.dev';

const response = await fetch(baseUrl + '/api/public/newsletter', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'not-an-email', consent: true })
});
const body = await response.json() as { error?: { code?: string } };
const passed = response.status === 422 && body.error?.code === 'VALIDATION_ERROR';
console.log((passed ? 'PASS' : 'FAIL') + ' newsletter validation: HTTP ' + response.status);
if (!passed) process.exit(1);
