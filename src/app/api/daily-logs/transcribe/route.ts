import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { getUserId } from '@/lib/get-user-id'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

// OpenAI client (transcription + default structuring)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

// xAI client — OpenAI-compatible API, used when user selects a Grok model
const xai = process.env.XAI_API_KEY
  ? new OpenAI({ apiKey: process.env.XAI_API_KEY, baseURL: 'https://api.x.ai/v1' })
  : null

// Per-model pricing for cost logging ($ per 1M tokens)
const MODEL_PRICING: Record<string, { inputPerM: number; outputPerM: number }> = {
  'gpt-4o':              { inputPerM: 2.50,  outputPerM: 10.00 },
  'gpt-4o-mini':         { inputPerM: 0.15,  outputPerM: 0.60  },
  'gpt-5.4':             { inputPerM: 10.00, outputPerM: 30.00 }, // update when OpenAI publishes official pricing
  'grok-4.1-reasoning':  { inputPerM: 5.00,  outputPerM: 15.00 },
}

function getStructureClient(model: string): OpenAI | null {
  if (model.startsWith('grok-')) return xai
  return openai
}

// Reasoning models don't support response_format or temperature
function isReasoningModel(model: string): boolean {
  return model.includes('reasoning') || model.startsWith('o1') || model.startsWith('o3')
}

function estimateTranscribeCost(bytes: number): number {
  // whisper-1: $0.006/min — estimate from file size at ~128kbps
  const minutes = bytes / (128 * 1024 / 8) / 60
  return Math.max(0.001, minutes * 0.006)
}

function estimateStructureCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] ?? { inputPerM: 2.50, outputPerM: 10.00 }
  return (inputTokens / 1_000_000) * pricing.inputPerM + (outputTokens / 1_000_000) * pricing.outputPerM
}

// ─── Commercial Field Documentation Framework ─────────────────────────────────
const COMMERCIAL_FRAMEWORK = `
You are a construction field documentation assistant.

YOUR JOB:
Convert voice notes or text into a structured commercial construction field log.

STRICT RULES:
- If multiple projects or buildings are mentioned, extract each separately. Never combine.
- Do not summarize away details. Preserve all technical observations exactly as stated.
- Do not assume missing information. If uncertain, note "not confirmed".
- Keep neutral tone (no judgment unless the superintendent stated it).
- One complete log entry per project/building.

FOR EACH PROJECT, populate "workPerformed" using these EXACT section headers (## format, bullet points):

## PROJECT IDENTIFICATION
- Project name: [value or "not confirmed"]
- Permit number: [value or "not confirmed"]
- Address: [value or "not confirmed"]
- General Contractor: [value or "not mentioned"]
- Owner / Developer: [value or "not mentioned"]
- Project phase / Construction stage: [value or "not confirmed"]
- Building type: [office, retail, industrial, mixed-use, etc. or "not confirmed"]

## SITE CONDITIONS
- Site access / gates: [status or "not mentioned"]
- Perimeter fencing / hoarding: [condition or "not mentioned"]
- Lay-down / staging areas: [status or "not mentioned"]
- Dumpsters / waste management: [status or "not mentioned"]
- Cleanliness and housekeeping: [condition or "not mentioned"]
- Civil / grading / drainage issues: [any issues or "none mentioned"]

## FOUNDATION / CONCRETE
- [All footing, grade beam, slab on grade, tilt-up, pour observations or "not applicable / not mentioned"]

## STRUCTURAL STEEL / FRAMING
- [All structural steel, concrete frame, pre-cast, wood frame details — erection status, connections, plumb/level issues, etc.]

## BUILDING ENVELOPE
- [Exterior walls, curtain wall, cladding, roofing, waterproofing, windows, doors, sealants]

## MECHANICAL / ELECTRICAL / PLUMBING / FIRE
- [All MEP+F observations — rough-in status, above-ceiling work, equipment, inspections, incomplete items, coordination issues]

## CONCERNS OR ITEMS TO MONITOR
- [Every flagged item, deficiency, conflict, schedule risk, or item requiring follow-up]

## OVERALL IMPRESSION
- [General status of the project, milestone progress, overall assessment]

FIELD MAPPING — FILL THESE JSON FIELDS:
- "workPerformed": The full ## section structured output above. Include every detail verbatim.
- "issues": Mirror the CONCERNS OR ITEMS TO MONITOR section. If none: "None reported." NEVER leave blank.
- "inspections": Any inspections scheduled, completed, failed, or pending.
- "safetyNotes": Any safety observations, near-misses, violations, toolbox talks, or hazards.
- "deliveries": Any material or equipment deliveries mentioned.
- "equipment": Any heavy equipment, cranes, lifts, or tools on site.
- "accidents": Any accidents, incidents, or first aid events.
- "visitors": Any owner visits, inspector visits, architect walkthroughs, or VIP site visits.
- "weather": Weather conditions observed.
- "crewCounts": Trades/subcontractors on site with headcounts — e.g. { "Steel Ironworkers": 12, "Electricians": 6, "Plumbers": 4 }
- "crewPermits": Per-trade permit numbers for subcontractors — e.g. { "Electricians": "E-2024-123", "Plumbers": "P-2024-456" }. Only include trades where a permit number was mentioned. Use {} if none mentioned.
- "lotNumber": Project identifier or building number if mentioned. Match against active projects.
- "address": Street address if mentioned, otherwise "".
- "permitNumber": Permit number if mentioned, otherwise "".
- "rfi": Any RFIs (Requests for Information) mentioned, with numbers and subjects if available, otherwise "".
`

