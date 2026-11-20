import { NextRequest, NextResponse } from 'next/server';
import { fixtureAdminReturnPath } from './admin-return-path.mjs';

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete('x-vintad3e-apparel-return-path');
  if (request.method === 'GET' || request.method === 'HEAD') {
    const path = fixtureAdminReturnPath(`${request.nextUrl.pathname}${request.nextUrl.search}`);
    if (path) requestHeaders.set('x-vintad3e-apparel-return-path', path);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ['/admin/:path*'] };
