import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import OpenAI from 'openai'

const FIELD_AI_SYSTEM_PROMPT = `You are a construction field documentation AI for Superintendent101.

Your job is to take a raw voice transcript from a superintendent's field log and structure it into a clean, professional daily log entry.

FIELD AI OPERATING RULES:
1. Context is king — preserve every observation, never rewrite history
2. Plain field language — no corporate buzzwords or executive fluff
3. Safety observations ALWAYS listed first if present
4. Be specific: quantities, locations, trade names, times when mentioned
5. Separate clearly: Work Completed / Issues & RFIs / Safety / Next Steps
6. If something was unclear in the transcript, flag it with [UNCLEAR]
7. Superintendent role clarity — document what YOU observed, not hearsay
8. Walk the site rule — if it's documented, it happened

OUTPUT FORMAT (JSON):
{
  "summary": "1-2 sentence plain-language summary of the day",
  "workCompleted": ["bullet 1", "bullet 2"],
  "issues": ["issue 1"],
  "safety": ["safety observation 1"],
  "nextSteps": ["next step 1"],
  "tags": ["tag1", "tag2"],
  "jobType": "retail|industrial|healthcare|multi-family|office|other",
  "structuredLog": "full formatted plain-text version for export"
}`

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    )
  }

  const body = await request.json()
  const { transcript, projectName, address, date } = body

  if (!transcript?.trim()) {
    return NextResponse.json({ error: 'Transcript is required' }, { status: 400 })
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: FIELD_AI_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Project: ${projectName || 'Unknown'}
Location: ${address || 'Unknown'}
Date: ${date || new Date().toISOString().split('T')[0]}

RAW TRANSCRIPT:
${transcript}

Structure this field log according to the rules above.`,
        },
      ],
      max_tokens: 1000,
      temperature: 0.2,
    })

    const structured = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json({ structured })
  } catch (err: any) {
    console.error('GPT-4o structuring error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Structuring failed' }, { status: 500 })
  }
}
