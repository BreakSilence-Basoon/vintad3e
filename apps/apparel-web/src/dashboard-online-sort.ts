import type { OnlinePreparationCard } from './dashboard-online-preparation';

export type OnlinePreparationSortState = {
  key: 'items' | 'order';
  direction: 'asc' | 'desc';
};

export function getItemLines(order: OnlinePreparationCard) {
  return order.itemLines && order.itemLines.length > 0
    ? order.itemLines
    : [{ name: order.itemSummary, quantity: null }];
}

export function getNextSortState(current: OnlinePreparationSortState, key: OnlinePreparationSortState['key']): OnlinePreparationSortState {
  if (current.key !== key) return { key, direction: key === 'order' ? 'desc' : 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

export function compareOrders(left: OnlinePreparationCard, right: OnlinePreparationCard, sortState: OnlinePreparationSortState) {
  const direction = sortState.direction === 'asc' ? 1 : -1;
  let result = sortState.key === 'items'
    ? getItemLines(left).map(item => item.name).join(' ').localeCompare(
      getItemLines(right).map(item => item.name).join(' '), 'ko-KR', { numeric: true, sensitivity: 'base' },
    )
    : new Date(left.soldAt).getTime() - new Date(right.soldAt).getTime();
  if (result === 0) result = new Date(left.soldAt).getTime() - new Date(right.soldAt).getTime();
  return result * direction;
}
