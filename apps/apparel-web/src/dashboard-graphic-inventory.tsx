'use client';
import { Button } from '@vintad3e/ui/components';
import Image from 'next/image';
import { adminErrorMessage } from './admin-error-message';
import { fixtureDashboardRequest } from './dashboard-fixture-request';
import { showAdminToast } from './admin-toast';
import { GRAPHIC_IMAGE_BY_PRODUCT_CODE } from './dashboard-images';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  HOME_REAUTH_EVENT,
  saveHomeReauthState,
  takeHomeReauthState,
  type HomeReauthRowDraft,
} from './dashboard-reauth';
import { createPortal } from 'react-dom';
import {
  ShortageSkuTabs,
  ShortageSkuEditor,
  type ShortageEditorTabKey,
  type ShortageSkuEditorHandle,
  type ShortageEditorRow,
} from './shortage-sku-editor';
import {
  SortToggleButton,
  type SortDirection,
} from './sort-toggle-button';

export type GraphicInventoryHomeGroup = {
  productId: string;
  productCode: string;
  productNameKo: string;
  seriesLabel: string;
  isHidden: boolean;
  skuCount: number;
  managedSkuCount: number;
  shortageSkuCount: number;
  shortageQtyTotal: number;
  untrackedOnHandSkuCount: number;
  untrackedOnHandQtyTotal: number;
  onHandQtyTotal: number;
  targetQtyTotal: number;
  rows: ShortageEditorRow[];
};

type GraphicInventoryHomeProps = {
  draftOwner: string | null;
  groups: GraphicInventoryHomeGroup[];
  isAdmin: boolean;
};

type TabKey = 'artist' | 'original' | 'collab' | 'hidden';
type SortKey = 'name' | 'shortage';
type SortState = {
  key: SortKey;
  direction: SortDirection;
};

type ToastState = {
  tone: 'success' | 'error';
  text: string;
};

type WorkTransferResponseRow = Pick<
  ShortageEditorRow,
  | 'isShortageChecked'
  | 'locationId'
  | 'onHandQty'
  | 'shortageQty'
  | 'skuId'
  | 'stockTargetId'
  | 'targetQty'
  | 'updatedAt'
  | 'workQty'
>;

const DEFAULT_SORT: SortState = {
  key: 'shortage',
  direction: 'desc',
};

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function sortGroups(groups: GraphicInventoryHomeGroup[], sortState: SortState) {
  return [...groups].sort((left, right) => {
    const directionMultiplier = sortState.direction === 'asc' ? 1 : -1;

    if (sortState.key === 'name') {
      const nameCompare = left.productNameKo.localeCompare(
        right.productNameKo,
        'ko-KR',
      );

      if (nameCompare !== 0) {
        return nameCompare * directionMultiplier;
      }

      return right.shortageQtyTotal - left.shortageQtyTotal;
    }

    if (left.shortageQtyTotal !== right.shortageQtyTotal) {
      return (left.shortageQtyTotal - right.shortageQtyTotal) * directionMultiplier;
    }

    return left.productNameKo.localeCompare(right.productNameKo, 'ko-KR');
  });
}

