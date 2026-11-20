import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function press(page, role, name) {
  const button = page.getByRole(role, { name, exact: true });
  await button.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await button.elementHandle()); await button.focus(); await page.keyboard.press('Enter');
}

test('portal login, navigation, confirmation and failures work in a browser', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_PORTAL_FIXTURE: '1', VINTAD3E_PORTAL_FIXTURE_ORIGIN: origin }, stdio: 'ignore',
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error('fixture server exited');
      try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    assert.ok(ready, 'fixture server did not start');
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/confirmations/proposal-01`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation')).status), 401);
        await press(page, 'button', '회사 계정으로 로그인');
        await page.waitForURL('**/confirmations/proposal-01');

        // A proposal cannot be confirmed or reviewed before it is loaded.
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'confirm' }) })).status), 409);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'review' }) })).status), 409);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'load', extra: true }) })).status), 400);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ action: 'load' }) })).status), 400);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation')).json().then(r => r.state)), 'idle');

        // Fail the server once and verify the screen recovers on the next request.
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 503, body: '' }));
        await page.reload();
        await page.locator('p[role=alert]').waitFor();
        await page.unroute('**/api/fixture/confirmation');
        await press(page, 'button', '제안 불러오기');
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status), 400);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status), 400);
        await press(page, 'button', '제안 검토');
        await page.getByRole('button', { name: '이 변경 확인' }).waitFor();
        await press(page, 'button', '이 변경 확인');
        await page.getByText('확인 기록이 저장되었습니다.', { exact: false }).waitFor();
        await page.reload();
        await page.getByText('확인 기록이 저장되었습니다.', { exact: false }).waitFor();
        await page.goto(origin);
        await press(page, 'button', '다음 페이지');
        await page.locator('button[aria-label="SNS·외부 링크 보기"][aria-current="true"]').waitFor();
        await press(page, 'button', '업무 앱 보기');
        await page.locator('button[aria-label="업무 앱 보기"][aria-current="true"]').waitFor();
        assert.equal(await page.getByRole('link', { name:'Apparel', exact:true }).getAttribute('href'), 'http://127.0.0.1:3826/');
        await press(page, 'button', '관리 바로가기 보기');
        await page.locator('button[aria-label="관리 바로가기 보기"][aria-current="true"]').waitFor();
        await press(page, 'button', '이전 페이지');
        await page.locator('button[aria-label="SNS·외부 링크 보기"][aria-current="true"]').waitFor();
        await page.locator('.portal-carousel').focus(); await page.keyboard.press('ArrowLeft');
        await page.locator('button[aria-label="업무 앱 보기"][aria-current="true"]').waitFor();
        await page.goto(origin + '/auth/session-resume?next=%2Fabout');
        await page.waitForURL('**/about'); await page.getByText('업무 앱과 사이트를 한곳에서 찾을 수 있습니다.').waitFor();
        await page.goto(origin + '/auth/session-resume?next=%2F%2Fevil.invalid');
        await page.waitForURL(origin + '/');
        await press(page, 'button', '로그아웃');
        await page.waitForURL('**/sign-in');
        assert.equal((await page.goto(`${origin}/confirmations/unknown`)).status(), 404);
        await page.goto(origin + '/auth/session-resume?next=%2Fabout');
        await page.waitForURL('**/sign-in?next=%2Fabout');
        await press(page, 'button', '회사 계정으로 로그인');
        await page.waitForURL('**/about');
        await page.getByText('업무 앱과 사이트를 한곳에서 찾을 수 있습니다.').waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); server.kill('SIGTERM');
    if (server.exitCode === null) await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
});
