import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendAdminWelcomeEmail } from '@/lib/email'

function emailToUsername(email: string) {
  return email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user'
}

async function uniqueUsername(base: string): Promise<string> {
  let candidate = base
  let i = 1
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${base}${i++}`
  }
  return candidate
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const search = searchParams.get('search') ?? ''
  const take = 50
  const skip = (page - 1) * take

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { username: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, username: true,
        role: true, subscription: true, betaTester: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ])

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / take) })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { name, email, role, subscription, sendWelcome = true } = body

  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (existing) return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })

  const tempPassword = randomBytes(16).toString('hex')
  const passwordHash = await bcrypt.hash(tempPassword, 12)
  const username = await uniqueUsername(emailToUsername(email.trim()))

  const user = await prisma.user.create({
    data: {
      email: email.trim(),
      username,
      name: name?.trim() || null,
      passwordHash,
      role: ['MEMBER', 'MENTOR', 'ADMIN'].includes(role) ? role : 'MEMBER',
      subscription: ['FREE', 'PRO', 'DUST_LOGS'].includes(subscription) ? subscription : 'FREE',
    },
    select: { id: true, name: true, email: true, username: true, role: true, subscription: true, betaTester: true, createdAt: true },
  })

  if (sendWelcome) {
    try {
      await sendAdminWelcomeEmail({ toEmail: user.email, toName: user.name })
    } catch (err) {
      console.error('Welcome email failed:', err)
    }
  }

  return NextResponse.json({ user }, { status: 201 })
}
