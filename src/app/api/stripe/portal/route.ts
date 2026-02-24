import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 400 })
  }

  const origin = request.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${origin}/profile`,
  })

  return NextResponse.json({ url: portalSession.url })
}
