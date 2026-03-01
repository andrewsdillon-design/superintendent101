import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendCompanyWelcomeEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

function emailToUsername(email: string): string {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base || 'user'
  let i = 1
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base}${i++}`
  }
  return candidate
}

// GET /api/admin/companies/[id]/members
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.companyMember.findMany({
    where: { companyId: params.id },
    include: {
      user: { select: { id: true, name: true, email: true, username: true, subscription: true, betaTester: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({ members })
}

// POST /api/admin/companies/[id]/members
// Creates the user account if it doesn't exist, then adds them to the company.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, name, role, sendWelcome = true } = body

  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { _count: { select: { members: true } } },
  })
  if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  if (company._count.members >= company.seats) {
    return NextResponse.json({ error: `Seat limit reached (${company.seats})` }, { status: 400 })
  }

  // Find or create the user
  let user = await prisma.user.findUnique({ where: { email: email.trim() } })
  let accountCreated = false

  if (!user) {
    // Create account with a random temp password — they'll set their own via welcome email
    const tempPassword = randomBytes(16).toString('hex')
    const passwordHash = await bcrypt.hash(tempPassword, 12)
    const username = await uniqueUsername(emailToUsername(email.trim()))

    user = await prisma.user.create({
      data: {
        email: email.trim(),
        username,
        name: name?.trim() || null,
        passwordHash,
        subscription: company.grantsBetaTester ? 'DUST_LOGS' : 'FREE',
        betaTester: company.grantsBetaTester,
      },
    })
    accountCreated = true
  }

  // Check for existing membership
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
    include: {
      user: { select: { id: true, name: true, email: true, username: true, subscription: true, betaTester: true } },
    },
  })

  // If existing user + grantsBetaTester, upgrade them now
  if (!accountCreated && company.grantsBetaTester) {
    await prisma.user.update({
      where: { id: user.id },
      data: { betaTester: true, subscription: 'DUST_LOGS' },
    })
  }

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
    }
  }

  return NextResponse.json({ member, accountCreated }, { status: 201 })
}
