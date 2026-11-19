import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { guideEnabled } from '../../../fixture-guide';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!guideEnabled(process.env.NODE_ENV, process.env.VINTAD3E_PARTNERS_FIXTURE)) notFound();
  const language = (await headers()).get('accept-language')?.toLowerCase().split(',')[0] ?? 'ko';
  redirect(`/proj-bedroom/guide/${language.startsWith('ja') ? 'ja' : language.startsWith('en') ? 'en' : 'ko'}`);
}
