export function formatValue(value: unknown, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}

export function formatCurrencyCents(value: number | null | undefined, currency = 'USD') {
  const amount = Number(value ?? 0);
  const dollars = (amount / 100).toFixed(2);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(Number(dollars));
}
