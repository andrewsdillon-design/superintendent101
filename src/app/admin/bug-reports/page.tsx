'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Report = {
  id: string
  userEmail: string | null
  category: string
  description: string
  deviceInfo: string | null
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400 border-red-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
  wont_fix: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const CATEGORY_ICON: Record<string, string> = {
  bug: '🐛',
  feedback: '💬',
  feature: '💡',
}

export default function BugReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState('open')
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/bug-reports${filter !== 'all' ? `?status=${filter}` : ''}`)
      .then(r => r.json())
      .then(d => { setReports(d.reports ?? []); setLoading(false) })
  }, [filter])

  async function updateStatus(id: string, status: string) {
    setUpdating(id)
    await fetch('/api/admin/bug-reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setUpdating(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <header className="border-b border-white/10 bg-[#0a0f1a]/80 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-bold text-[#00e5ff]">ProFieldHub</Link>
            <span className="text-orange-400 font-bold text-sm">ADMIN</span>
            <nav className="flex gap-4 text-sm ml-4">
              <Link href="/admin" className="text-slate-400 hover:text-white">Users</Link>
              <Link href="/admin/analytics" className="text-slate-400 hover:text-white">Analytics</Link>
              <Link href="/admin/companies" className="text-slate-400 hover:text-white">Companies</Link>
              <span className="text-white font-semibold">Bug Reports</span>
              <Link href="/admin/mail" className="text-slate-400 hover:text-white">Mail</Link>
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-black text-white mb-2">Bug Reports</h1>
        <p className="text-slate-400 text-sm mb-6">Feedback and issues submitted by users</p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['open', 'in_progress', 'resolved', 'wont_fix', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded border transition-colors ${
                filter === s
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40'
                  : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'
              }`}
            >
              {s.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-400 text-sm">Loading...</p>
        ) : reports.length === 0 ? (
          <p className="text-slate-500 text-sm">No reports found.</p>
        ) : (
          <div className="space-y-3">
            {reports.map(r => {
              const device = r.deviceInfo ? (() => { try { return JSON.parse(r.deviceInfo!) } catch { return null } })() : null
              return (
                <div
                  key={r.id}
                  className="border border-slate-800 rounded-lg bg-slate-900/50 overflow-hidden"
                >
                  {/* Header row */}
                  <button
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-800/30 transition-colors"
                  >
                    <span className="text-lg mt-0.5">{CATEGORY_ICON[r.category] ?? '📝'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{r.description.slice(0, 120)}{r.description.length > 120 ? '…' : ''}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        {r.userEmail ?? 'Anonymous'} · {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_COLORS[r.status] ?? 'text-slate-400'}`}>
                      {r.status.replace('_', ' ')}
                    </span>
                  </button>

                  {/* Expanded details */}
                  {expanded === r.id && (
                    <div className="border-t border-slate-800 p-4 space-y-4">
                      <p className="text-slate-200 text-sm whitespace-pre-wrap">{r.description}</p>

                      {device && (
                        <div className="text-xs text-slate-500 space-y-1">
                          {Object.entries(device).map(([k, v]) => (
                            <div key={k}><span className="text-slate-400">{k}:</span> {String(v)}</div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {['open', 'in_progress', 'resolved', 'wont_fix'].map(s => (
                          <button
                            key={s}
                            disabled={r.status === s || updating === r.id}
                            onClick={() => updateStatus(r.id, s)}
                            className={`text-xs px-3 py-1.5 rounded border font-bold transition-colors disabled:opacity-40 ${
                              r.status === s
                                ? STATUS_COLORS[s]
                                : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-white'
                            }`}
                          >
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      <p className="text-slate-600 text-xs">ID: {r.id}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
