import Link from 'next/link'

const sampleLogs = [
  { id: '1', project: 'Target Store #2847', address: '1234 Main St, Columbus, OH', date: '2026-02-21', duration: '4:32', status: 'COMPLETED' },
  { id: '2', project: 'Walmart DC', address: '5678 Industrial Blvd, Phoenix, AZ', date: '2026-02-20', duration: '6:15', status: 'COMPLETED' },
  { id: '3', project: 'Apartment Phase 2', address: '900 Oak Ave, Austin, TX', date: '2026-02-21', duration: '3:48', status: 'PROCESSING' },
]

export default function DustLogsPage() {
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
              <Link href="/dust-logs" className="text-white font-semibold">Dust Logs</Link>
            </nav>
          </div>
          <Link href="/profile" className="text-sm text-gray-400">Profile</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-safety-green">DUST LOGS</h1>
            <p className="text-gray-400 mt-2">Voice-to-text daily logs. AI-processed with field rules.</p>
          </div>
          <Link href="/dust-logs/new" className="btn-primary">+ New Log</Link>
        </div>

        <div className="card mb-6 font-mono text-sm text-neon-green bg-black/50 border border-neon-green/30">
          <p className="text-neon-cyan">FIELD AI OPERATING RULES</p>
          <p className="mt-2">• Context is king • No corporate fluff • Safety &gt; schedule • Document like it may be used in court</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="card flex justify-between items-center">
            <div>
              <p className="font-semibold">Notion Integration</p>
              <p className="text-sm text-gray-500">Sync logs to your workspace</p>
            </div>
            <span className="badge-warning">Not Connected</span>
          </div>
          <div className="card flex justify-between items-center">
            <div>
              <p className="font-semibold">Google NotebookLM</p>
              <p className="text-sm text-gray-500">AI-powered analysis</p>
            </div>
            <span className="badge-warning">Not Connected</span>
          </div>
        </div>

        <div className="space-y-4">
          {sampleLogs.map((log) => (
            <div key={log.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{log.project}</h3>
                    <span className={log.status === 'COMPLETED' ? 'badge-safe' : 'badge-warning'}>{log.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{log.address} • {log.date} • {log.duration}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-secondary text-sm">View</button>
                  {log.status === 'COMPLETED' && <button className="btn-primary text-sm">Export</button>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-neon-cyan">24</p>
            <p className="text-sm text-gray-400">Logs This Month</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-safety-green">2.5h</p>
            <p className="text-sm text-gray-400">Audio Processed</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-safety-yellow">58 min</p>
            <p className="text-sm text-gray-400">Free Tier Remaining</p>
          </div>
        </div>
      </main>
    </div>
  )
}
