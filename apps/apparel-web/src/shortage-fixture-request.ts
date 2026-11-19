import { getFixtureInventory } from './inventory-fixture.ts';
import { readFixtureStock, writeFixtureStock } from './inventory-fixture-session.ts';
import { defaultRow, toDraft, validateDraft } from './inventory-stock.ts';

const reply = (status: number, body: object) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function fixtureInventoryRequest(path: string, init: RequestInit): Promise<Response> {
  if (init.method !== 'POST' || typeof init.body !== 'string' || init.body.length > 4096) return reply(400, {});
  let input: Record<string, unknown>;
  try { const value: unknown = JSON.parse(init.body); if (!value || typeof value !== 'object' || Array.isArray(value)) return reply(400, {}); input = value as Record<string, unknown>; } catch { return reply(400, {}); }
  const product = getFixtureInventory('development', '1').find(item => item.variants.some(variant => variant.skuCode === input.skuCode));
  const location = input.locationCode;
  if (!product || (location !== 'seongsu' && location !== 'hanam') || typeof input.skuCode !== 'string') return reply(400, {});
  const key = `${product.id}:${location}:${input.skuCode}`;
  const saved = readFixtureStock(), current = saved[key] ?? defaultRow();
  if (path === '/api/admin/skus/inventory-tracking') {
    if (typeof input.tracksInventory !== 'boolean') return reply(400, {});
    const next = { ...current, tracking: input.tracksInventory, target: input.tracksInventory ? current.target : 0, shortage: input.tracksInventory ? current.shortage : 0 };
    if (!writeFixtureStock({ ...saved, [key]: next })) return reply(503, {});
    return reply(200, { stockTarget: { locationCode: location, tracksInventory: next.tracking } });
  }
  if (path !== '/api/admin/stock-target-shortage' || input.stockTargetId !== key || input.skuId !== input.skuCode || input.locationId !== location || typeof input.onHandQty !== 'number' || typeof input.targetQty !== 'number' || typeof input.shortageQty !== 'number') return reply(400, {});
  const validation = validateDraft(current, { ...toDraft(current), onHand: String(input.onHandQty), target: String(input.targetQty), shortage: String(input.shortageQty) });
  if ('error' in validation) return reply(400, { message: validation.error });
  if (!writeFixtureStock({ ...saved, [key]: validation.row })) return reply(503, {});
  return reply(200, { row: { stockTargetId: key, targetQty: validation.row.target, onHandQty: validation.row.onHand, shortageQty: validation.row.shortage, isShortageChecked: validation.row.tracking && validation.row.shortage > 0, updatedAt: null } });
}
