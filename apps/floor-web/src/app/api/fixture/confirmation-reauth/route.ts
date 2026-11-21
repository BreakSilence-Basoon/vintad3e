import { handleFixtureConfirmationReauth } from '../../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return handleFixtureConfirmationReauth(request, process.env); }
