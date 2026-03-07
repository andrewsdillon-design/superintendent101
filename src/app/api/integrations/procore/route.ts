import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/get-user-id'
import { prisma } from '@/lib/db'

// GET /api/integrations/procore — connection status
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { procoreAccessToken: true, procoreCompanyId: true },
  })

  return NextResponse.json({
    connected: !!dbUser?.procoreAccessToken,
    companyId: dbUser?.procoreCompanyId ?? null,
  })
}

// DELETE /api/integrations/procore — disconnect
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.user.update({
    where: { id: userId },
    data: {
      procoreAccessToken:  null,
      procoreRefreshToken: null,
      procoreTokenExpiry:  null,
      procoreCompanyId:    null,
    },
  })

  // Remove all project links for this user
  await prisma.procoreProjectLink.deleteMany({ where: { userId } })

  return NextResponse.json({ disconnected: true })
}
