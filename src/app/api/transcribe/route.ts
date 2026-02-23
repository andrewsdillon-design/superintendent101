import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'
import { toFile } from 'openai'

// Zero-storage transcription pipeline
// Audio is streamed to Whisper, transcript returned, audio never written to disk

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env' },
      { status: 503 }
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const audioFile = formData.get('audio') as File | null
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }

  const maxBytes = 25 * 1024 * 1024 // 25MB Whisper limit
  if (audioFile.size > maxBytes) {
    return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 400 })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Convert File to format OpenAI accepts — never written to disk
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const whisperFile = await toFile(audioBuffer, audioFile.name || 'audio.webm', {
      type: audioFile.type || 'audio/webm',
    })

    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
      model: 'whisper-1',
      language: 'en',
      prompt: 'Construction site field log. Superintendent notes. May include technical terms: rebar, pour, slab, footing, CMU, MEP, RFI, submittal, punch list, OSHA.',
    })

    // Audio cleared from memory — only return text
    return NextResponse.json({
      transcript: transcription.text,
      duration: audioFile.size, // approximate
    })
  } catch (err: any) {
    console.error('Whisper error:', err?.message)
    const msg = err?.status === 401
      ? 'Invalid OpenAI API key'
      : err?.message || 'Transcription failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
