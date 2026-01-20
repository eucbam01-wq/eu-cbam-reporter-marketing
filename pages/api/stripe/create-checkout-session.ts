// File: marketing/pages/api/stripe/create-checkout-session.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const proPriceId = process.env.STRIPE_PRICE_PRO_ANNUAL

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY' })
  }

  if (!proPriceId) {
    return res.status(500).json({ error: 'Missing STRIPE_PRICE_PRO_ANNUAL' })
  }

  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    })

    const origin = req.headers.origin || `https://${req.headers.host}`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: proPriceId, quantity: 1 }],
      success_url: `${origin}/pricing?success=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      allow_promotion_codes: false,
    })

    return res.status(200).json({ url: session.url })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Stripe error' })
  }
}

// File: marketing/pages/api/stripe/create-checkout-session.ts
