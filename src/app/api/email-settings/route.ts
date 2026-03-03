import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { encrypt } from '@/lib/encrypt'
import nodemailer from 'nodemailer'

// GET — return current SMTP settings (password field omitted)
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailFromName: true, emailFromAddr: true,
      emailSmtpHost: true, emailSmtpPort: true, emailSmtpSecure: true,
      emailSmtpUser: true,
      emailSmtpPassEnc: true, // used to detect if password is set, but not returned as plain text
    },
  })

  return NextResponse.json({
    emailFromName: user?.emailFromName ?? '',
    emailFromAddr: user?.emailFromAddr ?? '',
    emailSmtpHost: user?.emailSmtpHost ?? '',
    emailSmtpPort: user?.emailSmtpPort ?? 587,
    emailSmtpSecure: user?.emailSmtpSecure ?? true,
    emailSmtpUser: user?.emailSmtpUser ?? '',
    hasPassword: !!user?.emailSmtpPassEnc,
  })
}

// PATCH — save SMTP settings
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { emailFromName, emailFromAddr, emailSmtpHost, emailSmtpPort, emailSmtpSecure, emailSmtpUser, emailSmtpPass } = body

  const data: Record<string, any> = {
    emailFromName: emailFromName || null,
    emailFromAddr: emailFromAddr || null,
    emailSmtpHost: emailSmtpHost || null,
    emailSmtpPort: emailSmtpPort ? Number(emailSmtpPort) : null,
    emailSmtpSecure: !!emailSmtpSecure,
    emailSmtpUser: emailSmtpUser || null,
  }

  // Only update the password if a new one is provided
  if (emailSmtpPass) {
    data.emailSmtpPassEnc = encrypt(emailSmtpPass)
  }

  await prisma.user.update({ where: { id: userId }, data })
  return NextResponse.json({ ok: true })
}

// POST /api/email-settings/test — send a test email using current settings
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { host, port, secure, user: smtpUser, pass, fromName, fromEmail, toEmail } = body

  if (!host || !smtpUser || !pass || !fromEmail || !toEmail) {
    return NextResponse.json({ error: 'All SMTP fields required for test' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port) || 587,
      secure: !!secure,
      auth: { user: smtpUser, pass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${fromName || 'ProFieldHub'}" <${fromEmail}>`,
      to: toEmail,
      subject: 'ProFieldHub — SMTP Test Email',
      html: `<p style="font-family:sans-serif;color:#111;">Your SMTP settings are working correctly. You can now send daily field reports directly from <strong>${fromEmail}</strong>.</p>`,
      text: 'Your SMTP settings are working correctly.',
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'SMTP connection failed' }, { status: 400 })
  }
}
