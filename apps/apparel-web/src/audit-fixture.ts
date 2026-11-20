import type { AuditFilterFormState } from './audit-filter-form';

export type FixtureAudit = { id: string; occurredAt: string; actor: 'staff1' | 'ai' | 'system'; actorLabel: string; summary: string };
const DAY = 86400000;
const dayOf = (time: number) => Math.floor((time + 9 * 3600000) / DAY);
function dayInput(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00+09:00`);
  return Number.isFinite(time) ? dayOf(time) : null;
}
export function getFixtureAudit(env: string | undefined, enabled: string | undefined, now: Date): FixtureAudit[] {
  if (env !== 'development' || enabled !== '1' || !Number.isFinite(now.getTime())) return [];
  return [
    { id: 'audit-1', occurredAt: now.toISOString(), actor: 'staff1', actorLabel: '구성원 1', summary: '재고 수량을 수정했습니다.' },
    { id: 'audit-2', occurredAt: new Date(now.getTime() - 2 * DAY).toISOString(), actor: 'ai', actorLabel: 'AI', summary: '판매 기록을 정리했습니다.' },
    { id: 'audit-3', occurredAt: new Date(now.getTime() - 8 * DAY).toISOString(), actor: 'system', actorLabel: '시스템', summary: '상품 정보를 갱신했습니다.' },
    ...Array.from({ length: 10 }, (_, index): FixtureAudit => ({ id: `audit-older-${index + 1}`, occurredAt: new Date(now.getTime() - (31 + index) * DAY).toISOString(), actor: 'system', actorLabel: '시스템', summary: '상품 정보를 갱신했습니다.' })),
  ];
}
export function filterFixtureAudit(entries: FixtureAudit[], filters: AuditFilterFormState, now: Date): FixtureAudit[] {
  const today = dayOf(now.getTime());
  const first = filters.range === 'today' ? today : filters.range === '7d' ? today - 6 : filters.range === '30d' ? today - 29 : filters.range === 'custom' ? dayInput(filters.from) : null;
  const last = filters.range === 'today' || filters.range === '7d' || filters.range === '30d' ? today : filters.range === 'custom' ? dayInput(filters.to) : null;
  const keyword = filters.keyword.toLocaleLowerCase('ko-KR');
  return entries.filter(entry => {
    const day = dayOf(Date.parse(entry.occurredAt));
    if (first !== null && day < first || last !== null && day > last) return false;
    if (filters.actor !== 'all' && entry.actor !== filters.actor) return false;
    return !keyword || [entry.actorLabel, entry.summary].some(value => value.toLocaleLowerCase('ko-KR').includes(keyword));
  }).toSorted((a, b) => filters.sortDirection === 'asc' ? a.occurredAt.localeCompare(b.occurredAt) : b.occurredAt.localeCompare(a.occurredAt));
}
