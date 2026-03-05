import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const HIDDEN_ROUTES = ['/mentors', '/wallet', '/messages']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Redirect legacy /dust-logs to /daily-logs (keep backward compat)
  if (pathname.startsWith('/dust-logs')) {
    const rest = pathname.slice('/dust-logs'.length)
    return NextResponse.redirect(new URL(`/daily-logs${rest}`, request.url))
  }

  // Redirect hidden routes → /daily-logs
  if (HIDDEN_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/daily-logs', request.url))
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  // Unauthenticated users → login
  if (!token) {
    // Use NEXTAUTH_URL as the base so reverse-proxy internal hostnames don't leak
    const base = process.env.NEXTAUTH_URL ?? request.nextUrl.origin
    const loginUrl = new URL('/login', base)
    const callbackUrl = new URL(pathname, base)
    loginUrl.searchParams.set('callbackUrl', callbackUrl.toString())
    return NextResponse.redirect(loginUrl)
  }

  // Onboarding guard — if logged in but not yet onboarded, force to /onboarding
  if (!(token as any).onboarded) {
    const isOnboarding = pathname.startsWith('/onboarding')
    const isApi = pathname.startsWith('/api')
    if (!isOnboarding && !isApi) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
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
    '/mentors/:path*',
    '/dust-logs/:path*',
    '/daily-logs/:path*',
    '/wallet/:path*',
    '/admin/:path*',
    '/upgrade/:path*',
    '/company/:path*',
    '/onboarding/:path*',
    '/onboarding',
  ],
}
