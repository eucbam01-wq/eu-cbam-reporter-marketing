// File: marketing/pages/pricing.tsx
import type { NextPage } from 'next'
import Head from 'next/head'
import { useEffect, useState } from 'react'
import * as Entitlements from '../src/entitlements'

const PricingPage: NextPage = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tier, setTier] = useState<string>('free')

  useEffect(() => {
    try {
      const mod: any = Entitlements as any
      if (typeof mod.getEffectivePlanTier === 'function') {
        setTier((mod.getEffectivePlanTier() || 'free').toString())
        return
      }
    } catch {
      // ignore
    }
    setTier((process.env.NEXT_PUBLIC_PLAN_TIER || 'free').toString())
  }, [])

  const startCheckout = async () => {
    try {
      if (tier?.toString().toLowerCase() === 'pro' || tier?.toString().toLowerCase() === 'enterprise') {
        window.location.assign('/app')
        return
      }
      setLoading(true)
      setError(null)

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = (await res.json()) as { url?: string; error?: string }

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Unable to start checkout')
      }

      window.location.href = data.url
    } catch (e: any) {
      setError(e?.message || 'Checkout failed')
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Pricing | GrandScope EU CBAM Reporter</title>
        <meta
          name="description"
          content="GrandScope EU CBAM Reporter pricing: Free, Pro, Enterprise."
        />
      </Head>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '40px 18px' }}>
        <header style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.1 }}>
            Pricing
          </h1>
          <p style={{ marginTop: 10, opacity: 0.85, maxWidth: 760 }}>
            CBAM compliance without guesswork. Pay for certainty, not spreadsheets.
          </p>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: 18,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Free</h2>
            <p style={{ marginTop: 8, opacity: 0.85 }}>
              For evaluation and internal awareness.
            </p>
            <ul style={{ marginTop: 12, paddingLeft: 18, opacity: 0.9 }}>
              <li>View only dashboard</li>
              <li>CN code coverage lookup</li>
              <li>Default emissions factors</li>
              <li>Basic CBAM cost estimation</li>
              <li>Read only imports list</li>
            </ul>
            <div style={{ marginTop: 14, fontWeight: 700 }}>£0</div>
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
              Start free from your dashboard.
            </div>
          </div>

          <div
            style={{
              border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 14,
              padding: 18,
              boxShadow: '0 0 0 1px rgba(212,175,55,0.18) inset',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid rgba(212,175,55,0.35)',
                fontSize: 12,
                marginBottom: 10,
              }}
            >
              Recommended
            </div>
            <h2 style={{ margin: 0, fontSize: 18 }}>Pro</h2>
            <p style={{ marginTop: 8, opacity: 0.85 }}>
              For importers that must file correctly and on time.
            </p>
            <ul style={{ marginTop: 12, paddingLeft: 18, opacity: 0.9 }}>
              <li>Import uploads</li>
              <li>Supplier management and data collection</li>
              <li>Actual vs default emissions</li>
              <li>Quarterly reporting workflow</li>
              <li>Exposure dashboard and penalty risk</li>
              <li>Scenario planning</li>
              <li>Audit trail</li>
            </ul>
            <div style={{ marginTop: 14, fontWeight: 700 }}>
              £4,800 / year
            </div>

            <button
              onClick={startCheckout}
              disabled={loading}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.22)',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              {tier?.toString().toLowerCase() === 'pro' || tier?.toString().toLowerCase() === 'enterprise'
                ? 'Go to dashboard'
                : loading
                ? 'Redirecting…'
                : 'Upgrade to Pro'}
            </button>

            {error ? (
              <div style={{ marginTop: 10, color: '#ffb4b4', fontSize: 13 }}>
                {error}
              </div>
            ) : null}

            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
              Charges happen in Stripe Checkout.
            </div>
          </div>

          <div
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14,
              padding: 18,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>Enterprise</h2>
            <p style={{ marginTop: 8, opacity: 0.85 }}>
              For groups and high volume importers.
            </p>
            <ul style={{ marginTop: 12, paddingLeft: 18, opacity: 0.9 }}>
              <li>Multiple legal entities</li>
              <li>Group exposure rollups</li>
              <li>Advanced scenario modelling</li>
              <li>AI estimation and prediction</li>
              <li>Priority onboarding and support</li>
            </ul>
            <div style={{ marginTop: 14, fontWeight: 700 }}>Custom</div>
            <div style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>
              Contact sales.
            </div>
          </div>
        </section>

        <footer style={{ marginTop: 26, opacity: 0.7, fontSize: 13 }}>
          CBAM penalties scale fast. Software cost does not.
        </footer>
      </main>
    </>
  )
}

export default PricingPage

// File: marketing/pages/pricing.tsx
