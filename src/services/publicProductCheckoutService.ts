type CheckoutError = { error?: string | { message?: string } };

function errorMessage(body: CheckoutError): string {
  return typeof body.error === 'string' ? body.error : body.error?.message || 'Unable to open secure checkout.';
}

export async function createPublicProductCheckoutSession(username: string, blockId: string): Promise<string> {
  const response = await fetch('/api/public/product-checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, blockId }),
  });
  const body = await response.json() as CheckoutError & { url?: string };
  if (!response.ok || !body.url) throw new Error(errorMessage(body));
  return body.url;
}
