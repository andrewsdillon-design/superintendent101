'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'form' | 'recording' | 'transcribing' | 'structuring' | 'review' | 'submitting'

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

  const [projectName, setProjectName] = useState('')
  const [address, setAddress] = useState('')
  const [manualNotes, setManualNotes] = useState('')

  const [step, setStep] = useState<Step>('form')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [structured, setStructured] = useState<Structured | null>(null)
  const [error, setError] = useState('')
  const [syncResults, setSyncResults] = useState<Record<string, string> | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── File validation ──────────────────────────────────────────────────
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

  // ── Drag and drop handlers ────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the drop zone entirely
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
    e.target.value = '' // reset so same file can be re-selected
  }

  // ── Transcription ─────────────────────────────────────────────────────
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
    if (!droppedFile || !projectName.trim()) {
      setError('Add a project name first')
      return
    }
    setAudioBlob(null)
    await transcribeBlob(droppedFile, droppedFile.name)
  }

  // ── Voice recording ───────────────────────────────────────────────────
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
        // transcribing starts after onstop fires
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

  // Watch for audioBlob to be set (after onstop) then kick off transcription
  useEffect(() => {
    if (audioBlob && step === 'recording') {
      transcribeBlob(audioBlob, 'field-log.webm')
    }
  }, [audioBlob])

  // ── GPT-4o structuring ────────────────────────────────────────────────
  async function structureTranscript(rawTranscript: string) {
    const res = await fetch('/api/dust-logs/structure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: rawTranscript,
        projectName,
        address,
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
    if (!projectName.trim()) { setError('Add project name first'); return }
    setTranscript(manualNotes)
    setStep('structuring')
    await structureTranscript(manualNotes)
  }

  // ── Submit ────────────────────────────────────────────────────────────
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
    setStep('form')
    setStructured(null)
    setTranscript('')
    setAudioBlob(null)
    setDroppedFile(null)
    setRecordingSeconds(0)
    setError('')
  }

  const projectNameMissing = !projectName.trim()

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
        <p className="text-gray-400 text-sm mb-6">Record, drop a file, or type. AI structures and syncs to your workspace.</p>

        {/* Step bar */}
        <div className="flex gap-1 mb-6 text-xs overflow-x-auto">
          {(['form','recording','transcribing','structuring','review','submitting'] as Step[]).map((s, i) => (
            <span
              key={s}
              className={`px-2 py-1 whitespace-nowrap ${
                step === s
                  ? 'text-neon-cyan border border-neon-cyan'
                  : ['transcribing','structuring','review','submitting'].indexOf(s) <
                    ['transcribing','structuring','review','submitting'].indexOf(step)
                    ? 'text-gray-600 line-through'
                    : 'text-gray-600'
              }`}
            >
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">{error}</div>
        )}

        {/* ── FORM + INPUT METHODS ─────────────────────────── */}
        {(step === 'form' || step === 'recording') && (
          <div className="space-y-4">

            {/* Project info */}
            <div className="card">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase">Project Name *</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    disabled={step === 'recording'}
                    className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan disabled:opacity-50"
                    placeholder="Target Store Phase 2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase">Site Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    disabled={step === 'recording'}
                    className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white mt-1 focus:outline-none focus:border-neon-cyan disabled:opacity-50"
                    placeholder="123 Main St, Columbus, OH"
                  />
                </div>
              </div>
            </div>

            {/* ── OPTION 1: Voice recorder ── */}
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
                <button
                  onClick={startRecording}
                  disabled={projectNameMissing}
                  className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ● Start Recording
                </button>
              )}
              {projectNameMissing && step !== 'recording' && (
                <p className="text-xs text-gray-500 text-center mt-2">Add project name first</p>
              )}
            </div>

            {/* ── OPTION 2: Drop file ── */}
            {step !== 'recording' && (
              <div className="card border-2 border-safety-blue/40">
                <h3 className="font-bold text-safety-blue mb-3 text-sm uppercase">Option 2 — Drop or Select a File</h3>
                <p className="text-xs text-gray-500 mb-3">
                  mp3 · mp4 · m4a · wav · webm · ogg · flac · mpeg &nbsp;·&nbsp; max 25MB
                </p>

                {/* Drop zone */}
                <div
                  ref={dropZoneRef}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors ${
                    dragging
                      ? 'border-neon-cyan bg-neon-cyan/5 text-neon-cyan'
                      : droppedFile
                      ? 'border-safety-green bg-safety-green/5'
                      : 'border-blueprint-grid hover:border-safety-blue text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_TYPES.map(e => `.${e}`).join(',')}
                    onChange={onFileInput}
                    className="hidden"
                  />

                  {droppedFile ? (
                    <div>
                      <p className="text-safety-green font-bold">✓ {droppedFile.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatBytes(droppedFile.size)}</p>
                      <button
                        onClick={e => { e.stopPropagation(); setDroppedFile(null); setError('') }}
                        className="text-xs text-gray-500 hover:text-red-400 mt-2 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : dragging ? (
                    <p className="font-bold">Drop it!</p>
                  ) : (
                    <div>
                      <p className="text-2xl mb-2">↓</p>
                      <p>Drag &amp; drop audio file here</p>
                      <p className="text-xs mt-1">or click to browse</p>
                    </div>
                  )}
                </div>

                {droppedFile && (
                  <button
                    onClick={transcribeDroppedFile}
                    disabled={projectNameMissing}
                    className="btn-primary w-full mt-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Transcribe with Whisper →
                  </button>
                )}
              </div>
            )}

            {/* ── OPTION 3: Type notes ── */}
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
                  disabled={projectNameMissing || !manualNotes.trim()}
                  className="btn-secondary w-full mt-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Structure with AI →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PROCESSING ───────────────────────────────────── */}
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

        {/* ── REVIEW ───────────────────────────────────────── */}
        {step === 'review' && structured && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-safety-yellow mb-3">AI STRUCTURED LOG — REVIEW BEFORE SAVING</h3>
              <p className="text-sm text-gray-300 italic mb-4">{structured.summary}</p>

              {structured.safety.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-red-400 uppercase mb-2">⚠ Safety</p>
                  <ul className="space-y-1">{structured.safety.map((s, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-red-400 flex-shrink-0">•</span>{s}</li>
                  ))}</ul>
                </div>
              )}
              {structured.workCompleted.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-green uppercase mb-2">✓ Work Completed</p>
                  <ul className="space-y-1">{structured.workCompleted.map((w, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-green flex-shrink-0">•</span>{w}</li>
                  ))}</ul>
                </div>
              )}
              {structured.issues.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-orange uppercase mb-2">⚡ Issues / RFIs</p>
                  <ul className="space-y-1">{structured.issues.map((iss, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-orange flex-shrink-0">•</span>{iss}</li>
                  ))}</ul>
                </div>
              )}
              {structured.nextSteps.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-blue uppercase mb-2">→ Next Steps</p>
                  <ul className="space-y-1">{structured.nextSteps.map((n, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-blue flex-shrink-0">•</span>{n}</li>
                  ))}</ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-blueprint-grid">
                {structured.tags.map(t => <span key={t} className="tag">{t}</span>)}
                {structured.jobType && (
                  <span className="text-xs text-safety-orange border border-safety-orange px-2 py-0.5">{structured.jobType}</span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={submitLog} className="btn-primary flex-1">
                Save &amp; Sync to Workspace
              </button>
              <button onClick={reset} className="btn-secondary text-sm px-4">
                Start Over
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              Audio &amp; transcript are NOT stored — only metadata saved to DB.
            </p>
          </div>
        )}

        {/* ── DONE ─────────────────────────────────────────── */}
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
        <div className="mt-6 p-3 border border-neon-green/20 text-xs text-gray-500 space-y-1">
          <p className="font-bold text-safety-orange uppercase">Field AI Rules — Active</p>
          <p>• Context is king — document what you observed, not assumed</p>
          <p>• Safety flagged first, always</p>
          <p>• Plain field language — no corporate fluff</p>
          <p>• Audio &amp; transcript discarded after structuring — zero storage</p>
        </div>
      </main>
    </div>
  )
}
