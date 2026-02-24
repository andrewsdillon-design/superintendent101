import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ projects })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, description, location, type, sqft, status, startDate, endDate } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      location: location?.trim() || null,
      type: type?.trim() || null,
      sqft: sqft ? parseInt(sqft) : null,
      status: status || 'ACTIVE',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  })

  return NextResponse.json({ project }, { status: 201 })
}
