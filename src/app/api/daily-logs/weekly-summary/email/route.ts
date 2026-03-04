import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { renderWeeklyReportPdf } from '@/lib/pdf/weekly-report-pdf'
import { sendReportEmail, SmtpConfig } from '@/lib/email'

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to, summary, weekStart, weekEnd, logCount, note } = body as {
    to?: string
    summary?: string
    weekStart?: string
    weekEnd?: string
    logCount?: number
    note?: string
  }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Valid recipient email required' }, { status: 400 })
  }
  if (!summary) {
    return NextResponse.json({ error: 'summary required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true,
      emailFromName: true, emailFromAddr: true,
      emailSmtpHost: true, emailSmtpPort: true, emailSmtpSecure: true,
      emailSmtpUser: true, emailSmtpPassEnc: true,
    },
  })

  const pdfBuffer = await renderWeeklyReportPdf({ summary, weekStart, weekEnd, logCount })
  const filename = `weekly-report-${weekStart ?? 'report'}.pdf`

  const dateRange = weekStart && weekEnd
    ? `${weekStart} to ${weekEnd}`
    : new Date().toISOString().split('T')[0]

  const userName = user?.name ?? user?.email ?? 'ProFieldHub User'
  const subject = `Weekly Field Report — ${dateRange}`

  const noteHtml = note ? `<p style="color:#374151;font-size:14px;margin-top:16px">${note}</p>` : ''
  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#f97316">Weekly Field Report</h2>
      <p style="color:#374151">Period: <strong>${dateRange}</strong></p>
      ${logCount != null ? `<p style="color:#374151">Daily Logs: <strong>${logCount}</strong></p>` : ''}
      <p style="color:#374151">Sent by ${userName} via ProFieldHub.</p>
      ${noteHtml}
      <p style="color:#6b7280;font-size:13px;margin-top:24px">The full weekly report is attached as a PDF.</p>
    </div>
  `

  let smtp: SmtpConfig | null = null
  if (user?.emailSmtpHost && user.emailSmtpUser && user.emailSmtpPassEnc && user.emailFromAddr) {
    smtp = {
      host: user.emailSmtpHost,
      port: user.emailSmtpPort ?? 587,
      secure: user.emailSmtpSecure,
      user: user.emailSmtpUser,
      passEnc: user.emailSmtpPassEnc,
      fromName: user.emailFromName ?? userName,
      fromEmail: user.emailFromAddr,
    }
  }

  try {
    await sendReportEmail(
      {
        to,
        subject,
        html,
        text: `Weekly Field Report — ${dateRange}\nSent by ${userName} via ProFieldHub\nThe full report is attached as a PDF.`,
        attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
        replyTo: user?.email ?? undefined,
      },
      smtp
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Weekly email send error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Failed to send email' }, { status: 500 })
  }
}
