import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Notion integration endpoint
// Full implementation requires:
// 1. NOTION_CLIENT_ID and NOTION_CLIENT_SECRET env vars
// 2. OAuth redirect flow at /api/integrations/notion/callback
// 3. Store encrypted token in DB per user

export async function GET(request: NextRequest) {
  // TODO: Return user's Notion connection status from DB
  return NextResponse.json({
    connected: false,
    message: 'Notion integration coming soon. Requires Dust Logs tier.',
  })
}

export async function POST(request: NextRequest) {
  // TODO: Initiate Notion OAuth flow
  // Redirect to: https://api.notion.com/v1/oauth/authorize?...
  return NextResponse.json({
    error: 'Notion OAuth not yet configured',
    instructions: 'Set NOTION_CLIENT_ID and NOTION_CLIENT_SECRET in .env',
  }, { status: 501 })
}

