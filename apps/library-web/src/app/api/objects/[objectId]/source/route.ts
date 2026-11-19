import { getFixtureObject } from '../../../../../fixture-object';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ objectId: string }> }) {
  const { objectId } = await params;
  const object = getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, objectId);
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" };
  if (!object) return new Response(null, { status: 404, headers });
  const filename = encodeURIComponent(object.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`);
  return new Response(object.body, { headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="object.txt"; filename*=UTF-8''${filename}` } });
}
