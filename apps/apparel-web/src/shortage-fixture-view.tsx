'use client';
import { useEffect, useState } from 'react';
import type { FixtureProduct } from './inventory-fixture';
import { readFixtureStock } from './inventory-fixture-session';
import { defaultRow, type Rows } from './inventory-stock';
import { ShortageSkuEditor, type ShortageEditorRow } from './shortage-sku-editor';
import { AdminToastViewport } from './admin-toast';

function makeRows(products: FixtureProduct[], saved: Rows): ShortageEditorRow[] {
  return products.flatMap(product => ['seongsu', 'hanam'].flatMap(location => product.variants.map(variant => {
    const id = `${product.id}:${location}:${variant.skuCode}`, stock = saved[id] ?? defaultRow();
    return { id, productNameKo: product.nameKo, seriesLabel: product.lineCode === 'collab' ? '협업' : '자체 제작', skuId: variant.skuCode, skuCode: variant.skuCode, skuNameKo: variant.optionName, optionSummary: variant.optionName, apparelType: variant.apparelType, apparelTarget: variant.apparelTarget as 'UNISEX' | 'WOMEN' | 'MEN', color: variant.color, size: variant.size, locationId: location, locationCode: location, locationNameKo: location === 'seongsu' ? '성수' : '하남', stockTargetId: id, targetQty: stock.target, onHandQty: stock.onHand, shortageQty: stock.shortage, isShortageChecked: stock.tracking && stock.shortage > 0, tracksInventory: stock.tracking, updatedAt: null };
  })));
}
export function ShortageFixtureView({ products }: { products: FixtureProduct[] }) {
  const [rows, setRows] = useState(() => makeRows(products, {}));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setRows(makeRows(products, readFixtureStock())); setLoaded(true); }, [products]);
  return <div data-hydrated={loaded}><ShortageSkuEditor rows={rows} mode="shortage-detail" onRowsChange={next => queueMicrotask(() => setRows(next))} /><AdminToastViewport /></div>;
}
