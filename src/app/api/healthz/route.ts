import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
  })
}
