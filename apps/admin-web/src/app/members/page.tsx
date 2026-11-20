import Link from 'next/link';
import { requireFixtureAdminAccess } from '../../fixture-access';
import { fixtureMemberPage, fixtureMemberType, getFixtureDirectory, memberTypeLabel } from '../../members-fixture';

export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string | string[]; cursor?: string | string[] }> }) {
  await requireFixtureAdminAccess('/members');
  const fixtures = getFixtureDirectory(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE);
  const params = await searchParams;
  const type = fixtures.length ? fixtureMemberType(params.type) : 'employee';
  const selected = type ?? 'employee', label = memberTypeLabel[selected];
  const page = fixtureMemberPage(fixtures, selected, params.cursor);
  const members = page?.rows ?? [];
  const failed = process.env.NODE_ENV === 'development' && process.env.VINTAD3E_ADMIN_FIXTURE === '1' && process.env.VINTAD3E_ADMIN_MEMBERS_STATE === 'error';
  return <main className="staff-console"><header className="staff-page__header"><h1>구성원</h1></header>
    {fixtures.length ? <nav className="admin-actions" aria-label="Admin 화면">{(['employee', 'partner'] as const).map(item => <Link key={item} href={`/members?type=${item}`} className={item === selected ? 'button button--primary button--small' : 'button button--ghost button--small'} aria-current={item === selected ? 'page' : undefined}>{memberTypeLabel[item]}</Link>)}<Link href="/audit" className="button button--ghost button--small">변경 기록</Link></nav> : null}
    <section className="staff-section" aria-labelledby="members-title"><div className="staff-section__heading"><h2 id="members-title">{label}</h2></div>
      {type === null || !page ? <div className="staff-error" role="alert"><strong>이 목록을 이어서 볼 수 없습니다.</strong>목록이 바뀌었거나 주소가 올바르지 않습니다. 처음부터 다시 확인해주세요.<div className="admin-actions"><Link href={`/members?type=${selected}`} className="button button--ghost button--small">처음부터 보기</Link></div></div> : failed ? <div className="staff-error" role="alert"><strong>구성원 목록을 불러오지 못했습니다.</strong>회사 권한 서비스에 연결할 수 없습니다. 새로고침해 다시 확인할 수 있습니다.</div> : !members.length ? <div className="staff-empty" role="status"><strong>등록된 {label}이 없습니다.</strong></div> : <><div className="staff-panel"><div className="staff-table-wrap"><table className="staff-table"><caption>{label} {members.length}명{page.next ? ' · 다음 목록 있음' : ''}</caption><thead><tr><th scope="col">이름</th><th scope="col">이메일</th><th scope="col">상태</th><th scope="col">직책</th><th scope="col">등급</th></tr></thead><tbody>{members.map(member => <tr key={member.staffId}><th scope="row" data-label="이름"><Link className="admin-link" href={`/members/${member.staffId}`}>{member.displayName}</Link></th><td data-label="이메일">{member.primaryEmail}</td><td data-label="상태">{member.status}</td><td data-label="직책">{member.positionTitle ?? '없음'}</td><td data-label="등급">{member.gradeLabel ?? '없음'}</td></tr>)}</tbody></table></div></div>{(page.previous || page.next) && <nav className="admin-actions" aria-label="목록 이동">{page.previous && <Link href={`/members?type=${selected}`} className="button button--ghost">처음부터 보기</Link>}{page.next && <Link href={`/members?type=${selected}&cursor=${encodeURIComponent(page.next)}`} className="button button--ghost">다음 목록</Link>}</nav>}</>}
    </section></main>;
}
