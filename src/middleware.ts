export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/projects/:path*', '/messages/:path*', '/dust-logs/:path*'],
}
