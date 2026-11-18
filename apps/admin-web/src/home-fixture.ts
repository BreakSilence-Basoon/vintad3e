import { fixtureApps, getFixtureMembers } from './members-fixture.ts';

export type FixtureHomeRow = { id: string; name: string; status: '정상'; visit: { name: string; visitedAt: string } | null };
export function getFixtureHome(env: string | undefined, enabled: string | undefined, now: Date): FixtureHomeRow[] | null {
  const members = getFixtureMembers(env, enabled);
  if (!members.length || !Number.isFinite(now.getTime())) return null;
  return fixtureApps.map(app => ({ id: app.id, name: app.name, status: '정상', visit: app.id === 'portal' ? { name: members[0].displayName, visitedAt: now.toISOString() } : app.id === 'partners' ? { name: members[1].displayName, visitedAt: now.toISOString() } : null }));
}
