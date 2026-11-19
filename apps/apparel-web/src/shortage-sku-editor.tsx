'use client';
import { adminErrorMessage } from './admin-error-message';
import { showAdminToast } from './admin-toast';
import { fixtureInventoryRequest } from './shortage-fixture-request';
type HomeReauthRowDraft = { rowId: string; draft: Record<'onHandQty' | 'targetQty' | 'shortageQty' | 'workQty', string>; updatedAt: string | null };
import { compareTrackedFirst } from './tracked-first-sort';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {
  SortToggleButton,
  type SortDirection,
} from './sort-toggle-button';

export type ShortageEditorRow = {
  id: string;
  productNameKo: string;
  seriesLabel: string;
  skuId: string;
  skuCode: string;
  skuNameKo: string;
  optionSummary: string | null;
  apparelType: string | null;
  apparelTarget: 'UNISEX' | 'WOMEN' | 'MEN' | null;
  color: string | null;
  size: string | null;
  locationId: string;
  locationNameKo: string;
  stockTargetId: string | null;
  targetQty: number | null;
  onHandQty: number;
  shortageQty: number;
  workQty?: number;
  isShortageChecked: boolean;
  tracksInventory: boolean;
  locationCode: string;
  updatedAt: Date | string | null;
};

type ShortageSkuEditorProps = {
  rows: ShortageEditorRow[];
  mode: 'shortage-detail' | 'graphic-detail';
  canEdit?: boolean;
  activeTab?: ShortageEditorTabKey;
  disableTabFilter?: boolean;
  onActiveTabChange?: (tab: ShortageEditorTabKey) => void;
  showTabs?: boolean;
  showLocationColumn?: boolean;
  workQuantityMode?: boolean;
  onRowsChange?: (rows: ShortageEditorRow[]) => void;
  /** Input kept across a reauthentication. Read once, when this editor mounts. */
  restoredDrafts?: readonly HomeReauthRowDraft[];
};

export type ShortageSkuEditorHandle = {
  saveAll: () => Promise<boolean>;
  hasDirtyRows: () => boolean;
  getDirtyRowLabels: () => string[];
  getDirtyDrafts: () => HomeReauthRowDraft[];
};

export type ShortageEditorTabKey = 'shortage' | 'normal' | 'all';
export type LocationEditorTabKey = 'seongsu' | 'hanam' | 'all';
type GraphicSortKey =
  | 'apparelType'
  | 'color'
  | 'locationNameKo'
  | 'size'
  | 'onHandQty'
  | 'targetQty'
  | 'shortageQty'
  | 'workQty';

type GraphicSortState = {
  key: GraphicSortKey;
  direction: SortDirection;
} | null;

type DraftState = {
  onHandQty: string;
  targetQty: string;
  targetEdited?: boolean;
  shortageQty: string;
  workQty: string;
};

type SkuOptionParts = {
  apparelType: string;
  color: string;
  size: string;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function serializeUpdatedAt(value: Date | string | null) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
}

function getFallbackOptionLabel(row: ShortageEditorRow) {
  const displaySize = row.apparelTarget === 'WOMEN' ? '여성' : row.size;
  return [row.apparelType, row.color, displaySize]
    .map((token) => token?.trim())
    .filter((token): token is string => Boolean(token))
    .join(' - ');
}

function getSkuNameWithoutProduct(row: ShortageEditorRow) {
  const skuName = row.skuNameKo.trim();
  const productName = row.productNameKo.trim();

  if (!skuName) {
    return '';
  }

  const productPrefix = `${productName} - `;

  if (productName && skuName.startsWith(productPrefix)) {
    return skuName.slice(productPrefix.length).trim();
  }

  return skuName;
}

function applyApparelTargetDisplay(label: string, row: ShortageEditorRow) {
  if (row.apparelTarget !== 'WOMEN') {
    return label;
  }

  const parts = label
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return [...parts.slice(0, -1), '여성'].join(' - ');
  }

  return getFallbackOptionLabel(row) || label;
}