// ─── Ron Seitz Residential Field Walk Framework ───────────────────────────────
// Structures each lot into the 8-section field walk format.
// The output maps to our existing JSON schema — workPerformed holds the full
// structured breakdown, issues maps to Concerns, and lot-level fields are extracted.
const RESIDENTIAL_FRAMEWORK = `
You are a construction field documentation assistant.

YOUR JOB:
Convert voice notes or text into a structured field walk log using the Ron Seitz framework.

STRICT RULES:
- Extract EVERY lot separately. Do NOT combine lots.
- Do not summarize away details. Preserve all technical observations exactly as stated.
- Do not assume missing information. If uncertain, note "not confirmed".
- Keep neutral tone (no judgment unless the superintendent stated it).
- One complete log entry per lot.

FOR EACH LOT, populate "workPerformed" using these EXACT section headers (## format, bullet points):

## LOT IDENTIFICATION
- Lot number: [value or "not confirmed"]
- Permit number: [value or "not confirmed"]
- Address: [value or "not confirmed"]
- Builder: [value or "not mentioned"]
- Plan / Elevation: [value or "not mentioned"]
- Garage location: [value or "not mentioned"]
- Construction stage: [value or "not confirmed"]

## SITE CONDITIONS
- Dumpsters: [status/location or "not mentioned"]
- Sidewalks: [condition or "not mentioned"]
- Civil issues: [any grading, drainage, erosion, or utility issues or "none mentioned"]
- Cleanliness: [condition or "not mentioned"]

## SLAB / FOUNDATION
- [All slab and foundation observations, or "not applicable / not mentioned"]

## EXTERIOR / STRUCTURE
- [All exterior structural observations — sheathing, wrap, windows, doors, masonry, etc.]

## FRAMING / STRUCTURAL OBSERVATIONS
- [All framing details — walls, roof, trusses, beams, headers, blocking, etc.]

## MECHANICAL / ELECTRICAL / PLUMBING
- [All MEP observations — rough-in status, inspections, issues, incomplete items]

## OVERALL IMPRESSION
- [General status summary of this lot]

FIELD MAPPING — FILL THESE JSON FIELDS:
- "workPerformed": The full ## section structured output above. Include every detail verbatim.
- "issues": CONCERNS OR ITEMS TO MONITOR — list every flagged item, deficiency, or item to watch. If none: "None reported." NEVER leave blank.
- "inspections": Any inspections scheduled, completed, or failed.
- "safetyNotes": Any safety observations, violations, or hazards.
- "deliveries": Any material deliveries mentioned.
- "equipment": Any equipment on site.
- "accidents": Any accidents or incidents.
- "visitors": Any visitors, inspectors, or owner visits.
- "weather": Weather conditions observed.
- "crewCounts": Trades on site with headcounts — e.g. { "Framers": 4, "Plumbers": 2 }
- "lotNumber": Lot number or identifier. Match against active projects list by location field.
- "address": Street address if mentioned, otherwise "".
- "permitNumber": Permit number if mentioned, otherwise "".
- "rfi": Any RFIs (Requests for Information) mentioned, otherwise "".
`

