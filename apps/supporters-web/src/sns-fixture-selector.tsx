'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { setStaffStatusToast, showStaffToast } from '@vintad3e/ui/toast';

export const STAFF_SELECT_TOAST_KEY = 'coupon-staff-select';
export const STAFF_SELECT_ERROR_TOAST = '불러오지 못했습니다.\n다시 선택해 주세요.';

export function staffSelectLoadingText(displayName: string) {
  return displayName ? `${displayName} 정보를 불러오는 중입니다.` : '불러오는 중입니다.';
}

export function CouponStaffSelector({ selected, page = 'coupon', compact = false, members, onSelectionChange }: { selected: string; page?: 'coupon' | 'settlements' | 'home' | 'instagram' | 'tiktok'; compact?: boolean; members?: { staffId: string; displayName: string | null }[]; onSelectionChange?: (staffId: string) => void }) {
  const router = useRouter();
  const [value, setValue] = useState(selected);
  const [target, setTarget] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  useEffect(() => { setValue(selected); }, [selected]);
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); setStaffStatusToast(STAFF_SELECT_TOAST_KEY, null); }, []);
  useEffect(() => {
    if (target === null) return;
    if (isPending) { started.current = true; return; }
    if (!started.current) return;
    started.current = false;
    setTarget(null);
    setStaffStatusToast(STAFF_SELECT_TOAST_KEY, null);
    if (selected !== target) { setValue(selected); document.querySelector('.staff-home-content.is-leaving, .staff-home-empty.is-leaving')?.classList.remove('is-leaving'); showStaffToast(STAFF_SELECT_ERROR_TOAST, 'error'); }
  }, [isPending, selected, target]);
  const loading = target !== null;
  return (
    <div className={`coupon-staff-stage${compact ? ' coupon-staff-stage--compact' : ''}`} data-empty={!selected}>
    <div className="coupon-staff-selector">
      <select id="coupon-staff" aria-label="직원 선택" aria-busy={loading || undefined} disabled={loading} value={value} onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        if (onSelectionChange) { onSelectionChange(next); return; }
        if (pending.current) clearTimeout(pending.current);
        const outgoing = page === 'home' ? document.querySelector('.staff-home-content, .staff-home-empty') : null;
        outgoing?.classList.remove('is-leaving');
        if (next === selected) return;
        const name = next ? event.target.selectedOptions?.[0]?.text ?? '' : '';
        started.current = false;
        setTarget(next);
        setStaffStatusToast(STAFF_SELECT_TOAST_KEY, staffSelectLoadingText(name));
        const navigate = () => { pending.current = null; startTransition(() => { router.push(`${page === 'home' ? '/' : `/${page}`}?${new URLSearchParams({ staff: next }).toString()}`); }); };
        if (!outgoing || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { navigate(); return; }
        outgoing.classList.add('is-leaving');
        pending.current = setTimeout(navigate, 220);
      }}>
        <option value="">직원을 선택해 주세요</option>
        {members?.map((member) => <option key={member.staffId} value={member.staffId}>{member.displayName || '이름 없음'}</option>)}
      </select>
    </div>
    </div>
  );
}
