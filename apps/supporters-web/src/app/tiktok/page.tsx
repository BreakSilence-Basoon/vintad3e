import { SnsFixturePage } from '../../sns-fixture-page';
export const metadata = { title: '침깨 > Supporters > TikTok' };

export default async function TikTokPage({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  return <SnsFixturePage platform="tiktok" staff={(await searchParams).staff} />;
}
