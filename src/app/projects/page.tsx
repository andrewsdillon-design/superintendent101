'use client'

import Link from 'next/link'
import MobileNav from '@/components/mobile-nav'
import { useSession, signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface Project {
  id: string
  title: string
  description: string | null
  location: string | null
  type: string | null
  sqft: number | null
  status: string
  startDate: string | null
  endDate: string | null
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-safe',
  COMPLETED: 'text-xs text-gray-400',
  PLANNING: 'text-xs text-safety-yellow',
  ON_HOLD: 'text-xs text-safety-orange',
}

const BLANK_FORM = {
  title: '', description: '', location: '', type: '',
  sqft: '', status: 'ACTIVE', startDate: '', endDate: '',
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchProjects = () => {
    fetch('/api/projects')
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
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  const displayed = projects.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.location?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeCount = projects.filter(p => p.status === 'ACTIVE').length
  const completedCount = projects.filter(p => p.status === 'COMPLETED').length
  const totalSqft = projects.reduce((sum, p) => sum + (p.sqft ?? 0), 0)

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
            {displayed.length} of {projects.length} projects
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
                {project.location && <p className="text-sm text-gray-500">{project.location}</p>}
                {project.description && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{project.description}</p>
                )}
                <div className="mt-2 flex gap-4 text-sm text-gray-400 flex-wrap">
                  {project.type && <span>{project.type}</span>}
                  {project.sqft && <span>{project.sqft.toLocaleString()} sqft</span>}
                </div>
                {(project.startDate || project.endDate) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString() : '?'}
                    {' → '}
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'present'}
                  </p>
                )}
                <div className="mt-auto pt-4 border-t border-blueprint-grid flex gap-2 mt-4">
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
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 card">
          <h3 className="font-bold text-safety-blue mb-4">PROJECT STATS</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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
            <div>
              <p className="text-2xl font-bold text-white">
                {totalSqft >= 1000000 ? `${(totalSqft / 1000000).toFixed(1)}M` : totalSqft.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400">Total sqft</p>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />

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
                    placeholder="e.g. Target Store #2847"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Type</label>
                    <select
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    >
                      <option value="">Select...</option>
                      <option>Retail</option>
                      <option>Industrial</option>
                      <option>Multi-Family</option>
                      <option>Healthcare</option>
                      <option>Office</option>
                      <option>Data Center</option>
                      <option>Infrastructure</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Status</label>
                    <select
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="PLANNING">Planning</option>
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                    placeholder="City, State"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase mb-1">Square Footage</label>
                  <input
                    type="number"
                    className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                    placeholder="e.g. 45000"
                    value={form.sqft}
                    onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase mb-1">End Date</label>
                    <input
                      type="date"
                      className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                      value={form.endDate}
                      onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 uppercase mb-1">Description</label>
                  <textarea
                    rows={3}
                    className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm resize-none focus:outline-none focus:border-neon-cyan"
                    placeholder="Brief description..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  />
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
