import { NextResponse } from 'next/server'

// Mentor marketplace removed
export async function GET() {
  return NextResponse.json({ mentors: [] })
}
