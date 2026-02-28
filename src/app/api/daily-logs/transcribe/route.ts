import { NextRequest, NextResponse } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { getUserId } from '@/lib/get-user-id'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' })

const SYSTEM_PROMPT = `You are a construction field log assistant. Extract structured daily log data from this superintendent's voice notes.

Return ONLY a valid JSON object with these exact keys:
{
  "weather": "string — conditions and temperature if mentioned, e.g. 'Clear, 87°F'",
  "crewCounts": { "Trade Name": count_as_number },
  "workPerformed": "string — what was built or done today",
  "deliveries": "string — materials or equipment delivered",
  "inspections": "string — any inspections, include pass/fail if mentioned",
  "issues": "string — delays, problems, concerns",
  "safetyNotes": "string — safety observations or incidents"
}

Rules:
- If something was not mentioned, use an empty string "" or {} for crewCounts.
- For crewCounts, use clean trade names as keys: "Framers", "Electricians", "Plumbers", etc.
- Be concise but complete. Do not invent details not mentioned.
- Return raw JSON only, no markdown fences.`

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
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }

  if (audioFile.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[audioFile.type] ?? 'm4a'

  try {
    // Step 1: Transcribe with OpenAI Whisper
    const audioBuffer = await audioFile.arrayBuffer()
    const file = await toFile(Buffer.from(audioBuffer), `field-note.${ext}`, {
      type: audioFile.type || 'audio/m4a',
    })

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'gpt-4o-mini-transcribe',
      language: 'en',
    })

    const transcript = transcription.text?.trim()
    if (!transcript) {
      return NextResponse.json({ error: 'Could not transcribe audio — try speaking more clearly or uploading a cleaner recording.' }, { status: 422 })
    }

    // Step 2: Structure with GPT-4o-mini
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    })

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
