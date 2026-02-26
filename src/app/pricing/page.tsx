import Link from 'next/link'

const tiers = [
  {
    name: 'COMMUNITY',
    plan: 'COMMUNITY',
    price: 'Free',
    color: 'text-neon-cyan',
    border: 'border-neon-cyan',
    features: [
      'Community feed & posts',
      'Public profile',
      'Browse mentor directory',
      'Book & pay for mentor sessions',
      'Project portfolio',
      'Basic networking',
    ],
    cta: 'Get Started Free',
    ctaStyle: 'btn-secondary',
  },
  {
    name: 'DAILY LOGS',
    plan: 'DUST_LOGS',
    price: '$19',
    period: '/month',
    color: 'text-safety-orange',
    border: 'border-safety-orange',
    highlight: true,
    features: [
      'Everything in Community',
      '7-day free trial',
      'Voice-to-text field logging',
      'AI-powered log structuring',
      'Notion workspace sync',
      'Custom AI field prompts',
      'No files stored (privacy-first)',
    ],
    cta: 'Start Free Trial',
    ctaStyle: 'btn-primary',
  },
  {
    name: 'REGISTER AS MENTOR',
    plan: 'PRO',
    price: '$39',
    period: '/month',
    color: 'text-safety-yellow',
    border: 'border-safety-yellow',
    features: [
      'Everything in Daily Logs',
      'List yourself as a mentor',
      'Accept booking requests',
      'Set your hourly rate',
      'USDC peer-to-peer payments',
      'Booking management dashboard',
      'Direct messaging',
    ],
    cta: 'Register as Mentor',
    ctaStyle: 'btn-primary',
  },
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

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-3">
            BUILT FOR THE FIELD.
            <br />
            <span className="text-neon-cyan">PRICED FOR THE REAL WORLD.</span>
          </h1>
          <p className="text-gray-400 text-base sm:text-lg">
            Pick the plan that fits your work. No fluff, no corporate pricing.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map(tier => (
            <div
              key={tier.name}
              className={`card border-2 ${tier.border} ${tier.highlight ? 'ring-2 ring-safety-orange/20' : ''} flex flex-col`}
            >
              <div>
                {tier.highlight && (
                  <div className="text-xs text-safety-orange font-bold mb-2 uppercase tracking-wider">Most Popular</div>
                )}
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
                <Link
                  href={`/register?plan=${tier.plan}`}
                  className={`${tier.ctaStyle} w-full text-sm text-center block`}
                >
                  {tier.cta}
                </Link>
                {tier.plan !== 'COMMUNITY' && (
                  <p className="text-xs text-center text-gray-500 mt-2">Cancel anytime</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-neon-cyan hover:underline">Sign in →</Link>
        </div>
      </main>
    </div>
  )
}
