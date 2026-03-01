import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, title, location } = body

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(status && { status }),
      ...(title && { title: title.trim() }),
      ...(location !== undefined && { location: location?.trim() || null }),
    },
    select: { id: true, title: true, location: true, status: true },
  })

  return NextResponse.json({ project: updated })
}
