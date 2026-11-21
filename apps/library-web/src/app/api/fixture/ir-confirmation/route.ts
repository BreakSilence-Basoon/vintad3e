import { handleFixtureIrConfirmation } from '../../../../fixture-ir-confirmation.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleFixtureIrConfirmation(request, process.env); }
export function POST(request: Request) { return handleFixtureIrConfirmation(request, process.env); }
