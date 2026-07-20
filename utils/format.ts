export function formatValue(value: unknown, fallback = 'Not provided') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  return String(value);
}
