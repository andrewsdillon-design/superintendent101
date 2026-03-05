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
  'grok-4.1-reasoning':  { inputPerM: 5.00,  outputPerM: 15.00 }, // update when xAI publishes official pricing
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

function buildSystemPrompt(
  builderType: string,
  projects: Array<{ id: string; title: string; location?: string | null }>
): string {
  const projectsStr = projects.length > 0
    ? projects.map(p => p.location ? `"${p.location} (${p.title})"` : `"${p.title}"`).join(', ')
    : 'none listed'

  const isResidential = (builderType || '').toUpperCase() === 'RESIDENTIAL'

  return `You are a construction field assistant. Given a voice transcript from a superintendent's daily field report, extract structured log data.

Builder type: ${builderType || 'COMMERCIAL'}
Active projects: ${projectsStr}

If the transcript clearly covers MULTIPLE lots/projects, return:
{ "multi": true, "logs": [{ "projectHint": "Lot 5", "lotNumber": "Lot 5", "weather": "...", "crewCounts": {}, "workPerformed": "...", "deliveries": "...", "inspections": "...", "issues": "...", "safetyNotes": "...", "address": "...", "permitNumber": "...", "rfi": "..." }, ...] }

If the transcript covers ONE lot/project, return:
{ "multi": false, "lotNumber": "...", "weather": "...", "crewCounts": {}, "workPerformed": "...", "deliveries": "...", "inspections": "...", "issues": "...", "safetyNotes": "...", "address": "...", "permitNumber": "...", "rfi": "..." }

Rules:
- If something was not mentioned, use an empty string "" or {} for crewCounts.
- For crewCounts, use clean trade names as keys: "Framers", "Electricians", "Plumbers", etc.
- address: job site street address if mentioned, otherwise "".
- permitNumber: building permit number if mentioned, otherwise "".
- lotNumber: the lot number or identifier (e.g. "Lot 5", "5", "22") — match against the active projects list by location field. Use "" if not identifiable.
- rfi: any RFIs (Requests for Information) mentioned, otherwise "".
- Be concise but complete. Do not invent details not mentioned.
- Only use multi=true when the transcript clearly discusses multiple separate lots/addresses/projects.
${isResidential ? '- RESIDENTIAL: You MUST include "issues" for every lot — if none mentioned, write "None reported". Never leave issues blank.\n' : ''}- Return raw JSON only, no markdown fences.`
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
  const structureModel = userSettings?.structureModel ?? 'gpt-4o'

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
