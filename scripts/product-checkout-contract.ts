import assert from 'node:assert/strict';
import { normalizeProductCurrency, parseProductPrice } from '../src/utils/productCheckout';
import { validateBlockPayload } from '../src/utils/blockValidator';

assert.deepEqual(parseProductPrice('49.90'), { amountInCents: 4990, display: '49.90' });
assert.equal(parseProductPrice('0'), null);
assert.equal(parseProductPrice('49.999'), null);
assert.equal(normalizeProductCurrency('$'), 'usd');
assert.equal(normalizeProductCurrency('EUR'), 'eur');
assert.equal(normalizeProductCurrency('bitcoin'), null);
assert.equal(validateBlockPayload('course', { price: '79', currency: 'USD', checkoutEnabled: true, deliveryUrl: 'https://example.com/access', lessons: [{ id: 'l1', title: 'Welcome' }] }).isValid, true);
assert.equal(validateBlockPayload('course', { price: '79', currency: 'USD', checkoutEnabled: true, lessons: [{ id: 'l1', title: 'Welcome' }] }).isValid, false);
assert.equal(validateBlockPayload('membership', { price: '9', currency: 'USD', interval: 'month', checkoutEnabled: true, benefits: ['Community access'] }).isValid, true);
assert.equal(validateBlockPayload('membership', { price: '9', currency: 'USD', interval: 'month', checkoutEnabled: true, deliveryUrl: 'https://example.com/members' }).isValid, true);
assert.equal(validateBlockPayload('membership', { price: '9', currency: 'USD', interval: 'month', checkoutEnabled: true, deliveryUrl: 'javascript:alert(1)' }).isValid, false);
assert.equal(validateBlockPayload('membership', { price: '9', currency: 'USD', interval: 'weekly', checkoutEnabled: true }).isValid, false);
assert.equal(validateBlockPayload('product', { price: '29', currency: 'USD', checkoutEnabled: true, physicalProduct: true }).isValid, true);
assert.equal(validateBlockPayload('course', { price: '29', currency: 'USD', checkoutEnabled: true, physicalProduct: true, deliveryUrl: 'https://example.com/access', lessons: [{ id: 'l1', title: 'Welcome' }] }).isValid, false);
console.log('Product checkout contract passed.');
