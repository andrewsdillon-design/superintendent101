import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendCompanyWelcomeEmail } from '@/lib/email'

// GET /api/admin/companies/[id]/members
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.companyMember.findMany({
    where: { companyId: params.id },
    include: { user: { select: { id: true, name: true, email: true, username: true, subscription: true } } },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ members })
}

// POST /api/admin/companies/[id]/members — add a user by email or userId
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, userId, role, sendWelcome = true } = body

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { _count: { select: { members: true } } },
  })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  if (company._count.members >= company.seats) {
    return NextResponse.json({ error: `Seat limit reached (${company.seats})` }, { status: 400 })
  }

  const user = email
    ? await prisma.user.findUnique({ where: { email } })
    : userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : null

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const existing = await prisma.companyMember.findUnique({
    where: { companyId_userId: { companyId: params.id, userId: user.id } },
  })
  if (existing) return NextResponse.json({ error: 'User is already a member' }, { status: 409 })

  const member = await prisma.companyMember.create({
    data: {
      companyId: params.id,
      userId: user.id,
      role: role === 'OWNER' ? 'OWNER' : 'MEMBER',
    },
    include: { user: { select: { id: true, name: true, email: true, username: true, subscription: true } } },
  })

  // Send branded welcome email with password setup link
  if (sendWelcome) {
    try {
      await sendCompanyWelcomeEmail({
        toEmail: user.email,
        toName: user.name,
        companyName: company.name,
        companyLogoUrl: company.logoUrl,
        companyBrandColor: company.brandColor,
      })
    } catch (err) {
      console.error('Welcome email failed:', err)
      // Non-fatal — member was still added
    }
  }

  return NextResponse.json({ member }, { status: 201 })
}
