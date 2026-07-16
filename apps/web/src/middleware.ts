import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('hopak_token')?.value;

  const isPartnerRoute = pathname.startsWith('/partner');
  const isAdminRoute = pathname.startsWith('/admin');

  if ((isPartnerRoute || isAdminRoute) && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/partner/:path*', '/admin/:path*'],
};
