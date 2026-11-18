'use client';
import { Fragment, useState } from 'react';
import { Button } from '@vintad3e/ui/components';
import { formatStoredWon } from './showroom-read';
import { filterLedger, type LedgerRead, type LedgerFilter } from './ledger-filter';
const initialFilter: LedgerFilter = { from: '', to: '', query: '', status: '' };
export function SettlementLedger({ data, direction = 'payout', counterpartyLabel = '협업처' }: { data: LedgerRead; direction?: 'payout' | 'collection'; counterpartyLabel?: string }) {
  const [filter, setFilter] = useState(initialFilter), [error, setError] = useState(''), [expanded, setExpanded] = useState<string | null>(null);
  const rows = data.kind === 'ready' ? filterLedger(data.rows, filter) : [];
  const status = { UNKNOWN: '미확인', PENDING: direction === 'collection' ? '미수납' : '지급 대기', COMPLETED: direction === 'collection' ? '수납 완료' : '지급 완료' };
  const title = direction === 'collection' ? '수납 내역' : '지급 내역';
  const money = (value: string | null) => value === null ? '미확인' : formatStoredWon(value);
  return <section className="staff-section partners-ledger" aria-label={title}><div className="staff-section__heading"><h2>{title}</h2></div>
    <form className="partners-ledger__filters" onSubmit={event => {
      event.preventDefault(); const fields = new FormData(event.currentTarget);
      const next = { from: String(fields.get('from') ?? ''), to: String(fields.get('to') ?? ''), query: String(fields.get('query') ?? ''), status: String(fields.get('status') ?? '') };
      if (next.from && next.to && next.from > next.to) { setError('종료일은 시작일 이후로 선택해 주세요.'); return; }
      setError(''); setFilter(next); setExpanded(null);
    }}>
      <label>{counterpartyLabel}<input name="query" type="search" /></label>
      <label>시작일<input name="from" type="date" /></label><label>종료일<input name="to" type="date" /></label>
      <label>{direction === 'collection' ? '수납 상태' : '지급 상태'}<select name="status"><option value="">전체</option>{Object.entries(status).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button variant="primary" type="submit">조회</Button><Button variant="ghost" type="reset" onClick={() => { setFilter(initialFilter); setError(''); setExpanded(null); }}>초기화</Button>
    </form>
    {error ? <p role="alert">{error}</p> : null}
    {data.kind !== 'ready' ? <p className="partners-read-state" role="status">{data.kind === 'denied' ? '정산 내역을 조회할 권한이 없습니다.' : '정산 내역을 불러오지 못했습니다.'}</p> : !rows.length ? <p className="staff-empty">조회 조건에 해당하는 정산 내역이 없습니다.</p> : <div className="partners-table-scroll" role="region" aria-label={title} tabIndex={0}><table><thead><tr><th>정산 대상 기간</th><th>{counterpartyLabel}</th><th>정산액</th><th>{direction === 'collection' ? '수납 상태' : '지급 상태'}</th><th>상세</th></tr></thead><tbody>{rows.map(row => <Fragment key={row.id}><tr>
      <td>{row.from === row.to ? row.from : `${row.from} ~ ${row.to}`}</td><th scope="row">{row.counterparty}</th><td>{money(row.amount)}</td><td>{status[row.status]}</td><td><Button type="button" variant="ghost" size="small" aria-expanded={expanded === row.id} aria-controls={`ledger-${row.id}`} aria-label={`${row.counterparty} ${row.from} 정산 상세`} onClick={() => setExpanded(expanded === row.id ? null : row.id)}>{expanded === row.id ? '닫기' : '상세'}</Button></td>
    </tr>{expanded === row.id ? <tr id={`ledger-${row.id}`}><td colSpan={5}><div className="partners-ledger__detail"><h3>합의한 정산 조건</h3>{row.terms === null ? <p>정산 조건 미확인</p> : <dl>{row.terms.map(term => <div key={term.label}><dt>{term.label}</dt><dd>{term.value}</dd></div>)}</dl>}<h3>{direction === 'collection' ? '수납 기록' : '지급 기록'}</h3><dl><div><dt>{direction === 'collection' ? '수납액' : '지급액'}</dt><dd>{money(row.completedAmount)}</dd></div><div><dt>처리일</dt><dd>{row.completedAt ?? '미확인'}</dd></div><div><dt>기록 근거</dt><dd>{row.reference ?? '미확인'}</dd></div></dl></div></td></tr> : null}</Fragment>)}</tbody></table></div>}
  </section>;
}
