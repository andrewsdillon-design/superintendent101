'use client'

import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'

interface User {
  id: string
  name: string | null
  email: string
  username: string
  role: string
  subscription: string
  isMentor: boolean
  createdAt: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      const data = await res.json()
      setUsers(data.users)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const subColor: Record<string, string> = {
    FREE: 'text-gray-400',
    PRO: 'text-safety-yellow',
    DUST_LOGS: 'text-safety-orange',
  }

  const roleColor: Record<string, string> = {
    MEMBER: 'text-gray-300',
    MENTOR: 'text-safety-green',
    ADMIN: 'text-neon-cyan',
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <span className="text-safety-orange font-bold text-sm">ADMIN</span>
            <nav className="flex gap-4 text-sm ml-4">
              <span className="text-white font-semibold">Users</span>
              <Link href="/admin/analytics" className="text-gray-400 hover:text-white">Analytics</Link>
            </nav>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold text-safety-orange">USER MANAGEMENT</h1>
            <p className="text-gray-400 text-sm mt-1">{total} total users</p>
          </div>
        </div>

        <div className="card mb-6 flex gap-4">
          <input
            type="text"
            className="bg-blueprint-bg border border-blueprint-grid p-2 text-white flex-1"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
          <button onClick={fetchUsers} className="btn-secondary text-sm px-4">Refresh</button>
        </div>

        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blueprint-grid text-gray-400 text-left">
                <th className="pb-3 pr-4">Name / Email</th>
                <th className="pb-3 pr-4">Username</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Subscription</th>
                <th className="pb-3 pr-4">Joined</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No users found</td></tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-blueprint-grid/50 hover:bg-blueprint-paper/20">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{u.name || '—'}</p>
                      <p className="text-gray-500 text-xs">{u.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-gray-300">@{u.username}</td>
                    <td className={`py-3 pr-4 font-semibold ${roleColor[u.role] ?? ''}`}>{u.role}</td>
                    <td className={`py-3 pr-4 font-semibold ${subColor[u.subscription] ?? ''}`}>{u.subscription}</td>
                    <td className="py-3 pr-4 text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-neon-cyan hover:underline text-xs">
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              ← Prev
            </button>
            <span className="text-gray-400 text-sm self-center">Page {page} of {pages}</span>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
