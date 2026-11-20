import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function freePort() {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function waitFor(fn) {
  for (let i = 0; i < 120; i++) { try { const result = await fn(); if (result) return result; } catch {} await delay(250); }
  throw new Error('Timed out waiting for browser or server');
}

test('fixture sales pagination, search and sort in Chrome', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-floor-browser-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_FLOOR_FIXTURE:'1',VINTAD3E_FLOOR_FIXTURE_ORIGIN:origin}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(`${origin}/sales`)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate',{url:origin});
    await waitFor(async () => evaluate("location.pathname === '/sign-in' && Boolean(document.querySelector('form button'))"));
    await evaluate("document.querySelector('form button').click()");
    await waitFor(async () => evaluate("document.querySelector('.floor-summary__value')?.textContent.includes('12,000원')"));
    assert.ok(await evaluate("document.querySelector('#floor-menus-title')?.textContent.includes('메뉴별 판매')"));
    assert.ok(await evaluate("document.querySelector('.floor-table--menus')?.textContent.includes('드립 커피')"));
    await evaluate("[...document.querySelectorAll('.floor-chip')].find(a => a.textContent === '최근 7일').click()");
    await waitFor(async () => evaluate("location.search.includes('preset=7d') && document.querySelector('.floor-chip.is-active')?.textContent === '최근 7일'"));
    assert.ok(await evaluate("document.querySelector('[aria-labelledby=revenue-trend-title]').textContent.includes('32,000원')"));
    await evaluate("document.querySelector('[aria-label=\"전날 영업일\"]').click()");
    await waitFor(async () => evaluate("document.querySelector('.floor-section--empty')?.textContent.includes('이 영업일에는 반영된 F&B 판매가 없습니다.')"));
    await send('Page.navigate',{url:`${origin}/sales`});
    await waitFor(async () => evaluate("document.querySelectorAll('.sales-audit-card').length === 18"));
    assert.ok(await evaluate("document.querySelectorAll('.sales-audit-card')[0].textContent.includes('드립 커피')"));
    assert.ok(await evaluate("document.querySelectorAll('.sales-audit-card')[2].querySelector('strong').textContent === '-'"));
    assert.ok(await evaluate("document.querySelector('.load-more-pager').textContent.includes('18 / 21')"));
    assert.equal(await evaluate("document.querySelector('[aria-label=\"판매내역 더 불러오기\"] a').getAttribute('href')"), '/sales?salesPage=2');
    await evaluate("document.querySelector('[aria-label=\"판매내역 더 불러오기\"] a').click()");
    await waitFor(async () => evaluate("document.querySelectorAll('.sales-audit-card').length === 21"));
    assert.ok(await evaluate("!document.querySelector('.load-more-pager')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.sales-audit-card').length===1&&document.querySelector('.sales-audit-card').textContent.includes('쿠키'))return true;const f=document.querySelector('.audit-filter-bar');f.querySelector('[name=keyword]').value='쿠키';f.requestSubmit();return false;})()"));
    assert.ok(await evaluate("document.querySelector('.sales-audit-card').textContent.includes('4,000 KRW')"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelectorAll('.sales-audit-card').length===18&&document.querySelector('.sales-audit-card').textContent.includes('주스'))return true;const f=document.querySelector('.audit-filter-bar');f.querySelector('[name=keyword]').value='';f.querySelector('[name=sort]').value='asc';f.requestSubmit();return false;})()"));
    assert.ok(await evaluate("document.querySelector('.load-more-pager').textContent.includes('18 / 21')"));
    assert.ok(await evaluate("document.querySelector('.load-more-pager a').getAttribute('href').includes('sort=asc')"));
    await send('Page.navigate',{url:`${origin}/inventory`});
    await waitFor(async () => evaluate("document.querySelector('main')?.textContent.includes('재료 01')"));
    assert.ok(await evaluate("document.querySelector('main').textContent.includes('음료 01')"));
    assert.equal(await evaluate("document.querySelectorAll('.inventory-editor').length"), 0);
    await send('Network.clearBrowserCookies');
    await send('Page.navigate',{url: `${origin}/auth/session-resume?next=%2Fconfirmations%2Fproposal-01`});
    await waitFor(async () => evaluate("location.pathname === '/sign-in'"));
    await evaluate("document.querySelector('form button').click()");
    await waitFor(async () => evaluate("location.pathname === '/confirmations/proposal-01'"));
    await waitFor(async () => evaluate("[...document.querySelectorAll('button')].some(b => b.textContent === '제안 불러오기')"));
    await waitFor(async () => evaluate("(()=>{if(document.body.textContent.includes('재료 이름 변경'))return true;[...document.querySelectorAll('button')].find(b => b.textContent === '제안 불러오기')?.click();return false;})()"));
    await waitFor(async () => evaluate("(()=>{if(document.body.textContent.includes('이 내용으로 확인'))return true;[...document.querySelectorAll('button')].find(b => b.textContent === '제안 검토')?.click();return false;})()"));
    await waitFor(async () => evaluate("(()=>{if(document.body.textContent.includes('확인되었습니다.'))return true;[...document.querySelectorAll('button')].find(b => b.textContent === '이 변경 확인')?.click();return false;})()"));
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert.ok(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"));
    await send('Page.navigate',{url: `${origin}/confirmations/unknown`});
    await waitFor(async () => evaluate("document.body.textContent.includes('404')"));
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
