import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, username, password, skills, yearsExperience } = body

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Email, username, and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })

    if (existing) {
      const field = existing.email === email ? 'email' : 'username'
      return NextResponse.json({ error: `That ${field} is already taken` }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const skillsArray = skills
      ? skills.split(',').map((s: string) => s.trim()).filter(Boolean)
      : []

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        name: [firstName, lastName].filter(Boolean).join(' ') || username,
        skills: skillsArray,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : null,
      },
      select: { id: true, email: true, username: true, name: true },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
