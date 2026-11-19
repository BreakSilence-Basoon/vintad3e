import { BedroomFixtureGuide } from '../../../../bedroom-fixture-guide';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ language: string }> }) { return <BedroomFixtureGuide language={(await params).language} />; }
