'use client'

import Link from 'next/link'
import MobileNav from '@/components/mobile-nav'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  title: string
  location: string | null
  status: string
  address: string | null
  permitNumber: string | null
  webPortalId: string | null
  portalType: string | null
  planNumber: string | null
  elevation: string | null
  electricalSide: string | null
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-xs text-safety-green font-bold',
  COMPLETED: 'text-xs text-gray-400',
  PLANNING: 'text-xs text-safety-yellow',
  ON_HOLD: 'text-xs text-safety-orange',
}

const BLANK_FORM = {
  title: '', location: '', address: '', permitNumber: '',
  planNumber: '', elevation: '', electricalSide: '',
  webPortalId: '', portalType: '',
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const role = user?.role

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Weekly report state
  const [weeklyReportProjectId, setWeeklyReportProjectId] = useState<string | null>(null)
  const [weeklyReportWeek, setWeeklyReportWeek] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const daysBack = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - daysBack)
    return monday.toISOString().split('T')[0]
  })
  const [generatingReport, setGeneratingReport] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState<{ summary: string; weekStart: string; weekEnd: string; logCount: number } | null>(null)
  const [reportError, setReportError] = useState('')

  // Share state
  const [shareProject, setShareProject] = useState<Project | null>(null)
  const [shareLabel, setShareLabel] = useState('')
  const [shareCreating, setShareCreating] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [shareCopied, setShareCopied] = useState(false)

  function openWeeklyReport(projectId: string) {
    setWeeklyReportProjectId(projectId)
    setWeeklyReport(null)
    setReportError('')
  }

  async function generateWeeklyReport() {
    if (!weeklyReportProjectId) return
    setGeneratingReport(true)
    setReportError('')
    try {
      const res = await fetch('/api/daily-logs/weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: weeklyReportWeek, projectId: weeklyReportProjectId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setReportError(data.error ?? 'Failed to generate report.')
      } else {
        setWeeklyReport(data)
      }
    } catch {
      setReportError('Network error.')
    } finally {
      setGeneratingReport(false)
    }
  }

  const fetchProjects = () => {
    fetch('/api/mobile/projects?all=1')
      .then(r => r.json())
      .then(data => {
        setProjects(data.projects ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { fetchProjects() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/mobile/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          location: form.location || undefined,
          address: form.address || undefined,
          permitNumber: form.permitNumber || undefined,
          planNumber: form.planNumber || undefined,
          elevation: form.elevation || undefined,
          electricalSide: form.electricalSide || undefined,
          webPortalId: form.webPortalId || undefined,
          portalType: form.portalType || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setProjects(prev => [data.project, ...prev])
        setShowModal(false)
        setForm(BLANK_FORM)
      } else {
        setError(data.error ?? 'Failed to create project.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete "${project.title}"? Its daily logs will be kept but unlinked from this project.`)) return
    setDeletingId(project.id)
    try {
      const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== project.id))
      } else {
        const data = await res.json()
        alert(data.error ?? 'Failed to delete project.')
      }
    } catch {
      alert('Network error.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCreateShare = async () => {
    if (!shareProject) return
    setShareCreating(true)
    try {
      const res = await fetch('/api/mobile/projects/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: shareProject.id, label: shareLabel.trim() || null }),
      })
      const data = await res.json()
      if (res.ok) setShareUrl(data.share.shareUrl)
      else alert(data.error ?? 'Could not create share link.')
    } catch {
      alert('Network error.')
    } finally {
      setShareCreating(false)
    }
  }

  const displayed = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeCount = projects.filter(p => p.status === 'ACTIVE').length
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/projects" className="text-white font-semibold">Projects</Link>
              <Link href="/daily-logs" className="text-gray-400 hover:text-white">Daily Logs</Link>
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-safety-yellow">PROJECTS</h1>
            <p className="text-gray-400 mt-1">Manage your job sites. Daily logs are filed under each project.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">+ Add Project</button>
        </div>

        <div className="card mb-6 grid md:grid-cols-3 gap-4">
          <input
            type="text"
            className="bg-blueprint-bg border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="bg-blueprint-bg border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
          <div className="flex items-center text-sm text-gray-400">
            {displayed.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading projects...</div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-400 text-lg">No projects yet.</p>
            <p className="text-gray-500 text-sm mt-2 mb-6">Create a project to organize your daily logs by job site.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">+ Add Project</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map((project) => (
              <div key={project.id} className="card flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg leading-tight">{project.title}</h3>
                  <span className={STATUS_COLORS[project.status] ?? 'text-xs text-gray-400'}>{project.status}</span>
                </div>
                {project.location && <p className="text-sm text-gray-500">📍 {project.location}</p>}
                {project.address && <p className="text-xs text-gray-500 mt-0.5">🏠 {project.address}</p>}
                {project.permitNumber && <p className="text-xs text-gray-500 mt-0.5">📋 Permit: {project.permitNumber}</p>}
                {(project.planNumber || project.elevation || project.electricalSide) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[
                      project.planNumber && `Plan ${project.planNumber}`,
                      project.elevation && `Elev. ${project.elevation}`,
                      project.electricalSide && `Elec. ${project.electricalSide}`,
                    ].filter(Boolean).join(' · ')}
                  </p>
                )}
                {project.webPortalId && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    🌐 {project.portalType ? `${project.portalType}: ` : ''}{project.webPortalId}
                  </p>
                )}
                <div className="mt-auto pt-4 border-t border-blueprint-grid flex flex-col gap-2 mt-4">
                  <div className="flex gap-2">
                    <Link
                      href={`/daily-logs?projectId=${project.id}`}
                      className="btn-secondary text-xs flex-1 text-center"
                    >
                      View Logs
                    </Link>
                    <Link
                      href={`/daily-logs/new?projectId=${project.id}`}
                      className="btn-primary text-xs flex-1 text-center"
                    >
                      + New Log
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openWeeklyReport(project.id)}
                      className="text-xs text-safety-blue border border-safety-blue/40 hover:border-safety-blue px-3 py-1.5 transition-colors flex-1"
                    >
                      📊 Weekly Report
                    </button>
                    <button
                      onClick={() => { setShareProject(project); setShareLabel(''); setShareUrl(null); setShareCopied(false) }}
                      className="text-xs text-gray-400 border border-blueprint-grid hover:border-gray-400 px-3 py-1.5 transition-colors flex-1"
                    >
                      🔗 Share
                    </button>
                    <button
                      onClick={() => handleDelete(project)}
                      disabled={deletingId === project.id}
                      className="text-xs text-red-400 border border-red-400/30 hover:border-red-400 px-3 py-1.5 transition-colors disabled:opacity-40"
                    >
                      {deletingId === project.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 card">
          <h3 className="font-bold text-safety-blue mb-4">PROJECT STATS</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-neon-cyan">{projects.length}</p>
              <p className="text-xs text-gray-400">Total Projects</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-safety-green">{activeCount}</p>
              <p className="text-xs text-gray-400">Active</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-safety-yellow">{completedCount}</p>
              <p className="text-xs text-gray-400">Completed</p>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />

      {/* Weekly Report Modal */}
      {weeklyReportProjectId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-blueprint-bg border border-blueprint-grid w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-blueprint-grid flex justify-between items-center">
              <div>
                <h2 className="font-display text-xl font-bold text-safety-blue">WEEKLY REPORT</h2>
                <p className="text-xs text-gray-400 mt-1">
                  {projects.find(p => p.id === weeklyReportProjectId)?.title}
                </p>
              </div>
              <button onClick={() => { setWeeklyReportProjectId(null); setWeeklyReport(null) }} className="text-gray-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {!weeklyReport ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Week Starting</label>
                    <input
                      type="date"
                      value={weeklyReportWeek}
                      onChange={e => setWeeklyReportWeek(e.target.value)}
                      className="bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">Select any Monday to generate that week's report</p>
                  </div>
                  {reportError && <p className="text-red-400 text-sm">{reportError}</p>}
                  <button
                    onClick={generateWeeklyReport}
                    disabled={generatingReport}
                    className="btn-primary disabled:opacity-50"
                  >
                    {generatingReport ? '⟳ Generating...' : 'Generate Report →'}
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-gray-400">
                      Week of {new Date(weeklyReport.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(weeklyReport.weekEnd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{weeklyReport.logCount} log{weeklyReport.logCount !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={() => setWeeklyReport(null)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      ← Change week
                    </button>
                  </div>
                  <div className="bg-blueprint-paper/10 border border-blueprint-grid p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {weeklyReport.summary}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Project Modal */}
      {shareProject && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-blueprint-bg border border-blueprint-grid w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="font-display text-lg font-bold text-safety-yellow">SHARE PROJECT</h2>
                <button onClick={() => setShareProject(null)} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>
              <p className="text-xs text-gray-500 mb-5">
                Create a read-only link for subcontractors or clients — no login required.
              </p>

              {shareUrl ? (
                <div className="space-y-3">
                  <p className="text-xs text-safety-green font-bold">✓ Share link created</p>
                  <div className="bg-blueprint-paper/20 border border-blueprint-grid rounded p-3">
                    <p className="text-xs text-blue-300 break-all select-all">{shareUrl}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000) }}
                      className="btn-primary text-xs flex-1"
                    >
                      {shareCopied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => { setShareUrl(null); setShareLabel('') }}
                      className="btn-secondary text-xs flex-1"
                    >
                      Create Another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Label (optional)</label>
                    <input
                      type="text"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-safety-yellow"
                      placeholder='e.g. "Shared with ABC Electrical"'
                      value={shareLabel}
                      onChange={e => setShareLabel(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateShare}
                      disabled={shareCreating}
                      className="btn-primary text-sm flex-1 disabled:opacity-50"
                    >
                      {shareCreating ? 'Generating...' : 'Generate Share Link'}
                    </button>
                    <button onClick={() => setShareProject(null)} className="btn-secondary text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-blueprint-bg border border-blueprint-grid w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-display text-xl font-bold text-safety-yellow">ADD PROJECT</h2>
                <button onClick={() => { setShowModal(false); setError('') }} className="text-gray-400 hover:text-white text-xl">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 uppercase mb-1">Project Name *</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                    placeholder="e.g. Lot 47 — Smith Subdivision"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase mb-1">Location / Lot Number</label>
                  <input
                    type="text"
                    className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                    placeholder="City, State or lot identifier"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase mb-1">Job Site Address</label>
                  <input
                    type="text"
                    className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                    placeholder="123 Main St, Dallas TX 75201"
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Permit #</label>
                    <input
                      type="text"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      placeholder="Optional"
                      value={form.permitNumber}
                      onChange={e => setForm(f => ({ ...f, permitNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Plan Number</label>
                    <input
                      type="text"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      placeholder="Optional"
                      value={form.planNumber}
                      onChange={e => setForm(f => ({ ...f, planNumber: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Elevation</label>
                    <input
                      type="text"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      placeholder="A, B, C..."
                      value={form.elevation}
                      onChange={e => setForm(f => ({ ...f, elevation: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Electrical Side</label>
                    <input
                      type="text"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      placeholder="Left / Right"
                      value={form.electricalSide}
                      onChange={e => setForm(f => ({ ...f, electricalSide: e.target.value }))}
                    />
                  </div>
                </div>

                {error && <p className="text-safety-orange text-sm">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary text-sm disabled:opacity-50">
                    {saving ? 'Saving...' : 'Add Project'}
                  </button>
                  <button type="button" onClick={() => { setShowModal(false); setError('') }} className="btn-secondary text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
