import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProcoreAuthUrl } from '@/lib/procore'
import { randomBytes } from 'crypto'

// GET /api/integrations/procore/connect — returns redirect URL to Procore OAuth
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = randomBytes(16).toString('hex')
  const url = getProcoreAuthUrl(state)
  return NextResponse.json({ url })
}
