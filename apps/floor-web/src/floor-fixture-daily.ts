import { getSalesFixtures, type FixtureSale } from './sales-fixture.ts';

export type FloorTotals = { fnbNet: number; fnbOrderCount: number; fnbPerOrder: number | null; fnbQuantity: number };
type Comparison = { businessDate: string; weekday: number; totals: FloorTotals };
export type FloorDailyResponse = { businessDate: string; weekday: number; range: { from: string; to: string }; latestBusinessDate: string; lastSoldAt: string | null; lastSyncedAt: string | null; totals: FloorTotals; comparisons: { previousDay: Comparison; lastWeekSameDay: Comparison }; categories: { category: string; quantity: number; net: number }[]; menus: { productName: string; category: string; quantity: number; net: number; listUnitPrice: number | null }[]; hours: { hour: number; fnbNet: number; fnbQuantity: number; orderCount: number }[] };
const dayMs = 86400000;
const businessDate = (date: Date) => new Date(date.getTime() + 4 * 3600000).toISOString().slice(0, 10);
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * dayMs).toISOString().slice(0, 10);
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const floorSales = (env: string | undefined, enabled: string | undefined, now: Date) => getSalesFixtures(env, enabled, now).filter(sale => sale.sourceSystem === 'POS' && sale.paymentStatus === 'PAID');
const rowsForDate = (sales: FixtureSale[], date: string) => sales.filter(sale => businessDate(new Date(sale.soldAt)) === date);
function totals(sales: FixtureSale[]): FloorTotals {
  const fnbNet = sales.reduce((sum, sale) => sum + sale.netAmountValue, 0);
  const fnbOrderCount = sales.length;
  return { fnbNet, fnbOrderCount, fnbPerOrder: fnbOrderCount ? fnbNet / fnbOrderCount : null, fnbQuantity: sales.reduce((sum, sale) => sum + sale.items.reduce((n, item) => n + item.quantity, 0), 0) };
}
export function fixtureMenuTotals(sales: FixtureSale[]): FloorDailyResponse['menus'] {
  const grouped = new Map<string, FloorDailyResponse['menus'][number]>();
  for (const sale of sales) for (const item of sale.items) {
    const previous = grouped.get(item.name);
    if (!previous) grouped.set(item.name, { productName: item.name, category: '음료', quantity: item.quantity, net: item.netAmountValue, listUnitPrice: item.listUnitPrice });
    else { previous.quantity += item.quantity; previous.net += item.netAmountValue; if (previous.listUnitPrice !== item.listUnitPrice) previous.listUnitPrice = null; }
  }
  return [...grouped.values()];
}
export function fixtureFloorDaily(env: string | undefined, enabled: string | undefined, now: Date, requested?: string): FloorDailyResponse {
  const sales = floorSales(env, enabled, now);
  const latestBusinessDate = businessDate(now);
  const date = requested ?? latestBusinessDate;
  const rows = rowsForDate(sales, date);
  const aggregate = totals(rows);
  const comparison = (offset: number): Comparison => { const value = shift(date, offset); return { businessDate: value, weekday: weekday(value), totals: totals(rowsForDate(sales, value)) }; };
  const menus = fixtureMenuTotals(rows);
  const hours = [17,18,19,20,21,22,23,0,1,2,3,4].map(hour => { const matching = rows.filter(sale => new Date(new Date(sale.soldAt).getTime() + 9 * 3600000).getUTCHours() === hour); const current = totals(matching); return { hour, fnbNet: current.fnbNet, fnbQuantity: current.fnbQuantity, orderCount: current.fnbOrderCount }; });
  return { businessDate: date, weekday: weekday(date), range: { from: date, to: date }, latestBusinessDate, lastSoldAt: sales[0]?.soldAt ?? null, lastSyncedAt: null, totals: aggregate, comparisons: { previousDay: comparison(-1), lastWeekSameDay: comparison(-7) }, categories: menus.length ? [{ category: '음료', quantity: aggregate.fnbQuantity, net: aggregate.fnbNet }] : [], menus, hours };
}
export function fixtureFloorTrend(env: string | undefined, enabled: string | undefined, now: Date, request: { days: number } | { from: string; to: string }) {
  const sales = floorSales(env, enabled, now);
  const latestBusinessDate = businessDate(now);
  const from = 'days' in request ? shift(latestBusinessDate, 1 - request.days) : request.from;
  const to = 'days' in request ? latestBusinessDate : request.to;
  const selected = sales.filter(sale => { const date = businessDate(new Date(sale.soldAt)); return date >= from && date <= to; });
  const dates = [...new Set(selected.map(sale => businessDate(new Date(sale.soldAt))))].toSorted().reverse();
  return { from, to, latestBusinessDate, totals: totals(selected), daily: dates.map(date => { const current = totals(rowsForDate(selected, date)); return { businessDate: date, weekday: weekday(date), fnbNet: current.fnbNet, fnbOrderCount: current.fnbOrderCount }; }) };
}
