import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// POST /api/mobile/projects/share — create a share link for a project
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, label, expiresInDays } = await req.json()
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Verify project belongs to user
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const share = await prisma.projectShare.create({
    data: { projectId, label: label?.trim() || null, expiresAt },
  })

  const shareUrl = `https://profieldhub.com/share/${share.token}`
  return NextResponse.json({ share: { ...share, shareUrl } }, { status: 201 })
}

// GET /api/mobile/projects/share?projectId=xxx — list shares for a project
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const shares = await prisma.projectShare.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  })

  const base = 'https://profieldhub.com/share'
  return NextResponse.json({
    shares: shares.map(s => ({ ...s, shareUrl: `${base}/${s.token}` })),
  })
}

// DELETE /api/mobile/projects/share?shareId=xxx — revoke a share link
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const shareId = new URL(req.url).searchParams.get('shareId')
  if (!shareId) return NextResponse.json({ error: 'shareId required' }, { status: 400 })

  // Verify ownership via project
  const share = await prisma.projectShare.findFirst({
    where: { id: shareId },
    include: { project: { select: { userId: true } } },
  })
  if (!share || share.project.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.projectShare.delete({ where: { id: shareId } })
  return NextResponse.json({ ok: true })
}
