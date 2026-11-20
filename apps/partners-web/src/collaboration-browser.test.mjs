import test from 'node:test'; import assert from 'node:assert/strict';
import { createServer } from 'node:net'; import { spawn } from 'node:child_process'; import { once } from 'node:events'; import { setTimeout as delay } from 'node:timers/promises'; import { chromium } from 'playwright';
async function port() { const s = createServer(); s.listen(0,'127.0.0.1'); await once(s,'listening'); const p=s.address().port; await new Promise(r=>s.close(r)); return p; }
test('collaboration period screen requires a session and filters synthetic sales', {timeout:120000}, async () => {
  const origin=`http://127.0.0.1:${await port()}`, child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',new URL(origin).port],{env:{...process.env,NODE_ENV:'development',VINTAD3E_PARTNERS_FIXTURE:'1',VINTAD3E_PARTNERS_FIXTURE_ORIGIN:origin},stdio:'ignore'}); let browser;
  try {
    let ready=false; for(let i=0;i<120;i++){ try {if((await fetch(origin)).ok){ready=true;break;}}catch{} await delay(250); } assert.ok(ready);
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox']});
    for(const width of [1440,390]) { const context=await browser.newContext({viewport:{width,height:844}}), page=await context.newPage(); try {
      const path='/proj-bedroom/partner-01/settlement'; await page.goto(origin+path); assert.equal(new URL(page.url()).pathname,'/sign-in');
      await page.getByRole('button',{name:'회사 계정으로 로그인'}).click(); await page.waitForURL(origin+'/');
      await page.goto(origin+path); assert.equal(await page.locator('tbody tr').count(),2);
      await page.locator('[name=from]').fill('2026-01-03'); await page.locator('[name=to]').fill('2026-01-03'); await page.getByRole('button',{name:'조회'}).click(); await page.waitForURL(/from=2026-01-03/); assert.equal(await page.locator('tbody tr').count(),1);
      await page.goto(origin+path+'?from=2027-01-01'); await page.getByText('조회 기간에 협업 제품 판매가 없습니다.').waitFor();
      await page.goto(origin+path+'?from=2026-02-30'); await page.getByRole('alert').filter({ hasText: '조회 기간을 확인해 주세요.' }).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    } finally {await context.close();} }
  } finally { await browser?.close(); child.kill('SIGTERM'); if(child.exitCode===null) await Promise.race([once(child,'exit'),delay(5000)]); if(child.exitCode===null) child.kill('SIGKILL'); }
});
