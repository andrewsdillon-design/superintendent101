import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const tier = session.metadata?.tier as 'PRO' | 'DUST_LOGS' | undefined
      const subId = session.subscription as string | null

      if (userId && tier) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscription: tier,
            stripeSubId: subId ?? undefined,
          },
        })
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customer = sub.customer as string
      // Skip downgrade for beta testers (free for life)
      await prisma.user.updateMany({
        where: { stripeCustomerId: customer, betaTester: false },
        data: { subscription: 'FREE', stripeSubId: null },
      })
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status === 'active') break
      if (sub.status === 'canceled' || sub.status === 'unpaid') {
        const customer = sub.customer as string
        // Skip downgrade for beta testers (free for life)
        await prisma.user.updateMany({
          where: { stripeCustomerId: customer, betaTester: false },
          data: { subscription: 'FREE', stripeSubId: null },
        })
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
