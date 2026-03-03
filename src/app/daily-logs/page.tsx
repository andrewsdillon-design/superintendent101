'use client'

import Link from 'next/link'
import { useState, useEffect, Suspense } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import MobileNav from '@/components/mobile-nav'

interface DailyLog {
  id: string
  date: string
  weather: string
  crewCounts: Record<string, number>
  workPerformed: string
  project?: { id: string; title: string } | null
  createdAt: string
}

interface Project {
  id: string
  title: string
  status: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function crewTotal(counts: Record<string, number>): number {
  return Object.values(counts).reduce((s, n) => s + (n || 0), 0)
}

function DailyLogsContent() {
  const { data: session } = useSession()
  const user = session?.user as any
  const role = user?.role
  const subscription = user?.subscription ?? 'FREE'
  const isSubscribed = subscription === 'DUST_LOGS' || subscription === 'PRO'

  const searchParams = useSearchParams()
  const projectIdParam = searchParams.get('projectId')

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState(projectIdParam ?? '')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState<{ summary: string; label: string; weekStart: string; weekEnd: string; logCount: number } | null>(null)
  const [downloadingWeeklyPdf, setDownloadingWeeklyPdf] = useState(false)
  const [emailingLog, setEmailingLog] = useState<DailyLog | null>(null)
  const [emailTo, setEmailTo] = useState('')
  const [emailNote, setEmailNote] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Bug report modal
  const [bugOpen, setBugOpen] = useState(false)
  const [bugCategory, setBugCategory] = useState('bug')
  const [bugDescription, setBugDescription] = useState('')
  const [bugSending, setBugSending] = useState(false)
  const [bugSent, setBugSent] = useState(false)
  const [bugError, setBugError] = useState('')

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const url = projectFilter
      ? `/api/daily-logs?projectId=${projectFilter}`
      : '/api/daily-logs'
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setLogs(d.logs || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [projectFilter])

  const handleWeeklyReport = async () => {
    setGeneratingSummary(true)
    setWeeklyReport(null)
    try {
      const res = await fetch('/api/daily-logs/weekly-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setWeeklyReport({ summary: data.summary, label: `${data.weekStart} – ${data.weekEnd} (${data.logCount} logs)`, weekStart: data.weekStart, weekEnd: data.weekEnd, logCount: data.logCount })
    } catch {
      alert('Could not generate weekly summary.')
    } finally {
      setGeneratingSummary(false)
    }
  }

  const handleDownloadWeeklyPdf = async () => {
    if (!weeklyReport) return
    setDownloadingWeeklyPdf(true)
    try {
      const res = await fetch('/api/daily-logs/weekly-summary/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: weeklyReport.summary, weekStart: weeklyReport.weekStart, weekEnd: weeklyReport.weekEnd, logCount: weeklyReport.logCount }),
      })
      if (!res.ok) { alert('Could not generate PDF.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `weekly-report-${weeklyReport.weekStart}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Network error.')
    } finally {
      setDownloadingWeeklyPdf(false)
    }
  }

  const handleEmailReport = async () => {
    if (!emailingLog || !emailTo) return
    setSendingEmail(true)
    setEmailError('')
    setEmailSent(false)
    try {
      const res = await fetch(`/api/daily-logs/${emailingLog.id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, note: emailNote }),
      })
      const data = await res.json()
      if (!res.ok) { setEmailError(data.error ?? 'Failed to send.'); return }
      setEmailSent(true)
      setTimeout(() => { setEmailingLog(null); setEmailTo(''); setEmailNote(''); setEmailSent(false) }, 2000)
    } catch {
      setEmailError('Network error.')
    } finally {
      setSendingEmail(false)
    }
  }

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

  const activeProject = projects.find(p => p.id === projectFilter)

  async function handleBugReport(e: React.FormEvent) {
    e.preventDefault()
    if (!bugDescription.trim()) return
    setBugSending(true)
    setBugError('')
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: bugCategory,
          description: bugDescription,
          deviceInfo: { platform: 'web', userAgent: navigator.userAgent },
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setBugSent(true)
      setBugDescription('')
      setTimeout(() => { setBugOpen(false); setBugSent(false) }, 2000)
    } catch {
      setBugError('Failed to send. Please try again.')
    } finally {
      setBugSending(false)
    }
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/daily-logs" className="text-white font-semibold">Daily Logs</Link>
              <Link href="/daily-logs/new" className="text-gray-400 hover:text-white">New Log</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && (
              <Link href="/admin" className="text-xs text-safety-orange hover:underline hidden sm:block">Admin</Link>
            )}
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white hidden sm:block">Profile</Link>
            <button
              onClick={() => { setBugOpen(true); setBugSent(false); setBugError('') }}
              title="Report a problem"
              className="text-sm text-gray-400 hover:text-safety-orange transition-colors hidden sm:flex items-center gap-1"
            >
              <span className="text-base">⚠</span>
              <span className="text-xs">Report</span>
            </button>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">

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

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold text-safety-green">DAILY LOGS</h1>
            {activeProject && (
              <p className="text-safety-yellow text-sm mt-1 font-semibold">{activeProject.title}</p>
            )}
            {!activeProject && (
              <p className="text-gray-400 mt-1">All projects</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleWeeklyReport}
              disabled={generatingSummary}
              className="text-sm border border-blueprint-grid text-gray-400 hover:text-white hover:border-gray-400 px-3 py-2 transition-colors disabled:opacity-50"
            >
              {generatingSummary ? 'Generating...' : 'Weekly Report'}
            </button>
            <Link
              href={projectFilter ? `/daily-logs/new?projectId=${projectFilter}` : '/daily-logs/new'}
              className="btn-primary"
            >
              + New Log
            </Link>
          </div>
        </div>

        {weeklyReport && (
          <div className="mb-6 p-5 bg-blueprint-paper/10 border border-blueprint-grid">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-safety-orange tracking-widest">WEEKLY FIELD REPORT</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{weeklyReport.label}</span>
                <button
                  onClick={handleDownloadWeeklyPdf}
                  disabled={downloadingWeeklyPdf}
                  className="text-xs text-neon-cyan hover:underline disabled:opacity-50 whitespace-nowrap"
                >
                  {downloadingWeeklyPdf ? 'Generating...' : 'Download PDF'}
                </button>
                <button onClick={() => setWeeklyReport(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
              </div>
            </div>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{weeklyReport.summary}</pre>
          </div>
        )}

        {/* Project filter */}
        {projects.length > 0 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setProjectFilter('')}
              className={`text-xs px-3 py-1.5 border transition-colors ${
                !projectFilter
                  ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10'
                  : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
              }`}
            >
              All Projects
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setProjectFilter(p.id)}
                className={`text-xs px-3 py-1.5 border transition-colors ${
                  projectFilter === p.id
                    ? 'border-safety-yellow text-safety-yellow bg-safety-yellow/10'
                    : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
                }`}
              >
                {p.title}
              </button>
            ))}
            <Link href="/projects" className="text-xs px-3 py-1.5 border border-dashed border-blueprint-grid text-gray-500 hover:text-gray-300 transition-colors">
              + Manage Projects
            </Link>
          </div>
        )}

        {loading ? (
          <div className="card text-center text-gray-400 py-12">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No logs yet{activeProject ? ` for ${activeProject.title}` : ''}.</p>
            <p className="text-gray-500 text-sm mb-6">Start by recording your first daily log.</p>
            <Link
              href={projectFilter ? `/daily-logs/new?projectId=${projectFilter}` : '/daily-logs/new'}
              className="btn-primary text-sm"
            >
              Create First Log
            </Link>
          </div>
        ) : (
          <>
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
                <p className="text-3xl font-bold text-safety-yellow">{projects.length}</p>
                <p className="text-xs text-gray-400 mt-1">Projects</p>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blueprint-grid text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left py-3 pr-4">Date</th>
                    <th className="text-left py-3 pr-4">Project</th>
                    <th className="text-left py-3 pr-4">Weather</th>
                    <th className="text-left py-3 pr-4">Crew</th>
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
                      <td className="py-3 pr-4 text-gray-400 whitespace-nowrap">
                        {log.project?.title ?? <span className="text-gray-600">—</span>}
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
                        <div className="flex gap-3 justify-end items-center">
                          <Link href={`/daily-logs/${log.id}/edit`} className="text-xs text-gray-400 hover:text-white whitespace-nowrap">
                            Edit
                          </Link>
                          <button
                            onClick={() => { setEmailingLog(log); setEmailTo(''); setEmailNote(''); setEmailError(''); setEmailSent(false) }}
                            className="text-xs text-safety-yellow hover:underline whitespace-nowrap"
                          >
                            Email
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(log)}
                            disabled={downloadingId === log.id}
                            className="text-xs text-neon-cyan hover:underline disabled:opacity-50 whitespace-nowrap"
                          >
                            {downloadingId === log.id ? 'Generating...' : 'PDF'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-4">
              {logs.map(log => (
                <div key={log.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">{formatDate(log.date)}</p>
                      {log.project?.title && (
                        <p className="text-xs text-safety-yellow mt-0.5">{log.project.title}</p>
                      )}
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
                    <div className="ml-4 flex flex-col gap-1 items-end flex-shrink-0">
                      <Link href={`/daily-logs/${log.id}/edit`} className="text-xs text-gray-400 hover:text-white">
                        Edit
                      </Link>
                      <button
                        onClick={() => { setEmailingLog(log); setEmailTo(''); setEmailNote(''); setEmailError(''); setEmailSent(false) }}
                        className="text-xs text-safety-yellow hover:underline"
                      >
                        Email
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(log)}
                        disabled={downloadingId === log.id}
                        className="text-xs text-neon-cyan hover:underline disabled:opacity-50"
                      >
                        {downloadingId === log.id ? '...' : 'PDF'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
      <MobileNav />

      {/* ── Email Report Modal ── */}
      {emailingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-blueprint-bg border border-blueprint-grid rounded-lg w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-bold text-white text-lg">Email Report</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDate(emailingLog.date)}{emailingLog.project?.title ? ` · ${emailingLog.project.title}` : ''}
                </p>
              </div>
              <button onClick={() => setEmailingLog(null)} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">TO *</label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                placeholder="recipient@company.com"
                className="w-full bg-blueprint-paper border border-blueprint-grid rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold block mb-1">NOTE (OPTIONAL)</label>
              <textarea
                value={emailNote}
                onChange={e => setEmailNote(e.target.value)}
                placeholder="Add a personal note to include above the report..."
                rows={3}
                className="w-full bg-blueprint-paper border border-blueprint-grid rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan resize-none"
              />
            </div>

            <p className="text-xs text-gray-500">
              PDF attached automatically. {user?.email ? `Reply-To set to ${user.email}.` : ''}
            </p>

            {emailError && <p className="text-xs text-red-400">{emailError}</p>}
            {emailSent && <p className="text-xs text-safety-green">Report sent!</p>}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEmailingLog(null)}
                className="text-sm text-gray-400 hover:text-white px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleEmailReport}
                disabled={sendingEmail || !emailTo || emailSent}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {sendingEmail ? 'Sending...' : 'Send Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Modal */}
      {bugOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1829] border border-slate-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-1">Report a Problem</h2>
            <p className="text-slate-400 text-sm mb-4">Tell us what&apos;s wrong and we&apos;ll fix it fast.</p>

            {bugSent ? (
              <p className="text-safety-green text-sm font-semibold py-4 text-center">✓ Report sent — thank you!</p>
            ) : (
              <form onSubmit={handleBugReport} className="space-y-4">
                <div className="flex gap-2">
                  {[
                    { value: 'bug', label: '🐛 Bug' },
                    { value: 'feedback', label: '💬 Feedback' },
                    { value: 'feature', label: '💡 Feature' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBugCategory(opt.value)}
                      className={`flex-1 text-xs py-2 rounded border font-bold transition-colors ${
                        bugCategory === opt.value
                          ? 'bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40'
                          : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={bugDescription}
                  onChange={e => setBugDescription(e.target.value)}
                  placeholder={bugCategory === 'bug'
                    ? 'Describe what happened and what you expected...'
                    : bugCategory === 'feature'
                    ? 'Describe the feature you\'d like to see...'
                    : 'Share your feedback...'}
                  rows={4}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded p-3 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-[#00e5ff]/50"
                />

                {bugError && <p className="text-red-400 text-xs">{bugError}</p>}

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setBugOpen(false)}
                    className="text-sm text-slate-400 hover:text-white px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bugSending || !bugDescription.trim()}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {bugSending ? 'Sending...' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DailyLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen blueprint-bg" />}>
      <DailyLogsContent />
    </Suspense>
  )
}
