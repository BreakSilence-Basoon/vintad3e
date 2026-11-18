"use client";

import { Button } from '@vintad3e/ui/components';
import { FormEvent, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AttendanceDateRangePopover } from "./attendance-date-range-popover";
import type { AttendanceHistoryEmployee } from "./api-contract";

export type AttendanceHistoryRange =
  | "all"
  | "today"
  | "last7"
  | "last30"
  | "custom";

export type AttendanceHistorySort = "asc" | "desc";

export type AttendanceHistoryFilters = {
  employee: string;
  from: string;
  range: AttendanceHistoryRange;
  sort: AttendanceHistorySort;
  to: string;
};

const rangeOptions: Array<{
  label: string;
  value: AttendanceHistoryRange;
}> = [
  { label: "전체 기간", value: "all" },
  { label: "오늘", value: "today" },
  { label: "최근 7일", value: "last7" },
  { label: "최근 30일", value: "last30" },
  { label: "직접 지정", value: "custom" },
];

const subscribeToHydration = () => () => {};
const getHydratedSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isRange(value: string): value is AttendanceHistoryRange {
  return rangeOptions.some((option) => option.value === value);
}

function isSort(value: string): value is AttendanceHistorySort {
  return value === "asc" || value === "desc";
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function buildFilterHref(
  formData: FormData,
  isAdmin: boolean,
  pathname: string,
  persistentParams: Record<string, string>,
) {
  const params = new URLSearchParams(persistentParams);
  const rawRange = getFormValue(formData, "range");
  const rawSort = getFormValue(formData, "sort");
  const from = getFormValue(formData, "from");
  const to = getFormValue(formData, "to");
  const employee = getFormValue(formData, "employee");
  let range = isRange(rawRange) ? rawRange : "all";
  const sort = isSort(rawSort) ? rawSort : "desc";

  if (range === "custom" && (!isDate(from) || !isDate(to) || from > to)) {
    range = "all";
  }

  params.set("range", range);

  if (range === "custom") {
    params.set("from", from);
    params.set("to", to);
  }

  if (isAdmin && employee && employee !== "all") {
    params.set("employee", employee);
  }

  if (sort !== "desc") {
    params.set("sort", sort);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function AttendanceHistoryFilter({
  employees,
  filters,
  isAdmin,
  pathname = "/history",
  persistentParams = {},
}: {
  employees: AttendanceHistoryEmployee[];
  filters: AttendanceHistoryFilters;
  isAdmin: boolean;
  pathname?: string;
  persistentParams?: Record<string, string>;
}) {
  const router = useRouter();
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydratedSnapshot,
    getServerHydrationSnapshot,
  );
  const [range, setRange] = useState<AttendanceHistoryRange>(filters.range);
  const [from, setFrom] = useState(filters.from);
  const [to, setTo] = useState(filters.to);
  const [isCustomDateOpen, setIsCustomDateOpen] = useState(
    filters.range === "custom",
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      buildFilterHref(
        new FormData(event.currentTarget),
        isAdmin,
        pathname,
        persistentParams,
      ),
      { scroll: false },
    );
  }

  return (
    <form
      autoComplete="off"
      className={`attendance-history-filter attendance-history-filter--${isAdmin ? "admin" : "viewer"}`}
      onSubmit={handleSubmit}
    >
      <div className="attendance-history-filter__range">
        <label>
          <span className="sr-only">기간</span>
          <select
            disabled={!isHydrated}
            name="range"
            value={range}
            onClick={() => {
              if (range === "custom") {
                setIsCustomDateOpen(true);
              }
            }}
            onChange={(event) => {
              const nextRange = isRange(event.target.value)
                ? event.target.value
                : "all";
              setRange(nextRange);
              setIsCustomDateOpen(nextRange === "custom");
            }}
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {range === "custom" ? (
          <AttendanceDateRangePopover
            disabled={!isHydrated}
            from={from}
            isOpen={isCustomDateOpen}
            to={to}
            onClose={() => setIsCustomDateOpen(false)}
            onFromChange={setFrom}
            onToChange={setTo}
          />
        ) : null}
      </div>
      {isAdmin ? (
        <label>
          <span className="sr-only">직원</span>
          <select
            disabled={!isHydrated}
            name="employee"
            defaultValue={filters.employee}
          >
            <option value="all">직원 전체</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.displayName}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        <span className="sr-only">정렬</span>
        <select
          disabled={!isHydrated}
          name="sort"
          defaultValue={filters.sort}
        >
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>
      </label>
      <div className="attendance-history-filter__actions">
        <Button
          variant="primary" size="small" profile="timetable"
          data-hydrated={isHydrated ? "true" : "false"}
          disabled={!isHydrated}
          type="submit"
        >
          적용
        </Button>
      </div>
    </form>
  );
}
