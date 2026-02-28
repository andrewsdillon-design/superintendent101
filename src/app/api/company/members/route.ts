import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function getOwnerCompany(userId: string) {
  const membership = await prisma.companyMember.findFirst({
    where: { userId, role: 'OWNER' },
    include: { company: { include: { _count: { select: { members: true } } } } },
  })
  return membership?.company ?? null
}

// GET /api/company/members — list members of the owner's company
export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await getOwnerCompany(userId)
  if (!company) return NextResponse.json({ error: 'No company found' }, { status: 404 })

  const members = await prisma.companyMember.findMany({
    where: { companyId: company.id },
    include: { user: { select: { id: true, name: true, email: true, username: true, subscription: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ company, members })
}

// POST /api/company/members — add a member by email
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const company = await getOwnerCompany(userId)
  if (!company) return NextResponse.json({ error: 'No company found' }, { status: 404 })

  if (company._count.members >= company.seats) {
    return NextResponse.json({ error: `Seat limit reached (${company.seats})` }, { status: 400 })
  }

  const { email } = await request.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const target = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (!target) return NextResponse.json({ error: 'No user with that email' }, { status: 404 })

  const existing = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: company.id, userId: target.id } },
  })
  if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 })

  const member = await prisma.companyMember.create({
    data: { companyId: company.id, userId: target.id, role: 'MEMBER' },
    include: { user: { select: { id: true, name: true, email: true, username: true, subscription: true } } },
  })

  return NextResponse.json({ member }, { status: 201 })
}
