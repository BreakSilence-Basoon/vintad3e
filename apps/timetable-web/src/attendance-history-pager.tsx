'use client';

import { Button } from '@vintad3e/ui/components';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AttendanceHistoryPager({
  href,
  totalCount,
  visibleCount,
}: {
  href: string;
  totalCount: number;
  visibleCount: number;
}) {
  const router = useRouter();
  // transition 안에서 옮기면 다음 묶음을 받아오는 동안 보던 목록이 그대로 남는다.
  // 그냥 링크로 옮기면 화면이 한 번 비고 다시 그려져 새로고침처럼 보인다.
  const [isLoading, startLoading] = useTransition();
  const safeTotalCount = Math.max(0, totalCount);
  const safeVisibleCount = Math.min(Math.max(0, visibleCount), safeTotalCount);

  if (safeTotalCount === 0 || safeVisibleCount >= safeTotalCount) {
    return null;
  }

  return (
    <nav className="attendance-history-pager" aria-label="출근부 더 불러오기">
      <span>
        {safeVisibleCount} / {safeTotalCount}
      </span>
      <Button
        aria-busy={isLoading || undefined}
        variant="ghost" size="small" profile="timetable"
        disabled={isLoading}
        onClick={() => {
          startLoading(() => {
            router.push(href, { scroll: false });
          });
        }}
        type="button"
      >
        {isLoading ? '불러오는 중...' : '더 불러오기'}
      </Button>
    </nav>
  );
}
