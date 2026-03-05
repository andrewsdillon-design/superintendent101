import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/integrations/procore — connection status
export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { procoreAccessToken: true, procoreCompanyId: true },
  })

  return NextResponse.json({
    connected: !!dbUser?.procoreAccessToken,
    companyId: dbUser?.procoreCompanyId ?? null,
  })
}

// DELETE /api/integrations/procore — disconnect
export async function DELETE() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: user.id },
    data: {
      procoreAccessToken:  null,
      procoreRefreshToken: null,
      procoreTokenExpiry:  null,
      procoreCompanyId:    null,
    },
  })

  // Remove all project links for this user
  await prisma.procoreProjectLink.deleteMany({ where: { userId: user.id } })

  return NextResponse.json({ disconnected: true })
}
