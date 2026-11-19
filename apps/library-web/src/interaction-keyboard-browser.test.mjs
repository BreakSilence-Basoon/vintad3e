import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('library keyboard actions validate inputs and recover from storage and server errors', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
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
        await page.goto(`${origin}/objects/new`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/objects/new');
        const picker = page.locator('#library-object-file');
        const prepare = page.getByRole('button', { name: '업로드 내용 확인' });
        assert.equal(await prepare.isDisabled(), true);
        await picker.setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('wrong') });
        await enter(page, prepare);
        await page.locator('p[role=alert]').waitFor();
        await picker.setInputFiles({ name: '가게 안내.txt', mimeType: 'text/plain', buffer: Buffer.from('업무를 시작하기 전에 필요한 사항을 확인합니다.') });
        for (const label of ['업로드 내용 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '업로드 승인']) await enter(page, page.getByRole('button', { name: label, exact: true }));
        await page.route('**/api/fixture/upload', route => route.fulfill({ status: 503, body: '' }));
        await enter(page, page.getByRole('button', { name: '파일 올리기', exact: true }));
        await page.locator('p[role=alert]').waitFor();
        await page.unroute('**/api/fixture/upload');
        await enter(page, page.getByRole('button', { name: '파일 올리기', exact: true }));
        await page.getByText('파일을 올렸습니다.', { exact: true }).waitFor();
        await enter(page, page.getByRole('link', { name: '파일 열기' }));
        await page.waitForURL('**/objects/00000000-0000-4000-8000-000000000009');
        await enter(page, page.getByRole('button', { name: '파일 열기' }));
        await page.locator('.publication-content').waitFor();

        await page.goto(`${origin}/meetings`);
        const title = page.getByLabel('회의 제목');
        const create = page.getByRole('button', { name: '회의 기록 만들기' });
        assert.equal(await create.isDisabled(), true);
        await title.focus(); await page.keyboard.type('Meeting 01');
        await page.evaluate(() => { window.oldSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
        await enter(page, create); await page.locator('p[role=alert]').waitFor();
        await page.evaluate(() => { Storage.prototype.setItem = window.oldSetItem; });
        await enter(page, create); await page.waitForURL(/\/meetings\/[0-9a-f-]+$/);
        assert.equal(await page.locator('h1').innerText(), 'Meeting 01');
        await page.reload(); assert.equal(await page.locator('h1').innerText(), 'Meeting 01');
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
