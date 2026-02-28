'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import MobileNav from '@/components/mobile-nav'

export default function DashboardPage() {
  const { data: session } = useSession()
  const user = session?.user as any
  const userName = user?.name || user?.username || 'Superintendent'
  const role = user?.role

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/daily-logs" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/daily-logs" className="text-gray-400 hover:text-white">Daily Logs</Link>
              <Link href="/daily-logs/new" className="text-gray-400 hover:text-white">New Log</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && (
              <Link href="/admin" className="text-xs text-safety-orange hover:underline hidden sm:block">Admin</Link>
            )}
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white hidden sm:block">{userName}</Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 pb-24 md:pb-12">
        <div className="mb-10">
          <h1 className="font-display text-3xl font-bold text-white">
            Welcome back, <span className="text-neon-cyan">{userName}</span>
          </h1>
          <p className="text-gray-400 mt-2">Ready to log the field?</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <Link
            href="/daily-logs/new"
            className="card border-2 border-safety-green hover:border-safety-green/80 hover:bg-safety-green/5 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎙️</div>
              <div>
                <h2 className="font-display text-xl font-bold text-safety-green group-hover:text-safety-green">
                  NEW DAILY LOG
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Record voice notes or type field observations. AI structures it into a professional log.
                </p>
                <p className="text-xs text-safety-green mt-3 font-semibold">Start logging →</p>
              </div>
            </div>
          </Link>

          <Link
            href="/daily-logs"
            className="card border-2 border-neon-cyan hover:border-neon-cyan/80 hover:bg-neon-cyan/5 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="text-3xl">📋</div>
              <div>
                <h2 className="font-display text-xl font-bold text-neon-cyan group-hover:text-neon-cyan">
                  LOG HISTORY
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  View all your daily logs. Download PDFs, search by date.
                </p>
                <p className="text-xs text-neon-cyan mt-3 font-semibold">View history →</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="mt-8 card border border-blueprint-grid">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-safety-blue text-sm uppercase tracking-wide">Quick Links</h3>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">Profile &amp; Billing →</Link>
            <Link href="/upgrade" className="text-gray-400 hover:text-white transition-colors">Upgrade Plan →</Link>
            {role === 'ADMIN' && (
              <Link href="/admin" className="text-safety-orange hover:text-safety-orange/80 transition-colors">Admin Panel →</Link>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}
