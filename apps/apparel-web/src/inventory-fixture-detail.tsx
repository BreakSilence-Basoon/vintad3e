'use client';
import { useState } from 'react';
import type { FixtureProduct } from './inventory-fixture';
import { defaultRow, editDraft, isDirty, toDraft, validateDraft, type Draft, type Row, type Rows } from './inventory-stock';
import { showAdminToast } from './admin-toast';

export function InventoryFixtureDetail({ product, rows, onRows, onClose }: { product: FixtureProduct; rows: Rows; onRows: (rows: Rows) => boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'seongsu'|'hanam'|'all'>('seongsu');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
  const locations = [{key:'seongsu', label:'성수'}, {key:'hanam',label:'하남'}];
  const records = locations.flatMap(location => product.variants.map(variant => ({location,variant,key:`${product.id}:${location.key}:${variant.skuCode}`})));
  const getRow = (key: string): Row => rows[key] ?? defaultRow();
  const getDraft = (key: string): Draft => drafts[key] ?? toDraft(getRow(key));
  const get = (key: string) => ({ ...getDraft(key), tracking: getRow(key).tracking });
  const list = records.filter(row => tab === 'all' || row.location.key === tab).sort((a,b) => {
    if (!sort) return 0;
    const value = (row: typeof a) => sort.key === 'location' ? row.location.label : sort.key in get(row.key) ? String(get(row.key)[sort.key as keyof ReturnType<typeof get>]) : String(row.variant[sort.key as keyof typeof row.variant]);
    return value(a).localeCompare(value(b), 'ko-KR', {numeric:true}) * (sort.desc ? -1 : 1);
  });
  const update = (key: string, field: keyof Draft, value: string) => setDrafts(current => ({ ...current, [key]: editDraft(current[key] ?? toDraft(getRow(key)), field, value, getRow(key).tracking) }));
  const dirty = list.filter(item => isDirty(getRow(item.key), getDraft(item.key)));
  function requestClose() {
    if (dirty.length) {
      const labels = dirty.slice(0, 6).map(item => `- ${item.variant.optionName}`).join('\n');
      const remaining = dirty.length > 6 ? `\n- 외 ${dirty.length - 6}개` : '';
      if (!window.confirm(`저장하지 않은 옵션 품목 변경사항이 있습니다.\n\n${labels}${remaining}\n\n이대로 창을 닫을까요?`)) return;
    }
    onClose();
  }
  function requestTab(next: typeof tab) {
    if (next === tab) return;
    if (dirty.length && !window.confirm('저장하지 않은 옵션 품목 변경사항이 있습니다. 탭을 바꿀까요?')) return;
    setDrafts(current => Object.fromEntries(Object.entries(current).filter(([key]) => !list.some(item => item.key === key))));
    setTab(next);
  }
  function save(key: string) {
    const result = validateDraft(getRow(key), getDraft(key));
    if ('error' in result) { showAdminToast(result.error, 'error'); return; }
    if (!onRows({ ...rows, [key]: result.row })) { showAdminToast('부족 재고를 저장하지 못했습니다.', 'error'); return; }
    setDrafts(current => { const next = { ...current }; delete next[key]; return next; });
    showAdminToast('저장했습니다.', 'success');
  }
  function toggleTracking(key: string, tracking: boolean) {
    const previous = getRow(key);
    const next = { ...previous, tracking, target: tracking ? previous.target : 0, shortage: tracking ? previous.shortage : 0 };
    if (!onRows({ ...rows, [key]: next })) { showAdminToast('재고추적 설정을 저장하지 못했습니다.', 'error'); return; }
    setDrafts(current => {
      if (!current[key]) return current;
      return { ...current, [key]: { ...current[key], target: tracking ? current[key].target : '0', shortage: tracking ? current[key].shortage : '0' } };
    });
    showAdminToast(`재고추적이 ${tracking ? 'ON' : 'OFF'}으로 저장되었습니다.`, 'success');
  }
  const header = (label: string, key: string) => <span className="shortage-table__sort-header"><button type="button" className={`sort-toggle-button${sort?.key === key ? ' is-active' : ''} sort-toggle-button--table`} aria-pressed={sort?.key === key} title={`${label} 오름차순으로 정렬`} onClick={() => setSort({key,desc:sort?.key === key && !sort.desc})}><span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d={sort?.key === key && sort.desc ? 'm8 12.8 4.2-4.2-1.1-1.1-2.3 2.3V3.2H7.2v6.6L4.9 7.5 3.8 8.6 8 12.8Z' : 'M8 3.2 3.8 7.4l1.1 1.1 2.3-2.3v6.6h1.6V6.2l2.3 2.3 1.1-1.1L8 3.2Z'} /></svg></button></span>;
  return <div className="graphic-dialog-backdrop"><section className="graphic-dialog" role="dialog" aria-modal="true" aria-labelledby="product-stock-dialog-title">
    <div className="graphic-dialog__chrome"><div className="graphic-dialog__tabs"><div className="graphic-tabs" role="tablist" aria-label="재고 위치 탭">{([['seongsu','성수'],['hanam','하남'],['all','전체']] as const).map(([key,label]) => <button type="button" key={key} role="tab" className={tab === key ? 'is-active' : undefined} aria-selected={tab === key} onClick={() => requestTab(key)}>{label} {product.variants.length * (key === 'all' ? 2 : 1)}</button>)}</div></div><div className="graphic-dialog__titlebar"><h3 id="product-stock-dialog-title" className="graphic-dialog__title">{product.nameKo}</h3><button type="button" className="graphic-dialog__close" aria-label="재고 수정 창 닫기" onClick={requestClose}>×</button></div></div>
    <div className="graphic-dialog__body"><div className={`shortage-table shortage-table--graphic${tab === 'all' ? ' shortage-table--with-location' : ''}`} role="table" aria-label="옵션 품목 부족 재고"><div className="shortage-table__head" role="row">{header('형태','apparelType')}{header('색상','color')}{header('사이즈','size')}{tab === 'all' ? header('재고 위치','location') : null}<span>재고추적</span>{header('현재고','onHand')}{header('목표재고','target')}{header('부족수량','shortage')}<span>저장</span></div><div className="shortage-table__body" role="rowgroup">{list.map(({key,variant,location}) => { const row = get(key); return <article key={key} className="shortage-table__row" role="row"><span className="shortage-table__option-cell">{variant.apparelType}</span><span className="shortage-table__option-cell">{variant.color}</span><span className="shortage-table__option-cell">{variant.size}</span>{tab === 'all' ? <span className="shortage-table__option-cell shortage-table__location-cell">{location.label}</span> : null}<div className="shortage-table__tracking" role="cell"><label className="inventory-tracking-toggle"><input type="checkbox" role="switch" checked={row.tracking} aria-checked={row.tracking} aria-label={`${variant.optionName} 재고추적`} onChange={event => toggleTracking(key,event.target.checked)}/><span className="inventory-tracking-toggle__switch" aria-hidden="true"/><span className="inventory-tracking-toggle__label">{row.tracking ? 'ON':'OFF'}</span></label></div>{([['현재고','onHand'],['목표재고','target'],['부족수량','shortage']] as const).map(([label,field]) => <label key={field} className={`shortage-table__input${field === 'target' && Number(row.target) > 0 ? ' shortage-table__input--target-managed' : ''}${field === 'shortage' && Number(row.shortage) > 0 ? ' shortage-table__input--shortage' : ''}${!row.tracking && field !== 'onHand' ? ' shortage-table__input--disabled' : ''}`}><span className="sr-only">{label}</span><input type="number" min="0" step="1" value={row[field]} disabled={!row.tracking && field !== 'onHand'} onChange={event => update(key,field,event.target.value)}/></label>)}<div className="shortage-table__action"><button type="button" className="shortage-save-button" aria-label={`${variant.optionName} 저장`} title="저장" onClick={() => save(key)}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 3.5h11.1L20.5 8v12.5H3.5v-17H5Zm1.5 2v5h9v-5h-9Zm11 13v-8.7l-2.8-2.8H14v5H5.5v6.5h2.3v-4.2h8.4v4.2h1.3Zm-8.2 0h5.4v-2.7H9.3v2.7Z" /></svg></button></div></article>; })}</div></div></div>
  </section></div>;
}
