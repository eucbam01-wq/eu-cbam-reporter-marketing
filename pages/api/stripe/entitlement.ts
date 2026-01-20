// File: pages/api/stripe/entitlement.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' })
  }

  const sessionId = (req.query.session_id || '').toString().trim()
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' })
  }

  try {
    const stripe = new Stripe(stripeSecretKey)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const subId = typeof session.subscription === 'string' ? session.subscription : null
    if (!subId) {
      return res.status(200).json({ entitled: false, plan: 'free' })
    }

    const sub = await stripe.subscriptions.retrieve(subId)
    const status = (sub.status || '').toString()
    const entitled = status === 'active' || status === 'trialing'

    return res.status(200).json({ entitled, plan: entitled ? 'pro' : 'free', subscription_status: status })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Stripe error' })
  }
}

// File: pages/api/stripe/entitlement.ts
