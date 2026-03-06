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

    // Test 3: fetch work_logs for each linked project to verify logs were created
    const links = await prisma.procoreProjectLink.findMany({ where: { userId } })
    results.logCheck = {}
    for (const link of links) {
      const checks: any = {}
      for (const logType of ['work_logs', 'manpower_logs', 'delivery_logs', 'inspection_logs', 'safety_violation_logs', 'notes_logs']) {
        try {
          const r = await fetch(
            `${PROCORE_CONFIG.apiBase}/rest/v1.0/projects/${link.procoreProjectId}/${logType}?company_id=${link.procoreCompanyId}`,
            { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
          )
          const body = await r.json()
          checks[logType] = { status: r.status, count: Array.isArray(body) ? body.length : body }
        } catch (e: any) {
          checks[logType] = { error: e.message }
        }
      }
      results.logCheck[`project_${link.procoreProjectId}`] = checks
    }
  }

  return NextResponse.json(results)
}
