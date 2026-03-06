import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { decryptToken, refreshAccessToken, encryptToken, tokenExpiryDate, pushDailyLogToProcore } from '@/lib/procore'

// POST /api/integrations/procore/sync-project
// body: { projectId } — pushes all logs for a linked project to Procore
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, clearFirst } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { procoreAccessToken: true, procoreRefreshToken: true, procoreTokenExpiry: true },
    }),
    prisma.procoreProjectLink.findUnique({
      where: { userId_projectId: { userId, projectId } },
    }),
  ])

  if (!dbUser?.procoreAccessToken) return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  if (!link) return NextResponse.json({ error: 'Project not linked to Procore' }, { status: 422 })

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

  // If clearFirst: delete all existing Procore log entries for this project
  if (clearFirst) {
    const base = `${process.env.PROCORE_API_BASE ?? 'https://api.procore.com'}/rest/v1.0/projects/${link.procoreProjectId}`
    const qs = `?company_id=${link.procoreCompanyId}`
    const clearTypes = ['work_logs', 'manpower_logs', 'delivery_logs', 'inspection_logs',
                        'safety_violation_logs', 'notes_logs', 'equipment_logs', 'accident_logs', 'visitor_logs', 'weather_logs']
    for (const type of clearTypes) {
      try {
        const r = await fetch(`${base}/${type}${qs}`, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        })
        if (r.ok) {
          const items: any[] = await r.json()
          if (Array.isArray(items)) {
            for (const item of items) {
              try {
                await fetch(`${base}/${type}/${item.id}${qs}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${accessToken}` },
                })
              } catch {}
            }
          }
        }
      } catch {}
    }
  }

  // Get logs for this project (last 90 days, not archived)
  const since = new Date()
  since.setDate(since.getDate() - 90)
  const logs = await prisma.dailyLog.findMany({
    where: { userId, projectId, archived: false, date: { gte: since } },
    orderBy: { date: 'asc' },
  })

  let synced = 0
  const errors: string[] = []
  for (const log of logs) {
    try {
      await pushDailyLogToProcore(accessToken, link.procoreCompanyId, link.procoreProjectId, {
        date:          log.date,
        weather:       log.weather,
        crewCounts:    log.crewCounts as Record<string, number>,
        workPerformed: log.workPerformed,
        deliveries:    log.deliveries,
        inspections:   log.inspections,
        issues:        log.issues,
        safetyNotes:   log.safetyNotes,
        rfi:           log.rfi,
        equipment:     log.equipment ?? '',
        accidents:     log.accidents ?? '',
        visitors:      log.visitors ?? '',
      })
      synced++
    } catch (err: any) {
      errors.push(`${log.date.toISOString().split('T')[0]}: ${err?.message ?? 'failed'}`)
    }
  }

  return NextResponse.json({ synced, total: logs.length, errors })
}
