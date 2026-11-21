'use client';
import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@vintad3e/ui/components';
import { maxCsvBytes, parseInventoryCsv } from './inventory-csv.mjs';

type Row = { sku: string; name: string; quantity: number };
type State = { revision: number; rows: Row[]; canUndo: boolean };
function Table({ rows }: { rows: Row[] }) { return <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th scope="col">SKU</th><th scope="col">상품명</th><th scope="col">현재수량</th></tr></thead><tbody>{rows.map(row => <tr key={row.sku}><td>{row.sku}</td><td>{row.name}</td><td>{row.quantity.toLocaleString('ko-KR')}</td></tr>)}</tbody></table></div>; }

export function ServerInventoryImport() {
  const [current, setCurrent] = useState<State | null>(null);
  const [preview, setPreview] = useState<{ rows: Row[]; bytes: Uint8Array } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const version = useRef(0);
  async function load() {
    setBusy(true); setError('');
    try { const response = await fetch('/api/server-inventory', { cache: 'no-store' }); if (!response.ok) throw new Error(); setCurrent(await response.json()); }
    catch { setError('재고를 읽지 못했습니다. 로그인과 연결 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  }
  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0], request = ++version.current; event.currentTarget.value = '';
    setPreview(null); setError(''); if (!file) return;
    try {
      if (!file.name.toLowerCase().endsWith('.csv') || file.size > maxCsvBytes) throw new Error('256KB 이하의 CSV 파일을 선택해 주세요.');
      const bytes = new Uint8Array(await file.arrayBuffer()), rows = parseInventoryCsv(bytes);
      if (request === version.current) setPreview({ rows, bytes });
    } catch (caught) { if (request === version.current) setError(caught instanceof Error ? caught.message : '파일을 읽지 못했습니다.'); }
  }
  async function change(action: 'apply' | 'undo') {
    if (!current || busy || (action === 'apply' && !preview)) return;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/server-inventory?action=${action}`, { method: 'POST', headers: { 'content-type': action === 'apply' ? 'text/csv' : 'application/octet-stream', 'x-inventory-revision': String(current.revision) }, body: action === 'apply' ? preview!.bytes as BodyInit : undefined });
      if (response.status === 409) throw new Error('자료가 바뀌었습니다. 현재 재고를 다시 불러와 확인해 주세요.');
      if (!response.ok) throw new Error('재고를 저장하지 못했습니다. 다시 시도해 주세요.');
      setCurrent(await response.json()); setPreview(null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '재고를 저장하지 못했습니다.'); }
    finally { setBusy(false); }
  }
  return <details className="staff-section server-inventory-import" onToggle={event => { if (event.currentTarget.open && !current && !busy) void load(); }}><summary>재고 파일 가져오기</summary>
    <p>CSV에는 SKU, 상품명, 현재수량 열만 넣어 주세요. 이름·전화번호·이메일 등 개인정보가 포함된 열은 넣지 마세요.</p>
    <p>가져온 재고는 연결된 서버에서 보며 기존 재고 목록과는 별도입니다. 서버 접근 권한과 백업을 확인해 주세요.</p>
    <p><a href="/inventory-format.csv" download>양식 내려받기</a> · <a href="/sign-in">로그인</a></p>
    <label>재고 CSV 파일 <input type="file" accept=".csv,text/csv" onChange={choose} disabled={busy || !current} /></label>
    {error && <p role="alert">{error}</p>}
    <Button type="button" variant="ghost" disabled={busy} onClick={() => void load()}>현재 재고 다시 불러오기</Button>
    {preview && <section aria-label="가져올 재고"><h3>가져올 재고</h3><Table rows={preview.rows} /><Button type="button" variant="primary" disabled={busy} onClick={() => void change('apply')}>재고 적용</Button></section>}
    {current && <section aria-label="가져온 재고"><h3>가져온 재고</h3>{current.rows.length ? <Table rows={current.rows} /> : <p>가져온 재고가 없습니다.</p>}</section>}
    {current?.canUndo && <Button type="button" variant="ghost" disabled={busy} onClick={() => void change('undo')}>가져오기 되돌리기</Button>}
  </details>;
}
