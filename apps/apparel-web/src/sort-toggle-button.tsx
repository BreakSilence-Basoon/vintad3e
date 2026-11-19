'use client';

export type SortDirection = 'asc' | 'desc';

type SortToggleButtonProps = {
  label: string;
  direction: SortDirection;
  active?: boolean;
  className?: string;
  title?: string;
  onClick: () => void;
};

export function SortToggleButton({
  label,
  direction,
  active = false,
  className,
  title,
  onClick,
}: SortToggleButtonProps) {
  const classNames = [
    'sort-toggle-button',
    active ? 'is-active' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classNames}
      aria-pressed={active}
      title={title}
      onClick={onClick}
    >
      <span>{label}</span>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {direction === 'asc' ? (
          <path d="M8 3.2 3.8 7.4l1.1 1.1 2.3-2.3v6.6h1.6V6.2l2.3 2.3 1.1-1.1L8 3.2Z" />
        ) : (
          <path d="m8 12.8 4.2-4.2-1.1-1.1-2.3 2.3V3.2H7.2v6.6L4.9 7.5 3.8 8.6 8 12.8Z" />
        )}
      </svg>
    </button>
  );
}
