import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}

test('development fixture signs in, opens the local tile and signs out through HTTP', { timeout: 60000 }, async () => {
  const port = await freePort(); const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_PORTAL_FIXTURE: '1', VINTAD3E_PORTAL_FIXTURE_ORIGIN: origin }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error('Development server exited');
      try { const response = await fetch(`${origin}/sign-in`, { redirect: 'manual' }); if (response.status === 200) { ready = true; break; } } catch {}
      await delay(300);
    }
    assert.equal(ready, true);
    const signedOut = await fetch(origin, { redirect: 'manual' });
    assert.ok([303, 307].includes(signedOut.status)); assert.equal(signedOut.headers.get('location'), '/sign-in');
    const form = await (await fetch(`${origin}/sign-in`)).text();
    assert.match(form, /회사 계정으로 로그인/);
    const denied = await fetch(`${origin}/api/fixture/login`, { method: 'POST', redirect: 'manual', headers: { origin: 'http://other.invalid' } });
    assert.equal(denied.status, 403);
    const login = await fetch(`${origin}/api/fixture/login`, { method: 'POST', redirect: 'manual', headers: { origin } });
    assert.equal(login.status, 303); const cookie = login.headers.get('set-cookie').split(';')[0];
    const home = await fetch(origin, { headers: { cookie }, redirect: 'manual' });
    assert.equal(home.status, 200); const html = await home.text();
    assert.match(html, /http:\/\/127\.0\.0\.1:3824\//); assert.match(html, /Timetable/);
    const logout = await fetch(`${origin}/api/fixture/logout`, { method: 'POST', redirect: 'manual', headers: { origin, cookie } });
    assert.equal(logout.status, 303);
    const after = await fetch(origin, { headers: { cookie }, redirect: 'manual' });
    assert.ok([303, 307].includes(after.status)); assert.equal(after.headers.get('location'), '/sign-in');
  } finally {
    child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
