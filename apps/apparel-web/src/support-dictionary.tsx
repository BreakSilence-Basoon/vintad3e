'use client';

import { useMemo, useState } from 'react';
import {
  SortToggleButton,
  type SortDirection,
} from './sort-toggle-button';

export type SupportDictionaryCategory =
  | '재고'
  | '상품/옵션'
  | '티켓/판매'
  | '연동/전송'
  | '시스템/이력'
  | '매장/식음료'
  | '개발';

export type SupportDictionaryEntry = {
  category: SupportDictionaryCategory;
  term: string;
  meaning: string;
};

type SupportDictionaryProps = {
  entries: SupportDictionaryEntry[];
};

const tabItems: Array<SupportDictionaryCategory | '전체'> = [
  '전체',
  '재고',
  '상품/옵션',
  '티켓/판매',
  '연동/전송',
  '시스템/이력',
  '매장/식음료',
  '개발',
];

function normalizeSearchText(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ko-KR')
    .replace(/\s+/g, ' ');
}

function compactSearchText(value: string) {
  return normalizeSearchText(value).replace(/\s+/g, '');
}

function entryMatchesSearch(
  entry: SupportDictionaryEntry,
  normalizedQuery: string,
) {
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  if (queryTokens.length === 0) {
    return true;
  }

  const searchTargets = [entry.term, entry.category].flatMap((value) => [
    normalizeSearchText(value),
    compactSearchText(value),
  ]);

  return queryTokens.every((token) => {
    const compactToken = compactSearchText(token);

    return searchTargets.some(
      (target) => target.includes(token) || target.includes(compactToken),
    );
  });
}

function splitMeaningIntoLines(value: string) {
  return value
    .split(/(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SupportDictionary({ entries }: SupportDictionaryProps) {
  const [activeTab, setActiveTab] = useState<SupportDictionaryCategory | '전체'>(
    '전체',
  );
  const [query, setQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const normalizedQuery = normalizeSearchText(query);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((entry) => {
        const matchesTab = activeTab === '전체' || entry.category === activeTab;

        return matchesTab && entryMatchesSearch(entry, normalizedQuery);
      })
      .sort((left, right) => {
        const result = left.term.localeCompare(right.term, 'ko-KR', {
          numeric: true,
          sensitivity: 'base',
        });

        return sortDirection === 'asc' ? result : -result;
      });
  }, [activeTab, entries, normalizedQuery, sortDirection]);

  const tabCounts = useMemo(() => {
    const counts = new Map<SupportDictionaryCategory | '전체', number>();

    tabItems.forEach((tab) => counts.set(tab, 0));

    entries.forEach((entry) => {
      if (!entryMatchesSearch(entry, normalizedQuery)) {
        return;
      }

      counts.set('전체', (counts.get('전체') ?? 0) + 1);
      counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1);
    });

    return counts;
  }, [entries, normalizedQuery]);

  return (
    <section className="support-dictionary" aria-label="운영 용어 검색">
      <div className="support-search">
        <div className="support-search__control">
          <input
            id="support-dictionary-search"
            aria-label="용어 검색"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="모르는 용어의 의미를 검색해보세요!"
          />
        </div>
      </div>

      <div className="support-tabs" role="tablist" aria-label="용어 카테고리">
        {tabItems.map((tab) => {
          const isActive = activeTab === tab;
          const count = tabCounts.get(tab) ?? 0;

          return (
            <button
              key={tab}
              type="button"
              className={isActive ? 'is-active' : undefined}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab)}
            >
              <span>{tab}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </div>

      <div className="support-results">
        <table className="support-results__table">
          <thead>
            <tr>
              <th aria-sort={sortDirection === 'asc' ? 'ascending' : 'descending'}>
                <span className="support-results__sort-header">
                  <SortToggleButton
                    label="용어"
                    direction={sortDirection}
                    active
                    className="sort-toggle-button--table"
                    title={
                      sortDirection === 'asc'
                        ? '용어 내림차순으로 변경'
                        : '용어 오름차순으로 정렬'
                    }
                    onClick={() =>
                      setSortDirection((current) =>
                        current === 'asc' ? 'desc' : 'asc',
                      )
                    }
                  />
                </span>
              </th>
              <th>
                <span className="support-results__heading">의미</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length > 0 ? (
              filteredEntries.map((entry) => {
                const meaningLines = splitMeaningIntoLines(entry.meaning);

                return (
                  <tr key={`${entry.category}:${entry.term}`}>
                    <td>{entry.term}</td>
                    <td>
                      <span className="support-results__meaning-lines">
                        {meaningLines.map((line, index) => (
                          <span key={`${entry.category}:${entry.term}:${index}`}>
                            {line}
                          </span>
                        ))}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={2}>
                  검색 결과가 없습니다, 다른 표현으로 다시 찾아보세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
