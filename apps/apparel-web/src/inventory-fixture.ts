import { belongsToInventoryCollection, variantMatchesInventoryOptionFilters } from './inventory-collection.ts';
import type { InventoryCollection, InventoryOptionFilters } from './inventory-collection.ts';

type Variant = { skuCode: string; optionName: string; apparelType: string; color: string; size: string; apparelTarget: string; unitOfMeasure: string; tracksInventory: boolean };
export type FixtureProduct = { id: string; code: string; nameKo: string; lineNameKo: string | null; businessDomain: string; lineCode: string | null; variants: Variant[] };
type Filters = InventoryOptionFilters & { collection: InventoryCollection; search: string };

const products: FixtureProduct[] = [
  { id: 'basic', code: 'TSHIRT-001', nameKo: '반팔 티셔츠', businessDomain: 'APPAREL', lineCode: null, lineNameKo: null, variants: [
    { skuCode: 'TSHIRT-001-BK-M', optionName: '블랙 M', apparelType: '반팔', color: '블랙', size: 'M', apparelTarget: 'UNISEX', unitOfMeasure: '개', tracksInventory: true },
    { skuCode: 'TSHIRT-001-WH-L', optionName: '화이트 L', apparelType: '반팔', color: '화이트', size: 'L', apparelTarget: 'UNISEX', unitOfMeasure: '개', tracksInventory: true },
  ] },
  { id: 'collab', code: 'COLLAB-001', nameKo: '협업 티셔츠', businessDomain: 'APPAREL', lineCode: 'collab', lineNameKo: null, variants: [
    { skuCode: 'COLLAB-001-BK-M', optionName: '블랙 M', apparelType: '반팔', color: '블랙', size: 'M', apparelTarget: 'UNISEX', unitOfMeasure: '개', tracksInventory: true },
  ] },
];

export function getFixtureInventory(env: string | undefined, enabled: string | undefined): FixtureProduct[] {
  return env === 'development' && enabled === '1' ? structuredClone(products) : [];
}

export function filterFixtureInventory(items: FixtureProduct[], filters: Filters): FixtureProduct[] {
  const terms = filters.search.trim().toLocaleLowerCase('ko-KR').split(/\s+/u).filter(Boolean);
  return items.filter((product) => {
    if (!belongsToInventoryCollection(product, filters.collection)) return false;
    const tracked = product.variants.filter((variant) => variant.tracksInventory);
    const searchable = [product.nameKo, product.code, product.lineNameKo, ...tracked.flatMap((variant) => Object.values(variant))].join(' ').toLocaleLowerCase('ko-KR');
    return terms.every((term) => searchable.includes(term)) && tracked.some((variant) => variantMatchesInventoryOptionFilters(variant, filters));
  }).sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko-KR', { numeric: true, sensitivity: 'base' }));
}
