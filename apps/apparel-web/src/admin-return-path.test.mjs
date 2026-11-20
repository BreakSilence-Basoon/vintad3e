import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureAdminReturnPath } from './admin-return-path.mjs';

test('admin return paths retain filters without accepting external or unsafe paths', () => {
  assert.equal(fixtureAdminReturnPath('/admin/sales?range=all&_rsc=abc'), '/admin/sales?range=all');
  assert.equal(fixtureAdminReturnPath('/admin/inventory/graphics/TSHIRT-001'), '/admin/inventory/graphics/TSHIRT-001');
  for (const value of ['//example.invalid/admin', '/admin/../sign-in', '/admin/sales#part', '/admin/%2fexample', '/admin/sales\\evil', '/admin/sales\n', '/admin/unknown', 'https://example.invalid/']) assert.equal(fixtureAdminReturnPath(value), null);
});
