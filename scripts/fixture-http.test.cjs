const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { probe } = require('./fixture-http.cjs');

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  try { await run(server.address().port); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test('returns the status only after the response ends', async () => {
  await withServer((_, response) => { response.writeHead(400); response.end('fixture'); }, async (port) => {
    assert.equal(await probe(port), 400);
  });
});

test('a truncated response fails instead of hanging', async () => {
  await withServer((_, response) => {
    response.writeHead(200, { 'Content-Length': '100' });
    response.write('x');
    setTimeout(() => response.socket?.destroy(), 10);
  }, async (port) => {
    assert.equal(await probe(port, { timeoutMs: 500 }), null);
  });
});

test('a response that never finishes reaches a bounded failure', async () => {
  await withServer((_, response) => { response.writeHead(200); response.write('x'); }, async (port) => {
    const start = Date.now();
    assert.equal(await probe(port, { timeoutMs: 100 }), null);
    assert.ok(Date.now() - start < 1500);
  });
});
