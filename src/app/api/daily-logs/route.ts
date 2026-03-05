import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { decryptToken, refreshAccessToken, encryptToken, tokenExpiryDate, pushDailyLogToProcore } from '@/lib/procore'
import { rateLimit } from '@/lib/rate-limit'

// GET /api/daily-logs — list logs for the authenticated user
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const showArchived = searchParams.get('archived') === 'true'

  const where = {
    userId,
    archived: showArchived ? true : false,
    ...(projectId === 'none' ? { projectId: null } : projectId ? { projectId } : {}),
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

// POST /api/daily-logs — create or upsert a daily log (one per user+project+date)
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`log-create:${userId}`, { limit: 60, windowMs: 60_000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

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
    lotNumber,
    permitNumber,
    rfi,
  } = body

  if (!date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  // Verify project belongs to user if provided; fetch location for auto lot#
  let projectLocation: string | null = null
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { location: true },
    })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    projectLocation = project.location
  }

  // Auto-populate permitNumber from project.location (lot#) when not explicitly provided
  const effectivePermitNumber = permitNumber?.trim() || projectLocation || null

  // Helper: append text with timestamp separator, skipping empty values
  function appendText(current: string, incoming: string | undefined | null): string {
    const inc = incoming?.trim() ?? ''
    if (!inc) return current ?? ''
    const cur = current?.trim() ?? ''
    if (!cur) return inc
    const ts = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    return `${cur}\n\n--- Update [${ts}] ---\n\n${inc}`
  }

  // Upsert: if a log already exists for this user+project+date, merge it
  if (projectId) {
    const existing = await prisma.dailyLog.findFirst({
      where: { userId, projectId, date: new Date(date) },
    })
    if (existing) {
      const updated = await prisma.dailyLog.update({
        where: { id: existing.id },
        data: {
          weather: weather?.trim() ? weather : existing.weather,
          crewCounts: crewCounts && Object.keys(crewCounts).length > 0 ? crewCounts : existing.crewCounts,
          workPerformed: appendText(existing.workPerformed, workPerformed),
          deliveries: appendText(existing.deliveries, deliveries),
          inspections: appendText(existing.inspections, inspections),
          issues: appendText(existing.issues, issues),
          safetyNotes: appendText(existing.safetyNotes, safetyNotes),
          rfi: appendText(existing.rfi, rfi),
          photoUrls: [...((existing.photoUrls as string[]) ?? []), ...(photoUrls ?? [])],
          address: address?.trim() ? address : existing.address,
          lotNumber: lotNumber?.trim() ? lotNumber : existing.lotNumber,
          permitNumber: effectivePermitNumber || existing.permitNumber,
          transcript: transcript?.trim()
            ? appendText(existing.transcript ?? '', transcript)
            : existing.transcript,
          ...(signatureUrl ? { signatureUrl } : {}),
        },
        include: { project: { select: { id: true, title: true } } },
      })
      return NextResponse.json({ log: updated })
    }
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
      lotNumber: lotNumber ?? null,
      permitNumber: effectivePermitNumber,
      rfi: rfi ?? '',
    },
    include: {
      project: { select: { id: true, title: true } },
    },
  })

  // Fire-and-forget Procore push (non-blocking)
  if (log.projectId) {
    pushToProcore(userId, log).catch(err => console.error('[Procore auto-push]', err))
  }

  return NextResponse.json({ log }, { status: 201 })
}

async function pushToProcore(userId: string, log: { id: string; projectId: string | null; date: Date; crewCounts: any; workPerformed: string; deliveries: string; inspections: string; issues: string; safetyNotes: string; rfi: string }) {
  if (!log.projectId) return

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { procoreAccessToken: true, procoreRefreshToken: true, procoreTokenExpiry: true },
    }),
    prisma.procoreProjectLink.findUnique({
      where: { userId_projectId: { userId, projectId: log.projectId } },
    }),
  ])

  if (!dbUser?.procoreAccessToken || !link) return

  let accessToken = decryptToken(dbUser.procoreAccessToken)

  if (dbUser.procoreTokenExpiry && new Date() >= dbUser.procoreTokenExpiry) {
    const tokens = await refreshAccessToken(dbUser.procoreRefreshToken!)
    accessToken = tokens.access_token
    await prisma.user.update({
      where: { id: userId },
      data: {
        procoreAccessToken:  encryptToken(tokens.access_token),
        procoreRefreshToken: encryptToken(tokens.refresh_token),
        procoreTokenExpiry:  tokenExpiryDate(tokens.expires_in),
      },
    })
  }

  await pushDailyLogToProcore(accessToken, link.procoreCompanyId, link.procoreProjectId, {
    date:          log.date,
    crewCounts:    log.crewCounts as Record<string, number>,
    workPerformed: log.workPerformed,
    deliveries:    log.deliveries,
    inspections:   log.inspections,
    issues:        log.issues,
    safetyNotes:   log.safetyNotes,
    rfi:           log.rfi,
  })
}
