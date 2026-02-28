'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import MobileNav from '@/components/mobile-nav'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const tierLabel: Record<string, string> = {
  FREE: 'Free Trial',
  PRO: 'Daily Logs Pro',
  DUST_LOGS: 'Daily Logs Pro',
}

const tierColor: Record<string, string> = {
  FREE: 'text-gray-300',
  PRO: 'text-safety-orange',
  DUST_LOGS: 'text-safety-orange',
}

function ProfileContent() {
  const { data: session } = useSession()
  const user = session?.user as any
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')

  const name = user?.name || user?.username || 'User'
  const username = user?.username || ''
  const role = user?.role || 'MEMBER'
  const subscription = user?.subscription || 'FREE'

  const [managingBilling, setManagingBilling] = useState(false)
  const [exportingData, setExportingData] = useState(false)

  const handleManageBilling = async () => {
    setManagingBilling(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error ?? 'Could not open billing portal.')
    } catch {
      alert('Network error.')
    } finally {
      setManagingBilling(false)
    }
  }

  const handleExportData = async () => {
    setExportingData(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) {
        const d = await res.json()
        alert(d.error ?? 'Export failed.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'profieldhub-export.zip'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Network error.')
    } finally {
      setExportingData(false)
    }
  }

  const isSubscribed = subscription === 'DUST_LOGS' || subscription === 'PRO'

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
              <Link href="/admin" className="text-sm text-safety-orange font-semibold hover:underline">Admin Panel</Link>
            )}
            <span className="text-sm text-white font-semibold">Profile</span>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="text-sm text-gray-400 hover:text-white">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {upgraded && (
          <div className="mb-6 p-4 bg-safety-green/10 border border-safety-green text-safety-green text-sm rounded">
            Subscription active. Welcome to Daily Logs Pro!
          </div>
        )}

        <h1 className="font-display text-2xl font-bold text-safety-yellow mb-6">MY PROFILE</h1>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card text-center">
            <div className="w-24 h-24 bg-blueprint-paper rounded-full mx-auto flex items-center justify-center text-3xl font-bold text-neon-cyan">
              {name ? initials(name) : '??'}
            </div>
            <h2 className="font-semibold text-lg mt-4">{name}</h2>
            {username && <p className="text-sm text-gray-500">@{username}</p>}
            {role === 'ADMIN' && <span className="text-xs text-safety-orange font-bold mt-2 block">ADMIN</span>}
          </div>

          <div className="card md:col-span-2 space-y-4">
            <h3 className="font-bold text-safety-blue">SUBSCRIPTION</h3>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className={`font-bold text-sm ${tierColor[subscription]}`}>
                  {tierLabel[subscription] ?? subscription}
                </span>
                {isSubscribed && (
                  <span className="ml-2 text-xs text-gray-500">— $9.99/mo</span>
                )}
                {!isSubscribed && (
                  <span className="ml-2 text-xs text-gray-500">— 7-day trial</span>
                )}
              </div>
              {!isSubscribed ? (
                <Link href="/upgrade" className="btn-primary text-sm">Upgrade — $9.99/mo</Link>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleManageBilling}
                    disabled={managingBilling}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    {managingBilling ? 'Opening...' : 'Manage Billing'}
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-blueprint-grid pt-4">
              <h4 className="text-sm font-bold text-gray-400 mb-3">DAILY LOGS PRO INCLUDES</h4>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-400">
                {[
                  'Voice transcription (Whisper)',
                  'AI log structuring',
                  'Crew counts by trade',
                  'Weather logging',
                  'PDF export',
                  'Photo attachments',
                  'Full log history',
                  'Data export (ZIP)',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <span className={isSubscribed ? 'text-safety-green' : 'text-gray-600'}>
                      {isSubscribed ? '✓' : '○'}
                    </span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-6">
          <h3 className="font-bold text-safety-orange mb-4">YOUR DATA</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">Download My Data</p>
              <p className="text-xs text-gray-500">Export all your logs, profile, and data as a ZIP file</p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exportingData}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {exportingData ? 'Preparing...' : 'Download ZIP'}
            </button>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen blueprint-bg" />}>
      <ProfileContent />
    </Suspense>
  )
}
