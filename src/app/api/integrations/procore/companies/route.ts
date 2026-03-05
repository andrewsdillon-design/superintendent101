import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decryptToken, refreshAccessToken, encryptToken, tokenExpiryDate, procoreApi } from '@/lib/procore'

// GET /api/integrations/procore/companies — list user's Procore companies
export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { procoreAccessToken: true, procoreRefreshToken: true, procoreTokenExpiry: true },
  })

  if (!dbUser?.procoreAccessToken) {
    return NextResponse.json({ error: 'Procore not connected' }, { status: 422 })
  }

  let accessToken = decryptToken(dbUser.procoreAccessToken)

  // Refresh if expired
  if (dbUser.procoreTokenExpiry && new Date() >= dbUser.procoreTokenExpiry) {
    const tokens = await refreshAccessToken(dbUser.procoreRefreshToken!)
    accessToken = tokens.access_token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        procoreAccessToken:  encryptToken(tokens.access_token),
        procoreRefreshToken: encryptToken(tokens.refresh_token),
        procoreTokenExpiry:  tokenExpiryDate(tokens.expires_in),
      },
    })
  }

  const companies = await procoreApi(accessToken, '/rest/v1.0/companies')
  return NextResponse.json({ companies })
}
