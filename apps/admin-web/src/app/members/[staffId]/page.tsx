import Link from 'next/link';
import { requireFixtureAdminAccess } from '../../../fixture-access';
import { notFound } from 'next/navigation';
import { fixtureGrantDisplay, fixtureGrants, fixtureTier, formatKstDateTime, getFixtureDirectory } from '../../../members-fixture';

export const dynamic = 'force-dynamic';
function Field({ label, value }: { label: string; value: string }) { return <div className="staff-list__item staff-row"><dt className="staff-row__detail">{label}</dt><dd className="staff-row__title">{value}</dd></div>; }
export default async function MemberPage({ params }: { params: Promise<{ staffId: string }> }) {
  const { staffId } = await params;
  await requireFixtureAdminAccess(`/members/${staffId}`);
  const member = getFixtureDirectory(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE).find(item => item.staffId === staffId);
  const grants = fixtureGrants(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE, staffId);
  if (!member || !grants) notFound();
  return <main className="staff-console"><header className="staff-page__header"><h1 className="admin-break">{member.displayName}</h1></header><nav className="admin-actions" aria-label="Admin 화면"><Link href="/permissions" className="button button--ghost button--small">계정 권한</Link></nav>
    <section className="staff-section" aria-labelledby="profile-title"><div className="staff-section__heading"><h2 id="profile-title">구성원 정보</h2></div><div className="staff-panel"><dl className="staff-list"><Field label="이메일" value={member.primaryEmail} /><Field label="계층" value={fixtureTier(member, grants)} /><Field label="상태" value={member.status} /><Field label="직책" value={member.positionTitle ?? '지정 안 됨'} /><Field label="등급" value={member.gradeLabel ?? '지정 안 됨'} /></dl></div></section>
    <section className="staff-section" aria-labelledby="grants-title"><div className="staff-section__heading"><h2 id="grants-title">앱 권한</h2></div>{grants.length === 0 ? <div className="staff-empty" role="status"><strong>부여된 앱 권한이 없습니다.</strong></div> : <div className="staff-panel"><div className="staff-table-wrap"><table className="staff-table"><caption>앱 {grants.length}개</caption><thead><tr><th scope="col">앱</th><th scope="col">역할</th><th scope="col">상태</th><th scope="col">시작</th><th scope="col">종료</th></tr></thead><tbody>{grants.map(grant => { const display = fixtureGrantDisplay(grant, Date.now()); return <tr key={grant.appId}><th scope="row" data-label="앱">{grant.appName}</th><td data-label="역할">{grant.role === 'ADMIN' ? '어드민' : member.memberType === 'partner' ? '게스트' : '크루'}</td><td data-label="상태"><span className={display.tone === 'live' ? 'status-pill status-pill--live' : display.tone === 'warning' ? 'status-pill status-pill--warning' : 'status-pill'}>{display.label}</span></td><td data-label="시작">{formatKstDateTime(grant.validFrom)}</td><td data-label="종료">{grant.validUntil === null ? '종료일 없음' : formatKstDateTime(grant.validUntil)}</td></tr>; })}</tbody></table></div></div>}</section>
  </main>;
}
