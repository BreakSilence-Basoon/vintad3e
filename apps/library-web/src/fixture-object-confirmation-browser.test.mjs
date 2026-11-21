import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

test('synthetic upload confirmation is recovered only in the originating session', { timeout: 180000 }, async () => {
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const page = await context.newPage();
        await page.goto(`${origin}/sign-in?next=%2Fobjects%2Fnew`);
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
        await page.waitForURL('**/objects/new');
        await page.locator('#library-object-file').setInputFiles({ name: '가게 안내.txt', mimeType: 'text/plain', buffer: Buffer.from('업무를 시작하기 전에 필요한 사항을 확인합니다.') });
        await page.evaluate(() => { window.originalObjectSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
        await page.getByRole('button', { name: '업로드 내용 확인' }).click();
        await page.getByRole('alert').filter({ hasText: '처리하지 못했습니다.' }).waitFor();
        assert.equal(await page.getByRole('button', { name: '제안 불러오기' }).count(), 0);
        await page.evaluate(() => { Storage.prototype.setItem = window.originalObjectSetItem; });
        const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/fixture/object-confirmation') && response.request().method() === 'POST');
        await page.getByRole('button', { name: '업로드 내용 확인' }).click();
        const proposal = await (await responsePromise).json();
        assert.match(proposal.proposalId, /^[0-9a-f-]{36}$/);
        const recovery = await context.newPage();
        await recovery.goto(`${origin}/confirmations/${proposal.proposalId}`);
        await recovery.getByRole('region', { name: '업로드 내용 확인' }).locator('pre').first().waitFor();
        assert.match(await recovery.locator('pre').first().textContent(), /가게 안내\.txt/);
        assert.ok(await recovery.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await recovery.route('**/api/fixture/object-confirmation*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
        await recovery.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        await recovery.getByRole('alert').filter({ hasText: '내용을 확인하지 못했습니다.' }).waitFor();
        assert.equal(await recovery.getByRole('button', { name: '제안 검토' }).count(), 0);
        await recovery.unroute('**/api/fixture/object-confirmation*');
        await recovery.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        await recovery.getByRole('button', { name: '제안 검토' }).click();
        await recovery.reload();
        await recovery.getByRole('button', { name: '이 변경 확인' }).click();
        await recovery.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        assert.equal(await recovery.getByRole('button', { name: '제안 검토' }).count(), 0);
        await page.getByRole('button', { name: '제안 불러오기' }).click();
        await page.getByRole('button', { name: '업로드 승인' }).waitFor();
        const other = await browser.newContext({ viewport: { width, height: 844 } });
        try {
          const otherPage = await other.newPage();
          await otherPage.goto(`${origin}/sign-in`); await otherPage.getByRole('button', { name: '회사 계정으로 로그인' }).click(); await otherPage.waitForURL(`${origin}/`);
          await otherPage.goto(`${origin}/confirmations/${proposal.proposalId}`);
          await otherPage.getByRole('alert').filter({ hasText: '내용을 확인하지 못했습니다.' }).waitFor();
          assert.equal(await otherPage.getByRole('button', { name: '제안 검토' }).count(), 0);
        } finally { await other.close(); }
        await page.goto(`${origin}/confirmations/${proposal.proposalId}`);
        await page.getByRole('button', { name: '최신 상태 다시 불러오기' }).waitFor();
        await page.evaluate(() => fetch('/api/fixture/logout', { method: 'POST', redirect: 'manual' }));
        await page.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        await page.getByRole('button', { name: '다시 로그인' }).click();
        await page.waitForURL('**/sign-in?**');
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
        await page.waitForURL(`**/confirmations/${proposal.proposalId}`);
        await page.locator('pre').first().waitFor();
        assert.match(await page.locator('pre').first().textContent(), /가게 안내\.txt/);
        assert.equal(await page.getByRole('button', { name: '제안 검토' }).count(), 0);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); server.kill('SIGTERM');
    if (server.exitCode === null) await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
});
