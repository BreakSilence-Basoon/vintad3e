import { handleFixturePublicationReauth } from '../../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return handleFixturePublicationReauth(request, process.env); }
