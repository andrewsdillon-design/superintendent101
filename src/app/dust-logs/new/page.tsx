'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'pick-job' | 'form' | 'recording' | 'transcribing' | 'structuring' | 'review' | 'submitting'

interface JobSite {
  id: string
  name: string
  address: string | null
  permitNumber: string | null
  webPortalId: string | null
  portalType: string | null
  jobType: string | null
  notes: string | null
}

interface Structured {
  summary: string
  workCompleted: string[]
  issues: string[]
  safety: string[]
  nextSteps: string[]
  tags: string[]
  jobType: string
  structuredLog: string
}

const ACCEPTED_TYPES = ['mp3','mp4','m4a','wav','webm','ogg','flac','mpeg','mpga']
const ACCEPTED_MIME = [
  'audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/x-m4a',
  'audio/wav','audio/wave','audio/webm','audio/ogg','audio/flac',
  'video/mp4','video/webm','video/mpeg','video/quicktime',
]
const MAX_MB = 25

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function NewDailyLogPage() {
  const router = useRouter()

  // ── Access check ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/dust-logs')
      .then(r => r.json())
      .then(d => {
        if (d.hasAccess === false) router.replace('/upgrade')
      })
      .catch(() => {})
  }, [router])

  // ── Job site picker state ──────────────────────────────────────────────
  const [jobSites, setJobSites] = useState<JobSite[]>([])
  const [loadingJobSites, setLoadingJobSites] = useState(true)
  const [selectedJobSite, setSelectedJobSite] = useState<JobSite | null>(null)
  const [showNewJobForm, setShowNewJobForm] = useState(false)
  const [newJobName, setNewJobName] = useState('')
  const [newJobAddress, setNewJobAddress] = useState('')
  const [newJobPermit, setNewJobPermit] = useState('')
  const [newJobPortalId, setNewJobPortalId] = useState('')
  const [newJobPortalType, setNewJobPortalType] = useState('')
  const [newJobType, setNewJobType] = useState('')
  const [savingJobSite, setSavingJobSite] = useState(false)

  // ── Log fields (populated from selected job site) ──────────────────────
  const [projectName, setProjectName] = useState('')
  const [address, setAddress] = useState('')
  const [manualNotes, setManualNotes] = useState('')

  // ── Recording / processing state ──────────────────────────────────────
  const [step, setStep] = useState<Step>('pick-job')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [structured, setStructured] = useState<Structured | null>(null)
  const [error, setError] = useState('')
  const [syncResults, setSyncResults] = useState<Record<string, string> | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/job-sites')
      .then(r => r.json())
      .then(d => {
        setJobSites(d.jobSites || [])
        setLoadingJobSites(false)
      })
      .catch(() => setLoadingJobSites(false))
  }, [])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Job site selection ─────────────────────────────────────────────────
  function selectJobSite(site: JobSite) {
    setSelectedJobSite(site)
    setProjectName(site.name)
    setAddress(site.address || '')
    setShowNewJobForm(false)
    setError('')
    setStep('form')
  }

  async function saveNewJobSite() {
    if (!newJobName.trim()) { setError('Job site name required'); return }
    setSavingJobSite(true)
    setError('')

    const res = await fetch('/api/job-sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newJobName,
        address: newJobAddress,
        permitNumber: newJobPermit,
        webPortalId: newJobPortalId,
        portalType: newJobPortalType,
        jobType: newJobType,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Failed to save job site')
      setSavingJobSite(false)
      return
    }

    const newSite = data.jobSite
    setJobSites(prev => [newSite, ...prev])
    setSavingJobSite(false)
    selectJobSite(newSite)
  }

  // ── File validation ────────────────────────────────────────────────────
  function validateFile(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const mimeOk = ACCEPTED_MIME.includes(file.type)
    const extOk = ACCEPTED_TYPES.includes(ext)
    if (!mimeOk && !extOk) {
      return `Unsupported file type (.${ext}). Accepted: ${ACCEPTED_TYPES.join(', ')}`
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      return `File too large (${formatBytes(file.size)}). Whisper limit is ${MAX_MB}MB.`
    }
    if (file.size === 0) return 'File is empty'
    return null
  }

  function handleFileSelected(file: File) {
    setError('')
    const err = validateFile(file)
    if (err) { setError(err); return }
    setDroppedFile(file)
  }

  // ── Drag and drop ──────────────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setDragging(false)
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelected(file)
  }, [])

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    e.target.value = ''
  }

  // ── Transcription ──────────────────────────────────────────────────────
  async function transcribeBlob(blob: Blob, filename: string) {
    setStep('transcribing')
    setError('')
    const fd = new FormData()
    fd.append('audio', blob, filename)

    const res = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Transcription failed')
      setStep('form')
      return
    }
    setTranscript(data.transcript)
    setStep('structuring')
    await structureTranscript(data.transcript)
  }

  async function transcribeDroppedFile() {
    if (!droppedFile) return
    setAudioBlob(null)
    await transcribeBlob(droppedFile, droppedFile.name)
  }

  // ── Voice recording ────────────────────────────────────────────────────
  async function startRecording() {
    setError('')
    setDroppedFile(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingSeconds(0)
      setStep('recording')
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      setError('Microphone access denied. Allow microphone permission and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => {
    if (audioBlob && step === 'recording') {
      transcribeBlob(audioBlob, 'field-log.webm')
    }
  }, [audioBlob])

  // ── GPT-4o structuring ─────────────────────────────────────────────────
  async function structureTranscript(rawTranscript: string) {
    const res = await fetch('/api/dust-logs/structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: rawTranscript,
        projectName,
        address,
        permitNumber: selectedJobSite?.permitNumber || '',
        date: new Date().toISOString().split('T')[0],
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'AI structuring failed')
      setStep('form')
      return
    }
    setStructured(data.structured)
    setStep('review')
  }

  async function useManualNotes() {
    if (!manualNotes.trim()) { setError('Add some notes first'); return }
    setTranscript(manualNotes)
    setStep('structuring')
    await structureTranscript(manualNotes)
  }

  // ── Submit ─────────────────────────────────────────────────────────────
  async function submitLog() {
    setStep('submitting')
    setError('')

    const res = await fetch('/api/dust-logs/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName,
        address,
        date: new Date().toISOString().split('T')[0],
        duration: Math.round(recordingSeconds / 60) || null,
        structured,
        tags: structured?.tags || [],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Submit failed')
      setStep('review')
      return
    }

    setSyncResults(data.results)
    setTimeout(() => router.push('/dust-logs'), 3000)
  }

  function reset() {
    setStep('pick-job')
    setSelectedJobSite(null)
    setProjectName('')
    setAddress('')
    setManualNotes('')
    setStructured(null)
    setTranscript('')
    setAudioBlob(null)
    setDroppedFile(null)
    setRecordingSeconds(0)
    setError('')
    setSyncResults(null)
  }

  // ── Structured log editing helpers ────────────────────────────────────
  type ArrayField = 'safety' | 'workCompleted' | 'issues' | 'nextSteps' | 'tags'

  function updateStructuredField(field: keyof Structured, value: string) {
    setStructured(prev => prev ? { ...prev, [field]: value } : null)
  }

  function updateStructuredItem(field: ArrayField, index: number, value: string) {
    setStructured(prev => {
      if (!prev) return null
      const arr = [...prev[field]]
      arr[index] = value
      return { ...prev, [field]: arr }
    })
  }

  function removeStructuredItem(field: ArrayField, index: number) {
    setStructured(prev => {
      if (!prev) return null
      return { ...prev, [field]: prev[field].filter((_, i) => i !== index) }
    })
  }

  function addStructuredItem(field: ArrayField) {
    setStructured(prev => {
      if (!prev) return null
      return { ...prev, [field]: [...prev[field], ''] }
    })
  }

  const VISIBLE_STEPS: Step[] = ['form', 'recording', 'transcribing', 'structuring', 'review', 'submitting']
  const STEP_LABELS: Record<Step, string> = {
    'pick-job': 'pick job',
    form: 'record',
    recording: 'recording',
    transcribing: 'transcribing',
    structuring: 'structuring',
    review: 'review',
    submitting: 'saving',
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">ProFieldHub</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/dust-logs" className="text-white">Daily Logs</Link>
            </nav>
          </div>
          <Link href="/dust-logs" className="text-sm text-gray-400 hover:text-white">← Back</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-safety-green mb-1">NEW DAILY LOG</h1>
        <p className="text-gray-400 text-sm mb-6">
          {step === 'pick-job' ? 'Pick a job site — or create one. Info auto-fills every time.' : 'Record, drop a file, or type. AI structures and syncs to Notion.'}
        </p>

        {/* Step bar — hidden on pick-job step */}
        {step !== 'pick-job' && (
          <div className="flex gap-1 mb-6 text-xs overflow-x-auto">
            {VISIBLE_STEPS.map((s, i) => (
              <span
                key={s}
                className={`px-2 py-1 whitespace-nowrap ${
                  step === s
                    ? 'text-neon-cyan border border-neon-cyan'
                    : VISIBLE_STEPS.indexOf(step) > i
                    ? 'text-gray-600 line-through'
                    : 'text-gray-600'
                }`}
              >
                {i + 1}. {STEP_LABELS[s]}
              </span>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">{error}</div>
        )}

        {/* ── PICK JOB ──────────────────────────────────────── */}
        {step === 'pick-job' && (
          <div className="space-y-4">

            {/* New Job Site button / inline form */}
            {!showNewJobForm ? (
              <button
                onClick={() => { setShowNewJobForm(true); setError('') }}
                className="w-full card border-2 border-dashed border-neon-cyan/40 hover:border-neon-cyan text-left p-4 transition-colors"
              >
                <p className="font-bold text-neon-cyan">+ New Job Site</p>
                <p className="text-xs text-gray-500 mt-1">Enter address and permit info once — auto-filled every day</p>
              </button>
            ) : (
              <div className="card border border-neon-cyan/40 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-neon-cyan text-sm uppercase">New Job Site</p>
                  <button
                    onClick={() => { setShowNewJobForm(false); setError('') }}
                    className="text-xs text-gray-500 hover:text-white"
                  >
                    ✕ Cancel
                  </button>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase">Job Name *</label>
                  <input
                    type="text"
                    value={newJobName}
                    onChange={e => setNewJobName(e.target.value)}
                    className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan text-sm"
                    placeholder="43rd Avenue 7-Eleven"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase">Site Address</label>
                  <input
                    type="text"
                    value={newJobAddress}
                    onChange={e => setNewJobAddress(e.target.value)}
                    className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan text-sm"
                    placeholder="4301 W Bell Rd, Phoenix, AZ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 uppercase">Permit #</label>
                    <input
                      type="text"
                      value={newJobPermit}
                      onChange={e => setNewJobPermit(e.target.value)}
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="701"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase">Portal / Web ID</label>
                    <input
                      type="text"
                      value={newJobPortalId}
                      onChange={e => setNewJobPortalId(e.target.value)}
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="PHX-2024-00701"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 uppercase">City Portal</label>
                    <input
                      type="text"
                      value={newJobPortalType}
                      onChange={e => setNewJobPortalType(e.target.value)}
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan text-sm"
                      placeholder="City of Phoenix"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase">Job Type</label>
                    <select
                      value={newJobType}
                      onChange={e => setNewJobType(e.target.value)}
                      className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan text-sm"
                    >
                      <option value="">Select...</option>
                      <option value="retail">Retail</option>
                      <option value="industrial">Industrial</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="multi-family">Multi-Family</option>
                      <option value="residential">Residential</option>
                      <option value="office">Office</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={saveNewJobSite}
                  disabled={savingJobSite || !newJobName.trim()}
                  className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingJobSite ? 'Saving...' : 'Save & Start Log →'}
                </button>
              </div>
            )}

            {/* Existing job sites list */}
            {loadingJobSites ? (
              <div className="card text-center text-gray-400 py-6 text-sm">Loading job sites...</div>
            ) : jobSites.length === 0 ? (
              !showNewJobForm && (
                <div className="card text-center py-6 text-gray-500 text-sm">
                  No job sites yet. Create one above to get started.
                </div>
              )
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Existing Job Sites</p>
                {jobSites.map(site => (
                  <button
                    key={site.id}
                    onClick={() => selectJobSite(site)}
                    className="w-full card text-left hover:border-safety-green/60 hover:bg-safety-green/5 transition-colors border border-blueprint-grid"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-white">{site.name}</p>
                        {site.address && (
                          <p className="text-xs text-gray-400 mt-0.5">{site.address}</p>
                        )}
                        <div className="flex gap-3 mt-1 flex-wrap">
                          {site.permitNumber && (
                            <span className="text-xs text-gray-500">Permit: {site.permitNumber}</span>
                          )}
                          {site.portalType && (
                            <span className="text-xs text-gray-500">{site.portalType}</span>
                          )}
                          {site.jobType && (
                            <span className="text-xs text-safety-orange border border-safety-orange/40 px-1">{site.jobType}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-neon-cyan text-sm ml-4 flex-shrink-0">→</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SELECTED JOB HEADER (visible during log steps) ── */}
        {step !== 'pick-job' && step !== 'submitting' && selectedJobSite && (
          <div className="card mb-4 border border-safety-green/30 bg-safety-green/5">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-safety-green text-sm">{selectedJobSite.name}</p>
                {selectedJobSite.address && (
                  <p className="text-xs text-gray-400">{selectedJobSite.address}</p>
                )}
                <div className="flex gap-3 mt-1 flex-wrap">
                  {selectedJobSite.permitNumber && (
                    <span className="text-xs text-gray-500">Permit: {selectedJobSite.permitNumber}</span>
                  )}
                  {selectedJobSite.portalType && (
                    <span className="text-xs text-gray-500">{selectedJobSite.portalType}</span>
                  )}
                  {selectedJobSite.webPortalId && (
                    <span className="text-xs text-gray-500">ID: {selectedJobSite.webPortalId}</span>
                  )}
                </div>
              </div>
              <button
                onClick={reset}
                className="text-xs text-gray-500 hover:text-white ml-4 flex-shrink-0"
              >
                Change
              </button>
            </div>
          </div>
        )}

        {/* ── FORM + INPUT METHODS ──────────────────────────── */}
        {(step === 'form' || step === 'recording') && (
          <div className="space-y-4">

            {/* Option 1: Voice */}
            <div className="card border-2 border-safety-green/40">
              <h3 className="font-bold text-safety-green mb-3 text-sm uppercase">Option 1 — Record Voice</h3>
              {step === 'recording' ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-mono text-2xl text-white">{formatTime(recordingSeconds)}</span>
                  </div>
                  <p className="text-xs text-gray-400">Recording — speak clearly about what you observed today</p>
                  <button onClick={stopRecording} className="btn-primary w-full">
                    ■ Stop &amp; Transcribe
                  </button>
                </div>
              ) : (
                <button onClick={startRecording} className="btn-primary w-full">
                  ● Start Recording
                </button>
              )}
            </div>

            {/* Option 2: Drop file */}
            {step !== 'recording' && (
              <div className="card border-2 border-safety-blue/40">
                <h3 className="font-bold text-safety-blue mb-3 text-sm uppercase">Option 2 — Upload a File</h3>
                <p className="text-xs text-gray-500 mb-3">
                  mp3 · mp4 · m4a · wav · webm · ogg · flac · mpeg &nbsp;·&nbsp; max 25MB
                </p>

                {/* Hidden input — wired via label, NOT programmatic .click() */}
                <input
                  id="file-upload-input"
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.map(e => `.${e}`).join(',')}
                  onChange={onFileInput}
                  className="hidden"
                />

                {droppedFile ? (
                  <div className="border border-safety-green bg-safety-green/5 rounded p-4 text-center">
                    <p className="text-safety-green font-bold">✓ {droppedFile.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatBytes(droppedFile.size)}</p>
                    <button
                      onClick={() => { setDroppedFile(null); setError('') }}
                      className="text-xs text-gray-500 hover:text-red-400 mt-2 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Drag zone — desktop only, no click handler */}
                    <div
                      ref={dropZoneRef}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      className={`hidden md:flex border-2 border-dashed rounded p-6 text-center items-center justify-center transition-colors ${
                        dragging
                          ? 'border-neon-cyan bg-neon-cyan/5 text-neon-cyan'
                          : 'border-blueprint-grid text-gray-500'
                      }`}
                    >
                      {dragging ? (
                        <p className="font-bold">Drop it!</p>
                      ) : (
                        <p className="text-sm">Drag &amp; drop audio file here</p>
                      )}
                    </div>

                    {/* Native file picker — works on all devices including mobile */}
                    <label
                      htmlFor="file-upload-input"
                      className="flex items-center justify-center gap-2 w-full border border-safety-blue text-safety-blue text-sm py-3 cursor-pointer hover:bg-safety-blue/10 transition-colors"
                    >
                      <span>↑</span>
                      <span>Browse Files</span>
                    </label>
                  </div>
                )}

                {droppedFile && (
                  <button
                    onClick={transcribeDroppedFile}
                    className="btn-primary w-full mt-3"
                  >
                    Transcribe with Whisper →
                  </button>
                )}
              </div>
            )}

            {/* Option 3: Type notes */}
            {step !== 'recording' && (
              <div className="card border-2 border-gray-700">
                <h3 className="font-bold text-gray-400 mb-3 text-sm uppercase">Option 3 — Type Field Notes</h3>
                <textarea
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan resize-none text-sm"
                  placeholder="Walked the slab this morning. Found rebar spacing off near grid B-4. Got fixed before pour..."
                />
                <button
                  onClick={useManualNotes}
                  disabled={!manualNotes.trim()}
                  className="btn-secondary w-full mt-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Structure with AI →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PROCESSING ──────────────────────────────────────── */}
        {(step === 'transcribing' || step === 'structuring') && (
          <div className="card text-center py-12">
            <div className="font-mono text-neon-cyan text-lg mb-2 animate-pulse">
              {step === 'transcribing' ? '⟳ Transcribing...' : '⟳ Structuring with Field AI...'}
            </div>
            <p className="text-xs text-gray-500">
              {step === 'transcribing'
                ? 'OpenAI Whisper processing your audio'
                : 'GPT-4o applying Field AI Operating Rules'}
            </p>
            {transcript && step === 'structuring' && (
              <div className="mt-6 text-left bg-blueprint-paper/20 p-3 border border-blueprint-grid text-xs text-gray-400 max-h-32 overflow-auto">
                <p className="text-gray-500 mb-1 font-bold">Raw transcript:</p>
                {transcript}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEW (editable) ───────────────────────────────── */}
        {step === 'review' && structured && (
          <div className="space-y-4">

            {/* Summary */}
            <div className="card">
              <h3 className="font-bold text-safety-yellow mb-1">AI STRUCTURED LOG</h3>
              <p className="text-xs text-gray-500 mb-3">Edit anything before saving — changes go directly to Notion.</p>
              <label className="text-xs text-gray-400 uppercase">Summary</label>
              <textarea
                value={structured.summary}
                onChange={e => updateStructuredField('summary', e.target.value)}
                rows={3}
                className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-sm text-gray-300 mt-1 focus:outline-none focus:border-neon-cyan resize-none"
              />
            </div>

            {/* Safety */}
            <div className="card border border-red-500/20">
              <p className="text-xs font-bold text-red-400 uppercase mb-2">⚠ Safety</p>
              <div className="space-y-2">
                {structured.safety.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-red-400 flex-shrink-0">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => updateStructuredItem('safety', i, e.target.value)}
                      className="flex-1 bg-blueprint-bg border border-blueprint-grid p-1.5 text-sm text-gray-300 focus:outline-none focus:border-red-400"
                    />
                    <button onClick={() => removeStructuredItem('safety', i)} className="text-gray-600 hover:text-red-400 flex-shrink-0 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addStructuredItem('safety')} className="text-xs text-red-400/60 hover:text-red-400 mt-2">+ Add safety item</button>
            </div>

            {/* Work Completed */}
            <div className="card border border-safety-green/20">
              <p className="text-xs font-bold text-safety-green uppercase mb-2">✓ Work Completed</p>
              <div className="space-y-2">
                {structured.workCompleted.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-safety-green flex-shrink-0">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => updateStructuredItem('workCompleted', i, e.target.value)}
                      className="flex-1 bg-blueprint-bg border border-blueprint-grid p-1.5 text-sm text-gray-300 focus:outline-none focus:border-safety-green"
                    />
                    <button onClick={() => removeStructuredItem('workCompleted', i)} className="text-gray-600 hover:text-red-400 flex-shrink-0 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addStructuredItem('workCompleted')} className="text-xs text-safety-green/60 hover:text-safety-green mt-2">+ Add item</button>
            </div>

            {/* Issues / RFIs */}
            <div className="card border border-safety-orange/20">
              <p className="text-xs font-bold text-safety-orange uppercase mb-2">⚡ Issues / RFIs</p>
              <div className="space-y-2">
                {structured.issues.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-safety-orange flex-shrink-0">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => updateStructuredItem('issues', i, e.target.value)}
                      className="flex-1 bg-blueprint-bg border border-blueprint-grid p-1.5 text-sm text-gray-300 focus:outline-none focus:border-safety-orange"
                    />
                    <button onClick={() => removeStructuredItem('issues', i)} className="text-gray-600 hover:text-red-400 flex-shrink-0 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addStructuredItem('issues')} className="text-xs text-safety-orange/60 hover:text-safety-orange mt-2">+ Add issue</button>
            </div>

            {/* Next Steps */}
            <div className="card border border-safety-blue/20">
              <p className="text-xs font-bold text-safety-blue uppercase mb-2">→ Next Steps</p>
              <div className="space-y-2">
                {structured.nextSteps.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-safety-blue flex-shrink-0">•</span>
                    <input
                      type="text"
                      value={item}
                      onChange={e => updateStructuredItem('nextSteps', i, e.target.value)}
                      className="flex-1 bg-blueprint-bg border border-blueprint-grid p-1.5 text-sm text-gray-300 focus:outline-none focus:border-safety-blue"
                    />
                    <button onClick={() => removeStructuredItem('nextSteps', i)} className="text-gray-600 hover:text-red-400 flex-shrink-0 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => addStructuredItem('nextSteps')} className="text-xs text-safety-blue/60 hover:text-safety-blue mt-2">+ Add step</button>
            </div>

            {/* Tags + Job Type */}
            <div className="card">
              <div className="flex gap-6 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Tags</p>
                  <div className="space-y-2">
                    {structured.tags.map((tag, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={tag}
                          onChange={e => updateStructuredItem('tags', i, e.target.value)}
                          className="flex-1 bg-blueprint-bg border border-blueprint-grid p-1.5 text-xs text-gray-300 focus:outline-none focus:border-neon-cyan"
                        />
                        <button onClick={() => removeStructuredItem('tags', i)} className="text-gray-600 hover:text-red-400 text-xs px-1">✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => addStructuredItem('tags')} className="text-xs text-gray-500 hover:text-white mt-2">+ Add tag</button>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Job Type</p>
                  <select
                    value={structured.jobType}
                    onChange={e => updateStructuredField('jobType', e.target.value)}
                    className="bg-blueprint-bg border border-safety-orange/40 text-safety-orange text-xs px-2 py-1.5 focus:outline-none focus:border-safety-orange"
                  >
                    <option value="retail">retail</option>
                    <option value="industrial">industrial</option>
                    <option value="healthcare">healthcare</option>
                    <option value="multi-family">multi-family</option>
                    <option value="residential">residential</option>
                    <option value="office">office</option>
                    <option value="other">other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Raw transcript (collapsible) */}
            {transcript && (
              <div className="border border-blueprint-grid">
                <button
                  onClick={() => setShowTranscript(v => !v)}
                  className="w-full flex justify-between items-center px-3 py-2 text-xs text-gray-500 hover:text-gray-300"
                >
                  <span>Raw transcript</span>
                  <span>{showTranscript ? '▲ hide' : '▼ show'}</span>
                </button>
                {showTranscript && (
                  <div className="px-3 pb-3 text-xs text-gray-400 max-h-40 overflow-auto">
                    {transcript}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={submitLog} className="btn-primary flex-1">
                Save &amp; Sync to Workspace
              </button>
              <button onClick={reset} className="btn-secondary text-sm px-4">
                Start Over
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              Audio &amp; transcript are NOT stored — only the edited log saves to Notion.
            </p>
          </div>
        )}

        {/* ── DONE ────────────────────────────────────────────── */}
        {step === 'submitting' && (
          <div className="card text-center py-12">
            {syncResults ? (
              <div>
                <p className="text-safety-green font-bold text-lg mb-6">✓ Log Saved</p>
                <div className="space-y-2 text-sm max-w-xs mx-auto">
                  {Object.entries(syncResults).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="capitalize text-gray-400">
                        {k === 'google' ? 'Google Drive / NotebookLM' : 'Notion'}
                      </span>
                      <span className={
                        v === 'synced' ? 'text-safety-green' :
                        v === 'not connected' ? 'text-gray-500' :
                        'text-safety-orange'
                      }>
                        {v === 'synced' ? '✓ Synced' : v === 'not connected' ? '— Not connected' : `⚠ ${v}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-6">Redirecting to logs...</p>
              </div>
            ) : (
              <p className="text-neon-cyan animate-pulse font-mono">⟳ Saving...</p>
            )}
          </div>
        )}

        {/* Field AI reminder */}
        {step === 'form' && (
          <div className="mt-6 p-3 border border-neon-green/20 text-xs text-gray-500 space-y-1">
            <p className="font-bold text-safety-orange uppercase">Field AI Rules — Active</p>
            <p>• Context is king — document what you observed, not assumed</p>
            <p>• Safety flagged first, always</p>
            <p>• Plain field language — no corporate fluff</p>
            <p>• Audio &amp; transcript discarded after structuring — zero storage</p>
          </div>
        )}
      </main>
    </div>
  )
}
