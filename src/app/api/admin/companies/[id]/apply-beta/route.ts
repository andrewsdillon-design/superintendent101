import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/admin/companies/[id]/apply-beta
// Grants betaTester + DUST_LOGS to every current member of the company
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.companyMember.findMany({
    where: { companyId: params.id },
    select: { userId: true },
  })

  const userIds = members.map(m => m.userId)

  await prisma.user.updateMany({
    where: { id: { in: userIds } },
    data: { betaTester: true, subscription: 'DUST_LOGS' },
  })

  return NextResponse.json({ updated: userIds.length })
}
