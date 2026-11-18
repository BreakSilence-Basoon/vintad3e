import { getFixtureSource } from '../../../../../library-fixture';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const source = getFixtureSource(process.env.NODE_ENV, process.env.VINTAD3E_LIBRARY_FIXTURE, id);
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' };
  if (!source) return new Response(null, { status: 404, headers });
  const bytes = Buffer.from(source.body, 'utf8');
  const filename = encodeURIComponent(source.filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16)}`);
  return new Response(bytes, { headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="document"; filename*=UTF-8''${filename}`, 'Content-Security-Policy': "sandbox; default-src 'none'", 'Content-Length': String(bytes.length) } });
}
