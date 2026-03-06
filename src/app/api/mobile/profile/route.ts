import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'

const ALLOWED_MODELS = ['gpt-4o', 'grok-4.1-reasoning']

// GET /api/mobile/profile
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      builderType: true, structureModel: true, onboarded: true, defaultProjectId: true,
      procoreAccessToken: true, notifyDailyReminder: true, notifyReminderHour: true,
      weeklyReportScheduled: true, weeklyReportEmail: true, email: true,
    },
  })

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({
    builderType: user.builderType,
    structureModel: user.structureModel ?? 'gpt-4o',
    onboarded: user.onboarded,
    defaultProjectId: user.defaultProjectId,
    procoreConnected: !!user.procoreAccessToken,
    notifyDailyReminder: user.notifyDailyReminder,
    notifyReminderHour: user.notifyReminderHour,
    weeklyReportScheduled: user.weeklyReportScheduled,
    weeklyReportEmail: user.weeklyReportEmail ?? user.email,
  })
}

// PATCH /api/mobile/profile
export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { builderType, structureModel, notifyDailyReminder, notifyReminderHour, weeklyReportScheduled, weeklyReportEmail } = body

  const data: Record<string, unknown> = {}

  if (builderType !== undefined) {
    if (!['RESIDENTIAL', 'COMMERCIAL'].includes(builderType)) {
      return NextResponse.json({ error: 'builderType must be RESIDENTIAL or COMMERCIAL' }, { status: 400 })
    }
    data.builderType = builderType
  }

  if (structureModel !== undefined) {
    if (!ALLOWED_MODELS.includes(structureModel)) {
      return NextResponse.json({ error: `structureModel must be one of: ${ALLOWED_MODELS.join(', ')}` }, { status: 400 })
    }
    data.structureModel = structureModel
  }

  if (notifyDailyReminder !== undefined) data.notifyDailyReminder = !!notifyDailyReminder
  if (notifyReminderHour !== undefined) data.notifyReminderHour = Math.min(23, Math.max(0, parseInt(notifyReminderHour)))
  if (weeklyReportScheduled !== undefined) data.weeklyReportScheduled = !!weeklyReportScheduled
  if (weeklyReportEmail !== undefined) data.weeklyReportEmail = weeklyReportEmail?.trim() || null

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, builderType: true, structureModel: true, notifyDailyReminder: true, weeklyReportScheduled: true },
  })

  return NextResponse.json({ user })
}
