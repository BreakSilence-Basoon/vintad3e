import { handleTimetableRequest } from '../../../../timetable-route.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleTimetableRequest(request, 'access', process.env.VINTAD3E_TIMETABLE_API_ORIGIN); }
