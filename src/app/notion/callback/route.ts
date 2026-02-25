import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createDailyLogsDatabase } from '@/lib/notion'

const REDIRECT_URI = 'https://profieldhub.com/notion/callback'
const BASE_URL = 'https://profieldhub.com'

// Notion OAuth callback — exchanges code for access token
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', BASE_URL))
  }

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/profile?notion=error', BASE_URL))
  }

  if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/profile?notion=misconfigured', BASE_URL))
  }

  // Exchange authorization code for access token
  const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(
        `${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Notion token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(new URL('/profile?notion=error', BASE_URL))
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  // Try template duplicate first, then auto-create the database
  let databaseId: string | null = tokenData.duplicated_template_id || null

  if (!databaseId) {
    databaseId = await createDailyLogsDatabase(accessToken)
  }

  await prisma.user.update({
    where: { id: (session.user as any).id },
    data: {
      notionToken: accessToken,
      notionDbId: databaseId,
    },
  })

  const destination = databaseId ? '/profile?notion=connected' : '/profile?notion=setup-needed'
  return NextResponse.redirect(new URL(destination, BASE_URL))
}
