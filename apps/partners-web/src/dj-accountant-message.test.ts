import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAccountantMessage, copyAccountantMessage, type AccountantEntry } from './dj-accountant-message.ts';

// Obvious non-person test identifiers; never use an actual DJ identity.
const entry: AccountantEntry = { name: '가상 DJ A', identifierKind: 'resident', identifier: '0'.repeat(13), paidAmount: '96,700' };
test('records the paid amount unchanged, masks every identifier by default and does not mutate input', () => {
  const rows = [structuredClone(entry)], before = structuredClone(rows);
  const result = buildAccountantMessage('2026-10', rows);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.text, '2026년 10월 디제이들 원천징수 정보\n\n가상 DJ A ******-******* 96,700원');
  assert.ok(!result.text.includes(entry.identifier));
  assert.deepEqual(rows, before);
});
test('manual copy includes full resident/foreign identifiers in input order without inferring identity or tax rates', async () => {
  const rows: AccountantEntry[] = [entry, { ...entry, name: '가상 DJ B', identifierKind: 'foreign', identifier: `000000-${'0'.repeat(7)}`, paidAmount: '100000' }];
  let writes = 0;
  const outcome = await copyAccountantMessage('2026-01', rows, async text => {
    writes++;
    assert.ok(text.indexOf('가상 DJ A') < text.indexOf('가상 DJ B'));
    assert.match(text, /가상 DJ B 000000-0000000 100,000원/);
    assert.ok(!text.includes('주민등록번호:') && !text.includes('외국인등록번호:') && !text.includes('입금 금액:'));
    assert.ok(!text.includes('93,509'));
  });
  assert.equal(outcome, 'copied'); assert.equal(writes, 1);
});
test('rejects incomplete month/rows, line injection, wrong identifier length and malformed amounts before clipboard writes', async () => {
  const invalidEntries = [
    { ...entry, name: '' }, { ...entry, name: '가상\n두 번째 줄' }, { ...entry, name: '가상\u2028추가' },
    { ...entry, identifier: '0'.repeat(12) }, { ...entry, identifier: 'a'.repeat(13) },
    ...['-100', '100.5', '12,34', '1e5', '1원', '9'.repeat(19)].map(paidAmount => ({ ...entry, paidAmount })),
  ];
  let writes = 0;
  for (const row of invalidEntries) assert.equal(await copyAccountantMessage('2026-10', [row], async () => { writes++; }), 'invalid');
  for (const month of ['', '2026-13', '2026-1', '0000-01']) assert.equal(await copyAccountantMessage(month, [entry], async () => { writes++; }), 'invalid');
  assert.equal(await copyAccountantMessage('2026-10', [], async () => { writes++; }), 'invalid');
  assert.equal(writes, 0);
  const result = buildAccountantMessage('', [{ ...entry, identifier: '' }]);
  assert.ok(!result.ok && result.monthError && result.entries[0].identifier);
});
test('preserves recorded zero and exact large integer won without floating point rounding', () => {
  for (const [input, output] of [['0', '0원'], ['999999999999999999', '999,999,999,999,999,999원'], ['00096700', '96,700원']]) {
    const result = buildAccountantMessage('2026-10', [{ ...entry, paidAmount: input }]);
    assert.ok(result.ok && result.text.endsWith(output));
  }
});
test('clipboard rejection returns only a fixed failure state and never exception/input content', async () => {
  const outcome = await copyAccountantMessage('2026-10', [entry], async () => { throw new Error('private browser detail must not escape'); });
  assert.equal(outcome, 'failed');
});
