'use client';

import { useMemo, useState } from 'react';
import type { ShortageEditorRow } from './shortage-sku-editor';
import {
  SortToggleButton,
  type SortDirection,
} from './sort-toggle-button';
import {
  getSkuOptionAliasSearchText,
  getSkuSearchTerms,
  normalizeSkuAliasSearchText,
} from './dashboard-search';
import { getSignatureColorAliasSearchText } from './dashboard-search';

export type InventoryTrackingPanelRow = ShortageEditorRow;

type InventoryTrackingPanelProps = {
  rows: InventoryTrackingPanelRow[];
};

type DraftState = {
  onHandQty: string;
  targetQty: string;
  shortageQty: string;
};

type ProductSignatureSearchContext = {
  colors: string[];
  seriesLabel: string | null;
};

type SortKey =
  | 'optionLabel'
  | 'locationNameKo'
  | 'onHandQty'
  | 'targetQty'
  | 'shortageQty';

type SortState = {
  key: SortKey;
  direction: SortDirection;
};

const DEFAULT_SORT: SortState = {
  key: 'optionLabel',
  direction: 'asc',
};

function compareText(left: string, right: string) {
  return left.localeCompare(right, 'ko-KR', {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareNumber(left: number, right: number) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function parseDraftNumber(value: string | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDraftForRow(
  row: InventoryTrackingPanelRow,
  drafts: Record<string, DraftState>,
) {
  return drafts[row.id] ?? {
    onHandQty: String(Math.max(row.onHandQty, 0)),
    targetQty: String(Math.max(row.targetQty ?? 0, 0)),
    shortageQty: String(Math.max(row.shortageQty, 0)),
  };
}

function getOptionLabel(row: InventoryTrackingPanelRow) {
  const displaySize = row.apparelTarget === 'WOMEN' ? '여성' : row.size;
  const parts = [row.apparelType, row.color, displaySize]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (parts.length > 0) {
    return parts.join(' / ');
  }

  if (row.optionSummary?.trim()) {
    return row.optionSummary.trim();
  }

  const productPrefix = `${row.productNameKo} - `;

  return row.skuNameKo.startsWith(productPrefix)
    ? row.skuNameKo.slice(productPrefix.length).trim()
    : row.skuNameKo;
}

function normalizeSearchText(value: string) {
  return normalizeSkuAliasSearchText(value);
}

function getProductSignatureSearchContexts(rows: InventoryTrackingPanelRow[]) {
  const contexts = new Map<string, ProductSignatureSearchContext>();

  for (const row of rows) {
    const context = contexts.get(row.productNameKo) ?? {
      colors: [],
      seriesLabel: null,
    };

    if (row.color?.trim()) {
      context.colors.push(row.color.trim());
    }

    if (!context.seriesLabel && row.seriesLabel) {
      context.seriesLabel = row.seriesLabel;
    }

    contexts.set(row.productNameKo, context);
  }

  return contexts;
}

function getSearchHaystack(
  row: InventoryTrackingPanelRow,
  signatureContext: ProductSignatureSearchContext | undefined,
) {
  return [
    getOptionLabel(row),
    getSkuOptionAliasSearchText(getOptionLabel(row)),
    row.optionSummary,
    row.apparelType,
    getSkuOptionAliasSearchText(row.apparelType),
    row.color,
    getSkuOptionAliasSearchText(row.color),
    getSignatureColorAliasSearchText({
      candidateColors: signatureContext?.colors,
      color: row.color,
      productName: row.productNameKo,
      seriesLabel: signatureContext?.seriesLabel ?? row.seriesLabel,
    }),
    row.size,
    row.apparelTarget === 'WOMEN'
      ? '여성 여성전용 여성용 여성복 여자 여자옷 여자사이즈 women'
      : null,
    row.locationNameKo,
    row.locationCode,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeSearchText(value))
    .join(' ');
}

function getNextSortState(current: SortState, key: SortKey): SortState {
  if (current.key !== key) {
    return {
      key,
      direction:
        key === 'locationNameKo' || key === 'optionLabel' ? 'asc' : 'desc',
    };
  }

  return {
    key,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function compareRows(
  left: InventoryTrackingPanelRow,
  right: InventoryTrackingPanelRow,
  sortState: SortState,
  drafts: Record<string, DraftState>,
) {
  const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;
  const leftDraft = getDraftForRow(left, drafts);
  const rightDraft = getDraftForRow(right, drafts);
  let result = 0;

  switch (sortState.key) {
    case 'optionLabel':
      result = compareText(getOptionLabel(left), getOptionLabel(right));
      break;
    case 'locationNameKo':
      result = compareText(left.locationNameKo, right.locationNameKo);
      break;
    case 'onHandQty':
      result = compareNumber(
        parseDraftNumber(leftDraft.onHandQty, left.onHandQty),
        parseDraftNumber(rightDraft.onHandQty, right.onHandQty),
      );
      break;
    case 'targetQty':
      result = compareNumber(
        parseDraftNumber(leftDraft.targetQty, left.targetQty ?? 0),
        parseDraftNumber(rightDraft.targetQty, right.targetQty ?? 0),
      );
      break;
    case 'shortageQty':
      result = compareNumber(
        parseDraftNumber(leftDraft.shortageQty, left.shortageQty),
        parseDraftNumber(rightDraft.shortageQty, right.shortageQty),
      );
      break;
  }

  if (result === 0) {
    result =
      compareText(getOptionLabel(left), getOptionLabel(right)) ||
      compareText(left.locationNameKo, right.locationNameKo) ||
      compareText(left.skuCode, right.skuCode);
  }

  return result * directionMultiplier;
}

export function InventoryTrackingPanel({
  rows: initialRows,
}: InventoryTrackingPanelProps) {
  const rows = initialRows;
  const [keyword, setKeyword] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);
  const drafts = useMemo<Record<string, DraftState>>(
    () =>
      Object.fromEntries(
        initialRows.map((row) => [
          row.id,
          {
            onHandQty: String(Math.max(row.onHandQty, 0)),
            targetQty: String(Math.max(row.targetQty ?? 0, 0)),
            shortageQty: String(Math.max(row.shortageQty, 0)),
          },
        ]),
      ),
    [initialRows],
  );

  const targetRows = useMemo(
    () =>
      rows.filter(
        (row) => row.tracksInventory !== false && (row.targetQty ?? 0) >= 1,
      ),
    [rows],
  );
  const productOptions = useMemo(
    () =>
      [...new Set(targetRows.map((row) => row.productNameKo))]
        .filter(Boolean)
        .sort(compareText),
    [targetRows],
  );
  const visibleRows = useMemo(() => {
    const searchTerms = getSkuSearchTerms(keyword);
    const signatureContexts = getProductSignatureSearchContexts(rows);

    if (!selectedProductName) {
      return [];
    }

    return targetRows
      .filter((row) => row.productNameKo === selectedProductName)
      .filter((row) =>
        searchTerms.length > 0
          ? searchTerms.every((term) =>
              getSearchHaystack(
                row,
                signatureContexts.get(row.productNameKo),
              ).includes(term),
            )
          : true,
      )
      .sort((left, right) => compareRows(left, right, sortState, drafts));
  }, [drafts, keyword, rows, selectedProductName, sortState, targetRows]);

  function preserveScroll(callback: () => void) {
    const left = window.scrollX;
    const top = window.scrollY;

    callback();
    window.requestAnimationFrame(() => {
      window.scrollTo(left, top);
      window.requestAnimationFrame(() => window.scrollTo(left, top));
    });
  }

  function renderSortableHeader(label: string, key: SortKey) {
    const direction = sortState.key === key ? sortState.direction : 'asc';

    return (
      <SortToggleButton
        label={label}
        direction={direction}
        active={sortState.key === key}
        className="sort-toggle-button--table online-prep-table__sort inventory-tracking-table__sort"
        title={
          sortState.key === key && sortState.direction === 'asc'
            ? `${label} 내림차순으로 변경`
            : `${label} 오름차순으로 정렬`
        }
        onClick={() => setSortState(getNextSortState(sortState, key))}
      />
    );
  }

  return (
    <article className="dashboard-panel inventory-tracking-panel">
      <div className="dashboard-panel__header">
        <h2>목표재고 추적표</h2>
      </div>

      <div className="inventory-tracking-toolbar">
        <select
          value={selectedProductName}
          onChange={(event) =>
            preserveScroll(() => {
              const nextProductName = event.target.value;

              setSelectedProductName(nextProductName);
              setKeyword('');
            })
          }
          aria-label="디자인 필터"
          className="inventory-tracking-toolbar__select"
        >
          <option value="">디자인 선택</option>
          {productOptions.map((productName) => (
            <option key={productName} value={productName}>
              {productName}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={keyword}
          disabled={!selectedProductName}
          onChange={(event) =>
            preserveScroll(() => setKeyword(event.target.value))
          }
          placeholder={
            selectedProductName
              ? '옵션명 또는 재고 위치를 키워드로 입력하여 검색할 수 있습니다!'
              : '조회할 디자인을 선택 후 키워드를 입력하세요'
          }
          aria-label="목표재고 추적표 키워드"
          className="inventory-tracking-toolbar__search"
        />
      </div>

      <div
        className="online-prep-table inventory-tracking-table"
        role="table"
        aria-label="목표재고 추적 SKU"
      >
        <div
          className="online-prep-table__head inventory-tracking-table__head"
          role="row"
        >
          <span>{renderSortableHeader('옵션명', 'optionLabel')}</span>
          <span>{renderSortableHeader('재고 위치', 'locationNameKo')}</span>
          <span>{renderSortableHeader('현재고', 'onHandQty')}</span>
          <span>{renderSortableHeader('목표재고', 'targetQty')}</span>
          <span>{renderSortableHeader('부족수량', 'shortageQty')}</span>
        </div>
        <div className="online-prep-table__body" role="rowgroup">
          {visibleRows.length === 0 ? (
            <div className="online-prep-table__empty inventory-tracking-table__empty">
              <p className="inventory-tracking-table__empty-message">
                목표재고가 1 이상인 옵션 품목 중 검색 조건에 맞는 것이
                없습니다
              </p>
            </div>
          ) : (
            visibleRows.map((row) => {
              const draft = getDraftForRow(row, drafts);
              const parsedTargetQty = Number(draft.targetQty);
              const parsedShortageQty = Number(draft.shortageQty);

              return (
                <article
                  key={row.id}
                  className="online-prep-table__row inventory-tracking-table__row"
                  role="row"
                >
                  <span className="inventory-tracking-table__option" role="cell">
                    {getOptionLabel(row)}
                  </span>
                  <span className="inventory-tracking-table__location" role="cell">
                    {row.locationNameKo}
                  </span>
                  <label
                    className="shortage-table__input shortage-table__input--readonly"
                    role="cell"
                  >
                    <span className="sr-only">현재고</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={draft.onHandQty}
                      readOnly
                      aria-readonly="true"
                    />
                  </label>
                  <label
                    className={`shortage-table__input${
                      parsedTargetQty >= 1
                        ? ' shortage-table__input--target-managed'
                        : ''
                    } shortage-table__input--readonly`}
                    role="cell"
                  >
                    <span className="sr-only">목표재고</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={draft.targetQty}
                      readOnly
                      aria-readonly="true"
                    />
                  </label>
                  <label
                    className={`shortage-table__input${
                      parsedShortageQty >= 1
                        ? ' shortage-table__input--shortage'
                        : ''
                    } shortage-table__input--readonly`}
                    role="cell"
                  >
                    <span className="sr-only">부족수량</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={draft.shortageQty}
                      readOnly
                      aria-readonly="true"
                    />
                  </label>
                </article>
              );
            })
          )}
        </div>
      </div>
    </article>
  );
}
