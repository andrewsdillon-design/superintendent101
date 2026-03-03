import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { getUserId } from '@/lib/get-user-id'
import { prisma } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

function buildSystemPrompt(builderType: string, projectTitles: string[]): string {
  const projectsStr = projectTitles.length > 0 ? projectTitles.join(', ') : 'none listed'

  return `You are a construction field assistant. Given a voice transcript from a superintendent's daily field report, extract structured log data.

Builder type: ${builderType || 'COMMERCIAL'}
Active projects: ${projectsStr}

If the transcript clearly covers MULTIPLE lots/projects, return:
{ "multi": true, "logs": [{ "projectHint": "Lot 5", "weather": "...", "crewCounts": {}, "workPerformed": "...", "deliveries": "...", "inspections": "...", "issues": "...", "safetyNotes": "...", "address": "...", "permitNumber": "...", "rfi": "..." }, ...] }

If the transcript covers ONE lot/project, return:
{ "multi": false, "weather": "...", "crewCounts": {}, "workPerformed": "...", "deliveries": "...", "inspections": "...", "issues": "...", "safetyNotes": "...", "address": "...", "permitNumber": "...", "rfi": "..." }

Rules:
- If something was not mentioned, use an empty string "" or {} for crewCounts.
- For crewCounts, use clean trade names as keys: "Framers", "Electricians", "Plumbers", etc.
- address: job site street address if mentioned, otherwise "".
- permitNumber: building permit number if mentioned, otherwise "".
- rfi: any RFIs (Requests for Information) mentioned, otherwise "".
- Be concise but complete. Do not invent details not mentioned.
- Only use multi=true when the transcript clearly discusses multiple separate lots/addresses/projects.
- Return raw JSON only, no markdown fences.`
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

// gpt-4o-mini-transcribe: $0.003/min  →  estimate from file size at ~128kbps
function estimateTranscribeCost(bytes: number): number {
  const minutes = bytes / (128 * 1024 / 8) / 60
  return Math.max(0.001, minutes * 0.003)
}

// gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
function estimateStructureCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * 0.15 + (outputTokens / 1_000_000) * 0.60
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = rateLimit(`transcribe:${userId}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 })
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

  let projectTitles: string[] = []
  try {
    const parsed = JSON.parse(projectsRaw) as Array<{ id: string; title: string }>
    projectTitles = parsed.map((p) => p.title)
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
      // Audio path — Step 1: Transcribe with whisper-1
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
          service: 'whisper',
          action: 'transcribe',
          fileSizeBytes: audioFile!.size,
          costUsd: estimateTranscribeCost(audioFile!.size),
        },
      }).catch(() => {})
    }

    // Step 2: Structure with gpt-4o
    const systemPrompt = buildSystemPrompt(builderType, projectTitles)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

    const inputTokens = completion.usage?.prompt_tokens ?? 0
    const outputTokens = completion.usage?.completion_tokens ?? 0

    // Log structuring usage (non-blocking)
    prisma.apiUsageLog.create({
      data: {
        userId,
        service: 'gpt4o',
        action: 'structure',
        inputTokens,
        outputTokens,
        costUsd: estimateStructureCost(inputTokens, outputTokens),
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
