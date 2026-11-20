import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('kiosk registration, errors and camera denial work with keyboard input', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_TIMETABLE_FIXTURE: '1', VINTAD3E_TIMETABLE_FIXTURE_ADMIN: '1', VINTAD3E_TIMETABLE_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/admin/kiosks?view=devices`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(origin);
        await page.waitForURL('**/sign-in?next=%2F%3Fview%3Dhistory');
        await page.goto(`${origin}/admin/schedule?month=2026-05`);
        await page.waitForURL('**/sign-in?next=%2Fadmin%2Fschedule%3Fmonth%3D2026-05');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/?view=schedule&month=2026-05');
        await context.clearCookies();
        await page.goto(`${origin}/confirmations/proposal-01`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        await page.goto(`${origin}/auth/session-resume?next=%2Fadmin%2Fkiosks`);
        await page.waitForURL('**/sign-in?next=%2Fadmin%2Fkiosks');
        await enter(page,page.getByRole('button',{name:'회사 계정으로 로그인'}));
        await page.waitForURL('**/admin/kiosks');
        await context.clearCookies();
        await page.goto(`${origin}/kiosk/setup`);
        await page.getByRole('link', { name: 'QR 관리로 이동' }).waitFor();
        await page.goto(`${origin}/admin/kiosks?view=devices`);
        await page.waitForURL('**/sign-in?next=%2Fadmin%2Fkiosks');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/admin/kiosks');
        await page.goto(`${origin}/admin/kiosks?view=devices`);
        const form = page.locator('.kiosk-registration-form');
        const input = form.locator('input[name=label]');
        await input.waitFor();
        assert.equal(await input.evaluate(el => el.validity.valueMissing), true);
        await input.focus(); await page.keyboard.type('   ');
        await enter(page, form.getByRole('button', { name: '등록' }));
        await page.getByRole('alert').waitFor();
        await input.fill('기기 01');
        await page.route('**/api/fixture/kiosk/register', route => route.fulfill({ status: 503, body: '' }));
        await enter(page, form.getByRole('button', { name: '등록' }));
        await page.getByText('기기를 등록하지 못했습니다.', { exact: true }).waitFor();
        await page.unroute('**/api/fixture/kiosk/register');
        await enter(page, form.getByRole('button', { name: '등록' }));
        const device = page.locator('.kiosk-device-list li').filter({ hasText: '기기 01' });
        await device.waitFor();
        const kioskCookies = await context.cookies();
        const kioskCookie = kioskCookies.find(cookie => cookie.name === 'vintad3e-kiosk-device');
        assert.ok(kioskCookie);
        await context.clearCookies();
        await context.addCookies([kioskCookie]);
        await page.goto(origin);
        await page.waitForURL(`${origin}/kiosk`);
        await page.goto(`${origin}/?view=schedule`);
        await page.waitForURL('**/sign-in?next=%2F%3Fview%3Dschedule');
        await enter(page,page.getByRole('button',{name:'회사 계정으로 로그인'}));
        await page.waitForURL('**/?view=schedule');
        await page.goto(`${origin}/kiosk/setup`);
        await page.waitForURL(`${origin}/kiosk`);
        await page.locator('.kiosk-qr-code svg').waitFor();
        await page.goto(`${origin}/admin/kiosks?view=devices`);
        await device.waitFor();
        await enter(page, page.getByRole('button', { name: 'QR 발급 보기' }));
        await page.locator('.kiosk-qr-code svg').waitFor();
        await enter(page, page.getByRole('button', { name: '기기 관리 보기' }));
        await enter(page, device.getByRole('button', { name: '해제' }));
        await device.waitFor({ state: 'detached' });
        await context.clearCookies(); await page.goto(origin);
        await page.waitForURL('**/sign-in?next=%2F%3Fview%3Dhistory');
        await page.goto(`${origin}/admin/attendance`);
        await page.waitForURL('**/sign-in?next=%2Fadmin%2Fattendance');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/admin/attendance');
        await context.clearCookies();
        await page.addInitScript(() => { window.cameraAttempts = 0; navigator.mediaDevices.getUserMedia = async () => { window.cameraAttempts++; throw new DOMException('denied', 'NotAllowedError'); }; });
        await page.goto(`${origin}/scan`);
        await page.waitForURL('**/sign-in?next=%2Fscan');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/scan');
        await page.locator('.employee-scanner p[role=alert]').waitFor();
        const attempts = await page.evaluate(() => window.cameraAttempts);
        await enter(page, page.getByRole('button', { name: '카메라 다시 켜기' }));
        await page.waitForFunction(previous => window.cameraAttempts > previous, attempts);
        await page.locator('.employee-scanner p[role=alert]').waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
