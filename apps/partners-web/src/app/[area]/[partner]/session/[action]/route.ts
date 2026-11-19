import { guestSessionAction } from '../../../../../guest-session.mjs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ area: string; partner: string; action: string }> }) {
  const { area, partner, action } = await params;
  if (area !== 'proj-bedroom') return new Response(null, { status: 404 });
  return guestSessionAction(request, process.env, partner, action);
}
