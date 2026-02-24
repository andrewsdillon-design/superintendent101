import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

export const STRIPE_PRICES = {
  PRO: process.env.STRIPE_PRICE_PRO!,
  DUST_LOGS: process.env.STRIPE_PRICE_DUST_LOGS!,
}
