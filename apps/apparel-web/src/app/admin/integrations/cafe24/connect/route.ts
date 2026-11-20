import { NextRequest, NextResponse } from 'next/server';
import { fixtureOrigin, fixtureSession } from '../../../../../fixture-session.mjs';

export function GET(request: NextRequest) {
  const origin = fixtureOrigin(process.env);
  if (!origin || request.headers.get('host') !== new URL(origin).host) return new Response(null, { status: 404 });
  if (!fixtureSession(request.headers.get('cookie'), request.headers.get('host'), process.env)) return NextResponse.redirect(`${origin}/sign-in?next=%2F`);
  return NextResponse.redirect(`${origin}/?status=error&source=home-cafe24-reauth`);
}
