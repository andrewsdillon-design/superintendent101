import { NextRequest, NextResponse } from 'next/server'
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

  const hasToken = !!dbUser?.notionToken
  const hasDb = !!dbUser?.notionDbId

  return NextResponse.json({
    connected: hasToken && hasDb,
    needsSetup: hasToken && !hasDb,
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

  const redirectUri = 'https://profieldhub.com/integration/notion-dip'
  const oauthUrl = new URL('https://api.notion.com/v1/oauth/authorize')
  oauthUrl.searchParams.set('client_id', process.env.NOTION_CLIENT_ID)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('owner', 'user')
  oauthUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.json({ url: oauthUrl.toString() })
}

// Save a manually entered Notion database ID
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { databaseId } = await request.json()
  if (!databaseId?.trim()) {
    return NextResponse.json({ error: 'Database ID required' }, { status: 400 })
  }

  // Strip hyphens and validate it looks like a Notion UUID
  const clean = databaseId.replace(/-/g, '').trim()
  if (clean.length !== 32 || !/^[a-f0-9]+$/i.test(clean)) {
    return NextResponse.json({ error: 'Invalid Notion database ID format' }, { status: 400 })
  }

  // Format as UUID with hyphens
  const formatted = `${clean.slice(0,8)}-${clean.slice(8,12)}-${clean.slice(12,16)}-${clean.slice(16,20)}-${clean.slice(20)}`

  // Verify the token can access this database
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { notionToken: true },
  })

  if (!dbUser?.notionToken) {
    return NextResponse.json({ error: 'Notion not connected. Please connect Notion first.' }, { status: 422 })
  }

  const verifyRes = await fetch(`https://api.notion.com/v1/databases/${formatted}`, {
    headers: {
      Authorization: `Bearer ${dbUser.notionToken}`,
      'Notion-Version': '2022-06-28',
    },
  })

  if (!verifyRes.ok) {
    return NextResponse.json(
      { error: 'Cannot access that database. Make sure you shared it with the ProFieldHub integration in Notion.' },
      { status: 422 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notionDbId: formatted },
  })

  return NextResponse.json({ connected: true, databaseId: formatted })
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
