import { handleFixturePublication } from '../../../../fixture-publication-store.mjs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) { return handleFixturePublication(request, process.env); }
export function POST(request: Request) { return handleFixturePublication(request, process.env); }
