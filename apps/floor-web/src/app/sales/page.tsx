import { SalesFilterForm } from '../../sales-filter-form';
import { requireFixtureFloorAccess } from '../../fixture-access';
import { buildSalesHref, parseSalesFilters, parseSalesPage } from '../../sales-filters';
import { getSalesFixtures, filterSalesFixtures, paginateSalesFixtures } from '../../sales-fixture';
import { SalesFixtureList } from '../../sales-fixture-list';
import { LoadMorePager } from '../../load-more-pager';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  await requireFixtureFloorAccess('/');
  const params = await searchParams;
  const filters = parseSalesFilters(params);
  const page = parseSalesPage(params.salesPage);
  const filteredSales = filterSalesFixtures(getSalesFixtures(process.env.NODE_ENV, process.env.VINTAD3E_FLOOR_FIXTURE, new Date()), filters);
  const sales = paginateSalesFixtures(filteredSales, page);
  return <main className="floor-console"><section className="sales-history-page"><div className="audit-list sales-audit-list">
    <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{margin:0,color:'var(--foreground)',fontFamily:'var(--font-body), sans-serif',fontSize:'clamp(1.08rem, 1.2vw, 1.2rem)',fontWeight:650,lineHeight:1.85}}>Toss 갱신 기록 없음</div></div>
    <SalesFilterForm key={[filters.range,filters.from,filters.to,filters.keyword,filters.sortDirection].join(':')} filters={{from:filters.from,keyword:filters.keyword,range:filters.range,sortDirection:filters.sortDirection,to:filters.to}} />
    <SalesFixtureList sales={sales} />
    <LoadMorePager ariaLabel="판매내역 더 불러오기" href={buildSalesHref(page + 1, filters)} label="더 불러오기" totalCount={filteredSales.length} visibleCount={sales.length} />
  </div></section></main>;
}
