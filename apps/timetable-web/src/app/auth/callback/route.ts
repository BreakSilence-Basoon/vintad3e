import { handleTimetableAuth } from '../../../timetable-auth.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleTimetableAuth(request, process.env.VINTAD3E_TIMETABLE_API_ORIGIN, 'callback'); }
