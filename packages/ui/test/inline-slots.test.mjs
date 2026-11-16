import assert from 'node:assert/strict';
import test from 'node:test';
import { INLINE_SLOT_CONTRACTS, checkInlineSlotStyles, inlineSlotSourceAllowed } from '../src/design-contract.mjs';
import { mappingReviewSlots, supportersFeedbackSlots } from '../src/slots.ts';

const registry = { mappingReviewSlots, supportersFeedbackSlots };

test('exact inline slot registry preserves source-derived geometry and error palette', () => {
  assert.deepEqual(checkInlineSlotStyles(registry), []);
  assert.deepEqual(mappingReviewSlots.groupStyle, { minWidth: 240, flex: '1 1 260px' });
  assert.deepEqual(supportersFeedbackSlots.snsErrorStyle, { color: '#c0392b', fontSize: '0.72rem' });
  for (const group of Object.values(registry)) {
    assert.ok(Object.isFrozen(group));
    for (const style of Object.values(group)) assert.ok(Object.isFrozen(style));
  }
});

test('property/value changes, additions and missing registry fail closed', () => {
  for (const [name, contract] of Object.entries(INLINE_SLOT_CONTRACTS)) {
    const [group, key] = name.split('.');
    for (const property of Object.keys(contract.properties)) {
      const clone = structuredClone(registry);
      clone[group][key][property] = 'different';
      assert.deepEqual(checkInlineSlotStyles(clone), [{ code: 'INLINE_SLOT_CHANGED', name }]);
      delete clone[group][key][property];
      assert.deepEqual(checkInlineSlotStyles(clone), [{ code: 'INLINE_SLOT_CHANGED', name }]);
    }
    const clone = structuredClone(registry);
    clone[group][key].margin = 1;
    assert.deepEqual(checkInlineSlotStyles(clone), [{ code: 'INLINE_SLOT_CHANGED', name }]);
  }
  assert.equal(checkInlineSlotStyles({}).length, 2);
});

test('source/element bounds cannot become file, app or className exemptions', () => {
  for (const [name, contract] of Object.entries(INLINE_SLOT_CONTRACTS)) {
    for (const source of contract.sources) {
      assert.equal(inlineSlotSourceAllowed(name, source, contract.element), true);
      assert.equal(inlineSlotSourceAllowed(name, `C:\\repo\\${source.replaceAll('/', '\\')}`, contract.element), true);
      for (const file of [`${source}.copy`, `some-${source}`, source.replace('/components/', '/components/other/')]) {
        assert.equal(inlineSlotSourceAllowed(name, file, contract.element), false);
      }
      assert.equal(inlineSlotSourceAllowed(name, source, 'div'), false);
    }
  }
  assert.equal(inlineSlotSourceAllowed('unknown', 'apps/apparel/src/components/form.tsx', 'Label'), false);
});
