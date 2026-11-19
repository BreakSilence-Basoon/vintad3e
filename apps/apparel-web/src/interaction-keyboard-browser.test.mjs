import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('apparel stock validation, saving and sales filters work with keyboard input', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1', VINTAD3E_APPAREL_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/admin/products`);
        await enter(page, page.locator('.product-card__view-button').first());
        const numbers = page.locator('.shortage-table__row').first().locator('input[type=number]');
        await numbers.nth(1).fill('10'); await numbers.nth(0).fill('3');
        assert.equal(await numbers.nth(2).inputValue(), '7');
        await numbers.nth(2).fill('11');
        await enter(page, page.locator('.shortage-table__row').first().locator('.shortage-save-button'));
        await page.locator('.admin-toast--error').filter({ hasText: '목표재고보다 클 수 없습니다' }).waitFor();
        await numbers.nth(2).fill('7');
        await enter(page, page.locator('.shortage-table__row').first().locator('.shortage-save-button'));
        await page.locator('.admin-toast--success').filter({ hasText: '저장했습니다' }).waitFor();
        await page.reload();
        await enter(page, page.locator('.product-card__view-button').first());
        await page.waitForFunction(() => document.querySelector('.shortage-table__row input[type=number]')?.value === '3');
        await numbers.nth(0).fill('4');
        page.once('dialog', dialog => dialog.dismiss());
        await enter(page, page.locator('.graphic-dialog__close'));
        assert.equal(await page.locator('.graphic-dialog').count(), 1);
        page.once('dialog', dialog => dialog.accept());
        await enter(page, page.locator('.graphic-dialog__close'));
        await page.locator('.graphic-dialog').waitFor({ state: 'detached' });

        await page.goto(`${origin}/admin/sales?range=all`);
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 2);
        const form = page.locator('.audit-filter-bar');
        const search = form.locator('input[name=keyword]');
        await search.focus(); await page.keyboard.type('찾을수없는항목');
        await enter(page, form.locator('button[type=submit]'));
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 0);
        await enter(page, form.getByRole('button', { name: '초기화' }));
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 2);
        await enter(page, page.getByRole('button', { name: '교차 검증 즉시 실행' }));
        await page.locator('.admin-toast--error').filter({ hasText: '교차 검증 실행에 실패했습니다' }).waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
