export function fixtureSchedule(env: string | undefined, enabled: string | undefined, month: string) {
  if (env !== 'development' || enabled !== '1' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  return [8, 18].map((day) => ({ date: `${month}-${String(day).padStart(2, '0')}` }));
}
