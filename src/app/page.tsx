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
            <Link href="/pricing" className="btn-primary text-sm sm:text-base">Start Free Trial</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-20 text-center">
        <h2 className="text-3xl sm:text-5xl font-bold mb-6 leading-tight">
          <span className="text-white">DAILY LOGS</span>
          <br />
          <span className="text-neon-cyan">FOR THE FIELD.</span>
        </h2>
        <p className="text-gray-300 text-base sm:text-xl mb-4 px-2">
          Voice-to-text field logs, structured by AI. Built for superintendents.
        </p>
        <p className="text-gray-500 text-sm mb-10">
          $9.99/month &nbsp;·&nbsp; 7-day free trial &nbsp;·&nbsp; Cancel anytime
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/pricing" className="btn-primary text-base sm:text-lg px-6 sm:px-10 py-3">
            Start Free Trial
          </Link>
          <Link href="/login" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3">
            Sign In
          </Link>
        </div>
      </main>

      <section className="max-w-6xl mx-auto px-4 py-16 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-bold text-neon-cyan mb-2 text-sm uppercase tracking-wide">Voice Transcription</h3>
          <p className="text-sm text-gray-400">Record your site walkthrough. Whisper transcribes it, AI structures it into a professional log.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-orange mb-2 text-sm uppercase tracking-wide">Crew Tracking</h3>
          <p className="text-sm text-gray-400">Log crew counts by trade. Keep a record of who was on site every day.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-yellow mb-2 text-sm uppercase tracking-wide">Weather Logging</h3>
          <p className="text-sm text-gray-400">One-tap weather conditions. Document what the sky was doing when delays hit.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-green mb-2 text-sm uppercase tracking-wide">PDF Export</h3>
          <p className="text-sm text-gray-400">Generate a professional daily log PDF for every entry. Ready for email, print, or file.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-blue mb-2 text-sm uppercase tracking-wide">Photo Attachments</h3>
          <p className="text-sm text-gray-400">Attach site photos to your log. Visual documentation that holds up in a dispute.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-white mb-2 text-sm uppercase tracking-wide">Log History</h3>
          <p className="text-sm text-gray-400">Every log saved securely. Search, download, and export your full field history anytime.</p>
        </div>
      </section>

      <section className="border-t border-blueprint-grid py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-3xl font-bold text-white mb-2">$9.99<span className="text-gray-400 text-lg font-normal">/month</span></p>
          <p className="text-gray-400 mb-2">7-day free trial — no credit card needed to start</p>
          <p className="text-gray-500 text-sm mb-8">Cancel anytime. No contracts.</p>
          <Link href="/pricing" className="btn-primary text-lg px-10 py-3">
            Start Free Trial
          </Link>
          <p className="text-xs text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-neon-cyan hover:underline">Sign in →</Link>
          </p>
        </div>
      </section>
    </div>
  )
}
