'use client';
import { useState } from 'react';
import { buildInventoryHref, type InventoryCollection, type InventoryOptionFilters } from './inventory-collection';
type Filters = InventoryOptionFilters & { collection: InventoryCollection; search: string };
export function InventoryEmpty({ initial }: { initial: Filters }) {
  const [filters, setFilters] = useState(initial);
  function update(next: Filters) { setFilters(next); window.history.replaceState(null, '', buildInventoryHref(next)); }
  return <section className="console-section console-section--read">
    <div className="admin-filter-bar admin-filter-bar--inventory"><div className="admin-filter-tabs" role="tablist" aria-label="인벤토리 분류">
      {([{ label: '자체', value: 'in-house' }, { label: '협업', value: 'collab' }] as const).map(tab => <button key={tab.value} type="button" role="tab" className={filters.collection === tab.value ? 'is-active' : undefined} aria-selected={filters.collection === tab.value} onClick={() => update({ ...filters, collection: tab.value })}>{tab.label}</button>)}
    </div><div className="audit-filter-bar inventory-filter-form"><label className="audit-filter-bar__keyword"><span className="sr-only">검색</span><input name="search" type="search" value={filters.search} placeholder="키워드를 입력하세요!" onChange={event => update({ ...filters, search: event.target.value })} /></label>
      {([['apparelType','형태','전체 형태'],['color','색상','전체 색상'],['size','사이즈','전체 사이즈'],['target','대상','전체 대상']] as const).map(([key,label,all]) => <label key={key}><span className="sr-only">{label}</span><select value={filters[key]} onChange={event => update({ ...filters, [key]: event.target.value })}><option value="">{all}</option></select></label>)}
    </div></div><p className="console-empty">표시할 옵션 품목이 없습니다.</p>
  </section>;
}
