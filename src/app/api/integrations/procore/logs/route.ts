import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { decryptToken, PROCORE_CONFIG } from '@/lib/procore'

const LOG_TYPES = [
  'work_logs',
  'manpower_logs',
  'delivery_logs',
  'inspection_logs',
  'safety_violation_logs',
  'notes_logs',
  'equipment_logs',
  'accident_logs',
  'visitor_logs',
  'weather_logs',
]

// GET /api/integrations/procore/logs?projectId={localProjectId}
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const localProjectId = searchParams.get('projectId')
  if (!localProjectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { procoreAccessToken: true } }),
    prisma.procoreProjectLink.findUnique({ where: { userId_projectId: { userId, projectId: localProjectId } } }),
  ])

  if (!dbUser?.procoreAccessToken) return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  if (!link) return NextResponse.json({ error: 'Project not linked' }, { status: 422 })

  const accessToken = decryptToken(dbUser.procoreAccessToken)
  const base = `${PROCORE_CONFIG.apiBase}/rest/v1.0/projects/${link.procoreProjectId}`
  const qs = `?company_id=${link.procoreCompanyId}`

  const results: Record<string, any[]> = {}

  await Promise.all(
    LOG_TYPES.map(async (type) => {
      try {
        const r = await fetch(`${base}/${type}${qs}`, {
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        })
        if (r.ok) {
          const data = await r.json()
          if (Array.isArray(data) && data.length > 0) results[type] = data
        }
      } catch {}
    })
  )

  return NextResponse.json({ logs: results, procoreProjectId: link.procoreProjectId })
}
