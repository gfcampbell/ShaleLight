import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

async function hasActiveSession(request: NextRequest): Promise<boolean> {
  try {
    const response = await fetch(new URL('/api/auth/me', request.url), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();

  const token = request.cookies.get('shale_session')?.value;
  if (!token) {
    return rejectRequest(request, pathname, 401);
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return rejectRequest(request, pathname, 500);
  }

  try {
    jwt.verify(token, jwtSecret);
    const sessionOk = await hasActiveSession(request);
    if (!sessionOk) return rejectRequest(request, pathname, 401);
    return NextResponse.next();
  } catch {
    return rejectRequest(request, pathname, 401);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
