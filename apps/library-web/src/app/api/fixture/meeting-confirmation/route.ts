import { handleFixtureMeetingConfirmation } from '../../../../fixture-meeting-confirmation.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return handleFixtureMeetingConfirmation(request, process.env); }
