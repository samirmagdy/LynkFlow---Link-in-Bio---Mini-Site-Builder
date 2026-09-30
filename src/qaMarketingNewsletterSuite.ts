const baseUrl = process.env.LYNKFLOW_API_URL || 'https://lynkflow.samirmagdy80.workers.dev';

const response = await fetch(baseUrl + '/api/public/newsletter', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'not-an-email', consent: true })
});
const bodyText = await response.text();
const body = JSON.parse(bodyText) as { error?: { code?: string } };
const passed = response.status === 422 && body.error?.code === 'VALIDATION_ERROR';
console.log((passed ? 'PASS' : 'FAIL') + ' newsletter validation: HTTP ' + response.status);
if (!passed) process.exit(1);

const unsubscribeResponse = await fetch(baseUrl + '/api/public/newsletter/unsubscribe', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'not-an-email' })
});
const unsubscribeBodyText = await unsubscribeResponse.text();
const unsubscribeBody = JSON.parse(unsubscribeBodyText) as { error?: { code?: string } };
const unsubscribePassed = unsubscribeResponse.status === 422 && unsubscribeBody.error?.code === 'VALIDATION_ERROR';
console.log((unsubscribePassed ? 'PASS' : 'FAIL') + ' newsletter unsubscribe validation: HTTP ' + unsubscribeResponse.status);
if (!unsubscribePassed) process.exit(1);
