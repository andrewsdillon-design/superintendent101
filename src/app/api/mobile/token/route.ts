import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? '')
const EXPIRES_IN = '30d'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        passwordHash: true,
        subscription: true,
        role: true,
      },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      subscription: user.subscription,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(EXPIRES_IN)
      .sign(SECRET)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        subscription: user.subscription,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Mobile token error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
