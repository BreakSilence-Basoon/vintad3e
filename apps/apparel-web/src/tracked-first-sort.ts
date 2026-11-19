export type TrackedFirstSortDirection = 'asc' | 'desc';

export function compareTrackedFirst<T>(
  left: T,
  right: T,
  isTracked: (row: T) => boolean,
  compareByKey: (left: T, right: T) => number,
  direction: TrackedFirstSortDirection,
) {
  const leftTracked = isTracked(left);
  const rightTracked = isTracked(right);

  if (leftTracked !== rightTracked) {
    return leftTracked ? -1 : 1;
  }

  const result = compareByKey(left, right);
  return direction === 'asc' ? result : -result;
}
