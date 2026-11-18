import { formatKstDateTime, getCreativeFixtures, projectStatusLabel } from '../creative-fixture';
export const dynamic = 'force-dynamic';
export default function Page() {
  const projects = getCreativeFixtures(process.env.NODE_ENV, process.env.VINTAD3E_CREATIVE_FIXTURE);
  return <main className="staff-console"><header className="staff-page__header"><h1>Creative</h1></header><section className="staff-section" aria-labelledby="projects-title"><div className="staff-section__heading"><h2 id="projects-title">프로젝트</h2></div>{projects.length === 0 ? <div className="staff-empty"><strong>등록된 프로젝트가 없습니다.</strong></div> : <div className="staff-panel"><ul className="staff-list" aria-labelledby="projects-title">{projects.map(project => <li key={project.projectId} className="staff-list__item"><div className="staff-row"><span className="staff-row__title">{project.title}</span><span className="staff-row__detail">{formatKstDateTime(project.updatedAt)} 수정</span><span className="staff-row__aside"><span className="status-pill">{projectStatusLabel[project.status]}</span></span></div></li>)}</ul></div>}</section></main>;
}
