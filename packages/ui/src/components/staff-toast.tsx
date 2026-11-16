'use client';

// [기존 정본] Apparel의 승인된 viewport markup/정렬/ARIA 동작을 유지한다.
import { useSyncExternalStore, type ReactNode } from 'react';
import {
  subscribeToStaffToasts,
  getStaffToastSnapshot,
  getServerStaffToastSnapshot,
  type StaffToastTone,
} from '../lib/staff-toast-store';
import { formatToastText } from '../lib/toast-text';

export { formatToastText, splitToastSentences } from '../lib/toast-text';
export {
  showStaffToast,
  setStaffStatusToast,
  getStaffToastTiming,
  type StaffToastTone,
} from '../lib/staff-toast-store';

// [AI 판단] 운영 담당자 개발자의 Codex: 로그인 오류도 승인된 toast markup을 재사용한다.
export function StaffToast({
  children,
  tone = 'success',
  leaving = false,
  className = '',
}: {
  readonly children: ReactNode;
  readonly tone?: StaffToastTone;
  readonly leaving?: boolean;
  readonly className?: string;
}) {
  return (
    <div
      className={`staff-toast staff-toast--${tone}${leaving ? ' is-leaving' : ''}${className ? ` ${className}` : ''}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}

export function StaffToastViewport() {
  const current = useSyncExternalStore(
    subscribeToStaffToasts,
    getStaffToastSnapshot,
    getServerStaffToastSnapshot,
  );

  if (current.length === 0) {
    return null;
  }

  // 짧은 안내는 위에, 상태 안내는 맨 아래(모서리)에.
  const ordered = [
    ...current.filter((item) => !item.status),
    ...current.filter((item) => item.status),
  ];

  return (
    <div className="staff-toast-stack" aria-live="polite">
      {ordered.map((item) => (
        <StaffToast key={item.id} tone={item.tone} leaving={item.leaving}>
          {formatToastText(item.text)}
        </StaffToast>
      ))}
    </div>
  );
}
