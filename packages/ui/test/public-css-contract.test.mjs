import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parseCss } from './helpers/public-css-parser.mjs';
const controls = parseCss(await readFile(new URL('../src/styles/controls.css', import.meta.url), 'utf8'));
const snapshot = JSON.parse(await readFile(new URL('../src/contracts/legacy-css-source.json', import.meta.url), 'utf8'));
const declarationMap = (records) => {
  const groups = {};
  for (const { context = '', selector, property, value } of records) {
    const id = `${context ? context + '\0' : ''}${selector}\0${property}`;
    (groups[id] ??= []).push(value);
  }
  return groups;
};
const commonSelectors = new Set(controls.map(({ selector }) => selector).filter((selector) => !selector.startsWith('.button--timetable')));

for (const app of ['apparel', 'supporters']) {
  test(`${app}: every extracted button/field declaration equals source snapshot`, () => {
    const reference = snapshot.records[app];
    assert.deepEqual(declarationMap(controls.filter(({ selector }) => commonSelectors.has(selector))), declarationMap(reference));
  });
}

test('Timetable keeps transparent/inherit defaults and progress state separately', () => {
  const reference = snapshot.records.timetable.filter(({ selector }) => !selector.includes('kiosk-select-active'));
  const map = declarationMap(reference);
  assert.deepEqual(map['.button\0background'], ['transparent']);
  assert.deepEqual(map['.button\0color'], ['inherit']);
  for (const selector of ['.button.is-pending', ".button[aria-busy='true']"]) assert.deepEqual(map[`${selector}\0cursor`], ['progress']);
  const projected = controls.filter(({ selector }) => selector.startsWith('.button') && selector !== '.button--danger').map((record) => ({
    ...record, selector: record.selector.replace('.button--timetable', '.button'),
  }));
  const actual = declarationMap(projected);
  assert.deepEqual(actual, map);
  const base = declarationMap(controls.filter(({ selector }) => selector === '.button'));
  assert.equal(base['.button\0background'], undefined);
  assert.equal(base['.button\0color'], undefined);
});

test('variant order preserves primary/ghost over Timetable defaults', () => {
  const defaultIndex = controls.findIndex(({ selector }) => selector === '.button--timetable');
  assert.ok(defaultIndex >= 0);
  assert.ok(defaultIndex < controls.findIndex(({ selector }) => selector === '.button--primary'));
  assert.ok(defaultIndex < controls.findIndex(({ selector }) => selector === '.button--ghost'));
});

