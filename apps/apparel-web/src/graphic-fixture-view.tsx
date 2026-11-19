'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FixtureProduct } from './inventory-fixture';
import { readFixtureStock } from './inventory-fixture-session';
import { makeRows } from './shortage-fixture-view';
import { ShortageSkuEditor } from './shortage-sku-editor';
import { AdminToastViewport } from './admin-toast';

export function GraphicFixtureView({ product }: { product: FixtureProduct }) {
  const [rows, setRows] = useState(() => makeRows([product], {}));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setRows(makeRows([product], readFixtureStock())); setLoaded(true); }, [product]);
  const storeRows = rows.filter(row => row.locationCode === 'seongsu');
  const shortageRows = storeRows.filter(row => row.isShortageChecked);
  const shortageQtyTotal = shortageRows.reduce((total, row) => total + Math.max(row.shortageQty, 0), 0);
  const shortageSkuCount = shortageRows.length;
  const skuCount = storeRows.length;
  return <section className="console-page" data-hydrated={loaded}>
    <header className="console-page__header"><div><h1>{product.nameKo}</h1><p className="console-page__description">이 디자인에 연결된 옵션 품목의 부족 수량을 확인하고 수정합니다.</p></div><div className="button-row"><Link href="/admin/inventory/shortages" className="button button--ghost button--small">부족 상세</Link><Link href="/" className="button button--ghost button--small">운영 홈</Link></div></header>
    <section className="console-page__summary"><div><strong>{shortageQtyTotal}</strong><span>부족 수량</span></div><div><strong>{shortageSkuCount}</strong><span>부족 옵션 품목</span></div><div><strong>{skuCount}</strong><span>전체 옵션 품목</span></div></section>
    <ShortageSkuEditor rows={rows} mode="graphic-detail" onRowsChange={next => queueMicrotask(() => setRows(next))} /><AdminToastViewport />
  </section>;
}
