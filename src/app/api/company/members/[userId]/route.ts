import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function getOwnerCompanyId(ownerId: string) {
  const membership = await prisma.companyMember.findFirst({
    where: { userId: ownerId, role: 'OWNER' },
    select: { companyId: true },
  })
  return membership?.companyId ?? null
}

// DELETE /api/company/members/[userId] — owner removes a member
export async function DELETE(
  _: Request,
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  const ownerId = (session?.user as any)?.id
  if (!ownerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getOwnerCompanyId(ownerId)
  if (!companyId) return NextResponse.json({ error: 'No company found' }, { status: 404 })

  // Cannot remove yourself
  if (params.userId === ownerId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await prisma.companyMember.delete({
    where: { companyId_userId: { companyId, userId: params.userId } },
  })

  return NextResponse.json({ ok: true })
}
