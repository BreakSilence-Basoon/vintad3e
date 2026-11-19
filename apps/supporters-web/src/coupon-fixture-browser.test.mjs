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

test('SNS pages retain the original empty state without fixtures', { timeout: 60000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_SUPPORTERS_FIXTURE:''}, stdio:'ignore' });
  try {
    for (const [path, platform] of [['instagram', 'Instagram'], ['tiktok', 'TikTok']]) {
      const response = await waitFor(async () => { const result = await fetch(`${origin}/${path}`); return result.ok ? result : false; });
      assert.ok((await response.text()).replace(/<!--.*?-->/g, '').includes(`${platform} 계정을 연결한 서포터즈가 생기면 여기에서 성과를 볼 수 있습니다.`));
    }
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await Promise.race([once(server,'exit'),delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill('SIGKILL');
  }
});

test('fixture selection and copy use synthetic data in Chrome', { timeout: 90000 }, async () => {
  const port = await freePort(), debuggerPort = await freePort();
  const origin = `http://127.0.0.1:${port}`, debug = `http://127.0.0.1:${debuggerPort}`;
  const profile = await mkdtemp(join(tmpdir(), 'vintad3e-supporters-browser-'));
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)], { env:{...process.env,NODE_ENV:'development',VINTAD3E_SUPPORTERS_FIXTURE:'1'}, stdio:'ignore' });
  const chrome = spawn('google-chrome', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',`--user-data-dir=${profile}`,`--remote-debugging-port=${debuggerPort}`,'about:blank'], { stdio:'ignore' });
  let socket, closeBrowser;
  try {
    await waitFor(async () => (await fetch(`${origin}/coupon`)).ok);
    await waitFor(async () => (await fetch(`${debug}/json/version`)).ok);
    const target = await (await fetch(`${debug}/json/new?about:blank`, {method:'PUT'})).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject) => { socket.addEventListener('open',resolve,{once:true}); socket.addEventListener('error',reject,{once:true}); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const {resolve,reject} = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); } });
    const send = (method,params={}) => new Promise((resolve,reject) => { const id = ++sequence; pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
    closeBrowser = () => send('Browser.close');
    const evaluate = async expression => { const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true}); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
    await send('Page.navigate',{url:`${origin}/coupon`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('#coupon-staff'))"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.coupon-types'))return true;const s=document.querySelector('#coupon-staff');if(s&&!s.disabled){s.value='supporter-1';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.equal(await evaluate("document.querySelector('.coupon-share-field strong').textContent"),'VINTAD3E');
    assert.equal(await evaluate("document.querySelectorAll('.coupon-stats dd')[0].textContent"),'2건');
    await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}})");
    await evaluate("document.querySelector('[aria-label=\"추천인 코드 복사\"]').click()");
    await waitFor(async () => evaluate("window.copied === 'VINTAD3E'"));
    await evaluate("document.querySelector('[aria-label=\"국내 · 자동 링크 복사\"]').click()");
    await waitFor(async () => evaluate("window.copied?.startsWith('https://example.invalid/coupon?')"));
    assert.equal(await evaluate("document.querySelector('[aria-label=\"글로벌 · 자동 링크 사용 불가\"]').disabled"),true);
    await waitFor(async () => evaluate("(()=>{if(location.search.includes('supporter-2')&&!document.querySelector('.coupon-types'))return true;const s=document.querySelector('#coupon-staff');if(s&&!s.disabled){s.value='supporter-2';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.equal(await evaluate("document.querySelector('#coupon-staff').value"), 'supporter-2');
    assert.ok(await evaluate("!document.querySelector('.coupon-share-field')"));
    await waitFor(async () => evaluate("(()=>{if(location.search.includes('supporter-1')&&document.querySelector('.coupon-share-field strong')?.textContent==='VINTAD3E')return true;const s=document.querySelector('#coupon-staff');if(s&&!s.disabled){s.value='supporter-1';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    for (const [path, platform] of [['instagram', 'Instagram'], ['tiktok', 'TikTok']]) {
      await send('Page.navigate',{url:`${origin}/${path}`});
      await waitFor(async () => evaluate("Boolean(document.querySelector('#coupon-staff'))"));
      await waitFor(async () => evaluate("(()=>{if(document.querySelector('[role=table]'))return true;const s=document.querySelector('#coupon-staff');if(s&&!s.disabled){s.value='supporter-1';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
      assert.equal(await evaluate("document.querySelector('[role=table]').getAttribute('aria-label')"), `${platform} 게시물 성과`);
      assert.equal(await evaluate("document.querySelectorAll('.gtm-sns-performance-table__row').length"), 2);
      assert.equal(await evaluate("document.querySelector('.gtm-sns-performance-table__row .register-toggle-button').getAttribute('aria-pressed')"), 'true');
      assert.equal(await evaluate("document.querySelector('.gtm-sns-performance-table__row .register-toggle-button').disabled"), true);
      assert.equal(await evaluate("new URL(document.querySelector('.gtm-sns-performance-table__row a').href).hostname"), 'example.invalid');
      await evaluate("document.querySelector('[title=\"게시일 오름차순으로 정렬\"]').click()");
      await waitFor(async () => evaluate("document.querySelector('.gtm-sns-performance-table__row .register-toggle-button')?.getAttribute('aria-pressed') === 'false'"));
      assert.equal(await evaluate("document.querySelector('.gtm-sync-basis').textContent"), `${platform} 동기화 기록 없음`);
      await evaluate("document.querySelector('.gtm-sns-score-toggle').click()");
      assert.equal(await evaluate("document.querySelector('.gtm-sns-score-toggle').getAttribute('aria-expanded')"), 'true');
    }
    await send('Page.navigate',{url:`${origin}/settlements`});
    await waitFor(async () => evaluate("Boolean(document.querySelector('#coupon-staff'))"));
    await waitFor(async () => evaluate("(()=>{if(document.querySelector('.settlement-history__table input:not(:disabled)'))return true;const s=document.querySelector('#coupon-staff');if(s&&!s.disabled){s.value='supporter-1';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.equal(await evaluate("document.querySelector('.settlement-history__table tbody input').checked"), false);
    await evaluate("document.querySelector('.settlement-history__table tbody input').click()");
    await waitFor(async () => evaluate("document.querySelector('.settlement-history__table tbody input')?.checked === true"));
    assert.ok(await evaluate("document.querySelector('.settlement-history__table tbody input').getAttribute('aria-label').startsWith('지급 완료')"));
    await evaluate('window.__beforeSettlementReload = true');
    await send('Page.reload');
    await waitFor(async () => evaluate("window.__beforeSettlementReload !== true && document.querySelector('.settlement-history__table tbody input:not(:disabled)')?.checked === true"));
    await waitFor(async () => evaluate("(()=>{const s=document.querySelector('#coupon-staff');if(document.querySelector('[data-fixture-staff=\"supporter-2\"] .settlement-history__table tbody input:not(:disabled)'))return true;if(s&&!s.disabled){s.value='supporter-2';s.dispatchEvent(new Event('change',{bubbles:true}));}return false;})()"));
    assert.equal(await evaluate("document.querySelector('.settlement-history__table tbody input').checked"), false);
  } finally {
    if (closeBrowser) await Promise.race([closeBrowser().catch(() => {}), delay(3000)]);
    socket?.close();
    for (const process of [chrome,server]) process.kill('SIGTERM');
    await Promise.all([chrome,server].map(async process => { if (process.exitCode === null && process.signalCode === null) await Promise.race([once(process,'exit'),delay(5000)]); if (process.exitCode === null && process.signalCode === null) process.kill('SIGKILL'); }));
    await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
});
