import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('admin lists, audit filters and invalid addresses work with keyboard input', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_ADMIN_FIXTURE: '1', VINTAD3E_ADMIN_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/members`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/members?type=employee&type=partner`);
        await page.locator('.staff-error[role=alert]').waitFor();
        await enter(page, page.getByRole('link', { name: '처음부터 보기' }));
        await page.locator('.staff-table tbody a').first().waitFor();
        await enter(page, page.locator('.staff-table tbody a').first());
        await page.waitForURL(/\/members\/[0-9a-f-]+$/);
        await page.getByText('staff01@example.invalid', { exact: true }).waitFor();
        await enter(page, page.locator('.admin-actions a').first());
        await page.locator('.permissions-matrix').waitFor();
        const tier = page.getByLabel('계층 선택');
        await tier.focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
        await page.waitForURL('**/permissions?tier=guest');
        await page.getByText('외부 구성원 01', { exact: true }).waitFor();

        await page.goto(`${origin}/audit`);
        const form = page.locator('.audit-filter-bar');
        const input = form.getByRole('searchbox');
        await input.focus(); await page.keyboard.type('찾을수없는항목');
        await enter(page, form.getByRole('button', { name: '적용' }));
        await page.waitForFunction(() => document.querySelectorAll('.audit-card').length === 0);
        await enter(page, form.getByRole('button', { name: '초기화' }));
        await page.locator('.audit-card').first().waitFor();
        await form.locator('select').first().selectOption('custom');
        await form.getByLabel('시작일').fill('2000-01-01'); await form.getByLabel('종료일').fill('2000-01-02');
        await enter(page, form.getByRole('button', { name:'적용' }));
        assert.equal(await page.locator('.audit-card').count(), 0);
        await enter(page, form.getByRole('button', { name:'초기화' }));
        await page.locator('.audit-card').first().waitFor();
        const latest = await page.locator('.audit-card').first().innerText();
        await form.locator('select').last().selectOption('asc'); await enter(page, form.getByRole('button', { name:'적용' }));
        assert.notEqual(await page.locator('.audit-card').first().innerText(), latest);
        await enter(page, form.getByRole('button', { name:'초기화' }));
        const details = page.locator('.audit-card details').first();
        await enter(page, details.locator('summary'));
        assert.equal(await details.evaluate(el => el.open), true);
        await enter(page, page.locator('.load-more-pager button'));
        await page.waitForFunction(() => document.querySelectorAll('.audit-card').length === 20);
        assert.equal((await page.goto(`${origin}/members/unknown`)).status(), 404);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
