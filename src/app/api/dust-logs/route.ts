import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscription: true, trialEndsAt: true },
  })

  const hasAccess =
    user?.subscription === 'DUST_LOGS' ||
    user?.trialEndsAt === null ||
    (user?.trialEndsAt !== undefined && user.trialEndsAt > new Date())

  const trialDaysLeft = user?.trialEndsAt
    ? Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86400000)
    : null

  // Notion integration removed — return empty state
  return NextResponse.json({ logs: [], notionConnected: false, hasAccess, trialDaysLeft })
}
