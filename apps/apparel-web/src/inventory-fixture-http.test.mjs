import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('development inventory renders fixture products in the selected collection', { timeout: 60000 }, async () => {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1', VINTAD3E_APPAREL_FIXTURE_ORIGIN: origin }, stdio: 'ignore',
  });
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Development server exited');
      try { response = await fetch(`${origin}/sign-in`); if (response.status === 200) break; } catch {}
      await delay(300);
    }
    assert.equal(response?.status, 200);
    const denied = await fetch(`${origin}/admin/products`, { redirect: 'manual' });
    assert.equal(denied.status, 307);
    assert.equal(new URL(denied.headers.get('location'), origin).pathname, '/sign-in');
    const login = await fetch(`${origin}/api/fixture/login`, { method: 'POST', headers: { origin }, body: new URLSearchParams({ next: '/admin' }), redirect: 'manual' });
    assert.equal(login.status, 303);
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    response = await fetch(`${origin}/admin/products`, { headers: { cookie } });
    const adminEntry = await fetch(`${origin}/admin`, { redirect: 'manual', headers: { cookie } });
    assert.equal(adminEntry.status, 307);
    assert.equal(new URL(adminEntry.headers.get('location'), origin).pathname, '/admin/products');
    const html = await response.text();
    assert.match(html, /product-card__summary/);
    assert.match(html, /반팔 티셔츠/);
    assert.match(html, /재고 수정 창 열기/);
    const collab = await fetch(`${origin}/admin/products?collection=collab`, { headers: { cookie } });
    assert.equal(collab.status, 200);
    assert.match(await collab.text(), /협업 티셔츠/);
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
