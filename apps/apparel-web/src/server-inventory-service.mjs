import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { maxCsvBytes, parseInventoryCsv } from './inventory-csv.mjs';

export function createInventoryService() {
  let revision = 0, rows = [{ sku: 'SHIRT-001', name: '셔츠', quantity: 12 }], previous = null;
  return {
    read: () => ({ revision, rows: structuredClone(rows), canUndo: previous !== null }),
    apply(expected, bytes) { const parsed = parseInventoryCsv(bytes); if (expected !== revision) return false; previous = rows; rows = parsed; revision++; return true; },
    undo(expected) { if (expected !== revision || previous === null) return false; rows = previous; previous = null; revision++; return true; },
  };
}

// Local-only demonstration service; it deliberately does not provide real authentication or durable storage.
export function createInventoryHttpServer() {
  const state = createInventoryService();
  return createServer(async (request, response) => {
    const send = (status, body = '') => { response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); response.end(body); };
    if (request.method === 'GET' && request.url === '/inventory') return send(200, JSON.stringify(state.read()));
    if (request.method !== 'POST' || !['/inventory/apply', '/inventory/undo'].includes(request.url)) return send(404);
    const version = request.headers['x-inventory-revision'];
    if (typeof version !== 'string' || !/^(0|[1-9]\d{0,14})$/.test(version) || !Number.isSafeInteger(Number(version))) return send(400);
    try {
      if (request.url === '/inventory/undo') return state.undo(Number(version)) ? send(200, JSON.stringify(state.read())) : send(409);
      if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'text/csv') return send(400);
      let size = 0; const chunks = [];
      for await (const chunk of request) { size += chunk.length; if (size > maxCsvBytes) return send(413); chunks.push(chunk); }
      return state.apply(Number(version), Buffer.concat(chunks)) ? send(200, JSON.stringify(state.read())) : send(409);
    } catch { return send(400); }
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const raw = process.env.VINTAD3E_APPAREL_SERVER_PORT || '3840';
  if (!/^[0-9]{1,5}$/.test(raw) || Number(raw) < 1024 || Number(raw) > 65535) throw new Error('invalid local port');
  createInventoryHttpServer().listen(Number(raw), '127.0.0.1', () => process.stdout.write('Inventory service ready on loopback.\n'));
}
