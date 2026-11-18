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

export function writeFixtureStock(rows: Rows): boolean {
  try {
    const encoded = JSON.stringify(rows);
    if (Object.keys(parseFixtureStock(encoded)).length !== Object.keys(rows).length) return false;
    window.sessionStorage.setItem(storageSlot, encoded);
    return true;
  } catch { return false; }
}
