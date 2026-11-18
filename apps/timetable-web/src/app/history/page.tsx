import { redirect } from 'next/navigation';
import { buildHistoryHref, parseHistoryFilters, parseHistoryPage } from '../../history-filters';

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  redirect(buildHistoryHref(parseHistoryFilters(params), parseHistoryPage(params.historyPage), true));
}
