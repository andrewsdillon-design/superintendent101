import { NextResponse } from 'next/server'

// JobSite model removed — use /api/mobile/projects instead
export async function GET() { return NextResponse.json({ jobSites: [] }) }
export async function POST() { return NextResponse.json({ error: 'Use /api/mobile/projects' }, { status: 410 }) }
