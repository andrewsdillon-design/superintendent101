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

  let since: Date
  if (period === 'all') {
    since = new Date(0)
  } else if (period === '90d') {
    since = new Date(Date.now() - 90 * 86400000)
  } else if (period === 'today') {
    since = new Date()
    since.setUTCHours(0, 0, 0, 0)
  } else {
    since = new Date(Date.now() - 30 * 86400000)
  }

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
  const totalCostUsd = logs.reduce((sum, l) => sum + Number(l.costUsd), 0)
  const uniqueUserIds = new Set(logs.map(l => l.userId))

  // Dynamically group by service/model name — auto-detects any model used
  const serviceMap = new Map<string, { calls: number; costUsd: number }>()
  for (const log of logs) {
    if (!serviceMap.has(log.service)) serviceMap.set(log.service, { calls: 0, costUsd: 0 })
    const s = serviceMap.get(log.service)!
    s.calls++
    s.costUsd += Number(log.costUsd)
  }
  const byService = Array.from(serviceMap.entries())
    .map(([service, { calls, costUsd }]) => ({ service, calls, costUsd }))
    .sort((a, b) => b.costUsd - a.costUsd)

  const overview = {
    totalCostUsd,
    totalCalls: logs.length,
    byService,
    uniqueActiveUsers: uniqueUserIds.size,
    totalUsers: userCount,
    totalJobSites: jobSiteCount,
    totalLogs: logCount,
  }

  // ── Per-user breakdown ────────────────────────────────────────────────
  const byUserMap = new Map<string, {
    userId: string; name: string | null; email: string; username: string
    subscription: string; calls: number; transcribeCalls: number; structureCalls: number
    costUsd: number; lastUsed: Date
  }>()

  for (const log of logs) {
    const u = log.user
    if (!byUserMap.has(u.id)) {
      byUserMap.set(u.id, {
        userId: u.id, name: u.name, email: u.email, username: u.username,
        subscription: u.subscription, calls: 0, transcribeCalls: 0,
        structureCalls: 0, costUsd: 0, lastUsed: log.createdAt,
      })
    }
    const row = byUserMap.get(u.id)!
    row.calls++
    row.costUsd += Number(log.costUsd)
    if (log.action === 'transcribe') row.transcribeCalls++
    else if (log.action === 'structure') row.structureCalls++
    if (log.createdAt > row.lastUsed) row.lastUsed = log.createdAt
  }

  const byUser = Array.from(byUserMap.values()).sort((a, b) => b.costUsd - a.costUsd)

  // ── Daily breakdown ────────────────────────────────────────────────────
  const days = period === '90d' ? 90 : period === 'today' ? 1 : 30
  const dailyMap = new Map<string, { date: string; costUsd: number; calls: number }>()
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
