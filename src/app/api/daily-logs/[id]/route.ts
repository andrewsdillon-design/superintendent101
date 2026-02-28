import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// GET /api/daily-logs/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = await prisma.dailyLog.findFirst({
    where: { id: params.id, userId },
    include: { project: { select: { id: true, title: true } } },
  })

  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ log })
}

// PATCH /api/daily-logs/[id] — update a log
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.dailyLog.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()

  const log = await prisma.dailyLog.update({
    where: { id: params.id },
    data: {
      ...(body.weather !== undefined && { weather: body.weather }),
      ...(body.crewCounts !== undefined && { crewCounts: body.crewCounts }),
      ...(body.workPerformed !== undefined && { workPerformed: body.workPerformed }),
      ...(body.deliveries !== undefined && { deliveries: body.deliveries }),
      ...(body.inspections !== undefined && { inspections: body.inspections }),
      ...(body.issues !== undefined && { issues: body.issues }),
      ...(body.safetyNotes !== undefined && { safetyNotes: body.safetyNotes }),
      ...(body.photoUrls !== undefined && { photoUrls: body.photoUrls }),
      ...(body.signatureUrl !== undefined && { signatureUrl: body.signatureUrl }),
    },
  })

  return NextResponse.json({ log })
}

// DELETE /api/daily-logs/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.dailyLog.findFirst({ where: { id: params.id, userId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.dailyLog.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
