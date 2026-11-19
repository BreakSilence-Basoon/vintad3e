import { notFound } from 'next/navigation';
import { fixtureApps, getFixtureMembers } from '../../../members-fixture';
import { fixtureAppId, fixtureAppMembers, fixtureMenuPermissions } from '../../../fixture-app-permissions';
import { Selector } from '../../../permission-selector';

export const dynamic = 'force-dynamic';
export default async function AppPermissions({ searchParams }: { searchParams: Promise<{ app?: string }> }) {
  const env = process.env.NODE_ENV, enabled = process.env.VINTAD3E_ADMIN_FIXTURE;
  if (!getFixtureMembers(env, enabled).length) notFound();
  const appId = fixtureAppId((await searchParams).app);
  const app = fixtureApps.find(item => item.id === appId)!;
  const members = fixtureAppMembers(env, enabled, appId, Date.now());
  const menus = fixtureMenuPermissions(env, enabled, appId);
  return <main className="staff-console"><h1 className="preview-visually-hidden">앱 접근</h1><Selector label="앱 선택" value={appId} options={fixtureApps.map(item => ({ value: item.id, label: item.name }))} path="/permissions/apps" parameter="app" />
    <div className="preview-menu-permissions"><section className="staff-section"><div className="staff-section__heading"><h2>메뉴·화면</h2></div><div className="staff-panel"><div className="staff-table-wrap"><table className="staff-table"><caption className="preview-visually-hidden">{app.name} 메뉴별 권한</caption><thead><tr><th scope="col">메뉴</th><th scope="col">어드민</th><th scope="col">크루</th><th scope="col">게스트</th></tr></thead><tbody>{menus.map(({ menu, admin, crew, guest }) => <tr key={menu}><th scope="row" data-label="메뉴">{menu}</th><td data-label="어드민">{admin}</td><td data-label="크루">{crew}</td><td data-label="게스트">{guest}</td></tr>)}</tbody></table></div></div></section></div>
    <section className="staff-section"><div className="staff-section__heading"><h2>접근하는 사람</h2></div><div className="staff-panel"><div className="staff-table-wrap"><table className="staff-table"><caption className="preview-visually-hidden">{app.name} 접근 구성원</caption><thead><tr><th scope="col">이름</th><th scope="col">계층</th></tr></thead><tbody>{members.map(({ person, access }) => <tr key={person.id}><th scope="row" data-label="이름">{person.name}</th><td data-label="계층">{access}</td></tr>)}</tbody></table></div></div></section>
  </main>;
}
