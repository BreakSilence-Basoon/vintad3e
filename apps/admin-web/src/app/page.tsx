import { notFound } from 'next/navigation';
import { getFixtureHome } from '../home-fixture';
import { formatKstDateTime } from '../members-fixture';
import { StatusRefresh } from '../status-refresh';

export const dynamic = 'force-dynamic';
export default function Home() {
  const rows = getFixtureHome(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE, new Date());
  if (!rows) notFound();
  return <main className="staff-console"><StatusRefresh /><h1 className="preview-visually-hidden">홈</h1><div className="matrix-scroll home-scroll" role="region" aria-label="앱 실행 및 방문 현황" tabIndex={0}><table className="matrix-table home-matrix"><caption className="preview-visually-hidden">앱 실행 및 방문 현황</caption><thead><tr><th scope="col">앱</th><th scope="col">상태</th><th scope="col">마지막 방문자</th><th scope="col">마지막 방문 시각</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.href ? <a className="admin-link" href={row.href}>{row.name}</a> : row.name}</th><td><span className="status-pill status-pill--live">{row.status}</span></td><td>{row.visit?.name}</td><td>{row.visit ? formatKstDateTime(row.visit.visitedAt) : ''}</td></tr>)}</tbody></table></div></main>;
}
