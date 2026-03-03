import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { renderDailyLogPdf } from '@/lib/pdf/daily-log-pdf'
import { sendReportEmail, buildDailyLogEmailHtml, SmtpConfig } from '@/lib/email'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { to, note } = body as { to?: string; note?: string }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Valid recipient email required' }, { status: 400 })
  }

  const [log, user] = await Promise.all([
    prisma.dailyLog.findFirst({
      where: { id: params.id, userId },
      include: { project: { select: { title: true } }, user: { select: { name: true, email: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true,
        emailFromName: true, emailFromAddr: true,
        emailSmtpHost: true, emailSmtpPort: true, emailSmtpSecure: true,
        emailSmtpUser: true, emailSmtpPassEnc: true,
      },
    }),
  ])

  if (!log) return NextResponse.json({ error: 'Log not found' }, { status: 404 })

  // Build PDF
  const uint8 = await renderDailyLogPdf({
    ...log,
    crewCounts: log.crewCounts as Record<string, number>,
  })
  const pdfBuffer = Buffer.from(uint8)

  const logDate = log.date.toISOString().split('T')[0]
  const projectName = log.project?.title ?? null
  const userName = user?.name ?? user?.email ?? 'ProFieldHub User'

  const subject = projectName
    ? `Daily Field Report — ${logDate} — ${projectName}`
    : `Daily Field Report — ${logDate}`

  const html = buildDailyLogEmailHtml({ logDate, projectName, userName, note: note?.trim() })

  // Build SMTP config if user has it configured
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
        text: `Daily Field Report — ${logDate}${projectName ? ` — ${projectName}` : ''}\nSent by ${userName} via ProFieldHub\nThe full report is attached as a PDF.`,
        attachments: [{ filename: `daily-log-${logDate}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }],
        replyTo: user?.email ?? undefined,
      },
      smtp
    )
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Email send error:', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Failed to send email' }, { status: 500 })
  }
}
