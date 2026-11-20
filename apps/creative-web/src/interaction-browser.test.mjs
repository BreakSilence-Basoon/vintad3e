import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function press(page, role, name) {
  const button = page.getByRole(role, { name, exact: true });
  await button.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await button.elementHandle()); await button.focus(); await page.keyboard.press('Enter');
}

test('creative login, confirmation and failures work in a browser', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_CREATIVE_FIXTURE: '1', VINTAD3E_CREATIVE_FIXTURE_ORIGIN: origin }, stdio: 'ignore',
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (server.exitCode !== null) throw new Error('fixture server exited');
      try { if ((await fetch(`${origin}/sign-in`)).ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    assert.ok(ready, 'fixture server did not start');
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/confirmations/proposal-01`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation')).status), 401);
        await press(page, 'button', '회사 계정으로 로그인');
        await page.waitForURL('**/confirmations/proposal-01');
        await page.getByRole('link', { name:'staff01@example.invalid 로그인 화면 보기' }).click();
        await page.getByRole('link', { name:'Creative로 돌아가기' }).click();
        await page.waitForURL(origin + '/');
        await page.goto(origin + '/confirmations/proposal-01');
        await page.getByRole('link', { name:'Creative 홈으로 이동' }).click();
        await page.waitForURL(origin + '/');
        await page.getByText('매장 촬영', { exact:true }).waitFor();
        await page.goto(origin + '/confirmations/proposal-01');

        // Invalid actions must not skip the review or change the stored proposal.
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'confirm' }) })).status), 409);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'review' }) })).status), 409);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'load', extra: true }) })).status), 400);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ action: 'load' }) })).status), 400);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation')).json().then(r => r.state)), 'idle');

        // Fail the server once and verify the screen recovers on the next request.
        await page.route('**/api/fixture/confirmation', route => route.fulfill({ status: 503, body: '' }));
        await page.reload();
        await page.locator('p[role=alert]').waitFor();
        await page.unroute('**/api/fixture/confirmation');
        await press(page, 'button', '제안 불러오기');
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status), 400);
        assert.equal(await page.evaluate(async () => (await fetch('/api/fixture/confirmation', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status), 400);
        await press(page, 'button', '제안 검토');
        await page.getByRole('button', { name: '이 변경 확인' }).waitFor();
        await press(page, 'button', '이 변경 확인');
        await page.getByText('확인 기록이 저장되었습니다.', { exact: false }).waitFor();
        await page.reload();
        await page.getByText('확인 기록이 저장되었습니다.', { exact: false }).waitFor();
        await page.goto(origin);
        await page.getByText('매장 촬영', { exact: true }).waitFor();
        await page.getByRole('button', { name:'로그아웃' }).click();
        await page.waitForURL('**/sign-in');
        await page.goto(`${origin}/confirmations/proposal-01`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        assert.equal((await page.goto(`${origin}/confirmations/unknown`)).status(), 404);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); server.kill('SIGTERM');
    if (server.exitCode === null) await Promise.race([once(server, 'exit'), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
});


test('creative project empty and read-error states match original', { timeout: 120000 }, async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true, args:['--no-sandbox'] });
  try { for (const state of ['empty','error']) {
    const port=await freePort(), origin=`http://127.0.0.1:${port}`;
    const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'development',VINTAD3E_CREATIVE_FIXTURE:'1',VINTAD3E_CREATIVE_FIXTURE_ORIGIN:origin,VINTAD3E_CREATIVE_FIXTURE_STATE:state},stdio:'ignore'});
    try { let ready=false; for(let i=0;i<120;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{} await delay(250);} assert.ok(ready);
      for(const width of [1440,390]) {const context=await browser.newContext({viewport:{width,height:844}});try{const page=await context.newPage();await page.goto(origin);await page.waitForURL('**/sign-in');await page.getByRole('button',{name:'회사 계정으로 로그인'}).click();await page.waitForURL(origin+'/');if(state==='empty'){await page.getByText('등록된 프로젝트가 없습니다.').waitFor();assert.equal(await page.locator('.staff-list__item').count(),0);}else{await page.getByRole('alert').filter({hasText:'프로젝트 목록을 불러오지 못했습니다.'}).waitFor();await page.reload();await page.getByText('프로젝트 목록을 불러오지 못했습니다.').waitFor();}assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}finally{await context.close();}}
    } finally {server.kill('SIGTERM');if(server.exitCode===null)await Promise.race([once(server,'exit'),delay(5000)]);if(server.exitCode===null)server.kill('SIGKILL');}
  }} finally {await browser.close();}
});
