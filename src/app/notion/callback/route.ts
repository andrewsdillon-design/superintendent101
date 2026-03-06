import { NextRequest, NextResponse } from 'next/server'

// Notion integration removed
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/profile', request.url))
}
