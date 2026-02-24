'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    setLoading(false)

    if (res.ok) {
      setSubmitted(true)
    } else {
      setError('Something went wrong. Try again.')
    }
  }

  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-neon-cyan">
            ProFieldHub
          </Link>
          <p className="text-gray-400 mt-2">Field Staff. Connected.</p>
        </div>

        <div className="card">
          <h2 className="font-display text-xl font-bold mb-2 text-center">Reset Password</h2>

          {submitted ? (
            <div className="text-center py-4">
              <p className="text-green-300 mb-4">
                If that email is registered, you&apos;ll receive a reset link shortly.
              </p>
              <Link href="/login" className="text-neon-cyan hover:underline text-sm">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <p className="text-gray-400 text-sm mb-6 text-center">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
                    placeholder="you@company.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/login" className="text-xs text-gray-500 hover:text-neon-cyan">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
