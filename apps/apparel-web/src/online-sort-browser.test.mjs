import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

test('several online orders sort through the real component on desktop and mobile', { timeout: 120000 }, async () => {
  const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening');
  const port = socket.address().port; await new Promise(resolve => socket.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', 'tests/order-sort', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('sort fixture server exited'); try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const page = await context.newPage(); await page.goto(origin);
        const entries = page.locator('.online-prep-table__order');
        await entries.first().waitFor();
        const orderIds = async () => (await entries.allTextContents()).map(text => text.match(/TEST-[ABC]/)?.[0]);
        assert.deepEqual(await orderIds(), ['TEST-A', 'TEST-C', 'TEST-B']);
        for (const [button, expected] of [
          ['주문 정보', ['TEST-B', 'TEST-C', 'TEST-A']],
          ['옵션 품목', ['TEST-B', 'TEST-C', 'TEST-A']],
          ['옵션 품목', ['TEST-A', 'TEST-C', 'TEST-B']],
        ]) {
          const control = page.getByRole('button', { name: button, exact: true });
          await control.focus(); await page.keyboard.press('Enter');
          await page.waitForFunction(expectedIds => Array.from(document.querySelectorAll('.online-prep-table__order'), element => element.textContent?.match(/TEST-[ABC]/)?.[0]).join(',') === expectedIds.join(','), expected);
          assert.deepEqual(await orderIds(), expected);
        }
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
