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
  weather: string
  crewCounts: Record<string, number>
  crewPermits: Record<string, string>  // commercial: permit number per trade
  workPerformed: string
  deliveries: string
  inspections: string
  issues: string
  safetyNotes: string
  rfi: string
  equipment: string
  accidents: string
  visitors: string
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

  async function push(endpoint: string, body: object) {
    await procoreApi(accessToken, `${base}/${endpoint}${qs}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // Weather → Observed Weather Conditions
  if (log.weather?.trim()) {
    await push('weather_logs', { weather_log: { date: dateStr, notes: log.weather } })
    pushed.push('weather')
  }

  // Work performed → Scheduled Work
  if (log.workPerformed?.trim()) {
    await push('work_logs', { work_log: { date: dateStr, notes: log.workPerformed } })
    pushed.push('work')
  }

  // Crew / Manpower — one entry per trade, include sub permit number if present
  for (const [trade, count] of Object.entries(log.crewCounts ?? {})) {
    if (Number(count) > 0) {
      const permit = log.crewPermits?.[trade]
      const notes = permit ? `Permit: ${permit}` : undefined
      await push('manpower_logs', {
        manpower_log: {
          date: dateStr,
          party_name: trade,
          total: Number(count),
          ...(notes ? { notes } : {}),
        },
      })
    }
  }
  if (Object.keys(log.crewCounts ?? {}).length > 0) pushed.push('crew')

  // Deliveries
  if (log.deliveries?.trim()) {
    await push('delivery_logs', { delivery_log: { date: dateStr, description: log.deliveries } })
    pushed.push('deliveries')
  }

  // Inspections → Inspections log type
  if (log.inspections?.trim()) {
    await push('inspection_logs', { inspection_log: { date: dateStr, notes: log.inspections } })
    pushed.push('inspections')
  }

  // Issues / Delays → Notes
  if (log.issues?.trim()) {
    await push('notes_logs', { notes_log: { date: dateStr, notes: `Issues / Delays:\n${log.issues}` } })
    pushed.push('issues')
  }

  // RFIs → Notes
  if (log.rfi?.trim()) {
    await push('notes_logs', { notes_log: { date: dateStr, notes: `RFIs:\n${log.rfi}` } })
    pushed.push('rfi')
  }

  // Safety Notes → Safety Violations
  if (log.safetyNotes?.trim()) {
    await push('safety_violation_logs', { safety_violation_log: { date: dateStr, notes: log.safetyNotes } })
    pushed.push('safety')
  }

  // Equipment → Equipment log
  if (log.equipment?.trim()) {
    await push('equipment_logs', { equipment_log: { date: dateStr, notes: log.equipment } })
    pushed.push('equipment')
  }

  // Accidents → Accident log
  if (log.accidents?.trim()) {
    await push('accident_logs', { accident_log: { date: dateStr, notes: log.accidents } })
    pushed.push('accidents')
  }

  // Visitors → Visitor log
  if (log.visitors?.trim()) {
    await push('visitor_logs', { visitor_log: { date: dateStr, notes: log.visitors } })
    pushed.push('visitors')
  }

  // Safety / Accidents → also create a Procore Observation for tracking
  const safetyText = [log.accidents?.trim(), log.safetyNotes?.trim()].filter(Boolean).join('\n')
  if (safetyText) {
    try {
      await push('observations/items', {
        item: {
          name: `Safety – ${dateStr}`,
          type: 'safety',
          status: 'initiated',
          description: safetyText,
        },
      })
      pushed.push('observation')
    } catch {
      // Observations may not be enabled on all projects — non-fatal
    }
  }

  return pushed
}
