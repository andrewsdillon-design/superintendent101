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

  const [builderType, setBuilderType] = useState<string | null>(null)
  const [savingBuilderType, setSavingBuilderType] = useState(false)
  const [managingBilling, setManagingBilling] = useState(false)
  const [exportingData, setExportingData] = useState(false)
  const [structureModel, setStructureModel] = useState('gpt-4o')
  const [savingModel, setSavingModel] = useState(false)
  const [modelSaved, setModelSaved] = useState(false)
  const [smtp, setSmtp] = useState({
    emailFromName: '', emailFromAddr: '', emailSmtpHost: '',
    emailSmtpPort: '587', emailSmtpSecure: true, emailSmtpUser: '', emailSmtpPass: '',
  })
  const [smtpHasPassword, setSmtpHasPassword] = useState(false)
  const [savingSmtp, setSavingSmtp] = useState(false)
  const [smtpSaved, setSmtpSaved] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpError, setSmtpError] = useState('')
  const [smtpTestResult, setSmtpTestResult] = useState('')

  // Load current model preference + SMTP settings
  useEffect(() => {
    fetch('/api/mobile/profile')
      .then(r => r.json())
      .then(d => {
        if (d.structureModel) setStructureModel(d.structureModel)
        if (d.builderType) setBuilderType(d.builderType)
      })
      .catch(() => {})
    fetch('/api/email-settings')
      .then(r => r.json())
      .then(d => {
        setSmtp({
          emailFromName: d.emailFromName ?? '',
          emailFromAddr: d.emailFromAddr ?? '',
          emailSmtpHost: d.emailSmtpHost ?? '',
          emailSmtpPort: String(d.emailSmtpPort ?? 587),
          emailSmtpSecure: d.emailSmtpSecure ?? true,
          emailSmtpUser: d.emailSmtpUser ?? '',
          emailSmtpPass: '',
        })
        setSmtpHasPassword(d.hasPassword ?? false)
      })
      .catch(() => {})
  }, [])

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

  const handleSaveSmtp = async () => {
    setSavingSmtp(true)
    setSmtpError('')
    setSmtpSaved(false)
    try {
      const res = await fetch('/api/email-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...smtp, emailSmtpPort: Number(smtp.emailSmtpPort) }),
      })
      const d = await res.json()
      if (!res.ok) { setSmtpError(d.error ?? 'Save failed.'); return }
      if (smtp.emailSmtpPass) setSmtpHasPassword(true)
      setSmtp(s => ({ ...s, emailSmtpPass: '' }))
      setSmtpSaved(true)
      setTimeout(() => setSmtpSaved(false), 3000)
    } catch { setSmtpError('Network error.') }
    finally { setSavingSmtp(false) }
  }

  const handleTestSmtp = async () => {
    if (!smtp.emailSmtpHost || !smtp.emailSmtpUser || (!smtp.emailSmtpPass && !smtpHasPassword) || !smtp.emailFromAddr) {
      setSmtpError('Fill in all SMTP fields (including password) before testing.')
      return
    }
    setTestingSmtp(true)
    setSmtpError('')
    setSmtpTestResult('')
    try {
      const res = await fetch('/api/email-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtp.emailSmtpHost,
          port: Number(smtp.emailSmtpPort),
          secure: smtp.emailSmtpSecure,
          user: smtp.emailSmtpUser,
          pass: smtp.emailSmtpPass,
          fromName: smtp.emailFromName,
          fromEmail: smtp.emailFromAddr,
          toEmail: smtp.emailFromAddr,
        }),
      })
      const d = await res.json()
      if (!res.ok) setSmtpError(d.error ?? 'Test failed.')
      else setSmtpTestResult('Test email sent! Check your inbox.')
    } catch { setSmtpError('Network error.') }
    finally { setTestingSmtp(false) }
  }

  const handleSetBuilderType = async (type: 'RESIDENTIAL' | 'COMMERCIAL') => {
    if (savingBuilderType || builderType === type) return
    setSavingBuilderType(true)
    try {
      await fetch('/api/mobile/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builderType: type }),
      })
      setBuilderType(type)
    } catch {
      alert('Failed to save builder type.')
    } finally {
      setSavingBuilderType(false)
    }
  }

  const handleSaveModel = async (model: string) => {
    setSavingModel(true)
    setModelSaved(false)
    try {
      await fetch('/api/mobile/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structureModel: model }),
      })
      setStructureModel(model)
      setModelSaved(true)
      setTimeout(() => setModelSaved(false), 3000)
    } catch {
      alert('Failed to save model preference.')
    } finally {
      setSavingModel(false)
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
            {user?.companyRole === 'OWNER' && (
              <Link href="/company" className="text-sm text-neon-cyan font-semibold hover:underline">My Company</Link>
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

        {/* Builder Type */}
        <div className="card mt-6">
          <h3 className="font-bold text-safety-orange mb-1">BUILDER TYPE</h3>
          <p className="text-xs text-gray-500 mb-4">Controls your daily log form layout — residential shows lot number, plan set, elevation; commercial shows RFIs prominently.</p>
          <div className="flex gap-3">
            {(['RESIDENTIAL', 'COMMERCIAL'] as const).map(type => (
              <button
                key={type}
                onClick={() => handleSetBuilderType(type)}
                disabled={savingBuilderType}
                className={`flex-1 py-3 text-sm font-bold border transition-colors disabled:opacity-50 ${
                  builderType === type
                    ? 'border-safety-orange bg-safety-orange text-blueprint-bg'
                    : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
                }`}
              >
                {type === 'RESIDENTIAL' ? 'Residential' : 'Commercial'}
              </button>
            ))}
          </div>
          {!builderType && (
            <p className="text-xs text-gray-600 mt-2">Not set — select your builder type to customize your log form.</p>
          )}
        </div>

        {/* AI Model Settings */}
        <div className="card mt-6">
          <h3 className="font-bold text-neon-cyan mb-1">AI STRUCTURING MODEL</h3>
          <p className="text-xs text-gray-500 mb-4">Choose which AI model structures your voice transcripts into field reports.</p>
          <div className="space-y-3">
            {[
              { id: 'gpt-4o', label: 'GPT-4o', desc: 'OpenAI · $2.50/1M in · $10.00/1M out · Excellent accuracy' },
              { id: 'grok-4.1-reasoning', label: 'xAI Grok-4.1 Reasoning', desc: 'xAI · Reasoning model · Advanced multi-step logic' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSaveModel(opt.id)}
                disabled={savingModel}
                className={`w-full text-left p-3 border rounded transition-colors disabled:opacity-50 ${
                  structureModel === opt.id
                    ? 'border-neon-cyan bg-neon-cyan/10'
                    : 'border-blueprint-grid hover:border-gray-500'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-semibold ${structureModel === opt.id ? 'text-neon-cyan' : 'text-white'}`}>
                    {opt.label}
                  </span>
                  {structureModel === opt.id && (
                    <span className="text-xs text-neon-cyan font-bold">ACTIVE</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          {modelSaved && <p className="text-xs text-safety-green mt-3">Model preference saved.</p>}
        </div>

        {/* Email / SMTP Settings */}
        <div className="card mt-6 space-y-4">
          <div>
            <h3 className="font-bold text-safety-yellow mb-1">EMAIL SETTINGS</h3>
            <p className="text-xs text-gray-500">
              Set up your own SMTP to send reports directly from your email address (Gmail, Office 365, any provider).
              Leave blank to send via ProFieldHub (Reply-To will be set to your account email).
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { key: 'emailFromName', label: 'From Name', placeholder: 'John Smith', type: 'text' },
              { key: 'emailFromAddr', label: 'From Email', placeholder: 'john@company.com', type: 'email' },
              { key: 'emailSmtpHost', label: 'SMTP Host', placeholder: 'smtp.gmail.com', type: 'text' },
              { key: 'emailSmtpPort', label: 'SMTP Port', placeholder: '587', type: 'number' },
              { key: 'emailSmtpUser', label: 'SMTP Username', placeholder: 'john@company.com', type: 'email' },
              { key: 'emailSmtpPass', label: smtpHasPassword ? 'App Password (leave blank to keep)' : 'App Password', placeholder: '••••••••••••', type: 'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs text-gray-400 font-semibold block mb-1">{label.toUpperCase()}</label>
                <input
                  type={type}
                  value={(smtp as any)[key]}
                  onChange={e => setSmtp(s => ({ ...s, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-blueprint-paper border border-blueprint-grid rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-safety-yellow"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="smtpSecure"
              checked={smtp.emailSmtpSecure}
              onChange={e => setSmtp(s => ({ ...s, emailSmtpSecure: e.target.checked }))}
              className="accent-safety-yellow"
            />
            <label htmlFor="smtpSecure" className="text-xs text-gray-400">Use TLS/SSL (port 465) — uncheck for STARTTLS (port 587)</label>
          </div>

          {smtpError && <p className="text-xs text-red-400">{smtpError}</p>}
          {smtpSaved && <p className="text-xs text-safety-green">SMTP settings saved.</p>}
          {smtpTestResult && <p className="text-xs text-safety-green">{smtpTestResult}</p>}

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleSaveSmtp}
              disabled={savingSmtp}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {savingSmtp ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleTestSmtp}
              disabled={testingSmtp}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {testingSmtp ? 'Sending test...' : 'Send Test Email'}
            </button>
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
