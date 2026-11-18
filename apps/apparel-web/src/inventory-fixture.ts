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

function normalizeSearch(value: string): string {
  const normalized = value.normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/[“”‘’`"]/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return `${normalized} ${normalized.replace(/[\s._'"“”‘’`-]+/g, '')}`.trim();
}

function searchTerms(search: string): string[] {
  return [...new Set(normalizeSearch(search).split(' ').filter(Boolean))];
}

function variantSearchText(product: FixtureProduct, variant: Variant): string {
  const target = variant.apparelTarget === 'MEN' ? '남성 남자 남성용 남성복 mens men'
    : variant.apparelTarget === 'WOMEN' ? '여성 여성전용 여성용 여성복 여자 여자옷 여자사이즈 우먼 우먼스 womens women'
      : variant.apparelTarget === 'UNISEX' ? '공용 남녀공용' : variant.apparelTarget;
  return [product.businessDomain, product.code, product.lineNameKo, product.nameKo,
    variant.skuCode, variant.optionName, variant.apparelType, variant.color, variant.size,
    variant.apparelTarget, target, variant.unitOfMeasure,
    variant.tracksInventory ? '재고 추적 on 온 관리중 tracked inventory on' : '재고 추적 off 오프 미추적 추적안함 untracked inventory off']
    .filter((value): value is string => Boolean(value)).map(normalizeSearch).join(' ');
}

export function filterFixtureVariants(product: FixtureProduct, variants: Variant[], search: string): Variant[] {
  const terms = searchTerms(search);
  if (!terms.length) return variants;
  const matched = variants.filter((variant) => {
    const searchable = variantSearchText(product, variant);
    return terms.every((term) => searchable.includes(term));
  });
  return matched.length ? matched : variants;
}

export function filterFixtureInventory(items: FixtureProduct[], filters: Filters): FixtureProduct[] {
  const terms = searchTerms(filters.search);
  return items.filter((product) => {
    if (!belongsToInventoryCollection(product, filters.collection)) return false;
    const tracked = product.variants.filter((variant) => variant.tracksInventory);
    const searchable = [product.businessDomain, product.nameKo, product.code, product.lineNameKo, ...tracked.map((variant) => variantSearchText(product, variant))].filter((value): value is string => Boolean(value)).map(normalizeSearch).join(' ');
    return terms.every((term) => searchable.includes(term)) && tracked.some((variant) => variantMatchesInventoryOptionFilters(variant, filters));
  }).sort((a, b) => a.nameKo.localeCompare(b.nameKo, 'ko-KR', { numeric: true, sensitivity: 'base' }));
}
