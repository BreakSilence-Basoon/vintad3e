import { readTimetable } from './timetable-read.mjs';

const cookieName = '__Host-vintad3e-session';
const noStore = { 'cache-control': 'private, no-store', 'vary': 'Cookie', 'x-content-type-options': 'nosniff' };
function reply(status, body) { return Response.json(body, { status, headers: noStore }); }
function sessionCookie(header) {
  if (!header) return undefined;
  const parts = header.split(';').map((part) => part.trim()).filter((part) => part.startsWith(`${cookieName}=`));
  if (parts.length !== 1) return undefined;
  return parts[0].slice(cookieName.length + 1);
}
export async function handleTimetableRequest(request, resource, apiOrigin) {
  if (request.method !== 'GET' || !['access', 'history', 'shifts'].includes(resource)) return reply(404, { error: 'not_found' });
  const url = new URL(request.url);
  const allowed = resource === 'shifts' ? ['from', 'to', 'cursor', 'include'] : resource === 'history' ? ['cursor'] : [];
  if ([...url.searchParams.keys()].some((key) => !allowed.includes(key)) || allowed.some((key) => url.searchParams.getAll(key).length > 1) || url.searchParams.has('include') && url.searchParams.get('include') !== 'attendance') return reply(400, { error: 'invalid_request' });
  const result = await readTimetable({ apiOrigin, sessionValue: sessionCookie(request.headers.get('cookie')), resource,
    from: url.searchParams.get('from'), to: url.searchParams.get('to'), nextCursor: url.searchParams.get('cursor') ?? undefined, includeAttendance: url.searchParams.get('include') === 'attendance' });
  if (result.kind === 'signed-out') return reply(401, { error: 'unauthorized' });
  if (result.kind === 'denied') return reply(404, { error: 'not_found' });
  if (result.kind !== 'ready') return reply(503, { error: 'unavailable' });
  return reply(200, result.data);
}
