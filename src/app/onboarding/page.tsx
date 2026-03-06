'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Step = 1 | 2 | 3

interface ProcoreProject {
  id: number
  name: string
  address?: string
  number?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()
  const user = session?.user as any

  const [step, setStep] = useState<Step>(1)
  const [builderType, setBuilderType] = useState<'RESIDENTIAL' | 'COMMERCIAL' | ''>('')
  const [savingType, setSavingType] = useState(false)

  // Step 2 — create project
  const [projectName, setProjectName] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [projectPermit, setProjectPermit] = useState('')
  const [savingProject, setSavingProject] = useState(false)
  const [projectError, setProjectError] = useState('')

  // Step 2 — Procore import
  const [showProcore, setShowProcore] = useState(false)
  const [procoreProjects, setProcoreProjects] = useState<ProcoreProject[]>([])
  const [loadingProcore, setLoadingProcore] = useState(false)
  const [selectedProcoreProject, setSelectedProcoreProject] = useState<ProcoreProject | null>(null)
  const [linkingProcore, setLinkingProcore] = useState(false)

  const hasProcoreToken = !!(user?.procoreAccessToken)

  // If already onboarded, skip to app
  useEffect(() => {
    if (user?.onboarded) router.replace('/daily-logs/new')
  }, [user?.onboarded, router])

