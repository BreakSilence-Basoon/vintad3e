import { getPublicFixture } from '../../../../../../fixture-public-object';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  const object = getPublicFixture(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, kind, id);
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" };
  if (!object) return new Response(null, { status: 404, headers });
  return new Response(object.body, { headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8' } });
}
