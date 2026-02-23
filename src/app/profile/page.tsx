'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import MobileNav from '@/components/MobileNav'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const user = session?.user as any

  const name = user?.name || user?.username || 'User'
  const username = user?.username || ''
  const role = user?.role || 'MEMBER'

  const tierLabel: Record<string, string> = {
    FREE: 'FREE TIER',
    PRO: 'PRO — $20/mo',
    DUST_LOGS: 'DUST LOGS — $50/mo',
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400 hover:text-white">Dust Logs</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white font-semibold">Profile</span>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        <h1 className="font-display text-2xl font-bold text-safety-yellow mb-6">MY PROFILE</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-24 h-24 bg-blueprint-paper rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-neon-cyan">
              {name ? initials(name) : '??'}
            </div>
            <h2 className="font-semibold text-lg mt-4">{name}</h2>
            {username && <p className="text-sm text-gray-500">@{username}</p>}
            {role === 'MENTOR' && <span className="badge-safe mt-2 inline-block">MENTOR</span>}
            <button className="btn-secondary w-full mt-4 text-sm">Edit Profile</button>
          </div>

          <div className="card md:col-span-2 space-y-4">
            <h3 className="font-bold text-safety-blue">SUBSCRIPTION</h3>
            <div className="flex items-center justify-between">
              <span className="badge-safe">{tierLabel['FREE']}</span>
              <Link href="/upgrade" className="btn-primary text-sm">Upgrade</Link>
            </div>

            <div className="border-t border-blueprint-grid pt-4">
              <h4 className="text-sm font-bold text-gray-400 mb-3">TIER BENEFITS</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-safety-green">✓</span>
                  <span>Community feed &amp; profile — FREE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">○</span>
                  <span>Mentorship access + USDC hour trading — $20/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">○</span>
                  <span>Dust Logs voice AI + Notion/NotebookLM sync — $50/mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-6">
          <h3 className="font-bold text-safety-orange mb-4">RECENT PROJECTS</h3>
          <div className="space-y-3">
            <p className="text-sm text-gray-400">No projects yet.</p>
          </div>
          <Link href="/projects" className="text-sm text-neon-cyan hover:underline mt-4 block">
            View projects →
          </Link>
        </div>

        <div className="card mt-6">
          <h3 className="font-bold text-safety-green mb-4">INTEGRATIONS</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">Notion</p>
                <p className="text-xs text-gray-500">Sync Dust Logs to your Notion workspace</p>
              </div>
              <button className="btn-secondary text-xs px-3 py-1">Connect</button>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">Google NotebookLM</p>
                <p className="text-xs text-gray-500">AI-powered field log analysis</p>
              </div>
              <button className="btn-secondary text-xs px-3 py-1">Connect</button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Integrations require Dust Logs tier ($50/mo)</p>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
