import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { listFolders, MailAccount } from '@/lib/admin-mail'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = req.nextUrl
  const account = (searchParams.get('account') ?? 'dillon') as MailAccount

  if (account !== 'dillon' && account !== 'ron') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }

  try {
    const folders = await listFolders(account)
    return NextResponse.json({ folders })
  } catch (err: any) {
    console.error('[admin/mail/folders]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to list folders' }, { status: 500 })
  }
}
