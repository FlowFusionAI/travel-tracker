import { auth } from '@/auth'
import { NextResponse } from 'next/server'

// Routes that do not require authentication
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/shared']
const PUBLIC_API_PATHS = ['/api/auth']

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isPublic =
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
})

export const config = {
  // Run middleware on all routes except Next.js internals and static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)'],
}
