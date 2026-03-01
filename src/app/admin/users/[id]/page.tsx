'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface UserDetail {
  id: string
  name: string | null
  email: string
  username: string
  role: string
  subscription: string
  betaTester: boolean
  isMentor: boolean
  location: string | null
  bio: string | null
  yearsExperience: number | null
  createdAt: string
}

export default function AdminUserPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState('')
  const [subscription, setSubscription] = useState('')
  const [betaTester, setBetaTester] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setUser(data.user)
          setRole(data.user.role)
          setSubscription(data.user.subscription)
          setBetaTester(data.user.betaTester)
        }
        setLoading(false)
      })
  }, [id])

  const save = async () => {
    setSaving(true)
    setMessage('')
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, subscription, betaTester }),
    })
    const data = await res.json()
    if (res.ok) {
      setUser(data.user)
      setSubscription(data.user.subscription)
      setBetaTester(data.user.betaTester)
      setMessage('Saved successfully.')
    } else {
      setMessage(data.error ?? 'Error saving.')
    }
    setSaving(false)
  }

  const deleteUser = async () => {
    if (!confirm(`Delete user ${user?.email}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin')
    } else {
      setMessage('Error deleting user.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen blueprint-bg flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen blueprint-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">User not found.</p>
          <Link href="/admin" className="text-neon-cyan mt-4 block">← Back to Admin</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-display text-xl font-bold text-neon-cyan">Admin</Link>
            <span className="text-safety-orange font-bold text-sm">/ User Detail</span>
          </div>
          <Link href="/admin" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="card mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display text-xl font-bold text-white mb-1">{user.name || user.username}</h1>
              <p className="text-gray-400 text-sm">{user.email} • @{user.username}</p>
              <p className="text-gray-500 text-xs mt-1">
                Joined {new Date(user.createdAt).toLocaleDateString()}
                {user.location ? ` • ${user.location}` : ''}
                {user.yearsExperience ? ` • ${user.yearsExperience}yr exp` : ''}
              </p>
              {user.bio && <p className="text-gray-300 text-sm mt-3">{user.bio}</p>}
            </div>
            {user.betaTester && (
              <span className="text-xs font-bold text-safety-green border border-safety-green/40 px-2 py-1 rounded">
                BETA TESTER
              </span>
            )}
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="font-bold text-safety-orange mb-4">ACCOUNT SETTINGS</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white"
              >
                <option value="MEMBER">MEMBER</option>
                <option value="MENTOR">MENTOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Subscription Tier</label>
              <select
                value={subscription}
                onChange={e => setSubscription(e.target.value)}
                disabled={betaTester}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white disabled:opacity-50"
              >
                <option value="FREE">FREE</option>
                <option value="PRO">PRO</option>
                <option value="DUST_LOGS">Daily Logs Pro</option>
              </select>
              {betaTester && (
                <p className="text-xs text-safety-green mt-1">Locked to Daily Logs Pro — beta tester</p>
              )}
            </div>
          </div>

          {/* Beta Tester toggle */}
          <div className="mt-6 p-4 border border-safety-green/20 bg-safety-green/5 rounded">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-white">Beta Tester — Free for Life</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Grants Daily Logs Pro permanently. Stripe cancellation will not downgrade this account.
                </p>
              </div>
              <button
                onClick={() => setBetaTester(b => !b)}
                className={`relative w-12 h-6 rounded-full transition-colors ${betaTester ? 'bg-safety-green' : 'bg-gray-600'}`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${betaTester ? 'translate-x-7' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>

          {message && (
            <p className={`mt-3 text-sm ${message.includes('Error') ? 'text-safety-orange' : 'text-safety-green'}`}>
              {message}
            </p>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="card border border-safety-orange/30">
          <h2 className="font-bold text-safety-orange mb-3">DANGER ZONE</h2>
          <p className="text-sm text-gray-400 mb-4">
            Deleting this account is permanent and cannot be undone. All user data, projects, and posts will be removed.
          </p>
          <button onClick={deleteUser} className="btn-secondary text-sm border-safety-orange text-safety-orange hover:bg-safety-orange/10">
            Delete Account
          </button>
        </div>
      </main>
    </div>
  )
}
