import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const HIDDEN_ROUTES = ['/mentors', '/wallet', '/messages', '/projects']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect legacy /dust-logs to /daily-logs (keep backward compat)
  if (pathname.startsWith('/dust-logs')) {
    const rest = pathname.slice('/dust-logs'.length) // e.g. '/new' or ''
    return NextResponse.redirect(new URL(`/daily-logs${rest}`, request.url))
  }

  // Redirect hidden routes → /daily-logs
  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/daily-logs', request.url))
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Unauthenticated users → login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Admin routes → require ADMIN role
  if (pathname.startsWith('/admin')) {
    if ((token as any).role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/daily-logs', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/projects/:path*',
    '/messages/:path*',
    '/dust-logs/:path*',
    '/daily-logs/:path*',
    '/wallet/:path*',
    '/mentors/:path*',
    '/admin/:path*',
    '/upgrade/:path*',
  ],
}
