import test from 'node:test';
import assert from 'node:assert/strict';
import { nextConfirmationState } from './fixture-confirmation.mjs';
test('confirmation requires loading and review before approval', () => {
  assert.equal(nextConfirmationState('idle', 'confirm'), 'idle');
  assert.equal(nextConfirmationState('idle', 'load'), 'loaded');
  assert.equal(nextConfirmationState('loaded', 'confirm'), 'loaded');
  assert.equal(nextConfirmationState('loaded', 'review'), 'reviewed');
  assert.equal(nextConfirmationState('reviewed', 'confirm'), 'approved');
  assert.equal(nextConfirmationState('approved', 'load'), 'approved');
  assert.equal(nextConfirmationState('idle', 'constructor'), 'idle');
});
