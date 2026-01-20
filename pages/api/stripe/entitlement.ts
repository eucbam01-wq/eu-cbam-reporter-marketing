// File: pages/api/stripe/entitlement.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const session_id = (req.query.session_id || '').toString()
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' })

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items.data.price'],
    })

    const paid = (session as any)?.payment_status === 'paid' || (session as any)?.status === 'complete'
    if (!paid) return res.status(200).json({ tier: 'free' })

    const proPriceId = (process.env.STRIPE_PRICE_PRO_ANNUAL || '').toString()
    const items = (session as any)?.line_items?.data || []
    const hasPro = proPriceId
      ? items.some((it: any) => (it?.price?.id || '') === proPriceId)
      : true

    return res.status(200).json({ tier: hasPro ? 'pro' : 'free' })
  } catch (e: any) {
    return res.status(200).json({ tier: 'free' })
  }
}

// File: pages/api/stripe/entitlement.ts
