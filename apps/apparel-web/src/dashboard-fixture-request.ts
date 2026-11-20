import { getFixtureInventory } from './inventory-fixture.ts';
import { fixtureStockReadable, readFixtureStock, writeFixtureStock } from './inventory-fixture-session.ts';
import { defaultRow } from './inventory-stock.ts';

const displayKey = 'vintad3e-apparel-fixture-display';
const products = getFixtureInventory('development', '1');
const reply = (status: number, body: object) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

export function readFixtureDisplay(): Record<string, boolean> | null {
  try {
    const raw = sessionStorage.getItem(displayKey);
    if (raw === null) return {};
    if (raw.length > 1024) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value);
    if (entries.some(([key, hidden]) => !products.some(item => item.id === key) || typeof hidden !== 'boolean')) return null;
    return Object.fromEntries(entries) as Record<string, boolean>;
  } catch { return null; }
}

export async function fixtureDashboardRequest(path: string, init: RequestInit): Promise<Response> {
  if (init.method !== 'POST' || typeof init.body !== 'string' || init.body.length > 4096) return reply(400, {});
  let input: Record<string, unknown>;
  try { const parsed: unknown = JSON.parse(init.body); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return reply(400, {}); input = parsed as Record<string, unknown>; } catch { return reply(400, {}); }
  const display = /^\/api\/admin\/products\/([a-z0-9-]+)\/display$/.exec(path);
  if (display) {
    const saved = readFixtureDisplay();
    if (!saved || !products.some(product => product.id === display[1]) || typeof input.hidden !== 'boolean') return reply(400, {});
    try { sessionStorage.setItem(displayKey, JSON.stringify({ ...saved, [display[1]]: input.hidden })); return reply(200, {}); } catch { return reply(503, {}); }
  }
  if (path !== '/api/admin/seongsu-work-quantities') return reply(404, {});
  if (!fixtureStockReadable()) return reply(503, {});
  const saved = readFixtureStock();
  if (input.action === 'save') {
    const product = products.find(item => item.variants.some(variant => variant.skuCode === input.skuId));
    if (!product || input.locationId !== 'seongsu' || input.stockTargetId !== `${product.id}:seongsu:${input.skuId}` || typeof input.workQty !== 'number' || !Number.isFinite(input.workQty) || input.workQty < 0 || input.workQty > 1000000) return reply(400, {});
    const key = input.stockTargetId as string, row = { ...(saved[key] ?? defaultRow()), workQty: input.workQty };
    if (!writeFixtureStock({ ...saved, [key]: row })) return reply(503, {});
    return reply(200, { row: { stockTargetId: key, workQty: row.workQty, updatedAt: null } });
  }
  if (input.action !== 'transfer' || (input.productId !== undefined && !products.some(product => product.id === input.productId))) return reply(400, {});
  const matching = products.filter(product => input.productId === undefined || product.id === input.productId);
  const moves = matching.flatMap(product => product.variants.map(variant => ({ sku: variant.skuCode, store: `${product.id}:seongsu:${variant.skuCode}`, warehouse: `${product.id}:hanam:${variant.skuCode}` }))).filter(item => (saved[item.store]?.workQty ?? 0) > 0);
  if (!moves.length) return reply(200, { message: '전달 완료할 저장된 작업수량이 없습니다.', rows: [] });
  if (moves.some(item => (saved[item.warehouse]?.onHand ?? 0) < (saved[item.store]?.workQty ?? 0))) return reply(409, { message: '작업수량을 전달 완료하지 못했습니다.' });
  const next = { ...saved };
  const rows = moves.map(item => {
    const store = saved[item.store] ?? defaultRow(), warehouse = saved[item.warehouse] ?? defaultRow(), qty = store.workQty ?? 0;
    const updated = { ...store, onHand: store.onHand + qty, shortage: store.target > 0 ? Math.max(store.target - store.onHand - qty, 0) : store.shortage, workQty: 0 };
    next[item.store] = updated;
    next[item.warehouse] = { ...warehouse, onHand: warehouse.onHand - qty, shortage: warehouse.target > 0 ? Math.max(warehouse.target - warehouse.onHand + qty, 0) : warehouse.shortage };
    return { stockTargetId: item.store, skuId: item.sku, locationId: 'seongsu', onHandQty: updated.onHand, targetQty: updated.target, shortageQty: updated.shortage, isShortageChecked: updated.tracking && updated.shortage > 0, workQty: 0, updatedAt: null };
  });
  if (!writeFixtureStock(next)) return reply(503, {});
  return reply(200, { message: '전달 완료했습니다.', rows });
}
