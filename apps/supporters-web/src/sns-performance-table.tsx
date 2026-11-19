'use client';

import { Button } from '@vintad3e/ui/components';
import { Fragment, useMemo, useState } from 'react';
import { RegisterToggle } from './sns-fixture-register';
import {
  SortToggleButton,
  type SortDirection,
} from './sort-toggle-button';

export type SnsPerformanceReport = {
  id: string;
  postType?: string | null;
  postedAt: string | null;
  createdAt: string;
  updatedAt?: string | null;
  postAccount?: string | null;
  postUrl?: string | null;
  note?: string | null;
  views?: number | null;
  accountsReached?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  isRegistered?: boolean;
};

type SnsPerformancePlatform = 'instagram' | 'tiktok';

type SnsPerformanceSortKey =
  | 'postedAt'
  | 'postScore'
  | 'postType'
  | 'note'
  | 'accountsReached'
  | 'views'
  | 'likes'
  | 'comments'
  | 'shares'
  | 'saves';

type SnsPerformanceColumn = {
  key: SnsPerformanceSortKey;
  label: string;
  defaultDirection: SortDirection;
  sortable?: boolean;
};

type SnsPerformanceTableProps = {
  platform: SnsPerformancePlatform;
  reports: SnsPerformanceReport[];
  isOfficial: boolean;
  loadError: string | null;
  readOnly?: boolean;
};

type SortState = {
  key: SnsPerformanceSortKey;
  direction: SortDirection;
};

const POST_TYPE_LABEL: Record<string, string> = {
  FEED: '이미지',
  VIDEO: '비디오',
  REELS: '릴스',
  CAROUSEL: '앨범',
  STORY: '스토리',
};

const instagramColumns: SnsPerformanceColumn[] = [
  { key: 'postedAt', label: '게시일', defaultDirection: 'desc' },
  { key: 'postType', label: '종류', defaultDirection: 'asc' },
  { key: 'accountsReached', label: '도달', defaultDirection: 'desc' },
  { key: 'views', label: '조회', defaultDirection: 'desc' },
  { key: 'likes', label: '좋아요', defaultDirection: 'desc' },
  { key: 'comments', label: '댓글', defaultDirection: 'desc' },
  { key: 'shares', label: '공유', defaultDirection: 'desc' },
  { key: 'saves', label: '저장', defaultDirection: 'desc' },
];

const tiktokColumns: SnsPerformanceColumn[] = [
  { key: 'postedAt', label: '게시일', defaultDirection: 'desc' },
  { key: 'note', label: '제목', defaultDirection: 'asc' },
  { key: 'views', label: '조회', defaultDirection: 'desc' },
  { key: 'likes', label: '좋아요', defaultDirection: 'desc' },
  { key: 'comments', label: '댓글', defaultDirection: 'desc' },
  { key: 'shares', label: '공유', defaultDirection: 'desc' },
];

const SNS_REPORT_PAGE_SIZE = 20;

const num = (value: number | null | undefined) =>
  typeof value === 'number' ? value.toLocaleString() : '—';

function StatisticsIcon() {
  return (
    <svg className="gtm-sns-score-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 20.5h12M4.5 18V12m4 6V7m4 11V4" />
      <circle cx="17" cy="17" r="5.5" fill="var(--surface-strong)" />
      <path d="M17 17V11.5a5.5 5.5 0 0 1 5.17 7.38Z" fill="currentColor" stroke="none" />
      <path d="M17 17l5.17 1.88a5.5 5.5 0 0 1-9.93 0.87Z" fill="currentColor" fillOpacity="0.45" stroke="none" />
    </svg>
  );
}

