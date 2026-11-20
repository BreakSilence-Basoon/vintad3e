'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FixtureProduct } from './inventory-fixture';
import { readFixtureStock } from './inventory-fixture-session';
import { makeRows } from './shortage-fixture-view';
import { readFixtureDisplay } from './dashboard-fixture-request';
import { DashboardInventorySwitcher } from './dashboard-inventory-switcher';
import { GraphicInventoryHome, type GraphicInventoryHomeGroup } from './dashboard-graphic-inventory';
import { InventoryTrackingPanel } from './dashboard-inventory-tracking';
import { OnlinePreparationList, type OnlinePreparationCard } from './dashboard-online-preparation';
import { readOnlineChecklist } from './dashboard-online-storage';
import { AdminToastViewport } from './admin-toast';
import Link from 'next/link';

const orders: OnlinePreparationCard[] = [{ id: 'fixture-online-01', requestIds: ['fixture-online-01'], orderNumber: 'ORDER-001', soldAt: '2026-01-10T03:00:00Z', channelNameKo: '온라인', itemSummary: '반팔 티셔츠', itemLines: [{ name: '반팔 티셔츠 블랙 M', quantity: 1 }], totalQuantity: 1, checklist: { seongsuPicked: false, hanamPrepared: false } }];

export function DashboardFixtureHome({ products, reauthError }: { products: FixtureProduct[]; reauthError: boolean }) {
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(reauthError ? 'Cafe24 인증 시작 URL을 만들지 못했습니다.' : null);
  useEffect(() => {
    setLoaded(true);
    const refresh = () => setVersion(value => value + 1);
    window.addEventListener('vintad3e:dashboard-change', refresh);
    return () => window.removeEventListener('vintad3e:dashboard-change', refresh);
  }, []);
  const data = useMemo(() => {
    const rows = makeRows(products, loaded ? readFixtureStock() : {}).map(row => ({ ...row, locationCode: row.locationCode === 'seongsu' ? 'seongsu_store' : row.locationCode, seriesLabel: row.seriesLabel === '협업' ? '작가' : row.seriesLabel }));
    const hidden = loaded ? readFixtureDisplay() ?? {} : {};
    const groups: GraphicInventoryHomeGroup[] = products.map(product => {
      const members = rows.filter(row => product.variants.some(variant => variant.skuCode === row.skuId));
      const store = members.filter(row => row.locationCode === 'seongsu_store');
      return { productId: product.id, productCode: product.code, productNameKo: product.nameKo, seriesLabel: product.lineCode === 'collab' ? '작가' : '자체 제작', isHidden: hidden[product.id] ?? false, skuCount: store.length, managedSkuCount: store.filter(row => row.tracksInventory && (row.targetQty ?? 0) > 0).length, shortageSkuCount: store.filter(row => row.tracksInventory && row.shortageQty > 0).length, shortageQtyTotal: store.filter(row => row.tracksInventory).reduce((sum, row) => sum + row.shortageQty, 0), untrackedOnHandSkuCount: store.filter(row => !row.tracksInventory && row.onHandQty > 0).length, untrackedOnHandQtyTotal: store.filter(row => !row.tracksInventory).reduce((sum, row) => sum + row.onHandQty, 0), onHandQtyTotal: store.reduce((sum, row) => sum + row.onHandQty, 0), targetQtyTotal: store.filter(row => row.tracksInventory).reduce((sum, row) => sum + (row.targetQty ?? 0), 0), rows: members };
    });
    let completed = false;
    if (loaded) { try { const checklist = readOnlineChecklist(window.sessionStorage); completed = Boolean(checklist?.seongsuPicked || checklist?.hanamPrepared); } catch {} }
    return { rows, groups, shortage: groups.reduce((sum, group) => sum + group.shortageQtyTotal, 0), online: products.length && !completed ? 1 : 0 };
  }, [products, loaded, version]);
  const failSync = () => setSyncError('Cafe24 주문 갱신에 실패했습니다. Cafe24 연결 상태를 확인한 뒤 다시 시도해 주세요.');
  return <main className="dashboard-monitor" data-hydrated={loaded}>
    <section className="dashboard-monitor__quantity-copy" aria-label="준비 수량 요약"><div className="dashboard-monitor__freshness"><p>안녕하세요 <strong>관리자</strong>님!</p></div><div className="dashboard-monitor__quantity-summary"><p>성수 매장에서는 총 <span className="dashboard-monitor__quantity-number"><strong>{data.shortage}</strong>장이</span> 부족하고, 온라인 주문으로는 총 <span className="dashboard-monitor__quantity-number"><strong>{data.online}</strong>장이</span> 주문 들어와</p><p>작업이 필요한 수량은 총 <span className="dashboard-monitor__quantity-number"><strong>{data.shortage + data.online}</strong>장입니다.</span></p></div></section>
    <section className="dashboard-priority-grid"><DashboardInventorySwitcher shortagePanel={<GraphicInventoryHome draftOwner="fixture" groups={data.groups} isAdmin />} trackingPanel={<InventoryTrackingPanel rows={data.rows} />} />
      <article className="dashboard-panel dashboard-panel--online-prep"><div className="dashboard-panel__header"><div className="dashboard-panel__title-line"><h2>Cafe24 온라인 주문 준비 요청</h2><div className="dashboard-panel__title-action"><button type="button" className="button button--ghost button--small" onClick={failSync}>수동 갱신</button><Link href="/admin/integrations/cafe24/connect" className="button button--ghost button--small">Cafe24 재인증</Link></div></div></div><div className="order-list"><OnlinePreparationList orders={products.length ? orders : []} canEdit syncError={syncError} /></div></article>
    </section><AdminToastViewport />
  </main>;
}
