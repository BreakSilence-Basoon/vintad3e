'use client';

// 화면 오른쪽 아래 알림 한 곳. 저장 결과 같은 짧은 안내(잠깐 떴다 사라짐)와
// '최신 운영 데이터 확인 중' 같은 상태 안내(상태가 끝날 때까지 유지)를 같은 줄에 쌓아 겹치지 않게 한다.
// 오른쪽에서 미끄러져 나오고, 사라질 때도 오른쪽으로 미끄러져 나간다.

import { useSyncExternalStore } from 'react';
import { formatToastText } from '@vintad3e/ui/toast-text';

export type AdminToastTone = 'success' | 'error' | 'warning' | 'info';

type AdminToastItem = {
  id: string;
  text: string;
  tone: AdminToastTone;
  // 상태 안내(자동으로 사라지지 않음). 항상 맨 아래(모서리 쪽)에 둔다.
  status: boolean;
  leaving: boolean;
};

const LEAVE_MS = 260;
const SUCCESS_MS = 2400;
const ERROR_MS = 5000;

let items: AdminToastItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const emptyItems: AdminToastItem[] = [];

function emit(next: AdminToastItem[]) {
  items = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function clearTimer(id: string) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function dismiss(id: string) {
  clearTimer(id);

  if (!items.some((item) => item.id === id && !item.leaving)) {
    return;
  }

  emit(items.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
  timers.set(
    id,
    setTimeout(() => {
      timers.delete(id);
      emit(items.filter((item) => item.id !== id));
    }, LEAVE_MS),
  );
}

// 저장 결과 등 짧은 안내. 같은 문구가 이미 떠 있으면 새로 쌓지 않고 시간만 다시 잰다.
export function showAdminToast(text: string, tone: AdminToastTone = 'success') {
  const message = text.trim();

  if (!message) {
    return;
  }

  const existing = items.find(
    (item) => !item.status && !item.leaving && item.text === message && item.tone === tone,
  );
  const id = existing?.id ?? `toast-${nextId++}`;

  if (!existing) {
    emit([...items, { id, text: message, tone, status: false, leaving: false }]);
  }

  clearTimer(id);
  timers.set(
    id,
    setTimeout(() => dismiss(id), tone === 'error' ? ERROR_MS : SUCCESS_MS),
  );
}

// 상태 안내: text가 있으면 띄우고(같은 key는 내용만 바꿈), null이면 미끄러져 사라진다.
export function setAdminStatusToast(
  key: string,
  text: string | null,
  tone: AdminToastTone = 'info',
) {
  const id = `status-${key}`;
  const existing = items.find((item) => item.id === id);

  if (!text) {
    if (existing) {
      dismiss(id);
    }
    return;
  }

  clearTimer(id);

  if (existing) {
    emit(
      items.map((item) =>
        item.id === id ? { ...item, text, tone, leaving: false } : item,
      ),
    );
    return;
  }

  emit([...items, { id, text, tone, status: true, leaving: false }]);
}

export function AdminToastViewport() {
  const current = useSyncExternalStore(
    subscribe,
    () => items,
    () => emptyItems,
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
    <div className="admin-toast-stack" aria-live="polite">
      {ordered.map((item) => (
        <div
          key={item.id}
          className={`admin-toast admin-toast--${item.tone}${
            item.leaving ? ' is-leaving' : ''
          }`}
          role={item.tone === 'error' ? 'alert' : 'status'}
        >
          {formatToastText(item.text)}
        </div>
      ))}
    </div>
  );
}
