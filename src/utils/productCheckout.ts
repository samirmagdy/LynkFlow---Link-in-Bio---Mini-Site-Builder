const STRIPE_CURRENCIES = new Set(['aud', 'cad', 'eur', 'gbp', 'sar', 'usd']);

const CURRENCY_ALIASES: Record<string, string> = {
  '$': 'usd',
  'usd': 'usd',
  'us dollar': 'usd',
  '€': 'eur',
  'eur': 'eur',
  '£': 'gbp',
  'gbp': 'gbp',
  '﷼': 'sar',
  'sar': 'sar',
  'a$': 'aud',
  'aud': 'aud',
  'c$': 'cad',
  'cad': 'cad',
};

export function normalizeProductCurrency(value: unknown): string | null {
  const normalized = String(value || '').trim().toLowerCase();
  const currency = CURRENCY_ALIASES[normalized] || normalized;
  return STRIPE_CURRENCIES.has(currency) ? currency : null;
}

export function parseProductPrice(value: unknown): { amountInCents: number; display: string } | null {
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) return null;
  const amountInCents = Math.round(amount * 100);
  return amountInCents > 0 ? { amountInCents, display: amount.toFixed(2) } : null;
}
