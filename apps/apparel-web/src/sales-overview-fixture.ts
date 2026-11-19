import type { SalesGrain, SalesOverviewData, SalesOverviewDesignRow } from './sales-overview-types';
import { getFixtureSales } from './sales-fixture.ts';

const DAY = 86400000;
const KST = 9 * 3600000;
type Sale = { at: number; channel: 'store' | 'online'; kind: 'apparel' | 'fnb'; amount: number; units: number; design?: string };
const grainFor = (span: number): SalesGrain => span / DAY > 180 ? 'month' : span / DAY > 45 ? 'week' : span / DAY > 2 ? 'day' : 'hour';
function bucketKey(time: number, grain: SalesGrain) {
  const date = new Date(time + KST);
  if (grain === 'month') return date.toISOString().slice(0, 7);
  if (grain === 'hour') return date.toISOString().slice(0, 13);
  if (grain === 'week') { date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7)); }
  return date.toISOString().slice(0, 10);
}
function label(key: string, grain: SalesGrain) {
  if (grain === 'month') return key.slice(2);
  if (grain === 'hour') return `${Number(key.slice(11, 13))}시`;
  const [, month, day] = key.split('-'); return `${Number(month)}/${Number(day)}`;
}
function buckets(from: number, to: number, grain: SalesGrain) {
  const cursor = new Date(from + KST);
  if (grain === 'month') { cursor.setUTCDate(1); cursor.setUTCHours(0, 0, 0, 0); }
  else if (grain === 'hour') cursor.setUTCMinutes(0, 0, 0);
  else { cursor.setUTCHours(0, 0, 0, 0); if (grain === 'week') cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7)); }
  const result: { bucket: string; label: string; storeRevenue: number; onlineRevenue: number }[] = [];
  for (let index = 0; index < 800 && cursor.getTime() <= to + KST; index++) {
    const key = cursor.toISOString().slice(0, grain === 'month' ? 7 : grain === 'hour' ? 13 : 10);
    result.push({ bucket: key, label: label(key, grain), storeRevenue: 0, onlineRevenue: 0 });
    if (grain === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else if (grain === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else if (grain === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCHours(cursor.getUTCHours() + 1);
  }
  return result;
}
function designs(sales: Sale[], channel: 'store' | 'online'): SalesOverviewDesignRow[] {
  const items = sales.filter(sale => sale.channel === channel && sale.kind === 'apparel');
  const byName = new Map<string, SalesOverviewDesignRow>();
  for (const item of items) {
    const name = item.design ?? '';
    const row = byName.get(name) ?? { productCode: null, designName: name, units: 0, revenue: 0, options: [] };
    row.units += item.units; row.revenue += item.amount;
    row.options = [{ skuCode: null, label: '블랙 / M', units: row.units, revenue: row.revenue }];
    byName.set(name, row);
  }
  return [...byName.values()];
}
export function getSalesOverviewFixture(env: string | undefined, enabled: string | undefined, now: Date, requestedFrom?: string, requestedTo?: string): SalesOverviewData | null {
  if (env !== 'development' || enabled !== '1' || !Number.isFinite(now.getTime())) return null;
  const end = now.getTime(), availableFrom = end - 365 * DAY;
  const from = requestedFrom === undefined ? end - 90 * DAY : Date.parse(requestedFrom);
  const to = requestedTo === undefined ? end : Date.parse(requestedTo);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to || to - from > 366 * DAY || from < availableFrom - DAY || to > end + DAY) return null;
  const anchor = Math.floor((end + KST) / DAY) * DAY - KST - 3600000;
  const sharedSale = getFixtureSales(env, enabled, now).find(sale => sale.id === 'sale-1');
  const allSales: Sale[] = [
    ...(sharedSale ? [{ at: Date.parse(sharedSale.soldAt), channel: 'store' as const, kind: 'apparel' as const, amount: sharedSale.amount, units: sharedSale.quantity, design: sharedSale.item }] : []),
    { at: anchor - 30 * DAY, channel: 'store', kind: 'fnb', amount: 8000, units: 2 },
    { at: anchor - 45 * DAY, channel: 'online', kind: 'apparel', amount: 60000, units: 1, design: '후드' },
    { at: anchor - 100 * DAY, channel: 'online', kind: 'apparel', amount: 35000, units: 1, design: '셔츠' },
  ];
  const sales = allSales.filter(sale => sale.at >= from && sale.at < to);
  const grain = grainFor(to - from), series = buckets(from, to, grain), indexed = new Map(series.map(item => [item.bucket, item]));
  const totals = { storeRevenue: 0, onlineRevenue: 0, storeApparelRevenue: 0, storeFnbRevenue: 0, onlineApparelRevenue: 0 };
  for (const sale of sales) {
    const bucket = indexed.get(bucketKey(sale.at, grain));
    if (sale.channel === 'store') { totals.storeRevenue += sale.amount; if (bucket) bucket.storeRevenue += sale.amount; if (sale.kind === 'apparel') totals.storeApparelRevenue += sale.amount; else totals.storeFnbRevenue += sale.amount; }
    else { totals.onlineRevenue += sale.amount; if (bucket) bucket.onlineRevenue += sale.amount; if (sale.kind === 'apparel') totals.onlineApparelRevenue += sale.amount; }
  }
  return { unconvertedCurrencyTotals: [], onlineRevenueUnavailable: false, rangeFrom: new Date(from).toISOString(), rangeTo: new Date(to).toISOString(), availableFrom: new Date(availableFrom).toISOString(), availableTo: new Date(end).toISOString(), monthly: [], grain, series, totals, onlineApparelByDesign: designs(sales, 'online'), onlineApparelOther: null, storeApparelByDesign: designs(sales, 'store'), storeApparelOther: null };
}
