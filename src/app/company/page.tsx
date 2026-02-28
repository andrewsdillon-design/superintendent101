'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Member {
  id: string
  role: string
  joinedAt: string
  user: { id: string; name: string | null; email: string; username: string; subscription: string }
}

interface Company {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  brandColor: string
  seats: number
  active: boolean
}

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [notOwner, setNotOwner] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/company/members')
    if (res.status === 404) {
      setNotOwner(true)
      setLoading(false)
      return
    }
    if (res.ok) {
      const data = await res.json()
      setCompany(data.company)
      setMembers(data.members)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setAddSuccess('')
    const res = await fetch('/api/company/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail }),
    })
    if (res.ok) {
      setAddEmail('')
      setAddSuccess('Member added successfully')
      load()
    } else {
      const d = await res.json()
      setAddError(d.error ?? 'Failed to add member')
    }
  }

  async function removeMember(userId: string) {
    await fetch(`/api/company/members/${userId}`, { method: 'DELETE' })
    load()
  }

  if (loading) return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  if (notOwner) return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center">
      <div className="card text-center max-w-md">
        <p className="text-gray-400 mb-4">You are not a company owner.</p>
        <Link href="/daily-logs" className="btn-primary text-sm">← Back to Daily Logs</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {company?.logoUrl && (
              <img src={company.logoUrl} alt={company?.name} className="w-8 h-8 object-contain rounded" />
            )}
            <span
              className="font-display text-xl font-bold"
              style={{ color: company?.brandColor ?? '#2563eb' }}
            >
              {company?.name ?? 'My Company'}
            </span>
          </div>
          <Link href="/daily-logs" className="text-sm text-gray-400 hover:text-white">← Daily Logs</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card text-center">
            <p className="font-display text-3xl font-bold text-white">{members.length}</p>
            <p className="text-gray-400 text-sm mt-1">Members</p>
          </div>
          <div className="card text-center">
            <p className="font-display text-3xl font-bold text-safety-orange">
              {company ? company.seats - members.length : 0}
            </p>
            <p className="text-gray-400 text-sm mt-1">Seats Available</p>
          </div>
        </div>

        {/* Add Member */}
        <div className="card space-y-4">
          <h2 className="font-display font-bold text-white">Invite Team Member</h2>
          <p className="text-gray-400 text-sm">
            Add an existing ProFieldHub user to your company group. They must already have an account.
          </p>
          {addError && <p className="text-red-400 text-sm">{addError}</p>}
          {addSuccess && <p className="text-safety-green text-sm">{addSuccess}</p>}
          <form onSubmit={addMember} className="flex gap-3">
            <input
              type="email"
              className="bg-blueprint-bg border border-blueprint-grid p-2 text-white flex-1"
              placeholder="colleague@email.com"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary text-sm px-4">Invite</button>
          </form>
        </div>

        {/* Member List */}
        <div className="card">
          <h2 className="font-display font-bold text-white mb-4">
            Team Members ({members.length} / {company?.seats ?? '—'})
          </h2>
          {members.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No members yet. Invite your team above.</p>
          ) : (
            <div className="space-y-3">
              {members.map(m => (
                <div
                  key={m.id}
                  className="flex justify-between items-center py-3 border-b border-blueprint-grid/50 last:border-0"
                >
                  <div>
                    <p className="text-white font-medium">{m.user.name ?? m.user.username}</p>
                    <p className="text-gray-500 text-xs">{m.user.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-semibold ${m.role === 'OWNER' ? 'text-safety-orange' : 'text-gray-400'}`}>
                      {m.role}
                    </span>
                    {m.role !== 'OWNER' && (
                      <button
                        onClick={() => removeMember(m.user.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
