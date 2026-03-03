import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getResend } from '@/lib/email'

const DEVELOPER_EMAIL = process.env.DEVELOPER_REPORT_EMAIL ?? 'dillon@profieldhub.com'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const body = await req.json()
  const { category = 'bug', description, deviceInfo } = body

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 })
  }

  const userId = (session?.user as any)?.id ?? null
  const userEmail = session?.user?.email ?? null

  // Save to DB
  const report = await prisma.bugReport.create({
    data: {
      userId,
      userEmail,
      category,
      description: description.trim(),
      deviceInfo: deviceInfo ? JSON.stringify(deviceInfo) : null,
    },
  })

  // Email developers
  try {
    const categoryLabel = category === 'bug' ? '🐛 Bug Report' : category === 'feature' ? '💡 Feature Request' : '💬 Feedback'
    const deviceStr = deviceInfo
      ? Object.entries(deviceInfo).map(([k, v]) => `<strong>${k}:</strong> ${v}`).join('<br>')
      : 'Not provided'

    await getResend().emails.send({
      from: 'ProFieldHub <noreply@profieldhub.com>',
      to: DEVELOPER_EMAIL,
      subject: `[${categoryLabel}] ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#f97316;margin:0 0 4px;">${categoryLabel}</h2>
          <p style="color:#6b7280;font-size:12px;margin:0 0 24px;">Report ID: ${report.id}</p>
          <div style="background:#f9fafb;border-left:4px solid #f97316;padding:16px;margin-bottom:24px;border-radius:0 4px 4px 0;">
            <p style="margin:0;color:#111827;white-space:pre-wrap;">${description.replace(/</g, '&lt;')}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:6px 0;color:#6b7280;">User</td><td style="padding:6px 0;">${userEmail ?? 'Anonymous'}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;">Category</td><td style="padding:6px 0;">${category}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">Device</td><td style="padding:6px 0;">${deviceStr}</td></tr>
          </table>
        </div>
      `,
    })
  } catch (e) {
    // Don't fail the request if email fails — report is already saved
    console.error('Bug report email failed:', e)
  }

  return NextResponse.json({ ok: true, id: report.id })
}
