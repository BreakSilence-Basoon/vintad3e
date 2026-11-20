import { SalesFilterForm } from '../../../sales-filter-form';
import { parseSalesFilters } from '../../../sales-filters';
import { SalesEmptyToolbar } from '../../../sales-empty-toolbar';
import { getFixtureSales, filterFixtureSales } from '../../../sales-fixture';
import { SalesFixtureList } from '../../../sales-fixture-list';
import { SalesFixtureWorkspace } from '../../../sales-fixture-workspace';
import { salesPage } from '../../../sales-pagination';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 판매내역' };
export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseSalesFilters(params);
  const now = new Date();
  const fixture = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_APPAREL_FIXTURE === '1';
  const allSales = getFixtureSales(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE, now);
  const sales = filterFixtureSales(allSales, filters, now);
  return <section className="console-page sales-history-page"><div className="audit-list sales-audit-list">{fixture ? <SalesFixtureWorkspace sales={allSales} filters={filters} now={now.toISOString()} page={salesPage(params.salesPage)} /> : <><SalesEmptyToolbar /><SalesFilterForm key={[filters.range, filters.from, filters.to, filters.source, filters.status, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><SalesFixtureList sales={sales} /></>}</div></section>;
}
