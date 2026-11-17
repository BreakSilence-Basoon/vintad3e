import { SalesFilterForm } from '../../sales-filter-form';
import { parseSalesFilters } from '../../sales-filters';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const filters = parseSalesFilters(await searchParams);
  return <main className="floor-console"><section className="sales-history-page"><div className="audit-list sales-audit-list">
    <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}><div style={{margin:0,color:'var(--foreground)',fontFamily:'var(--font-body), sans-serif',fontSize:'clamp(1.08rem, 1.2vw, 1.2rem)',fontWeight:650,lineHeight:1.85}}>Toss 갱신 기록 없음</div></div>
    <SalesFilterForm key={[filters.range,filters.from,filters.to,filters.keyword,filters.sortDirection].join(':')} filters={{from:filters.from,keyword:filters.keyword,range:filters.range,sortDirection:filters.sortDirection,to:filters.to}} />
    <p className="audit-empty">아직 표시할 판매내역이 없습니다.</p>
  </div></section></main>;
}
