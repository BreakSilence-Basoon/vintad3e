'use client';

import { Button } from '@vintad3e/ui/components';
import { FormEvent, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { DateRangePopover } from './date-range-popover';
type SalesSortDirection = 'asc' | 'desc';
type SalesSourceFilter = 'all' | 'cafe24' | 'seongsu_ticket' | 'pos';
type SalesStatusFilter = 'all' | 'checked' | 'pending' | 'unavailable' | 'not_required';
type AuditDateRangeFilter = 'all' | 'today' | '7d' | '30d' | 'custom';
const subscribe = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

export type SalesFilterFormState = {
  from: string;
  keyword: string;
  range: AuditDateRangeFilter;
  sortDirection: SalesSortDirection;
  source: SalesSourceFilter;
  status: SalesStatusFilter;
  to: string;
};

const dateRangeFilters: Array<{ label: string; value: AuditDateRangeFilter }> = [
  { label: '전체 기간', value: 'all' },
  { label: '오늘', value: 'today' },
  { label: '최근 7일', value: '7d' },
  { label: '최근 30일', value: '30d' },
  { label: '직접 지정', value: 'custom' },
];

const sourceFilters: Array<{ label: string; value: SalesSourceFilter }> = [
  { label: '전체 출처', value: 'all' },
  { label: 'Cafe24 주문', value: 'cafe24' },
  { label: '성수 매장 티켓', value: 'seongsu_ticket' },
  { label: '성수 매장 POS', value: 'pos' },
];

const statusFilters: Array<{ label: string; value: SalesStatusFilter }> = [
  { label: '전체 상태', value: 'all' },
  { label: '완료', value: 'checked' },
  { label: '대기', value: 'pending' },
  { label: '불가능', value: 'unavailable' },
  { label: '불필요', value: 'not_required' },
];

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value : '';
}

function isDateRangeFilter(value: string): value is AuditDateRangeFilter {
  return dateRangeFilters.some((option) => option.value === value);
}

function isSalesSourceFilter(value: string): value is SalesSourceFilter {
  return sourceFilters.some((option) => option.value === value);
}

function isSalesStatusFilter(value: string): value is SalesStatusFilter {
  return statusFilters.some((option) => option.value === value);
}

function isSalesSortDirection(value: string): value is SalesSortDirection {
  return value === 'asc' || value === 'desc';
}

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildSalesFilterHref(formData: FormData) {
  const params = new URLSearchParams();
  const rangeValue = getFormValue(formData, 'range');
  const sourceValue = getFormValue(formData, 'source');
  const statusValue = getFormValue(formData, 'status');
  const sortValue = getFormValue(formData, 'sort');
  const from = getFormValue(formData, 'from');
  const keyword = getFormValue(formData, 'keyword').trim();
  const to = getFormValue(formData, 'to');
  const range = isDateRangeFilter(rangeValue) ? rangeValue : 'all';
  const source = isSalesSourceFilter(sourceValue) ? sourceValue : 'all';
  const status = isSalesStatusFilter(statusValue) ? statusValue : 'all';
  const sortDirection = isSalesSortDirection(sortValue) ? sortValue : 'desc';

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

  if (source !== 'all') {
    params.set('source', source);
  }

  if (status !== 'all') {
    params.set('status', status);
  }

  if (keyword) {
    params.set('keyword', keyword);
  }

  if (sortDirection !== 'desc') {
    params.set('sort', sortDirection);
  }

  const query = params.toString();

  return query ? `/admin/sales?${query}` : '/admin/sales';
}

export function SalesFilterForm({ filters }: { filters: SalesFilterFormState }) {
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
    router.push(buildSalesFilterHref(new FormData(event.currentTarget)), {
      scroll: false,
    });
  }

  function handleReset() {
    router.push('/admin/sales', { scroll: false });
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
              const nextValidRange = isDateRangeFilter(nextRange)
                ? nextRange
                : 'all';

              setRange(nextValidRange);
              setIsCustomDateOpen(nextValidRange === 'custom');
            }}
          >
            {dateRangeFilters.map((option) => (
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
        <span className="sr-only">기록 출처</span>
        <select name="source" defaultValue={filters.source}>
          {sourceFilters.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="sr-only">교차검증 상태</span>
        <select name="status" defaultValue={filters.status}>
          {statusFilters.map((option) => (
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
