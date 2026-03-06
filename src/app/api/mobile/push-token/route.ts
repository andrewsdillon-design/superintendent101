import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// POST /api/mobile/push-token — register or update Expo push token
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'token is required' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: userId },
    data: { pushToken: token },
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/mobile/push-token — unregister push token (on logout)
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: userId },
    data: { pushToken: null },
  })

  return NextResponse.json({ ok: true })
}
