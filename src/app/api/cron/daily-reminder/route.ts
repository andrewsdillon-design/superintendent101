import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/cron/daily-reminder
// Called by VPS cron every hour. Sends push notification to users
// who opted in and haven't filed a log today (based on notifyReminderHour UTC).
// Protected by CRON_SECRET env var.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const nowHour = new Date().getUTCHours()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // Find users whose reminder hour matches now, have a push token, opted in
  const users = await prisma.user.findMany({
    where: {
      notifyDailyReminder: true,
      notifyReminderHour: nowHour,
      pushToken: { not: null },
    },
    select: { id: true, pushToken: true, name: true },
  })

  if (users.length === 0) return NextResponse.json({ sent: 0 })

  // Check which users already have a log today
  const userIds = users.map(u => u.id)
  const todayLogs = await prisma.dailyLog.findMany({
    where: {
      userId: { in: userIds },
      date: today,
      archived: false,
    },
    select: { userId: true },
  })
  const loggedToday = new Set(todayLogs.map(l => l.userId))

  // Send to users who haven't logged yet
  const toNotify = users.filter(u => !loggedToday.has(u.id) && u.pushToken)
  if (toNotify.length === 0) return NextResponse.json({ sent: 0 })

  const messages = toNotify.map(u => ({
    to: u.pushToken!,
    sound: 'default' as const,
    title: "Daily Log Reminder",
    body: `Hey${u.name ? ` ${u.name.split(' ')[0]}` : ''}! Don't forget to file today's field log.`,
    data: { screen: 'daily-logs' },
  }))

  // Send via Expo Push API in chunks of 100
  const chunks: typeof messages[] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  let sent = 0
  for (const chunk of chunks) {
    try {
      const resp = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(chunk),
      })
      if (resp.ok) sent += chunk.length
    } catch {
      // log and continue
    }
  }

  return NextResponse.json({ sent, total: toNotify.length })
}
