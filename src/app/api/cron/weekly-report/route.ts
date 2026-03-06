import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import OpenAI from 'openai'
import { sendEmail } from '@/lib/email'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// POST /api/cron/weekly-report
// Called by VPS cron every Monday at 6am UTC.
// Generates and emails weekly summaries to opted-in users.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get the week that just ended (Mon–Sun)
  const now = new Date()
  const weekEnd = new Date(now)
  weekEnd.setUTCDate(now.getUTCDate() - 1) // yesterday = Sunday
  weekEnd.setUTCHours(23, 59, 59, 999)
  const weekStart = new Date(weekEnd)
  weekStart.setUTCDate(weekEnd.getUTCDate() - 6) // 7 days back
  weekStart.setUTCHours(0, 0, 0, 0)

  // Fetch opted-in users
  const users = await prisma.user.findMany({
    where: { weeklyReportScheduled: true },
    select: { id: true, name: true, email: true, weeklyReportEmail: true },
  })

  let sent = 0
  let errors = 0

  for (const user of users) {
    try {
      const logs = await prisma.dailyLog.findMany({
        where: {
          userId: user.id,
          date: { gte: weekStart, lte: weekEnd },
          archived: false,
        },
        orderBy: { date: 'asc' },
        include: { project: { select: { title: true } } },
      })

      if (logs.length === 0) continue

      const logText = logs.map(l => {
        const d = new Date(l.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        const proj = l.project ? ` [${l.project.title}]` : ''
        const parts = [
          `Date: ${d}${proj}`,
          l.weather && `Weather: ${l.weather}`,
          l.workPerformed && `Work: ${l.workPerformed}`,
          l.issues && `Issues: ${l.issues}`,
          l.safetyNotes && `Safety: ${l.safetyNotes}`,
        ].filter(Boolean)
        return parts.join('\n')
      }).join('\n\n---\n\n')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: 'You are a construction field report writer. Write a concise, professional weekly summary paragraph from the daily log entries provided. Focus on work completed, any issues, and safety highlights. 3-5 sentences.',
        }, {
          role: 'user',
          content: `Weekly field logs:\n\n${logText}`,
        }],
        max_tokens: 400,
      })

      const summary = completion.choices[0]?.message?.content?.trim() ?? ''
      const to = user.weeklyReportEmail || user.email
      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

      await sendEmail({
        to,
        subject: `Weekly Field Report — ${weekLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#f97316;margin-bottom:4px">Weekly Field Report</h2>
            <p style="color:#6b7280;margin-top:0">${weekLabel} · ${logs.length} log${logs.length !== 1 ? 's' : ''}</p>
            <div style="background:#f9fafb;border-left:4px solid #f97316;padding:16px;border-radius:4px;margin:20px 0">
              <p style="margin:0;line-height:1.7;color:#111827">${summary}</p>
            </div>
            <p style="color:#9ca3af;font-size:12px">Sent automatically by ProFieldHub. <a href="https://profieldhub.com/profile" style="color:#f97316">Manage preferences</a></p>
          </div>
        `,
      })
      sent++
    } catch {
      errors++
    }
  }

  return NextResponse.json({ sent, errors, total: users.length })
}
