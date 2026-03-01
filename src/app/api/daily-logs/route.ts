import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// GET /api/daily-logs — list logs for the authenticated user
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const limit = parseInt(searchParams.get('limit') ?? '50')
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const showArchived = searchParams.get('archived') === 'true'

  const where = {
    userId,
    archived: showArchived ? true : false,
    ...(projectId ? { projectId } : {}),
  }

  const logs = await prisma.dailyLog.findMany({
    where,
    orderBy: { date: 'desc' },
    take: limit,
    skip: offset,
    include: {
      project: { select: { id: true, title: true } },
    },
  })

  const total = await prisma.dailyLog.count({ where })

  return NextResponse.json({ logs, total })
}

// POST /api/daily-logs — create a new daily log
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    projectId,
    date,
    weather,
    crewCounts,
    workPerformed,
    deliveries,
    inspections,
    issues,
    safetyNotes,
    photoUrls,
    signatureUrl,
    transcript,
    address,
    permitNumber,
    rfi,
  } = body

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  // Verify project belongs to user if provided
  if (projectId) {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const log = await prisma.dailyLog.create({
    data: {
      userId,
      projectId: projectId ?? null,
      date: new Date(date),
      weather: weather ?? '',
      crewCounts: crewCounts ?? {},
      workPerformed: workPerformed ?? '',
      deliveries: deliveries ?? '',
      inspections: inspections ?? '',
      issues: issues ?? '',
      safetyNotes: safetyNotes ?? '',
      photoUrls: photoUrls ?? [],
      signatureUrl: signatureUrl ?? null,
      transcript: transcript ?? null,
      address: address ?? null,
      permitNumber: permitNumber ?? null,
      rfi: rfi ?? '',
    },
    include: {
      project: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json({ log }, { status: 201 })
}