function getNextSortState(current: SortState, key: SortKey): SortState {
  if (current.key !== key) {
    return {
      key,
      direction: key === 'name' ? 'asc' : 'desc',
    };
  }

  return {
    key,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function getSeriesTab(group: GraphicInventoryHomeGroup): Exclude<TabKey, 'hidden'> {
  if (group.seriesLabel.includes('작가')) {
    return 'collab';
  }

  return group.seriesLabel.includes('아티스트') ? 'artist' : 'original';
}

function getRowTotals(rows: ShortageEditorRow[]) {
  const seongsuRows = rows.filter((row) => row.locationCode === 'seongsu_store');
  const trackedRows = seongsuRows.filter((row) => row.tracksInventory);
  const shortageRows = trackedRows.filter((row) => row.shortageQty > 0);
  const untrackedOnHandRows = seongsuRows.filter(
    (row) => !row.tracksInventory && row.onHandQty > 0,
  );

  return {
    skuCount: seongsuRows.length,
    managedSkuCount: trackedRows.filter((row) => (row.targetQty ?? 0) > 0)
      .length,
    shortageSkuCount: shortageRows.length,
    shortageQtyTotal: shortageRows.reduce(
      (sum, row) => sum + Math.max(row.shortageQty, 0),
      0,
    ),
    untrackedOnHandSkuCount: untrackedOnHandRows.length,
    untrackedOnHandQtyTotal: untrackedOnHandRows.reduce(
      (sum, row) => sum + Math.max(row.onHandQty, 0),
      0,
    ),
    onHandQtyTotal: seongsuRows.reduce((sum, row) => sum + row.onHandQty, 0),
    targetQtyTotal: trackedRows.reduce(
      (sum, row) => sum + (row.targetQty ?? 0),
      0,
    ),
  };
}

function getSeongsuRows(rows: ShortageEditorRow[]) {
  return rows.filter((row) => row.locationCode === 'seongsu_store');
}

function rowHasShortage(row: ShortageEditorRow) {
  return row.tracksInventory && row.shortageQty > 0;
}

function getRowsForShortageTab(
  rows: ShortageEditorRow[],
  tab: ShortageEditorTabKey,
) {
  if (tab === 'all') {
    return rows;
  }

  return rows.filter((row) =>
    tab === 'shortage' ? rowHasShortage(row) : !rowHasShortage(row),
  );
}

function getShortageTabCounts(rows: ShortageEditorRow[]) {
  const shortageCount = rows.filter(rowHasShortage).length;

  return {
    shortage: shortageCount,
    normal: rows.length - shortageCount,
    total: rows.length,
  };
}

function findUpdatedRow(
  row: ShortageEditorRow,
  updatedRows: ShortageEditorRow[],
) {
  return updatedRows.find(
    (updatedRow) =>
      updatedRow.id === row.id ||
      (updatedRow.skuId === row.skuId &&
        updatedRow.locationId === row.locationId),
  );
}

function getGraphicDisplayName(
  group: Pick<GraphicInventoryHomeGroup, 'productCode' | 'productNameKo'>,
) {
  return group.productNameKo;
}

export function GraphicInventoryHome({
  draftOwner,
  groups: initialGroups,
  isAdmin,
}: GraphicInventoryHomeProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('artist');
  const [sortState, setSortState] = useState<SortState>(DEFAULT_SORT);
  const [groups, setGroups] = useState(initialGroups);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);
  const [transferringScope, setTransferringScope] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] =
    useState<ShortageEditorTabKey>('shortage');
  const [restoredDrafts, setRestoredDrafts] = useState<HomeReauthRowDraft[]>([]);
  const shortageEditorRef = useRef<ShortageSkuEditorHandle>(null);
  // 결과 안내는 화면 오른쪽 아래 알림으로(null = 띄울 것 없음).
  function setMessage(toast: ToastState | null) {
    if (toast) {
      showAdminToast(toast.text, toast.tone);
    }
  }
  const [isMounted, setIsMounted] = useState(false);

  const sortedGroups = sortGroups(groups, sortState);
  const visibleGroups = sortedGroups.filter((group) => {
    if (activeTab === 'hidden') {
      return group.isHidden;
    }

    return !group.isHidden && getSeriesTab(group) === activeTab;
  });
  const selectedGroup =
    selectedProductId === null
      ? null
      : groups.find((group) => group.productId === selectedProductId) ?? null;
  const countableGroups = groups;
  const artistCount = countableGroups.filter(
    (group) => !group.isHidden && getSeriesTab(group) === 'artist',
  ).length;
  const originalCount = countableGroups.filter(
    (group) => !group.isHidden && getSeriesTab(group) === 'original',
  ).length;
  const collabCount = countableGroups.filter(
    (group) => !group.isHidden && getSeriesTab(group) === 'collab',
  ).length;
  const hiddenCount = countableGroups.filter((group) => group.isHidden).length;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setGroups(initialGroups);
  }, [initialGroups]);

  useEffect(() => {
    const saved = takeHomeReauthState(window.sessionStorage, draftOwner, Date.now());
    if (!saved) {
      return;
    }

    setRestoredDrafts(saved.rows);
    setSelectedTab(saved.tab);
    setSelectedProductId(saved.productId);
  }, [draftOwner]);

  useEffect(() => {
    function keepOpenWindowForReauth() {
      if (selectedProductId === null) {
        return;
      }

      saveHomeReauthState(window.sessionStorage, draftOwner, {
        productId: selectedProductId,
        tab: selectedTab,
        rows: shortageEditorRef.current?.getDirtyDrafts() ?? [],
      }, Date.now());
    }

    window.addEventListener(HOME_REAUTH_EVENT, keepOpenWindowForReauth);
    return () => window.removeEventListener(HOME_REAUTH_EVENT, keepOpenWindowForReauth);
  }, [draftOwner, selectedProductId, selectedTab]);

  async function updateProductDisplay(
    productId: string,
    patch: Partial<Pick<GraphicInventoryHomeGroup, 'isHidden'>>,
  ) {
    const previousGroups = groups;
    const nextGroups = groups.map((group) =>
      group.productId === productId ? { ...group, ...patch } : group,
    );

    setGroups(nextGroups);
    setPendingProductId(productId);
    setMessage(null);

    try {

      const response = await fixtureDashboardRequest(
        `/api/admin/products/${encodeURIComponent(productId)}/display`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hidden: patch.isHidden,
          }),
        },
      );
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? '표시 설정을 저장하지 못했습니다.');
      }

      setMessage({
        tone: 'success',
        text: '저장됨',
      });
    } catch (error) {
      setGroups(previousGroups);
      setMessage({
        tone: 'error',
        text: adminErrorMessage(error, '표시 설정을 저장하지 못했습니다.'),
      });
    } finally {
      setPendingProductId(null);
    }
  }

  function updateGroupRows(productId: string, rows: ShortageEditorRow[]) {
    setGroups((current) =>
      current.map((group) =>
        group.productId === productId
          ? {
              ...group,
              ...getRowTotals(
                group.rows.map((row) =>
                  findUpdatedRow(row, rows) ?? row,
                ),
              ),
              rows: group.rows.map((row) =>
                findUpdatedRow(row, rows) ?? row,
              ),
            }
          : group,
      ),
    );
  }

  function applyTransferredRows(updatedRows: WorkTransferResponseRow[]) {
    if (updatedRows.length === 0) {
      return;
    }

    setGroups((current) =>
      current.map((group) => {
        const nextRows = group.rows.map((row) => {
          const updatedRow = updatedRows.find(
            (item) =>
              item.skuId === row.skuId && item.locationId === row.locationId,
          );

          return updatedRow
            ? {
                ...row,
                ...updatedRow,
                id: updatedRow.stockTargetId ?? row.id,
              }
            : row;
        });

        return {
          ...group,
          ...getRowTotals(nextRows),
          rows: nextRows,
        };
      }),
    );
  }

  async function transferWorkQuantities(productId?: string) {
    if (!isAdmin || transferringScope) {
      return;
    }

    const scope = productId ?? 'all';

    setTransferringScope(scope);
    setMessage(null);

    try {
      if (productId) {
        const saved = await shortageEditorRef.current?.saveAll();

        if (saved === false) {
          setMessage({
            tone: 'error',
            text: '저장되지 않은 작업수량이 있어 전달 완료를 멈췄습니다.',
          });
          return;
        }
      }


      const response = await fixtureDashboardRequest('/api/admin/seongsu-work-quantities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'transfer',
          ...(productId ? { productId } : {}),
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        rows?: WorkTransferResponseRow[];
      };

      if (!response.ok) {
        throw new Error(payload.message ?? '작업수량을 전달 완료하지 못했습니다.');
      }

      applyTransferredRows(payload.rows ?? []);
      window.dispatchEvent(new Event('vintad3e:dashboard-change'));
      setMessage({
        tone: 'success',
        text: payload.message ?? '전달 완료했습니다.',
      });
      router.refresh();
    } catch (error) {
      setMessage({
        tone: 'error',
        text: adminErrorMessage(error, '작업수량을 전달 완료하지 못했습니다.'),
      });
    } finally {
      setTransferringScope(null);
    }
  }

  function openProductDialog(productId: string) {
    setRestoredDrafts([]);
    setSelectedTab('shortage');
    setSelectedProductId(productId);
  }

  function openProductDialogFromKeyboard(
    event: KeyboardEvent,
    productId: string,
  ) {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) {
      return;
    }

    event.preventDefault();
    openProductDialog(productId);
  }

  function requestCloseDialog() {
    const hasDirtyRows = shortageEditorRef.current?.hasDirtyRows() ?? false;
    const dirtyRowLabels = shortageEditorRef.current?.getDirtyRowLabels() ?? [];
    const dirtyPreview = dirtyRowLabels
      .slice(0, 6)
      .map((label) => `- ${label}`)
      .join('\n');
    const dirtyRestCount = Math.max(dirtyRowLabels.length - 6, 0);
    const dirtyDetail =
      dirtyRowLabels.length > 0
        ? `\n\n${dirtyPreview}${
            dirtyRestCount > 0 ? `\n- 외 ${dirtyRestCount}개` : ''
          }`
        : '';

    if (
      hasDirtyRows &&
      !window.confirm(
        `저장하지 않은 옵션 품목 변경사항이 있습니다.${dirtyDetail}\n\n이대로 창을 닫을까요?`,
      )
    ) {
      return;
    }

    setRestoredDrafts([]);
    setSelectedProductId(null);
  }

  function requestTabChange(tab: ShortageEditorTabKey) {
    const hasDirtyRows = shortageEditorRef.current?.hasDirtyRows() ?? false;

    if (
      hasDirtyRows &&
      !window.confirm('저장하지 않은 옵션 품목 변경사항이 있습니다. 탭을 바꿀까요?')
    ) {
      return;
    }

    setRestoredDrafts([]);
    setSelectedTab(tab);
  }

  return (
    <section className="graphic-inventory">
      <div className="graphic-inventory__top">
        <div className="graphic-inventory__title-line">
          <h2>매장 디자인별 부족 수량</h2>
          {isAdmin ? (
            <Button
              type="button"
              variant="primary" size="small"
              disabled={Boolean(transferringScope)}
              onClick={() => void transferWorkQuantities()}
            >
              {transferringScope === 'all' ? '처리 중' : '일괄 전달 완료'}
            </Button>
          ) : null}
        </div>
        <div className="graphic-inventory__toolbar">
          <div className="graphic-sort" aria-label="디자인 정렬">
            <SortToggleButton
              label="이름"
              active={sortState.key === 'name'}
              direction={sortState.key === 'name' ? sortState.direction : 'asc'}
              title={
                sortState.key === 'name' && sortState.direction === 'asc'
                  ? '이름 내림차순으로 변경'
                  : '이름 오름차순으로 정렬'
              }
              onClick={() =>
                setSortState((current) => getNextSortState(current, 'name'))
              }
            />
            <SortToggleButton
              label="부족"
              active={sortState.key === 'shortage'}
              direction={
                sortState.key === 'shortage' ? sortState.direction : 'desc'
              }
              title={
                sortState.key === 'shortage' && sortState.direction === 'desc'
                  ? '부족수량 오름차순으로 변경'
                  : '부족수량 내림차순으로 정렬'
              }
              onClick={() =>
                setSortState((current) => getNextSortState(current, 'shortage'))
              }
            />
          </div>
          <div className="graphic-tabs" role="tablist" aria-label="디자인 표시 탭">
            <button
              type="button"
              className={activeTab === 'artist' ? 'is-active' : undefined}
              onClick={() => setActiveTab('artist')}
              role="tab"
              aria-selected={activeTab === 'artist'}
            >
              아티스트 {formatNumber(artistCount)}
            </button>
            <button
              type="button"
              className={activeTab === 'original' ? 'is-active' : undefined}
              onClick={() => setActiveTab('original')}
              role="tab"
              aria-selected={activeTab === 'original'}
            >
              오리지널 {formatNumber(originalCount)}
            </button>
            <button
              type="button"
              className={activeTab === 'collab' ? 'is-active' : undefined}
              onClick={() => setActiveTab('collab')}
              role="tab"
              aria-selected={activeTab === 'collab'}
            >
              작가 {formatNumber(collabCount)}
            </button>
            <button
              type="button"
              className={activeTab === 'hidden' ? 'is-active' : undefined}
              onClick={() => setActiveTab('hidden')}
              role="tab"
              aria-selected={activeTab === 'hidden'}
            >
              숨김 {formatNumber(hiddenCount)}
            </button>
          </div>
        </div>
      </div>


      <div className="graphic-card-grid">
        {visibleGroups.length === 0 ? (
          <div className="graphic-card-grid__empty">
            <strong>표시할 디자인이 없습니다.</strong>
            <p>
              {activeTab === 'hidden'
                ? '숨김을 해제하면 아티스트·오리지널·작가 탭에 다시 표시됩니다.'
                : '매장에서 보충이 필요한 디자인이 있으면 여기에 표시됩니다.'}
            </p>
          </div>
        ) : (
          visibleGroups.map((group) => {
            const displayName = getGraphicDisplayName(group);

            return (
              <article
                key={group.productId}
                className="graphic-card"
                role="button"
                tabIndex={0}
                onClick={() => openProductDialog(group.productId)}
                onKeyDown={(event) =>
                  openProductDialogFromKeyboard(event, group.productId)
                }
                aria-label={`${displayName} 옵션 품목 보기`}
              >
                <div className="graphic-card__image">
                  {GRAPHIC_IMAGE_BY_PRODUCT_CODE[group.productCode] ? (
                    <Image
                      src={GRAPHIC_IMAGE_BY_PRODUCT_CODE[group.productCode]}
                      alt={displayName}
                      fill
                      sizes="(max-width: 700px) 50vw, (max-width: 1200px) 25vw, 220px"
                      unoptimized
                      loading="eager"
                      className="graphic-card__photo"
                    />
                  ) : (
                    <span></span>
                  )}

                  {isAdmin ? (
                    <button
                      type="button"
                      className="graphic-card__hide-action"
                      disabled={pendingProductId === group.productId}
                      onClick={(event) => {
                        event.stopPropagation();
                        void updateProductDisplay(group.productId, {
                          isHidden: !group.isHidden,
                        });
                      }}
                    >
                      {group.isHidden ? '다시 표시' : '숨김으로 이동'}
                    </button>
                  ) : null}
                </div>

                <div className="graphic-card__body">
                  <div className="graphic-card__meta-row">
                    <div className="graphic-card__identity">
                      <strong className="graphic-card__name-highlight">
                        {displayName}
                      </strong>
                      <span className="graphic-card__shortage-inline">
                        부족({formatNumber(group.shortageQtyTotal)})
                      </span>
                    </div>

                    <button
                      type="button"
                      className="graphic-card__view-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openProductDialog(group.productId);
                      }}
                      aria-label={`${displayName} 옵션 품목 보기`}
                      title="옵션 품목 보기"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M5.1 3.6c-.7-.3-1.4.4-1.1 1.1l5.1 15.1c.3.8 1.4.9 1.8.1l2.1-4.2 4.5 4.5c.5.5 1.3.5 1.8 0l.9-.9c.5-.5.5-1.3 0-1.8L15.7 13l4.2-2.1c.8-.4.7-1.5-.1-1.8L5.1 3.6Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
      {selectedGroup && isMounted
        ? createPortal(
        <div className="graphic-dialog-backdrop">
          {(() => {
            const seongsuRows = getSeongsuRows(selectedGroup.rows);
            const tabCounts = getShortageTabCounts(seongsuRows);
            const visibleRows = getRowsForShortageTab(seongsuRows, selectedTab);

            return (
          <section
            className="graphic-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="graphic-dialog-title"
          >
            <div className="graphic-dialog__chrome">
              <div className="graphic-dialog__tabs">
                <ShortageSkuTabs
                  activeTab={selectedTab}
                  shortageCount={tabCounts.shortage}
                  unmarkedCount={tabCounts.normal}
                  totalCount={tabCounts.total}
                  onTabChange={requestTabChange}
                />
              </div>
              <div className="graphic-dialog__titlebar">
                <h3 id="graphic-dialog-title" className="graphic-dialog__title">
                  {getGraphicDisplayName(selectedGroup)}
                </h3>
                {isAdmin ? (
                  <Button
                    type="button"
                    variant="primary" size="small" appearanceSlot="graphic-transfer"
                    disabled={transferringScope === selectedGroup.productId}
                    onClick={() => void transferWorkQuantities(selectedGroup.productId)}
                  >
                    {transferringScope === selectedGroup.productId
                      ? '처리 중'
                      : '전달 완료'}
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="graphic-dialog__close"
                  aria-label="옵션 품목 창 닫기"
                  onClick={requestCloseDialog}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="graphic-dialog__body">
              <ShortageSkuEditor
                ref={shortageEditorRef}
                key={`${selectedGroup.productId}:${selectedTab}`}
                rows={visibleRows}
                mode="graphic-detail"
                canEdit={isAdmin}
                disableTabFilter
                showTabs={false}
                workQuantityMode
                restoredDrafts={restoredDrafts}
                onRowsChange={(nextRows) =>
                  updateGroupRows(selectedGroup.productId, nextRows)
                }
              />
            </div>
          </section>
            );
          })()}
        </div>
          ,
          document.body,
        )
        : null}
    </section>
  );
}
