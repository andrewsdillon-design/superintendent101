import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

const PROJECT_SELECT = {
  id: true,
  title: true,
  location: true,
  status: true,
  address: true,
  permitNumber: true,
  webPortalId: true,
  portalType: true,
  planNumber: true,
  elevation: true,
  electricalSide: true,
} as const

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const all = new URL(req.url).searchParams.get('all') === '1'

  const projects = await prisma.project.findMany({
    where: all ? { userId } : { userId, status: { not: 'COMPLETED' } },
    orderBy: { createdAt: 'desc' },
    select: PROJECT_SELECT,
  })

  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, location, address, permitNumber, webPortalId, portalType, planNumber, elevation, electricalSide } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      userId,
      title: title.trim(),
      location: location?.trim() || null,
      address: address?.trim() || null,
      permitNumber: permitNumber?.trim() || null,
      webPortalId: webPortalId?.trim() || null,
      portalType: portalType?.trim() || null,
      planNumber: planNumber?.trim() || null,
      elevation: elevation?.trim() || null,
      electricalSide: electricalSide?.trim() || null,
      status: 'ACTIVE',
    },
    select: PROJECT_SELECT,
  })

  return NextResponse.json({ project }, { status: 201 })
}
