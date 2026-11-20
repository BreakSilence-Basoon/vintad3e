import { DatabaseSync } from 'node:sqlite';
import { closeSync, lstatSync, mkdirSync, openSync } from 'node:fs';
import { join } from 'node:path';

const applicationId = 0x56494e54;

export function initializeInventoryStore(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS inventory_state (
    singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
    revision INTEGER NOT NULL, current_rows TEXT NOT NULL, previous_rows TEXT
  ); INSERT OR IGNORE INTO inventory_state VALUES (1, 0, '[]', NULL);`);
}
export function readInventory(db) {
  const row = db.prepare('SELECT revision, current_rows, previous_rows FROM inventory_state WHERE singleton = 1').get();
  return { revision: row.revision, rows: JSON.parse(row.current_rows), canUndo: row.previous_rows !== null };
}
export function writeInventory(db, expected, rows) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const old = db.prepare('SELECT revision, current_rows FROM inventory_state WHERE singleton = 1').get();
    if (old.revision !== expected) { db.exec('ROLLBACK'); return false; }
    db.prepare('UPDATE inventory_state SET revision = revision + 1, previous_rows = ?, current_rows = ? WHERE singleton = 1').run(old.current_rows, JSON.stringify(rows));
    db.exec('COMMIT'); return true;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
export function undoInventory(db, expected) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const old = db.prepare('SELECT revision, previous_rows FROM inventory_state WHERE singleton = 1').get();
    if (old.revision !== expected || old.previous_rows === null) { db.exec('ROLLBACK'); return false; }
    db.prepare('UPDATE inventory_state SET revision = revision + 1, current_rows = ?, previous_rows = NULL WHERE singleton = 1').run(old.previous_rows);
    db.exec('COMMIT'); return true;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

// A fixed, opt-in, app-owned file: never initialize or overwrite an unrelated DB.
export function openInventoryStore(root, testId = '') {
  if (testId && !/^[a-f0-9]{32}$/.test(testId)) throw new Error('invalid test identifier');
  const dir = join(root, '.data'), file = join(dir, `apparel-local-inventory${testId ? `-${testId}` : ''}.sqlite`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  if (!lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink()) throw new Error('unsafe data directory');
  let created = false;
  try { const fd = openSync(file, 'wx', 0o600); closeSync(fd); created = true; }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  if (!created) {
    const info = lstatSync(file); if (!info.isFile() || info.isSymbolicLink()) throw new Error('unsafe inventory file');
    const check = new DatabaseSync(file, { readOnly: true });
    try { if (check.prepare('PRAGMA application_id').get().application_id !== applicationId) throw new Error('unrecognized inventory file'); }
    finally { check.close(); }
  }
  const db = new DatabaseSync(file);
  try { if (created) { db.exec(`PRAGMA application_id = ${applicationId}`); initializeInventoryStore(db); } else readInventory(db); return db; }
  catch (error) { db.close(); throw error; }
}
