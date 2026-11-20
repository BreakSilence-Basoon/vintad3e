export function normalizeSkuAliasSearchText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/g, ' ').trim();
}
export function getSkuSearchTerms(value: string) {
  return normalizeSkuAliasSearchText(value).split(' ').filter(Boolean);
}
export function getSkuOptionAliasSearchText(value: string | null | undefined) {
  return value ?? '';
}
export function getSignatureColorAliasSearchText({ color }: { candidateColors?: string[]; color?: string | null; productName?: string | null; seriesLabel?: string | null }) {
  return color ?? '';
}
