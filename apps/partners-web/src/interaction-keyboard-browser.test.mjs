import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('partner ledger and DJ form respond to keyboard input and errors', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_PARTNERS_FIXTURE: '1', VINTAD3E_PARTNERS_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/dj`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.failCopy) throw new Error('clipboard unavailable'); window.copiedText = text; } } }));
        await page.goto(`${origin}/accounts`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        await page.goto(`${origin}/proj-bedroom/partner-01/guest`);
        assert.equal(new URL(page.url()).pathname, '/proj-bedroom/partner-01/sign-in');
        await page.goto(`${origin}/dj`);
        const form = page.locator('.partners-accountant');
        await enter(page, form.getByRole('button', { name: '전달문 복사' }));
        await form.locator('input[aria-invalid="true"]').first().waitFor();
        assert.ok(await form.locator('input[aria-invalid="true"]').count() >= 3);
        const row = form.locator('.partners-accountant__row').first();
        const name = row.getByLabel('이름', { exact: true });
        const id = row.getByLabel('주민등록번호', { exact: true });
        const amount = row.getByLabel('입금 금액 (원)', { exact: true });
        await name.focus(); await page.keyboard.type('DJ A');
        await id.focus(); await page.keyboard.type('123');
        await amount.focus(); await page.keyboard.type('abc');
        await enter(page, form.getByRole('button', { name: '전달문 복사' }));
        assert.equal(await id.getAttribute('aria-invalid'), 'true');
        assert.equal(await amount.getAttribute('aria-invalid'), 'true');
        await id.fill('0000000000000'); await amount.fill('10000');
        await page.locator('.partners-accountant__preview').waitFor();
        assert.ok(!(await page.locator('.partners-accountant__preview').innerText()).includes('0000000000000'));
        await page.evaluate(() => { window.failCopy = true; });
        await enter(page, form.getByRole('button', { name: '전달문 복사' }));
        await form.getByRole('alert').waitFor();
        await page.evaluate(() => { window.failCopy = false; });
        await enter(page, form.getByRole('button', { name: '전달문 복사' }));
        await page.waitForFunction(() => window.copiedText?.includes('DJ A 000000-0000000 10,000원'));
        await enter(page, form.getByRole('button', { name: 'DJ 추가' }));
        assert.equal(await form.locator('.partners-accountant__row').count(), 2);
        await enter(page, form.getByRole('button', { name: 'DJ 2 삭제' }));
        assert.equal(await form.locator('.partners-accountant__row').count(), 1);
        await enter(page, form.getByRole('button', { name: '입력 지우기' }));
        assert.equal(await form.getByLabel('이름', { exact: true }).inputValue(), '');

        const ledger = page.locator('.partners-ledger');
        await ledger.locator('input[name=from]').fill('2026-11-20');
        await ledger.locator('input[name=to]').fill('2026-11-01');
        await enter(page, ledger.getByRole('button', { name: '조회' }));
        await ledger.getByRole('alert').waitFor();
        await enter(page, ledger.getByRole('button', { name: '초기화' }));
        assert.equal(await ledger.getByRole('alert').count(), 0);
        await ledger.locator('input[name=query]').fill('찾을 수 없는 협업처');
        await enter(page, ledger.getByRole('button', { name: '조회' }));
        await ledger.locator('.staff-empty').waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
