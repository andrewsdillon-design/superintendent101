import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/profile?google=error', request.url))
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/profile?google=misconfigured', request.url))
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/integrations/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('Google token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(new URL('/profile?google=error', request.url))
  }

  const tokenData = await tokenRes.json()
  // Store refresh_token for long-term access (access_token expires in 1hr)
  const tokenToStore = tokenData.refresh_token || tokenData.access_token

  // Create a dedicated "S101 Dust Logs" folder in user's Drive
  const folderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'S101 Dust Logs',
      mimeType: 'application/vnd.google-apps.folder',
    }),
  })

  let folderId = null
  if (folderRes.ok) {
    const folderData = await folderRes.json()
    folderId = folderData.id
  }

  await prisma.user.update({
    where: { email: (session.user as any).email },
    data: {
      googleToken: tokenToStore,
      googleFolderId: folderId,
    },
  })

  return NextResponse.redirect(new URL('/profile?google=connected', request.url))
}
