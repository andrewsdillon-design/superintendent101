import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-4">
          <h1 className="font-display text-lg sm:text-2xl font-bold text-neon-cyan whitespace-nowrap">
            S101
          </h1>
          <div className="flex gap-2 sm:gap-4">
            <Link href="/login" className="btn-secondary text-sm sm:text-base">Sign In</Link>
            <Link href="/register" className="btn-primary text-sm sm:text-base">Join Now</Link>
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
          <Link href="/register" className="btn-primary text-base sm:text-lg px-6 sm:px-8">
            Get Started
          </Link>
        </div>
      </main>

      <section className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-bold text-safety-blue mb-2">MENTOR NETWORK</h3>
          <p className="text-sm text-gray-400">Connect with experienced superintendents.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-yellow mb-2">PROJECT PROFILES</h3>
          <p className="text-sm text-gray-400">Document your project history.</p>
        </div>
        <div className="card">
          <h3 className="font-bold text-safety-green mb-2">DUST LOGS</h3>
          <p className="text-sm text-gray-400">Voice-to-text daily logs with AI.</p>
        </div>
      </section>
    </div>
  )
}
