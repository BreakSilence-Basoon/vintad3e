import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('floor sales search, pagination and inventory read view work with keyboard input', { timeout: 90000 }, async () => {
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
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(origin + '/');
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
        await page.goto(`${origin}/inventory`);
        await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('재료 01'));
        assert.equal(await page.locator('.inventory-editor').count(), 0);
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
