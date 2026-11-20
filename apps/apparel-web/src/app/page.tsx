import { DashboardFixtureHome } from '../dashboard-fixture-home';
import { getFixtureInventory } from '../inventory-fixture';
import { fixtureOrigin, fixtureSession } from '../fixture-session.mjs';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const requestHeaders = await headers();
  const origin = fixtureOrigin(process.env);
  if (origin && requestHeaders.get('host') === new URL(origin).host && !fixtureSession(requestHeaders.get('cookie'), requestHeaders.get('host'), process.env)) redirect('/sign-in?next=%2F');
  const params = await searchParams;
  return <DashboardFixtureHome reauthError={params.source === 'home-cafe24-reauth' && params.status === 'error'} products={getFixtureInventory(process.env.NODE_ENV, process.env.VINTAD3E_APPAREL_FIXTURE)} />;
}
