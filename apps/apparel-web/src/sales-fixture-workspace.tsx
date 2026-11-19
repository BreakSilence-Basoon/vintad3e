'use client';
import { useEffect, useState } from 'react';
import { SalesEmptyToolbar } from './sales-empty-toolbar';
import { SalesFilterForm, type SalesFilterFormState } from './sales-filter-form';
import { filterFixtureSales, type FixtureSale } from './sales-fixture';
import { SalesFixtureList } from './sales-fixture-list';
import { readFixtureSync, writeFixtureSync } from './sales-fixture-sync';

export function SalesFixtureWorkspace({ sales, filters, now }: { sales: FixtureSale[]; filters: SalesFilterFormState; now: string }) {
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  useEffect(() => { try { setSyncedAt(readFixtureSync(sessionStorage)); } catch {} }, []);
  const sync = () => {
    try {
      const value = writeFixtureSync(sessionStorage, new Date());
      if (!value) return false;
      setSyncedAt(value); return true;
    } catch { return false; }
  };
  const extra: FixtureSale[] = syncedAt ? [{ id: 'sale-sync-1', soldAt: syncedAt, item: '가방', quantity: 1, amount: 11111, source: 'pos', status: 'pending', number: 'POS-002' }] : [];
  return <><SalesEmptyToolbar onFixtureSync={sync} fixtureSyncedAt={syncedAt} /><SalesFilterForm key={[filters.range, filters.from, filters.to, filters.source, filters.status, filters.keyword, filters.sortDirection].join(':')} filters={filters} /><SalesFixtureList sales={filterFixtureSales([...sales, ...extra], filters, new Date(now))} /></>;
}
