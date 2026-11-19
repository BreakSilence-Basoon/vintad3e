import { SalesFilterForm } from '../../../sales-filter-form';
import { parseSalesFilters } from '../../../sales-filters';
import { SalesEmptyToolbar } from '../../../sales-empty-toolbar';
import { getFixtureSales, filterFixtureSales } from '../../../sales-fixture';
import { SalesFixtureList } from '../../../sales-fixture-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 판매내역' };
export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseSalesFilters(await searchParams);
  const now = new Date();
  const sales = filterFixtureSales(getFixtureSales(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE, now), filters, now);
  return <section className="console-page sales-history-page"><div className="audit-list sales-audit-list"><SalesEmptyToolbar /><SalesFilterForm key={[filters.range, filters.from, filters.to, filters.source, filters.status, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><SalesFixtureList sales={sales} /></div></section>;
}
