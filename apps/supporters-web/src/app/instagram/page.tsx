import { SnsFixturePage } from '../../sns-fixture-page';
import { requireFixtureSupportersAccess } from '../../fixture-access';
export const metadata = { title: '빈타제 > Supporters > Instagram' };

export default async function InstagramPage({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  await requireFixtureSupportersAccess('/instagram');
  return <SnsFixturePage platform="instagram" staff={(await searchParams).staff} />;
}
