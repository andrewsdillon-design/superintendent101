import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { headers } from 'next/headers'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? '')

// Works with both NextAuth (web) and Bearer JWT (mobile app).
export async function requireAdmin() {
  // 1. Try NextAuth session (web)
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as any
  if (sessionUser?.role === 'ADMIN') {
    return { user: sessionUser }
  }

  // 2. Try Bearer token (mobile)
  const headersList = headers()
  const authHeader = headersList.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET)
      if ((payload as any).role === 'ADMIN') {
        return { user: payload as any }
      }
    } catch {
      // invalid token — fall through to 403
    }
  }

  return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
}
