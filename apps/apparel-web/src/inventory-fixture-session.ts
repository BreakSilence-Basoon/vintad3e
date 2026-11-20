import { getFixtureInventory } from './inventory-fixture.ts';
import { toDraft, validateDraft, type Row, type Rows } from './inventory-stock.ts';

const storageSlot = 'vintad3e-apparel-fixture-stock';
const allowed = new Set(getFixtureInventory('development', '1').flatMap(product =>
  ['seongsu', 'hanam'].flatMap(location => product.variants.map(variant => `${product.id}:${location}:${variant.skuCode}`)),
));

export function parseFixtureStock(raw: string): Rows {
  if (raw.length > 16000) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const rows: Rows = {};
    for (const [key, candidate] of Object.entries(value)) {
      if (!allowed.has(key) || !candidate || typeof candidate !== 'object') continue;
      const row = candidate as Partial<Row>;
      if (typeof row.tracking !== 'boolean' || typeof row.onHand !== 'number' || typeof row.target !== 'number' || typeof row.shortage !== 'number') continue;
      const checked = validateDraft(row as Row, toDraft(row as Row));
      if ('row' in checked) rows[key] = checked.row;
    }
    return rows;
  } catch { return {}; }
}

export function readFixtureStock(): Rows {
  try { return parseFixtureStock(window.sessionStorage.getItem(storageSlot) ?? '{}'); } catch { return {}; }
}

function safeFixtureStock(raw: string): boolean {
  if (raw.length > 16000) return false;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.entries(value), parsed = parseFixtureStock(raw);
    if (entries.length !== Object.keys(parsed).length) return false;
    return entries.every(([key, candidate]) => {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate) || !['onHand,shortage,target,tracking', 'onHand,shortage,target,tracking,workQty'].includes(Object.keys(candidate).sort().join(','))) return false;
      const row = candidate as Row, saved = parsed[key];
      return saved && row.onHand === saved.onHand && row.target === saved.target && row.shortage === saved.shortage && row.tracking === saved.tracking && row.workQty === saved.workQty;
    });
  } catch { return false; }
}

export function writeFixtureStock(rows: Rows): boolean {
  try {
    if (!safeFixtureStock(window.sessionStorage.getItem(storageSlot) ?? '{}')) return false;
    const encoded = JSON.stringify(rows);
    if (!safeFixtureStock(encoded) || Object.keys(parseFixtureStock(encoded)).length !== Object.keys(rows).length) return false;
    window.sessionStorage.setItem(storageSlot, encoded);
    return true;
  } catch { return false; }
}

export function fixtureStockReadable(): boolean {
  try { return safeFixtureStock(window.sessionStorage.getItem(storageSlot) ?? '{}'); } catch { return false; }
}
