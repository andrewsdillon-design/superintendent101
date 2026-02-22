import Link from 'next/link'

export default function ProfilePage() {
  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400">Feed</Link>
              <Link href="/mentors" className="text-gray-400">Mentors</Link>
              <Link href="/projects" className="text-gray-400">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400">Dust Logs</Link>
            </nav>
          </div>
          <span className="text-sm text-white font-semibold">Profile</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-safety-yellow mb-6">MY PROFILE</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-24 h-24 bg-blueprint-paper rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-neon-cyan">
              JD
            </div>
            <h2 className="font-semibold text-lg mt-4">John Doe</h2>
            <p className="text-sm text-gray-500">@johndoe</p>
            <p className="text-sm text-gray-400 mt-2">Columbus, OH • 15 years</p>
            <button className="btn-secondary w-full mt-4 text-sm">Edit Profile</button>
          </div>

          <div className="card md:col-span-2 space-y-4">
            <h3 className="font-bold text-safety-blue">SKILLS</h3>
            <div className="flex flex-wrap gap-2">
              <span className="tag">superintendent</span>
              <span className="tag">project-manager</span>
              <span className="tag">concrete</span>
              <span className="tag">steel</span>
              <span className="tag">safety</span>
            </div>

            <h3 className="font-bold text-safety-blue mt-6">BIO</h3>
            <p className="text-sm text-gray-300">
              Commercial construction superintendent with 15 years of experience. Specialized in retail and mixed-use developments.
              OSHA 30 certified. Passionate about mentoring the next generation of field staff.
            </p>

            <h3 className="font-bold text-safety-blue mt-6">SUBSCRIPTION</h3>
            <div className="flex items-center justify-between">
              <span className="badge-safe">FREE TIER</span>
              <button className="btn-primary text-sm">Upgrade to Pro</button>
            </div>
          </div>
        </div>

        <div className="card mt-6">
          <h3 className="font-bold text-safety-orange mb-4">RECENT PROJECTS</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-blueprint-grid pb-2">
              <div>
                <p className="font-semibold">Target Store #2847</p>
                <p className="text-xs text-gray-500">Columbus, OH • Retail • 45,000 sqft</p>
              </div>
              <span className="text-xs text-safety-green">ACTIVE</span>
            </div>
            <div className="flex justify-between items-center border-b border-blueprint-grid pb-2">
              <div>
                <p className="font-semibold">Walmart Distribution Center</p>
                <p className="text-xs text-gray-500">Phoenix, AZ • Industrial • 250,000 sqft</p>
              </div>
              <span className="text-xs text-gray-400">COMPLETED</span>
            </div>
          </div>
          <Link href="/projects" className="text-sm text-neon-cyan hover:underline mt-4 block">View all projects →</Link>
        </div>

        <div className="card mt-6">
          <h3 className="font-bold text-safety-green mb-4">INTEGRATIONS</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Notion</span>
              <span className="badge-warning">Not Connected</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Google NotebookLM</span>
              <span className="badge-warning">Not Connected</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
