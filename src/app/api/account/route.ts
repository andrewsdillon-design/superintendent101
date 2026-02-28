import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { rm } from 'fs/promises'
import path from 'path'
import bcrypt from 'bcryptjs'

// GET /api/account — return current user profile
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      bio: true,
      location: true,
      skills: true,
      yearsExperience: true,
      role: true,
      subscription: true,
      createdAt: true,
      _count: {
        select: { dailyLogs: true, projects: true },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ user })
}

// DELETE /api/account — permanently delete account and all user data
// Requires password confirmation in the request body.
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let password: string
  try {
    const body = await req.json()
    password = body.password
  } catch {
    return NextResponse.json({ error: 'Request body required' }, { status: 400 })
  }

  if (!password) {
    return NextResponse.json({ error: 'Password confirmation required' }, { status: 400 })
  }

  // Fetch user with password hash for confirmation
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  })

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
  }

  // Delete photo files from disk before removing DB records
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId)
    await rm(uploadDir, { recursive: true, force: true })
  } catch {
    // Non-fatal — continue with DB deletion even if disk cleanup fails
  }

  // Delete user — Prisma cascade handles: DailyLog, Project, Post, Comment,
  // Like, Message, Booking, AudioLog, JobSite, ApiUsageLog
  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({
    ok: true,
    message: 'Account and all associated data permanently deleted.',
  })
}
