import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { access, unlink } from 'node:fs/promises';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }
const csv = text => ({ name: 'inventory.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });

test('local SQLite import previews, persists, rejects invalid input and undoes safely', { timeout: 120000 }, async () => {
  const id = randomBytes(16).toString('hex'), file = resolve('.data', `apparel-local-inventory-${id}.sqlite`);
  try { await access(file); throw new Error('test database path already exists'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1', VINTAD3E_APPAREL_FIXTURE_ORIGIN: origin, VINTAD3E_APPAREL_LOCAL_DB: '1', VINTAD3E_APPAREL_TEST_DB_ID: id }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false; for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture exited'); try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } }), page = await context.newPage();
      try {
        await page.goto(`${origin}/sign-in`);
        assert.equal(await page.evaluate(async () => (await fetch('/api/local-inventory')).status), 403);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(url => url.pathname !== '/sign-in');
        await page.goto(`${origin}/admin/products`);
        const widget = page.locator('.local-inventory-import'); await enter(page, widget.locator('summary'));
        await widget.getByRole('button', { name: '현재 재고 다시 불러오기' }).waitFor();
        await page.waitForFunction(() => !document.querySelector('.local-inventory-import input[type=file]')?.disabled);
        const input = widget.locator('input[type=file]');
        await input.setInputFiles(csv('SKU,상품명,현재수량,이메일\nA,셔츠,3,x@example.invalid'));
        await widget.locator('p[role=alert]').waitFor();
        await input.setInputFiles(csv('SKU,상품명,현재수량\nA,셔츠,3'));
        await widget.getByRole('region', { name: '가져올 재고' }).getByText('A', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '재고 적용' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
        await page.reload(); await enter(page, widget.locator('summary'));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
        const stale = await page.evaluate(async () => (await fetch('/api/local-inventory?action=undo', { method: 'POST', headers: { 'x-inventory-revision': '0' } })).status);
        assert.equal(stale, 409);
        await input.setInputFiles(csv('SKU,상품명,현재수량\nB,바지,5'));
        await widget.getByRole('region', { name: '가져올 재고' }).getByText('B', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '재고 적용' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('B', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '가져오기 되돌리기' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
    try { await unlink(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
});
