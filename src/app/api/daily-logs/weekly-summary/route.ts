import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/daily-logs/weekly-summary
// Body: { weekStart?: string }  — ISO date string (defaults to last Monday)
// Returns { summary: string, weekStart: string, weekEnd: string, logCount: number }
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  // Determine week range
  let weekStart: Date
  if (body.weekStart) {
    weekStart = new Date(body.weekStart + 'T00:00:00')
  } else {
    // Default to last Monday (or today if today is Monday)
    const now = new Date()
    const day = now.getDay() // 0=Sun, 1=Mon...
    const daysBack = day === 0 ? 6 : day - 1
    weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysBack)
    weekStart.setHours(0, 0, 0, 0)
  }
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const logs = await prisma.dailyLog.findMany({
    where: {
      userId,
      date: { gte: weekStart, lt: weekEnd },
      archived: false,
    },
    include: { project: { select: { id: true, title: true } } },
    orderBy: { date: 'asc' },
  })

  if (logs.length === 0) {
    return NextResponse.json({
      summary: 'No daily logs found for this week.',
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      logCount: 0,
    })
  }

  // Build a text block from all logs
  const logText = logs.map(log => {
    const dateStr = new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    const crewTotal = Object.values(log.crewCounts as Record<string, number>).reduce((s, n) => s + (n || 0), 0)
    const parts = [
      `DATE: ${dateStr}`,
      log.project ? `PROJECT: ${log.project.title}` : null,
      log.address ? `ADDRESS: ${log.address}` : null,
      log.weather ? `WEATHER: ${log.weather}` : null,
      crewTotal > 0 ? `CREW: ${crewTotal} workers` : null,
      log.workPerformed ? `WORK: ${log.workPerformed}` : null,
      log.deliveries ? `DELIVERIES: ${log.deliveries}` : null,
      log.inspections ? `INSPECTIONS: ${log.inspections}` : null,
      log.issues ? `ISSUES: ${log.issues}` : null,
      log.rfi ? `RFIs: ${log.rfi}` : null,
      log.safetyNotes ? `SAFETY: ${log.safetyNotes}` : null,
    ].filter(Boolean)
    return parts.join('\n')
  }).join('\n\n---\n\n')

  const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekEnd.getTime() - 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a construction project manager writing weekly field reports.
Write a clear, professional weekly summary for the office based on the daily logs provided.
Format the summary with these sections:
- A brief opening paragraph summarizing the week
- Key Accomplishments (bullet list)
- Issues & RFIs Logged (bullet list, or "None" if no issues)
- Safety Notes (bullet list, or "No incidents" if clean)
- Crew & Production Stats (total crew days, projects worked)
- Looking Ahead (brief closing note)
Keep it concise and factual. Write in past tense. Use construction industry terminology.`,
      },
      {
        role: 'user',
        content: `Weekly Field Report — ${weekLabel}\n\n${logText}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 800,
  })

  const summary = completion.choices[0]?.message?.content ?? 'Could not generate summary.'

  return NextResponse.json({
    summary,
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
    logCount: logs.length,
  })
}
