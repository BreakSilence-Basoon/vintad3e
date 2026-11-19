import { fixtureOrigin, handleFixtureSession } from '../../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const origin = fixtureOrigin(process.env);
  if (!origin) return new Response(null, { status: 404 });
  if (request.headers.get('host') !== new URL(origin).host || request.headers.get('origin') !== origin) return new Response(null, { status: 403 });
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return new Response(null, { status: 413 });
  let next = '/';
  try { const form = await request.formData(); const value = form.get('next'); if (typeof value === 'string') next = value; } catch {}
  return handleFixtureSession(request, 'login', process.env, Date.now(), next);
}
