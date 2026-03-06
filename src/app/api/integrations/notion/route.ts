import { NextResponse } from 'next/server'

// Notion integration removed
const gone = () => NextResponse.json({ error: 'Notion integration removed' }, { status: 410 })

export async function GET() { return NextResponse.json({ connected: false }) }
export async function POST() { return gone() }
export async function PATCH() { return gone() }
export async function DELETE() { return gone() }