function buildSystemPrompt(
  builderType: string,
  projects: Array<{ id: string; title: string; location?: string | null }>
): string {
  const projectsStr = projects.length > 0
    ? projects.map(p => p.location ? `"${p.location} (${p.title})"` : `"${p.title}"`).join(', ')
    : 'none listed'

  const isResidential = (builderType || '').toUpperCase() === 'RESIDENTIAL'

  const multiSchema = `{ "multi": true, "logs": [{ "projectHint": "Lot 5", "lotNumber": "Lot 5", "weather": "...", "crewCounts": {}, "crewPermits": {}, "workPerformed": "...", "deliveries": "...", "inspections": "...", "issues": "...", "safetyNotes": "...", "address": "...", "permitNumber": "...", "rfi": "...", "equipment": "...", "accidents": "...", "visitors": "..." }, ...] }`
  const singleSchema = `{ "multi": false, "lotNumber": "...", "weather": "...", "crewCounts": {}, "crewPermits": {}, "workPerformed": "...", "deliveries": "...", "inspections": "...", "issues": "...", "safetyNotes": "...", "address": "...", "permitNumber": "...", "rfi": "...", "equipment": "...", "accidents": "...", "visitors": "..." }`

  if (isResidential) {
    return `${RESIDENTIAL_FRAMEWORK}
Builder type: RESIDENTIAL
Active projects: ${projectsStr}

If the transcript clearly covers MULTIPLE lots, return:
${multiSchema}

If the transcript covers ONE lot, return:
${singleSchema}

Only use multi=true when the transcript clearly discusses multiple separate lots/addresses.
Return raw JSON only, no markdown fences.`
  }

  // Commercial prompt — full structured framework
  return `${COMMERCIAL_FRAMEWORK}
Builder type: COMMERCIAL
Active projects: ${projectsStr}

If the transcript clearly covers MULTIPLE projects or buildings, return:
${multiSchema}

If the transcript covers ONE project, return:
${singleSchema}

Only use multi=true when the transcript clearly discusses multiple separate projects or buildings.
Return raw JSON only, no markdown fences.`
}

const ALLOWED_TYPES: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'video/mp4': 'mp4',
  'video/quicktime': 'mp4',
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`transcribe:${userId}`, { limit: 200, windowMs: 60 * 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
  }

  // Look up user's preferred structure model
  const userSettings = await prisma.user.findUnique({
    where: { id: userId },
    select: { structureModel: true },
  })
  const structureModel = userSettings?.structureModel ?? 'gpt-5.4'

  // Validate the client is available for this model
  const structureClient = getStructureClient(structureModel)
  if (!structureClient) {
    return NextResponse.json({ error: `AI model "${structureModel}" is not configured on this server` }, { status: 503 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  const pastedTranscript = formData.get('transcript') as string | null
  const builderType = (formData.get('builderType') as string | null) ?? ''
  const projectsRaw = (formData.get('projects') as string | null) ?? '[]'

  let projects: Array<{ id: string; title: string; location?: string | null }> = []
  try {
    projects = JSON.parse(projectsRaw) as Array<{ id: string; title: string; location?: string | null }>
  } catch {}

  if (!audioFile && !pastedTranscript?.trim()) {
    return NextResponse.json({ error: 'No audio file or transcript provided' }, { status: 400 })
  }

  if (audioFile && audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
  }

  try {
    let transcript: string

    if (pastedTranscript?.trim()) {
      // Text path — skip transcription, go straight to structuring
      transcript = pastedTranscript.trim()
    } else {
      // Audio path — Step 1: Transcribe with whisper-1 (always OpenAI)
      const ext = ALLOWED_TYPES[audioFile!.type] ?? 'm4a'
      const audioBuffer = await audioFile!.arrayBuffer()
      const file = await toFile(Buffer.from(audioBuffer), `field-note.${ext}`, {
        type: audioFile!.type || 'audio/m4a',
      })

      const transcription = await openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
      })

      transcript = transcription.text?.trim() ?? ''
      if (!transcript) {
        return NextResponse.json({ error: 'Could not transcribe audio — try speaking more clearly or uploading a cleaner recording.' }, { status: 422 })
      }

      // Log transcription usage (non-blocking)
      prisma.apiUsageLog.create({
        data: {
          userId,
          service: 'whisper-1',
          action: 'transcribe',
          fileSizeBytes: audioFile!.size,
          costUsd: estimateTranscribeCost(audioFile!.size),
        },
      }).catch(() => {})
    }

    // Step 2: Structure with user's chosen model
    const systemPrompt = buildSystemPrompt(builderType, projects)
    const reasoning = isReasoningModel(structureModel)
    const completion = await structureClient.chat.completions.create({
      model: structureModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      ...(reasoning ? {} : { response_format: { type: 'json_object' }, temperature: 0.1 }),
    })

    const inputTokens = completion.usage?.prompt_tokens ?? 0
    const outputTokens = completion.usage?.completion_tokens ?? 0

    // Log structuring usage (non-blocking)
    prisma.apiUsageLog.create({
      data: {
        userId,
        service: structureModel,
        action: 'structure',
        inputTokens,
        outputTokens,
        costUsd: estimateStructureCost(structureModel, inputTokens, outputTokens),
      },
    }).catch(() => {})

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let structured: Record<string, unknown>
    try {
      structured = JSON.parse(raw)
    } catch {
      structured = {}
    }

    return NextResponse.json({ transcript, structured })
  } catch (err: any) {
    console.error('Transcribe/structure error:', err?.message)
    return NextResponse.json(
      { error: err?.message ?? 'Processing failed' },
      { status: 500 }
    )
  }
}
