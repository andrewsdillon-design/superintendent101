'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import MobileNav from '@/components/mobile-nav'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const tierLabel: Record<string, string> = {
  FREE: 'FREE TIER',
  PRO: 'MENTORSHIP — $20/mo',
  DUST_LOGS: 'DUST LOGS — $50/mo',
}

const tierColor: Record<string, string> = {
  FREE: 'text-gray-300',
  PRO: 'text-safety-yellow',
  DUST_LOGS: 'text-safety-orange',
}

function ProfileContent() {
  const { data: session } = useSession()
  const user = session?.user as any
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded')
  const notionStatus = searchParams.get('notion')

  const name = user?.name || user?.username || 'User'
  const username = user?.username || ''
  const role = user?.role || 'MEMBER'
  const subscription = user?.subscription || 'FREE'

  const [managingBilling, setManagingBilling] = useState(false)
  const [connectingNotion, setConnectingNotion] = useState(false)
  const [notionConnected, setNotionConnected] = useState(false)
  const [notionNeedsSetup, setNotionNeedsSetup] = useState(false)
  const [notionDbInput, setNotionDbInput] = useState('')
  const [notionDbSaving, setNotionDbSaving] = useState(false)
  const [notionDbError, setNotionDbError] = useState('')

  useEffect(() => {
    if (subscription === 'DUST_LOGS') {
      fetch('/api/integrations/notion')
        .then(r => r.json())
        .then(d => {
          setNotionConnected(d.connected ?? false)
          setNotionNeedsSetup(d.needsSetup ?? false)
        })
        .catch(() => {})
    }
  }, [subscription])

  const handleNotionConnect = async () => {
    setConnectingNotion(true)
    try {
      const res = await fetch('/api/integrations/notion', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Could not connect to Notion.')
      }
    } catch {
      alert('Network error.')
    } finally {
      setConnectingNotion(false)
    }
  }

  const handleNotionDisconnect = async () => {
    if (!confirm('Disconnect Notion? Your existing logs will stay in Notion but new ones won\'t sync.')) return
    await fetch('/api/integrations/notion', { method: 'DELETE' })
    setNotionConnected(false)
    setNotionNeedsSetup(false)
  }

  const handleSaveNotionDb = async () => {
    setNotionDbSaving(true)
    setNotionDbError('')
    try {
      const res = await fetch('/api/integrations/notion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ databaseId: notionDbInput }),
      })
      const data = await res.json()
      if (data.connected) {
        setNotionConnected(true)
        setNotionNeedsSetup(false)
        setNotionDbInput('')
      } else {
        setNotionDbError(data.error ?? 'Could not save database ID.')
      }
    } catch {
      setNotionDbError('Network error.')
    } finally {
      setNotionDbSaving(false)
    }
  }

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

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/mentors" className="text-gray-400 hover:text-white">Mentors</Link>
              <Link href="/projects" className="text-gray-400 hover:text-white">Projects</Link>
              <Link href="/dust-logs" className="text-gray-400 hover:text-white">Dust Logs</Link>
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
            Your subscription has been upgraded. Welcome to {subscription}!
          </div>
        )}
        {notionStatus === 'connected' && (
          <div className="mb-6 p-4 bg-safety-green/10 border border-safety-green text-safety-green text-sm rounded">
            Notion connected. Your Dust Logs will sync to your ProFieldHub Dust Logs database.
          </div>
        )}
        {notionStatus === 'error' && (
          <div className="mb-6 p-4 bg-safety-orange/10 border border-safety-orange text-safety-orange text-sm rounded">
            Notion connection failed. Please try again.
          </div>
        )}
        {notionStatus === 'misconfigured' && (
          <div className="mb-6 p-4 bg-safety-orange/10 border border-safety-orange text-safety-orange text-sm rounded">
            Notion integration is not yet configured on this server.
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
            {role === 'MENTOR' && <span className="badge-safe mt-2 inline-block">MENTOR</span>}
            {role === 'ADMIN' && <span className="text-xs text-safety-orange font-bold mt-2 block">ADMIN</span>}
            <button className="btn-secondary w-full mt-4 text-sm">Edit Profile</button>
          </div>

          <div className="card md:col-span-2 space-y-4">
            <h3 className="font-bold text-safety-blue">SUBSCRIPTION</h3>
            <div className="flex items-center justify-between">
              <span className={`font-bold text-sm ${tierColor[subscription]}`}>
                {tierLabel[subscription] ?? subscription}
              </span>
              {subscription === 'FREE' ? (
                <Link href="/upgrade" className="btn-primary text-sm">Upgrade</Link>
              ) : (
                <div className="flex gap-2">
                  <Link href="/upgrade" className="btn-secondary text-sm">Change Plan</Link>
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
              <h4 className="text-sm font-bold text-gray-400 mb-3">TIER BENEFITS</h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-safety-green">✓</span>
                  <span>Community feed &amp; profile — FREE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={subscription === 'PRO' || subscription === 'DUST_LOGS' ? 'text-safety-green' : 'text-gray-600'}>
                    {subscription === 'PRO' || subscription === 'DUST_LOGS' ? '✓' : '○'}
                  </span>
                  <span>Mentorship access + USDC hour trading — $20/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={subscription === 'DUST_LOGS' ? 'text-safety-green' : 'text-gray-600'}>
                    {subscription === 'DUST_LOGS' ? '✓' : '○'}
                  </span>
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
              {subscription === 'DUST_LOGS' ? (
                notionConnected ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-safety-green">Connected</span>
                    <button onClick={handleNotionDisconnect} className="btn-secondary text-xs px-3 py-1">
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleNotionConnect}
                    disabled={connectingNotion}
                    className="btn-secondary text-xs px-3 py-1 disabled:opacity-50"
                  >
                    {connectingNotion ? 'Connecting...' : 'Connect'}
                  </button>
                )
              ) : (
                <button disabled className="btn-secondary text-xs px-3 py-1 opacity-40 cursor-not-allowed">
                  Dust Logs required
                </button>
              )}
            </div>

            {/* Setup required: token exists but no database linked */}
            {notionNeedsSetup && !notionConnected && (
              <div className="mt-4 p-4 border border-yellow-500/40 rounded bg-yellow-500/5">
                <p className="text-sm font-semibold text-yellow-400 mb-2">Notion Connected — Database Setup Required</p>
                <p className="text-xs text-gray-400 mb-3">
                  ProFieldHub is authorized with Notion, but needs a database to write to. Follow these steps:
                </p>
                <ol className="text-xs text-gray-400 space-y-1 mb-4 list-decimal list-inside">
                  <li>In Notion, create a new <strong className="text-white">database page</strong> (e.g. "Dust Logs")</li>
                  <li>Open it, click <strong className="text-white">...</strong> → <strong className="text-white">Connections</strong> → find and add <strong className="text-white">ProFieldHub</strong></li>
                  <li>Copy the database ID from the URL — it's the long string after the last <code className="text-neon-cyan">/</code> and before <code className="text-neon-cyan">?</code></li>
                  <li>Paste it below and click Save</li>
                </ol>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste Notion database ID..."
                    value={notionDbInput}
                    onChange={e => setNotionDbInput(e.target.value)}
                    className="flex-1 bg-blueprint-bg border border-blueprint-grid text-white text-xs px-3 py-2 rounded focus:outline-none focus:border-neon-cyan"
                  />
                  <button
                    onClick={handleSaveNotionDb}
                    disabled={notionDbSaving || !notionDbInput.trim()}
                    className="btn-primary text-xs px-4 disabled:opacity-50"
                  >
                    {notionDbSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {notionDbError && <p className="text-xs text-safety-orange mt-2">{notionDbError}</p>}
                <button
                  onClick={handleNotionDisconnect}
                  className="text-xs text-gray-500 hover:text-gray-300 mt-3 block"
                >
                  Disconnect and start over
                </button>
              </div>
            )}
          </div>
          {subscription !== 'DUST_LOGS' && (
            <p className="text-xs text-gray-500 mt-4">Integrations require Dust Logs tier ($50/mo)</p>
          )}
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
