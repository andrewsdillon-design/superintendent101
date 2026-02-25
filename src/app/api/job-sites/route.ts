import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const jobSites = await prisma.jobSite.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ jobSites })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, address, permitNumber, webPortalId, portalType, jobType, notes } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Job site name required' }, { status: 400 })
  }

  const jobSite = await prisma.jobSite.create({
    data: {
      userId: (session.user as any).id,
      name: name.trim(),
      address: address?.trim() || null,
      permitNumber: permitNumber?.trim() || null,
      webPortalId: webPortalId?.trim() || null,
      portalType: portalType?.trim() || null,
      jobType: jobType?.trim() || null,
      notes: notes?.trim() || null,
    },
  })

  return NextResponse.json({ jobSite })
}
