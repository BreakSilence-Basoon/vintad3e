'use client';


import { Button } from '@vintad3e/ui/components';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateRangePopover } from './date-range-popover';
import type {
  SalesDateRange as AuditDateRangeFilter,
  SalesFilterFormState,
  SalesSortDirection,
} from './sales-filters';

const dateRangeFilters: Array<{ label: string; value: AuditDateRangeFilter }> = [
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

function isDateRangeFilter(value: string): value is AuditDateRangeFilter {
  return dateRangeFilters.some((option) => option.value === value);
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
  const sortValue = getFormValue(formData, 'sort');
  const from = getFormValue(formData, 'from');
  const keyword = getFormValue(formData, 'keyword').trim();
  const to = getFormValue(formData, 'to');
  const range = isDateRangeFilter(rangeValue) ? rangeValue : 'all';
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

  if (keyword) {
    params.set('keyword', keyword);
  }

  if (sortDirection !== 'desc') {
    params.set('sort', sortDirection);
  }

  const query = params.toString();

  return query ? `/sales?${query}` : '/sales';
}

export function SalesFilterForm({ filters }: { filters: SalesFilterFormState }) {
  const router = useRouter();
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
    router.push('/sales', { scroll: false });
  }

  return (
    <form className="audit-filter-bar" onSubmit={handleSubmit}>
      <label className="audit-filter-bar__keyword">
        <span className="sr-only">키워드</span>
        <input
          name="keyword"
          type="search"
          defaultValue={filters.keyword}
          placeholder="검색"
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
        <span className="sr-only">정렬</span>
        <select name="sort" defaultValue={filters.sortDirection}>
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>
      </label>
      <div className="audit-filter-bar__actions">
        <Button
          variant="ghost" size="small" profile="timetable"
          type="button"
          onClick={handleReset}
        >
          초기화
        </Button>
        <Button variant="primary" size="small" profile="timetable" type="submit">
          적용
        </Button>
      </div>
    </form>
  );
}
