import { NextRequest, NextResponse } from 'next/server'
import { checkProAccess } from '@/lib/check-pro-access'

// Full pipeline: receives structured log + pushes to user's Notion workspace.
// No data is stored on our system — Notion is the only destination.
export async function POST(request: NextRequest) {
  const { getUserId } = await import('@/lib/get-user-id')
  const userId = await getUserId(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hasAccess = await checkProAccess(userId)
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Trial expired. Please subscribe to continue.' },
      { status: 403 }
    )
  }

  // Notion integration removed — use /api/daily-logs instead
  return NextResponse.json({ error: 'Notion integration has been removed. Use /api/daily-logs.' }, { status: 410 })
}
