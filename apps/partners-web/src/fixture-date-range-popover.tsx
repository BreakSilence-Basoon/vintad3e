'use client';

import { Button } from '@vintad3e/ui/components';
import { useId } from 'react';

type DateRangePopoverProps = {
  from: string;
  isOpen: boolean;
  onClose: () => void;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  to: string;
};

export function DateRangePopover({
  from,
  isOpen,
  onClose,
  onFromChange,
  onToChange,
  to,
}: DateRangePopoverProps) {
  const fromId = useId();
  const toId = useId();

  return (
    <div className="date-range-popover">
      <input readOnly name="from" type="hidden" value={from} />
      <input readOnly name="to" type="hidden" value={to} />
      {isOpen ? (
        <div
          className="date-range-popover__panel"
          role="group"
          aria-label="기간 직접 지정"
        >
          <div className="date-range-popover__grid">
            <label htmlFor={fromId}>
              <span>시작일</span>
              <input
                id={fromId}
                type="date"
                value={from}
                onChange={(event) => {
                  onFromChange(event.target.value);
                }}
              />
            </label>
            <label htmlFor={toId}>
              <span>종료일</span>
              <input
                id={toId}
                type="date"
                value={to}
                onChange={(event) => {
                  onToChange(event.target.value);
                }}
              />
            </label>
          </div>
          <div className="date-range-popover__actions">
            <Button
              variant="primary" size="small"
              type="button"
              onClick={onClose}
            >
              닫기
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
