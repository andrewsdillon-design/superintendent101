import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '30d'

  const since = period === 'all' ? new Date(0) :
    period === '90d' ? new Date(Date.now() - 90 * 86400000) :
    new Date(Date.now() - 30 * 86400000)

  const [logs, userCount, jobSiteCount, logCount] = await Promise.all([
    prisma.apiUsageLog.findMany({
      where: { createdAt: { gte: since } },
      include: { user: { select: { id: true, name: true, email: true, username: true, subscription: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
    prisma.jobSite.count(),
    prisma.audioLog.count(),
  ])

  // ── Overview ──────────────────────────────────────────────────────────
  const totalCostUsd  = logs.reduce((sum, l) => sum + Number(l.costUsd), 0)
  const whisperLogs   = logs.filter(l => l.service === 'whisper')
  const gpt4oLogs     = logs.filter(l => l.service === 'gpt4o')
  const uniqueUserIds = new Set(logs.map(l => l.userId))

  const overview = {
    totalCostUsd,
    totalCalls:   logs.length,
    whisperCalls: whisperLogs.length,
    gpt4oCalls:   gpt4oLogs.length,
    uniqueActiveUsers: uniqueUserIds.size,
    totalUsers:   userCount,
    totalJobSites: jobSiteCount,
    totalLogs:    logCount,
    whisperCost:  whisperLogs.reduce((s, l) => s + Number(l.costUsd), 0),
    gpt4oCost:    gpt4oLogs.reduce((s, l) => s + Number(l.costUsd), 0),
  }

  // ── Per-user breakdown ────────────────────────────────────────────────
  const byUserMap = new Map<string, {
    userId: string; name: string | null; email: string; username: string
    subscription: string; calls: number; whisperCalls: number; gpt4oCalls: number
    costUsd: number; lastUsed: Date
  }>()

  for (const log of logs) {
    const u = log.user
    if (!byUserMap.has(u.id)) {
      byUserMap.set(u.id, {
        userId: u.id, name: u.name, email: u.email, username: u.username,
        subscription: u.subscription, calls: 0, whisperCalls: 0,
        gpt4oCalls: 0, costUsd: 0, lastUsed: log.createdAt,
      })
    }
    const row = byUserMap.get(u.id)!
    row.calls++
    row.costUsd += Number(log.costUsd)
    if (log.service === 'whisper') row.whisperCalls++
    if (log.service === 'gpt4o')   row.gpt4oCalls++
    if (log.createdAt > row.lastUsed) row.lastUsed = log.createdAt
  }

  const byUser = Array.from(byUserMap.values()).sort((a, b) => b.costUsd - a.costUsd)

  // ── Daily breakdown (last 30 days) ────────────────────────────────────
  const dailyMap = new Map<string, { date: string; costUsd: number; calls: number }>()
  const days = period === '90d' ? 90 : 30
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    dailyMap.set(d, { date: d, costUsd: 0, calls: 0 })
  }
  for (const log of logs) {
    const d = log.createdAt.toISOString().split('T')[0]
    if (dailyMap.has(d)) {
      dailyMap.get(d)!.costUsd += Number(log.costUsd)
      dailyMap.get(d)!.calls++
    }
  }
  const daily = Array.from(dailyMap.values())

  // ── Recent activity (last 50) ─────────────────────────────────────────
  const recent = logs.slice(0, 50).map(l => ({
    id: l.id,
    service: l.service,
    action: l.action,
    costUsd: Number(l.costUsd),
    projectName: l.projectName,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    fileSizeBytes: l.fileSizeBytes,
    createdAt: l.createdAt,
    user: { name: l.user.name, email: l.user.email, username: l.user.username },
  }))

  return NextResponse.json({ overview, byUser, daily, recent })
}
