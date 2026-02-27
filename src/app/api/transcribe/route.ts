import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { toFile } from 'openai'
import { logWhisperUsage } from '@/lib/usage'
import { checkDustLogsAccess } from '@/lib/check-dust-logs-access'

// Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm, ogg, flac
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
  'audio/x-flac': 'flac',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/mpeg': 'mpeg',
  'video/quicktime': 'mp4',
}

const MAX_BYTES = 25 * 1024 * 1024 // 25MB — Whisper hard limit

function resolveExtension(file: File): string {
  if (ALLOWED_TYPES[file.type]) return ALLOWED_TYPES[file.type]
  // Fall back to filename extension
  const ext = file.name.split('.').pop()?.toLowerCase()
  const validExts = ['mp3', 'mp4', 'm4a', 'wav', 'webm', 'ogg', 'flac', 'mpeg', 'mpga']
  return validExts.includes(ext || '') ? ext! : 'webm'
}

export async function POST(request: NextRequest) {
  const { getUserId } = await import('@/lib/get-user-id')
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasAccess = await checkDustLogsAccess(userId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Trial expired. Please subscribe to continue.' },
      { status: 403 }
    )
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

  // Accept field named 'audio' (recorder) or 'file' (drop upload)
  const audioFile = (formData.get('audio') ?? formData.get('file')) as File | null
  if (!audioFile) {
    return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
  }

  if (audioFile.size === 0) {
    return NextResponse.json({ error: 'File is empty' }, { status: 400 })
  }

  if (audioFile.size > MAX_BYTES) {
    const mb = (audioFile.size / 1024 / 1024).toFixed(1)
    return NextResponse.json(
      { error: `File too large (${mb}MB). Whisper limit is 25MB. Compress or split the audio.` },
      { status: 400 }
    )
  }

  const ext = resolveExtension(audioFile)
  const fileName = `field-log.${ext}`

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Buffer in-memory — never written to disk
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
    const whisperFile = await toFile(audioBuffer, fileName, {
      type: audioFile.type || `audio/${ext}`,
    })

    const transcription = await openai.audio.transcriptions.create({
      file: whisperFile,
      model: 'whisper-1',
      language: 'en',
      prompt: 'Construction site field log. Superintendent daily notes. Technical terms: rebar, pour, slab, footing, CMU, MEP, RFI, submittal, punch list, OSHA, GC, subcontractor.',
    })

    await logWhisperUsage(userId, audioFile.size)

    return NextResponse.json({
      transcript: transcription.text,
      fileName: audioFile.name,
      fileSizeBytes: audioFile.size,
    })
  } catch (err: any) {
    console.error('Whisper error:', err?.message)
    const msg =
      err?.status === 401 ? 'Invalid OpenAI API key' :
      err?.status === 400 ? `Whisper rejected file: ${err.message}` :
      err?.message || 'Transcription failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
