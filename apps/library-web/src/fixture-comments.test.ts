import assert from 'node:assert/strict';
import test from 'node:test';
import { addFixtureComment, parseFixtureComments } from './fixture-comments.ts';

const valid = { id: '00000000-0000-4000-8000-000000000001', body: '안내', createdAt: '2026-11-18T00:00:00.000Z' };
test('only valid comments are read and duplicate IDs are removed', () => {
  assert.deepEqual(parseFixtureComments(JSON.stringify([valid, valid, { ...valid, id: 'invalid' }, { ...valid, createdAt: 'invalid' }, { ...valid, body: '' }])), [valid]);
  assert.deepEqual(parseFixtureComments('{'), []);
  assert.deepEqual(parseFixtureComments('{}'), []);
  assert.deepEqual(parseFixtureComments('x'.repeat(3_000_001)), []);
});
test('one extra valid comment is retained to indicate there are more than 200', () => {
  const comments = Array.from({ length: 202 }, (_, index) => ({ ...valid, id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }));
  assert.deepEqual(parseFixtureComments(JSON.stringify(comments)), comments.slice(0, 201));
});

test('comment writes preserve corrupted and full storage without silently dropping comments', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  let raw: string | null = null, blocked = false;
  const old = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: { getItem: () => { if (blocked) throw new Error('unavailable'); return raw; }, setItem: (_key: string, value: string) => { raw = value; } }, dispatchEvent: () => true } });
  try {
    assert.equal(addFixtureComment(id, '새 댓글'), true);
    assert.equal(parseFixtureComments(raw!)[0].body, '새 댓글');
    for (const value of ['{broken', JSON.stringify([{ ...valid, extra: 'preserve' }]), JSON.stringify([valid, valid])]) { raw = value; assert.equal(addFixtureComment(id, '댓글'), false); assert.equal(raw, value); }
    const full = Array.from({ length: 201 }, (_, index) => ({ ...valid, id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }));
    raw = JSON.stringify(full); assert.equal(addFixtureComment(id, '댓글'), false); assert.equal(raw, JSON.stringify(full));
    raw = JSON.stringify(full.slice(0, 200)); assert.equal(addFixtureComment(id, '마지막 댓글'), true); assert.equal(parseFixtureComments(raw!).length, 201);
    blocked = true; const before = raw; assert.equal(addFixtureComment(id, '댓글'), false); assert.equal(raw, before);
  } finally { if (old) Object.defineProperty(globalThis, 'window', old); else Reflect.deleteProperty(globalThis, 'window'); }
});
