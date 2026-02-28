'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const features = [
  'Voice-to-text field logging (Whisper AI)',
  'AI-structured daily log output',
  'Crew counts by trade',
  'Weather condition logging',
  'Work performed, deliveries, inspections',
  'Issues & delays tracking',
  'Safety notes section',
  'Photo attachments',
  'PDF export per log',
  'Full log history',
  'Data export (ZIP download)',
  '7-day free trial',
]

export default function UpgradePage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const currentSub = user?.subscription ?? 'FREE'
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isSubscribed = currentSub === 'DUST_LOGS' || currentSub === 'PRO'

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout?tier=DUST_LOGS', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        router.push(data.url)
      } else {
        alert(data.error ?? 'Something went wrong.')
      }
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
          <Link href="/daily-logs" className="text-sm text-gray-400 hover:text-white">← Back to Logs</Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-safety-yellow">DAILY LOGS PRO</h1>
          <p className="text-gray-400 mt-2">Everything you need to log the field like a pro.</p>
          {isSubscribed && (
            <div className="mt-4">
              <p className="text-sm text-safety-green font-semibold">
                ✓ You&apos;re subscribed — Daily Logs Pro is active
              </p>
              <button
                onClick={handleManageBilling}
                disabled={loading}
                className="btn-secondary text-sm mt-3 disabled:opacity-50"
              >
                {loading ? 'Opening...' : 'Manage / Cancel Billing'}
              </button>
            </div>
          )}
        </div>

        <div className="card border-2 border-safety-orange ring-2 ring-safety-orange/20">
          <div className="text-xs text-safety-orange font-bold mb-3 uppercase tracking-wider">Daily Logs Pro</div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-5xl font-bold text-white">$9.99</span>
            <span className="text-gray-400 text-sm">/month</span>
          </div>
          <p className="text-safety-green text-sm mb-8 font-semibold">7-day free trial included</p>

          <ul className="space-y-3 mb-8">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-safety-green mt-0.5 flex-shrink-0">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          {isSubscribed ? (
            <button disabled className="btn-secondary w-full text-sm opacity-50 cursor-not-allowed">
              Current Plan
            </button>
          ) : (
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="btn-primary w-full text-base py-3 disabled:opacity-50"
            >
              {loading ? 'Redirecting...' : 'Start Free Trial'}
            </button>
          )}
          {!isSubscribed && (
            <p className="text-xs text-center text-gray-500 mt-3">Cancel anytime · No credit card to start</p>
          )}
        </div>
      </main>
    </div>
  )
}
