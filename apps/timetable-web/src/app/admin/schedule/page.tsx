import { notFound, redirect } from 'next/navigation';
import { fixtureAdminSchedulePath } from '../../../fixture-admin-route';
export const dynamic = 'force-dynamic';
type Props = { searchParams?: Promise<{ month?: string | string[] }> };
export default async function AdminSchedulePage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const path = fixtureAdminSchedulePath(process.env.NODE_ENV, process.env.VINTAD3E_TIMETABLE_FIXTURE, process.env.VINTAD3E_TIMETABLE_FIXTURE_ADMIN, params.month);
  if (!path) notFound();
  redirect(path);
}
