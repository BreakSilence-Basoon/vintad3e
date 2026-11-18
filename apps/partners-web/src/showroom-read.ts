function decimal(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d{1,18}(?:\.\d{1,3})?$/.test(value);
}
export function formatStoredWon(value: string) {
  if (!decimal(value)) throw new Error('Invalid stored amount');
  const [whole, fraction] = value.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = whole.replace(/^-/, '').replace(/^0+(?=\d)/, '');
  const significantFraction = fraction?.replace(/0+$/, '');
  return `${sign}${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${significantFraction ? `.${significantFraction}` : ''}원`;
}
