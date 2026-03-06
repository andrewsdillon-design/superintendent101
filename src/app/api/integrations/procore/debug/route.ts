import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { decryptToken, PROCORE_CONFIG } from '@/lib/procore'

// GET /api/integrations/procore/debug — test raw Procore API responses
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { procoreAccessToken: true, procoreCompanyId: true, procoreTokenExpiry: true },
  })

  if (!dbUser?.procoreAccessToken) return NextResponse.json({ error: 'No token stored' })

  const accessToken = decryptToken(dbUser.procoreAccessToken)
  const results: any = {
    config: {
      authBase: PROCORE_CONFIG.authBase,
      apiBase: PROCORE_CONFIG.apiBase,
      clientId: PROCORE_CONFIG.clientId.slice(0, 8) + '...',
      redirectUri: PROCORE_CONFIG.redirectUri,
    },
    storedCompanyId: dbUser.procoreCompanyId,
    tokenExpiry: dbUser.procoreTokenExpiry,
  }

  // Test 1: list companies
  try {
    const r = await fetch(`${PROCORE_CONFIG.apiBase}/rest/v1.0/companies`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    })
    results.companies = { status: r.status, body: await r.json() }
  } catch (e: any) {
    results.companies = { error: e.message }
  }

  // Test 2: list projects for stored company
  if (dbUser.procoreCompanyId) {
    try {
      const r = await fetch(`${PROCORE_CONFIG.apiBase}/rest/v1.0/projects?company_id=${dbUser.procoreCompanyId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      })
      results.projects = { status: r.status, body: await r.json() }
    } catch (e: any) {
      results.projects = { error: e.message }
    }
  }

  return NextResponse.json(results)
}
