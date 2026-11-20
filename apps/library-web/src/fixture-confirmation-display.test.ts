import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmationPayloadText, escapeConfirmationText } from './fixture-confirmation-display.ts';

test('confirmation display reveals invisible characters and literal backslashes', () => {
  assert.equal(escapeConfirmationText('가\u202e\\나'), '가\\u202E\\\\나');
  assert.ok(confirmationPayloadText({ title: '가\u202e' }).includes('\\u202E'));
});
