export function calculateFixtureFormula(config, amount) {
  if (!config || typeof config !== 'object' || Array.isArray(config) || config.method !== 'rate' || !Number.isSafeInteger(config.numerator) || !Number.isSafeInteger(config.denominator) || config.numerator < 0 || config.denominator <= 0 || !Number.isSafeInteger(amount) || amount < 0) return null;
  const numerator = BigInt(amount) * BigInt(config.numerator);
  const denominator = BigInt(config.denominator);
  const result = (numerator + denominator / 2n) / denominator;
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : null;
}
