import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port; }
async function enter(page, locator) { await locator.waitFor({ state: 'visible' }); await page.waitForFunction(el => !el.disabled, await locator.elementHandle()); await locator.focus(); await page.keyboard.press('Enter'); }

test('meeting list shows the original loading error on desktop and mobile', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin, VINTAD3E_LIBRARY_MEETINGS_STATE: 'error' }, stdio: 'ignore' });
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
        await page.getByRole('alert').getByText('회의 기록을 불러오지 못했습니다.', { exact: true }).waitFor();
        await page.getByLabel('회의 제목').waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});

test('library keyboard actions validate inputs and recover from storage and server errors', { timeout: 180000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_LIBRARY_FIXTURE: '1', VINTAD3E_LIBRARY_FIXTURE_ORIGIN: origin }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error('fixture server exited'); try { if ((await fetch(origin)).ok) { ready = true; break; } } catch {} await delay(250); }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/members`);
        await page.waitForURL('**/sign-in?next=%2Fmembers');
        for (const [error, title] of [['AccessDenied', '로그인을 완료하지 못했습니다.'], ['SessionExpired', '다시 로그인이 필요합니다.'], ['__proto__', '로그인을 완료하지 못했습니다.']]) {
          await page.goto(`${origin}/sign-in?next=%2Fmembers&error=${error}`);
          await page.getByRole('alert').locator('strong').filter({ hasText: title }).waitFor();
          await page.waitForFunction(() => !new URL(location.href).searchParams.has('error'));
          assert.equal(new URL(page.url()).searchParams.get('next'), '/members');
        }
        await page.reload();
        assert.equal(await page.locator('.staff-sign-in-toast').count(), 0);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/members');
        const memberSearch = page.getByLabel('이름 검색');
        await memberSearch.fill('직원');
        await enter(page, page.getByRole('button', { name: '검색', exact: true }));
        await page.waitForFunction(() => new URL(location.href).searchParams.get('q') === '직원');
        await page.locator('.library-member-list li strong').first().waitFor();
        assert.deepEqual(await page.locator('.library-member-list li strong').allTextContents(), ['직원']);
        await memberSearch.fill('찾을수없는이름');
        await enter(page, page.getByRole('button', { name: '검색', exact: true }));
        await page.getByText('구성원이 없습니다.', { exact: true }).waitFor();
        await page.goto(`${origin}/members?q=%EC%A7%81%EC%9B%90&q=%EA%B4%80%EB%A6%AC%EC%9E%90`);
        assert.equal(await memberSearch.inputValue(), '');
        assert.equal(await page.locator('.library-member-list li').count(), 2);
        await context.clearCookies();
        await page.goto(`${origin}/objects/00000000-0000-4000-8000-000000000003`);
        await page.waitForURL('**/sign-in?next=%2Fobjects%2F00000000-0000-4000-8000-000000000003');
        await page.goto(`${origin}/objects/00000000-0000-4000-8000-000000000003?documentId=00000000-0000-4000-8000-000000000001`);
        await page.waitForURL('**/sign-in?next=%2Fobjects%2F00000000-0000-4000-8000-000000000003');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/objects/00000000-0000-4000-8000-000000000003');
        await context.clearCookies();
        await page.goto(`${origin}/auth/session-resume?next=%2Fmypage`);
        await page.waitForURL('**/sign-in?next=%2Fmypage');
        await enter(page,page.getByRole('button',{name:'회사 계정으로 로그인'})); await page.waitForURL('**/mypage');
        await context.clearCookies();
        await page.goto(`${origin}/objects/new`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        assert.equal(await page.evaluate(async () => (await fetch('/api/search?q=매장')).status),401);
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/objects/new');
        await page.goto(`${origin}/ir/00000000-0000-4000-8000-000000000001`);
        await page.getByRole('link', { name: /업무 안내\.txt/ }).waitFor();
        await page.goto(`${origin}/native/00000000-0000-4000-8000-000000000001`);
        const attachment = page.getByRole('link', { name: /업무 안내\.txt/ });
        await enter(page, attachment);
        await page.waitForURL('**/objects/00000000-0000-4000-8000-000000000003?documentId=00000000-0000-4000-8000-000000000001');
        await enter(page, page.getByRole('button', { name: '파일 열기' }));
        await page.locator('pre.publication-content').waitFor();
        assert.equal(await page.evaluate(async () => (await fetch('/objects/00000000-0000-4000-8000-000000000003?documentId=00000000-0000-4000-8000-000000000099')).status), 404);
        await page.goto(`${origin}/objects/new`);
        assert.equal(await page.evaluate(async () => (await fetch('/api/search?q=one&q=two')).status),400);
        await enter(page, page.getByRole('link', {name:'로그인 전 화면 보기'}));
        await page.goto(`${origin}/sign-in?mode=cover&mode=other&next=%2Fobjects%2Fnew`);
        await page.getByRole('link', {name:'Library로 돌아가기'}).click(); await page.waitForURL('**/objects/new');
        await enter(page, page.getByRole('button', {name:'게시물 검색'}));
        const dialog=page.getByRole('dialog',{name:'게시물 검색'}), search=dialog.getByRole('combobox',{name:'게시물 제목 검색'});
        await search.fill('매장'); await dialog.getByRole('option',{name:/매장 운영 안내/}).waitFor();
        await search.fill('찾을수없는항목'); await dialog.getByText('검색 결과가 없습니다.').waitFor();
        await page.route('**/api/search?*',route=>route.fulfill({status:503,body:''}));
        await search.fill('오류'); await dialog.getByRole('alert').waitFor(); await page.unroute('**/api/search?*');
        await page.keyboard.press('Escape'); assert.equal(await dialog.isVisible(),false);
        if(width===390){await page.locator('button[data-hydrated=true][aria-label="메뉴 열기"]').waitFor();await enter(page,page.getByRole('button',{name:'메뉴 열기'}));await page.getByRole('navigation',{name:'모바일 메뉴'}).getByRole('link',{name:'보관함'}).click();await page.waitForURL('**/bookmarks');await page.goto(origin+'/objects/new');}
        const picker = page.locator('#library-object-file');
        const prepare = page.getByRole('button', { name: '업로드 내용 확인' });
        assert.equal(await prepare.isDisabled(), true);
        await picker.setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('wrong') });
        await enter(page, prepare);
        await page.locator('p[role=alert]').waitFor();
        await picker.setInputFiles({ name: '가게 안내.txt', mimeType: 'text/plain', buffer: Buffer.from('업무를 시작하기 전에 필요한 사항을 확인합니다.') });
        await page.locator('.library-register p[role=alert]').waitFor({ state: 'hidden' });
        for (const label of ['업로드 내용 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '업로드 승인']) await enter(page, page.getByRole('button', { name: label, exact: true }));
        await page.route('**/api/fixture/upload', route => route.fulfill({ status: 503, body: '' }));
        await enter(page, page.getByRole('button', { name: '파일 올리기', exact: true }));
        await page.locator('p[role=alert]').waitFor();
        await page.unroute('**/api/fixture/upload');
        await enter(page, page.getByRole('button', { name: '파일 올리기', exact: true }));
        await page.getByText('파일을 올렸습니다.', { exact: true }).waitFor();
        await enter(page, page.getByRole('link', { name: '파일 열기' }));
        await page.waitForURL('**/objects/00000000-0000-4000-8000-000000000009');
        await enter(page, page.getByRole('button', { name: '파일 열기' }));
        await page.locator('.publication-content').waitFor();

        await page.goto(`${origin}/meetings`);
        const title = page.getByLabel('회의 제목');
        const create = page.getByRole('button', { name: '회의 기록 만들기' });
        assert.equal(await create.isDisabled(), true);
        await title.focus(); await page.keyboard.type('Meeting 01');
        await page.evaluate(() => { window.oldSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
        await enter(page, create); await page.locator('p[role=alert]').waitFor();
        await page.evaluate(() => { Storage.prototype.setItem = window.oldSetItem; });
        await enter(page, create); await page.waitForURL(/\/meetings\/[0-9a-f-]+$/);
        assert.equal(await page.locator('h1').innerText(), 'Meeting 01');
        await page.reload(); assert.equal(await page.locator('h1').innerText(), 'Meeting 01');
        const attach = page.getByRole('heading', { name: '녹화·녹음 첨부' }).locator('..');
        const stage = page.getByRole('heading', { name: '회의 문서 등록' }).locator('..');
        async function uploadFixture(section, inputId) {
          await section.locator(inputId).setInputFiles({ name: '가게 안내.txt', mimeType: 'text/plain', buffer: Buffer.from('업무를 시작하기 전에 필요한 사항을 확인합니다.') });
          for (const label of ['업로드 내용 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '업로드 승인', '파일 올리기']) await enter(page, section.getByRole('button', { name: label, exact: true }));
          await section.getByText('파일을 올렸습니다.', { exact: true }).waitFor();
        }
        await uploadFixture(attach, '#meeting-attachment-file');
        await page.route('**/api/fixture/meeting-confirmation', route => route.fulfill({ status: 503, body: '' }));
        await enter(page, attach.getByRole('button', { name: '회의에 첨부', exact: true }));
        await attach.getByRole('alert').waitFor();
        await page.unroute('**/api/fixture/meeting-confirmation');
        for (const label of ['회의에 첨부', '제안 불러오기', '제안 검토', '이 변경 확인']) await enter(page, attach.getByRole('button', { name: label, exact: true }));
        await page.evaluate(() => { window.oldSetItem = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new Error('unavailable'); }; });
        await enter(page, attach.getByRole('button', { name: '등록', exact: true }));
        await attach.getByRole('alert').waitFor();
        await page.evaluate(() => { Storage.prototype.setItem = window.oldSetItem; });
        await enter(page, attach.getByRole('button', { name: '등록', exact: true }));
        await page.getByRole('heading', { name: '첨부 파일' }).waitFor();
        await uploadFixture(stage, '#meeting-stage-file');
        await stage.getByLabel('제목').fill('회의 기록');
        await stage.getByLabel('출처').fill('회의 내용');
        for (const label of ['회의 문서 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '등록']) await enter(page, stage.getByRole('button', { name: label, exact: true }));
        await page.getByRole('heading', { name: '전사본 · 1' }).waitFor();
        await page.reload();
        await page.getByRole('heading', { name: '첨부 파일' }).waitFor();
        await page.getByRole('heading', { name: '전사본 · 1' }).waitFor();
        await page.getByLabel('단계').selectOption('CORRECTED');
        assert.equal(await page.getByLabel('근거 문서').getByRole('option', { name: '전사본 · 1' }).count(), 1);
        await page.getByLabel('근거 문서').selectOption('1');
        await uploadFixture(stage, '#meeting-stage-file');
        await stage.getByLabel('제목').fill('보정 기록');
        await stage.getByLabel('출처').fill('회의 내용');
        for (const label of ['회의 문서 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '등록']) await enter(page, stage.getByRole('button', { name: label, exact: true }));
        await page.getByRole('heading', { name: '보정본 · 1' }).waitFor();
        await stage.getByLabel('단계').selectOption('SUMMARY');
        assert.equal(await stage.getByLabel('근거 문서').getByRole('option', { name: '보정본 · 1' }).count(), 1);
        assert.equal(await stage.getByRole('button', { name: '회의 문서 확인', exact: true }).isDisabled(), true);
        await stage.getByLabel('근거 문서').selectOption('1');
        for (const sourceKind of ['IMPORTED', 'HUMAN', 'AI']) {
          await stage.getByLabel('작성 방식').selectOption(sourceKind);
          assert.equal(await stage.getByLabel('작성 방식').inputValue(), sourceKind);
        }
        await uploadFixture(stage, '#meeting-stage-file');
        await stage.getByLabel('제목').fill('요약 기록');
        await stage.getByLabel('출처').fill('회의 내용');
        for (const label of ['회의 문서 확인', '제안 불러오기', '제안 검토', '이 변경 확인', '등록']) await enter(page, stage.getByRole('button', { name: label, exact: true }));
        await page.getByRole('heading', { name: '요약 · 1' }).waitFor();
        await enter(page, page.getByRole('link', { name: '보정본 열기', exact: true }));
        await page.waitForURL('**/objects/00000000-0000-4000-8000-000000000009?documentId=00000000-0000-4000-8000-000000000010&view=corrected');
        await enter(page, page.getByRole('button', { name: '파일 열기', exact: true }));
        await page.locator('pre.publication-content').waitFor();
        assert.equal(await page.locator('pre.publication-content').textContent(), '업무를 시작하기 전에 필요한 사항을 확인합니다.');
        assert.equal(await page.evaluate(async () => (await fetch('/objects/00000000-0000-4000-8000-000000000009?documentId=00000000-0000-4000-8000-000000000099&view=corrected')).status), 404);
        await page.goto(`${origin}/confirmations/proposal-01`);
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        await page.route('**/api/fixture/publication-confirmation', route => route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'changed' }) }));
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.' }).waitFor();
        await page.unroute('**/api/fixture/publication-confirmation');
        await enter(page, page.getByRole('button', { name: '다시 로그인' }));
        await page.waitForURL('**/sign-in?next=%2Fconfirmations%2Fproposal-01');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/confirmations/proposal-01');
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        await page.route('**/api/fixture/publication-confirmation', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'unavailable' }) }));
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.' }).waitFor();
        await page.unroute('**/api/fixture/publication-confirmation');
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        for (const saved of ['archived', 'invalid']) {
          await page.evaluate(value => sessionStorage.setItem('vintad3e-library-fixture-published-01', value), saved);
          await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
          await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.' }).waitFor();
          assert.equal(await page.evaluate(() => sessionStorage.getItem('vintad3e-library-fixture-published-01')), saved);
        }
        await page.evaluate(() => sessionStorage.removeItem('vintad3e-library-fixture-published-01'));
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        await page.evaluate(() => { window.originalPublicationRead = Storage.prototype.getItem; Storage.prototype.getItem = function (name) { if (name === 'vintad3e-library-fixture-published-01') throw new DOMException('blocked', 'SecurityError'); return window.originalPublicationRead.call(this, name); }; });
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.' }).waitFor();
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        assert.equal(await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.' }).count(), 1);
        await page.evaluate(() => { Storage.prototype.getItem = window.originalPublicationRead; });
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('button', { name: '제안 검토' }).waitFor();
        await page.evaluate(() => { window.originalPublicationStorage = Storage.prototype.setItem; Storage.prototype.setItem = function (name, value) { if (name === 'vintad3e-library-fixture-published-01') throw new DOMException('blocked', 'QuotaExceededError'); return window.originalPublicationStorage.call(this, name, value); }; });
        for (const label of ['제안 검토','이 변경 확인','문서 발행']) await enter(page,page.getByRole('button',{name:label,exact:true}));
        await page.getByRole('alert').filter({ hasText: '발행 내용을 확인하지 못했습니다. 최신 상태를 다시 불러와 주세요.' }).waitFor();
        assert.equal(await page.getByRole('link', { name: '발행한 문서 열기' }).count(), 0);
        await page.evaluate(() => { Storage.prototype.setItem = window.originalPublicationStorage; });
        await enter(page, page.getByRole('button', { name: '최신 상태 다시 불러오기' }));
        await page.getByRole('link',{name:'발행한 문서 열기'}).waitFor();
        await page.reload();
        await page.getByRole('status').filter({ hasText: '문서 발행 결과를 확인했습니다.' }).waitFor();
        await enter(page,page.getByRole('link',{name:'발행한 문서 열기'}));
        await page.getByRole('button',{name:'목록에서 제외'}).waitFor();
        const downloadPromise=page.waitForEvent('download'); await page.getByRole('link',{name:'원본 다운로드'}).click(); const download=await downloadPromise;
        let downloadText=''; for await(const chunk of await download.createReadStream()) downloadText+=chunk.toString(); assert.equal(downloadText,'업무를 시작하기 전에 필요한 사항을 확인합니다.');
        await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedText=text;}}}));
        await enter(page,page.getByRole('button',{name:'내용 복사'})); await page.waitForFunction(()=>window.copiedText==='업무를 시작하기 전에 필요한 사항을 확인합니다.');
        await enter(page,page.getByRole('button',{name:'보관함 저장'})); await page.getByRole('button',{name:'저장 해제'}).waitFor();
        const comment = page.getByRole('textbox',{name:'댓글'});
        assert.equal(await comment.getAttribute('aria-describedby'), 'publication-comment-count');
        assert.equal(await page.locator('#publication-comment-count').innerText(), '0 / 2,000');
        await comment.fill('가'.repeat(2001));
        assert.equal((await comment.inputValue()).length, 2000);
        assert.equal(await page.locator('#publication-comment-count').innerText(), '2,000 / 2,000');
        await comment.fill('좋은 안내입니다.');
        assert.equal(await page.locator('#publication-comment-count').innerText(), `${'좋은 안내입니다.'.length} / 2,000`);
        await enter(page,page.getByRole('button',{name:'댓글 작성'})); await page.getByText('좋은 안내입니다.').waitFor();
        assert.equal(await page.locator('#publication-comment-count').innerText(), '0 / 2,000');
        const publicationLink = page.locator('a[href="/publications/00000000-0000-4000-8000-000000000004"]');
        await page.goto(`${origin}/bookmarks`); await publicationLink.waitFor();
        await page.goto(`${origin}/mypage`); await publicationLink.waitFor();
        await page.goto(origin); await publicationLink.waitFor();
        await enter(page,page.getByRole('button',{name:'게시물 검색'})); const publishedSearch=page.getByRole('dialog',{name:'게시물 검색'}); await publishedSearch.getByRole('combobox',{name:'게시물 제목 검색'}).fill('업무 안내'); await publishedSearch.locator('a[href="/publications/00000000-0000-4000-8000-000000000004"]').waitFor(); await page.keyboard.press('Escape');
        await publishedSearch.waitFor({state:'hidden'});
        await enter(page,publicationLink);
        await page.waitForURL('**/publications/00000000-0000-4000-8000-000000000004');
        await page.getByRole('button',{name:'목록에서 제외'}).waitFor();
        await page.evaluate(()=>{window.oldSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new Error('unavailable');};});
        await enter(page,page.getByRole('button',{name:'목록에서 제외'})); await page.getByRole('alert').filter({hasText:'문서를 목록에서 제외하지 못했습니다.'}).waitFor();
        await page.evaluate(()=>{Storage.prototype.setItem=window.oldSetItem;});
        await enter(page,page.getByRole('button',{name:'목록에서 제외'})); await page.waitForURL('**/mypage');
        await page.waitForFunction(()=>!document.querySelector('a[href="/publications/00000000-0000-4000-8000-000000000004"]'));
        await page.goto(`${origin}/bookmarks`); await page.getByText('저장한 게시물이 없습니다.').waitFor();
        await page.goto(origin); await page.waitForFunction(()=>!document.querySelector('a[href="/publications/00000000-0000-4000-8000-000000000004"]'));
        await enter(page,page.getByRole('button',{name:'게시물 검색'})); const archivedSearch=page.getByRole('dialog',{name:'게시물 검색'}); await archivedSearch.getByRole('combobox',{name:'게시물 제목 검색'}).fill('업무 안내'); await archivedSearch.getByRole('option',{name:/업무 안내\.txt/}).waitFor(); assert.equal(await archivedSearch.locator('a[href="/publications/00000000-0000-4000-8000-000000000004"]').count(),0);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
