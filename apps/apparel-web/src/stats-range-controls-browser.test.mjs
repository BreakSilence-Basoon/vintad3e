import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }

test('sales range controls zoom, reset and drag on desktop and mobile widths', { timeout: 90000 }, async () => {
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
        await page.goto(`${origin}/sign-in?next=%2Fadmin%2Fstats`);
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
        await page.waitForURL(`${origin}/admin/stats`);
        await page.locator('.console-section[data-hydrated="true"]').waitFor();
        const zoomIn = page.getByTitle('확대 — 짧은 기간(최대 일별)');
        const zoomOut = page.getByTitle('축소 — 넓은 기간');
        const reset = page.getByTitle('전체 기간으로');
        async function changeRange(button) {
          const response = page.waitForResponse(value => value.url().includes('/admin/stats/sales-overview?'));
          await button.focus();
          await page.keyboard.press('Enter');
          const result = await response;
          assert.equal(result.status(), 200);
          return new URL(result.url());
        }
        const fullRange = await changeRange(reset);
        assert.equal(await zoomOut.isDisabled(), true);
        assert.equal(await reset.isDisabled(), true);
        const track = page.locator('.console-section[data-hydrated="true"] div[style*="touch-action: none"]').first();
        await track.scrollIntoViewIfNeeded();
        await track.locator(':scope > div').evaluate(async element => {
          await new Promise(requestAnimationFrame);
          await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {})));
        });
        const bounds = await track.boundingBox();
        assert.ok(bounds);
        const changed = page.waitForResponse(value => value.url().includes('/admin/stats/sales-overview?'));
        await page.mouse.move(bounds.x + 3, bounds.y + bounds.height / 2);
        await page.mouse.down();
        await page.mouse.move(bounds.x + bounds.width * 0.35, bounds.y + bounds.height / 2, { steps: 8 });
        await page.mouse.up();
        const dragResponse = await changed;
        assert.equal(dragResponse.status(), 200);
        assert.ok(Date.parse(new URL(dragResponse.url()).searchParams.get('from')) > Date.parse(fullRange.searchParams.get('from')));
        const start = page.getByRole('slider', { name: '시작일' });
        const end = page.getByRole('slider', { name: '종료일' });
        await start.focus();
        await page.keyboard.press('Tab');
        assert.equal(await end.evaluate(element => document.activeElement === element), true);
        await page.keyboard.press('Shift+Tab');
        assert.equal(await start.evaluate(element => document.activeElement === element), true);
        assert.equal(await start.evaluate(element => getComputedStyle(element).outlineStyle), 'solid');
        assert.ok(await start.getAttribute('aria-valuetext'));
        async function changeHandle(slider, key) {
          await slider.focus();
          const before = Number(await slider.getAttribute('aria-valuenow'));
          const response = page.waitForResponse(value => value.url().includes('/admin/stats/sales-overview?'));
          await page.keyboard.press(key);
          assert.equal((await response).status(), 200);
          const after = Number(await slider.getAttribute('aria-valuenow'));
          assert.notEqual(after, before);
          return after;
        }
        await changeHandle(start, 'ArrowRight');
        assert.equal(await changeHandle(start, 'Home'), Number(await start.getAttribute('aria-valuemin')));
        assert.equal(await changeHandle(start, 'End'), Number(await start.getAttribute('aria-valuemax')));
        await changeHandle(start, 'Home');
        await changeHandle(end, 'ArrowLeft');
        assert.equal(await changeHandle(end, 'Home'), Number(await end.getAttribute('aria-valuemin')));
        assert.equal(await changeHandle(end, 'End'), Number(await end.getAttribute('aria-valuemax')));
        let count = 0;
        while (!(await zoomIn.isDisabled()) && count < 16) { await changeRange(zoomIn); count++; }
        assert.ok(count > 0 && count < 16);
        assert.equal(await zoomIn.isDisabled(), true);
        assert.equal(await zoomOut.isEnabled(), true);
        await changeRange(zoomOut);
        assert.equal(await zoomIn.isEnabled(), true);
        await changeRange(reset);
        assert.equal(await zoomOut.isDisabled(), true);
        assert.equal(await reset.isDisabled(), true);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
