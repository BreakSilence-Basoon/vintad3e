import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }
const csv = text => ({ name: 'inventory.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
test('two browser sessions share a separate local service and can undo validated changes', { timeout: 120000 }, async () => {
  const port = await freePort(), servicePort = await freePort(), origin = `http://127.0.0.1:${port}`, upstream = `http://127.0.0.1:${servicePort}`;
  const service = spawn(process.execPath, ['src/server-inventory-service.mjs'], { cwd: process.cwd(), env: { ...process.env, VINTAD3E_APPAREL_SERVER_PORT: String(servicePort) }, stdio: 'ignore' });
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1', VINTAD3E_APPAREL_FIXTURE_ORIGIN: origin, VINTAD3E_APPAREL_SERVER_DEMO: '1', VINTAD3E_APPAREL_SERVER_ORIGIN: upstream }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false; for (let i = 0; i < 120; i++) { if (child.exitCode !== null || service.exitCode !== null) throw new Error('fixture exited'); try { if ((await fetch(`${origin}/sign-in`)).ok && (await fetch(`${upstream}/inventory`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } }), page = await context.newPage();
      try {
        await page.goto(`${origin}/sign-in`);
        assert.equal(await page.evaluate(async () => (await fetch('/api/server-inventory')).status), 403);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(url => url.pathname !== '/sign-in');
        await page.goto(`${origin}/admin/products`);
        const widget = page.locator('.server-inventory-import'); await enter(page, widget.locator('summary'));
        await page.waitForFunction(() => !document.querySelector('.server-inventory-import input[type=file]')?.disabled);
        const input = widget.locator('input[type=file]');
        await input.setInputFiles(csv('SKU,상품명,현재수량,이메일\nA,셔츠,3,x@example.invalid'));
        await widget.locator('p[role=alert]').waitFor();
        await input.setInputFiles(csv('SKU,상품명,현재수량\nA,셔츠,3'));
        await widget.getByRole('region', { name: '가져올 재고' }).getByText('A', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '재고 적용' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
        const otherContext = await browser.newContext({ viewport: { width, height: 844 } }), second = await otherContext.newPage();
        try {
          await second.goto(`${origin}/sign-in`); await enter(second, second.getByRole('button', { name: '회사 계정으로 로그인' }));
          await second.waitForURL(url => url.pathname !== '/sign-in'); await second.goto(`${origin}/admin/products`);
          const other = second.locator('.server-inventory-import'); await enter(second, other.locator('summary'));
          await other.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
        } finally { await otherContext.close(); }
        const stale = await page.evaluate(async () => (await fetch('/api/server-inventory?action=undo', { method: 'POST', headers: { 'x-inventory-revision': '0' } })).status);
        assert.equal(stale, 409);
        await input.setInputFiles(csv('SKU,상품명,현재수량\nB,바지,5'));
        await widget.getByRole('region', { name: '가져올 재고' }).getByText('B', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '재고 적용' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('B', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '가져오기 되돌리기' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
        await page.route('**/api/server-inventory', route => route.fulfill({ status: 503, body: '' }));
        await enter(page, widget.getByRole('button', { name: '현재 재고 다시 불러오기' }));
        await widget.locator('p[role=alert]').waitFor();
        await page.unroute('**/api/server-inventory');
        await enter(page, widget.getByRole('button', { name: '현재 재고 다시 불러오기' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('A', { exact: true }).waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close();
    for (const process of [child, service]) process.kill('SIGTERM');
    await Promise.all([child, service].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process, 'exit'), delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
  }
});
