import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

test('synthetic internal-document confirmations recover in the same tab', { timeout: 360000 }, async () => {
  const listener = createServer(); listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
  const port = listener.address().port; await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false; for (let i = 0; i < 120; i++) { try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {} await delay(250); } assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      try {
        const page = await context.newPage(); await page.goto(`${origin}/sign-in`); await page.getByRole('button', { name: '회사 계정으로 로그인' }).click(); await page.waitForURL(`${origin}/`);
        async function prepare(kind) {
          return page.evaluate(async value => {
            const response = await fetch('/api/fixture/ir-confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'prepare', kind: value }) });
            if (!response.ok) throw new Error('prepare failed'); const proposal = await response.json();
            sessionStorage.setItem(`vintad3e-library-ir-recovery:${proposal.proposalId}`, proposal.proof); return proposal.proposalId;
          }, kind);
        }
        const single = await prepare('single');
        const importedPath = '/ir/00000000-0000-4000-8000-000000000101';
        assert.equal((await page.request.get(`${origin}${importedPath}`)).status(), 404);
        await page.goto(`${origin}/confirmations/${single}`);
        await page.getByRole('button', { name: '제안 검토' }).click();
        await page.reload(); await page.getByRole('button', { name: '이 변경 확인' }).click();
        await page.getByRole('button', { name: '변경 적용' }).waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.evaluate(() => fetch('/api/fixture/logout', { method: 'POST', redirect: 'manual' }));
        await page.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        await page.getByRole('button', { name: '다시 로그인' }).click(); await page.waitForURL('**/sign-in?**');
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click(); await page.waitForURL(`**/confirmations/${single}`);
        await page.getByRole('button', { name: '변경 적용' }).click(); await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
        assert.equal((await page.request.get(`${origin}${importedPath}`)).status(), 200);
        const batch = await prepare('batch'); await page.goto(`${origin}/confirmations/${batch}`);
        await page.getByRole('region', { name: '이관 대상' }).getByText('가게 안내 기록').waitFor();
        await page.getByRole('button', { name: '이관 확인 및 적용' }).click(); await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
        for (const kind of ['reserve', 'batch-reserve']) {
          const reservation = await prepare(kind); await page.goto(`${origin}/confirmations/${reservation}`);
          if (kind === 'batch-reserve') {
            await page.getByRole('region', { name: '이관 대상' }).getByText('가게 안내.txt').waitFor();
            await page.getByRole('button', { name: '이관 확인 및 적용' }).click();
          } else {
            for (const label of ['제안 검토', '이 변경 확인', '변경 적용']) await page.getByRole('button', { name: label, exact: true }).click();
          }
          await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
        }
        for (const [kind, expected] of [['delete', 404], ['restore', 200]]) {
          const lifecycle = await prepare(kind); await page.goto(`${origin}/confirmations/${lifecycle}`);
          for (const label of ['제안 검토', '이 변경 확인', '변경 적용']) await page.getByRole('button', { name: label, exact: true }).click();
          await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
          assert.equal((await page.request.get(`${origin}${importedPath}`)).status(), expected);
        }
        const renewed = await prepare('single'); await page.goto(`${origin}/confirmations/${renewed}`);
        for (const label of ['제안 검토', '이 변경 확인', '변경 적용']) await page.getByRole('button', { name: label, exact: true }).click();
        await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
        await page.goto(`${origin}/objects/new`);
        await page.locator('#library-object-file').setInputFiles({ name: '가게 안내.txt', mimeType: 'text/plain', buffer: Buffer.from('업무를 시작하기 전에 필요한 사항을 확인합니다.') });
        for (const label of ['업로드 내용 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '업로드 승인', '파일 올리기']) await page.getByRole('button', { name: label, exact: true }).click();
        await page.getByText('파일을 올렸습니다.', { exact: true }).waitFor();
        const attachment = await prepare('attach'); await page.goto(`${origin}/confirmations/${attachment}`);
        for (const label of ['제안 검토', '이 변경 확인', '변경 적용']) await page.getByRole('button', { name: label, exact: true }).click();
        await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
        await page.goto(`${origin}${importedPath}`);
        const card = page.locator('.library-attachment-card'); await card.waitFor();
        assert.match(await card.innerText(), /가게 안내\.txt/);
        await card.click(); await page.getByRole('button', { name: '파일 열기', exact: true }).click();
        assert.equal(await page.locator('pre.publication-content').textContent(), '업무를 시작하기 전에 필요한 사항을 확인합니다.');
        const notion = await prepare('notion'), notionPath = '/native/00000000-0000-4000-8000-000000000104';
        assert.equal((await page.request.get(`${origin}${notionPath}`)).status(), 404);
        await page.goto(`${origin}/confirmations/${notion}`);
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        await page.route('**/api/fixture/ir-confirmation*', route => route.fulfill({ status: 503, body: '' }));
        await page.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다.' }).waitFor();
        await page.unroute('**/api/fixture/ir-confirmation*');
        await page.getByRole('button', { name: '최신 상태 다시 불러오기' }).click();
        for (const label of ['제안 검토', '이 변경 확인', '문서 발행']) await page.getByRole('button', { name: label, exact: true }).click();
        await page.getByRole('status').filter({ hasText: '문서 발행 결과를 확인했습니다.' }).waitFor();
        assert.equal((await page.request.get(`${origin}${notionPath}`)).status(), 200);
        for (const [kind, expected] of [['notion-delete', 404], ['notion-restore', 200]]) {
          const lifecycle = await prepare(kind); await page.goto(`${origin}/confirmations/${lifecycle}`);
          for (const label of ['제안 검토', '이 변경 확인', '변경 적용']) await page.getByRole('button', { name: label, exact: true }).click();
          await page.getByRole('status').filter({ hasText: '변경 결과를 확인했습니다.' }).waitFor();
          assert.equal((await page.request.get(`${origin}${notionPath}`)).status(), expected);
        }
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); server.kill('SIGTERM'); if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server, 'exit'), delay(5000, undefined, { ref: false })]); if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});
