import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('floor sales search, pagination and inventory read view work with keyboard input', { timeout: 90000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_FLOOR_FIXTURE: '1', VINTAD3E_FLOOR_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/sales`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/sales?salesPage=wrong`);
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 18);
        await enter(page, page.locator('[aria-label="판매내역 더 불러오기"] a'));
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 21);
        const form = page.locator('.audit-filter-bar');
        const search = form.locator('input[name=keyword]');
        await search.focus(); await page.keyboard.type('찾을수없는항목');
        await enter(page, form.getByRole('button', { name: '적용' }));
        await page.waitForURL(/keyword=/);
        assert.equal(await page.locator('.sales-audit-card').count(), 0);
        await enter(page, form.getByRole('button', { name: '초기화' }));
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 18);
        await page.goto(`${origin}/inventory`);
        await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('재료 01'));
        assert.equal(await page.locator('.inventory-editor').count(), 0);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
