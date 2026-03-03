import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { fetchMessage, markRead, trashMessage, MailAccount } from '@/lib/admin-mail'

export async function GET(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const { searchParams } = req.nextUrl
  const account = (searchParams.get('account') ?? 'dillon') as MailAccount
  const folder = searchParams.get('folder') ?? 'INBOX'
  const uid = Number(searchParams.get('uid'))

  if (account !== 'dillon' && account !== 'ron') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 })

  try {
    const message = await fetchMessage(account, folder, uid)
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    return NextResponse.json({ message })
  } catch (err: any) {
    console.error('[admin/mail/message GET]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to fetch message' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { account, folder, uid, seen } = body as {
    account: MailAccount
    folder: string
    uid: number
    seen: boolean
  }

  if (account !== 'dillon' && account !== 'ron') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }
  if (!uid || folder === undefined || seen === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    await markRead(account, folder, uid, seen)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[admin/mail/message PATCH]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to update message' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin()
  if ('error' in auth) return auth.error

  const body = await req.json()
  const { account, folder, uid } = body as { account: MailAccount; folder: string; uid: number }

  if (account !== 'dillon' && account !== 'ron') {
    return NextResponse.json({ error: 'Invalid account' }, { status: 400 })
  }
  if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 })

  try {
    await trashMessage(account, folder, uid)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[admin/mail/message DELETE]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to delete message' }, { status: 500 })
  }
}
