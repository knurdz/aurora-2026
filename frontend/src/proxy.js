import { NextResponse } from 'next/server';

const protectedPrefixes = ['/dashboard', '/audit', '/analyze', '/report', '/settings'];
const cookieName = process.env.SESSION_COOKIE_NAME || 'verischolar_session';

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));

  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = Boolean(request.cookies.get(cookieName)?.value);
  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/dashboard/:path*', '/audit/:path*', '/analyze/:path*', '/report/:path*', '/settings/:path*'],
};
