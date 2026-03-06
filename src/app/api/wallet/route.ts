import { NextResponse } from 'next/server'

// Wallet/crypto features removed
export async function POST() {
  return NextResponse.json({ error: 'Feature removed' }, { status: 410 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Feature removed' }, { status: 410 })
}
