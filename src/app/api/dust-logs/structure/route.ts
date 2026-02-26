import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import { logGpt4oUsage } from '@/lib/usage'
import { checkDustLogsAccess } from '@/lib/check-dust-logs-access'

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

MULTI-SITE RECORDING RULE (critical):
- A superintendent may record a single voice memo covering multiple job sites in one session
- You are ONLY extracting information for the specific project provided in the user message
- If the speaker transitions to a different site (says a different location, lot number, or project name), STOP extracting at that point
- Only include observations you can confidently attribute to the specified project
- If an observation's site is ambiguous, add [VERIFY SITE] to that item
- Do not mix observations from different job sites into one log

OUTPUT FORMAT (JSON):
{
  "summary": "1-2 sentence plain-language summary of the day",
  "workCompleted": ["bullet 1", "bullet 2"],
  "issues": ["issue 1"],
  "safety": ["safety observation 1"],
  "nextSteps": ["next step 1"],
  "tags": ["tag1", "tag2"],
  "jobType": "retail|industrial|healthcare|multi-family|residential|office|other",
  "structuredLog": "full formatted plain-text version for export"
}`

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const hasAccess = await checkDustLogsAccess(userId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Trial expired. Please subscribe to continue.' },
      { status: 403 }
    )
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    )
  }

  const body = await request.json()
  const { transcript, projectName, address, date, permitNumber } = body

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
          content: `ACTIVE PROJECT (extract ONLY information for this site):
Project: ${projectName || 'Unknown'}
Location: ${address || 'Unknown'}
Permit: ${permitNumber || 'N/A'}
Date: ${date || new Date().toISOString().split('T')[0]}

RAW TRANSCRIPT:
${transcript}

Structure this field log. Extract only observations for the project above. If the transcript covers multiple sites, filter to this site only.`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    })

    const structured = JSON.parse(completion.choices[0].message.content || '{}')

    const usage = completion.usage
    if (usage) {
      await logGpt4oUsage(
        (session.user as any).id,
        'structure',
        usage.prompt_tokens,
        usage.completion_tokens,
        projectName
      )
    }

    return NextResponse.json({ structured })
  } catch (err: any) {
    console.error('GPT-4o structuring error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Structuring failed' }, { status: 500 })
  }
}
