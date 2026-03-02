import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// GET /api/daily-logs/today?projectId=xxx
// Returns today's daily log for the given project (or any project if none given), or null
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get('projectId')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const log = await prisma.dailyLog.findFirst({
    where: {
      userId,
      ...(projectId ? { projectId } : {}),
      date: { gte: today, lt: tomorrow },
      archived: false,
    },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ log: log ?? null })
}
