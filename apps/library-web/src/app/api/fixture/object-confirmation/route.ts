import { handleFixtureObjectConfirmation } from '../../../../fixture-object-confirmation.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleFixtureObjectConfirmation(request, process.env); }
export function POST(request: Request) { return handleFixtureObjectConfirmation(request, process.env); }
