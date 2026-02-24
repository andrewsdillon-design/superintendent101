import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notionToken: true, notionDbId: true },
  })

  return NextResponse.json({
    connected: !!dbUser?.notionToken,
    databaseId: dbUser?.notionDbId || null,
  })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.NOTION_CLIENT_ID) {
    return NextResponse.json({ error: 'Notion integration not configured' }, { status: 503 })
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`
  const oauthUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  oauthUrl.searchParams.set('client_id', process.env.NOTION_CLIENT_ID)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('owner', 'user')
  oauthUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.json({ url: oauthUrl.toString() })
}

export async function DELETE() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notionToken: null, notionDbId: null },
  })

  return NextResponse.json({ disconnected: true })
}
