'use client';
import { Fragment, useState } from 'react';
import { SortToggleButton, type SortDirection } from './sort-toggle-button';

type Column = { key: string; label: string; defaultDirection: SortDirection };
const instagram: Column[] = [
  { key: 'postedAt', label: '게시일', defaultDirection: 'desc' }, { key: 'postType', label: '종류', defaultDirection: 'asc' },
  { key: 'accountsReached', label: '도달', defaultDirection: 'desc' }, { key: 'views', label: '조회', defaultDirection: 'desc' },
  { key: 'likes', label: '좋아요', defaultDirection: 'desc' }, { key: 'comments', label: '댓글', defaultDirection: 'desc' },
  { key: 'shares', label: '공유', defaultDirection: 'desc' }, { key: 'saves', label: '저장', defaultDirection: 'desc' },
];
const tiktok: Column[] = [
  { key: 'postedAt', label: '게시일', defaultDirection: 'desc' }, { key: 'note', label: '제목', defaultDirection: 'asc' },
  { key: 'views', label: '조회', defaultDirection: 'desc' }, { key: 'likes', label: '좋아요', defaultDirection: 'desc' },
  { key: 'comments', label: '댓글', defaultDirection: 'desc' }, { key: 'shares', label: '공유', defaultDirection: 'desc' },
];
function StatisticsIcon() {
  return <svg className="gtm-sns-score-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 20.5h12M4.5 18V12m4 6V7m4 11V4" /><circle cx="17" cy="17" r="5.5" fill="var(--surface-strong)" /><path d="M17 17V11.5a5.5 5.5 0 0 1 5.17 7.38Z" fill="currentColor" stroke="none" /><path d="M17 17l5.17 1.88a5.5 5.5 0 0 1-9.93 0.87Z" fill="currentColor" fillOpacity="0.45" stroke="none" /></svg>;
}
export function SnsFixtureTable({ platform }: { platform: 'instagram' | 'tiktok' }) {
  const columns = platform === 'instagram' ? instagram : tiktok;
  const [sort, setSort] = useState<{ key: string; direction: SortDirection }>({ key: 'postedAt', direction: 'desc' });
  const [expanded, setExpanded] = useState(false);
  function toggle(column: Column) {
    setSort(current => ({ key: column.key, direction: current.key !== column.key ? column.defaultDirection : current.direction === 'asc' ? 'desc' : 'asc' }));
  }
  const ariaSort = (key: string) => key !== sort.key ? undefined : sort.direction === 'asc' ? 'ascending' as const : 'descending' as const;
  return <div className="gtm-sns-performance-table-stack"><div className={`online-prep-table gtm-sns-performance-table gtm-sns-performance-table--${platform}`} data-metrics-expanded={expanded} role="table" aria-label={`${platform === 'instagram' ? 'Instagram' : 'TikTok'} 게시물 성과`}>
    <div className="online-prep-table__head" role="row">{columns.map((column, index) => <Fragment key={column.key}>
      {index === 2 && <span className="gtm-sns-score-column" role="columnheader" aria-sort={ariaSort('postScore')}>
        <button type="button" className="gtm-sns-score-toggle" aria-expanded={expanded} aria-label={expanded ? '통계 접기' : '통계 펼치기'} onClick={() => setExpanded(open => !open)}><StatisticsIcon /></button>
        <button type="button" className={`gtm-sns-score-desktop gtm-sns-score-sort sort-toggle-button--table${sort.key === 'postScore' ? ' is-active' : ''}`} aria-label={sort.key === 'postScore' && sort.direction === 'desc' ? '게시물 점수 오름차순으로 정렬' : '게시물 점수 내림차순으로 정렬'} aria-pressed={sort.key === 'postScore'} onClick={() => toggle({ key: 'postScore', label: '게시물 점수', defaultDirection: 'desc' })}><StatisticsIcon /><svg className="gtm-sns-score-sort-arrow" viewBox="0 0 16 16" aria-hidden="true" focusable="false">{sort.key === 'postScore' && sort.direction === 'asc' ? <path d="M8 3.2 3.8 7.4l1.1 1.1 2.3-2.3v6.6h1.6V6.2l2.3 2.3 1.1-1.1L8 3.2Z" /> : <path d="m8 12.8 4.2-4.2-1.1-1.1-2.3 2.3V3.2H7.2v6.6L4.9 7.5 3.8 8.6 8 12.8Z" />}</svg></button>
      </span>}
      <span className={index >= 2 ? 'gtm-sns-stat-column' : undefined} role="columnheader" aria-sort={ariaSort(column.key)}><SortToggleButton label={column.label} direction={sort.key === column.key ? sort.direction : column.defaultDirection} active={sort.key === column.key} className="sort-toggle-button--table online-prep-table__sort" title={`${column.label} ${sort.key !== column.key ? column.defaultDirection === 'asc' ? '오름차순' : '내림차순' : sort.direction === 'asc' ? '내림차순' : '오름차순'}으로 정렬`} onClick={() => toggle(column)} /></span>
    </Fragment>)}<span role="columnheader">등록</span></div>
    <div className="online-prep-table__body" role="rowgroup"><div className="online-prep-table__empty gtm-sns-performance-table__empty" role="row"><div className="gtm-sns-performance-table__empty-cell" role="cell"><strong>아직 수집된 게시물이 없습니다.</strong><p>{platform === 'instagram' ? '게시물을 등록하면 공식 API로 성과가 자동 집계됩니다.' : '계정 연결 후 게시물이 동기화되면 표시됩니다.'}</p></div></div></div>
  </div></div>;
}
