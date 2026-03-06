import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { decryptToken, PROCORE_CONFIG } from '@/lib/procore'

// GET  /api/integrations/procore/documents/comments?projectId=&docId=
// POST /api/integrations/procore/documents/comments  body: { projectId, docId, body }
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const localProjectId = searchParams.get('projectId')
  const docId = searchParams.get('docId')
  if (!localProjectId || !docId) return NextResponse.json({ error: 'projectId and docId required' }, { status: 400 })

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { procoreAccessToken: true } }),
    prisma.procoreProjectLink.findUnique({ where: { userId_projectId: { userId, projectId: localProjectId } } }),
  ])

  if (!dbUser?.procoreAccessToken) return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  if (!link) return NextResponse.json({ error: 'Project not linked' }, { status: 422 })

  const accessToken = decryptToken(dbUser.procoreAccessToken)
  const url = `${PROCORE_CONFIG.apiBase}/rest/v1.0/projects/${link.procoreProjectId}/documents/${docId}/comments?company_id=${link.procoreCompanyId}`
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })

  if (!r.ok) {
    const text = await r.text()
    return NextResponse.json({ error: `Procore ${r.status}: ${text}` }, { status: r.status })
  }

  return NextResponse.json({ comments: await r.json() })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId: localProjectId, docId, body: commentBody } = await req.json()
  if (!localProjectId || !docId || !commentBody?.trim())
    return NextResponse.json({ error: 'projectId, docId, body required' }, { status: 400 })

  const [dbUser, link] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { procoreAccessToken: true } }),
    prisma.procoreProjectLink.findUnique({ where: { userId_projectId: { userId, projectId: localProjectId } } }),
  ])

  if (!dbUser?.procoreAccessToken) return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  if (!link) return NextResponse.json({ error: 'Project not linked' }, { status: 422 })

  const accessToken = decryptToken(dbUser.procoreAccessToken)
  const url = `${PROCORE_CONFIG.apiBase}/rest/v1.0/projects/${link.procoreProjectId}/documents/${docId}/comments?company_id=${link.procoreCompanyId}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment: { body: commentBody } }),
  })

  if (!r.ok) {
    const text = await r.text()
    return NextResponse.json({ error: `Procore ${r.status}: ${text}` }, { status: r.status })
  }

  return NextResponse.json({ comment: await r.json() })
}
