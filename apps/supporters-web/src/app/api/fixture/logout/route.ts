import { handleFixtureSession } from '../../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return handleFixtureSession(request, 'logout', process.env); }
