import type { InventoryData, Part } from './inventory-fixture.ts';
import { formatKstDateTime } from './floor-format';
const unit = (value: string) => value === 'ea' ? '개' : value;
const amount = (value: number | null, suffix: string) => value === null ? '—' : value.toLocaleString('ko-KR') + ' ' + suffix;
const status: Record<string,string> = { ORDERED:'주문 중', RECEIVED:'입고 완료', RECORDED:'실사 기록', VOID:'취소됨' };
export function InventoryWorkspace({ data }: { data: InventoryData }) {
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
      <p>
        현재 계정은 재고를 조회할 수 있습니다. 기록은 관리자 계정에서
        가능합니다.
      </p>
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
