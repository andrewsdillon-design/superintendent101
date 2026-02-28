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

  const { searchParams } = new URL(request.url)
  const tier = searchParams.get('tier')
  if (tier !== 'PRO' && tier !== 'DUST_LOGS') {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const priceId = tier === 'PRO'
    ? process.env.STRIPE_PRICE_PRO
    : process.env.STRIPE_PRICE_DAILY_LOGS

  if (!priceId) {
    return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const stripe = getStripe()
  let customerId = dbUser.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      name: dbUser.name ?? dbUser.username,
      metadata: { userId: dbUser.id },
    })
    customerId = customer.id
    await prisma.user.update({ where: { id: dbUser.id }, data: { stripeCustomerId: customerId } })
  }

  const origin = request.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/profile?upgraded=1`,
    cancel_url: `${origin}/upgrade`,
    metadata: { userId: dbUser.id, tier },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
