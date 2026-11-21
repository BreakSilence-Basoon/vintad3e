import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

async function freePort() { const socket = createServer(); socket.listen(0, '127.0.0.1'); await once(socket, 'listening'); const port = socket.address().port; await new Promise(resolve => socket.close(resolve)); return port; }

test('sales chart shows and clears option details on desktop and mobile widths', { timeout: 90000 }, async () => {
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
        await page.goto(`${origin}/sign-in?next=%2Fadmin%2Fstats`);
        await page.getByRole('button', { name: '회사 계정으로 로그인' }).click();
        await page.waitForURL(`${origin}/admin/stats`);
        await page.locator('.console-section[data-hydrated="true"]').waitFor();
        const scope = page.getByRole('tablist', { name: '의류 매출 범위' });
        const metric = page.getByRole('tablist', { name: '지표' });
        const chart = page.getByRole('img', { name: '그래픽별 매출 파이 (조각에 마우스를 올리면 SKU별로 펼쳐 보임)' });
        for (const group of ['전체', '온라인', '오프라인']) for (const measure of ['금액', '수량']) {
          const tab = scope.getByRole('tab', { name: group, exact: true });
          await tab.click();
          await page.waitForFunction(element => element.getAttribute('aria-selected') === 'true', await tab.elementHandle());
          const metricTab = metric.getByRole('tab', { name: measure, exact: true });
          await metricTab.click();
          await page.waitForFunction(element => element.getAttribute('aria-selected') === 'true', await metricTab.elementHandle());
          if (group === '오프라인' && await chart.count() === 0) {
            await page.getByText('선택한 범위의 의류 판매 데이터가 없습니다.', { exact: true }).waitFor();
            continue;
          }
          const segment = group === '오프라인' ? chart.locator('path[aria-label]').first() : chart.locator('path[aria-label^="후드 "]');
          await segment.scrollIntoViewIfNeeded();
          const point = await segment.evaluate(element => {
            const rect = element.getBoundingClientRect();
            for (let y = Math.max(1, Math.ceil(rect.top)); y < Math.min(innerHeight - 1, rect.bottom); y += 4) {
              for (let x = Math.max(1, Math.ceil(rect.left)); x < Math.min(innerWidth - 1, rect.right); x += 4) {
                if (document.elementFromPoint(x, y) === element) return { x, y };
              }
            }
            return null;
          });
          assert.ok(point, 'chart segment must contain a reachable pointer target');
          await page.mouse.move(point.x, point.y);
          await chart.locator('foreignObject').filter({ hasText: '블랙 / M' }).waitFor();
          await page.mouse.move(1, 1);
          await chart.locator('foreignObject').waitFor({ state: 'detached' });
        }
        const now = Date.now(), day = 86_400_000;
        const emptyRange = new URLSearchParams({ from: new Date(now - 10 * day).toISOString(), to: new Date(now - 5 * day).toISOString() });
        await page.goto(`${origin}/admin/stats?${emptyRange}`);
        await page.locator('.console-section[data-hydrated="true"]').waitFor();
        await page.getByText('선택한 범위의 의류 판매 데이터가 없습니다.', { exact: true }).waitFor();
        assert.equal(await chart.count(), 0);
        await page.goto(`${origin}/admin/stats`);
        await page.locator('.console-section[data-hydrated="true"]').waitFor();
        const endpoint = /\/admin\/stats\/sales-overview\?/;
        await page.route(endpoint, async route => {
          const upstream = await route.fetch();
          const data = await upstream.json();
          data.onlineRevenueUnavailable = true;
          data.unconvertedCurrencyTotals = [{ currencyCode: 'USD', amount: null, saleCount: 1 }];
          data.onlineApparelByDesign = [];
          data.storeApparelByDesign = [];
          data.onlineApparelOther = null;
          data.storeApparelOther = null;
          await route.fulfill({ response: upstream, json: data });
        });
        await page.getByTitle('확대 — 짧은 기간(최대 일별)').click();
        await page.locator('p.console-empty').filter({ hasText: '환율 확인 필요' }).waitFor();
        assert.equal(await chart.count(), 0);
        await page.unroute(endpoint);
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close(); child.kill('SIGTERM');
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), delay(5000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
