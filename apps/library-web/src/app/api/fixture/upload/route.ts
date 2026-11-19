import { handleFixtureUpload } from '../../../../fixture-upload.mjs';
export const dynamic = 'force-dynamic';
export function POST(request: Request) { return handleFixtureUpload(request, process.env); }
