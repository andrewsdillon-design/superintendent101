import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { pushLogToNotion, findBestDatabase } from '@/lib/notion'
import { checkDustLogsAccess } from '@/lib/check-dust-logs-access'

// Full pipeline: receives structured log + pushes to user's Notion workspace.
// No data is stored on our system — Notion is the only destination.
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

  const body = await request.json()
  const { projectName, address, date, duration, tags, structured } = body

  if (!projectName) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { notionToken: true, notionDbId: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.notionToken || !user.notionDbId) {
    return NextResponse.json(
      { error: 'Notion not connected. Go to your profile to connect Notion before saving logs.' },
      { status: 422 }
    )
  }

  const logDate = date || new Date().toISOString().split('T')[0]
  const jobType = structured?.jobType || 'other'

  // Find the best Notion database — matches project name, then job type, then default
  const target = await findBestDatabase(user.notionToken, user.notionDbId, projectName, jobType)

  const logData = {
    projectName,
    address: address || '',
    date: logDate,
    structured: structured || {
      summary: '',
      workCompleted: [],
      issues: [],
      safety: [],
      nextSteps: tags || [],
      tags: tags || [],
      jobType: 'other',
      structuredLog: '',
    },
  }

  try {
    const notionPage = await pushLogToNotion(user.notionToken, target.id, logData)
    return NextResponse.json({
      message: 'Log saved to Notion',
      notionPageId: notionPage.id,
      notionUrl: notionPage.url,
      targetDatabase: target.name,
    })
  } catch (err: any) {
    console.error('Notion push failed:', err.message)
    return NextResponse.json(
      { error: `Failed to save to Notion: ${err.message}` },
      { status: 500 }
    )
  }
}
