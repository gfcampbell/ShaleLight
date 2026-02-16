import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const protectedRoutes = [
  '/chat',
  '/admin',
  '/api/chat',
  '/api/admin',
  '/api/files',
  '/api/analytics',
];

function isProtected(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function rejectRequest(request: NextRequest, pathname: string, status = 401) {
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: status === 500 ? 'Server misconfiguration' : 'Unauthorized' }, { status });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const token = request.cookies.get('shale_session')?.value;
  if (!token) {
    console.log('[middleware] No token found for', pathname);
    return rejectRequest(request, pathname, 401);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.log('[middleware] JWT_SECRET not available');
    return rejectRequest(request, pathname, 500);
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    await jwtVerify(token, secret);
    console.log('[middleware] Token verified for', pathname);
    return NextResponse.next();
  } catch (err) {
    console.log('[middleware] Token verification failed:', err.message);
    return rejectRequest(request, pathname, 401);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
