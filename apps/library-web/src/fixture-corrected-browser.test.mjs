import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
import { fixtureCorrectedUpload, fixtureUpload } from './fixture-upload-spec.mjs';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(element => !element.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('meeting corrected fixture opens safe transcript and note links on desktop and mobile', { timeout: 180000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
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
        await page.goto(`${origin}/meetings`);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/meetings');
        await page.locator('section[data-hydrated="true"]').waitFor();
        await page.getByLabel('회의 제목').fill('업무 회의');
        await enter(page, page.getByRole('button', { name: '회의 기록 만들기' }));
        await page.waitForURL(/\/meetings\/[0-9a-f-]+$/);
        const stage = page.getByRole('heading', { name: '회의 문서 등록' }).locator('..');
        async function upload(spec) {
          await stage.locator('#meeting-stage-file').setInputFiles({ name: spec.filename, mimeType: 'text/plain', buffer: Buffer.from(spec.body) });
          for (const label of ['업로드 내용 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '업로드 승인', '파일 올리기']) await enter(page, stage.getByRole('button', { name: label, exact: true }));
          await stage.getByText('파일을 올렸습니다.', { exact: true }).waitFor();
        }
        async function register() {
          for (const label of ['회의 문서 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '등록']) await enter(page, stage.getByRole('button', { name: label, exact: true }));
        }
        await upload(fixtureUpload);
        await stage.getByLabel('제목').fill('회의 기록'); await stage.getByLabel('출처').fill('회의 내용');
        await register(); await page.getByRole('heading', { name: '전사본 · 1' }).waitFor();
        await stage.getByLabel('단계').selectOption('CORRECTED');
        await stage.getByLabel('근거 문서').selectOption('1');
        await upload(fixtureCorrectedUpload);
        await stage.getByLabel('제목').fill('회의 보정'); await stage.getByLabel('출처').fill('회의 내용');
        await register(); await page.getByRole('heading', { name: '보정본 · 1' }).waitFor();
        await enter(page, page.getByRole('link', { name: '보정본 열기', exact: true }));
        await page.waitForURL(/view=corrected/);
        await enter(page, page.getByRole('button', { name: '파일 열기', exact: true }));
        const transcript = page.locator('.library-transcript'); await transcript.waitFor();
        assert.equal(await transcript.locator('.library-transcript__speaker').count(), 2);
        await enter(page, page.getByRole('link', { name: '교정 근거 ¹' }));
        await page.waitForURL(/#meeting-note-%C2%B9$/);
        assert.equal(new URL(page.url()).hash, '#meeting-note-%C2%B9');
        const note = page.locator('tr[id="meeting-note-¹"]');
        await note.waitFor();
        assert.match(await note.innerText(), /업무 순서를 확인한 근거/u);
        await enter(page, page.getByRole('link', { name: '본문의 교정 표식으로 돌아가기' }));
        await page.waitForURL(/#meeting-reference-1$/);
        assert.equal(new URL(page.url()).hash, '#meeting-reference-1');
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null && child.signalCode === null) await Promise.race([once(child, 'exit'), delay(5000, undefined, { ref: false })]);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
});