function postScoreValue(report: SnsPerformanceReport): number | null {
  if (typeof report.views !== 'number' || !Number.isFinite(report.views)) return null;
  if (report.views < 500) return 0;
  const metric = (value: number | null | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return ((40 * metric(report.shares) + 30 * metric(report.saves) +
    15 * metric(report.comments) + 2 * metric(report.likes) +
    metric(report.accountsReached)) / report.views);
}

function postScore(report: SnsPerformanceReport) {
  return postScoreValue(report)?.toFixed(2) ?? '—';
}

function fmtDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}/${part('month')}/${part('day')}`;
}

function getPostTypeLabel(value: string | null | undefined) {
  if (!value) return '—';
  return POST_TYPE_LABEL[value] ?? value;
}

function getDateValue(report: SnsPerformanceReport) {
  const raw = report.postedAt ?? report.createdAt;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? null : time;
}

function getNumberValue(
  report: SnsPerformanceReport,
  key: SnsPerformanceSortKey,
) {
  if (key === 'postScore') return postScoreValue(report);
  const value = report[key as keyof SnsPerformanceReport];
  return typeof value === 'number' ? value : null;
}

function getTextValue(
  report: SnsPerformanceReport,
  key: SnsPerformanceSortKey,
) {
  const value =
    key === 'postType'
      ? report.postType
        ? getPostTypeLabel(report.postType)
        : null
      : report[key as keyof SnsPerformanceReport];

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function compareNullable<T>(
  leftValue: T | null,
  rightValue: T | null,
  direction: SortDirection,
  compare: (left: T, right: T) => number,
) {
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return 1;
  if (rightValue === null) return -1;

  const result = compare(leftValue, rightValue);
  return direction === 'asc' ? result : -result;
}

function compareReports(
  left: SnsPerformanceReport & { order: number },
  right: SnsPerformanceReport & { order: number },
  sortState: SortState,
) {
  const { key, direction } = sortState;
  let result = 0;

  if (key === 'postedAt') {
    result = compareNullable(
      getDateValue(left),
      getDateValue(right),
      direction,
      (leftValue, rightValue) => leftValue - rightValue,
    );
  } else if (
    key === 'postScore' ||
    key === 'accountsReached' ||
    key === 'views' ||
    key === 'likes' ||
    key === 'comments' ||
    key === 'shares' ||
    key === 'saves'
  ) {
    result = compareNullable(
      getNumberValue(left, key),
      getNumberValue(right, key),
      direction,
      (leftValue, rightValue) => leftValue - rightValue,
    );
  } else {
    result = compareNullable(
      getTextValue(left, key),
      getTextValue(right, key),
      direction,
      (leftValue, rightValue) =>
        leftValue.localeCompare(rightValue, 'ko-KR', {
          numeric: true,
          sensitivity: 'base',
        }),
    );
  }

  return result === 0 ? left.order - right.order : result;
}

function getAriaSort(
  key: SnsPerformanceSortKey,
  sortState: SortState,
) {
  if (key !== sortState.key) {
    return undefined;
  }

  return sortState.direction === 'asc' ? 'ascending' : 'descending';
}

function getSortTitle(
  column: SnsPerformanceColumn,
  sortState: SortState,
) {
  const nextDirection =
    sortState.key !== column.key
      ? column.defaultDirection
      : sortState.direction === 'asc'
        ? 'desc'
        : 'asc';

  return nextDirection === 'asc'
    ? `${column.label} 오름차순으로 정렬`
    : `${column.label} 내림차순으로 정렬`;
}

function getCellClassName(column: SnsPerformanceColumn) {
  switch (column.key) {
    case 'postedAt':
      return 'gtm-sns-performance-table__date';
    case 'postType':
      return 'gtm-sns-performance-table__media';
    case 'note':
      return 'gtm-sns-performance-table__title';
    default:
      return 'gtm-sns-performance-table__metric';
  }
}

function renderPostLink(
  href: string | null | undefined,
  label: string,
  className: string,
) {
  if (!href) {
    return label;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {label}
    </a>
  );
}

function renderCellContent(
  report: SnsPerformanceReport,
  column: SnsPerformanceColumn,
) {
  switch (column.key) {
    case 'postScore':
      return postScore(report);
    case 'postedAt':
      return fmtDate(report.postedAt);
    case 'postType':
      return renderPostLink(
        report.postUrl,
        getPostTypeLabel(report.postType),
        'gtm-sns-performance-table__media-link',
      );
    case 'note':
      return renderPostLink(
        report.postUrl,
        report.note || '—',
        'gtm-sns-performance-table__title-link',
      );
    default:
      return num(report[column.key]);
  }
}

export function SnsPerformanceTable({
  platform,
  reports,
  isOfficial,
  loadError,
  readOnly = false,
}: SnsPerformanceTableProps) {
  const columns = platform === 'instagram' ? instagramColumns : tiktokColumns;
  const [sortState, setSortState] = useState<SortState>({
    key: 'postedAt',
    direction: 'desc',
  });
  const [visibleCount, setVisibleCount] = useState(SNS_REPORT_PAGE_SIZE);
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  const sortedReports = useMemo(
    () =>
      reports
        .map((report, order) => ({ ...report, order }))
        .sort((left, right) => compareReports(left, right, sortState)),
    [reports, sortState],
  );

  const safeVisibleCount = Math.min(visibleCount, sortedReports.length);
  const visibleReports = sortedReports.slice(0, safeVisibleCount);
  const hasMoreReports = safeVisibleCount < sortedReports.length;

  function toggleSort(column: SnsPerformanceColumn) {
    if (column.sortable === false) {
      return;
    }

    if (sortState.key !== column.key) {
      setSortState({
        key: column.key,
        direction: column.defaultDirection,
      });
      return;
    }

    setSortState({
      key: column.key,
      direction: sortState.direction === 'asc' ? 'desc' : 'asc',
    });
  }

  function showMoreReports() {
    setVisibleCount((currentCount) =>
      Math.min(currentCount + SNS_REPORT_PAGE_SIZE, sortedReports.length),
    );
  }

  return (
    <div className="gtm-sns-performance-table-stack">
      <div
        className={`online-prep-table gtm-sns-performance-table gtm-sns-performance-table--${platform}`}
        data-metrics-expanded={metricsExpanded}
        role="table"
        aria-label={`${platform === 'instagram' ? 'Instagram' : 'TikTok'} 게시물 성과`}
      >
      <div className="online-prep-table__head" role="row">
        {columns.map((column, index) => (
          <Fragment key={column.key}>
          {index === 2 && (
            <span className="gtm-sns-score-column" role="columnheader" aria-sort={getAriaSort('postScore', sortState)}>
              <button type="button" className="gtm-sns-score-toggle" aria-expanded={metricsExpanded} aria-label={metricsExpanded ? '통계 접기' : '통계 펼치기'} onClick={() => setMetricsExpanded((open) => !open)}>
                <StatisticsIcon />
              </button>
              <button type="button" className={`gtm-sns-score-desktop gtm-sns-score-sort sort-toggle-button--table${sortState.key === 'postScore' ? ' is-active' : ''}`} aria-label={sortState.key === 'postScore' && sortState.direction === 'desc' ? '게시물 점수 오름차순으로 정렬' : '게시물 점수 내림차순으로 정렬'} aria-pressed={sortState.key === 'postScore'} onClick={() => toggleSort({ key: 'postScore', label: '게시물 점수', defaultDirection: 'desc' })}>
                <StatisticsIcon />
                <svg className="gtm-sns-score-sort-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  {sortState.key === 'postScore' && sortState.direction === 'asc' ? <path d="M8 3.2 3.8 7.4l1.1 1.1 2.3-2.3v6.6h1.6V6.2l2.3 2.3 1.1-1.1L8 3.2Z" /> : <path d="m8 12.8 4.2-4.2-1.1-1.1-2.3 2.3V3.2H7.2v6.6L4.9 7.5 3.8 8.6 8 12.8Z" />}
                </svg>
              </button>
            </span>
          )}
          <span
            className={index >= 2 ? 'gtm-sns-stat-column' : undefined}
            role="columnheader"
            aria-sort={
              column.sortable === false
                ? undefined
                : getAriaSort(column.key, sortState)
            }
          >
            {column.sortable === false ? (
              column.label
            ) : (
              <SortToggleButton
                label={column.label}
                direction={
                  sortState.key === column.key
                    ? sortState.direction
                    : column.defaultDirection
                }
                active={sortState.key === column.key}
                className="sort-toggle-button--table online-prep-table__sort"
                title={getSortTitle(column, sortState)}
                onClick={() => toggleSort(column)}
              />
            )}
          </span>
          </Fragment>
        ))}
        <span role="columnheader">{isOfficial ? '집계' : '등록'}</span>
      </div>
      <div className="online-prep-table__body" role="rowgroup">
        {sortedReports.length === 0 ? (
          <div
            className="online-prep-table__empty gtm-sns-performance-table__empty"
            role="row"
          >
            <div className="gtm-sns-performance-table__empty-cell" role="cell">
              <strong>
                {loadError
                  ? '성과 데이터를 불러올 수 없습니다.'
                  : '아직 수집된 게시물이 없습니다.'}
              </strong>
              <p>
                {loadError ??
                  (platform === 'instagram'
                    ? '게시물을 등록하면 공식 API로 성과가 자동 집계됩니다.'
                    : '계정 연결 후 게시물이 동기화되면 표시됩니다.')}
              </p>
            </div>
          </div>
        ) : (
          visibleReports.map((report) => (
            <article
              key={report.id}
              className={`online-prep-table__row gtm-sns-performance-table__row${isOfficial && report.isRegistered ? ' is-registered' : ''}`}
              role="row"
            >
              {columns.map((column, index) => (
                <Fragment key={column.key}>
                {index === 2 && (
                  <span className="gtm-sns-score-column" role="cell">
                    <button type="button" className="gtm-sns-score-value" aria-expanded={metricsExpanded} aria-label={`게시물 점수 ${postScore(report)}, 통계 ${metricsExpanded ? '접기' : '펼치기'}`} onClick={() => setMetricsExpanded((open) => !open)}><span>{postScore(report)}</span><span className="gtm-sns-score-color" aria-hidden="true">{postScore(report)}</span></button>
                    <span className="gtm-sns-score-desktop"><span>{postScore(report)}</span><span className="gtm-sns-score-color" aria-hidden="true">{postScore(report)}</span></span>
                  </span>
                )}
                <span
                  className={`${getCellClassName(column)}${index >= 2 ? ' gtm-sns-stat-column' : ''}`}
                  role="cell"
                  title={column.key === 'note' ? report.note ?? undefined : undefined}
                >
                  {renderCellContent(report, column)}
                </span>
                </Fragment>
              ))}
              <span className="gtm-sns-performance-table__action" role="cell">
                {isOfficial ? (
                  <span className="status-pill status-pill--live">자동</span>
                ) : (
                  <RegisterToggle
                    reportId={report.id}
                    registered={Boolean(report.isRegistered)}
                    readOnly={readOnly}
                  />
                )}
              </span>
            </article>
          ))
        )}
      </div>
      </div>
      {hasMoreReports ? (
        <nav
          className="load-more-pager gtm-sns-performance-table__pager"
          aria-label={`${platform === 'instagram' ? 'Instagram' : 'TikTok'} 게시물 더 불러오기`}
        >
          <span>
            {safeVisibleCount} / {sortedReports.length}
          </span>
          <Button
            variant="ghost" size="small"
            type="button"
            onClick={showMoreReports}
          >
            더 불러오기
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
