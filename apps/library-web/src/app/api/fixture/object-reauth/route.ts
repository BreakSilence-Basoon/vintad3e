import { handleFixtureSession } from '../../../../fixture-session.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (Number(request.headers.get('content-length') ?? 0) > 512 || request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded' || !request.body) return new Response(null, { status: 400 });
  const reader = request.body.getReader(), decoder = new TextDecoder(); let text = '', size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 512) { await reader.cancel(); return new Response(null, { status: 400 }); } text += decoder.decode(part.value, { stream: true }); } text += decoder.decode(); } catch { return new Response(null, { status: 400 }); } finally { reader.releaseLock(); }
  const params = new URLSearchParams(text), proposalId = params.get('proposalId');
  if ([...params.keys()].length !== 1) return new Response(null, { status: 400 });
  if (typeof proposalId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(proposalId)) return new Response(null, { status: 400 });
  const response = handleFixtureSession(request, 'logout', process.env);
  if (response.status === 303) response.headers.set('location', `/sign-in?next=${encodeURIComponent(`/confirmations/${proposalId}`)}`);
  return response;
}
