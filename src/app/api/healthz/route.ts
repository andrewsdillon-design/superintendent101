import { NextResponse } from 'next/server'

// Minimal public health check — no env var names exposed
export async function GET() {
  const ready = !!(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET && process.env.DATABASE_URL)
  return NextResponse.json({ ok: ready }, { status: ready ? 200 : 503 })
}
