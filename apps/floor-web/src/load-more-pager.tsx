import Link from 'next/link';

type LoadMorePagerProps = {
  ariaLabel: string;
  href: string;
  label?: string;
  totalCount: number;
  visibleCount: number;
};

export function LoadMorePager({
  ariaLabel,
  href,
  label = '더 불러오기',
  totalCount,
  visibleCount,
}: LoadMorePagerProps) {
  const safeTotalCount = Math.max(0, totalCount);
  const safeVisibleCount = Math.min(Math.max(0, visibleCount), safeTotalCount);

  if (safeTotalCount === 0 || safeVisibleCount >= safeTotalCount) {
    return null;
  }

  return (
    <nav className="load-more-pager" aria-label={ariaLabel}>
      <span>
        {safeVisibleCount} / {safeTotalCount}
      </span>
      <Link href={href} className="button button--ghost button--small" scroll={false}>
        {label}
      </Link>
    </nav>
  );
}
