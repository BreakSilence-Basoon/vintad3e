import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('development project list renders the source layout with fixture data', { timeout: 60000 }, async () => {
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_CREATIVE_FIXTURE:'1',VINTAD3E_CREATIVE_FIXTURE_ORIGIN:origin}, stdio:'ignore' });
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Development server exited');
      try { response = await fetch(origin + '/sign-in'); if (response.status === 200) break; } catch {}
      await delay(300);
    }
    assert.equal(response?.status, 200);
    const anonymous = await fetch(origin, { redirect:'manual' }); assert.equal(anonymous.status, 307);
    const homeLogin = await fetch(origin + '/api/fixture/login', { method:'POST', headers:{ origin }, body:new URLSearchParams({ next:'/' }), redirect:'manual' });
    const homeCookie = homeLogin.headers.get('set-cookie').split(';')[0];
    response = await fetch(origin, { headers:{ cookie:homeCookie } });
    const html = await response.text();
    assert.match(html, /class="staff-list"/);
    assert.match(html, /매장 촬영/);
    assert.match(html, /홍보 자료/);
    assert.match(html, /제작 중/);
    assert.match(html, /기획/);
    assert.equal((await fetch(`${origin}/confirmations/proposal-01`, { redirect: 'manual' })).status, 307);
    assert.equal((await fetch(`${origin}/confirmations/unknown`, { redirect: 'manual' })).status, 404);
    const login = await fetch(`${origin}/api/fixture/login`, { method: 'POST', headers: { origin }, body: new URLSearchParams({ next: '/confirmations/proposal-01' }), redirect: 'manual' });
    assert.equal(login.status, 303);
    assert.equal(login.headers.get('location'), '/confirmations/proposal-01');
    const cookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await fetch(`${origin}/confirmations/proposal-01`, { headers: { cookie } })).status, 200);
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null && child.signalCode === null) await Promise.race([once(child,'exit'),delay(5000)]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});
