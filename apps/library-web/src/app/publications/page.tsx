import { redirect } from 'next/navigation';

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const { q } = await searchParams;
  redirect(typeof q === 'string' ? `/?q=${encodeURIComponent(q.slice(0, 200))}` : '/');
}
