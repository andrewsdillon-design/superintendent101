import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const rl = rateLimit(`forgot-password:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return success to avoid email enumeration
  if (!user) {
    return NextResponse.json({ success: true })
  }

  await prisma.passwordResetToken.deleteMany({ where: { email } })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, email, expiresAt },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
  await sendPasswordResetEmail({ toEmail: email, resetUrl })

  return NextResponse.json({ success: true })
}
