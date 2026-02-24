'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import MobileNav from '@/components/mobile-nav'

interface DustLog {
  id: string
  projectName: string
  address: string
  date: string
  duration: number
  status: string
  tags: string[]
}

function formatDuration(mins: number) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function DustLogsPage() {
  const [logs, setLogs] = useState<DustLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dust-logs')
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/dust-logs" className="text-white font-semibold">Dust Logs</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white">Profile</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-safety-green">DUST LOGS</h1>
            <p className="text-gray-400 mt-2">Voice-to-text daily field logs. AI-structured. Privacy-first.</p>
          </div>
          <Link href="/dust-logs/new" className="btn-primary">+ New Log</Link>
        </div>

        <div className="card mb-6 font-mono text-sm text-neon-green bg-black/50 border border-neon-green/30">
          <p className="text-neon-cyan font-bold">FIELD AI OPERATING RULES</p>
          <p className="mt-2 text-xs">
            Context is king &nbsp;•&nbsp; No corporate fluff &nbsp;•&nbsp; Safety overrides everything &nbsp;•&nbsp;
            Document like it may be used in court &nbsp;•&nbsp; Walk the site — if it&apos;s not logged, it didn&apos;t happen
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="card flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Notion Integration</p>
              <p className="text-xs text-gray-500">Sync logs to your workspace</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-warning text-xs">Not Connected</span>
              <Link href="/profile" className="text-xs text-neon-cyan hover:underline">Set up →</Link>
            </div>
          </div>
          <div className="card flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Google NotebookLM</p>
              <p className="text-xs text-gray-500">AI-powered field log analysis</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-warning text-xs">Not Connected</span>
              <Link href="/profile" className="text-xs text-neon-cyan hover:underline">Set up →</Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="card text-center text-gray-400 py-8">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-400 mb-4">No logs yet.</p>
              <Link href="/dust-logs/new" className="btn-primary text-sm">Create Your First Log</Link>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{log.projectName}</h3>
                      <span className={log.status === 'COMPLETED' ? 'badge-safe' : log.status === 'PROCESSING' ? 'badge-warning' : 'text-xs text-gray-500 border border-gray-500 px-1'}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {log.address && `${log.address} • `}{log.date}
                      {log.duration ? ` • ${formatDuration(log.duration)}` : ''}
                    </p>
                    {log.tags?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {log.tags.map(t => <span key={t} className="tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button className="btn-secondary text-xs px-3 py-1">View</button>
                    {log.status === 'COMPLETED' && (
                      <button className="btn-primary text-xs px-3 py-1">Export</button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <div className="card text-center">
            <p className="text-3xl font-bold text-neon-cyan">{logs.length}</p>
            <p className="text-sm text-gray-400">Total Logs</p>
          </div>
          <div className="card text-center">
            <p className="text-3xl font-bold text-safety-green">
              {Math.round(logs.reduce((sum, l) => sum + (l.duration || 0), 0) / 60 * 10) / 10}h
            </p>
            <p className="text-sm text-gray-400">Audio Processed</p>
          </div>
          <div className="card text-center">
            <Link href="/upgrade" className="block">
              <p className="text-3xl font-bold text-safety-yellow">$50/mo</p>
              <p className="text-sm text-gray-400">for full AI pipeline</p>
            </Link>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
