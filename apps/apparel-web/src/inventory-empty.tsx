'use client';
import { useState } from 'react';
import { buildInventoryHref, belongsToInventoryCollection, variantMatchesInventoryOptionFilters, type InventoryCollection, type InventoryOptionFilters } from './inventory-collection';
import { filterFixtureInventory, type FixtureProduct } from './inventory-fixture';
import { InventoryFixtureDetail, type Rows } from './inventory-fixture-detail';

type Filters = InventoryOptionFilters & { collection: InventoryCollection; search: string };
type SortKey = 'skuCode' | 'optionName' | 'apparelType' | 'color' | 'size' | 'apparelTarget' | 'unitOfMeasure';
const headers: [SortKey, string][] = [['skuCode','재고관리코드'],['optionName','옵션명'],['apparelType','형태'],['color','색상'],['size','사이즈'],['apparelTarget','대상'],['unitOfMeasure','단위']];
export function InventoryEmpty({ initial, products }: { initial: Filters; products: FixtureProduct[] }) {
  const [filters, setFilters] = useState(initial);
  const [selected, setSelected] = useState<FixtureProduct | null>(null);
  const [stockRows, setStockRows] = useState<Rows>({});
  const [sort, setSort] = useState<Record<string, {key: SortKey; direction: 'asc' | 'desc'}>>({});
  function update(next: Filters) { setFilters(next); window.history.replaceState(null, '', buildInventoryHref(next)); }
  const visible = filterFixtureInventory(products, filters);
  const variants = products.filter(product => belongsToInventoryCollection(product, filters.collection)).flatMap(product => product.variants.filter(variant => variant.tracksInventory));
  const choices = { apparelType: [...new Set(variants.map(v => v.apparelType))], color: [...new Set(variants.map(v => v.color))], size: [...new Set(variants.map(v => v.size))], target: [...new Set(variants.map(v => v.apparelTarget))] };
  return <section className="console-section console-section--read">
    <div className="admin-filter-bar admin-filter-bar--inventory"><div className="admin-filter-tabs" role="tablist" aria-label="인벤토리 분류">
      {([{ label: '자체', value: 'in-house' }, { label: '협업', value: 'collab' }] as const).map(tab => <button key={tab.value} type="button" role="tab" className={filters.collection === tab.value ? 'is-active' : undefined} aria-selected={filters.collection === tab.value} onClick={() => update({ ...filters, collection: tab.value })}>{tab.label}</button>)}
    </div><div className="audit-filter-bar inventory-filter-form"><label className="audit-filter-bar__keyword"><span className="sr-only">검색</span><input name="search" type="search" value={filters.search} placeholder="키워드를 입력하세요!" onChange={event => update({ ...filters, search: event.target.value })} /></label>
      {([['apparelType','형태','전체 형태'],['color','색상','전체 색상'],['size','사이즈','전체 사이즈'],['target','대상','전체 대상']] as const).map(([key,label,all]) => <label key={key}><span className="sr-only">{label}</span><select value={filters[key]} onChange={event => update({ ...filters, [key]: event.target.value })}><option value="">{all}</option>{choices[key].map(value => <option key={value} value={value}>{key === 'target' && value === 'UNISEX' ? '공용' : value}</option>)}</select></label>)}
    </div></div>{visible.length === 0 ? <p className="console-empty">표시할 옵션 품목이 없습니다.</p> : <div className="product-catalog">{visible.map(product => {
      const tracked = product.variants.filter(v => v.tracksInventory);
      const selectedVariants = tracked.filter(v => variantMatchesInventoryOptionFilters(v, filters));
      const terms = filters.search.trim().toLocaleLowerCase('ko-KR').split(/\s+/u).filter(Boolean);
      const matched = selectedVariants.filter(v => terms.every(term => Object.values(v).join(' ').toLocaleLowerCase('ko-KR').includes(term)));
      const state = sort[product.id];
      const rows = [...(matched.length ? matched : selectedVariants)].sort((a,b) => state ? a[state.key].localeCompare(b[state.key], 'ko-KR', { numeric: true }) * (state.direction === 'asc' ? 1 : -1) : 0);
      const unique = (key: 'apparelType'|'color'|'size') => [...new Set(tracked.map(v => v[key]))].join('/');
      return <details key={product.id} className="product-card"><summary className="product-card__summary">
        <div className="product-card__identity"><h3>{product.nameKo}</h3><div className="product-card__subline"><span>{product.code}</span><span>의류</span><span>{product.lineNameKo ?? '라인 미지정'}</span></div></div>
        <dl className="product-card__facts"><div><dt>옵션</dt><dd>{tracked.length}개</dd></div>{([['형태','apparelType'],['색상','color'],['사이즈','size']] as const).map(([label,key]) => <div key={key}><dt>{label}</dt><dd>{unique(key)}</dd></div>)}</dl>
        <button type="button" className="graphic-card__view-button product-card__view-button" onClick={event => { event.preventDefault(); event.stopPropagation(); setSelected(product); }} aria-label={`${product.nameKo} 재고 수정 창 열기`} title="재고 수정"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.1 3.6c-.7-.3-1.4.4-1.1 1.1l5.1 15.1c.3.8 1.4.9 1.8.1l2.1-4.2 4.5 4.5c.5.5 1.3.5 1.8 0l.9-.9c.5-.5.5-1.3 0-1.8L15.7 13l4.2-2.1c.8-.4.7-1.5-.1-1.8L5.1 3.6Z" /></svg></button>
      </summary><div className="product-card__table"><table className="simple-table"><thead><tr>{headers.map(([key,label]) => { const active = state?.key === key; const direction = active ? state.direction : 'asc'; return <th key={key}><button type="button" className={`sort-toggle-button${active ? ' is-active' : ''} sort-toggle-button--table`} aria-pressed={active} title={`${label} ${direction === 'asc' ? '내림차순' : '오름차순'}으로 변경`} onClick={() => setSort({...sort,[product.id]:{key,direction:active && direction === 'asc' ? 'desc':'asc'}})}><span>{label}</span><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d={direction === 'asc' ? 'M8 3.2 3.8 7.4l1.1 1.1 2.3-2.3v6.6h1.6V6.2l2.3 2.3 1.1-1.1L8 3.2Z' : 'm8 12.8 4.2-4.2-1.1-1.1-2.3 2.3V3.2H7.2v6.6L4.9 7.5 3.8 8.6 8 12.8Z'} /></svg></button></th>; })}</tr></thead><tbody>{rows.map(row => <tr key={row.skuCode}>{headers.map(([key]) => <td key={key}>{key === 'apparelTarget' && row[key] === 'UNISEX' ? '공용' : row[key]}</td>)}</tr>)}</tbody></table></div></details>;
    })}</div>}
    {selected ? <InventoryFixtureDetail product={selected} rows={stockRows} onRows={setStockRows} onClose={() => setSelected(null)} /> : null}
  </section>;
}
