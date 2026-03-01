import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, email: true, username: true, role: true,
      subscription: true, isMentor: true, location: true, bio: true,
      yearsExperience: true, createdAt: true, betaTester: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ user })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { role, subscription, betaTester } = body

  const data: Record<string, unknown> = {}
  if (role && ['MEMBER', 'MENTOR', 'ADMIN'].includes(role)) data.role = role
  if (subscription && ['FREE', 'PRO', 'DUST_LOGS'].includes(subscription)) data.subscription = subscription
  if (betaTester !== undefined) {
    data.betaTester = Boolean(betaTester)
    // Granting beta = automatically upgrade to DUST_LOGS
    if (betaTester === true) data.subscription = 'DUST_LOGS'
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, subscription: true, betaTester: true },
  })

  return NextResponse.json({ user })
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}
