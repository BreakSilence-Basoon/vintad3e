import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('inventory read error follows the source screen at desktop and mobile widths', { timeout: 90000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_FLOOR_FIXTURE: '1', VINTAD3E_FLOOR_FIXTURE_ORIGIN: origin, VINTAD3E_FLOOR_INVENTORY_STATE: 'error' }, stdio: 'ignore' });
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
        await page.goto(`${origin}/inventory`);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/inventory');
        await page.getByRole('heading', { name: '재고 관리' }).waitFor();
        await page.getByRole('alert').filter({ hasText: '재고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.' }).waitFor();
        assert.equal(await page.locator('.inventory-editor').count(), 0);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});

test('floor sales search, pagination and inventory read view work with keyboard input', { timeout: 150000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_FLOOR_FIXTURE: '1', VINTAD3E_FLOOR_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(`${origin}/sales`)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/sales?salesPage=wrong`);
        await page.waitForURL('**/sign-in?next=%2F');
        for (const [error, title] of [['AccessDenied', '로그인을 완료하지 못했습니다.'], ['SessionExpired', '다시 로그인이 필요합니다.'], ['__proto__', '로그인을 완료하지 못했습니다.']]) {
          await page.goto(`${origin}/sign-in?next=%2F&error=${error}`);
          await page.getByRole('alert').locator('strong').filter({ hasText: title }).waitFor();
          await page.waitForFunction(() => !new URL(location.href).searchParams.has('error'));
          assert.equal(new URL(page.url()).searchParams.get('next'), '/');
        }
        await page.reload();
        assert.equal(await page.locator('.staff-sign-in-toast').count(), 0);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(origin + '/');
        const dateInput = page.getByLabel('영업일 선택');
        const latestDate = await dateInput.inputValue();
        assert.equal(await dateInput.getAttribute('max'), latestDate);
        assert.equal(await page.getByRole('link', { name: '다음 영업일' }).count(), 0);
        await enter(page, page.getByRole('link', { name: '전날 영업일' }));
        await page.waitForURL(/\?date=/);
        assert.notEqual(await dateInput.inputValue(), latestDate);
        await enter(page, page.getByRole('link', { name: '다음 영업일' }));
        await page.waitForFunction(expected => document.querySelector('input[name=date]')?.value === expected, latestDate);
        await dateInput.fill('2024-01-01');
        await enter(page, page.locator('.floor-date-nav').getByRole('button', { name: '보기', exact: true }));
        await page.waitForURL('**/?date=2024-01-01');
        await page.getByRole('region', { name: '빈 영업일' }).waitFor();
        await page.goto(`${origin}/?date=not-a-date`);
        assert.equal(await dateInput.inputValue(), latestDate);
        await page.goto(`${origin}/sign-in?mode=cover&next=%2Fsales%3Frange%3D7d`);
        await enter(page, page.getByRole('link', { name: 'Floor로 돌아가기' }));
        await page.waitForURL('**/sales?range=7d');
        await page.goto(`${origin}/sign-in?mode=cover&mode=other&next=%2Finventory`);
        await enter(page, page.getByRole('link', { name: 'Floor로 돌아가기' }));
        await page.waitForURL('**/inventory');
        await page.goto(`${origin}/sales?salesPage=wrong`);
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 18);
        await page.getByText('판매 항목 없음', { exact: true }).waitFor();
        await enter(page, page.locator('[aria-label="판매내역 더 불러오기"] a'));
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 21);
        const form = page.locator('.audit-filter-bar');
        const search = form.locator('input[name=keyword]');
        await search.focus(); await page.keyboard.type('찾을수없는항목');
        await enter(page, form.getByRole('button', { name: '적용' }));
        await page.waitForURL(/keyword=/);
        assert.equal(await page.locator('.sales-audit-card').count(), 0);
        await enter(page, form.getByRole('button', { name: '초기화' }));
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 18);
        await form.locator('select[name=range]').selectOption('30d');
        await form.locator('select[name=sort]').selectOption('asc');
        await enter(page, form.getByRole('button', { name: '적용' }));
        await page.waitForFunction(() => { const params = new URL(location.href).searchParams; return params.get('range') === '30d' && params.get('sort') === 'asc'; });
        await page.locator('.sales-audit-card').first().getByText('주스').first().waitFor();
        const more = page.locator('[aria-label="판매내역 더 불러오기"] a');
        assert.match(await more.getAttribute('href'), /range=30d/);
        assert.match(await more.getAttribute('href'), /sort=asc/);
        await enter(page, more);
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 21);
        await form.locator('select[name=range]').selectOption('custom');
        const custom = page.getByRole('group', { name: '기간 직접 지정' });
        await custom.getByLabel('시작일').fill('2024-01-01');
        await custom.getByLabel('종료일').fill('2024-01-02');
        await enter(page, custom.getByRole('button', { name: '닫기' }));
        await enter(page, form.getByRole('button', { name: '적용' }));
        await page.waitForFunction(() => { const params = new URL(location.href).searchParams; return params.get('range') === 'custom' && params.get('from') === '2024-01-01' && params.get('to') === '2024-01-02'; });
        await page.waitForFunction(() => document.querySelectorAll('.sales-audit-card').length === 0);
        assert.equal(await page.locator('.sales-audit-card').count(), 0);
        await page.goto(`${origin}/inventory`);
        await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('재료 01'));
        assert.equal(await page.locator('.inventory-editor').count(), 0);
        await page.goto(`${origin}/confirmations/proposal-01`);
        let failure = 'denied';
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: failure }) }));
        for (const [code, message, needsLogin] of [
          ['denied', '이 제안을 열거나 확인할 권한이 없습니다.', false],
          ['changed', '제안, 권한 또는 확인 세션이 변경되었거나 만료되었습니다.', true],
          ['sign-in-required', '로그인이 만료되었거나 새 인증이 필요합니다.', true],
          ['session-revoked', '로그아웃으로 회수된 회사 확인 세션입니다.', false],
          ['invalid-request', '확인 요청을 처리하지 못했습니다.', false],
          ['unavailable', '변경 확인 서비스에 연결할 수 없습니다.', false],
          ['__proto__', '변경 확인 서비스에 연결할 수 없습니다.', false],
        ]) {
          failure = code;
          await enter(page, page.getByRole('button', { name: /제안 불러오기|최신 상태 다시 불러오기/ }));
          await page.getByRole('alert').filter({ hasText: message }).waitFor();
          assert.equal(await page.getByRole('button', { name: '다시 로그인' }).count(), needsLogin ? 1 : 0);
        }
        await page.unroute('**/api/fixture/confirmation');
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('heading', { name: '제안 내용' }).waitFor();
        await enter(page, page.getByRole('button', { name: '제안 검토' }));
        await enter(page, page.getByRole('button', { name: '이 변경 확인' }));
        await page.getByRole('status').filter({ hasText: '확인 기록이 저장되었습니다.' }).waitFor();
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'changed' }) }));
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('alert').filter({ hasText: '제안, 권한 또는 확인 세션이 변경되었거나 만료되었습니다.' }).waitFor();
        await page.unroute('**/api/fixture/confirmation');
        await enter(page, page.getByRole('button', { name: '다시 로그인' }));
        await page.waitForURL('**/sign-in?next=%2Fconfirmations%2Fproposal-01');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/confirmations/proposal-01');
        await enter(page, page.getByRole('button', { name: '제안 불러오기' }));
        await page.getByRole('status').filter({ hasText: '확인 대기' }).waitFor();
        const unknown = await page.goto(`${origin}/confirmations/not-found`);
        assert.equal(unknown.status(), 404);
        await page.goto(`${origin}/access-denied`);
        await page.getByRole('heading', { name: 'Floor를 사용할 수 없습니다.' }).waitFor();
        await enter(page, page.getByRole('button', { name: '다른 Google 계정으로 로그인' }));
        await page.waitForURL('**/sign-in');
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});


test('floor administrator adds synthetic ingredients and preserves data on storage errors', { timeout: 90000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV:'development', VINTAD3E_FLOOR_FIXTURE:'1', VINTAD3E_FLOOR_FIXTURE_ORIGIN:origin, VINTAD3E_FLOOR_FIXTURE_ADMIN:'1' }, stdio:'ignore' }); let browser;
  try {
    let ready=false; for(let i=0;i<120;i++){try{if((await fetch(origin+'/inventory')).ok){ready=true;break;}}catch{} await delay(250);} assert.ok(ready);
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
    for(const width of [1440,390]) { const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(); try {
      await page.goto(origin+'/inventory'); await page.waitForURL('**/sign-in?next=%2Finventory'); await enter(page,page.getByRole('button',{name:'회사 계정으로 로그인'})); await page.waitForURL('**/inventory'); const editor=page.locator('.inventory-editor').filter({has:page.getByText('재료 등록',{exact:true})}); await enter(page,editor.locator('summary'));
      const input=editor.getByLabel('재료명'); assert.equal(await input.evaluate(el=>el.validity.valueMissing),true);
      await input.fill('재료 02'); await editor.getByLabel('관리 단위').selectOption('g'); await enter(page,editor.getByRole('button',{name:'저장'}));
      await editor.getByText('저장했습니다.').waitFor(); await page.getByRole('rowheader',{name:'재료 02'}).waitFor();
      await page.reload(); await page.getByRole('rowheader',{name:'재료 02'}).waitFor(); await enter(page,editor.locator('summary'));
      await input.fill('재료 02'); await enter(page,editor.getByRole('button',{name:'저장'})); await editor.getByText('입력값을 확인해주세요.').waitFor();
      assert.equal(await page.getByRole('rowheader',{name:'재료 02'}).count(),1);
      const recipeEditor=page.locator('.inventory-editor').filter({has:page.getByText('메뉴별 재료 설정',{exact:true})}); await enter(page,recipeEditor.locator('summary'));
      await recipeEditor.locator('select[name=menu]').selectOption('음료 01'); await recipeEditor.locator('select[name=ingredientId]').selectOption({label:'재료 02 (g)'});
      await recipeEditor.getByLabel('수량',{exact:true}).fill('3.25'); await enter(page,recipeEditor.getByRole('button',{name:'저장'}));
      await recipeEditor.getByText('저장했습니다.').waitFor(); await page.locator('.inventory-list li').filter({hasText:'음료 01'}).getByText('재료 02 3.25 g').waitFor();
      await recipeEditor.locator('select[name=menu]').selectOption('음료 01'); await recipeEditor.locator('select[name=ingredientId]').selectOption({label:'재료 02 (g)'});
      await recipeEditor.getByLabel('수량',{exact:true}).fill('4.5'); await enter(page,recipeEditor.getByRole('button',{name:'저장'}));
      await page.locator('.inventory-list li').filter({hasText:'음료 01'}).getByText('재료 02 4.5 g').waitFor();
      await page.reload(); await page.locator('.inventory-list li').filter({hasText:'음료 01'}).getByText('재료 02 4.5 g').waitFor();
      const countEditor=page.locator('.inventory-editor').filter({has:page.getByText('실제 재고 입력',{exact:true})}); await enter(page,countEditor.locator('summary'));
      const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10); await countEditor.getByLabel('실사일 (한국 시간)').fill(yesterday); await countEditor.getByLabel('시간',{exact:true}).fill('12:00');
      await countEditor.locator('select[name=ingredientId]').selectOption({label:'재료 02 (g)'}); await countEditor.getByLabel('수량',{exact:true}).fill('5.125'); await enter(page,countEditor.getByRole('button',{name:'저장'}));
      await countEditor.getByText('저장했습니다.').waitFor(); assert.ok((await page.getByRole('row').filter({has:page.getByRole('rowheader',{name:/재료 02/})}).innerText()).includes('5.125'));
      const purchaseEditor=page.locator('.inventory-editor').filter({has:page.getByText('구매·입고 기록',{exact:true})}); await enter(page,purchaseEditor.locator('summary'));
      await purchaseEditor.getByLabel('구매처').fill('가게 01'); await purchaseEditor.getByLabel('기록일 (한국 시간)').fill(yesterday); await purchaseEditor.getByLabel('시간',{exact:true}).fill('13:00');
      await purchaseEditor.locator('select[name=ingredientId]').selectOption({label:'재료 02 (g)'}); await purchaseEditor.getByLabel('수량',{exact:true}).fill('2'); await enter(page,purchaseEditor.getByRole('button',{name:'저장'}));
      await purchaseEditor.getByText('저장했습니다.').waitFor(); const purchase=page.locator('.inventory-list li').filter({hasText:'가게 01'}); await purchase.getByText('주문 중',{exact:true}).waitFor();
      await enter(page,purchase.getByRole('button',{name:'지금 입고 완료'})); await purchase.getByText('입고 완료',{exact:true}).waitFor(); assert.ok((await page.getByRole('row').filter({has:page.getByRole('rowheader',{name:/재료 02/})}).innerText()).includes('7.125'));
      await enter(page,purchase.getByRole('button',{name:'기록 취소'})); await purchase.getByText('취소됨',{exact:true}).waitFor();
      await page.reload(); await page.getByText('재고 실사',{exact:true}).waitFor(); await enter(page,page.locator('.inventory-list li').filter({hasText:'재고 실사'}).getByRole('button',{name:'기록 취소'}));
      await page.locator('.inventory-list li').filter({hasText:'재고 실사'}).getByText('취소됨',{exact:true}).waitFor(); assert.ok((await page.getByRole('row').filter({has:page.getByRole('rowheader',{name:/재료 02/})}).innerText()).includes('—'));
      await page.evaluate(()=>sessionStorage.setItem('vintad3e-floor-counts','{bad')); await page.reload();
      await page.getByRole('alert').filter({hasText:'입력값을 확인해주세요.'}).waitFor(); await enter(page,countEditor.locator('summary')); assert.equal(await countEditor.getByRole('button',{name:'저장'}).isDisabled(),true);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('vintad3e-floor-counts')),'{bad'); await page.evaluate(()=>sessionStorage.removeItem('vintad3e-floor-counts'));
      await page.evaluate(()=>sessionStorage.setItem('vintad3e-floor-ingredients','{bad')); await page.reload(); await enter(page,editor.locator('summary'));
      await editor.getByText('입력값을 확인해주세요.').waitFor(); assert.equal(await editor.getByRole('button',{name:'저장'}).isDisabled(),true);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('vintad3e-floor-ingredients')),'{bad');
    } finally {await context.close();} }
  } finally {await browser?.close();child.kill('SIGTERM');if(child.exitCode===null)await Promise.race([once(child,'exit'),delay(5000)]);if(child.exitCode===null)child.kill('SIGKILL');}
});
