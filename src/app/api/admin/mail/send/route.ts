import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { sendMail, MailAccount } from '@/lib/admin-mail'

export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { account, to, subject, html, text } = body as {
    account: MailAccount
    to: string
    subject: string
    html: string
    text?: string
  }

  if (account !== 'dillon' && account !== 'ron') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }
  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing to, subject, or html' }, { status: 400 })
  }

  try {
    await sendMail(account, to, subject, html, text)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[admin/mail/send]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send email' }, { status: 500 })
  }
}
