'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Period = '30d' | '90d' | 'all'

interface Overview {
  totalCostUsd: number
  totalCalls: number
  whisperCalls: number
  gpt4oCalls: number
  uniqueActiveUsers: number
  totalUsers: number
  totalJobSites: number
  totalLogs: number
  whisperCost: number
  gpt4oCost: number
}

interface UserRow {
  userId: string
  name: string | null
  email: string
  username: string
  subscription: string
  calls: number
  whisperCalls: number
  gpt4oCalls: number
  costUsd: number
  lastUsed: string
}

interface DayRow {
  date: string
  costUsd: number
  calls: number
}

interface RecentRow {
  id: string
  service: string
  action: string
  costUsd: number
  projectName: string | null
  inputTokens: number | null
  outputTokens: number | null
  fileSizeBytes: number | null
  createdAt: string
  user: { name: string | null; email: string; username: string }
}

interface Analytics {
  overview: Overview
  byUser: UserRow[]
  daily: DayRow[]
  recent: RecentRow[]
}

function fmt(n: number, digits = 4) {
  return `$${n.toFixed(digits)}`
}

function fmtShort(n: number) {
  return `$${n.toFixed(2)}`
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0
  return (
    <div className="flex-1 h-2 bg-blueprint-grid rounded overflow-hidden">
      <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const subColor: Record<string, string> = {
  FREE: 'text-gray-400',
  PRO: 'text-safety-yellow',
  DUST_LOGS: 'text-safety-orange',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/admin/analytics?period=${period}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load analytics'); setLoading(false) })
  }, [period])

  const ov = data?.overview

  const maxDailyCost = data ? Math.max(...data.daily.map(d => d.costUsd), 0.001) : 1
  const maxUserCost  = data ? Math.max(...data.byUser.map(u => u.costUsd), 0.001) : 1

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <span className="text-safety-orange font-bold text-sm">ADMIN</span>
            <nav className="flex gap-4 text-sm ml-4">
              <Link href="/admin" className="text-gray-400 hover:text-white">Users</Link>
              <span className="text-white font-semibold">Analytics</span>
              <Link href="/admin/companies" className="text-gray-400 hover:text-white">Companies</Link>
            </nav>
          </div>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-white">← Users</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Title + period selector */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-safety-orange">API ANALYTICS</h1>
            <p className="text-gray-400 text-sm mt-1">Usage and cost across all users and services</p>
          </div>
          <div className="flex gap-2">
            {(['30d', '90d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs border transition-colors ${
                  period === p
                    ? 'border-neon-cyan text-neon-cyan'
                    : 'border-blueprint-grid text-gray-400 hover:text-white'
                }`}
              >
                {p === '30d' ? 'Last 30 Days' : p === '90d' ? 'Last 90 Days' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="card border border-red-500/40 text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="card text-center py-12 text-gray-400 animate-pulse">Loading analytics...</div>
        ) : ov && (
          <>
            {/* ── Overview stat cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card text-center">
                <p className="font-display text-2xl font-bold text-neon-cyan">{fmtShort(ov.totalCostUsd)}</p>
                <p className="text-xs text-gray-400 mt-1">Total API Cost</p>
              </div>
              <div className="card text-center">
                <p className="font-display text-2xl font-bold text-safety-yellow">{ov.totalCalls}</p>
                <p className="text-xs text-gray-400 mt-1">Total API Calls</p>
              </div>
              <div className="card text-center">
                <p className="font-display text-2xl font-bold text-safety-green">{ov.uniqueActiveUsers}</p>
                <p className="text-xs text-gray-400 mt-1">Active Users</p>
                <p className="text-xs text-gray-600">{ov.totalUsers} total registered</p>
              </div>
              <div className="card text-center">
                <p className="font-display text-2xl font-bold text-safety-orange">{ov.totalJobSites}</p>
                <p className="text-xs text-gray-400 mt-1">Job Sites Created</p>
              </div>
            </div>

            {/* ── Cost by service ── */}
            <div className="card">
              <h2 className="font-bold text-sm uppercase text-gray-400 mb-4">Cost by Service</h2>
              <div className="space-y-4">

                {/* Transcription */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-sm font-semibold text-white">GPT-4o-mini Transcribe</span>
                      <span className="text-xs text-gray-500 ml-2">Transcription · $0.003/min</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-neon-cyan">{fmtShort(ov.whisperCost)}</span>
                      <span className="text-xs text-gray-500 ml-2">{ov.whisperCalls} calls</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bar value={ov.whisperCost} max={ov.totalCostUsd} color="bg-neon-cyan" />
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {ov.totalCostUsd > 0 ? Math.round(ov.whisperCost / ov.totalCostUsd * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Structuring */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <span className="text-sm font-semibold text-white">GPT-4o-mini</span>
                      <span className="text-xs text-gray-500 ml-2">Structuring · $0.15/1M in · $0.60/1M out</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-safety-yellow">{fmtShort(ov.gpt4oCost)}</span>
                      <span className="text-xs text-gray-500 ml-2">{ov.gpt4oCalls} calls</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bar value={ov.gpt4oCost} max={ov.totalCostUsd} color="bg-safety-yellow" />
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {ov.totalCostUsd > 0 ? Math.round(ov.gpt4oCost / ov.totalCostUsd * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Daily cost chart ── */}
            <div className="card">
              <h2 className="font-bold text-sm uppercase text-gray-400 mb-4">Daily Cost — Last {period === '90d' ? '90' : '30'} Days</h2>
              {data!.daily.every(d => d.costUsd === 0) ? (
                <p className="text-gray-500 text-sm text-center py-4">No API usage in this period yet.</p>
              ) : (
                <div className="space-y-1">
                  {data!.daily.filter(d => d.calls > 0).map(day => (
                    <div key={day.date} className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500 w-24 flex-shrink-0">{day.date}</span>
                      <div className="flex-1 h-4 bg-blueprint-grid rounded overflow-hidden">
                        <div
                          className="h-full bg-neon-cyan/70 rounded"
                          style={{ width: `${Math.max(2, (day.costUsd / maxDailyCost) * 100)}%` }}
                        />
                      </div>
                      <span className="text-neon-cyan w-16 text-right">{fmt(day.costUsd)}</span>
                      <span className="text-gray-600 w-16 text-right">{day.calls} calls</span>
                    </div>
                  ))}
                  {data!.daily.every(d => d.calls === 0) && (
                    <p className="text-gray-500 text-sm text-center py-4">No activity yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* ── Per-user breakdown ── */}
            <div className="card overflow-x-auto">
              <h2 className="font-bold text-sm uppercase text-gray-400 mb-4">Cost by User</h2>
              {data!.byUser.length === 0 ? (
                <p className="text-gray-500 text-sm">No API usage yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-blueprint-grid text-gray-400 text-left">
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4">Plan</th>
                      <th className="pb-3 pr-4 text-right">Transcribe</th>
                      <th className="pb-3 pr-4 text-right">GPT-4o-mini</th>
                      <th className="pb-3 pr-4 text-right">Total Calls</th>
                      <th className="pb-3 pr-4">Cost</th>
                      <th className="pb-3 text-right">Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.byUser.map(u => (
                      <tr key={u.userId} className="border-b border-blueprint-grid/40 hover:bg-blueprint-paper/20">
                        <td className="py-3 pr-4">
                          <p className="text-white font-medium">{u.name ?? u.username}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </td>
                        <td className={`py-3 pr-4 text-xs font-semibold ${subColor[u.subscription] ?? ''}`}>
                          {u.subscription}
                        </td>
                        <td className="py-3 pr-4 text-right text-gray-300">{u.whisperCalls}</td>
                        <td className="py-3 pr-4 text-right text-gray-300">{u.gpt4oCalls}</td>
                        <td className="py-3 pr-4 text-right text-gray-300">{u.calls}</td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-neon-cyan font-mono">{fmtShort(u.costUsd)}</span>
                            <div className="w-20">
                              <Bar value={u.costUsd} max={maxUserCost} color="bg-neon-cyan" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right text-xs text-gray-500">
                          {new Date(u.lastUsed).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* ── Recent activity ── */}
            <div className="card overflow-x-auto">
              <h2 className="font-bold text-sm uppercase text-gray-400 mb-4">Recent API Calls</h2>
              {data!.recent.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity yet.</p>
              ) : (
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b border-blueprint-grid text-gray-500 text-left">
                      <th className="pb-2 pr-4">Time</th>
                      <th className="pb-2 pr-4">User</th>
                      <th className="pb-2 pr-4">Service</th>
                      <th className="pb-2 pr-4">Tokens / Size</th>
                      <th className="pb-2 pr-4">Project</th>
                      <th className="pb-2 text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.recent.map(r => (
                      <tr key={r.id} className="border-b border-blueprint-grid/30 hover:bg-blueprint-paper/10">
                        <td className="py-2 pr-4 text-gray-500">
                          {new Date(r.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-2 pr-4 text-gray-300">@{r.user.username}</td>
                        <td className="py-2 pr-4">
                          <span className={r.service === 'whisper' ? 'text-neon-cyan' : 'text-safety-yellow'}>
                            {r.service === 'whisper' ? 'GPT-4o-mini Transcribe' : 'GPT-4o-mini'}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-500">
                          {r.service === 'whisper' && r.fileSizeBytes
                            ? `${(r.fileSizeBytes / 1024).toFixed(0)} KB`
                            : r.inputTokens
                            ? `${r.inputTokens}in / ${r.outputTokens}out`
                            : '—'}
                        </td>
                        <td className="py-2 pr-4 text-gray-500 max-w-[140px] truncate">
                          {r.projectName ?? '—'}
                        </td>
                        <td className="py-2 text-right text-neon-cyan">{fmt(r.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
