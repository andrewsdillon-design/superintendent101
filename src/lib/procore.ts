import { encrypt, decrypt } from '@/lib/encrypt'

// Single set of vars — set to production values on VPS, sandbox values locally
export const PROCORE_CONFIG = {
  clientId:     process.env.PROCORE_CLIENT_ID!,
  clientSecret: process.env.PROCORE_CLIENT_SECRET!,
  redirectUri:  process.env.PROCORE_REDIRECT_URI!,
  authBase:     process.env.PROCORE_AUTH_BASE ?? 'https://login.procore.com',
  apiBase:      process.env.PROCORE_API_BASE  ?? 'https://api.procore.com',
}

export function getProcoreAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: PROCORE_CONFIG.clientId,
    redirect_uri: PROCORE_CONFIG.redirectUri,
    state,
  })
  return `${PROCORE_CONFIG.authBase}/oauth/authorize?${params}`
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(`${PROCORE_CONFIG.authBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: PROCORE_CONFIG.clientId,
      client_secret: PROCORE_CONFIG.clientSecret,
      redirect_uri: PROCORE_CONFIG.redirectUri,
      code,
    }),
  })
  if (!res.ok) throw new Error(`Procore token exchange failed: ${await res.text()}`)
  return res.json()
}

export async function refreshAccessToken(encryptedRefreshToken: string): Promise<TokenResponse> {
  const refreshToken = decrypt(encryptedRefreshToken)
  const res = await fetch(`${PROCORE_CONFIG.authBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: PROCORE_CONFIG.clientId,
      client_secret: PROCORE_CONFIG.clientSecret,
      redirect_uri: PROCORE_CONFIG.redirectUri,
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Procore token refresh failed: ${await res.text()}`)
  return res.json()
}

export async function procoreApi(accessToken: string, path: string, options?: RequestInit) {
  const res = await fetch(`${PROCORE_CONFIG.apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Procore API ${res.status}: ${text}`)
  }
  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// ── Token helpers ────────────────────────────────────────────────────────────

export function encryptToken(token: string): string {
  return encrypt(token)
}

export function decryptToken(encrypted: string): string {
  return decrypt(encrypted)
}

export function tokenExpiryDate(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000 - 60_000) // 1 min early
}

// ── Push daily log to Procore ────────────────────────────────────────────────

interface PushPayload {
  date: Date
  crewCounts: Record<string, number>
  workPerformed: string
  deliveries: string
  inspections: string
  issues: string
  safetyNotes: string
  rfi: string
}

export async function pushDailyLogToProcore(
  accessToken: string,
  companyId: number,
  procoreProjectId: number,
  log: PushPayload,
): Promise<string[]> {
  const dateStr = log.date.toISOString().split('T')[0]
  const base = `/rest/v1.0/projects/${procoreProjectId}`
  const qs = `?company_id=${companyId}`
  const pushed: string[] = []

  // Work performed
  if (log.workPerformed?.trim()) {
    await procoreApi(accessToken, `${base}/work_logs${qs}`, {
      method: 'POST',
      body: JSON.stringify({ work_log: { date: dateStr, notes: log.workPerformed } }),
    })
    pushed.push('work')
  }

  // Crew / manpower — one entry per trade
  for (const [trade, count] of Object.entries(log.crewCounts ?? {})) {
    if (Number(count) > 0) {
      await procoreApi(accessToken, `${base}/manpower_logs${qs}`, {
        method: 'POST',
        body: JSON.stringify({ manpower_log: { date: dateStr, party_name: trade, total: Number(count) } }),
      })
    }
  }
  if (Object.keys(log.crewCounts ?? {}).length > 0) pushed.push('crew')

  // Deliveries
  if (log.deliveries?.trim()) {
    await procoreApi(accessToken, `${base}/delivery_logs${qs}`, {
      method: 'POST',
      body: JSON.stringify({ delivery_log: { date: dateStr, description: log.deliveries } }),
    })
    pushed.push('deliveries')
  }

  // Notes: issues, safety, RFI, inspections — each as a separate notes entry
  const noteSections = [
    { label: 'Inspections', content: log.inspections },
    { label: 'Issues / Delays', content: log.issues },
    { label: 'Safety Notes', content: log.safetyNotes },
    { label: 'RFIs', content: log.rfi },
  ]
  for (const section of noteSections) {
    if (section.content?.trim()) {
      await procoreApi(accessToken, `${base}/notes_logs${qs}`, {
        method: 'POST',
        body: JSON.stringify({ notes_log: { date: dateStr, notes: `${section.label}:\n${section.content}` } }),
      })
      pushed.push(section.label.toLowerCase())
    }
  }

  return pushed
}
