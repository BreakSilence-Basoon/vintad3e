import { DjFixtureGuide } from '../../../../fixture-guide';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ slug: string }> }) { return <DjFixtureGuide guideKey={(await params).slug} />; }
