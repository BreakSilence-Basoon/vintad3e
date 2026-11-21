import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(element => !element.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('sign-in notices and confirmation recovery follow the source on desktop and mobile', { timeout: 180000 }, async () => {
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
        const notices = [
          ['LoginServiceUnavailable', '로그인 서비스에 연결하지 못했습니다.'], ['SessionExpired', '다시 로그인이 필요합니다.'],
          ['ReauthRequired', '다시 로그인이 필요합니다.'], ['StaffAccessDenied', '직원 권한을 확인하지 못했습니다.'],
          ['GlobalLogoutUnavailable', '회사 전체 로그아웃을 확인하지 못했습니다.'], ['AccessDenied', '로그인을 완료하지 못했습니다.'],
          ['Configuration', '로그인 설정을 확인하지 못했습니다.'], ['OAuthCallbackError', '로그인을 완료하지 못했습니다.'],
          ['__proto__', '로그인을 완료하지 못했습니다.'],
        ];
        for (const [code, title] of notices) {
          await page.goto(`${origin}/sign-in?next=%2Fadmin%2Fproducts&error=${encodeURIComponent(code)}#return`);
          await page.getByRole('alert').locator('strong').filter({ hasText: title }).waitFor();
          await page.waitForFunction(() => !new URL(location.href).searchParams.has('error'));
          const url = new URL(page.url()); assert.equal(url.searchParams.get('next'), '/admin/products'); assert.equal(url.hash, '#return');
        }
        await page.reload(); assert.equal(await page.getByRole('alert').count(), 0);
        await page.goto(`${origin}/sign-in?error=AccessDenied&error=Configuration`);
        await page.getByRole('alert').locator('strong').filter({ hasText: '로그인을 완료하지 못했습니다.' }).waitFor();
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(origin + '/');
        await page.goto(`${origin}/sign-in?mode=cover&mode=other&next=%2Fadmin%2Fproducts`);
        await page.getByRole('link', { name: '어드민 콘솔로 돌아가기' }).waitFor();

        await page.goto(origin);
        await page.locator('.dashboard-monitor[data-hydrated="true"]').waitFor();
        const online = page.locator('.dashboard-panel--online-prep');
        const store = online.getByLabel('성수', { exact: true }), warehouse = online.getByLabel('하남', { exact: true });
        await store.check(); assert.equal(await warehouse.isChecked(), false);
        await warehouse.check(); assert.equal(await store.isChecked(), false);
        await store.check(); assert.equal(await warehouse.isChecked(), false);
        await store.uncheck(); assert.equal(await warehouse.isChecked(), false);

        await page.goto(`${origin}/admin/stats`);
        await page.locator('.console-section[data-hydrated="true"]').waitFor();
        const scope = page.getByRole('tablist', { name: '의류 매출 범위' });
        const metric = page.getByRole('tablist', { name: '지표' });
        for (const section of ['전체', '온라인', '오프라인']) for (const measure of ['금액', '수량']) {
          await enter(page, scope.getByRole('tab', { name: section, exact: true }));
          await enter(page, metric.getByRole('tab', { name: measure, exact: true }));
          assert.equal(await scope.getByRole('tab', { name: section, exact: true }).getAttribute('aria-selected'), 'true');
          assert.equal(await metric.getByRole('tab', { name: measure, exact: true }).getAttribute('aria-selected'), 'true');
        }
        const statsEndpoint = /\/admin\/stats\/sales-overview\?/;
        await page.route(statsEndpoint, route => route.fulfill({ status: 503, body: '조회할 수 없습니다.' }));
        await enter(page, page.getByTitle('확대 — 짧은 기간(최대 일별)'));
        await page.getByText('구간 조회 실패 · 조회할 수 없습니다.', { exact: false }).waitFor();
        await page.unroute(statsEndpoint);
        await enter(page, page.getByTitle('전체 기간으로'));
        await page.getByText('구간 조회 실패', { exact: false }).waitFor({ state: 'hidden' });

        await page.goto(`${origin}/admin/support`);
        const dictionary = page.getByRole('region', { name: '운영 용어 검색' });
        const search = dictionary.getByRole('searchbox', { name: '용어 검색' });
        await search.fill('목표 재고');
        await dictionary.locator('tbody tr').filter({ has: page.getByText('목표재고', { exact: true }) }).waitFor();
        await search.fill('찾을수없는용어');
        await dictionary.getByText('검색 결과가 없습니다, 다른 표현으로 다시 찾아보세요.', { exact: true }).waitFor();
        await search.fill('');
        const tabs = dictionary.getByRole('tablist', { name: '용어 카테고리' });
        for (const label of ['재고', '상품/옵션', '티켓/판매', '연동/전송', '시스템/이력', '매장/식음료', '개발', '전체']) {
          const tab = tabs.getByRole('tab').filter({ has: page.getByText(label, { exact: true }) });
          await enter(page, tab); assert.equal(await tab.getAttribute('aria-selected'), 'true');
        }
        const sort = dictionary.locator('th[aria-sort]');
        assert.equal(await sort.getAttribute('aria-sort'), 'ascending');
        await enter(page, sort.getByRole('button')); assert.equal(await sort.getAttribute('aria-sort'), 'descending');
        await enter(page, sort.getByRole('button')); assert.equal(await sort.getAttribute('aria-sort'), 'ascending');

        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'confirm' }) })).status), 409);

        const failures = [
          [400, 'invalid-request', '확인 요청을 처리하지 못했습니다. 제안을 다시 불러와주세요.'],
          [401, 'sign-in-required', '로그인이 만료되었거나 새 인증이 필요합니다. 다시 로그인한 뒤 제안을 검토해주세요.'],
          [403, 'denied', '이 제안을 열거나 확인할 권한이 없습니다.'],
          [403, 'session-revoked', '로그아웃으로 회수된 회사 확인 세션입니다.'],
          [409, 'changed', '제안, 권한 또는 확인 세션이 변경되었거나 만료되었습니다. 최신 상태를 다시 불러와 검토해주세요.'],
          [503, 'unavailable', '변경 확인 서비스에 연결할 수 없습니다. 현재 확인을 진행할 수 없습니다.'],
          [418, '__proto__', '변경 확인 서비스에 연결할 수 없습니다. 현재 확인을 진행할 수 없습니다.'],
          [200, null, '변경 확인 서비스에 연결할 수 없습니다. 현재 확인을 진행할 수 없습니다.'],
          [0, null, '변경 확인 서비스에 연결할 수 없습니다. 현재 확인을 진행할 수 없습니다.'],
        ];
        for (const [status, code, message] of failures) {
          await page.route('**/api/fixture/confirmation', route => status === 0 ? route.abort('failed') : route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(code ? { error: code } : {}) }));
          await page.goto(`${origin}/confirmations/proposal-01`);
          await enter(page, page.getByRole('button', { name: '제안 불러오기', exact: true }));
          await page.getByRole('alert').filter({ hasText: message }).waitFor();
          assert.equal(await page.getByRole('heading', { name: '제안 내용', exact: true }).count(), 0);
          assert.equal(await page.getByRole('button', { name: '다시 로그인', exact: true }).count(), status === 401 || status === 409 ? 1 : 0);
          await page.unroute('**/api/fixture/confirmation');
          if (status === 401) {
            await enter(page, page.getByRole('button', { name: '다시 로그인', exact: true }));
            await page.waitForURL('**/sign-in?next=%2Fconfirmations%2Fproposal-01');
            await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
            await page.waitForURL('**/confirmations/proposal-01');
          }
        }
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기', exact: true }));
        await enter(page, page.getByRole('button', { name: '제안 검토', exact: true }));
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 503, body: '' }));
        await enter(page, page.getByRole('button', { name: '이 변경 확인', exact: true }));
        await page.getByRole('alert').filter({ hasText: '변경 확인 서비스에 연결할 수 없습니다.' }).waitFor();
        assert.equal(await page.getByRole('button', { name: '이 변경 확인', exact: true }).count(), 0);
        await page.unroute('**/api/fixture/confirmation');
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기', exact: true }));
        await enter(page, page.getByRole('button', { name: '제안 검토', exact: true }));
        await enter(page, page.getByRole('button', { name: '이 변경 확인', exact: true }));
        await page.getByText('확인 기록이 저장되었습니다.', { exact: false }).waitFor();
        await page.reload();
        await enter(page, page.getByRole('button', { name: '제안 불러오기', exact: true }));
        await page.getByText('확인 기록이 저장되었습니다.', { exact: false }).waitFor();
        assert.equal((await page.goto(`${origin}/confirmations/unknown`)).status(), 404);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
