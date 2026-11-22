import { getFixtureObject } from '../../../../../fixture-object';
import { getFixtureUpload } from '../../../../../fixture-upload.mjs';
import { readFixtureIrIsolatedObject } from '../../../../../fixture-ir-confirmation.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, { params }: { params: Promise<{ objectId: string }> }) {
  const { objectId } = await params;
  const isolated = readFixtureIrIsolatedObject(request.headers.get('cookie'), request.headers.get('host'), process.env);
  const object = getFixtureObject(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, objectId) ?? getFixtureUpload(request.headers.get('cookie'), request.headers.get('host'), process.env, Date.now(), objectId) ?? (isolated?.id === objectId ? isolated : null);
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" };
  if (!object) return Response.json({ error: 'not_found' }, { status: 404, headers });
  const filename = encodeURIComponent(object.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`);
  return new Response(object.body, { headers: { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Disposition': `attachment; filename="object.txt"; filename*=UTF-8''${filename}` } });
}
