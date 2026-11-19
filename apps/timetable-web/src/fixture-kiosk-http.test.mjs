import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';

test('local kiosk issues a one-use QR challenge and records its synthetic event', { timeout: 90000 }, async () => {
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1', VINTAD3E_TIMETABLE_FIXTURE_ADMIN: '1', VINTAD3E_TIMETABLE_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  const post = (action, body) => fetch(`${origin}/api/fixture/kiosk/${action}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Development server exited'); try { if ((await fetch(`${origin}/admin/kiosks`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.equal(ready, true);
    const device = await (await post('register', { label: '기기 01' })).json();
    const challenge = await (await post('challenge', { id: device.id })).json();
    assert.equal((await post('scan', { token: challenge.token })).status, 200);
    assert.equal((await post('scan', { token: challenge.token })).status, 404);
    const events = await (await fetch(`${origin}/api/fixture/kiosk/events`)).json();
    assert.equal(events.events.length, 1);
    assert.equal(events.events[0].eventType, 'CHECK_IN');
    assert.equal((await fetch(`${origin}/admin/attendance`)).status, 200);
    assert.equal((await post('revoke', { id: device.id })).status, 204);
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});
