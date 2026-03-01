import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

// GET /api/mobile/profile — returns builderType for current user
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { builderType: true },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ builderType: user.builderType })
}

// PATCH /api/mobile/profile — update builderType
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { builderType } = body

  if (!['RESIDENTIAL', 'COMMERCIAL'].includes(builderType)) {
    return NextResponse.json({ error: 'builderType must be RESIDENTIAL or COMMERCIAL' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { builderType },
    select: { id: true, builderType: true },
  })

  return NextResponse.json({ user })
}
