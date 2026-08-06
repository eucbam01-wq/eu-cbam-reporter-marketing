// File: marketing/pages/api/stripe/webhook.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

export const config = {
  api: {
    bodyParser: false,
  },
}

function buffer(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end('Method Not Allowed')
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    return res.status(500).end('Stripe webhook is not configured')
  }

  const signatureHeader = req.headers['stripe-signature']
  const signature = Array.isArray(signatureHeader)
    ? signatureHeader[0]
    : signatureHeader

  if (!signature) return res.status(400).end('Missing signature')

  try {
    const rawBody = await buffer(req)
    const stripe = new Stripe(stripeSecretKey)
    stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch {
    return res.status(400).end('Webhook Error')
  }

  return res.status(200).json({ received: true })
}