function splitOptionName(row: ShortageEditorRow) {
  return getSkuNameWithoutProduct(row)
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSkuOptionParts(row: ShortageEditorRow): SkuOptionParts {
  const optionParts = splitOptionName(row);
  const apparelType = row.apparelType?.trim() || optionParts[0] || '-';
  const color = row.color?.trim() || optionParts[1] || '-';
  const parsedSize =
    optionParts.length >= 3 ? optionParts.slice(2).join(' - ') : '';
  const rawSize = row.size?.trim() || parsedSize || '-';
  const size = row.apparelTarget === 'WOMEN' ? '여성' : rawSize;

  return {
    apparelType,
    color,
    size,
  };
}

function getSkuLabel(row: ShortageEditorRow) {
  const optionName = getSkuNameWithoutProduct(row);

  if (optionName) {
    return applyApparelTargetDisplay(optionName, row);
  }

  return getFallbackOptionLabel(row) || row.skuCode;
}

function isInventoryTracked(row: ShortageEditorRow) {
  return row.tracksInventory !== false;
}

function rowMatchesTab(row: ShortageEditorRow, tab: ShortageEditorTabKey) {
  if (tab === 'all') {
    return true;
  }

  const hasShortage = isInventoryTracked(row) && row.shortageQty > 0;

  return tab === 'shortage' ? hasShortage : !hasShortage;
}

export function ShortageSkuTabs({
  activeTab,
  shortageCount,
  unmarkedCount,
  totalCount,
  showAll = true,
  onTabChange,
}: {
  activeTab: ShortageEditorTabKey;
  shortageCount: number;
  unmarkedCount: number;
  totalCount: number;
  showAll?: boolean;
  onTabChange: (tab: ShortageEditorTabKey) => void;
}) {
  return (
    <div className="graphic-tabs" role="tablist" aria-label="부족 재고 탭">
      <button
        type="button"
        className={activeTab === 'shortage' ? 'is-active' : undefined}
        onClick={() => onTabChange('shortage')}
        role="tab"
        aria-selected={activeTab === 'shortage'}
      >
        부족 {formatNumber(shortageCount)}
      </button>
      <button
        type="button"
        className={activeTab === 'normal' ? 'is-active' : undefined}
        onClick={() => onTabChange('normal')}
        role="tab"
        aria-selected={activeTab === 'normal'}
      >
        부족하지 않음 {formatNumber(unmarkedCount)}
      </button>
      {showAll ? (
        <button
          type="button"
          className={activeTab === 'all' ? 'is-active' : undefined}
          onClick={() => onTabChange('all')}
          role="tab"
          aria-selected={activeTab === 'all'}
        >
          전체 {formatNumber(totalCount)}
        </button>
      ) : null}
    </div>
  );
}

export function LocationSkuTabs({
  activeTab,
  hanamCount,
  seongsuCount,
  totalCount,
  onTabChange,
}: {
  activeTab: LocationEditorTabKey;
  hanamCount: number;
  seongsuCount: number;
  totalCount: number;
  onTabChange: (tab: LocationEditorTabKey) => void;
}) {
  return (
    <div className="graphic-tabs" role="tablist" aria-label="재고 위치 탭">
      <button
        type="button"
        className={activeTab === 'seongsu' ? 'is-active' : undefined}
        onClick={() => onTabChange('seongsu')}
        role="tab"
        aria-selected={activeTab === 'seongsu'}
      >
        성수 {formatNumber(seongsuCount)}
      </button>
      <button
        type="button"
        className={activeTab === 'hanam' ? 'is-active' : undefined}
        onClick={() => onTabChange('hanam')}
        role="tab"
        aria-selected={activeTab === 'hanam'}
      >
        하남 {formatNumber(hanamCount)}
      </button>
      <button
        type="button"
        className={activeTab === 'all' ? 'is-active' : undefined}
        onClick={() => onTabChange('all')}
        role="tab"
        aria-selected={activeTab === 'all'}
      >
        전체 {formatNumber(totalCount)}
      </button>
    </div>
  );
}

function parseDraftNumber(value: string | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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

function numbersMatch(left: string, right: number) {
  const parsed = Number(left);

  return Number.isFinite(parsed) && parsed === right;
}

function getDraftForRow(
  row: ShortageEditorRow,
  drafts: Record<string, DraftState>,
) {
  return drafts[row.id] ?? {
    onHandQty: String(row.onHandQty),
    targetQty: String(row.targetQty ?? 0),
    shortageQty: String(row.shortageQty),
    workQty: String(row.workQty ?? 0),
  };
}

function getTrackingToggleKey(skuCode: string, locationCode: string) {
  return `${skuCode}:${locationCode}`;
}

function applyInventoryTrackingState(
  rows: ShortageEditorRow[],
  skuCode: string,
  locationCode: string,
  tracksInventory: boolean,
) {
  return rows.map((row) =>
    row.skuCode === skuCode && row.locationCode === locationCode
      ? {
          ...row,
          tracksInventory,
          targetQty: tracksInventory ? row.targetQty : 0,
          shortageQty: tracksInventory ? row.shortageQty : 0,
          isShortageChecked: tracksInventory && row.shortageQty > 0,
        }
      : row,
  );
}

function applyInventoryTrackingDrafts(
  drafts: Record<string, DraftState>,
  rows: ShortageEditorRow[],
  skuCode: string,
  locationCode: string,
  tracksInventory: boolean,
) {
  const nextDrafts = { ...drafts };

  for (const row of rows) {
    if (row.skuCode !== skuCode || row.locationCode !== locationCode) {
      continue;
    }

    const currentDraft = getDraftForRow(row, nextDrafts);

    nextDrafts[row.id] = {
      ...currentDraft,
      targetQty: tracksInventory ? currentDraft.targetQty : '0',
      shortageQty: tracksInventory ? currentDraft.shortageQty : '0',
    };
  }

  return nextDrafts;
}

function compareGraphicRows(
  left: ShortageEditorRow,
  right: ShortageEditorRow,
  sortState: NonNullable<GraphicSortState>,
  drafts: Record<string, DraftState>,
) {
  return compareTrackedFirst(
    left,
    right,
    isInventoryTracked,
    (leftRow, rightRow) => compareGraphicRowsByKey(leftRow, rightRow, sortState.key, drafts),
    sortState.direction,
  );
}

function compareGraphicRowsByKey(
  left: ShortageEditorRow,
  right: ShortageEditorRow,
  sortKey: GraphicSortKey,
  drafts: Record<string, DraftState>,
) {
  const leftParts = getSkuOptionParts(left);
  const rightParts = getSkuOptionParts(right);
  const leftDraft = drafts[left.id];
  const rightDraft = drafts[right.id];
  let result = 0;

  switch (sortKey) {
    case 'apparelType':
      result = compareText(leftParts.apparelType, rightParts.apparelType);
      break;
    case 'color':
      result = compareText(leftParts.color, rightParts.color);
      break;
    case 'size':
      result = compareText(leftParts.size, rightParts.size);
      break;
    case 'locationNameKo':
      result = compareText(left.locationNameKo, right.locationNameKo);
      break;
    case 'onHandQty':
      result = compareNumber(
        parseDraftNumber(leftDraft?.onHandQty, left.onHandQty),
        parseDraftNumber(rightDraft?.onHandQty, right.onHandQty),
      );
      break;
    case 'targetQty':
      result = compareNumber(
        parseDraftNumber(leftDraft?.targetQty, left.targetQty ?? left.onHandQty),
        parseDraftNumber(rightDraft?.targetQty, right.targetQty ?? right.onHandQty),
      );
      break;
    case 'shortageQty':
      result = compareNumber(
        parseDraftNumber(leftDraft?.shortageQty, left.shortageQty),
        parseDraftNumber(rightDraft?.shortageQty, right.shortageQty),
      );
      break;
    case 'workQty':
      result = compareNumber(
        parseDraftNumber(leftDraft?.workQty, left.workQty ?? 0),
        parseDraftNumber(rightDraft?.workQty, right.workQty ?? 0),
      );
      break;
  }

  if (result === 0) {
    result = compareText(getSkuLabel(left), getSkuLabel(right));
  }

  return result;
}

export const ShortageSkuEditor = forwardRef<
  ShortageSkuEditorHandle,
  ShortageSkuEditorProps
>(function ShortageSkuEditor(
  {
    rows: initialRows,
    mode,
    canEdit = true,
    activeTab: controlledActiveTab,
    disableTabFilter = false,
    onActiveTabChange,
    showTabs = true,
    showLocationColumn: showLocationColumnProp = false,
    workQuantityMode = false,
    onRowsChange,
    restoredDrafts,
  },
  ref,
) {
  const [internalActiveTab, setInternalActiveTab] =
    useState<ShortageEditorTabKey>('shortage');
  const [rows, setRows] = useState(() =>
    initialRows.map((row) => {
      const restored = restoredDrafts?.find((item) => item.rowId === row.id);
      return restored ? { ...row, updatedAt: restored.updatedAt } : row;
    }),
  );
  const [drafts, setDrafts] = useState<Record<string, DraftState>>(() =>
    Object.fromEntries(
      initialRows.map((row) => [
        row.id,
        restoredDrafts?.find((item) => item.rowId === row.id)?.draft ?? {
          onHandQty: String(Math.max(row.onHandQty, 0)),
          targetQty: String(Math.max(row.targetQty ?? 0, 0)),
          shortageQty: String(Math.max(row.shortageQty, 0)),
          workQty: String(Math.max(row.workQty ?? 0, 0)),
        },
      ]),
    ),
  );
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [graphicSort, setGraphicSort] = useState<GraphicSortState>(null);
  const [savingTrackingSkuCodes, setSavingTrackingSkuCodes] = useState<Set<string>>(
    () => new Set(),
  );
  const [touchedRowIds, setTouchedRowIds] = useState<Set<string>>(
    () =>
      new Set(
        initialRows
          .filter((row) => restoredDrafts?.some((item) => item.rowId === row.id))
          .map((row) => row.id),
      ),
  );
  const isGraphicDetail = mode === 'graphic-detail';
  const activeTab = controlledActiveTab ?? internalActiveTab;
  const shortageCount = rows.filter(
    (row) => isInventoryTracked(row) && row.shortageQty > 0,
  ).length;
  const unmarkedCount = rows.length - shortageCount;
  const visibleRows = disableTabFilter
    ? rows
    : rows.filter((row) => rowMatchesTab(row, activeTab));
  const effectiveGraphicSort = graphicSort;
  const sortedVisibleRows =
    isGraphicDetail
      ? [...visibleRows].sort((left, right) =>
          effectiveGraphicSort
            ? compareGraphicRows(
                left,
                right,
                effectiveGraphicSort,
                drafts,
              )
            : compareRowsByDefaultGraphicOrder(left, right),
        )
      : visibleRows;
  const hasMultipleVisibleLocations =
    isGraphicDetail &&
    new Set(sortedVisibleRows.map((row) => row.locationCode)).size > 1;
  const showLocationColumn = isGraphicDetail && showLocationColumnProp;
  const showInlineLocation =
    hasMultipleVisibleLocations && !showLocationColumn;

  useEffect(() => {
    if (touchedRowIds.size > 0) {
      return;
    }

    setRows(initialRows);
    setDrafts(
      Object.fromEntries(
        initialRows.map((row) => [
          row.id,
          {
            onHandQty: String(Math.max(row.onHandQty, 0)),
            targetQty: String(Math.max(row.targetQty ?? 0, 0)),
            shortageQty: String(Math.max(row.shortageQty, 0)),
            workQty: String(Math.max(row.workQty ?? 0, 0)),
          },
        ]),
      ),
    );
  }, [initialRows, touchedRowIds.size]);

  function notifyRow(message: string, tone: 'success' | 'error') {
    showAdminToast(message, tone);
  }

  function updateDraft(rowId: string, patch: Partial<DraftState>) {
    setTouchedRowIds((current) => {
      const next = new Set(current);
      next.add(rowId);
      return next;
    });
    setDrafts((current) => ({
      ...current,
      [rowId]: {
        onHandQty: current[rowId]?.onHandQty ?? '0',
        targetQty: current[rowId]?.targetQty ?? '0',
        targetEdited: current[rowId]?.targetEdited ?? false,
        shortageQty: current[rowId]?.shortageQty ?? '0',
        workQty: current[rowId]?.workQty ?? '0',
        ...patch,
      },
    }));
  }

  function changeTab(nextTab: ShortageEditorTabKey) {
    if (onActiveTabChange) {
      onActiveTabChange(nextTab);
      return;
    }

    setInternalActiveTab(nextTab);
  }

  async function toggleInventoryTracking(
    row: ShortageEditorRow,
    tracksInventory: boolean,
  ) {
    if (!canEdit || workQuantityMode) {
      return;
    }

    const toggleKey = getTrackingToggleKey(row.skuCode, row.locationCode);

    setSavingTrackingSkuCodes((current) => {
      const next = new Set(current);
      next.add(toggleKey);
      return next;
    });

    try {
      const response = await fixtureInventoryRequest('/api/admin/skus/inventory-tracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skuCode: row.skuCode,
          locationCode: row.locationCode,
          tracksInventory,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        sku?: {
          skuCode?: string;
          tracksInventory?: boolean;
        };
        stockTarget?: {
          locationCode?: string;
          tracksInventory?: boolean;
        };
      };
      const savedTracksInventory =
        payload.stockTarget?.tracksInventory ?? payload.sku?.tracksInventory;

      if (!response.ok || savedTracksInventory === undefined) {
        throw new Error(
          payload.message ?? '재고추적 설정을 저장하지 못했습니다.',
        );
      }

      const nextRows = applyInventoryTrackingState(
        rows,
        row.skuCode,
        row.locationCode,
        savedTracksInventory,
      );

      setRows(nextRows);
      setDrafts((current) =>
        applyInventoryTrackingDrafts(
          current,
          nextRows,
          row.skuCode,
          row.locationCode,
          savedTracksInventory,
        ),
      );
      setTouchedRowIds((current) => {
        const next = new Set(current);

        for (const item of nextRows) {
          if (
            item.skuCode === row.skuCode &&
            item.locationCode === row.locationCode
          ) {
            next.delete(item.id);
          }
        }

        return next;
      });
      onRowsChange?.(nextRows);
      notifyRow(
        payload.message ??
          `재고추적이 ${savedTracksInventory ? 'ON' : 'OFF'}으로 저장되었습니다.`,
        'success',
      );
    } catch (error) {
      notifyRow(
        adminErrorMessage(error, '재고추적 설정을 저장하지 못했습니다.'),
        'error',
      );
    } finally {
      setSavingTrackingSkuCodes((current) => {
        const next = new Set(current);
        next.delete(toggleKey);
        return next;
      });
    }
  }

  function isRowDirty(row: ShortageEditorRow) {
    return isStockDirty(row);
  }

  function isStockDirty(row: ShortageEditorRow) {
    if (!touchedRowIds.has(row.id)) {
      return false;
    }

    const draft = getDraftForRow(row, drafts);
    const targetQty = row.targetQty ?? 0;
    const inventoryTracked = isInventoryTracked(row);

    if (workQuantityMode) {
      return !numbersMatch(draft.workQty, row.workQty ?? 0);
    }

    return (
      !numbersMatch(draft.onHandQty, row.onHandQty) ||
      (inventoryTracked &&
        (!numbersMatch(draft.targetQty, targetQty) ||
          !numbersMatch(draft.shortageQty, row.shortageQty)))
    );
  }

  function compareRowsByOptionLabel(left: ShortageEditorRow, right: ShortageEditorRow) {
    const leftParts = getSkuOptionParts(left);
    const rightParts = getSkuOptionParts(right);

    return (
      compareText(leftParts.apparelType, rightParts.apparelType) ||
      compareText(leftParts.color, rightParts.color) ||
      compareText(leftParts.size, rightParts.size) ||
      compareText(getSkuLabel(left), getSkuLabel(right))
    );
  }

  function compareRowsByDefaultGraphicOrder(
    left: ShortageEditorRow,
    right: ShortageEditorRow,
  ) {
    const trackingResult =
      Number(isInventoryTracked(right)) - Number(isInventoryTracked(left));

    return trackingResult || compareRowsByOptionLabel(left, right);
  }

  async function saveRow(row: ShortageEditorRow) {
    const draft = getDraftForRow(row, drafts);
    const inventoryTracked = isInventoryTracked(row);
    const parsedWorkQty = Number(draft.workQty);
    const parsedOnHandQty = Number(draft.onHandQty);
    const parsedTargetQty = inventoryTracked ? Number(draft.targetQty) : 0;
    const parsedShortageQty = inventoryTracked ? Number(draft.shortageQty) : 0;


    if (workQuantityMode) {
      if (!Number.isFinite(parsedWorkQty) || parsedWorkQty < 0) {
        notifyRow(
          '작업수량은 0 이상의 숫자만 입력할 수 있습니다.',
          'error',
        );
        return false;
      }

      setSavingRowId(row.id);

      try {
        const response = await fixtureInventoryRequest('/api/admin/seongsu-work-quantities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'save',
            stockTargetId: row.stockTargetId,
            skuId: row.skuId,
            locationId: row.locationId,
            expectedStockTargetUpdatedAt: serializeUpdatedAt(row.updatedAt),
            workQty: parsedWorkQty,
          }),
        });
        const payload = (await response.json()) as {
          message?: string;
          row?: Pick<ShortageEditorRow, 'stockTargetId' | 'workQty' | 'updatedAt'>;
        };

        if (!response.ok || !payload.row) {
          throw new Error(payload.message ?? '작업수량을 저장하지 못했습니다.');
        }

        const savedRow = payload.row;
        const savedRowId = savedRow.stockTargetId ?? row.id;

        setRows((current) => {
          const nextRows = current.map((item) =>
            item.id === row.id ||
            (item.skuId === row.skuId && item.locationId === row.locationId)
              ? {
                  ...item,
                  stockTargetId: savedRow.stockTargetId ?? item.stockTargetId,
                  workQty: savedRow.workQty ?? 0,
                  updatedAt: savedRow.updatedAt ?? item.updatedAt,
                  id: savedRowId,
                }
              : item,
          );

          onRowsChange?.(nextRows);

          return nextRows;
        });
        setDrafts((current) => {
          const next = { ...current };
          delete next[row.id];
          next[savedRowId] = {
            onHandQty: draft.onHandQty,
            targetQty: draft.targetQty,
            shortageQty: draft.shortageQty,
            workQty: String(savedRow.workQty ?? 0),
          };
          return next;
        });
        setTouchedRowIds((current) => {
          const next = new Set(current);
          next.delete(row.id);
          next.delete(savedRowId);
          return next;
        });
        notifyRow(payload.message ?? '작업수량을 저장했습니다.', 'success');
        return true;
      } catch (error) {
        notifyRow(
          adminErrorMessage(error, '작업수량을 저장하지 못했습니다.'),
          'error',
        );
        return false;
      } finally {
        setSavingRowId(null);
      }
    }

    if (!Number.isFinite(parsedOnHandQty) || parsedOnHandQty < 0) {
      notifyRow('현재 수량은 0 이상의 숫자만 입력할 수 있습니다.', 'error');
      return false;
    }

    if (
      inventoryTracked &&
      (!Number.isFinite(parsedTargetQty) || parsedTargetQty < 0)
    ) {
      notifyRow('목표재고는 0 이상의 숫자만 입력할 수 있습니다.', 'error');
      return false;
    }

    if (
      inventoryTracked &&
      (!Number.isFinite(parsedShortageQty) || parsedShortageQty < 0)
    ) {
      notifyRow('부족 수량은 0 이상의 숫자만 입력할 수 있습니다.', 'error');
      return false;
    }

    if (
      inventoryTracked &&
      parsedTargetQty > 0 &&
      parsedShortageQty > parsedTargetQty
    ) {
      notifyRow('부족 수량은 목표재고보다 클 수 없습니다.', 'error');
      return false;
    }

    const expectedShortageQty = Math.max(parsedTargetQty - parsedOnHandQty, 0);

    if (
      inventoryTracked &&
      parsedTargetQty > 0 &&
      Math.abs(expectedShortageQty - parsedShortageQty) > 0.000001
    ) {
      notifyRow(
        '부족 수량은 목표재고와 현재 수량 기준으로 계산된 값이어야 합니다.',
        'error',
      );
      return false;
    }

    setSavingRowId(row.id);

    try {
      const response = await fixtureInventoryRequest('/api/admin/stock-target-shortage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            stockTargetId: row.stockTargetId,
            skuId: row.skuId,
            skuCode: row.skuCode,
            locationId: row.locationId,
            locationCode: row.locationCode,
            onHandQty: parsedOnHandQty,
            targetQty: row.targetQty === null && !draft.targetEdited
              ? null
              : parsedTargetQty,
            shortageQty: parsedShortageQty,
            expectedStockTargetUpdatedAt: serializeUpdatedAt(row.updatedAt),
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        row?: Pick<
          ShortageEditorRow,
          | 'stockTargetId'
          | 'targetQty'
          | 'onHandQty'
          | 'shortageQty'
          | 'isShortageChecked'
          | 'updatedAt'
        >;
      };

      if (!response.ok || !payload.row) {
        throw new Error(payload.message ?? '부족 재고를 저장하지 못했습니다.');
      }

      const savedRow = payload.row;

      setRows((current) => {
        const nextRows = current.map((item) =>
          item.id === row.id
            ? {
                ...item,
                ...savedRow,
                id: savedRow.stockTargetId ?? item.id,
              }
            : item,
        );

        onRowsChange?.(nextRows);

        return nextRows;
      });
      setDrafts((current) => ({
        ...current,
        [savedRow.stockTargetId ?? row.id]: {
          onHandQty: String(savedRow.onHandQty),
          targetQty: String(savedRow.targetQty ?? 0),
          shortageQty: String(savedRow.shortageQty),
          workQty: String(row.workQty ?? 0),
        },
      }));
      setTouchedRowIds((current) => {
        const next = new Set(current);
        next.delete(row.id);
        next.delete(savedRow.stockTargetId ?? row.id);
        return next;
      });
      notifyRow(
        payload.message ?? '저장했습니다.',
        'success',
      );

      if (activeTab === 'normal' && savedRow.shortageQty > 0) {
        changeTab('shortage');
      }
      return true;
    } catch (error) {
      notifyRow(
        adminErrorMessage(error, '부족 재고를 저장하지 못했습니다.'),
        'error',
      );
      return false;
    } finally {
      setSavingRowId(null);
    }
  }

  async function saveAllRows() {
    if (!canEdit) {
      return true;
    }

    const dirtyRows = rows.filter((row) => isRowDirty(row));
    for (const row of dirtyRows) {
      const saved = await saveRow(row);

      if (!saved) {
        return false;
      }

    }

    return true;
  }

  useImperativeHandle(ref, () => ({
    saveAll: saveAllRows,
    hasDirtyRows: () => rows.some((row) => isRowDirty(row)),
    getDirtyRowLabels: () =>
      rows
        .filter((row) => isRowDirty(row))
        .sort(compareRowsByOptionLabel)
        .map((row) => getSkuLabel(row)),
    getDirtyDrafts: () =>
      rows
        .filter((row) => isRowDirty(row))
        .map((row) => ({
          rowId: row.id,
          draft: getDraftForRow(row, drafts),
          updatedAt: serializeUpdatedAt(row.updatedAt),
        })),
  }));

  function getNextGraphicSort(key: GraphicSortKey): GraphicSortState {
    if (graphicSort?.key !== key) {
      return {
        key,
        direction: 'asc',
      };
    }

    return {
      key,
      direction: graphicSort.direction === 'asc' ? 'desc' : 'asc',
    };
  }

  function renderSortableHeader(label: string, key: GraphicSortKey) {
    const direction =
      effectiveGraphicSort?.key === key ? effectiveGraphicSort.direction : 'asc';

    return (
      <span className="shortage-table__sort-header">
        <SortToggleButton
          label={label}
          direction={direction}
          active={effectiveGraphicSort?.key === key}
          className="sort-toggle-button--table"
          title={
            effectiveGraphicSort?.key === key &&
            effectiveGraphicSort.direction === 'asc'
              ? `${label} 내림차순으로 변경`
              : `${label} 오름차순으로 정렬`
          }
          onClick={() => setGraphicSort(getNextGraphicSort(key))}
        />
      </span>
    );
  }

  const hasDirtyRows = rows.some((row) => isRowDirty(row));

  return (
    <section
      className="shortage-editor"
      data-admin-dirty={hasDirtyRows ? 'true' : 'false'}
    >
      {showTabs ? (
        <div className="shortage-editor__top">
          <ShortageSkuTabs
            activeTab={activeTab}
            shortageCount={shortageCount}
            unmarkedCount={unmarkedCount}
            totalCount={rows.length}
            showAll={mode === 'graphic-detail'}
            onTabChange={changeTab}
          />
        </div>
      ) : null}

      <div
        className={`shortage-table${
          isGraphicDetail ? ' shortage-table--graphic' : ''
        }${
          showLocationColumn ? ' shortage-table--with-location' : ''
        }${
          workQuantityMode ? ' shortage-table--work-quantity' : ''
        } shortage-table--with-target`}
        role="table"
        aria-label="옵션 품목 부족 재고"
      >
        <div className="shortage-table__head" role="row">
          {isGraphicDetail ? (
            <>
              {renderSortableHeader('형태', 'apparelType')}
              {renderSortableHeader('색상', 'color')}
              {renderSortableHeader('사이즈', 'size')}
              {showLocationColumn
                ? renderSortableHeader('재고 위치', 'locationNameKo')
                : null}
            </>
          ) : (
            <span>품목</span>
          )}
          {isGraphicDetail && !workQuantityMode ? <span>재고추적</span> : null}
          {isGraphicDetail ? (
            renderSortableHeader('현재고', 'onHandQty')
          ) : (
            <span>현재고</span>
          )}
          {isGraphicDetail ? (
            renderSortableHeader('목표재고', 'targetQty')
          ) : (
            <span>목표재고</span>
          )}
          {isGraphicDetail ? (
            renderSortableHeader('부족수량', 'shortageQty')
          ) : (
            <span>부족수량</span>
          )}
          {workQuantityMode
            ? renderSortableHeader('하남 작업수량', 'workQty')
            : null}
          <span>저장</span>
        </div>
        <div className="shortage-table__body" role="rowgroup">
          {sortedVisibleRows.length === 0 ? (
            <div className="shortage-table__empty">
              표시할 항목이 없습니다.
            </div>
          ) : (
            sortedVisibleRows.map((row) => {
              const optionParts = getSkuOptionParts(row);
              const draft = getDraftForRow(row, drafts);
              const inventoryTracked = isInventoryTracked(row);
              const draftShortageQty = Number(draft.shortageQty);
              const draftTargetQty = Number(draft.targetQty);
              const isSavingTracking = savingTrackingSkuCodes.has(
                getTrackingToggleKey(row.skuCode, row.locationCode),
              );
              const hasShortage =
                inventoryTracked &&
                Number.isFinite(draftShortageQty) &&
                draftShortageQty > 0;
              const isTargetManaged =
                inventoryTracked &&
                Number.isFinite(draftTargetQty) &&
                draftTargetQty > 0;

              return (
                <article key={row.id} className="shortage-table__row" role="row">
                  {isGraphicDetail ? (
                    <>
                      <span className="shortage-table__option-cell">
                        {optionParts.apparelType}
                      </span>
                      <span className="shortage-table__option-cell">
                        {optionParts.color}
                      </span>
                      <span className="shortage-table__option-cell">
                        {optionParts.size}
                        {showInlineLocation ? (
                          <small className="shortage-table__location-chip">
                            {row.locationNameKo}
                          </small>
                        ) : null}
                      </span>
                      {showLocationColumn ? (
                        <span className="shortage-table__option-cell shortage-table__location-cell">
                          {row.locationNameKo}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <div className="shortage-table__product">
                      <>
                        <strong>{row.productNameKo}</strong>
                        <span>{getSkuLabel(row)}</span>
                        <small>
                          {row.skuCode} · {row.seriesLabel} · {row.locationNameKo}
                        </small>
                      </>
                    </div>
                  )}
                  {isGraphicDetail && !workQuantityMode ? (
                    <div className="shortage-table__tracking" role="cell">
                      <label className="inventory-tracking-toggle">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={inventoryTracked}
                          aria-checked={inventoryTracked}
                          aria-label={`${getSkuLabel(row)} 재고추적`}
                          disabled={!canEdit || isSavingTracking}
                          onChange={(event) =>
                            void toggleInventoryTracking(
                              row,
                              event.target.checked,
                            )
                          }
                        />
                        <span
                          className="inventory-tracking-toggle__switch"
                          aria-hidden="true"
                        />
                        <span className="inventory-tracking-toggle__label">
                          {inventoryTracked ? 'ON' : 'OFF'}
                        </span>
                      </label>
                    </div>
                  ) : null}
                  <label
                    className={`shortage-table__input${
                      workQuantityMode ? ' shortage-table__input--readonly' : ''
                    }`}
                  >
                    <span className="sr-only">현재고</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.onHandQty}
                      readOnly={workQuantityMode}
                      aria-readonly={workQuantityMode}
                      disabled={!workQuantityMode && !canEdit}
                      onChange={
                        workQuantityMode
                          ? undefined
                          : (event) => {
                          const nextOnHandQty = Number(event.target.value);
                          const currentTargetQty = Number(draft.targetQty);
                          const nextShortageQty =
                            inventoryTracked &&
                            currentTargetQty > 0 &&
                            Number.isFinite(currentTargetQty) &&
                            Number.isFinite(nextOnHandQty)
                              ? Math.max(currentTargetQty - nextOnHandQty, 0)
                              : Number(draft.shortageQty);

                          updateDraft(row.id, {
                            onHandQty: event.target.value,
                            shortageQty: Number.isFinite(nextShortageQty)
                              ? String(nextShortageQty)
                              : draft.shortageQty,
                          });
                        }
                      }
                    />
                  </label>
                  <label
                    className={`shortage-table__input${
                      isTargetManaged ? ' shortage-table__input--target-managed' : ''
                    }${
                      inventoryTracked ? '' : ' shortage-table__input--disabled'
                    }${
                      workQuantityMode ? ' shortage-table__input--readonly' : ''
                    }`}
                  >
                    <span className="sr-only">목표재고</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.targetQty}
                      readOnly={workQuantityMode}
                      aria-readonly={workQuantityMode}
                      disabled={!workQuantityMode && (!canEdit || !inventoryTracked)}
                      onChange={
                        workQuantityMode
                          ? undefined
                          : (event) => {
                          const nextTargetQty = Number(event.target.value);
                          const currentOnHandQty = Number(draft.onHandQty);
                          const nextShortageQty =
                            nextTargetQty > 0 &&
                            Number.isFinite(nextTargetQty) &&
                            Number.isFinite(currentOnHandQty)
                              ? Math.max(nextTargetQty - currentOnHandQty, 0)
                              : Number(draft.shortageQty);

                          updateDraft(row.id, {
                            targetQty: event.target.value,
                            targetEdited: true,
                            shortageQty: Number.isFinite(nextShortageQty)
                              ? String(nextShortageQty)
                              : draft.shortageQty,
                          });
                        }
                      }
                    />
                  </label>
                  <label
                    className={`shortage-table__input${
                      hasShortage ? ' shortage-table__input--shortage' : ''
                    }${
                      inventoryTracked ? '' : ' shortage-table__input--disabled'
                    }${
                      workQuantityMode ? ' shortage-table__input--readonly' : ''
                    }`}
                  >
                    <span className="sr-only">부족수량</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draft.shortageQty}
                      readOnly={workQuantityMode}
                      aria-readonly={workQuantityMode}
                      disabled={!workQuantityMode && (!canEdit || !inventoryTracked)}
                      onChange={
                        workQuantityMode
                          ? undefined
                          : (event) =>
                          updateDraft(row.id, {
                            shortageQty: event.target.value,
                          })
                      }
                    />
                  </label>
                  {workQuantityMode ? (
                    <label
                      className={`shortage-table__input shortage-table__input--work${
                        Number(draft.workQty) > 0 ? ' is-active' : ''
                      }`}
                    >
                      <span className="sr-only">하남 작업수량</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={draft.workQty}
                        disabled={!canEdit || savingRowId === row.id}
                        onChange={(event) =>
                          updateDraft(row.id, {
                            workQty: event.target.value,
                          })
                        }
                      />
                    </label>
                  ) : null}
                  <div className="shortage-table__action">
                    {canEdit ? (
                      <button
                        type="button"
                        className="shortage-save-button"
                        disabled={savingRowId === row.id}
                        onClick={() => void saveRow(row)}
                        aria-label={`${getSkuLabel(row)} ${
                          workQuantityMode ? '하남 작업수량 저장' : '저장'
                        }`}
                        title={workQuantityMode ? '하남 작업수량 저장' : '저장'}
                      >
                        {savingRowId === row.id ? (
                          <span className="shortage-save-button__busy" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            focusable="false"
                          >
                            <path d="M5 3.5h11.1L20.5 8v12.5H3.5v-17H5Zm1.5 2v5h9v-5h-9Zm11 13v-8.7l-2.8-2.8H14v5H5.5v6.5h2.3v-4.2h8.4v4.2h1.3Zm-8.2 0h5.4v-2.7H9.3v2.7Z" />
                          </svg>
                        )}
                      </button>
                    ) : (
                      <span className="status-pill status-pill--default">
                        읽기 전용
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
});
