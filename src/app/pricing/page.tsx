import Link from 'next/link'

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

export default function PricingPage() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <Link href="/" className="font-display text-lg sm:text-2xl font-bold text-neon-cyan whitespace-nowrap">
            ProFieldHub
          </Link>
          <div className="flex gap-2 sm:gap-4">
            <Link href="/login" className="btn-secondary text-sm sm:text-base">Sign In</Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            ONE PLAN.
            <br />
            <span className="text-neon-cyan">EVERYTHING YOU NEED.</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Built for field staff. Priced for the real world.
          </p>
        </div>

        <div className="card border-2 border-safety-orange ring-2 ring-safety-orange/20 max-w-md mx-auto">
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

          <Link
            href="/register?plan=DUST_LOGS"
            className="btn-primary w-full text-base text-center block py-3"
          >
            Start Free Trial
          </Link>
          <p className="text-xs text-center text-gray-500 mt-3">Cancel anytime · No credit card to start trial</p>
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-neon-cyan hover:underline">Sign in →</Link>
        </div>
      </main>
    </div>
  )
}
