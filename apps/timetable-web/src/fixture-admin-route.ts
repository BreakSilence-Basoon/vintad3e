import { normalizeMonth } from './date-time.ts';
export function fixtureAdminSchedulePath(env: string | undefined, fixture: string | undefined, admin: string | undefined, value: string | string[] | undefined): string | null {
  if (env !== 'development' || fixture !== '1' || admin !== '1') return null;
  const month = normalizeMonth(Array.isArray(value) ? value[0] : value);
  return `/?view=schedule&month=${encodeURIComponent(month)}`;
}
