import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// PATCH /api/admin/companies/[id]/members/[userId] — change role
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { role } = await request.json()
  const member = await prisma.companyMember.update({
    where: { companyId_userId: { companyId: params.id, userId: params.userId } },
    data: { role: role === 'OWNER' ? 'OWNER' : 'MEMBER' },
  })

  return NextResponse.json({ member })
}

// DELETE /api/admin/companies/[id]/members/[userId]
export async function DELETE(
  _: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.companyMember.delete({
    where: { companyId_userId: { companyId: params.id, userId: params.userId } },
  })

  return NextResponse.json({ ok: true })
}
