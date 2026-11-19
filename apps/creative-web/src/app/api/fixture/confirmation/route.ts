import { handleFixtureConfirmation } from '../../../../fixture-confirmation-store.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleFixtureConfirmation(request, process.env); }
export function POST(request: Request) { return handleFixtureConfirmation(request, process.env); }
