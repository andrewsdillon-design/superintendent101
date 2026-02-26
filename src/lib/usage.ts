import { prisma } from '@/lib/db'

// OpenAI pricing (2025)
// Whisper:  $0.006 per minute
// GPT-4o:   $2.50 per 1M input tokens  / $10.00 per 1M output tokens
const WHISPER_COST_PER_MINUTE   = 0.006
const GPT4O_INPUT_PER_TOKEN     = 0.0000025
const GPT4O_OUTPUT_PER_TOKEN    = 0.00001

/**
 * Log a Whisper transcription call.
 * Duration is estimated from file size (~1 MB ≈ 1 min of compressed audio).
 */
export async function logWhisperUsage(
  userId: string,
  fileSizeBytes: number,
  projectName?: string
) {
  const estimatedMinutes = fileSizeBytes / (1024 * 1024)
  const costUsd = estimatedMinutes * WHISPER_COST_PER_MINUTE

  try {
    await prisma.apiUsageLog.create({
      data: {
        userId,
        service: 'whisper',
        action: 'transcribe',
        fileSizeBytes,
        costUsd,
        projectName: projectName ?? null,
      },
    })
  } catch (err) {
    // Never block the main response for analytics
    console.error('Usage log failed (whisper):', err)
  }
}

/**
 * Log a GPT-4o call with token counts from the completion response.
 */
export async function logGpt4oUsage(
  userId: string,
  action: string,
  inputTokens: number,
  outputTokens: number,
  projectName?: string
) {
  const costUsd = inputTokens * GPT4O_INPUT_PER_TOKEN + outputTokens * GPT4O_OUTPUT_PER_TOKEN

  try {
    await prisma.apiUsageLog.create({
      data: {
        userId,
        service: 'gpt4o',
        action,
        inputTokens,
        outputTokens,
        costUsd,
        projectName: projectName ?? null,
      },
    })
  } catch (err) {
    console.error('Usage log failed (gpt4o):', err)
  }
}
