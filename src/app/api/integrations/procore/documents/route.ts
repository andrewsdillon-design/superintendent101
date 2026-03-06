import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { decryptToken, PROCORE_CONFIG } from '@/lib/procore'

// GET /api/integrations/procore/documents?projectId={localProjectId}&folderId={id}
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const localProjectId = searchParams.get('projectId')
  const folderId = searchParams.get('folderId') // optional — drill into folder

  if (!localProjectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { procoreAccessToken: true },
    }),
    prisma.procoreProjectLink.findUnique({
      where: { userId_projectId: { userId, projectId: localProjectId } },
    }),
  ])

  if (!dbUser?.procoreAccessToken) return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  if (!link) return NextResponse.json({ error: 'Project not linked' }, { status: 422 })

  const accessToken = decryptToken(dbUser.procoreAccessToken)
  const qs = new URLSearchParams({ company_id: String(link.procoreCompanyId) })
  if (folderId) qs.set('parent_id', folderId)

  const url = `${PROCORE_CONFIG.apiBase}/rest/v1.0/projects/${link.procoreProjectId}/documents?${qs}`
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })

  if (!r.ok) {
    const text = await r.text()
    return NextResponse.json({ error: `Procore ${r.status}: ${text}` }, { status: r.status })
  }

  const data = await r.json()
  return NextResponse.json({ documents: data })
}
