'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewDustLogPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    projectName: '',
    address: '',
    duration: '',
    notes: '',
    tags: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projectName.trim()) {
      setError('Project name is required')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/dust-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: form.projectName,
        address: form.address,
        duration: form.duration ? parseInt(form.duration) : undefined,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })

    setLoading(false)

    if (res.ok) {
      router.push('/dust-logs')
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to create log')
    }
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/dust-logs" className="text-white">Dust Logs</Link>
            </nav>
          </div>
          <Link href="/dust-logs" className="text-sm text-gray-400 hover:text-white">← Back to Logs</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-safety-yellow mb-6">NEW DUST LOG</h1>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 uppercase">Project Name *</label>
              <input
                type="text"
                name="projectName"
                value={form.projectName}
                onChange={handleChange}
                required
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
                placeholder="Target Store - Phase 2"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Site Address</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
                placeholder="123 Main St, Columbus, OH"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Duration (minutes)</label>
              <input
                type="number"
                name="duration"
                value={form.duration}
                onChange={handleChange}
                min="1"
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
                placeholder="30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Tags (comma separated)</label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
                placeholder="safety, concrete, daily-log"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase">Field Notes</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={5}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan resize-none"
                placeholder="Describe what you observed in the field today..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Log'}
              </button>
              <Link href="/dust-logs" className="btn-secondary flex-1 text-center">
                Cancel
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-6 card">
          <h3 className="font-bold text-safety-orange mb-3 text-sm">FIELD AI RULES — REMINDER</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Context is king — document what you observed, not what you assumed</li>
            <li>• Safety overrides everything — flag hazards immediately</li>
            <li>• Daily log clarity — no corporate fluff, plain field language</li>
            <li>• Walk the site rule — if it&apos;s not documented, it didn&apos;t happen</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
