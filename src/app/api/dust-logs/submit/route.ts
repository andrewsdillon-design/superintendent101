import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { pushLogToNotion } from '@/lib/notion'
import { pushLogToDrive } from '@/lib/google-drive'

// Full pipeline: receives structured log + pushes to user workspaces
// This is called after transcription + GPT-4o structuring is complete on the client
export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { projectName, address, date, duration, tags, transcript, structured } = body

  if (!projectName) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 })
  }

  // Get user's integration tokens
  const user = await prisma.user.findUnique({
    where: { email: (session.user as any).email },
    select: {
      id: true,
      notionToken: true,
      notionDbId: true,
      googleToken: true,
      googleFolderId: true,
      subscription: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const logDate = date || new Date().toISOString().split('T')[0]
  const logData = { projectName, address: address || '', date: logDate, structured }

  const results: Record<string, any> = {}

  // Push to Notion if connected
  if (user.notionToken && user.notionDbId) {
    try {
      await pushLogToNotion(user.notionToken, user.notionDbId, logData)
      results.notion = 'synced'
    } catch (err: any) {
      console.error('Notion push failed:', err.message)
      results.notion = `failed: ${err.message}`
    }
  } else {
    results.notion = 'not connected'
  }

  // Push to Google Drive if connected
  if (user.googleToken && user.googleFolderId) {
    try {
      await pushLogToDrive(user.googleToken, user.googleFolderId, logData)
      results.google = 'synced'
    } catch (err: any) {
      console.error('Google Drive push failed:', err.message)
      results.google = `failed: ${err.message}`
    }
  } else {
    results.google = 'not connected'
  }

  // Save metadata to DB — NO audio or full transcript stored
  const dustLog = await prisma.audioLog.create({
    data: {
      userId: user.id,
      audioUrl: 'voice-input', // placeholder — we don't store actual audio
      transcript: null,        // not stored — privacy-first
      status: 'COMPLETED',
      projectName,
      address: address || null,
      tags: structured?.tags || tags || [],
      duration: duration || null,
    },
  })

  return NextResponse.json({
    id: dustLog.id,
    results,
    message: Object.values(results).every(v => v === 'synced' || v === 'not connected')
      ? 'Log saved'
      : 'Log saved with some sync errors',
  })
}
