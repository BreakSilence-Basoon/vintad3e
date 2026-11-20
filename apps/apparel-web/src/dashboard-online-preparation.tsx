'use client';

import { showAdminToast } from './admin-toast';
import { readOnlineChecklist, saveOnlineChecklist } from './dashboard-online-storage';
import { useEffect, useMemo, useState } from 'react';
import {
  SortToggleButton,
  type SortDirection,
} from './sort-toggle-button';

export type OnlinePreparationCard = {
  id: string;
  requestIds: string[];
  orderNumber: string;
  soldAt: string;
  channelNameKo: string;
  itemSummary: string;
  itemLines?: Array<{
    name: string;
    quantity: number | null;
  }>;
  totalQuantity: number;
  checklist: {
    hanamPrepared: boolean;
    seongsuPicked: boolean;
  };
};

type OnlinePreparationListProps = {
  orders: OnlinePreparationCard[];
  canEdit: boolean;
  syncError?: string | null;
};

type ChecklistDraft = OnlinePreparationCard['checklist'];
type OnlinePreparationTab = 'pending' | 'done';
type OnlinePreparationSortKey =
  | 'items'
  | 'order';

type OnlinePreparationSortState = {
  key: OnlinePreparationSortKey;
  direction: SortDirection;
};

type OnlinePreparationCountSummary = {
  orderCount: number;
  quantityTotal: number;
};

const DEFAULT_SORT: OnlinePreparationSortState = {
  key: 'order',
  direction: 'desc',
};

const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function formatOrderDateTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  })
    .format(new Date(value))
    .replace('오전', 'AM')
    .replace('오후', 'PM');
}

function getItemLines(order: OnlinePreparationCard) {
  return order.itemLines && order.itemLines.length > 0
    ? order.itemLines
    : [{ name: order.itemSummary, quantity: null }];
}

function getChecklistDrafts(orders: OnlinePreparationCard[]) {
  return Object.fromEntries(
    orders.map((order) => [order.id, { ...order.checklist }]),
  ) as Record<string, ChecklistDraft>;
}

function isProductionDone(checklist: ChecklistDraft) {
  return checklist.seongsuPicked || checklist.hanamPrepared;
}

function isDraftDirty(order: OnlinePreparationCard, draft: ChecklistDraft) {
  return (
    order.checklist.seongsuPicked !== draft.seongsuPicked ||
    order.checklist.hanamPrepared !== draft.hanamPrepared
  );
}

function summarizeOrderCounts(
  orders: OnlinePreparationCard[],
): OnlinePreparationCountSummary {
  return {
    orderCount: orders.length,
    quantityTotal: orders.reduce(
      (sum, order) => sum + order.totalQuantity,
      0,
    ),
  };
}

