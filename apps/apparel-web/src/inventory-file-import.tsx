'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@vintad3e/ui/components';
import { maxCsvBytes, parseInventoryCsv } from './inventory-csv.mjs';

type InventoryRow = { sku: string; name: string; quantity: number };

function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  return <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th scope="col">SKU</th><th scope="col">상품명</th><th scope="col">현재수량</th></tr></thead><tbody>{rows.map(row => <tr key={row.sku}><td>{row.sku}</td><td>{row.name}</td><td>{row.quantity.toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>;
}

export function InventoryFileImport() {
  const [preview, setPreview] = useState<InventoryRow[] | null>(null);
  const [current, setCurrent] = useState<InventoryRow[] | null>(null);
  const [previous, setPrevious] = useState<InventoryRow[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; }, []);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0], request = ++sequence.current;
    event.currentTarget.value = '';
    setPreview(null); setError('');
    if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.csv') || file.size > maxCsvBytes) throw new Error('256KB 이하의 CSV 파일을 선택해 주세요.');
      const rows = parseInventoryCsv(new Uint8Array(await file.arrayBuffer()));
      if (request === sequence.current) setPreview(rows);
    } catch (caught) {
      if (request === sequence.current) setError(caught instanceof Error ? caught.message : '파일을 읽지 못했습니다.');
    }
  }
  function apply() { if (preview) { setPrevious(current); setCurrent(preview); setCanUndo(true); setPreview(null); } }
  function undo() { if (canUndo) { setCurrent(previous); setPrevious(null); setCanUndo(false); setPreview(null); } }

  return <details className="staff-section inventory-file-import"><summary>재고 파일 가져오기</summary>
    <p>CSV에는 SKU, 상품명, 현재수량 열만 넣어 주세요. 이름·전화번호·이메일 등 개인정보가 포함된 열은 넣지 마세요.</p>
    <p>파일은 이 화면에서만 읽습니다. 가져온 재고는 아래 표에 표시되며 기존 재고 목록은 바뀌지 않습니다. 페이지를 벗어나면 표가 지워집니다.</p>
    <p><a href="/inventory-format.csv" download>양식 내려받기</a></p>
    <label>재고 CSV 파일 <input type="file" accept=".csv,text/csv" onChange={choose} /></label>
    {error && <p role="alert">{error}</p>}
    {preview && <section aria-label="가져올 재고"><h3>가져올 재고</h3><InventoryTable rows={preview} /><Button type="button" variant="primary" onClick={apply}>재고 적용</Button></section>}
    {current && <section aria-label="가져온 재고"><h3>가져온 재고</h3><InventoryTable rows={current} /></section>}
    {canUndo && <Button type="button" variant="ghost" onClick={undo}>가져오기 되돌리기</Button>}
  </details>;
}
