import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  decryptToken, refreshAccessToken, encryptToken,
  tokenExpiryDate, pushDailyLogToProcore,
} from '@/lib/procore'

// POST /api/integrations/procore/push/[logId] — manually push a log to Procore
export async function POST(req: NextRequest, { params }: { params: { logId: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = await prisma.dailyLog.findFirst({
    where: { id: params.logId, userId: user.id },
  })
  if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  if (!log.projectId) {
    return NextResponse.json({ error: 'This log has no project — link a project to Procore first.' }, { status: 422 })
  }

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { procoreAccessToken: true, procoreRefreshToken: true, procoreTokenExpiry: true },
    }),
    prisma.procoreProjectLink.findUnique({
      where: { userId_projectId: { userId: user.id, projectId: log.projectId } },
    }),
  ])

  if (!dbUser?.procoreAccessToken) {
    return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  }
  if (!link) {
    return NextResponse.json({ error: 'This project is not linked to a Procore project. Go to Profile → Procore to link it.' }, { status: 422 })
  }

  let accessToken = decryptToken(dbUser.procoreAccessToken)

  if (dbUser.procoreTokenExpiry && new Date() >= dbUser.procoreTokenExpiry) {
    const tokens = await refreshAccessToken(dbUser.procoreRefreshToken!)
    accessToken = tokens.access_token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        procoreAccessToken:  encryptToken(tokens.access_token),
        procoreRefreshToken: encryptToken(tokens.refresh_token),
        procoreTokenExpiry:  tokenExpiryDate(tokens.expires_in),
      },
    })
  }

  const pushed = await pushDailyLogToProcore(
    accessToken,
    link.procoreCompanyId,
    link.procoreProjectId,
    {
      date:          log.date,
      weather:       log.weather ?? '',
      crewCounts:    log.crewCounts as Record<string, number>,
      crewPermits:   ((log as any).crewPermits ?? {}) as Record<string, string>,
      workPerformed: log.workPerformed,
      deliveries:    log.deliveries,
      inspections:   log.inspections,
      issues:        log.issues,
      safetyNotes:   log.safetyNotes,
      rfi:           log.rfi,
      equipment:     (log as any).equipment ?? '',
      accidents:     (log as any).accidents ?? '',
      visitors:      (log as any).visitors ?? '',
    },
  )

  return NextResponse.json({ pushed })
}
