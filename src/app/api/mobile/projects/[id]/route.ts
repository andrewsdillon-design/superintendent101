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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const project = await prisma.project.findFirst({ where: { id: params.id, userId } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Unlink all logs from this project before deleting
  await prisma.dailyLog.updateMany({ where: { projectId: params.id }, data: { projectId: null } })
  await prisma.project.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { status, title, location, address, permitNumber, webPortalId, portalType, planNumber, elevation, electricalSide } = body

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
      ...(address !== undefined && { address: address?.trim() || null }),
      ...(permitNumber !== undefined && { permitNumber: permitNumber?.trim() || null }),
      ...(webPortalId !== undefined && { webPortalId: webPortalId?.trim() || null }),
      ...(portalType !== undefined && { portalType: portalType?.trim() || null }),
      ...(planNumber !== undefined && { planNumber: planNumber?.trim() || null }),
      ...(elevation !== undefined && { elevation: elevation?.trim() || null }),
      ...(electricalSide !== undefined && { electricalSide: electricalSide?.trim() || null }),
    },
    select: PROJECT_SELECT,
  })

  return NextResponse.json({ project: updated })
}
