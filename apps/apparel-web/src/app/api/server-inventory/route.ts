import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
import { maxCsvBytes, parseInventoryCsv } from '../../../inventory-csv.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const noStore = { 'cache-control': 'no-store' };
function config(request: Request) {
  const origin = fixtureOrigin(process.env), host = request.headers.get('host');
  if (process.env.VINTAD3E_APPAREL_SERVER_DEMO !== '1' || !origin || host !== new URL(origin).host || !fixtureSession(request.headers.get('cookie'), host, process.env)) return null;
  try {
    const value = process.env.VINTAD3E_APPAREL_SERVER_ORIGIN ?? '', url = new URL(value);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.origin !== value || value === origin) return null;
    return { origin, upstream: value };
  } catch { return null; }
}
async function forward(upstream: string, path: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${upstream}${path}`, { ...options, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(3000) });
    if (!response.ok) return new Response(null, { status: [400, 409, 413].includes(response.status) ? response.status : 503, headers: noStore });
    if (!response.body) throw new Error();
    const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 100000) { await reader.cancel(); throw new Error(); } chunks.push(part.value); } } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!value || Object.keys(value).sort().join(',') !== 'canUndo,revision,rows' || !Number.isSafeInteger(value.revision) || value.revision < 0 || typeof value.canUndo !== 'boolean' || !Array.isArray(value.rows) || value.rows.length > 500) throw new Error();
    const seen = new Set();
    for (const row of value.rows) { if (!row || Object.keys(row).sort().join(',') !== 'name,quantity,sku' || typeof row.sku !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(row.sku) || seen.has(row.sku.toUpperCase()) || typeof row.name !== 'string' || !row.name || row.name.trim() !== row.name || row.name.length > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(row.name) || !Number.isSafeInteger(row.quantity) || row.quantity < 0 || row.quantity > 1000000) throw new Error(); seen.add(row.sku.toUpperCase()); }
    return Response.json(value, { headers: noStore });
  } catch { return new Response(null, { status: 503, headers: noStore }); }
}
export async function GET(request: Request) { const settings = config(request); return settings ? forward(settings.upstream, '/inventory') : new Response(null, { status: 403, headers: noStore }); }
export async function POST(request: Request) {
  const settings = config(request);
  if (!settings || request.headers.get('origin') !== settings.origin) return new Response(null, { status: 403, headers: noStore });
  const revision = request.headers.get('x-inventory-revision') ?? '', action = new URL(request.url).searchParams.get('action');
  if (!/^(0|[1-9]\d{0,14})$/.test(revision) || !Number.isSafeInteger(Number(revision)) || (action !== 'apply' && action !== 'undo')) return new Response(null, { status: 400, headers: noStore });
  let body: Uint8Array | undefined;
  if (action === 'apply') {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/csv' || !request.body) return new Response(null, { status: 400, headers: noStore });
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > maxCsvBytes) { await reader.cancel(); return new Response(null, { status: 413, headers: noStore }); } chunks.push(part.value); } }
    catch { return new Response(null, { status: 400, headers: noStore }); } finally { reader.releaseLock(); }
    body = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    try { parseInventoryCsv(body); } catch { return new Response(null, { status: 400, headers: noStore }); }
  }
  return forward(settings.upstream, `/inventory/${action}`, { method: 'POST', headers: { 'content-type': action === 'apply' ? 'text/csv' : 'application/octet-stream', 'x-inventory-revision': revision }, body: body as BodyInit | undefined });
}
