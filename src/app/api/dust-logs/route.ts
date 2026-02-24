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
    select: { notionToken: true, notionDbId: true },
  })

  if (!user?.notionToken || !user?.notionDbId) {
    return NextResponse.json({ logs: [], notionConnected: false })
  }

  try {
    const logs = await fetchLogsFromNotion(user.notionToken, user.notionDbId)
    return NextResponse.json({ logs, notionConnected: true })
  } catch (err: any) {
    console.error('Notion fetch failed:', err.message)
    return NextResponse.json({ logs: [], notionConnected: true, error: err.message })
  }
}