  async function handleSelectBuilderType(type: 'RESIDENTIAL' | 'COMMERCIAL') {
    setBuilderType(type)
    setSavingType(true)
    await fetch('/api/mobile/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ builderType: type }),
    })
    setSavingType(false)
    setStep(2)
  }

  async function handleCreateProject() {
    if (!projectName.trim()) return
    setSavingProject(true)
    setProjectError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectName.trim(),
          address: projectAddress.trim() || undefined,
          permitNumber: projectPermit.trim() || undefined,
          status: 'ACTIVE',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProjectError(data.error ?? 'Failed to create project.')
        return
      }
      await fetch('/api/account/default-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id }),
      })
      setStep(3)
    } catch {
      setProjectError('Network error.')
    } finally {
      setSavingProject(false)
    }
  }

  async function loadProcoreProjects() {
    setLoadingProcore(true)
    try {
      const companyId = user?.procoreCompanyId
      const res = await fetch(`/api/integrations/procore/projects${companyId ? `?companyId=${companyId}` : ''}`)
      const data = await res.json()
      setProcoreProjects(data.projects ?? [])
    } catch {}
    setLoadingProcore(false)
  }

  function handleShowProcore() {
    setShowProcore(true)
    loadProcoreProjects()
  }

  async function handleImportProcore() {
    if (!selectedProcoreProject) return
    setLinkingProcore(true)
    setProjectError('')
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedProcoreProject.name,
          address: selectedProcoreProject.address || undefined,
          permitNumber: selectedProcoreProject.number || undefined,
          status: 'ACTIVE',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProjectError(data.error ?? 'Failed to create project.')
        return
      }
      await fetch('/api/integrations/procore/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: data.project.id,
          procoreProjectId: selectedProcoreProject.id,
          procoreCompanyId: user?.procoreCompanyId,
        }),
      })
      await fetch('/api/account/default-project', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id }),
      })
      setStep(3)
    } catch {
      setProjectError('Network error.')
    } finally {
      setLinkingProcore(false)
    }
  }

  async function handleFinish() {
    await fetch('/api/account/onboarded', { method: 'PATCH' })
    await updateSession()
    window.location.href = '/daily-logs/new'
  }

  return (
    <div className="min-h-screen blueprint-bg flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <p className="font-display text-3xl font-bold text-neon-cyan">ProFieldHub</p>
          <p className="text-gray-400 mt-1 text-sm">Let's get you set up</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step === n
                  ? 'bg-neon-cyan text-black'
                  : step > n
                  ? 'bg-safety-green text-black'
                  : 'bg-blueprint-grid text-gray-500'
              }`}>
                {step > n ? '✓' : n}
              </div>
              {n < 3 && <div className={`h-px w-12 transition-colors ${step > n ? 'bg-safety-green' : 'bg-blueprint-grid'}`} />}
            </div>
          ))}
        </div>

        {/* ─── Step 1: Builder Type ─── */}
        {step === 1 && (
          <div className="card">
            <h2 className="font-display text-xl font-bold text-safety-yellow mb-2">What type of work do you do?</h2>
            <p className="text-gray-400 text-sm mb-6">This customizes your daily log form and AI structuring.</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectBuilderType('RESIDENTIAL')}
                disabled={savingType}
                className={`p-6 border-2 transition-colors text-left ${
                  builderType === 'RESIDENTIAL'
                    ? 'border-neon-cyan bg-neon-cyan/10'
                    : 'border-blueprint-grid hover:border-gray-400'
                } disabled:opacity-50`}
              >
                <div className="text-3xl mb-3">🏠</div>
                <div className="font-bold text-white">Residential</div>
                <div className="text-xs text-gray-400 mt-1">Home builds, lots, subdivisions</div>
              </button>
              <button
                onClick={() => handleSelectBuilderType('COMMERCIAL')}
                disabled={savingType}
                className={`p-6 border-2 transition-colors text-left ${
                  builderType === 'COMMERCIAL'
                    ? 'border-neon-cyan bg-neon-cyan/10'
                    : 'border-blueprint-grid hover:border-gray-400'
                } disabled:opacity-50`}
              >
                <div className="text-3xl mb-3">🏗️</div>
                <div className="font-bold text-white">Commercial</div>
                <div className="text-xs text-gray-400 mt-1">Commercial, industrial, retail</div>
              </button>
            </div>
            {savingType && <p className="text-center text-gray-500 text-sm mt-4">Saving...</p>}
          </div>
        )}

        {/* ─── Step 2: Create / Import Project ─── */}
        {step === 2 && (
          <div className="card">
            <h2 className="font-display text-xl font-bold text-safety-yellow mb-2">Add your first project</h2>
            <p className="text-gray-400 text-sm mb-6">Daily logs are organized by project. You can always add more later.</p>

            {!showProcore ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Project Name *</label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={e => setProjectName(e.target.value)}
                      placeholder="e.g. Elm Street Development"
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Address (optional)</label>
                    <input
                      type="text"
                      value={projectAddress}
                      onChange={e => setProjectAddress(e.target.value)}
                      placeholder="123 Main St..."
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Permit # (optional)</label>
                    <input
                      type="text"
                      value={projectPermit}
                      onChange={e => setProjectPermit(e.target.value)}
                      placeholder="Optional..."
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan text-sm"
                    />
                  </div>
                  {projectError && <p className="text-red-400 text-sm">{projectError}</p>}
                  <button
                    onClick={handleCreateProject}
                    disabled={savingProject || !projectName.trim()}
                    className="btn-primary w-full disabled:opacity-50"
                  >
                    {savingProject ? 'Creating...' : 'Create Project →'}
                  </button>
                </div>

                {hasProcoreToken && (
                  <div className="mt-4 pt-4 border-t border-blueprint-grid">
                    <button
                      onClick={handleShowProcore}
                      className="btn-secondary text-sm w-full"
                    >
                      Import from Procore instead
                    </button>
                  </div>
                )}

                <div className="mt-4 text-center">
                  <button
                    onClick={() => setStep(3)}
                    className="text-xs text-gray-600 hover:text-gray-400"
                  >
                    Skip for now
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <button onClick={() => setShowProcore(false)} className="text-xs text-gray-500 hover:text-white">
                    ← Back to create form
                  </button>
                </div>
                {loadingProcore ? (
                  <p className="text-gray-400 text-sm text-center py-8">Loading Procore projects...</p>
                ) : procoreProjects.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">No Procore projects found.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {procoreProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedProcoreProject(p)}
                        className={`w-full text-left p-3 border transition-colors ${
                          selectedProcoreProject?.id === p.id
                            ? 'border-neon-cyan bg-neon-cyan/10'
                            : 'border-blueprint-grid hover:border-gray-400'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{p.name}</p>
                        {p.address && <p className="text-xs text-gray-400">{p.address}</p>}
                      </button>
                    ))}
                  </div>
                )}
                {projectError && <p className="text-red-400 text-sm mb-3">{projectError}</p>}
                <button
                  onClick={handleImportProcore}
                  disabled={!selectedProcoreProject || linkingProcore}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {linkingProcore ? 'Importing...' : 'Import Selected Project →'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── Step 3: Done ─── */}
        {step === 3 && (
          <div className="card text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="font-display text-2xl font-bold text-safety-green mb-3">You're all set!</h2>
            <p className="text-gray-400 text-sm mb-8">
              Your account is ready. Start logging your first day on the job.
            </p>
            <button
              onClick={handleFinish}
              className="btn-primary w-full py-3 text-base"
            >
              Log My First Day →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
