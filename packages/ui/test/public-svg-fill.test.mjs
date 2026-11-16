import assert from 'node:assert/strict';
import test from 'node:test';
import { svgFillSlots } from '../src/slots.ts';
import { SVG_FILL_CONTRACTS, svgFillSourceAllowed, checkSvgFillSlots } from '../src/svg-fill-contract.mjs';
test('new color, removed value, extra slot or use in another source/tag is rejected', () => {
  for (const [name, spec] of Object.entries(SVG_FILL_CONTRACTS)) {
    assert.equal(checkSvgFillSlots({ ...svgFillSlots, [name]: '#000000' }), false);
    const missing = { ...svgFillSlots }; delete missing[name]; assert.equal(checkSvgFillSlots(missing), false);
    for (const source of spec.sources) {
      assert.equal(svgFillSourceAllowed(name, source, spec.element), true);
      assert.equal(svgFillSourceAllowed(name, `C:\\repo\\${source.replaceAll('/', '\\')}`, spec.element), true);
      assert.equal(svgFillSourceAllowed(name, `${source}.copy`, spec.element), false);
      assert.equal(svgFillSourceAllowed(name, source, 'div'), false);
    }
  }
  assert.equal(checkSvgFillSlots({ ...svgFillSlots, extra: '#4285F4' }), false);
});
