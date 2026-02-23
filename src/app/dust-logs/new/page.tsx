'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
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

export default function NewDustLogPage() {
  const router = useRouter()

  // Form state
  const [projectName, setProjectName] = useState('')
  const [address, setAddress] = useState('')
  const [manualNotes, setManualNotes] = useState('')

  // Recording state
  const [step, setStep] = useState<Step>('form')
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [transcript, setTranscript] = useState('')
  const [structured, setStructured] = useState<Structured | null>(null)

  // Status messages
  const [error, setError] = useState('')
  const [syncResults, setSyncResults] = useState<Record<string, string> | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  async function startRecording() {
    setError('')
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
      setError('Microphone access denied. Please allow microphone permission and try again.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    setStep('transcribing')
    setTimeout(() => transcribeAudio(), 300)
  }

  async function transcribeAudio() {
    if (!audioBlob) return
    setError('')

    const fd = new FormData()
    fd.append('audio', audioBlob, 'field-log.webm')

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
        duration: Math.round(recordingSeconds / 60),
        transcript: null,      // not storing transcript
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

  async function useManualNotes() {
    if (!manualNotes.trim()) { setError('Add some notes first'); return }
    setTranscript(manualNotes)
    setStep('structuring')
    await structureTranscript(manualNotes)
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="min-h-screen blueprint-bg">
      <header className="border-b border-blueprint-grid bg-blueprint-bg/80 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-display text-xl font-bold text-neon-cyan">S101</Link>
            <nav className="hidden md:flex gap-4 text-sm">
              <Link href="/dashboard" className="text-gray-400 hover:text-white">Feed</Link>
              <Link href="/dust-logs" className="text-white">Dust Logs</Link>
            </nav>
          </div>
          <Link href="/dust-logs" className="text-sm text-gray-400 hover:text-white">← Back to Logs</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-display text-2xl font-bold text-safety-green mb-2">NEW DUST LOG</h1>
        <p className="text-gray-400 text-sm mb-6">Voice record or type your field notes. AI structures and syncs to your workspace.</p>

        {/* Step indicators */}
        <div className="flex gap-2 mb-6 text-xs">
          {(['form','recording','transcribing','structuring','review','submitting'] as Step[]).map((s, i) => (
            <span key={s} className={`px-2 py-1 ${step === s ? 'text-neon-cyan border border-neon-cyan' : 'text-gray-600'}`}>
              {i + 1}. {s}
            </span>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-500 text-red-300 text-sm">{error}</div>
        )}

        {/* STEP: form + recording */}
        {(step === 'form' || step === 'recording') && (
          <div className="space-y-4">
            <div className="card">
              <div className="space-y-4">
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

            {/* Voice recorder */}
            <div className="card border-2 border-safety-green/30">
              <h3 className="font-bold text-safety-green mb-3 text-sm">VOICE RECORDING</h3>

              {step === 'recording' ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    <span className="font-mono text-2xl text-white">{formatTime(recordingSeconds)}</span>
                  </div>
                  <p className="text-xs text-gray-400">Recording... speak clearly about what you observed today</p>
                  <button onClick={stopRecording} className="btn-primary w-full">
                    ■ Stop &amp; Transcribe
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={startRecording}
                    disabled={!projectName.trim()}
                    className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ● Start Recording
                  </button>
                  {!projectName.trim() && (
                    <p className="text-xs text-gray-500 text-center">Add project name first</p>
                  )}
                </div>
              )}
            </div>

            {/* Manual text fallback */}
            {step === 'form' && (
              <div className="card">
                <h3 className="font-bold text-safety-blue mb-3 text-sm">OR TYPE YOUR NOTES</h3>
                <textarea
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  rows={5}
                  className="w-full bg-blueprint-bg border border-blueprint-grid p-2 text-white focus:outline-none focus:border-neon-cyan resize-none text-sm"
                  placeholder="Walked the slab this morning. Found rebar spacing off in 3 areas near grid line B-4. Got fixed before pour. Concrete trucks arrived at 0700..."
                />
                <button
                  onClick={useManualNotes}
                  disabled={!projectName.trim() || !manualNotes.trim()}
                  className="btn-secondary w-full mt-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Structure with AI →
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP: processing */}
        {(step === 'transcribing' || step === 'structuring') && (
          <div className="card text-center py-12">
            <div className="font-mono text-neon-cyan text-lg mb-2 animate-pulse">
              {step === 'transcribing' ? '⟳ Transcribing audio...' : '⟳ Structuring with Field AI...'}
            </div>
            <p className="text-xs text-gray-500">
              {step === 'transcribing'
                ? 'OpenAI Whisper processing your audio'
                : 'GPT-4o applying Field AI Operating Rules'}
            </p>
            {transcript && step === 'structuring' && (
              <div className="mt-6 text-left bg-blueprint-paper/20 p-3 border border-blueprint-grid text-xs text-gray-400 max-h-40 overflow-auto">
                <p className="text-gray-500 mb-1">Raw transcript:</p>
                {transcript}
              </div>
            )}
          </div>
        )}

        {/* STEP: review structured log */}
        {step === 'review' && structured && (
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-safety-yellow mb-3">STRUCTURED LOG — REVIEW</h3>
              <p className="text-sm text-gray-300 mb-4 italic">{structured.summary}</p>

              {structured.safety.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-red uppercase mb-2">⚠ Safety</p>
                  <ul className="space-y-1">{structured.safety.map((s,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-red">•</span>{s}</li>)}</ul>
                </div>
              )}
              {structured.workCompleted.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-green uppercase mb-2">✓ Work Completed</p>
                  <ul className="space-y-1">{structured.workCompleted.map((w,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-green">•</span>{w}</li>)}</ul>
                </div>
              )}
              {structured.issues.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-orange uppercase mb-2">⚡ Issues / RFIs</p>
                  <ul className="space-y-1">{structured.issues.map((iss,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-orange">•</span>{iss}</li>)}</ul>
                </div>
              )}
              {structured.nextSteps.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-safety-blue uppercase mb-2">→ Next Steps</p>
                  <ul className="space-y-1">{structured.nextSteps.map((n,i) => <li key={i} className="text-sm text-gray-300 flex gap-2"><span className="text-safety-blue">•</span>{n}</li>)}</ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-2">
                {structured.tags.map(t => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={submitLog} className="btn-primary flex-1">
                Save &amp; Sync to Workspace
              </button>
              <button onClick={() => { setStep('form'); setStructured(null); setTranscript('') }} className="btn-secondary flex-1 text-sm">
                Re-record
              </button>
            </div>
            <p className="text-xs text-center text-gray-500">
              Transcript is NOT stored — only metadata saved. Log pushed to connected workspaces.
            </p>
          </div>
        )}

        {/* STEP: submitting / done */}
        {step === 'submitting' && (
          <div className="card text-center py-12">
            {syncResults ? (
              <div>
                <p className="text-safety-green font-bold text-lg mb-4">✓ Log Saved</p>
                <div className="space-y-2 text-sm">
                  {Object.entries(syncResults).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <span className="capitalize text-gray-400">{k === 'google' ? 'Google Drive / NotebookLM' : 'Notion'}</span>
                      <span className={v === 'synced' ? 'text-safety-green' : v === 'not connected' ? 'text-gray-500' : 'text-safety-orange'}>
                        {v === 'synced' ? '✓ Synced' : v === 'not connected' ? '— Not connected' : `⚠ ${v}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">Redirecting to logs...</p>
              </div>
            ) : (
              <p className="text-neon-cyan animate-pulse font-mono">⟳ Saving log...</p>
            )}
          </div>
        )}

        {/* Field AI reminder */}
        <div className="mt-6 card border border-neon-green/20">
          <h3 className="font-bold text-safety-orange mb-2 text-xs uppercase">Field AI Rules — Active</h3>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• Context is king — document what you observed, not assumed</li>
            <li>• Safety overrides everything — flagged first</li>
            <li>• No corporate fluff — plain field language only</li>
            <li>• Audio never stored — transcript discarded after structuring</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
