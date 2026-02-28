'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Company {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  seats: number
  active: boolean
  createdAt: string
  _count: { members: number }
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', contactEmail: '', brandColor: '#2563eb', seats: '10' })
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/companies')
    if (res.ok) setCompanies((await res.json()).companies)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createCompany(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const res = await fetch('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, seats: Number(form.seats) }),
    })
    if (res.ok) {
      setForm({ name: '', contactEmail: '', brandColor: '#2563eb', seats: '10' })
      setCreating(false)
      load()
    } else {
      const d = await res.json()
      setError(d.error ?? 'Failed to create company')
    }
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch(`/api/admin/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    load()
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <span className="text-safety-orange font-bold text-sm">ADMIN</span>
            <nav className="flex gap-4 text-sm ml-4">
              <Link href="/admin" className="text-gray-400 hover:text-white">Users</Link>
              <Link href="/admin/analytics" className="text-gray-400 hover:text-white">Analytics</Link>
              <span className="text-white font-semibold">Companies</span>
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-safety-orange">COMPANY GROUPS</h1>
            <p className="text-gray-400 text-sm mt-1">{companies.length} companies</p>
          </div>
          <button
            onClick={() => setCreating(c => !c)}
            className="btn-primary text-sm"
          >
            {creating ? 'Cancel' : '+ New Company'}
          </button>
        </div>

        {creating && (
          <form onSubmit={createCompany} className="card mb-6 space-y-4">
            <h2 className="font-display font-bold text-white">Create Company Group</h2>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Company Name *</label>
                <input
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Acme Construction"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Contact Email</label>
                <input
                  type="email"
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={form.contactEmail}
                  onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                  placeholder="owner@company.com"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Brand Color</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    className="w-10 h-10 border border-blueprint-grid cursor-pointer"
                    value={form.brandColor}
                    onChange={e => setForm(f => ({ ...f, brandColor: e.target.value }))}
                  />
                  <span className="text-gray-400 text-sm">{form.brandColor}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Seat Limit</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={form.seats}
                  onChange={e => setForm(f => ({ ...f, seats: e.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary text-sm">Create Company</button>
          </form>
        )}

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blueprint-grid text-gray-400 text-left">
                <th className="pb-3 pr-4">Company</th>
                <th className="pb-3 pr-4">Contact</th>
                <th className="pb-3 pr-4">Members</th>
                <th className="pb-3 pr-4">Seats</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading...</td></tr>
              ) : companies.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">No companies yet</td></tr>
              ) : companies.map(c => (
                <tr key={c.id} className="border-b border-blueprint-grid/50 hover:bg-blueprint-paper/20">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-gray-500 text-xs font-mono">{c.slug}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-300 text-xs">{c.contactEmail ?? '—'}</td>
                  <td className="py-3 pr-4 text-white font-semibold">{c._count.members}</td>
                  <td className="py-3 pr-4 text-gray-300">{c.seats}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold ${c.active ? 'text-safety-green' : 'text-gray-500'}`}>
                      {c.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 flex gap-3 items-center">
                    <Link href={`/admin/companies/${c.id}`} className="text-neon-cyan hover:underline text-xs">
                      Manage →
                    </Link>
                    <button
                      onClick={() => toggleActive(c.id, c.active)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      {c.active ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
