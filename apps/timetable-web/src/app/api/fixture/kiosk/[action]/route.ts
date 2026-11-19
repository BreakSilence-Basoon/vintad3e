import { handleFixtureKiosk } from '../../../../../fixture-kiosk.mjs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ action: string }> };
export async function GET(request: Request, { params }: Context) { return handleFixtureKiosk(request, process.env, (await params).action); }
export async function POST(request: Request, { params }: Context) { return handleFixtureKiosk(request, process.env, (await params).action); }
