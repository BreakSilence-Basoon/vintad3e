import { AuditFilterForm } from '../../../audit-filter-form';
import { parseAuditFilters } from '../../../audit-filters';
import { getFixtureAudit, filterFixtureAudit } from '../../../audit-fixture';
import { AuditFixtureList } from '../../../audit-fixture-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: '침깨 > Apparel > 데이터 변경 이력' };
export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseAuditFilters(await searchParams);
  const now = new Date();
  const entries = filterFixtureAudit(getFixtureAudit(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE, now), filters, now);
  return <section className="console-page audit-page"><div className="audit-list"><AuditFilterForm key={[filters.range, filters.from, filters.to, filters.actor, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><AuditFixtureList entries={entries} /></div></section>;
}
