import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// PATCH /api/mobile/daily-logs/[id] — update archived status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = await prisma.dailyLog.findFirst({
    where: { id: params.id, userId },
  })
  if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  const body = await req.json()
  const { archived } = body

  if (typeof archived !== 'boolean') {
    return NextResponse.json({ error: 'archived must be a boolean' }, { status: 400 })
  }

  const updated = await prisma.dailyLog.update({
    where: { id: params.id },
    data: { archived },
  })

  return NextResponse.json({ log: updated })
}

// DELETE /api/mobile/daily-logs/[id] — permanently delete a log
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = await prisma.dailyLog.findFirst({
    where: { id: params.id, userId },
  })
  if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  await prisma.dailyLog.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
