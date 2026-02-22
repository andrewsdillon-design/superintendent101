import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-white">Feed</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400 hover:text-white">Dust Logs</Link>
            </nav>
          </div>
          <div className="flex gap-4">
            <Link href="/profile" className="text-sm text-gray-400">Profile</Link>
            <Link href="/" className="text-sm text-gray-400">Sign Out</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h1 className="font-display text-2xl font-bold text-safety-yellow">FEED</h1>

            <div className="card">
              <textarea className="w-full bg-blueprint-bg border border-blueprint-grid p-3 text-white min-h-[100px]" placeholder="Share something with the community..." />
              <div className="mt-3 flex justify-end">
                <button className="btn-primary text-sm">Post</button>
              </div>
            </div>

            <div className="card">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blueprint-paper rounded-full flex items-center justify-center text-neon-cyan font-bold">JD</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">John Doe</span>
                    <span className="text-xs text-gray-500">• 2h ago</span>
                  </div>
                  <p className="mt-2 text-gray-300 text-sm">
                    Walked the slab this morning before pour. Found three areas where rebar spacing was off. Got it fixed before the concrete trucks showed up.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <span className="tag">safety</span>
                    <span className="tag">concrete</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-blueprint-paper rounded-full flex items-center justify-center text-safety-green font-bold">MS</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Mike Smith</span>
                    <span className="badge-safe">MENTOR</span>
                    <span className="text-xs text-gray-500">• 5h ago</span>
                  </div>
                  <p className="mt-2 text-gray-300 text-sm">
                    20 years in this business and I still learn something new every week. The day you think you know everything is the day you become dangerous.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold text-safety-blue mb-4">QUICK ACTIONS</h3>
              <div className="space-y-2">
                <Link href="/dust-logs/new" className="btn-primary w-full text-sm block text-center">New Dust Log</Link>
                <Link href="/mentors" className="btn-secondary w-full text-sm block text-center">Find a Mentor</Link>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-safety-orange mb-4">TRENDING</h3>
              <div className="flex flex-wrap gap-2">
                <span className="tag">safety</span>
                <span className="tag">concrete</span>
                <span className="tag">steel</span>
                <span className="tag">scheduling</span>
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-safety-green mb-4">MENTORS</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blueprint-paper rounded-full flex items-center justify-center text-xs">MS</div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Mike Smith</p>
                    <p className="text-xs text-gray-500">Safety • Scheduling</p>
                  </div>
                  <span className="text-xs text-neon-cyan">$75/hr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
