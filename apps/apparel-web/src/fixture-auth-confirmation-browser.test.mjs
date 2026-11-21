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
        await page.reload(); assert.equal(await page.locator('.staff-sign-in-toast').count(), 0);
        await page.goto(`${origin}/sign-in?error=AccessDenied&error=Configuration`);
        await page.getByRole('alert').locator('strong').filter({ hasText: '로그인을 완료하지 못했습니다.' }).waitFor();
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(origin + '/');
        await page.goto(`${origin}/sign-in?mode=cover&mode=other&next=%2Fadmin%2Fproducts`);
        await page.getByRole('link', { name: '어드민 콘솔로 돌아가기' }).waitFor();

        await page.evaluate(() => sessionStorage.setItem('vintad3e-apparel-fixture-stock', JSON.stringify({ 'basic:seongsu:TSHIRT-001-BK-M': { onHand: 1, target: 3, shortage: 2, tracking: true } })));
        await page.goto(origin);
        await page.locator('.dashboard-monitor[data-hydrated="true"]').waitFor();
        const online = page.locator('.dashboard-panel--online-prep');
        const store = online.getByLabel('성수', { exact: true }), warehouse = online.getByLabel('하남', { exact: true });
        await store.check(); assert.equal(await warehouse.isChecked(), false);
        await warehouse.check(); assert.equal(await store.isChecked(), false);
        await store.check(); assert.equal(await warehouse.isChecked(), false);
        await store.uncheck(); assert.equal(await warehouse.isChecked(), false);

        const designTabs = page.getByRole('tablist', { name: '디자인 표시 탭' });
        for (const name of ['아티스트', '오리지널', '작가', '숨김']) {
          const tab = designTabs.getByRole('tab', { name: new RegExp(`^${name} `) });
          await enter(page, tab);
          assert.equal(await tab.getAttribute('aria-selected'), 'true');
        }
        await enter(page, designTabs.getByRole('tab', { name: /^오리지널 / }));
        await enter(page, page.getByRole('button', { name: '숨김으로 이동', exact: true }));
        assert.equal(await page.locator('.graphic-dialog').count(), 0);
        await enter(page, designTabs.getByRole('tab', { name: /^숨김 1$/ }));
        await enter(page, page.getByRole('button', { name: '다시 표시', exact: true }));
        await page.getByRole('tab', { name: /^숨김 0$/ }).waitFor();
        await enter(page, page.getByRole('button', { name: '목표재고 추적표 보기' }).first());
        const tracking = page.getByRole('article').filter({ has: page.getByRole('heading', { name: '목표재고 추적표', exact: true }) });
        const trackingSearch = tracking.getByRole('searchbox', { name: '목표재고 추적표 키워드' });
        assert.equal(await trackingSearch.isDisabled(), true);
        const productFilter = tracking.getByRole('combobox', { name: '디자인 필터' });
        assert.equal(await productFilter.inputValue(), '');
        await productFilter.selectOption({ label: '반팔 티셔츠' });
        assert.equal(await trackingSearch.isEnabled(), true);
        await trackingSearch.fill('찾을수없는옵션');
        await tracking.getByText('목표재고가 1 이상인 옵션 품목 중 검색 조건에 맞는 것이 없습니다', { exact: false }).waitFor();
        await productFilter.selectOption('');
        assert.equal(await trackingSearch.inputValue(), '');
        assert.equal(await trackingSearch.isDisabled(), true);

        await page.evaluate(() => {
          const storageName = 'vintad3e-apparel-fixture-stock';
          const rows = JSON.parse(sessionStorage.getItem(storageName));
          rows['basic:hanam:TSHIRT-001-WH-L'] = { onHand: 2, target: 5, shortage: 3, tracking: true };
          sessionStorage.setItem(storageName, JSON.stringify(rows));
        });
        await page.reload();
        await page.locator('.dashboard-monitor[data-hydrated="true"]').waitFor();
        await enter(page, page.getByRole('button', { name: '목표재고 추적표 보기' }).first());
        const trackingPanel = page.getByRole('article').filter({ has: page.getByRole('heading', { name: '목표재고 추적표', exact: true }) });
        await trackingPanel.getByRole('combobox', { name: '디자인 필터' }).selectOption({ label: '반팔 티셔츠' });
        const trackingRows = trackingPanel.locator('.inventory-tracking-table__row');
        await page.waitForFunction(() => document.querySelectorAll('.inventory-tracking-table__row').length === 2);
        const searchTracking = trackingPanel.getByRole('searchbox', { name: '목표재고 추적표 키워드' });
        for (const keyword of ['화이트', '하남']) {
          await searchTracking.fill(keyword);
          await page.waitForFunction(() => document.querySelectorAll('.inventory-tracking-table__row').length === 1);
          assert.match(await trackingRows.first().innerText(), new RegExp(keyword));
        }
        await searchTracking.fill('');
        await page.waitForFunction(() => document.querySelectorAll('.inventory-tracking-table__row').length === 2);
        for (const [label, column] of [['현재고', 0], ['목표재고', 1], ['부족수량', 2]]) {
          const header = trackingPanel.getByRole('button', { name: label, exact: true });
          const values = () => trackingRows.evaluateAll((rows, index) => rows.map(row => Number(row.querySelectorAll('input[type=number]')[index].value)), column);
          await enter(page, header);
          const descending = await values();
          assert.deepEqual(descending, [...descending].sort((a, b) => b - a));
          await enter(page, header);
          assert.deepEqual(await values(), [...descending].reverse());
        }
        for (const label of ['옵션명', '재고 위치']) {
          const header = trackingPanel.getByRole('button', { name: label, exact: true });
          await enter(page, header);
          assert.equal(await header.getAttribute('aria-pressed'), 'true');
        }
        await page.evaluate(() => {
          const storageName = 'vintad3e-apparel-fixture-stock';
          const rows = JSON.parse(sessionStorage.getItem(storageName));
          delete rows['basic:hanam:TSHIRT-001-WH-L'];
          sessionStorage.setItem(storageName, JSON.stringify(rows));
        });

        await page.goto(`${origin}/admin/products`);
        const editStock = page.getByRole('button', { name: '반팔 티셔츠 재고 수정 창 열기' });
        const inventoryDialog = page.getByRole('dialog', { name: '반팔 티셔츠' });
        for (let attempt = 0; attempt < 5 && await inventoryDialog.count() === 0; attempt++) {
          await enter(page, editStock);
          try { await inventoryDialog.waitFor({ state: 'visible', timeout: 1000 }); } catch {}
        }
        await inventoryDialog.waitFor({ state: 'visible' });
        const locations = inventoryDialog.getByRole('tablist', { name: '재고 위치 탭' });
        for (const [name, count] of [['성수', 2], ['하남', 2], ['전체', 4]]) {
          const tab = locations.getByRole('tab', { name: new RegExp(`^${name} ${count}$`) });
          await enter(page, tab);
          assert.equal(await tab.getAttribute('aria-selected'), 'true');
          assert.equal(await inventoryDialog.locator('.shortage-table__row').count(), count);
        }
        const colours = () => inventoryDialog.locator('.shortage-table__row .shortage-table__option-cell:nth-child(2)').allTextContents();
        const colourSort = inventoryDialog.getByRole('button', { name: '색상', exact: true });
        await enter(page, colourSort);
        const ascending = await colours();
        assert.deepEqual(ascending, [...ascending].sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true })));
        await enter(page, colourSort);
        assert.deepEqual(await colours(), [...ascending].reverse());
        for (const name of ['형태', '사이즈', '재고 위치']) {
          const header = inventoryDialog.getByRole('button', { name, exact: true });
          await enter(page, header);
          assert.equal(await header.getAttribute('aria-pressed'), 'true');
        }
        for (const [name, index] of [['현재고', 0], ['목표재고', 1], ['부족수량', 2]]) {
          const header = inventoryDialog.getByRole('button', { name, exact: true });
          const values = () => inventoryDialog.locator('.shortage-table__row').evaluateAll((rows, column) => rows.map(row => Number(row.querySelectorAll('input[type=number]')[column].value)), index);
          await enter(page, header);
          const numbers = await values();
          assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
          await enter(page, header);
          assert.deepEqual(await values(), [...numbers].reverse());
        }
        await enter(page, inventoryDialog.getByRole('button', { name: '재고 수정 창 닫기' }));
        await inventoryDialog.waitFor({ state: 'detached' });
        const collections = page.getByRole('tablist', { name: '인벤토리 분류' });
        const optionSelects = page.locator('.inventory-filter-form select');
        const optionValues = ['반팔', '블랙', 'M', 'UNISEX'];
        const optionParams = ['type', 'color', 'size', 'target'];
        for (const [collection, product] of [['자체', '반팔 티셔츠'], ['협업', '협업 티셔츠']]) {
          await enter(page, collections.getByRole('tab', { name: collection, exact: true }));
          for (let mask = 0; mask < 16; mask++) {
            for (let i = 0; i < optionValues.length; i++) await optionSelects.nth(i).selectOption(mask & (1 << i) ? optionValues[i] : '');
            const query = new URL(page.url()).searchParams;
            for (let i = 0; i < optionParams.length; i++) assert.equal(query.get(optionParams[i]), mask & (1 << i) ? optionValues[i] : null);
            assert.equal(query.get('collection'), collection === '협업' ? 'collab' : null);
            await page.getByRole('heading', { name: product, exact: true }).waitFor();
          }
          for (let i = 0; i < optionValues.length; i++) await optionSelects.nth(i).selectOption('');
        }
        await enter(page, collections.getByRole('tab', { name: '자체', exact: true }));
        const inventorySearch = page.locator('.inventory-filter-form input[name="search"]');
        for (const keyword of ['반팔', 'TSHIRT-001']) {
          await inventorySearch.fill(keyword);
          await page.getByRole('heading', { name: '반팔 티셔츠', exact: true }).waitFor();
          assert.equal(new URL(page.url()).searchParams.get('search'), keyword);
        }
        await inventorySearch.fill('찾을수없는상품');
        await page.getByText('표시할 옵션 품목이 없습니다.', { exact: true }).waitFor();
        await inventorySearch.fill('');
        const productCard = page.locator('details.product-card').filter({ has: page.getByRole('heading', { name: '반팔 티셔츠', exact: true }) });
        await enter(page, productCard.locator('summary'));
        const productTable = productCard.locator('table');
        for (const [label, column] of [['재고관리코드', 0], ['옵션명', 1], ['형태', 2], ['색상', 3], ['사이즈', 4], ['대상', 5], ['단위', 6]]) {
          const header = productTable.getByRole('button', { name: label, exact: true });
          const values = () => productTable.locator('tbody tr').evaluateAll((rows, index) => rows.map(row => row.cells[index].textContent), column);
          await enter(page, header);
          const ascending = await values();
          assert.deepEqual(ascending, [...ascending].sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true })));
          await enter(page, header);
          assert.deepEqual(await values(), [...ascending].reverse());
        }
        await optionSelects.nth(1).selectOption('화이트');
        await optionSelects.nth(2).selectOption('M');
        await page.getByText('표시할 옵션 품목이 없습니다.', { exact: true }).waitFor();

        await page.goto(`${origin}/admin/inventory/shortages`);
        await page.locator('[data-hydrated="true"] .shortage-editor').waitFor();
        const shortageTabs = page.getByRole('tablist', { name: '부족 재고 탭' });
        for (const [label, count] of [['부족', 1], ['부족하지 않음', 5], ['부족', 1]]) {
          const tab = shortageTabs.getByRole('tab', { name: new RegExp(`^${label} ${count}$`) });
          await enter(page, tab);
          assert.equal(await tab.getAttribute('aria-selected'), 'true');
          assert.equal(await page.locator('.shortage-table__row').count(), count);
        }

        await page.goto(`${origin}/admin/inventory/graphics/TSHIRT-001`);
        await page.locator('.console-page[data-hydrated="true"] .shortage-editor').waitFor();
        assert.deepEqual(await page.locator('.console-page__summary strong').allTextContents(), ['2', '1', '2']);
        const graphicTabs = page.getByRole('tablist', { name: '부족 재고 탭' });
        for (const [label, count] of [['부족', 1], ['부족하지 않음', 3], ['전체', 4]]) {
          const tab = graphicTabs.getByRole('tab', { name: new RegExp(`^${label} ${count}$`) });
          await enter(page, tab);
          assert.equal(await tab.getAttribute('aria-selected'), 'true');
          assert.equal(await page.locator('.shortage-table__row').count(), count);
        }
        const graphicTable = page.getByRole('table', { name: '옵션 품목 부족 재고' });
        for (const name of ['형태', '색상', '사이즈']) {
          const header = graphicTable.getByRole('button', { name, exact: true });
          await enter(page, header);
          assert.equal(await header.getAttribute('aria-pressed'), 'true');
        }
        for (const [name, index] of [['현재고', 0], ['목표재고', 1], ['부족수량', 2]]) {
          const header = graphicTable.getByRole('button', { name, exact: true });
          const values = () => graphicTable.locator('.shortage-table__row').evaluateAll((rows, column) => rows.map(row => Number(row.querySelectorAll('input[type=number]')[column].value)), index);
          await enter(page, header);
          const numbers = await values();
          assert.deepEqual(numbers, [...numbers].sort((a, b) => a - b));
          await enter(page, header);
          assert.deepEqual(await values(), [...numbers].reverse());
        }

        for (const path of ['sales', 'audit']) {
          await page.goto(`${origin}/admin/${path}`);
          const filter = page.locator('.audit-filter-bar[data-hydrated="true"]');
          await filter.waitFor();
          await filter.locator('select[name="range"]').selectOption('custom');
          const dates = filter.getByRole('group', { name: '기간 직접 지정' });
          await dates.getByLabel('시작일').fill('2026-01-01');
          await dates.getByLabel('종료일').fill('2026-12-31');
          await enter(page, dates.getByRole('button', { name: '닫기', exact: true }));
          await enter(page, filter.getByRole('button', { name: '적용', exact: true }));
          await page.waitForURL(url => url.pathname === `/admin/${path}` && url.searchParams.get('range') === 'custom' && url.searchParams.get('from') === '2026-01-01' && url.searchParams.get('to') === '2026-12-31');
          await page.reload();
          await page.locator('.audit-filter-bar[data-hydrated="true"]').waitFor();
          assert.equal(await page.locator('.audit-filter-bar').getByLabel('시작일').inputValue(), '2026-01-01');
          assert.equal(await page.locator('.audit-filter-bar').getByLabel('종료일').inputValue(), '2026-12-31');
          await enter(page, page.locator('.audit-filter-bar').getByRole('button', { name: '초기화', exact: true }));
          await page.waitForURL(url => url.pathname === `/admin/${path}` && url.search === '');
          await page.waitForFunction(() => document.querySelector('.audit-filter-bar select[name="range"]')?.value === 'all');
          assert.equal(await page.locator('.audit-filter-bar select[name="range"]').inputValue(), 'all');
        }

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
