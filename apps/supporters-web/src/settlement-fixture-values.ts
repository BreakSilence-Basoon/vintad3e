// Display-only synthetic values; these do not calculate or authorize payments.
export function fixturePayoutAmount(staff: string, month: string): number | null {
  if (month !== '2026-10') return null;
  if (staff === 'supporter-1') return 10000;
  if (staff === 'supporter-2') return 20000;
  return null;
}
