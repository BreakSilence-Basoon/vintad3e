import { AuditFilterForm } from '../../../audit-filter-form';
import { parseAuditFilters } from '../../../audit-filters';
import { getFixtureAudit, filterFixtureAudit } from '../../../audit-fixture';
import { AuditFixtureList } from '../../../audit-fixture-list';
import { auditNextHref, auditPage } from '../../../audit-pagination';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: '빈타제 > Apparel > 데이터 변경 이력' };
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const filters = parseAuditFilters(params);
  const now = new Date();
  const entries = filterFixtureAudit(getFixtureAudit(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE, now), filters, now);
  const page = auditPage(params.auditPage), visible = entries.slice(0, page * 10);
  return <section className="console-page audit-page"><div className="audit-list"><AuditFilterForm key={[filters.range, filters.from, filters.to, filters.actor, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><AuditFixtureList entries={visible} />{visible.length < entries.length && <nav className="load-more-pager" aria-label="수정 이력 더 불러오기"><span>{visible.length} / {entries.length}</span><Link href={auditNextHref(page + 1, filters)} className="button button--ghost button--small" scroll={false}>더 불러오기</Link></nav>}</div></section>;
}
