export type Part = { ingredientId: string; quantity: number };
export type InventoryData = {
  unmappedSales: number;
  ingredients: { id: string; name: string; unit: string }[];
  rows: { id: string; name: string; unit: string; countQuantity: number | null; countAt: string | null; expectedQuantity: number | null; used30: number; remainingDays: number | null }[];
  recipes: { id: string; menuName: string; ingredients: Part[]; effectiveAt: string }[];
  entries: { id: string; kind: string; status: string; supplier: string | null; reference: string | null; occurredAt: string; lines: Part[] }[];
};
export function fixtureInventory(env: string | undefined, enabled: string | undefined): InventoryData | null {
  if (env !== 'development' || enabled !== '1') return null;
  const ingredient = { id: 'ingredient-1', name: '재료 01', unit: 'g' };
  return { unmappedSales: 0, ingredients: [ingredient], rows: [{ ...ingredient, countQuantity: 1000, countAt: '2026-01-01T03:00:00.000Z', expectedQuantity: 800, used30: 200, remainingDays: 120 }], recipes: [{ id: 'recipe-1', menuName: '음료 01', ingredients: [{ ingredientId: ingredient.id, quantity: 20 }], effectiveAt: '2026-01-01T03:00:00.000Z' }], entries: [] };
}
