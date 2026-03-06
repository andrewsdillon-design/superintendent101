import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { userId: true },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Detach daily logs instead of deleting them
  await prisma.dailyLog.updateMany({
    where: { projectId: params.id },
    data: { projectId: null },
  })

  await prisma.project.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
