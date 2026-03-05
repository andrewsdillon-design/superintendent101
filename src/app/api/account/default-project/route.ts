import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { projectId } = body

  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  // Verify project belongs to user
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  await prisma.user.update({ where: { id: userId }, data: { defaultProjectId: projectId } })

  return NextResponse.json({ ok: true })
}
