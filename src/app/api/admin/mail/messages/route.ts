import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { fetchMessages, MailAccount } from '@/lib/admin-mail'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = req.nextUrl
  const account = (searchParams.get('account') ?? 'dillon') as MailAccount
  const folder = searchParams.get('folder') ?? 'INBOX'
  const page = Math.max(1, Number(searchParams.get('page') ?? 1))

  if (account !== 'dillon' && account !== 'ron') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }

  try {
    const { messages, total } = await fetchMessages(account, folder, page)
    return NextResponse.json({ messages, total, page })
  } catch (err: any) {
    console.error('[admin/mail/messages]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to fetch messages' }, { status: 500 })
  }
}
