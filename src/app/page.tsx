import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <h1 className="font-display text-lg sm:text-2xl font-bold text-neon-cyan whitespace-nowrap">
            ProFieldHub
          </h1>
          <div className="flex gap-2 sm:gap-4">
            <Link href="/login" className="btn-secondary text-sm sm:text-base">Sign In</Link>
            <Link href="/pricing" className="btn-primary text-sm sm:text-base">Join Now</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
          <span className="text-white">FIELD STAFF.</span>
          <br />
          <span className="text-neon-cyan">CONNECTED.</span>
        </h2>
        <p className="text-gray-300 text-base sm:text-lg mb-8 px-2">
          A no-nonsense network for construction professionals.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/pricing" className="btn-primary text-base sm:text-lg px-6 sm:px-8">
            Get Started
          </Link>
        </div>
      </main>

      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-bold text-neon-cyan mb-2">COMMUNITY — FREE</h3>
          <p className="text-sm text-gray-400">Network with field professionals and book mentors directly from the community.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-orange mb-2">DAILY LOGS — $19/mo</h3>
          <p className="text-sm text-gray-400">Voice-to-text field logs structured by AI and synced to your Notion workspace.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-yellow mb-2">REGISTER AS MENTOR — $39/mo</h3>
          <p className="text-sm text-gray-400">List yourself as a mentor, accept bookings, and get paid in USDC by the community.</p>
        </div>
      </section>
    </div>
  )
}
