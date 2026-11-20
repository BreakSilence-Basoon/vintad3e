import { notFound } from 'next/navigation';
import { requireFixtureAdminAccess } from '../../fixture-access';
import { fixtureApps, fixtureGrantActive, fixtureGrants, fixtureTier, getFixtureDirectory } from '../../members-fixture';
import { Selector } from '../../permission-selector';
import { PermissionsMatrix } from '../../permissions-matrix';

const tiers = [{ key: 'admin', label: '어드민' }, { key: 'crew', label: '크루' }, { key: 'guest', label: '게스트' }] as const;
export const dynamic = 'force-dynamic';
export default async function PermissionsPage({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  await requireFixtureAdminAccess('/permissions');
  const members = getFixtureDirectory(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE);
  if (!members.length) notFound();
  const params = await searchParams;
  const tier = tiers.find(item => item.key === params.tier) ?? tiers[0];
  const rows = members.flatMap(member => {
    const grants = fixtureGrants(process.env.NODE_ENV, process.env.VINTAD3E_ADMIN_FIXTURE, member.staffId);
    if (!grants || fixtureTier(member, grants) !== tier.label) return [];
    const access = fixtureApps.map(app => { const grant = grants.find(item => item.appId === app.id && fixtureGrantActive(item, Date.now())); return grant ? (member.memberType === 'partner' ? '게스트' : grant.role === 'ADMIN' ? '어드민' : '크루') : '없음'; });
    return [{ person: { id: member.staffId, name: member.displayName }, access }];
  });
  return <main className="staff-console"><h1 className="preview-visually-hidden">계정 권한</h1><Selector label="계층 선택" value={tier.key} options={tiers.map(item => ({ value: item.key, label: item.label }))} path="/permissions" parameter="tier" /><PermissionsMatrix key={tier.key} tier={tier.label} apps={fixtureApps} rows={rows} /></main>;
}
