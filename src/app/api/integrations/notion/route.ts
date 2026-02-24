import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// GET — return connection status for logged-in user
export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: (session.user as any).email },
    select: { notionToken: true, notionDbId: true },
  })

  return NextResponse.json({
    connected: !!user?.notionToken,
    databaseId: user?.notionDbId || null,
  })
}

// POST — initiate Notion OAuth (redirect URL returned to client)
export async function POST() {
  if (!process.env.NOTION_CLIENT_ID) {
    return NextResponse.json(
      { error: 'NOTION_CLIENT_ID not configured in .env' },
      { status: 503 }
    )
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`
  const oauthUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  oauthUrl.searchParams.set('client_id', process.env.NOTION_CLIENT_ID)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('owner', 'user')
  oauthUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.json({ url: oauthUrl.toString() })
}

// DELETE — disconnect Notion
export async function DELETE() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.update({
    where: { email: (session.user as any).email },
    data: { notionToken: null, notionDbId: null },
  })

  return NextResponse.json({ disconnected: true })
}
