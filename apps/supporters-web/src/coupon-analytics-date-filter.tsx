'use client';

import { showStaffToast } from '@vintad3e/ui/toast';

export function CouponAnalyticsDateFilter({ start, end, placement = 'mobile' }: { start: string; end: string; placement?: 'mobile' | 'desktop' }) {
  return (
    <form className={`coupon-analytics__date-filter coupon-analytics__date-filter--${placement}`} action="/#coupon-analytics-title" method="get" onSubmit={(event) => {
      const data = new FormData(event.currentTarget);
      const from = String(data.get('from') ?? '');
      const to = String(data.get('to') ?? '');
      if (from && to && to < from) {
        event.preventDefault();
        showStaffToast('종료일은 시작일보다 빠를 수 없습니다.', 'error');
      }
    }}>
      <input type="hidden" name="staff" value="supporter-1" />
      <label>시작일<input type="date" name="from" defaultValue={start} required /></label>
      <span aria-hidden="true">–</span>
      <label>종료일<input type="date" name="to" defaultValue={end} required /></label>
      <button type="submit">조회</button>
    </form>
  );
}
