const weekdays = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function emptyCalendarCells(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, monthNumber] = month.split('-').map(Number);
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const count = Math.ceil((firstWeekday + dayCount) / weekdays.length) * weekdays.length;
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - 1, index - firstWeekday + 1));
    const cellYear = date.getUTCFullYear(), cellMonth = date.getUTCMonth() + 1, day = date.getUTCDate();
    return { dateKey: `${cellYear}-${String(cellMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      cellMonth, day, weekday: weekdays[date.getUTCDay()], outside: cellMonth !== monthNumber };
  });
}
