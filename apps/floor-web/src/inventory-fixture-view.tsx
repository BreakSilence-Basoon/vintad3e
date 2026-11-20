'use client';
import { useEffect, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { parseIngredients, newIngredient } from './inventory-ingredients.mjs';
import { parseCounts, applyCounts } from './inventory-counts.mjs';
import { InventoryCountForm } from './inventory-count-form';
import { InventoryPurchaseForm } from './inventory-purchase-form';
import { parsePurchases, applyPurchases } from './inventory-purchases.mjs';
import { parseRecipes, recipesAt, applyRecipeUsage } from './inventory-recipes.mjs';
import { InventoryRecipeForm } from './inventory-recipe-form';
import type { InventoryData, Part } from './inventory-fixture.ts';
import { formatKstDateTime } from './floor-format';
const unit = (value: string) => value === 'ea' ? '개' : value;
const amount = (value: number | null, suffix: string) => value === null ? '—' : value.toLocaleString('ko-KR') + ' ' + suffix;
const status: Record<string,string> = { ORDERED:'주문 중', RECEIVED:'입고 완료', RECORDED:'실사 기록', VOID:'취소됨' };
type Purchase = InventoryData['entries'][number] & { receivedAt: string | null };
export function InventoryWorkspace({ data: initial, canWrite = false }: { data: InventoryData; canWrite?: boolean }) {
  const [added, setAdded] = useState<{ id: string; name: string; unit: string }[]>([]);
  const [message, setMessage] = useState('');
  const [counts, setCounts] = useState<InventoryData['entries']>([]);
  const [countBroken, setCountBroken] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseBroken, setPurchaseBroken] = useState(false);
  const [recipes, setRecipes] = useState<InventoryData['recipes']>([]);
  const [recipeBroken, setRecipeBroken] = useState(false);
  const [ready, setReady] = useState(false);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (!canWrite) return;
    try { const stored = sessionStorage.getItem('vintad3e-floor-ingredients'); const result = parseIngredients(stored); if (!result) { setBroken(true); setCountBroken(true); setPurchaseBroken(true); setRecipeBroken(true); setMessage('입력값을 확인해주세요.'); } else { setAdded(result); const all = [...initial.ingredients, ...result]; const existing = parseCounts(sessionStorage.getItem('vintad3e-floor-counts'), all); if (existing) setCounts(existing); else setCountBroken(true); const ordered = parsePurchases(sessionStorage.getItem('vintad3e-floor-purchases'), all); if (ordered) setPurchases(ordered); else setPurchaseBroken(true); const saved = parseRecipes(sessionStorage.getItem('vintad3e-floor-recipes'), all); if (saved) setRecipes(saved); else setRecipeBroken(true); } }
    catch { setBroken(true); setCountBroken(true); setPurchaseBroken(true); setRecipeBroken(true); setMessage('입력값을 확인해주세요.'); }
    setReady(true);
  }, [canWrite, initial.ingredients]);
  const history = [...initial.recipes, ...recipes];
  const data: InventoryData = { ...initial, ingredients: [...initial.ingredients, ...added], recipes: recipesAt(history, Date.now()), rows: applyPurchases(applyCounts(applyRecipeUsage([...initial.rows, ...added.map(item => ({ ...item, countQuantity: null, countAt: null, expectedQuantity: null, used30: 0, remainingDays: null }))], history), counts), purchases), entries: [...initial.entries, ...counts, ...purchases].sort((a,b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0,100) };
  const writeCounts = (next: InventoryData['entries']) => { try { sessionStorage.setItem('vintad3e-floor-counts', JSON.stringify(next)); setCounts(next); return true; } catch { return false; } };
  const writePurchases = (next: Purchase[]) => { try { sessionStorage.setItem('vintad3e-floor-purchases', JSON.stringify(next)); setPurchases(next); return true; } catch { return false; } };

  const ingredients = new Map(data.ingredients.map((i) => [i.id, i]));
  const partsLabel = (parts: Part[]) =>
    parts
      .map((p) => {
        const i = ingredients.get(p.ingredientId);
        return (
          (i?.name ?? '재료') + ' ' + amount(p.quantity, unit(i?.unit ?? ''))
        );
      })
      .join(' · ');
  return (
    <>
      <section className="dashboard-panel floor-section">
        <h2>재료 현황</h2>
        <p className="floor-page__description">
          예상 재고 = 마지막 실사 + 이후 입고 − 메뉴 판매에 따른 사용량.
          폐기·시음·제조 손실은 포함하지 않습니다.
        </p>
        {data.unmappedSales > 0 && (
          <p className="inventory-note">
            최근 30일 판매 중 {data.unmappedSales.toLocaleString('ko-KR')}개는
            판매 당시 레시피가 없어 사용량 계산에서 빠져 있습니다.
          </p>
        )}
        <div className="floor-table-wrap">
          <table className="simple-table floor-table">
            <thead>
              <tr>
                <th>재료</th>
                <th>최근 실사</th>
                <th>예상 재고</th>
                <th>30일 사용 추정</th>
                <th>예상 소진</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    {r.name}
                    <small className="inventory-date">
                      {r.countAt ? formatKstDateTime(r.countAt) : '실사 미입력'}
                    </small>
                  </th>
                  <td>{amount(r.countQuantity, unit(r.unit))}</td>
                  <td>{amount(r.expectedQuantity, unit(r.unit))}</td>
                  <td>{amount(r.used30, unit(r.unit))}</td>
                  <td>
                    {r.remainingDays === null ? '—' : r.remainingDays + '일'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.rows.length && (
          <p>아직 등록한 재료가 없습니다. 재료부터 추가해주세요.</p>
        )}
        <p className="floor-page__description">
          소진 일수는 최근 30일 평균 사용량으로 계산합니다. 실사·레시피가
          부족하면 표시하지 않거나 실제와 다를 수 있습니다.
        </p>
      </section>
      {canWrite ? <section className="dashboard-panel floor-section"><h2>기록하기</h2><details className="inventory-editor"><summary>재료 등록</summary><form className="inventory-form" onSubmit={event => {
        event.preventDefault(); if (!ready || broken) return;
        const form = event.currentTarget, values = new FormData(form), item = newIngredient(String(values.get('name') ?? ''), String(values.get('unit') ?? ''), data.ingredients);
        if (!item) { setMessage('입력값을 확인해주세요.'); return; }
        try { const next = [...added, item]; sessionStorage.setItem('vintad3e-floor-ingredients', JSON.stringify(next)); setAdded(next); form.reset(); setMessage('저장했습니다.'); } catch { setMessage('입력값을 확인해주세요.'); }
      }}><fieldset disabled={!ready || broken}><label>재료명<input name="name" required maxLength={160} placeholder="예: 우유" /></label><label>관리 단위<select name="unit"><option value="ml">ml</option><option value="g">g</option><option value="ea">개</option></select></label><p>구매량과 메뉴 사용량을 같은 단위로 입력합니다. 예: 750ml 두 병은 1,500ml.</p><Button type="submit" variant="primary" profile="timetable">저장</Button></fieldset><p role="status">{message}</p></form></details><InventoryRecipeForm ingredients={data.ingredients} disabled={!ready || recipeBroken} save={recipe => { try { if (recipes.length >= 100) return false; const next = [...recipes, recipe]; sessionStorage.setItem('vintad3e-floor-recipes', JSON.stringify(next)); setRecipes(next); return true; } catch { return false; } }} />{recipeBroken && <p role="alert">입력값을 확인해주세요.</p>}<InventoryPurchaseForm ingredients={data.ingredients} disabled={!ready || purchaseBroken} save={record => purchases.length < 100 && writePurchases([...purchases, record])} />{purchaseBroken && <p role="alert">입력값을 확인해주세요.</p>}<InventoryCountForm ingredients={data.ingredients} disabled={!ready || countBroken} save={record => counts.length < 100 && writeCounts([...counts, record])} />{countBroken && <p role="alert">입력값을 확인해주세요.</p>}</section> : <p>현재 계정은 재고를 조회할 수 있습니다. 기록은 관리자 계정에서 가능합니다.</p>}
      <section className="dashboard-panel floor-section">
        <h2>메뉴별 재료</h2>
        {data.recipes.length ? (
          <ul className="inventory-list">
            {data.recipes.map((r) => (
              <li key={r.id}>
                <strong>{r.menuName}</strong>
                <span>{partsLabel(r.ingredients)}</span>
                <small>{formatKstDateTime(r.effectiveAt)}부터 적용</small>
              </li>
            ))}
          </ul>
        ) : (
          <p>등록한 레시피가 없습니다.</p>
        )}
      </section>
      <section className="dashboard-panel floor-section">
        <h2>구매·실사 내역</h2>
        <p className="floor-page__description">
          최근 1년 중 최신 100건. 잘못 입력한 기록은 취소 후 다시 등록할 수
          있습니다.
        </p>
        {data.entries.length ? (
          <ul className="inventory-list">
            {data.entries.map((e) => (
              <li key={e.id}>
                <div className="inventory-record-heading">
                  <strong>
                    {e.kind === 'COUNT' ? '재고 실사' : e.supplier}
                  </strong>
                  <span>{status[e.status] ?? e.status}</span>
                </div>
                <span>{partsLabel(e.lines)}</span>
                <small>
                  {formatKstDateTime(e.occurredAt)}{' '}
                  {e.reference && ' · ' + e.reference}
                </small>
                {canWrite && e.kind === 'PURCHASE' && e.status !== 'VOID' && <div className="inventory-actions">{e.status === 'ORDERED' && <Button type="button" variant="default" size="small" profile="timetable" disabled={!ready || purchaseBroken} onClick={() => { if (!writePurchases(purchases.map(item => item.id === e.id ? { ...item, status:'RECEIVED', receivedAt:new Date(Math.max(Date.now(), Date.parse(item.occurredAt))).toISOString() } : item))) setPurchaseBroken(true); }}>지금 입고 완료</Button>}<Button type="button" variant="default" size="small" profile="timetable" disabled={!ready || purchaseBroken} onClick={() => { if (!writePurchases(purchases.map(item => item.id === e.id ? { ...item, status:'VOID' } : item))) setPurchaseBroken(true); }}>기록 취소</Button></div>}
                {canWrite && e.kind === 'COUNT' && e.status !== 'VOID' && <div className="inventory-actions"><Button type="button" variant="default" size="small" profile="timetable" disabled={!ready || countBroken} onClick={() => { if (!writeCounts(counts.map(item => item.id === e.id ? { ...item, status:'VOID' } : item))) setCountBroken(true); }}>기록 취소</Button></div>}
              </li>
            ))}
          </ul>
        ) : (
          <p>기록된 내역이 없습니다.</p>
        )}
      </section>
    </>
  );
}
