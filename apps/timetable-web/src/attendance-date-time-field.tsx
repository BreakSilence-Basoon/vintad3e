'use client';

import { useRef } from 'react';

export function AttendanceDateTimeField({
  disabled = false,
  label,
  labelClassName,
  name,
  onChange,
  required = false,
  value,
}: {
  disabled?: boolean;
  label: string;
  labelClassName?: string;
  name: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openNativePicker() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });

    try {
      input.showPicker();
    } catch {
      input.click();
    }
  }

  return (
    <div className="attendance-history-editor__date-time-field">
      <span className={labelClassName}>{label}</span>
      <span className="attendance-history-editor__date-time-control">
        <button
          type="button"
          className="attendance-history-editor__date-time-trigger"
          aria-label={`${label} 달력 열기`}
          disabled={disabled}
          onClick={openNativePicker}
        >
          <span className={value ? undefined : 'is-placeholder'}>
            {value ? value.replace('T', ' ') : 'YYYY-MM-DD HH:MM'}
          </span>
          <span aria-hidden="true">▾</span>
        </button>
        <input
          ref={inputRef}
          type="datetime-local"
          name={name}
          autoComplete="off"
          value={value}
          aria-label={label}
          disabled={disabled}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </div>
  );
}
