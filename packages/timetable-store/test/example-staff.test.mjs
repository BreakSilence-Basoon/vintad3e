import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { initializeTimetableStore } from '../src/index.mjs';
import { toTimetableRows } from '../../../examples/timetable/timetable-projection.mjs';

const fixture = JSON.parse(await readFile(new URL('../../../examples/timetable/staff.json', import.meta.url), 'utf8'));
const expectedNames = ['구기곤', '조명재', '김성균', '이주호', '이재환', '정준영', '정태순', '임태권', '김태훈', '박하빈'];

test('the example contains the requested pseudonyms and unique synthetic IDs', () => {
  assert.equal(fixture.synthetic, true);
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.staff.map((person) => person.displayName), expectedNames);
  assert.equal(new Set(fixture.staff.map((person) => person.staffId)).size, 10);
  for (const person of fixture.staff) {
    assert.match(person.staffId, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(person.jobTitle);
    assert.deepEqual(Object.keys(person).sort(), ['displayName', 'jobTitle', 'staffId']);
  }
});

test('projection requires an explicit business and rejects duplicate IDs', () => {
  assert.throws(() => toTimetableRows(fixture, ''), TypeError);
  assert.throws(() => toTimetableRows({ ...fixture, synthetic: false }, 'example-business'), TypeError);
  assert.throws(() => toTimetableRows({ ...fixture, staff: [fixture.staff[0], fixture.staff[0]] }, 'example-business'), TypeError);
  assert.deepEqual(Object.keys(toTimetableRows(fixture, 'example-business')[0]).sort(), ['business_id', 'id']);
});

test('the real public store schema accepts the projected IDs in memory', () => {
  const db = new DatabaseSync(':memory:');
  try {
    initializeTimetableStore(db);
    db.prepare('INSERT INTO businesses (id) VALUES (?)').run('example-business');
    const insert = db.prepare('INSERT INTO staff (business_id, id) VALUES (?, ?)');
    for (const row of toTimetableRows(fixture, 'example-business')) insert.run(row.business_id, row.id);
    assert.equal(db.prepare('SELECT count(*) AS count FROM staff').get().count, 10);
    assert.throws(() => insert.run('unknown-business', fixture.staff[0].staffId));
  } finally {
    db.close();
  }
});
