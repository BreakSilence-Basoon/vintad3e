'use client';

import { useEffect, useRef } from 'react';

// 같은 칸의 설명(title·aria-label)에 체크 날짜를 붙였다. 모양은 그대로다.
export function SettlementPaymentCheckbox({ paid, isAdmin, statusKnown = paid !== null, checkedDate = null, onChange }: {
  paid: boolean | null;
  isAdmin: boolean;
  statusKnown?: boolean;
  checkedDate?: string | null;
  onChange?: (paid: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editable = statusKnown && isAdmin && Boolean(onChange);
  const shownPaid = statusKnown ? paid : null;
  const paidLabel = checkedDate ? `지급 완료 (${checkedDate.replaceAll('-', '.')})` : '지급 완료';
  const description = shownPaid === null ? (statusKnown ? '지급 상태 미기록' : '지급 상태를 불러올 수 없음') : shownPaid ? paidLabel : '지급 미완료';
  useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = false; }, [paid]);
  return (
    <label className="online-prep-check settlement-payment-check">
      <input ref={inputRef} type="checkbox" checked={shownPaid === true} disabled={!editable}
        aria-label={description}
        title={!statusKnown ? '지급 상태를 불러올 수 없습니다.' : description}
        onChange={(event) => { if (editable) onChange?.(event.target.checked); }} />
    </label>
  );
}
