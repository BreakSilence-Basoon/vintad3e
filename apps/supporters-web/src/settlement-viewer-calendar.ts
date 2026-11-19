export function settlementViewerLastYear(currentYear: number): number {
  return Math.max(2027, currentYear + 1);
}

export function settlementViewerMonths(year: number): number[] {
  const start = year === 2026 ? 10 : 1;
  return Array.from({ length: 13 - start }, (_, index) => start + index);
}

export function koreanYear(now: Date): number {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCFullYear();
}

export function nextKoreanYearBoundary(now: Date): number {
  return Date.UTC(koreanYear(now) + 1, 0, 1) - 9 * 60 * 60 * 1000;
}
