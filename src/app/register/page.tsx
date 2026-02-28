'use client'

import Link from 'next/link'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const PLAN_LABELS: Record<string, { name: string; price: string; color: string }> = {
  PRO: { name: 'Register as Mentor', price: '$39/mo', color: 'text-safety-yellow' },
  DUST_LOGS: { name: 'Daily Logs Pro', price: '$9.99/mo (7-day free trial)', color: 'text-safety-orange' },
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'COMMUNITY'
  const planInfo = PLAN_LABELS[plan] ?? null
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    skills: '',
    yearsExperience: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Registration failed')
    } else {
      const redirect = plan === 'PRO' || plan === 'DUST_LOGS'
        ? '/login?registered=1&callbackUrl=/upgrade'
        : '/login?registered=1'
      router.push(redirect)
    }
  }

  return (
    <div className="card">
      <h2 className="font-display text-xl font-bold mb-4 text-center">Create Account</h2>

      {planInfo && (
        <div className="mb-5 p-3 bg-blueprint-paper/40 border border-blueprint-grid text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Selected Plan</p>
          <p className={`font-bold ${planInfo.color}`}>{planInfo.name}</p>
          <p className="text-xs text-gray-400">{planInfo.price}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase">First Name</label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
              placeholder="John"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
              placeholder="Smith"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Username</label>
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="johnsmith"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="Min. 8 characters"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Skills (comma separated)</label>
          <input
            type="text"
            name="skills"
            value={form.skills}
            onChange={handleChange}
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="superintendent, concrete, scheduling"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase">Years of Experience</label>
          <input
            type="number"
            name="yearsExperience"
            value={form.yearsExperience}
            onChange={handleChange}
            min="0"
            max="60"
            className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan"
            placeholder="10"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-6 text-center text-gray-400 text-sm">
        Already have an account?{' '}
        <Link href="/login" className="text-neon-cyan hover:underline">Sign In</Link>
      </div>
      {planInfo && (
        <div className="mt-3 text-center">
          <Link href="/pricing" className="text-xs text-gray-600 hover:text-gray-400">
            ← Change plan
          </Link>
        </div>
      )}
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-3xl font-bold text-neon-cyan">
            ProFieldHub
          </Link>
          <p className="text-gray-400 mt-2">Field Staff. Connected.</p>
        </div>
        <Suspense fallback={<div className="card text-center text-gray-400">Loading...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
}
