import { fixtureOrigin, fixtureSession } from '../../../fixture-session.mjs';
import { maxCsvBytes, parseInventoryCsv } from '../../../inventory-csv.mjs';
import { openInventoryStore, readInventory, undoInventory, writeInventory } from '../../../local-inventory-store.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const noStore = { 'cache-control': 'no-store' };

function authorized(request: Request) {
  const origin = fixtureOrigin(process.env), host = request.headers.get('host');
  return process.env.VINTAD3E_APPAREL_LOCAL_DB === '1' && origin && host === new URL(origin).host && fixtureSession(request.headers.get('cookie'), host, process.env) ? origin : null;
}
export async function GET(request: Request) {
  if (!authorized(request)) return new Response(null, { status: 403, headers: noStore });
  try { const db = openInventoryStore(process.cwd(), process.env.VINTAD3E_APPAREL_TEST_DB_ID); try { return Response.json(readInventory(db), { headers: noStore }); } finally { db.close(); } }
  catch { return new Response(null, { status: 503, headers: noStore }); }
}
export async function POST(request: Request) {
  const origin = authorized(request);
  if (!origin || request.headers.get('origin') !== origin) return new Response(null, { status: 403, headers: noStore });
  const revisionText = request.headers.get('x-inventory-revision') ?? '';
  if (!/^(0|[1-9]\d{0,14})$/.test(revisionText) || !Number.isSafeInteger(Number(revisionText))) return new Response(null, { status: 400, headers: noStore });
  const action = new URL(request.url).searchParams.get('action');
  if (action !== 'apply' && action !== 'undo') return new Response(null, { status: 400, headers: noStore });
  let rows;
  if (action === 'apply') {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'text/csv' || !request.body) return new Response(null, { status: 400, headers: noStore });
    const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > maxCsvBytes) { await reader.cancel(); return new Response(null, { status: 413, headers: noStore }); } chunks.push(part.value); } }
    catch { return new Response(null, { status: 400, headers: noStore }); }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    try { rows = parseInventoryCsv(bytes); } catch { return new Response(null, { status: 400, headers: noStore }); }
  }
  try {
    const db = openInventoryStore(process.cwd(), process.env.VINTAD3E_APPAREL_TEST_DB_ID);
    try {
      const ok = action === 'undo' ? undoInventory(db, Number(revisionText)) : writeInventory(db, Number(revisionText), rows);
      return ok ? Response.json(readInventory(db), { headers: noStore }) : new Response(null, { status: 409, headers: noStore });
    } finally { db.close(); }
  } catch { return new Response(null, { status: 503, headers: noStore }); }
}
