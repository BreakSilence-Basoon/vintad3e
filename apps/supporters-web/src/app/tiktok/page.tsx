import { SnsFixturePage } from '../../sns-fixture-page';
import { requireFixtureSupportersAccess } from '../../fixture-access';
export const metadata = { title: '빈타제 > Supporters > TikTok' };

export default async function TikTokPage({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  await requireFixtureSupportersAccess('/tiktok');
  return <SnsFixturePage platform="tiktok" staff={(await searchParams).staff} />;
}
