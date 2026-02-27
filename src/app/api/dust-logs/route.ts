import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchLogsFromNotion } from '@/lib/notion'
import { getUserId } from '@/lib/get-user-id'

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notionToken: true, notionDbId: true, subscription: true, trialEndsAt: true },
  })

  const hasAccess =
    user?.subscription === 'DUST_LOGS' ||
    user?.trialEndsAt === null ||
    (user?.trialEndsAt !== undefined && user.trialEndsAt > new Date())

  const trialDaysLeft = user?.trialEndsAt
    ? Math.ceil((user.trialEndsAt.getTime() - Date.now()) / 86400000)
    : null

  if (!hasAccess) {
    return NextResponse.json({ logs: [], notionConnected: false, hasAccess: false, trialDaysLeft: 0 })
  }

  if (!user?.notionToken || !user?.notionDbId) {
    return NextResponse.json({ logs: [], notionConnected: false, hasAccess: true, trialDaysLeft })
  }

  try {
    const logs = await fetchLogsFromNotion(user.notionToken, user.notionDbId)
    return NextResponse.json({ logs, notionConnected: true, hasAccess: true, trialDaysLeft })
  } catch (err: any) {
    console.error('Notion fetch failed:', err.message)
    return NextResponse.json({ logs: [], notionConnected: true, hasAccess: true, trialDaysLeft, error: err.message })
  }
}
