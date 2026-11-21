export type RangeSelection = { s: number; e: number };

export function nextRangeForKey(selection: RangeSelection, minSelection: number, dayFraction: number, which: 'start' | 'end', key: string): RangeSelection | null {
  const minimum = which === 'start' ? 0 : Math.min(1, selection.s + minSelection);
  const maximum = which === 'start' ? Math.max(0, selection.e - minSelection) : 1;
  const current = which === 'start' ? selection.s : selection.e;
  let next = current;
  if (key === 'Home') next = minimum;
  else if (key === 'End') next = maximum;
  else if (key === 'ArrowRight' || key === 'ArrowUp') next = current + dayFraction;
  else if (key === 'ArrowLeft' || key === 'ArrowDown') next = current - dayFraction;
  else if (key === 'PageUp') next = current + 7 * dayFraction;
  else if (key === 'PageDown') next = current - 7 * dayFraction;
  else return null;
  next = Math.max(minimum, Math.min(maximum, next));
  return which === 'start' ? { ...selection, s: next } : { ...selection, e: next };
}
