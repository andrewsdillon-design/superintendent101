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
  const procoreParam = searchParams.get('procore')

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

  // Procore integration state
  const [procoreConnected, setProcoreConnected] = useState(false)
  const [procoreLoading, setProcoreLoading] = useState(false)
  const [procoreCompanies, setProcoreCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [procoreProjects, setProcoreProjects] = useState<any[]>([])
  const [myProjects, setMyProjects] = useState<any[]>([])
  const [projectLinks, setProjectLinks] = useState<Record<string, number>>({}) // projectId → procoreProjectId
  const [savingLinks, setSavingLinks] = useState<Record<string, boolean>>({})
  const [procoreMsg, setProcoreMsg] = useState('')
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

  // Weekly report preferences
  const [weeklyReportScheduled, setWeeklyReportScheduled] = useState(false)
  const [weeklyReportEmail, setWeeklyReportEmail] = useState('')
  const [savingWeekly, setSavingWeekly] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState(false)

  // Load Procore status + project links
  useEffect(() => {
    fetch('/api/integrations/procore')
      .then(r => r.json())
      .then(d => {
        if (d.connected) {
          setProcoreConnected(true)
          if (d.companyId) setSelectedCompanyId(d.companyId)
          // Load companies
          fetch('/api/integrations/procore/companies')
            .then(r => r.json())
            .then(d => d.companies && setProcoreCompanies(d.companies))
            .catch(() => {})
        }
      })
      .catch(() => {})
    fetch('/api/integrations/procore/link')
      .then(r => r.json())
      .then(d => {
        if (d.links) {
          const map: Record<string, number> = {}
          d.links.forEach((l: any) => { map[l.projectId] = l.procoreProjectId })
          setProjectLinks(map)
        }
      })
      .catch(() => {})
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => d.projects && setMyProjects(d.projects))
      .catch(() => {})
  }, [])

  // Load Procore projects when company changes
  useEffect(() => {
    if (!procoreConnected || !selectedCompanyId) return
    fetch(`/api/integrations/procore/projects?companyId=${selectedCompanyId}`)
      .then(r => r.json())
      .then(d => d.projects && setProcoreProjects(d.projects))
      .catch(() => {})
  }, [procoreConnected, selectedCompanyId])

  const handleProcoreConnect = async () => {
    setProcoreLoading(true)
    try {
      const res = await fetch('/api/integrations/procore/connect')
      const d = await res.json()
      if (d.url) window.location.href = d.url
    } catch { setProcoreMsg('Connection failed.') }
    finally { setProcoreLoading(false) }
  }

  const handleProcoreDisconnect = async () => {
    if (!confirm('Disconnect Procore? This will remove all project links.')) return
    await fetch('/api/integrations/procore', { method: 'DELETE' })
    setProcoreConnected(false)
    setProcoreProjects([])
    setProcoreCompanies([])
    setProjectLinks({})
    setProcoreMsg('Procore disconnected.')
  }

  const handleLinkProject = async (projectId: string, procoreProjectId: number) => {
    if (!selectedCompanyId) return
    setSavingLinks(s => ({ ...s, [projectId]: true }))
    try {
      await fetch('/api/integrations/procore/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, procoreProjectId, procoreCompanyId: selectedCompanyId }),
      })
      setProjectLinks(s => ({ ...s, [projectId]: procoreProjectId }))
      setProcoreMsg('Project linked — logs will auto-push to Procore.')
      setTimeout(() => setProcoreMsg(''), 3000)
    } catch { setProcoreMsg('Failed to link project.') }
    finally { setSavingLinks(s => ({ ...s, [projectId]: false })) }
  }

  const handleUnlinkProject = async (projectId: string) => {
    await fetch(`/api/integrations/procore/link?projectId=${projectId}`, { method: 'DELETE' })
    setProjectLinks(s => { const n = { ...s }; delete n[projectId]; return n })
  }

  // Load current model preference + SMTP settings + weekly report prefs
  useEffect(() => {
    fetch('/api/mobile/profile')
      .then(r => r.json())
      .then(d => {
        if (d.structureModel) setStructureModel(d.structureModel)
        if (d.builderType) setBuilderType(d.builderType)
        if (d.weeklyReportScheduled !== undefined) setWeeklyReportScheduled(d.weeklyReportScheduled)
        if (d.weeklyReportEmail) setWeeklyReportEmail(d.weeklyReportEmail)
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

  const handleSaveWeeklyPrefs = async () => {
    setSavingWeekly(true)
    setWeeklySaved(false)
    try {
      await fetch('/api/mobile/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyReportScheduled,
          weeklyReportEmail: weeklyReportEmail.trim() || null,
        }),
      })
      setWeeklySaved(true)
      setTimeout(() => setWeeklySaved(false), 3000)
    } catch {
      alert('Failed to save weekly report settings.')
    } finally {
      setSavingWeekly(false)
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
        {procoreParam === 'connected' && (
          <div className="mb-6 p-4 bg-safety-green/10 border border-safety-green text-safety-green text-sm rounded">
            Procore connected! Now link your projects below to start auto-pushing daily logs.
          </div>
        )}
        {procoreParam === 'error' && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500 text-red-400 text-sm rounded">
            Procore connection failed. Please try again.
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

        {/* Procore Integration */}
        <div className="card mt-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-neon-cyan">PROCORE INTEGRATION</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Auto-push daily logs to Procore when you save them.
              </p>
            </div>
            {!procoreConnected ? (
              <button
                onClick={handleProcoreConnect}
                disabled={procoreLoading}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {procoreLoading ? 'Connecting...' : 'Connect Procore'}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-safety-green font-bold">● CONNECTED</span>
                <button
                  onClick={handleProcoreDisconnect}
                  className="text-xs text-gray-500 hover:text-red-400 underline"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>

          {procoreConnected && (
            <>
              {/* Company selector */}
              {procoreCompanies.length > 1 && (
                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">PROCORE COMPANY</label>
                  <select
                    value={selectedCompanyId ?? ''}
                    onChange={e => setSelectedCompanyId(Number(e.target.value))}
                    className="bg-blueprint-paper border border-blueprint-grid rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-cyan w-full"
                  >
                    {procoreCompanies.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Project linking */}
              {myProjects.length > 0 && procoreProjects.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2">LINK YOUR PROJECTS TO PROCORE</p>
                  <div className="space-y-2">
                    {myProjects.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white min-w-[140px]">{p.title}</span>
                        <span className="text-gray-600 text-xs">→</span>
                        <select
                          value={projectLinks[p.id] ?? ''}
                          onChange={e => {
                            const val = e.target.value
                            if (val === '') handleUnlinkProject(p.id)
                            else handleLinkProject(p.id, Number(val))
                          }}
                          disabled={savingLinks[p.id]}
                          className="flex-1 bg-blueprint-paper border border-blueprint-grid rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-neon-cyan disabled:opacity-50"
                        >
                          <option value="">— Not linked —</option>
                          {procoreProjects.map((pp: any) => (
                            <option key={pp.id} value={pp.id}>{pp.name}</option>
                          ))}
                        </select>
                        {projectLinks[p.id] && (
                          <span className="text-xs text-safety-green font-bold">✓</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {procoreProjects.length === 0 && selectedCompanyId && (
                <p className="text-xs text-gray-500">No projects found in this Procore company.</p>
              )}
            </>
          )}

          {procoreMsg && (
            <p className={`text-xs font-medium ${procoreMsg.includes('fail') || procoreMsg.includes('error') ? 'text-red-400' : 'text-safety-green'}`}>
              {procoreMsg}
            </p>
          )}
        </div>

        {/* Weekly Report */}
        <div className="card mt-6 space-y-4">
          <div>
            <h3 className="font-bold text-safety-yellow mb-1">WEEKLY REPORT</h3>
            <p className="text-xs text-gray-500">
              Automatically email a GPT-generated weekly field summary every Monday morning.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Auto-Send Weekly Report</p>
              <p className="text-xs text-gray-500 mt-0.5">Emailed every Monday — covers logs from the prior week</p>
            </div>
            <button
              onClick={() => setWeeklyReportScheduled(v => !v)}
              className={`px-4 py-1.5 text-xs font-bold border transition-colors ${
                weeklyReportScheduled
                  ? 'border-safety-yellow bg-safety-yellow text-blueprint-bg'
                  : 'border-blueprint-grid text-gray-400 hover:border-gray-400'
              }`}
            >
              {weeklyReportScheduled ? 'ON' : 'OFF'}
            </button>
          </div>

          {weeklyReportScheduled && (
            <div>
              <label className="block text-xs text-gray-400 uppercase mb-1">Send To (leave blank for account email)</label>
              <input
                type="email"
                className="w-full bg-blueprint-paper/20 border border-blueprint-grid p-2 text-white text-sm focus:outline-none focus:border-safety-yellow"
                placeholder="override@email.com"
                value={weeklyReportEmail}
                onChange={e => setWeeklyReportEmail(e.target.value)}
              />
            </div>
          )}

          {weeklySaved && <p className="text-xs text-safety-green">Weekly report settings saved.</p>}

          <button
            onClick={handleSaveWeeklyPrefs}
            disabled={savingWeekly}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {savingWeekly ? 'Saving...' : 'Save Report Settings'}
          </button>
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
