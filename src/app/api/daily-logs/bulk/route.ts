import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { rateLimit } from '@/lib/rate-limit'

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
  lotNumber?: string
  permitNumber?: string
  rfi?: string
}

// POST /api/daily-logs/bulk — create multiple daily logs at once
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`bulk-log:${userId}`, { limit: 40, windowMs: 60_000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

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

  function appendText(current: string, incoming: string | undefined | null): string {
    const inc = incoming?.trim() ?? ''
    if (!inc) return current ?? ''
    const cur = current?.trim() ?? ''
    if (!cur) return inc
    const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    return `${cur}\n\n--- Update [${ts}] ---\n\n${inc}`
  }

  const results = await prisma.$transaction(async (tx) => {
    const out = []
    // Track projectId+date combos already handled in this batch.
    // If the same combo appears more than once (e.g. multiple lots assigned to one project),
    // subsequent entries must create new records rather than upsert into the same one.
    const seenKeys = new Set<string>()

    for (const log of logs) {
      const batchKey = `${log.projectId ?? '_'}:${log.date}`
      const isFirstInBatch = !seenKeys.has(batchKey)
      seenKeys.add(batchKey)

      const existing = (log.projectId && isFirstInBatch)
        ? await tx.dailyLog.findFirst({
            where: { userId, projectId: log.projectId, date: new Date(log.date) },
          })
        : null

      if (existing) {
        const updated = await tx.dailyLog.update({
          where: { id: existing.id },
          data: {
            weather: log.weather?.trim() ? log.weather : existing.weather,
            crewCounts: log.crewCounts && Object.keys(log.crewCounts).length > 0 ? log.crewCounts : existing.crewCounts,
            workPerformed: appendText(existing.workPerformed, log.workPerformed),
            deliveries: appendText(existing.deliveries, log.deliveries),
            inspections: appendText(existing.inspections, log.inspections),
            issues: appendText(existing.issues, log.issues),
            safetyNotes: appendText(existing.safetyNotes, log.safetyNotes),
            rfi: appendText(existing.rfi, log.rfi),
            address: log.address?.trim() ? log.address : existing.address,
            lotNumber: log.lotNumber?.trim() ? log.lotNumber : existing.lotNumber,
            permitNumber: log.permitNumber?.trim() ? log.permitNumber : existing.permitNumber,
          },
          include: { project: { select: { id: true, title: true } } },
        })
        out.push(updated)
      } else {
        const created = await tx.dailyLog.create({
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
            lotNumber: log.lotNumber ?? null,
            permitNumber: log.permitNumber ?? null,
            rfi: log.rfi ?? '',
          },
          include: { project: { select: { id: true, title: true } } },
        })
        out.push(created)
      }
    }
    return out
  })

  return NextResponse.json({ logs: results }, { status: 201 })
}
