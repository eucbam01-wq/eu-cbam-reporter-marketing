// File: marketing/pages/api/stripe/entitlement.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

function getStripeClient(): Stripe {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY')
  }

  return new Stripe(stripeSecretKey)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sessionId = (req.query.session_id || '').toString()
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' })

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price'],
    })

    const paid = session.payment_status === 'paid' || session.status === 'complete'
    if (!paid) return res.status(200).json({ tier: 'free' })

    const proPriceId = (process.env.STRIPE_PRICE_PRO_ANNUAL || '').toString()
    const items = session.line_items?.data || []
    const hasPro = proPriceId
      ? items.some((item) => item.price?.id === proPriceId)
      : true

    return res.status(200).json({ tier: hasPro ? 'pro' : 'free' })
  } catch {
    return res.status(200).json({ tier: 'free' })
  }
}
