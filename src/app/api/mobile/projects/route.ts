import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projects = await prisma.project.findMany({
    where: { userId, status: { not: 'COMPLETED' } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, location: true, status: true },
  })

  return NextResponse.json({ projects })
}
