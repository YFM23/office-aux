import { NextRequest, NextResponse } from 'next/server';

// Edge-level guard so admin-only mutation routes 401 immediately, before
// touching Supabase or Spotify — the route handlers re-check
// isAdminSession() too (defence in depth), but this stops unauthenticated
// requests earlier and cheaply.
const ADMIN_ONLY_API_PREFIXES = [
  '/api/spotify/auth/login',
  '/api/spotify/devices',
  '/api/spotify/transfer',
  '/api/spotify/play',
  '/api/spotify/pause',
  '/api/spotify/skip',
  '/api/admin/settings', // GET is allowed through; PATCH re-checked in-route
  '/api/admin/reset',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminOnly = ADMIN_ONLY_API_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isAdminOnly) return NextResponse.next();

  // Admin settings GET is intentionally public (read-only display of current
  // rules); everything else in this list requires the admin cookie.
  if (pathname === '/api/admin/settings' && req.method === 'GET') return NextResponse.next();

  const isAdmin = req.cookies.get('office_aux_admin')?.value === '1';
  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/spotify/:path*', '/api/admin/:path*'],
};
