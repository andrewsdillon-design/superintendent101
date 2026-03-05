import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { exchangeCode, encryptToken, tokenExpiryDate, procoreApi } from '@/lib/procore'

// GET /api/auth/procore/callback — Procore redirects here after user authorizes
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/profile?procore=error', req.url))
  }

  try {
    const tokens = await exchangeCode(code)

    // Fetch default company from Procore
    const companies = await procoreApi(tokens.access_token, '/rest/v1.0/companies')
    const defaultCompany = Array.isArray(companies) && companies.length > 0 ? companies[0] : null

    await prisma.user.update({
      where: { id: user.id },
      data: {
        procoreAccessToken:  encryptToken(tokens.access_token),
        procoreRefreshToken: encryptToken(tokens.refresh_token),
        procoreTokenExpiry:  tokenExpiryDate(tokens.expires_in),
        ...(defaultCompany ? { procoreCompanyId: defaultCompany.id } : {}),
      },
    })

    return NextResponse.redirect(new URL('/profile?procore=connected', req.url))
  } catch (err) {
    console.error('[Procore callback]', err)
    return NextResponse.redirect(new URL('/profile?procore=error', req.url))
  }
}
