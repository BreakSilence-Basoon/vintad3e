import { SalesFilterForm } from '../../../sales-filter-form';
import { parseSalesFilters } from '../../../sales-filters';
import { SalesEmptyToolbar } from '../../../sales-empty-toolbar';

export const dynamic = 'force-dynamic';
export const metadata = { title: '침깨 > Apparel > 판매내역' };
export default async function SalesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseSalesFilters(await searchParams);
  return <section className="console-page sales-history-page"><div className="audit-list sales-audit-list"><SalesEmptyToolbar /><SalesFilterForm key={[filters.range, filters.from, filters.to, filters.source, filters.status, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><p className="audit-empty">아직 표시할 판매내역이 없습니다.</p></div></section>;
}
