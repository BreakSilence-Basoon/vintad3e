import { AuditFilterForm } from '../../../audit-filter-form';
import { parseAuditFilters } from '../../../audit-filters';

export const dynamic = 'force-dynamic';
export const metadata = { title: '침깨 > Apparel > 데이터 변경 이력' };
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseAuditFilters(await searchParams);
  return <section className="console-page audit-page"><div className="audit-list"><AuditFilterForm key={[filters.range, filters.from, filters.to, filters.actor, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><p className="audit-empty">아직 표시할 수정 이력이 없습니다.</p></div></section>;
}
