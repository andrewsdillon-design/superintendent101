import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? '')

/**
 * Returns the authenticated user's ID from either:
 * 1. NextAuth session cookie (web)
 * 2. Bearer JWT token (mobile app)
 *
 * Returns null if unauthenticated.
 */
export async function getUserId(req: NextRequest): Promise<string | null> {
  // Check Bearer token first (mobile)
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { payload } = await jwtVerify(token, SECRET)
      return (payload.sub as string) ?? null
    } catch {
      return null
    }
  }

  // Fall back to NextAuth session (web)
  const session = await getServerSession(authOptions)
  return (session?.user as any)?.id ?? null
}
