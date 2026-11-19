import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFixtureFormula } from './formula-config.mjs';
import settings from './formula-fixture-settings.json' with { type: 'json' };
test('the configured synthetic rate calculates with integer rounding', () => {
  assert.equal(calculateFixtureFormula(settings.formula, settings.amount), 4628);
  assert.equal(calculateFixtureFormula({ method: 'rate', numerator: 1, denominator: 2 }, 5), 3);
  assert.equal(calculateFixtureFormula({ method: 'rate', numerator: 1, denominator: 4 }, 5), 1);
  assert.equal(calculateFixtureFormula({ method: 'rate', numerator: 2, denominator: 1 }, 5), 10);
});
test('invalid settings or unsafe inputs never produce an amount', () => {
  for (const config of [null, {}, { method: 'code', numerator: 1, denominator: 1 }, { method: 'rate', numerator: 1, denominator: 0 }, { method: 'rate', numerator: -1, denominator: 1 }]) assert.equal(calculateFixtureFormula(config, 100), null);
  for (const amount of [-1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1, '100']) assert.equal(calculateFixtureFormula(settings.formula, amount), null);
});
