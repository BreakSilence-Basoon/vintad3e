'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button, Input, NativeSelect, Label } from '@vintad3e/ui/components';
import { buildAccountantMessage, copyAccountantMessage, identifierLabel, type AccountantEntry, type EntryErrors } from './dj-accountant-message';
import { seoulDate } from './partner-schedule';

type EntryRow = AccountantEntry & { key: number; visible: boolean };
const emptyRow = (key: number): EntryRow => ({ key, name: '', identifierKind: 'resident', identifier: '', paidAmount: '', visible: false });

export function DjAccountantMessage() {
  const [month, setMonth] = useState(() => seoulDate(new Date()).slice(0, 7));
  const [rows, setRows] = useState<EntryRow[]>([emptyRow(1)]);
  const [attempted, setAttempted] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle');
  const form = useRef<HTMLFormElement>(null), sequence = useRef(1), copying = useRef(false), revision = useRef(0);
  const lifecycle = useRef({ active: true });
  const result = buildAccountantMessage(month, rows);
  const clear = () => { revision.current++; form.current?.reset(); setRows([emptyRow(++sequence.current)]); setAttempted(false); setCopyState('idle'); };

  useEffect(() => {
    const scope = lifecycle.current;
    scope.active = true;
    // Sensitive drafts are memory-only; discard on page exit and bfcache restore.
    const discard = () => { revision.current++; form.current?.reset(); setRows([emptyRow(++sequence.current)]); setAttempted(false); setCopyState('idle'); };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) discard(); };
    window.addEventListener('pagehide', discard); window.addEventListener('pageshow', restore);
    return () => { scope.active = false; window.removeEventListener('pagehide', discard); window.removeEventListener('pageshow', restore); };
  }, []);

  const update = (key: number, values: Partial<EntryRow>) => {
    revision.current++; setCopyState('idle');
    setRows(current => current.map(row => row.key === key ? { ...row, ...values } : row));
  };
  const copy = async () => {
    if (copying.current) return;
    setAttempted(true);
    if (!result.ok) {
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const version = revision.current;
    copying.current = true; setCopyState('pending');
    const outcome = await copyAccountantMessage(month, rows, text => navigator.clipboard.writeText(text));
    copying.current = false;
    if (lifecycle.current.active && version === revision.current) setCopyState(outcome === 'copied' ? 'copied' : 'failed');
  };
  const monthError = attempted && !result.ok ? result.monthError : undefined;

  return <section className="staff-section partners-accountant" aria-labelledby="accountant-heading">
    <div className="staff-section__heading"><h2 id="accountant-heading">세무사 전달문</h2><Link href="/guide/dj" target="_blank" rel="noreferrer" className="button button--ghost">DJ 가이드</Link></div>
    <form ref={form} autoComplete="off" onSubmit={event => event.preventDefault()}>
      <fieldset disabled={copyState === 'pending'} className="partners-accountant__fields">
        <legend className="partners-visually-hidden">DJ 원천징수 정보 입력</legend>
        <div className="field partners-accountant__month"><Label appearance="group">대상 연월<Input type="month" value={month} min="1900-01" max="9999-12" onChange={event => { revision.current++; setMonth(event.target.value); setCopyState('idle'); }} aria-invalid={Boolean(monthError)} aria-describedby={monthError ? 'accountant-month-error' : undefined} /></Label>{monthError ? <span id="accountant-month-error" className="partners-field-error">{monthError}</span> : null}</div>
        <div>{rows.map((row, index) => {
          const errors: EntryErrors = attempted && !result.ok ? result.entries[index] ?? {} : {};
          const id = `accountant-${row.key}`;
          return <fieldset key={row.key} className="partners-accountant__row"><legend>DJ {index + 1}</legend>
            <div className="partners-accountant__row-fields">
              <div className="field"><Label appearance="group">이름<Input value={row.name} maxLength={100} onChange={event => update(row.key, { name: event.target.value })} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? `${id}-name-error` : undefined} /></Label>{errors.name ? <span id={`${id}-name-error`} className="partners-field-error">{errors.name}</span> : null}</div>
              <div className="field"><Label htmlFor={`${id}-kind`}>번호 종류</Label><NativeSelect id={`${id}-kind`} value={row.identifierKind} onChange={event => update(row.key, { identifierKind: event.target.value === 'foreign' ? 'foreign' : 'resident' })}><option value="resident">주민등록번호</option><option value="foreign">외국인등록번호</option></NativeSelect></div>
              <div className="partners-accountant__identifier"><Label appearance="group" htmlFor={`${id}-number`}>{identifierLabel(row.identifierKind)}</Label><div><Input id={`${id}-number`} type={row.visible ? 'text' : 'password'} inputMode="numeric" autoComplete="off" spellCheck={false} maxLength={14} value={row.identifier} onChange={event => update(row.key, { identifier: event.target.value })} aria-invalid={Boolean(errors.identifier)} aria-describedby={errors.identifier ? `${id}-number-error` : undefined} /><Button type="button" variant="ghost" aria-pressed={row.visible} aria-label={`DJ ${index + 1} 번호 ${row.visible ? '숨기기' : '보기'}`} onClick={() => update(row.key, { visible: !row.visible })}>{row.visible ? '숨기기' : '보기'}</Button></div>{errors.identifier ? <span id={`${id}-number-error`} className="partners-field-error">{errors.identifier}</span> : null}</div>
              <div className="field"><Label appearance="group">입금 금액 (원)<Input inputMode="numeric" maxLength={23} value={row.paidAmount} onChange={event => update(row.key, { paidAmount: event.target.value })} aria-invalid={Boolean(errors.paidAmount)} aria-describedby={errors.paidAmount ? `${id}-amount-error` : undefined} /></Label>{errors.paidAmount ? <span id={`${id}-amount-error`} className="partners-field-error">{errors.paidAmount}</span> : null}</div>
              <Button type="button" variant="ghost" disabled={rows.length === 1} aria-label={`DJ ${index + 1} 삭제`} onClick={() => { revision.current++; setRows(current => current.filter(item => item.key !== row.key)); setCopyState('idle'); }}>삭제</Button>
            </div>
          </fieldset>;
        })}</div>
        <div className="partners-accountant__actions"><Button type="button" variant="ghost" onClick={() => { setRows(current => [...current, emptyRow(++sequence.current)]); revision.current++; setCopyState('idle'); }}>DJ 추가</Button><Button type="button" variant="ghost" onClick={clear}>입력 지우기</Button></div>
      </fieldset>
      {result.ok ? <pre className="partners-accountant__preview" aria-label="전달문 미리보기">{result.text}</pre> : null}
      <p className="partners-accountant__notice">입금한 금액을 그대로 입력해 주세요. 복사한 전달문에는 번호 전체가 포함됩니다. 입력은 이 화면을 떠나면 지워집니다.</p>
      <div className="partners-accountant__actions"><Button type="button" variant="primary" onClick={copy} disabled={copyState === 'pending'} aria-busy={copyState === 'pending'}>{copyState === 'pending' ? '복사 중…' : '전달문 복사'}</Button>
        {copyState === 'copied' ? <span role="status">복사했습니다. 받는 사람을 확인한 뒤 직접 보내 주세요.</span> : null}
        {copyState === 'failed' ? <span role="alert">복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하고 다시 눌러 주세요.</span> : null}
      </div>
    </form>
  </section>;
}
