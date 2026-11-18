import { redirect } from 'next/navigation';
import { normalizeMonth } from '../../date-time';

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ month?: string | string[] }> }) {
  const params = await searchParams;
  const rawMonth = Array.isArray(params.month) ? params.month[0] : params.month;
  const month = normalizeMonth(rawMonth);
  redirect(`/?view=schedule&month=${encodeURIComponent(month)}`);
}
