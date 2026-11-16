'use client';

// [기존 정본] Apparel admin-toast의 상태·중복·타이머 동작을 그대로 추출한다.
// [AI 판단] 운영 담당자 개발자의 Codex: 내부 snapshot API는 같은 client viewport/store만 공유한다.

// 화면 오른쪽 아래 알림 한 곳. 저장 결과 같은 짧은 안내(잠깐 떴다 사라짐)와
// '최신 운영 데이터 확인 중' 같은 상태 안내(상태가 끝날 때까지 유지)를 같은 줄에 쌓아 겹치지 않게 한다.
// 오른쪽에서 미끄러져 나오고, 사라질 때도 오른쪽으로 미끄러져 나간다.

export type StaffToastTone = 'success' | 'error' | 'warning' | 'info';

export type StaffToastItem = {
  id: string;
  text: string;
  tone: StaffToastTone;
  // 상태 안내(자동으로 사라지지 않음). 항상 맨 아래(모서리 쪽)에 둔다.
  status: boolean;
  leaving: boolean;
};

const LEAVE_MS = 260;
const SUCCESS_MS = 2400;
const ERROR_MS = 5000;

// [기존 정본] 로그인 오류도 같은 표시 시간과 퇴장 시간을 사용한다.
export function getStaffToastTiming(tone: StaffToastTone) {
  return { durationMs: tone === 'error' ? ERROR_MS : SUCCESS_MS, leaveMs: LEAVE_MS } as const;
}

let items: StaffToastItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const emptyItems: StaffToastItem[] = [];

function emit(next: StaffToastItem[]) {
  items = next;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeToStaffToasts(listener: () => void) {
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
  if (!items.some((item) => item.id === id && !item.leaving)) {
    return;
  }

  clearTimer(id);

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
export function showStaffToast(text: string, tone: StaffToastTone = 'success') {
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
export function setStaffStatusToast(
  key: string,
  text: string | null,
  tone: StaffToastTone = 'info',
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

export function getStaffToastSnapshot() {
  return items;
}

export function getServerStaffToastSnapshot() {
  return emptyItems;
}
