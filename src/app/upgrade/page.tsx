'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const tiers = [
  {
    name: 'COMMUNITY',
    tier: null,
    price: 'Free',
    color: 'text-neon-cyan',
    border: 'border-neon-cyan',
    features: [
      'Community feed & posts',
      'Public profile',
      'View mentor directory',
      'Project portfolio',
      'Basic networking',
    ],
    cta: 'Current Plan',
    ctaStyle: 'btn-secondary',
  },
  {
    name: 'MENTORSHIP',
    tier: 'PRO' as const,
    price: '$20',
    period: '/month',
    color: 'text-safety-yellow',
    border: 'border-safety-yellow',
    features: [
      'Everything in Community',
      'Book mentor sessions',
      'USDC hour trading in-app',
      'Mentor profile listing',
      'Direct messaging',
      'Booking management',
    ],
    cta: 'Upgrade to Mentorship',
    ctaStyle: 'btn-primary',
    highlight: true,
  },
  {
    name: 'DUST LOGS',
    tier: 'DUST_LOGS' as const,
    price: '$50',
    period: '/month',
    color: 'text-safety-orange',
    border: 'border-safety-orange',
    features: [
      'Everything in Mentorship',
      'Voice-to-text field logging',
      'AI-powered log structuring',
      'Notion workspace sync',
      'Google NotebookLM sync',
      'Custom AI field prompts',
      'No files stored (privacy-first)',
      'SOC 2 compliant pipeline',
    ],
    cta: 'Upgrade to Dust Logs',
    ctaStyle: 'btn-primary',
  },
]

export default function UpgradePage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const currentSub = user?.subscription ?? 'FREE'
  const router = useRouter()
  const [loadingTier, setLoadingTier] = useState<string | null>(null)

  const handleUpgrade = async (tier: 'PRO' | 'DUST_LOGS') => {
    setLoadingTier(tier)
    try {
      const res = await fetch(`/api/stripe/checkout?tier=${tier}`, { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        router.push(data.url)
      } else {
        alert(data.error ?? 'Something went wrong.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoadingTier(null)
    }
  }

  const handleManageBilling = async () => {
    setLoadingTier('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        router.push(data.url)
      } else {
        alert(data.error ?? 'Could not open billing portal.')
      }
    } catch {
      alert('Network error.')
    } finally {
      setLoadingTier(null)
    }
  }

  const isSubscribed = currentSub !== 'FREE'

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Back to Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl font-bold text-safety-yellow">UPGRADE YOUR PLAN</h1>
          <p className="text-gray-400 mt-2">Built for field staff. Priced for the real world.</p>
          {isSubscribed && (
            <div className="mt-4">
              <p className="text-sm text-gray-300">
                Current plan: <span className="text-safety-yellow font-semibold">{currentSub}</span>
              </p>
              <button
                onClick={handleManageBilling}
                disabled={loadingTier === 'portal'}
                className="btn-secondary text-sm mt-2 disabled:opacity-50"
              >
                {loadingTier === 'portal' ? 'Opening...' : 'Manage / Cancel Billing'}
              </button>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map(tier => {
            const isCurrent = tier.tier === null
              ? currentSub === 'FREE'
              : currentSub === tier.tier
            const isLoading = tier.tier && loadingTier === tier.tier

            return (
              <div
                key={tier.name}
                className={`card border-2 ${tier.border} ${tier.highlight ? 'ring-2 ring-safety-yellow/20' : ''} flex flex-col`}
              >
                <div>
                  <h2 className={`font-display text-xl font-bold ${tier.color} mb-1`}>{tier.name}</h2>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                    {tier.period && <span className="text-gray-400 text-sm">{tier.period}</span>}
                  </div>
                  <ul className="space-y-2 mb-8">
                    {tier.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-safety-green mt-0.5">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto">
                  {isCurrent ? (
                    <button disabled className="btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
                      Current Plan
                    </button>
                  ) : tier.tier ? (
                    <button
                      onClick={() => handleUpgrade(tier.tier!)}
                      disabled={!!loadingTier}
                      className={`${tier.ctaStyle} w-full text-sm disabled:opacity-50`}
                    >
                      {isLoading ? 'Redirecting...' : tier.cta}
                    </button>
                  ) : (
                    <button disabled className="btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
                      {tier.cta}
                    </button>
                  )}
                  {tier.tier && !isCurrent && (
                    <p className="text-xs text-center text-gray-500 mt-2">Cancel anytime</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-12 card">
          <h3 className="font-bold text-safety-blue mb-4">USDC MENTORSHIP PAYMENTS</h3>
          <p className="text-sm text-gray-300 mb-3">
            Trade mentorship hours peer-to-peer using USDC stablecoin. No credit card chargebacks, instant settlement, and low fees.
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-blueprint-paper/30 p-3 border border-blueprint-grid">
              <p className="font-bold text-neon-cyan mb-1">How It Works</p>
              <p className="text-gray-400 text-xs">Book a mentor session → USDC held in smart contract → Released after session confirmed</p>
            </div>
            <div className="bg-blueprint-paper/30 p-3 border border-blueprint-grid">
              <p className="font-bold text-neon-cyan mb-1">For Mentors</p>
              <p className="text-gray-400 text-xs">Set your hourly rate → Accept bookings → Receive USDC instantly after session</p>
            </div>
            <div className="bg-blueprint-paper/30 p-3 border border-blueprint-grid">
              <p className="font-bold text-neon-cyan mb-1">Fees</p>
              <p className="text-gray-400 text-xs">5% platform fee on mentorship transactions. No fees for community features.</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">* USDC payments require Mentorship tier ($20/mo). Coming soon.</p>
        </div>

        <div className="mt-6 card">
          <h3 className="font-bold text-safety-green mb-4">DUST LOGS — PRIVACY ARCHITECTURE</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <p className="font-bold text-white mb-2">Zero-storage pipeline</p>
              <p className="text-xs text-gray-400">
                Audio is transcribed in-memory and immediately discarded. Your field notes go directly to your own
                Notion workspace or Google NotebookLM — we never store audio or transcripts on our servers.
              </p>
            </div>
            <div>
              <p className="font-bold text-white mb-2">SOC 2 compliant</p>
              <p className="text-xs text-gray-400">
                All API calls are encrypted in transit (TLS 1.3). Auth tokens are scoped per-user. We use
                industry-standard secret management. Audit logs available for Pro accounts.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
