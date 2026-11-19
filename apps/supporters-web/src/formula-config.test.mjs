import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFixtureFormula, formatFixtureFormula } from './formula-config.mjs';
import settings from './formula-fixture-settings.json' with { type: 'json' };
const v = { amount: 5, rate: 2 };
const op = (op, left, right) => ({ op, left, right });
const a = { var: 'amount' }, r = { var: 'rate' }, n = value => ({ value });
test('settings can change the formula without executing arbitrary code', () => {
  assert.equal(calculateFixtureFormula(settings.expression, settings.variables), 3702);
  assert.equal(formatFixtureFormula(settings.expression, settings.variables), '((amount × rate) ÷ 100)');
  assert.equal(calculateFixtureFormula(op('add', a, r), v), 7);
  assert.equal(calculateFixtureFormula(op('subtract', r, a), v), -3);
  assert.equal(calculateFixtureFormula(op('multiply', a, r), v), 10);
  assert.equal(calculateFixtureFormula(op('divide', a, r), v), 3);
  assert.equal(calculateFixtureFormula(op('divide', n(-5), r), v), -3);
});
test('invalid, dangerous, oversized, or zero-divisor expressions fail closed', () => {
  for (const expression of [null, {}, { var: 'constructor' }, { value: 1.5 }, { op: 'eval', left: a, right: r }, op('divide', a, n(0)), { value: 1, extra: true }]) assert.equal(calculateFixtureFormula(expression, v), null);
  assert.equal(calculateFixtureFormula(op('multiply', n(Number.MAX_SAFE_INTEGER), n(2)), v), null);
  let nested = n(1); for (let i = 0; i < 10; i++) nested = op('add', nested, n(1));
  assert.equal(calculateFixtureFormula(nested, v), null);
  assert.equal(calculateFixtureFormula(a, { amount: 5, rate: Infinity }), null);
  assert.equal(formatFixtureFormula({ op: 'eval' }, v), null);
});
