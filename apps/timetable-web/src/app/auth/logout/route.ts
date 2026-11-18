import { handleTimetableLogout } from '../../../timetable-auth.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return handleTimetableLogout(request, process.env.VINTAD3E_TIMETABLE_API_ORIGIN); }
