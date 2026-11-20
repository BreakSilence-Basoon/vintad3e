import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { fixtureAdminSchedulePath } from '../../../fixture-admin-route';
import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
type Props = { searchParams?: Promise<{ month?: string | string[] }> };
export default async function AdminSchedulePage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const path = fixtureAdminSchedulePath(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN, params.month);
  if (!path) notFound();
  const origin = fixtureOrigin(process.env), requestHeaders = await headers(), host = requestHeaders.get('host');
  if (!origin || host !== new URL(origin).host) notFound();
  if (!fixtureSession(requestHeaders.get('cookie'), host, process.env)) {
    const month = new URL(path, origin).searchParams.get('month');
    redirect(`/sign-in?${new URLSearchParams({ next: `/admin/schedule?month=${month}` })}`);
  }
  redirect(path);
}
