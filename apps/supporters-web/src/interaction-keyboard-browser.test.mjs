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
async function enter(page, locator) {
  await locator.waitFor({ state: 'visible' });
  await page.waitForFunction(el => !el.disabled, await locator.elementHandle());
  await locator.focus(); await page.keyboard.press('Enter');
}

test('supporters keyboard flows preserve validation and show clipboard failure', { timeout: 120000 }, async () => {
  const port = await freePort(), origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'development', VINTAD3E_SUPPORTERS_FIXTURE: '1', VINTAD3E_SUPPORTERS_FIXTURE_ORIGIN: origin }, stdio: 'ignore',
  });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (child.exitCode !== null) throw new Error('fixture server exited');
      try { if ((await fetch(`${origin}/coupon`)).ok) { ready = true; break; } } catch {}
      await delay(250);
    }
    assert.ok(ready);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-sandbox'] });
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      try {
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.failCopy) throw new Error('clipboard unavailable'); window.copiedText = text; } } }));
        await page.goto(`${origin}/auth/session-resume?next=%2Fsettlements%3Fstaff%3Dsupporter-1`);
        await page.waitForURL('**/sign-in?next=%2Fsettlements%3Fstaff%3Dsupporter-1');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/settlements?staff=supporter-1');
        await context.clearCookies();
        await page.goto(`${origin}/auth/session-resume?next=%2F%2Fevil.example`);
        await page.waitForURL('**/sign-in?next=%2F');
        await page.goto(`${origin}/settlements?staff=supporter-1`);
        await page.waitForURL('**/sign-in?next=%2Fsettlements%3Fstaff%3Dsupporter-1');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/settlements?staff=supporter-1');
        await page.locator('[data-fixture-staff="supporter-1"]').waitFor();
        await context.clearCookies();
        await page.goto(`${origin}/coupon?staff=supporter-1`);
        await page.waitForURL('**/sign-in?next=%2Fcoupon');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL('**/coupon');
        await page.goto(`${origin}/coupon?staff=supporter-1`);
        const copy = page.getByRole('button', { name: '추천인 코드 복사' });
        await enter(page, copy);
        await page.waitForFunction(() => window.copiedText === 'VINTAD3E');
        await page.evaluate(() => { window.failCopy = true; });
        await enter(page, copy);
        await page.getByText('복사하지 못했습니다.', { exact: false }).waitFor();
        assert.equal(await page.getByRole('button', { name: '글로벌 · 자동 링크 사용 불가' }).isDisabled(), true);
        const select = page.locator('#coupon-staff');
        await select.focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
        await page.waitForURL('**/coupon?staff=supporter-2');
        assert.equal(await page.locator('.coupon-share-field').count(), 0);

        await context.clearCookies();
        await page.goto(`${origin}/?staff=supporter-1&from=2026-01-01&to=2026-01-03`);
        assert.equal(new URL(page.url()).pathname, '/sign-in');
        await enter(page, page.getByRole('button', { name: '회사 계정으로 로그인' }));
        await page.waitForURL(url => url.pathname === '/' && url.searchParams.get('staff') === 'supporter-1');
        assert.equal(new URL(page.url()).searchParams.get('from'), '2026-01-01');
        assert.equal(new URL(page.url()).searchParams.get('to'), '2026-01-03');
        const form = page.locator('.coupon-analytics__date-filter:visible').first();
        const from = form.locator('input[name=from]'), to = form.locator('input[name=to]');
        await from.fill('');
        assert.equal(await from.evaluate(el => el.validity.valueMissing), true);
        await from.fill('2026-11-20'); await to.fill('2026-11-01');
        await enter(page, form.getByRole('button', { name: '조회' }));
        await page.getByText('종료일은 시작일보다 빠를 수 없습니다.', { exact: false }).waitFor();
        assert.equal(new URL(page.url()).searchParams.get('from'), '2026-01-01');
        assert.equal(new URL(page.url()).searchParams.get('to'), '2026-01-03');
        await from.fill('2026-01-01'); await to.fill('2026-01-03');
        await enter(page, form.getByRole('button', { name: '조회' }));
        await page.waitForURL(url => url.searchParams.get('from') === '2026-01-01' && url.searchParams.get('to') === '2026-01-03');
        const resultForm = page.locator('.coupon-analytics__date-filter:visible').first();
        assert.equal(await resultForm.locator('input[name=from]').inputValue(), '2026-01-01');
        assert.equal(await resultForm.locator('input[name=to]').inputValue(), '2026-01-03');
        await page.reload();
        assert.equal(await page.locator('.coupon-analytics__date-filter:visible').first().locator('input[name=from]').inputValue(), '2026-01-01');

        await page.goto(`${origin}/formula`);
        await page.waitForURL(url => url.pathname === '/formula');
        const search = page.getByRole('searchbox', { name: '정산 공식 기호 검색' });
        await search.fill('찾을수없는항목');
        await page.getByText('검색 결과가 없습니다.', { exact: false }).waitFor();
        await search.fill('');
        assert.equal(await page.getByText('검색 결과가 없습니다.', { exact: false }).count(), 0);
        await page.goto(`${origin}/formula-info`);
        await enter(page,page.locator('.formula-guide__contents summary'));
        await page.getByRole('navigation',{name:'목차'}).getByRole('link',{name:'쿠폰 판매'}).click();
        await page.waitForURL('**/formula-info#coupon-sales');
        await page.evaluate(()=>{window.failCopy=true;});
        await enter(page,page.getByRole('button',{name:'내용 복사'})); await page.getByRole('status').filter({hasText:'내용을 복사하지 못했습니다.'}).waitFor();
        await page.evaluate(()=>{window.failCopy=false;}); await enter(page,page.getByRole('button',{name:'내용 복사'})); await page.getByRole('status').filter({hasText:'복사됨'}).waitFor();
        assert.ok(await page.evaluate(()=>window.copiedText?.includes('쿠폰 판매')));
        await enter(page,page.getByRole('button',{name:'언어 선택'})); await enter(page,page.getByRole('button',{name:'English'}));
        await page.waitForURL('**/formula-info?lang=en'); await page.getByRole('heading',{name:'Coupon sales'}).waitFor();
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
