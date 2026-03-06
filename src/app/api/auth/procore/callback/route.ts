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

    // Fetch default company — non-fatal if it fails (e.g. app not yet installed in company)
    let defaultCompanyId: number | undefined
    try {
      const companies = await procoreApi(tokens.access_token, '/rest/v1.0/companies')
      if (Array.isArray(companies) && companies.length > 0) {
        defaultCompanyId = companies[0].id
      }
    } catch (err) {
      console.warn('[Procore callback] Could not fetch companies:', err)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        procoreAccessToken:  encryptToken(tokens.access_token),
        procoreRefreshToken: encryptToken(tokens.refresh_token),
        procoreTokenExpiry:  tokenExpiryDate(tokens.expires_in),
        ...(defaultCompanyId ? { procoreCompanyId: defaultCompanyId } : {}),
      },
    })

    return NextResponse.redirect(new URL('/profile?procore=connected', req.url))
  } catch (err) {
    console.error('[Procore callback]', err)
    return NextResponse.redirect(new URL('/profile?procore=error', req.url))
  }
}
