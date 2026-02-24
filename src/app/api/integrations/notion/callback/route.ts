import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db'

// Notion OAuth callback — exchanges code for access token
export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/profile?notion=error', request.url))
  }

  if (!process.env.NOTION_CLIENT_ID || !process.env.NOTION_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/profile?notion=misconfigured', request.url))
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/notion/callback`

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
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Notion token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(new URL('/profile?notion=error', request.url))
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token

  // Find or create a Dust Logs database in the user's Notion workspace
  let databaseId = tokenData.duplicated_template_id || null

  if (!databaseId) {
    // Create a new database for Dust Logs
    const dbRes = await fetch('https://api.notion.com/v1/databases', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { type: 'workspace', workspace: true },
        title: [{ text: { content: 'ProFieldHub Dust Logs' } }],
        properties: {
          Name: { title: {} },
          Date: { date: {} },
          Location: { rich_text: {} },
          'Job Type': {
            select: {
              options: [
                { name: 'retail', color: 'blue' },
                { name: 'industrial', color: 'orange' },
                { name: 'healthcare', color: 'green' },
                { name: 'multi-family', color: 'purple' },
                { name: 'office', color: 'gray' },
                { name: 'other', color: 'default' },
              ],
            },
          },
          Tags: { multi_select: {} },
          Summary: { rich_text: {} },
        },
      }),
    })

    if (dbRes.ok) {
      const dbData = await dbRes.json()
      databaseId = dbData.id
    }
  }

  // Store token in DB (in production: encrypt with AES-256 before storing)
  await prisma.user.update({
    where: { email: (session.user as any).email },
    data: {
      notionToken: accessToken,
      notionDbId: databaseId,
    },
  })

  return NextResponse.redirect(new URL('/profile?notion=connected', request.url))
}
