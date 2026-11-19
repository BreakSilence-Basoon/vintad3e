'use client';

import { Button } from '@vintad3e/ui/components';
import { FormEvent, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { DateRangePopover } from './date-range-popover';
type AuditActorFilter = 'all' | 'staff1' | 'representative' | 'staff2' | 'ai' | 'system';
type AuditSortDirection = 'asc' | 'desc';
const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

export type AuditDateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'custom';

export type AuditFilterFormState = {
  actor: AuditActorFilter;
  from: string;
  keyword: string;
  range: AuditDateRangeFilter;
  sortDirection: AuditSortDirection;
  to: string;
};

const auditActorFilters: Array<{ label: string; value: AuditActorFilter }> = [
  { label: '실행자 전체', value: 'all' },
  { label: '구성원 1', value: 'staff1' },
  { label: '대표님', value: 'representative' },
  { label: '구성원 2', value: 'staff2' },
  { label: 'AI', value: 'ai' },
  { label: '시스템', value: 'system' },
];

const auditDateRangeFilters: Array<{ label: string; value: AuditDateRangeFilter }> = [
  { label: '전체 기간', value: 'all' },
  { label: '오늘', value: 'today' },
  { label: '최근 7일', value: '7d' },
  { label: '최근 30일', value: '30d' },
  { label: '직접 지정', value: 'custom' },
];

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value : '';
}

function isAuditActorFilter(value: string): value is AuditActorFilter {
  return auditActorFilters.some((option) => option.value === value);
}

function isAuditDateRangeFilter(value: string): value is AuditDateRangeFilter {
  return auditDateRangeFilters.some((option) => option.value === value);
}

function isAuditSortDirection(value: string): value is AuditSortDirection {
  return value === 'asc' || value === 'desc';
}

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildAuditFilterHref(formData: FormData) {
  const params = new URLSearchParams();
  const rangeValue = getFormValue(formData, 'range');
  const actorValue = getFormValue(formData, 'actor');
  const sortValue = getFormValue(formData, 'sort');
  const from = getFormValue(formData, 'from');
  const keyword = getFormValue(formData, 'keyword').trim();
  const to = getFormValue(formData, 'to');
  const range = isAuditDateRangeFilter(rangeValue) ? rangeValue : 'all';
  const actor = isAuditActorFilter(actorValue) ? actorValue : 'all';
  const sortDirection = isAuditSortDirection(sortValue) ? sortValue : 'desc';

  if (range !== 'all') {
    params.set('range', range);
  }

  if (range === 'custom') {
    if (isDateInput(from)) {
      params.set('from', from);
    }

    if (isDateInput(to)) {
      params.set('to', to);
    }
  }

  if (actor !== 'all') {
    params.set('actor', actor);
  }

  if (keyword) {
    params.set('keyword', keyword);
  }

  if (sortDirection !== 'desc') {
    params.set('sort', sortDirection);
  }

  const query = params.toString();

  return query ? `/admin/audit?${query}` : '/admin/audit';
}

export function AuditFilterForm({ filters }: { filters: AuditFilterFormState }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, hydratedSnapshot, serverSnapshot);
  const [range, setRange] = useState<AuditDateRangeFilter>(filters.range);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(
    filters.range === 'custom',
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(buildAuditFilterHref(new FormData(event.currentTarget)), {
      scroll: false,
    });
  }

  function handleReset() {
    router.push('/admin/audit', { scroll: false });
  }

  return (
    <form className="audit-filter-bar" data-hydrated={hydrated} onSubmit={handleSubmit}>
      <label className="audit-filter-bar__keyword">
        <span className="sr-only">키워드</span>
        <input
          name="keyword"
          type="search"
          defaultValue={filters.keyword}
          placeholder="키워드를 입력하세요!"
        />
      </label>
      <div className="audit-filter-bar__range">
        <label>
          <span className="sr-only">기간</span>
          <select
            name="range"
            value={range}
            onClick={() => {
              if (range === 'custom') {
                setIsCustomDateOpen(true);
              }
            }}
            onChange={(event) => {
              const nextRange = event.target.value;
              const nextValidRange = isAuditDateRangeFilter(nextRange)
                ? nextRange
                : 'all';

              setRange(nextValidRange);
              setIsCustomDateOpen(nextValidRange === 'custom');
            }}
          >
            {auditDateRangeFilters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {range === 'custom' ? (
          <DateRangePopover
            from={from}
            isOpen={isCustomDateOpen}
            to={to}
            onClose={() => setIsCustomDateOpen(false)}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        ) : null}
      </div>
      <label>
        <span className="sr-only">실행자</span>
        <select name="actor" defaultValue={filters.actor}>
          {auditActorFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">정렬</span>
        <select name="sort" defaultValue={filters.sortDirection}>
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>
      </label>
      <div className="audit-filter-bar__actions">
        <Button
          variant="ghost" size="small"
          type="button"
          onClick={handleReset}
        >
          초기화
        </Button>
        <Button variant="primary" size="small" type="submit">
          적용
        </Button>
      </div>
    </form>
  );
}
