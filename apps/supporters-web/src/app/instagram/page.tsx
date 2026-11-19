import { SnsFixturePage } from '../../sns-fixture-page';
export const metadata = { title: '침깨 > Supporters > Instagram' };

export default async function InstagramPage({ searchParams }: { searchParams: Promise<{ staff?: string | string[] }> }) {
  return <SnsFixturePage platform="instagram" staff={(await searchParams).staff} />;
}