function getNextSortState(
  current: OnlinePreparationSortState,
  key: OnlinePreparationSortKey,
): OnlinePreparationSortState {
  if (current.key !== key) {
    return {
      key,
      direction: key === 'order' ? 'desc' : 'asc',
    };
  }

  return {
    key,
    direction: current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, 'ko-KR', {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareOrders(
  left: OnlinePreparationCard,
  right: OnlinePreparationCard,
  sortState: OnlinePreparationSortState,
) {
  const direction = sortState.direction === 'asc' ? 1 : -1;
  let result = 0;

  switch (sortState.key) {
    case 'items':
      result = compareText(
        getItemLines(left).map((item) => item.name).join(' '),
        getItemLines(right).map((item) => item.name).join(' '),
      );
      break;
    case 'order':
      result =
        new Date(left.soldAt).getTime() - new Date(right.soldAt).getTime();
      break;
  }

  if (result === 0) {
    result =
      new Date(left.soldAt).getTime() - new Date(right.soldAt).getTime();
  }

  return result * direction;
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 3.5h11.1L20.5 8v12.5H3.5v-17H5Zm1.5 2v5h9v-5h-9Zm11 13v-8.7l-2.8-2.8H14v5H5.5v6.5h2.3v-4.2h8.4v4.2h1.3Zm-8.2 0h5.4v-2.7H9.3v2.7Z" />
    </svg>
  );
}

function OnlinePreparationTabCount({
  summary,
}: {
  summary: OnlinePreparationCountSummary;
}) {
  return (
    <span className="online-prep-tabs__summary">
      <strong>{formatCount(summary.quantityTotal)}장</strong>
      <small>{formatCount(summary.orderCount)}건</small>
    </span>
  );
}

export function OnlinePreparationList({
  orders: initialOrders,
  canEdit,
  syncError = null,
}: OnlinePreparationListProps) {

  const [orders, setOrders] = useState(initialOrders);
  const [drafts, setDrafts] = useState<Record<string, ChecklistDraft>>(() =>
    getChecklistDrafts(initialOrders),
  );
  const [activeTab, setActiveTab] = useState<OnlinePreparationTab>('pending');
  const [sortState, setSortState] =
    useState<OnlinePreparationSortState>(DEFAULT_SORT);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let saved = null;
    try { saved = readOnlineChecklist(window.sessionStorage); } catch {}
    const restored = initialOrders.map(order => order.id === 'fixture-online-01' && saved ? { ...order, checklist: saved } : order);
    setOrders(restored);
    setDrafts(getChecklistDrafts(restored));
  }, [initialOrders]);

  const counts = useMemo(
    () => {
      const pendingOrders = orders.filter(
        (order) => !isProductionDone(order.checklist),
      );
      const doneOrders = orders.filter((order) =>
        isProductionDone(order.checklist),
      );

      return {
        pending: summarizeOrderCounts(pendingOrders),
        done: summarizeOrderCounts(doneOrders),
      };
    },
    [orders],
  );

  const visibleOrders = useMemo(
    () =>
      orders
        .filter((order) =>
          activeTab === 'done'
            ? isProductionDone(order.checklist)
            : !isProductionDone(order.checklist),
        )
        .sort((left, right) => compareOrders(left, right, sortState)),
    [activeTab, orders, sortState],
  );

  function updateDraft(orderId: string, nextDraft: Partial<ChecklistDraft>) {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {
          seongsuPicked: false,
          hanamPrepared: false,
        }),
        ...nextDraft,
      },
    }));
  }

  async function saveOrder(order: OnlinePreparationCard) {
    const draft = drafts[order.id] ?? order.checklist;

    if (!isDraftDirty(order, draft)) {
      return;
    }

    setSavingOrderId(order.id);

    try {
      if (order.id !== 'fixture-online-01' || !saveOnlineChecklist(window.sessionStorage, draft)) throw new Error('준비 상태를 저장하지 못했습니다.');
      window.dispatchEvent(new Event('vintad3e:dashboard-change'));

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? {
                ...item,
                checklist: draft,
              }
            : item,
        ),
      );
      showAdminToast('저장됨', 'success');
      setActiveTab(isProductionDone(draft) ? 'done' : 'pending');

    } catch (error) {
      showAdminToast(
        error instanceof Error
          ? error.message
          : '준비 상태를 저장하지 못했습니다.',
        'error',
      );
    } finally {
      setSavingOrderId(null);
    }
  }

  function renderSortableHeader(
    label: string,
    key: OnlinePreparationSortKey,
  ) {
    const direction = sortState.key === key ? sortState.direction : 'asc';

    return (
      <SortToggleButton
        label={label}
        direction={direction}
        active={sortState.key === key}
        className="sort-toggle-button--table online-prep-table__sort"
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
    <section className="online-prep-workbench">
      {syncError ? (
        <div className="monitor-row monitor-row--error" role="alert">
          <div className="monitor-row__copy">
            <strong>작업 실패</strong>
            <p>{syncError}</p>
          </div>
        </div>
      ) : null}

      <div className="online-prep-tabs" role="tablist" aria-label="온라인 주문 준비 상태">
        <button
          type="button"
          className={activeTab === 'pending' ? 'is-active' : ''}
          role="tab"
          aria-selected={activeTab === 'pending'}
          aria-label={`제작 대기 ${formatCount(
            counts.pending.quantityTotal,
          )}장, ${formatCount(counts.pending.orderCount)}건`}
          onClick={() => setActiveTab('pending')}
        >
          제작 대기 <OnlinePreparationTabCount summary={counts.pending} />
        </button>
        <button
          type="button"
          className={activeTab === 'done' ? 'is-active' : ''}
          role="tab"
          aria-selected={activeTab === 'done'}
          aria-label={`완료 ${formatCount(counts.done.quantityTotal)}장, ${formatCount(
            counts.done.orderCount,
          )}건`}
          onClick={() => setActiveTab('done')}
        >
          완료 <OnlinePreparationTabCount summary={counts.done} />
        </button>
      </div>

      <div className="online-prep-table" role="table" aria-label="Cafe24 온라인 주문 준비 요청">
        <div className="online-prep-table__head" role="row">
          <span>{renderSortableHeader('옵션 품목', 'items')}</span>
          <span>{renderSortableHeader('주문 정보', 'order')}</span>
          <span>성수</span>
          <span>하남</span>
          <span>저장</span>
        </div>
        <div className="online-prep-table__body" role="rowgroup">
          {visibleOrders.length === 0 ? (
            <div className="online-prep-table__empty">
              <p className="inventory-tracking-table__empty-message">
                결제 완료 후 배송 시작 전인 Cafe24 주문이 이곳에 표시됩니다
              </p>
            </div>
          ) : (
            visibleOrders.map((order) => {
              const draft = drafts[order.id] ?? order.checklist;
              const dirty = isDraftDirty(order, draft);
              const orderSummary = `${formatOrderDateTime(
                order.soldAt,
              )} (${order.orderNumber}) ${order.channelNameKo}`;

              return (
                <article
                  key={order.id}
                  className={`online-prep-table__row${dirty ? ' is-dirty' : ''}`}
                  role="row"
                >
                  <div className="online-prep-table__items" role="cell">
                    {getItemLines(order).map((item, index) => (
                      <span
                        key={`${order.id}-${item.name}-${index}`}
                        className="online-prep-table__item-line"
                      >
                        <span className="online-prep-table__item-name">
                          {item.name}
                        </span>
                        {typeof item.quantity === 'number' ? (
                          <span className="online-prep-table__quantity-chip">
                            {item.quantity}개
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                  <span className="online-prep-table__order" role="cell">
                    {orderSummary}
                  </span>
                  <label className="online-prep-check" role="cell">
                    <input
                      type="checkbox"
                      checked={draft.seongsuPicked}
                      disabled={!canEdit || savingOrderId === order.id}
                      onChange={(event) =>
                        updateDraft(order.id, {
                          seongsuPicked: event.target.checked,
                          hanamPrepared: event.target.checked
                            ? false
                            : draft.hanamPrepared,
                        })
                      }
                    />
                    <span className="sr-only">성수</span>
                  </label>
                  <label className="online-prep-check" role="cell">
                    <input
                      type="checkbox"
                      checked={draft.hanamPrepared}
                      disabled={!canEdit || savingOrderId === order.id}
                      onChange={(event) =>
                        updateDraft(order.id, {
                          hanamPrepared: event.target.checked,
                          seongsuPicked: event.target.checked
                            ? false
                            : draft.seongsuPicked,
                        })
                      }
                    />
                    <span className="sr-only">하남</span>
                  </label>
                  <div className="online-prep-table__action" role="cell">
                    {canEdit ? (
                      <button
                        type="button"
                        className={`shortage-save-button${
                          dirty ? ' is-dirty' : ''
                        }`}
                        disabled={savingOrderId === order.id}
                        onClick={() => void saveOrder(order)}
                        aria-label={`${order.itemSummary} 저장`}
                        title={dirty ? '저장' : '저장할 변경 없음'}
                      >
                        {savingOrderId === order.id ? (
                          <span className="shortage-save-button__busy" />
                        ) : (
                          <SaveIcon />
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
}
