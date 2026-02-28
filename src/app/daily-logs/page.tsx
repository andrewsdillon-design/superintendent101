'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useSession } from 'next-auth/react'
import MobileNav from '@/components/mobile-nav'

interface DailyLog {
  id: string
  date: string
  weather: string
  crewCounts: Record<string, number>
  workPerformed: string
  deliveries: string
  inspections: string
  issues: string
  safetyNotes: string
  photoUrls: string[]
  project?: { id: string; title: string } | null
  createdAt: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function crewTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((s, n) => s + (n || 0), 0)
}

export default function DailyLogsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const role = user?.role
  const subscription = user?.subscription ?? 'FREE'
  const isSubscribed = subscription === 'DUST_LOGS' || subscription === 'PRO'

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/daily-logs')
      .then(r => r.json())
      .then(d => {
        setLogs(d.logs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleDownloadPdf = async (log: DailyLog) => {
    setDownloadingId(log.id)
    try {
      const res = await fetch(`/api/daily-logs/${log.id}/pdf`)
      if (!res.ok) { alert('Could not generate PDF.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `daily-log-${log.date.split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Network error.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/daily-logs" className="text-white font-semibold">Daily Logs</Link>
              <Link href="/daily-logs/new" className="text-gray-400 hover:text-white">New Log</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && (
              <Link href="/admin" className="text-xs text-safety-orange hover:underline hidden sm:block">Admin</Link>
            )}
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white hidden sm:block">Profile</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">

        {/* Paywall */}
        {!isSubscribed && session && (
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-500/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-yellow-300 text-sm">
              <span className="font-bold">Free trial</span> — subscribe to keep full access after 7 days.
            </p>
            <Link href="/upgrade" className="text-xs text-yellow-400 hover:text-yellow-200 underline whitespace-nowrap">
              Upgrade — $9.99/mo →
            </Link>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-safety-green">DAILY LOGS</h1>
            <p className="text-gray-400 mt-1">Your complete field log history.</p>
          </div>
          <Link href="/daily-logs/new" className="btn-primary">+ New Log</Link>
        </div>

        {loading ? (
          <div className="card text-center text-gray-400 py-12">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No logs yet.</p>
            <p className="text-gray-500 text-sm mb-6">Start by recording your first daily log.</p>
            <Link href="/daily-logs/new" className="btn-primary text-sm">Create First Log</Link>
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="card text-center">
                <p className="text-3xl font-bold text-neon-cyan">{logs.length}</p>
                <p className="text-xs text-gray-400 mt-1">Total Logs</p>
              </div>
              <div className="card text-center">
                <p className="text-3xl font-bold text-safety-green">
                  {logs.reduce((s, l) => s + crewTotal(l.crewCounts || {}), 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Total Crew Days</p>
              </div>
              <div className="card text-center hidden sm:block">
                <p className="text-3xl font-bold text-safety-orange">{logs.filter(l => l.photoUrls?.length > 0).length}</p>
                <p className="text-xs text-gray-400 mt-1">Logs with Photos</p>
              </div>
            </div>

            {/* Log table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blueprint-grid text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-3 pr-4">Date</th>
                    <th className="text-left py-3 pr-4">Weather</th>
                    <th className="text-left py-3 pr-4">Crew Total</th>
                    <th className="text-left py-3 pr-4">Work Performed</th>
                    <th className="text-right py-3">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blueprint-grid">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-blueprint-paper/10 transition-colors">
                      <td className="py-3 pr-4 text-white font-semibold whitespace-nowrap">
                        {formatDate(log.date)}
                      </td>
                      <td className="py-3 pr-4 text-gray-300 whitespace-nowrap">
                        {log.weather || '—'}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        {crewTotal(log.crewCounts || {})}
                      </td>
                      <td className="py-3 pr-4 text-gray-400 max-w-xs truncate">
                        {log.workPerformed || '—'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDownloadPdf(log)}
                          disabled={downloadingId === log.id}
                          className="text-xs text-neon-cyan hover:underline disabled:opacity-50 whitespace-nowrap"
                        >
                          {downloadingId === log.id ? 'Generating...' : 'Download PDF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden space-y-4">
              {logs.map(log => (
                <div key={log.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{formatDate(log.date)}</p>
                      <div className="flex gap-3 mt-1 flex-wrap text-xs text-gray-400">
                        {log.weather && <span>{log.weather}</span>}
                        {crewTotal(log.crewCounts || {}) > 0 && (
                          <span>{crewTotal(log.crewCounts || {})} crew</span>
                        )}
                      </div>
                      {log.workPerformed && (
                        <p className="text-sm text-gray-400 mt-2 line-clamp-2">{log.workPerformed}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownloadPdf(log)}
                      disabled={downloadingId === log.id}
                      className="ml-4 text-xs text-neon-cyan hover:underline disabled:opacity-50 flex-shrink-0"
                    >
                      {downloadingId === log.id ? '...' : 'PDF'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
