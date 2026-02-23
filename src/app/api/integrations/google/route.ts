import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// GET — return Google connection status
export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: (session.user as any).email },
    select: { googleToken: true, googleFolderId: true },
  })

  return NextResponse.json({
    connected: !!user?.googleToken,
    folderId: user?.googleFolderId || null,
  })
}

// POST — initiate Google OAuth
export async function POST() {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID not configured in .env' },
      { status: 503 }
    )
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`
  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  oauthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('response_type', 'code')
  // Scopes: Drive file creation only (not full Drive access)
  oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file')
  oauthUrl.searchParams.set('access_type', 'offline')
  oauthUrl.searchParams.set('prompt', 'consent')

  return NextResponse.json({ url: oauthUrl.toString() })
}

// DELETE — disconnect Google
export async function DELETE() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.user.update({
    where: { email: (session.user as any).email },
    data: { googleToken: null, googleFolderId: null },
  })

  return NextResponse.json({ disconnected: true })
}
