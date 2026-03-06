'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface DailyLog {
  id: string
  date: string
  weather: string
  crewCounts: Record<string, number>
  workPerformed: string
  deliveries: string
  inspections: string
  issues: string
  safetyNotes: string
  rfi: string
  address: string | null
  permitNumber: string | null
  photoUrls: string[]
}

interface SharedProject {
  title: string
  location: string | null
  address: string | null
  permitNumber: string | null
  status: string
  dailyLogs: DailyLog[]
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<SharedProject | null>(null)
  const [label, setLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setProject(d.project)
        setLabel(d.label)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [token])

  function fmt(dateStr: string) {
    return new Date(String(dateStr).split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  function totalCrew(counts: Record<string, number>) {
    return Object.values(counts ?? {}).reduce((s, n) => s + n, 0)
  }

  if (loading) return (
    <div style={s.page}>
      <div style={s.card}><p style={s.meta}>Loading…</p></div>
    </div>
  )

  if (error) return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={s.title}>Link Unavailable</h2>
        <p style={s.meta}>{error}</p>
      </div>
    </div>
  )

  if (!project) return null

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.brand}>ProFieldHub</span>
        <span style={s.badge}>Read-Only View</span>
      </div>

      <div style={s.card}>
        <h1 style={s.title}>{project.title}</h1>
        {label && <p style={s.sharedWith}>Shared: {label}</p>}
        {project.location && <p style={s.meta}>📍 {project.location}</p>}
        {project.address && <p style={s.meta}>🏠 {project.address}</p>}
        {project.permitNumber && <p style={s.meta}>📋 Permit: {project.permitNumber}</p>}
        <p style={s.meta}>{project.dailyLogs.length} field log{project.dailyLogs.length !== 1 ? 's' : ''}</p>
      </div>

      {project.dailyLogs.map(log => (
        <div key={log.id} style={s.logCard}>
          <button style={s.logHeader} onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
            <span style={s.logDate}>{fmt(log.date)}</span>
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {log.weather && <span style={s.logMeta}>{log.weather}</span>}
              {totalCrew(log.crewCounts) > 0 && <span style={s.logMeta}>👷 {totalCrew(log.crewCounts)}</span>}
              <span style={{ color: '#f97316', fontSize: 12 }}>{expandedId === log.id ? '▲' : '▼'}</span>
            </span>
          </button>

          {expandedId === log.id && (
            <div style={s.logBody}>
              {log.workPerformed && <Section label="Work Performed" value={log.workPerformed} />}
              {Object.keys(log.crewCounts ?? {}).length > 0 && (
                <Section label="Crew" value={Object.entries(log.crewCounts).map(([t, c]) => `${t}: ${c}`).join(', ')} />
              )}
              {log.deliveries && <Section label="Deliveries" value={log.deliveries} />}
              {log.inspections && <Section label="Inspections" value={log.inspections} />}
              {log.rfi && <Section label="RFIs" value={log.rfi} />}
              {log.issues && <Section label="Issues / Delays" value={log.issues} />}
              {log.safetyNotes && <Section label="Safety Notes" value={log.safetyNotes} />}
              {log.address && <Section label="Address" value={log.address} />}
              {log.permitNumber && <Section label="Permit #" value={log.permitNumber} />}
              {log.photoUrls?.length > 0 && (
                <div>
                  <p style={s.fieldLabel}>PHOTOS</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {log.photoUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="" style={{ width: 100, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #1e293b' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <p style={{ textAlign: 'center', color: '#374151', fontSize: 11, padding: '24px 0' }}>
        Powered by <a href="https://profieldhub.com" style={{ color: '#f97316' }}>ProFieldHub</a>
      </p>
    </div>
  )
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={s.fieldLabel}>{label.toUpperCase()}</p>
      <p style={s.fieldValue}>{value}</p>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#0a0f1a', padding: '0 0 40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a' },
  brand: { color: '#f97316', fontWeight: 800, fontSize: 16, letterSpacing: 1 },
  badge: { background: '#1e293b', color: '#94a3b8', fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 600 },
  card: { margin: '20px 16px 0', padding: 16, backgroundColor: '#111827', borderRadius: 10, border: '1px solid #1e293b' },
  title: { color: '#f9fafb', fontWeight: 800, fontSize: 20, margin: '0 0 6px' },
  sharedWith: { color: '#f97316', fontSize: 12, margin: '0 0 6px', fontWeight: 600 },
  meta: { color: '#6b7280', fontSize: 13, margin: '2px 0' },
  logCard: { margin: '10px 16px 0', backgroundColor: '#111827', borderRadius: 10, border: '1px solid #1e293b', overflow: 'hidden' },
  logHeader: { width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', textAlign: 'left' },
  logDate: { color: '#d1d5db', fontWeight: 700, fontSize: 14 },
  logMeta: { color: '#6b7280', fontSize: 12 },
  logBody: { padding: '0 14px 14px', borderTop: '1px solid #1e293b' },
  fieldLabel: { color: '#6b7280', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, margin: '12px 0 4px' },
  fieldValue: { color: '#d1d5db', fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' },
}
