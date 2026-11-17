export type InventoryCollection = 'in-house' | 'collab';

type QueryValues = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim();
}

export function getInventoryCollection(params: QueryValues): InventoryCollection {
  const collection = single(params.collection);
  if (collection) return collection === 'collab' ? 'collab' : 'in-house';
  // Preserve old links to the tab while retiring the former food filter.
  return ['FNB', 'FOOD', 'BEVERAGE'].includes(single(params.businessDomain) ?? '')
    ? 'collab'
    : 'in-house';
}

export function belongsToInventoryCollection(
  product: { businessDomain: string; lineCode: string | null },
  collection: InventoryCollection,
) {
  return product.businessDomain === 'APPAREL'
    && (collection === 'collab' ? product.lineCode === 'collab' : product.lineCode !== 'collab');
}

// 인벤토리는 재고 추적 ON인 옵션만 보여준다. 옵션 드롭다운 필터: 빈 문자열 = 전체.
export type InventoryOptionFilters = {
  apparelType: string;
  color: string;
  size: string;
  target: string;
};

export const emptyInventoryOptionFilters: InventoryOptionFilters = {
  apparelType: '',
  color: '',
  size: '',
  target: '',
};

export function getInventoryOptionFilters(params: QueryValues): InventoryOptionFilters {
  return {
    apparelType: single(params.type) ?? '',
    color: single(params.color) ?? '',
    size: single(params.size) ?? '',
    target: single(params.target) ?? '',
  };
}

export function variantMatchesInventoryOptionFilters(
  variant: {
    apparelType: string | null;
    color: string | null;
    size: string | null;
    apparelTarget: string | null;
    tracksInventory: boolean;
  },
  filters: InventoryOptionFilters,
) {
  return variant.tracksInventory
    && (!filters.apparelType || variant.apparelType === filters.apparelType)
    && (!filters.color || variant.color === filters.color)
    && (!filters.size || variant.size === filters.size)
    && (!filters.target || variant.apparelTarget === filters.target);
}

export function buildInventoryHref(
  filters: { collection: InventoryCollection; search?: string } & Partial<InventoryOptionFilters>,
) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.collection === 'collab') params.set('collection', 'collab');
  if (filters.apparelType) params.set('type', filters.apparelType);
  if (filters.color) params.set('color', filters.color);
  if (filters.size) params.set('size', filters.size);
  if (filters.target) params.set('target', filters.target);
  const query = params.toString();
  return query ? `/admin/products?${query}` : '/admin/products';
}
