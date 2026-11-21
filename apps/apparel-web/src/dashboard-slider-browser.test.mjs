import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }

test('home inventory panels respond to dragging and reject short drags on desktop and mobile widths', { timeout: 90000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_APPAREL_FIXTURE: '1', VINTAD3E_APPAREL_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/sign-in`);
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
        await page.waitForURL(`${origin}/`);
        await page.locator('.dashboard-monitor[data-hydrated="true"]').waitFor();
        const slider = page.locator('.dashboard-inventory-switcher');
        const stage = slider.locator('.dashboard-inventory-switcher__stage');
        async function drag(direction, distance) {
          await stage.evaluate(element => element.scrollIntoView({ block: 'start' }));
          const point = await stage.evaluate((element, sign) => {
            const rect = element.getBoundingClientRect();
            const x = rect.left + rect.width * (sign < 0 ? 0.8 : 0.2);
            for (let y = Math.max(10, Math.ceil(rect.top + 8)); y < Math.min(innerHeight - 10, rect.bottom - 8); y += 8) {
              const target = document.elementFromPoint(x, y);
              if (target && element.contains(target) && !target.closest('button, a, input, textarea, select, label, [contenteditable="true"]')) return { x, y, width: rect.width };
            }
            return null;
          }, direction);
          assert.ok(point, 'an unoccupied part of the panel must be available for dragging');
          const amount = distance === 'short' ? 20 : Math.min(point.width * 0.55, point.width - 20);
          await page.mouse.move(point.x, point.y);
          await page.mouse.down();
          await page.mouse.move(point.x + direction * amount, point.y, { steps: 6 });
          await page.mouse.up();
        }
        assert.equal(await slider.getAttribute('data-active-slide'), 'shortage');
        await drag(-1, 'short');
        assert.equal(await slider.getAttribute('data-active-slide'), 'shortage');
        await drag(-1, 'long');
        await slider.locator('.dashboard-inventory-switcher__panel.is-active [aria-label="목표재고 추적표 보기"][aria-current="true"]').waitFor();
        assert.equal(await slider.getAttribute('data-active-slide'), 'tracking');
        await drag(1, 'long');
        await slider.locator('.dashboard-inventory-switcher__panel.is-active [aria-label="매장 디자인별 부족 수량 보기"][aria-current="true"]').waitFor();
        assert.equal(await slider.getAttribute('data-active-slide'), 'shortage');
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
