'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
  contactEmail: string | null
  seats: number
  active: boolean
  members: Member[]
}

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<'MEMBER' | 'OWNER'>('MEMBER')
  const [addError, setAddError] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', logoUrl: '', brandColor: '', contactEmail: '', seats: '' })

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/companies/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setCompany(data.company)
      setEditForm({
        name: data.company.name,
        logoUrl: data.company.logoUrl ?? '',
        brandColor: data.company.brandColor,
        contactEmail: data.company.contactEmail ?? '',
        seats: String(data.company.seats),
      })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])

  async function addMember(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    const res = await fetch(`/api/admin/companies/${params.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail, role: addRole }),
    })
    if (res.ok) {
      setAddEmail('')
      load()
    } else {
      const d = await res.json()
      setAddError(d.error ?? 'Failed to add member')
    }
  }

  async function removeMember(userId: string) {
    await fetch(`/api/admin/companies/${params.id}/members/${userId}`, { method: 'DELETE' })
    load()
  }

  async function changeRole(userId: string, role: string) {
    await fetch(`/api/admin/companies/${params.id}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    await fetch(`/api/admin/companies/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, seats: Number(editForm.seats) }),
    })
    setEditMode(false)
    load()
  }

  async function deleteCompany() {
    if (!confirm(`Delete ${company?.name}? This will remove all member associations.`)) return
    await fetch(`/api/admin/companies/${params.id}`, { method: 'DELETE' })
    router.push('/admin/companies')
  }

  if (loading) return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  )

  if (!company) return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center">
      <p className="text-red-400">Company not found</p>
    </div>
  )

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <span className="text-safety-orange font-bold text-sm">ADMIN</span>
          </div>
          <Link href="/admin/companies" className="text-sm text-gray-400 hover:text-white">← Companies</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Company Header */}
        <div className="card flex justify-between items-start">
          <div className="flex gap-4 items-center">
            {company.logoUrl && (
              <img src={company.logoUrl} alt={company.name} className="w-12 h-12 object-contain rounded" />
            )}
            <div>
              <h1 className="font-display text-2xl font-bold text-white">{company.name}</h1>
              <p className="text-gray-500 text-sm font-mono">{company.slug}</p>
              {company.contactEmail && <p className="text-gray-400 text-sm">{company.contactEmail}</p>}
              <div className="flex gap-4 mt-1 text-sm">
                <span className="text-gray-400">{company.members.length} / {company.seats} seats</span>
                <span
                  className="font-semibold"
                  style={{ color: company.brandColor }}
                >
                  ● Brand color
                </span>
                <span className={`font-semibold ${company.active ? 'text-safety-green' : 'text-gray-500'}`}>
                  {company.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditMode(m => !m)} className="btn-secondary text-sm">
              {editMode ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={deleteCompany} className="text-sm text-red-400 hover:text-red-300 px-3">
              Delete
            </button>
          </div>
        </div>

        {/* Edit Form */}
        {editMode && (
          <form onSubmit={saveEdit} className="card space-y-4">
            <h2 className="font-display font-bold text-white">Edit Company</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Name</label>
                <input className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Logo URL</label>
                <input className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={editForm.logoUrl} onChange={e => setEditForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://..." />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Contact Email</label>
                <input type="email" className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={editForm.contactEmail} onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Seat Limit</label>
                <input type="number" min="1" max="500" className="bg-blueprint-bg border border-blueprint-grid p-2 text-white w-full"
                  value={editForm.seats} onChange={e => setEditForm(f => ({ ...f, seats: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Brand Color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" className="w-10 h-10 border border-blueprint-grid cursor-pointer"
                    value={editForm.brandColor} onChange={e => setEditForm(f => ({ ...f, brandColor: e.target.value }))} />
                  <span className="text-gray-400 text-sm">{editForm.brandColor}</span>
                </div>
              </div>
            </div>
            <button type="submit" className="btn-primary text-sm">Save Changes</button>
          </form>
        )}

        {/* Add Member */}
        <div className="card space-y-4">
          <h2 className="font-display font-bold text-white">Add Member</h2>
          {addError && <p className="text-red-400 text-sm">{addError}</p>}
          <form onSubmit={addMember} className="flex gap-3">
            <input
              type="email"
              className="bg-blueprint-bg border border-blueprint-grid p-2 text-white flex-1"
              placeholder="user@email.com"
              value={addEmail}
              onChange={e => setAddEmail(e.target.value)}
              required
            />
            <select
              className="bg-blueprint-bg border border-blueprint-grid p-2 text-white"
              value={addRole}
              onChange={e => setAddRole(e.target.value as 'MEMBER' | 'OWNER')}
            >
              <option value="MEMBER">Member</option>
              <option value="OWNER">Owner</option>
            </select>
            <button type="submit" className="btn-primary text-sm px-4">Add</button>
          </form>
        </div>

        {/* Member List */}
        <div className="card overflow-x-auto">
          <h2 className="font-display font-bold text-white mb-4">
            Members ({company.members.length} / {company.seats})
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blueprint-grid text-gray-400 text-left">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 pr-4">Subscription</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {company.members.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-gray-500">No members yet</td></tr>
              ) : company.members.map(m => (
                <tr key={m.id} className="border-b border-blueprint-grid/50 hover:bg-blueprint-paper/20">
                  <td className="py-3 pr-4">
                    <p className="text-white font-medium">{m.user.name ?? m.user.username}</p>
                    <p className="text-gray-500 text-xs">{m.user.email}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-300 text-xs">{m.user.subscription}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold ${m.role === 'OWNER' ? 'text-safety-orange' : 'text-gray-300'}`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 flex gap-3">
                    <button
                      onClick={() => changeRole(m.user.id, m.role === 'OWNER' ? 'MEMBER' : 'OWNER')}
                      className="text-xs text-neon-cyan hover:underline"
                    >
                      {m.role === 'OWNER' ? 'Make Member' : 'Make Owner'}
                    </button>
                    <button
                      onClick={() => removeMember(m.user.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
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
