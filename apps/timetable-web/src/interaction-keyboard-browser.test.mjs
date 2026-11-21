import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('kiosk registration, errors and camera denial work with keyboard input', { timeout: 180000 }, async () => {
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
        for (const [error, title] of [['AccessDenied', '로그인을 완료하지 못했습니다.'], ['SessionExpired', '다시 로그인이 필요합니다.'], ['__proto__', '로그인을 완료하지 못했습니다.']]) {
          await page.goto(`${origin}/sign-in?next=%2Fadmin%2Fschedule%3Fmonth%3D2026-05&error=${error}`);
          await page.getByRole('alert').locator('strong').filter({ hasText: title }).waitFor();
          await page.waitForFunction(() => !new URL(location.href).searchParams.has('error'));
          assert.equal(new URL(page.url()).searchParams.get('next'), '/admin/schedule?month=2026-05');
        }
        await page.reload();
        assert.equal(await page.locator('.staff-sign-in-toast').count(), 0);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/?view=schedule&month=2026-05');
        assert.equal(await page.locator('[aria-label="1/2 출근부"] .timetable-page-loading').count(), 1);
        await enter(page, page.getByRole('button', { name: '출근부 보기' }));
        await page.waitForURL('**/?view=history&month=2026-05');
        await page.locator('[aria-label="1/2 출근부"] .attendance-history-list').waitFor();
        assert.equal(await page.locator('[aria-label="2/2 근무시간표"] .timetable-page-loading').count(), 1);
        await enter(page, page.getByRole('button', { name: '근무시간표 보기' }));
        await page.waitForURL('**/?view=schedule&month=2026-05');
        await page.locator('[aria-label="2/2 근무시간표"] .schedule-calendar-page').waitFor();
        await page.getByRole('link', { name: 'QR 코드 스캔' }).waitFor();
        const scanIcon = await page.getByRole('link', { name: 'QR 코드 스캔' }).locator('svg').boundingBox();
        assert.ok(scanIcon && scanIcon.width <= 30 && scanIcon.height <= 30);
        await page.goto(`${origin}/sign-in?next=%2F%3Fview%3Dschedule%26month%3D2026-05`);
        await page.waitForURL('**/?view=schedule&month=2026-05');
        await enter(page, page.getByRole('link', { name: '로그인 전 화면 보기, staff01@example.invalid' }));
        await page.goto(`${origin}/sign-in?mode=cover&mode=other&next=%2F%3Fview%3Dschedule%26month%3D2026-05`);
        await enter(page, page.getByRole('link', { name: 'Timetable로 돌아가기' }));
        await page.waitForURL('**/?view=schedule&month=2026-05');
        await page.goto(`${origin}/?view=schedule&view=history&month=2024-02&month=2024-03`);
        await page.locator('[data-calendar-month="2024-02"]').waitFor();
        assert.match(await page.title(), /근무시간표/);
        await page.goto(`${origin}/confirmations/proposal-01`);
        let failure = 'denied';
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: failure }) }));
        for (const [code, message, needsLogin] of [
          ['denied', '이 제안을 열거나 확인할 권한이 없습니다.', false],
          ['changed', '제안, 권한 또는 확인 세션이 변경되었거나 만료되었습니다.', true],
          ['sign-in-required', '로그인이 만료되었거나 새 인증이 필요합니다.', true],
          ['session-revoked', '로그아웃으로 회수된 회사 확인 세션입니다.', false],
          ['invalid-request', '확인 요청을 처리하지 못했습니다.', false],
          ['unavailable', '변경 확인 서비스에 연결할 수 없습니다.', false],
          ['__proto__', '변경 확인 서비스에 연결할 수 없습니다.', false],
        ]) {
          failure = code;
          await enter(page, page.getByRole('button', { name: /제안 불러오기|최신 상태 다시 불러오기/ }));
          await page.getByRole('alert').filter({ hasText: message }).waitFor();
          assert.equal(await page.getByRole('button', { name: '다시 로그인' }).count(), needsLogin ? 1 : 0);
        }
        await page.unroute('**/api/fixture/confirmation');
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await enter(page, page.getByRole('button', { name: '제안 검토' }));
        await enter(page, page.getByRole('button', { name: '이 변경 확인' }));
        await page.getByRole('status').filter({ hasText: '확인 기록이 저장되었습니다.' }).waitFor();
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'changed' }) }));
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('alert').filter({ hasText: '제안, 권한 또는 확인 세션이 변경되었거나 만료되었습니다.' }).waitFor();
        await page.unroute('**/api/fixture/confirmation');
        await enter(page, page.getByRole('button', { name: '다시 로그인' }));
        await page.waitForURL('**/sign-in?next=%2Fconfirmations%2Fproposal-01');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/confirmations/proposal-01');
        await enter(page, page.getByRole('button', { name: '제안 불러오기' }));
        await page.getByRole('status').filter({ hasText: '확인 대기' }).waitFor();
        await page.goto(`${origin}/?view=history&range=all`);
        const historyFilter = page.locator('.attendance-history-filter');
        await historyFilter.locator('select[name=range]').selectOption('custom');
        const historyDates = page.getByRole('group', { name: '기간 직접 지정' });
        await historyDates.getByLabel('시작일').fill('2024-01-01');
        await historyDates.getByLabel('종료일').fill('2024-01-31');
        await enter(page, historyDates.getByRole('button', { name: '닫기' }));
        await historyFilter.locator('select[name=sort]').selectOption('asc');
        const staff = historyFilter.locator('select[name=employee]');
        await staff.selectOption({ label: '직원' });
        const selectedStaff = await staff.inputValue();
        await enter(page, historyFilter.getByRole('button', { name: '적용' }));
        await page.waitForFunction(expected => { const params = new URL(location.href).searchParams; return params.get('view') === 'history' && params.get('range') === 'custom' && params.get('from') === '2024-01-01' && params.get('to') === '2024-01-31' && params.get('sort') === 'asc' && params.get('employee') === expected; }, selectedStaff);
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
        await page.getByRole('alert').filter({ hasText: '기기를 등록하지 못했습니다.' }).waitFor();
        await input.fill('기기 01');
        await page.route('**/api/fixture/kiosk/register', route => route.fulfill({ status: 503, body: '' }));
        const unavailable = page.waitForResponse(response => response.url().endsWith('/api/fixture/kiosk/register') && response.status() === 503);
        await enter(page, form.getByRole('button', { name: '등록' }));
        await unavailable;
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
