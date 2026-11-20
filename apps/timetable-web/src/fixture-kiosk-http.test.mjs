import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

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
    const denied = await fetch(`${origin}/admin/attendance`, { redirect: 'manual' });
    assert.equal(denied.status, 307);
    assert.match(denied.headers.get('location'), /\/sign-in\?next=%2Fadmin%2Fattendance/);
    const login = await fetch(`${origin}/api/fixture/login`, { method: 'POST', headers: { origin }, body: new URLSearchParams({ next: '/admin/attendance' }), redirect: 'manual' });
    assert.equal(login.status, 303);
    const cookie = login.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);
    assert.equal((await fetch(`${origin}/admin/attendance`, { headers: { cookie }, redirect: 'manual' })).status, 200);
    assert.equal((await post('revoke', { id: device.id })).status, 204);
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});

test('synthetic video frame is scanned through the browser and records attendance', { timeout: 90000 }, async () => {
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1', VINTAD3E_TIMETABLE_FIXTURE_ADMIN: '1', VINTAD3E_TIMETABLE_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Development server exited'); try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.equal(ready, true);
    const executablePath = process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome';
    browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
    const context = await browser.newContext({ permissions: ['camera'], viewport: { width: 390, height: 844 } });
    const kiosk = await context.newPage();
    await kiosk.goto(origin);
    await kiosk.getByRole('button', { name: '회사 계정으로 로그인' }).click();
    await kiosk.waitForURL('**/?view=history');
    await kiosk.evaluate(async () => {
      const response = await fetch('/api/fixture/kiosk/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ label: '기기 01' }) });
      if (!response.ok) throw new Error('Registration failed');
      const device = await response.json(); localStorage.setItem('vintad3e-timetable-fixture-kiosk', device.id);
    });
    await kiosk.goto(`${origin}/kiosk`);
    await kiosk.locator('.kiosk-qr-code svg').waitFor();
    const svg = await kiosk.locator('.kiosk-qr-code svg').evaluate(element => new XMLSerializer().serializeToString(element));
    const scanner = await context.newPage();
    await scanner.addInitScript(markup => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const drawing = canvas.getContext('2d'); drawing.fillStyle = '#fff'; drawing.fillRect(0, 0, 640, 480);
        const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
        await image.decode();
        const render = () => drawing.drawImage(image, 170, 90, 300, 300);
        render(); setInterval(render, 100); return canvas.captureStream(10);
      };
    }, svg);
    await scanner.goto(`${origin}/scan`);
    try { await scanner.getByText('출근 완료', { exact: true }).waitFor({ timeout: 15000 }); }
    catch { throw new Error(`Scanner did not finish: ${await scanner.locator('.employee-scanner__status').innerText()}`); }
    const result = await (await fetch(`${origin}/api/fixture/kiosk/events`)).json();
    assert.equal(result.events.length, 1); assert.equal(result.events[0].eventType, 'CHECK_IN');
    await context.close();
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});
