import { LibrarySearch } from '../../library-search';
import { getFixtureMembers, searchFixtureMembers } from '../../fixture-members';
import { requireFixtureLibraryStaff } from '../../fixture-staff-access';
import { fixtureReadError } from '../../fixture-read-error';

export const dynamic = 'force-dynamic';
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await requireFixtureLibraryStaff('/members');
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const members = searchFixtureMembers(getFixtureMembers(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE), query);
  return <main className="library-home"><section className="library-page" aria-label="구성원">
    <LibrarySearch query={query} action="/members" label="이름 검색" maxLength={100} />
    {fixtureReadError(process.env) ? <p className="library-inline-error" role="alert">구성원을 불러오지 못했습니다.</p> : members.length ? <ul className="library-member-list">{members.map(member => <li key={member.id}><strong>{member.name}</strong></li>)}</ul> : <p className="library-empty">구성원이 없습니다.</p>}
  </section></main>;
}
