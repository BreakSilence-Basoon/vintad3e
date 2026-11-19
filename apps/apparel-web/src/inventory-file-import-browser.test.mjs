import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }
const csv = content => ({ name: 'inventory.csv', mimeType: 'text/csv', buffer: Buffer.from(content) });

test('inventory CSV stays local, previews, rejects bad data and restores previous import', { timeout: 90000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1', VINTAD3E_APPAREL_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/admin/products`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/admin/products`);
        const widget = page.locator('.inventory-file-import');
        await enter(page, widget.locator('summary'));
        const requests = [];
        page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) requests.push(request.url()); });
        const input = widget.locator('input[type=file]');
        await input.setInputFiles(csv('SKU,상품명,현재수량,이메일\nSHIRT,셔츠,4,x@example.invalid'));
        await widget.getByRole('alert').waitFor();
        assert.equal(await widget.getByRole('button', { name: '재고 적용' }).count(), 0);
        await input.setInputFiles(csv('SKU,상품명,현재수량\nSHIRT,셔츠,4'));
        await widget.getByRole('region', { name: '가져올 재고' }).getByText('SHIRT', { exact: true }).waitFor();
        assert.equal(await widget.getByRole('region', { name: '가져온 재고' }).count(), 0);
        await enter(page, widget.getByRole('button', { name: '재고 적용' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('SHIRT', { exact: true }).waitFor();
        await input.setInputFiles(csv('SKU,상품명,현재수량\nPANTS,바지,8'));
        await widget.getByRole('region', { name: '가져올 재고' }).getByText('PANTS', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '재고 적용' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('PANTS', { exact: true }).waitFor();
        await enter(page, widget.getByRole('button', { name: '가져오기 되돌리기' }));
        await widget.getByRole('region', { name: '가져온 재고' }).getByText('SHIRT', { exact: true }).waitFor();
        assert.equal(requests.length, 0);
        await page.reload();
        assert.equal(await widget.getByRole('region', { name: '가져온 재고' }).count(), 0);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
