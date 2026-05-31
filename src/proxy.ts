import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PREFIXES = ['/login', '/api/auth/']
// Prefix '/api/auth/' is the route (handlers) that create the cookie. Listed as public so proxy doesn't block it due to Regex filter.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  const hasSession = request.cookies.has('auth_session')

  if (isPublic) {
    // User is directed to login page but signed in. Redirect to '/'.
    if (pathname.startsWith('/login') && hasSession) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // No session found, no matter what page was served, redirect to '/login'.
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Condition where user is logged in wasn't served '/login' page. No change.
  return NextResponse.next()
}

// Regex ignoring internal static files/Next files. Filters proxy to run on actual pages/routes.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
}
