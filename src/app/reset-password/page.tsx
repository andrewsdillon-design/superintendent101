'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
    } else {
      router.push('/login?reset=1')
    }
  }

  if (!token) {
    return (
      <div className="card text-center">
        <p className="text-red-300 mb-4">Invalid reset link.</p>
        <Link href="/forgot-password" className="text-neon-cyan hover:underline text-sm">
          Request a new one
        </Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="font-display text-xl font-bold mb-6 text-center">Set New Password</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 uppercase">New Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="Min. 8 characters"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-neon-cyan">
            ProFieldHub
          </Link>
          <p className="text-gray-400 mt-2">Field Staff. Connected.</p>
        </div>
        <Suspense fallback={<div className="card text-center text-gray-400">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
