import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

interface BulkLogInput {
  projectId?: string
  date: string
  weather?: string
  crewCounts?: Record<string, number>
  workPerformed?: string
  deliveries?: string
  inspections?: string
  issues?: string
  safetyNotes?: string
  address?: string
  permitNumber?: string
  rfi?: string
}

// POST /api/daily-logs/bulk — create multiple daily logs at once
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { logs } = body as { logs: BulkLogInput[] }

  if (!Array.isArray(logs) || logs.length === 0) {
    return NextResponse.json({ error: 'logs array is required and must be non-empty' }, { status: 400 })
  }

  if (logs.length > 20) {
    return NextResponse.json({ error: 'Maximum 20 logs per bulk request' }, { status: 400 })
  }

  // Validate all logs have dates
  for (const log of logs) {
    if (!log.date) {
      return NextResponse.json({ error: 'Each log must have a date' }, { status: 400 })
    }
  }

  // Verify all provided projectIds belong to this user
  const projectIds = Array.from(new Set(logs.map((l) => l.projectId).filter(Boolean) as string[]))
  if (projectIds.length > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds }, userId },
      select: { id: true },
    })
    const validIds = new Set(projects.map((p) => p.id))
    const invalid = projectIds.find((id) => !validIds.has(id))
    if (invalid) {
      return NextResponse.json({ error: `Project not found: ${invalid}` }, { status: 404 })
    }
  }

  const created = await prisma.$transaction(
    logs.map((log) =>
      prisma.dailyLog.create({
        data: {
          userId,
          projectId: log.projectId ?? null,
          date: new Date(log.date),
          weather: log.weather ?? '',
          crewCounts: log.crewCounts ?? {},
          workPerformed: log.workPerformed ?? '',
          deliveries: log.deliveries ?? '',
          inspections: log.inspections ?? '',
          issues: log.issues ?? '',
          safetyNotes: log.safetyNotes ?? '',
          address: log.address ?? null,
          permitNumber: log.permitNumber ?? null,
          rfi: log.rfi ?? '',
        },
        include: {
          project: { select: { id: true, title: true } },
        },
      })
    )
  )

  return NextResponse.json({ logs: created }, { status: 201 })
}
