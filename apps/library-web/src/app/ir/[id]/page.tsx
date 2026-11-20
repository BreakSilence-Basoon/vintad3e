import { FixtureInternalDocument } from '../../../fixture-internal-document';
export const dynamic = 'force-dynamic';
export const metadata = { title:'빈타제 > Library > 문서' };
export default async function Page({ params }: { params: Promise<{ id:string }> }) { const { id } = await params; return <FixtureInternalDocument kind="ir" documentId={id} />; }
