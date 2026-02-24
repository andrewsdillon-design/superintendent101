import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { session, user }
}
