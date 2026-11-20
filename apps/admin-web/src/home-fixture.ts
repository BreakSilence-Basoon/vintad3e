import { fixtureApps, getFixtureMembers } from './members-fixture.ts';

const fixtureLinks: Record<string, string> = {
  portal: 'http://127.0.0.1:3825/', timetable: 'http://127.0.0.1:3824/',
  apparel: 'http://127.0.0.1:3826/', supporters: 'http://127.0.0.1:3827/coupon',
  partners: 'http://127.0.0.1:3828/', library: 'http://127.0.0.1:3829/',
  floor: 'http://127.0.0.1:3830/', creative: 'http://127.0.0.1:3831/',
  admin: 'http://127.0.0.1:3832/members',
};
export type FixtureHomeRow = { id: string; name: string; href: string | null; status: '정상'; visit: { name: string; visitedAt: string } | null };
export function getFixtureHome(env: string | undefined, enabled: string | undefined, now: Date): FixtureHomeRow[] | null {
  const members = getFixtureMembers(env, enabled);
  if (!members.length || !Number.isFinite(now.getTime())) return null;
  return fixtureApps.map(app => ({ id: app.id, name: app.name, href: fixtureLinks[app.id] ?? null, status: '정상', visit: app.id === 'portal' ? { name: members[0].displayName, visitedAt: now.toISOString() } : app.id === 'partners' ? { name: members[1].displayName, visitedAt: now.toISOString() } : null }));
}
