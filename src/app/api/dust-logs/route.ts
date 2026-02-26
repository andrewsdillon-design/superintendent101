import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fetchLogsFromNotion } from '@/lib/notion'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
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
