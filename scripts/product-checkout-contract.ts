import assert from 'node:assert/strict';
import { normalizeProductCurrency, parseProductPrice } from '../src/utils/productCheckout';

assert.deepEqual(parseProductPrice('49.90'), { amountInCents: 4990, display: '49.90' });
assert.equal(parseProductPrice('0'), null);
assert.equal(parseProductPrice('49.999'), null);
assert.equal(normalizeProductCurrency('$'), 'usd');
assert.equal(normalizeProductCurrency('EUR'), 'eur');
assert.equal(normalizeProductCurrency('bitcoin'), null);
console.log('Product checkout contract passed.');
