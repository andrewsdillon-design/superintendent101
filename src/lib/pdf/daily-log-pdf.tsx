import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'

export interface DailyLogForPdf {
  id: string
  date: Date
  weather: string
  crewCounts: Record<string, number>
  workPerformed: string
  deliveries: string
  inspections: string
  issues: string
  safetyNotes: string
  photoUrls: string[]
  signatureUrl?: string | null
  project?: { title: string; location?: string | null } | null
  user?: { name?: string | null } | null
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#f97316',
    paddingBottom: 10,
    marginBottom: 16,
  },
  headerLeft: { flex: 1 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#f97316', letterSpacing: 0.5 },
  brandSub: { fontSize: 8, color: '#6b7280', marginTop: 2, letterSpacing: 1 },
  headerRight: { alignItems: 'flex-end' },
  logTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },
  logDate: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
    gap: 20,
  },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#9ca3af', letterSpacing: 1, marginBottom: 2 },
  metaValue: { fontSize: 10, color: '#111827' },
  crewTable: { marginBottom: 14 },
  crewHeader: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  crewHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', flex: 1 },
  crewRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  crewRowAlt: { backgroundColor: '#f9fafb' },
  crewCell: { flex: 1, fontSize: 10, color: '#374151' },
  crewTotal: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    marginTop: 2,
  },
  crewTotalLabel: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#f97316' },
  crewTotalValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#f97316' },
  section: { marginBottom: 12 },
  sectionHeader: {
    backgroundColor: '#f97316',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 5,
  },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 },
  sectionBody: { fontSize: 10, color: '#374151', lineHeight: 1.5, paddingHorizontal: 4 },
  sectionEmpty: { fontSize: 9, color: '#9ca3af', fontStyle: 'italic', paddingHorizontal: 4 },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  photo: { width: 150, height: 112, objectFit: 'cover', borderRadius: 4 },
  signatureSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 },
  sigImage: { width: 200, height: 60, objectFit: 'contain' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#374151', width: 200, marginTop: 4 },
  sigLabel: { fontSize: 8, color: '#9ca3af', marginTop: 3 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: '#9ca3af' },
})

function Section({ title, value }: { title: string; value: string }) {
  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>{title}</Text>
      </View>
      {value?.trim() ? (
        <Text style={S.sectionBody}>{value.trim()}</Text>
      ) : (
        <Text style={S.sectionEmpty}>None reported</Text>
      )}
    </View>
  )
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function buildDailyLogPdf(log: DailyLogForPdf, generatedAt?: string): React.ReactElement {
  const crewEntries = Object.entries(log.crewCounts ?? {})
  const totalCrew = crewEntries.reduce((s, [, n]) => s + (n || 0), 0)
  const ts = generatedAt ?? new Date().toLocaleString('en-US')

  return (
    <Document title={`Daily Log — ${fmtDate(log.date)}`} author={log.user?.name ?? 'ProFieldHub'}>
      <Page size="LETTER" style={S.page}>
        <View style={S.header}>
          <View style={S.headerLeft}>
            <Text style={S.brand}>PROFIELDHUB</Text>
            <Text style={S.brandSub}>SUPERINTENDENT DAILY LOG</Text>
          </View>
          <View style={S.headerRight}>
            <Text style={S.logTitle}>Daily Field Report</Text>
            <Text style={S.logDate}>{fmtDate(log.date)}</Text>
          </View>
        </View>

        <View style={S.metaRow}>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>SUPERINTENDENT</Text>
            <Text style={S.metaValue}>{log.user?.name ?? '—'}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>PROJECT</Text>
            <Text style={S.metaValue}>{log.project?.title ?? '—'}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>LOCATION</Text>
            <Text style={S.metaValue}>{log.project?.location ?? '—'}</Text>
          </View>
          <View style={S.metaItem}>
            <Text style={S.metaLabel}>WEATHER</Text>
            <Text style={S.metaValue}>{log.weather || '—'}</Text>
          </View>
        </View>

        {crewEntries.length > 0 && (
          <View style={S.crewTable}>
            <View style={S.crewHeader}>
              <Text style={S.crewHeaderText}>TRADE</Text>
              <Text style={S.crewHeaderText}>HEADCOUNT</Text>
            </View>
            {crewEntries.map(([trade, count], i) => (
              <View key={trade} style={[S.crewRow, i % 2 === 1 ? S.crewRowAlt : {}]}>
                <Text style={S.crewCell}>{trade}</Text>
                <Text style={S.crewCell}>{count}</Text>
              </View>
            ))}
            <View style={S.crewTotal}>
              <Text style={S.crewTotalLabel}>TOTAL ON SITE</Text>
              <Text style={S.crewTotalValue}>{totalCrew}</Text>
            </View>
          </View>
        )}

        <Section title="WORK PERFORMED" value={log.workPerformed} />
        <Section title="DELIVERIES" value={log.deliveries} />
        <Section title="INSPECTIONS" value={log.inspections} />
        <Section title="ISSUES / DELAYS" value={log.issues} />
        <Section title="SAFETY NOTES" value={log.safetyNotes} />

        {log.photoUrls.length > 0 && (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>SITE PHOTOS</Text>
            </View>
            <View style={S.photosGrid}>
              {log.photoUrls.map((url, i) => (
                <Image key={i} src={url} style={S.photo} />
              ))}
            </View>
          </View>
        )}

        {log.signatureUrl && (
          <View style={S.signatureSection}>
            <Image src={log.signatureUrl} style={S.sigImage} />
            <View style={S.sigLine} />
            <Text style={S.sigLabel}>Superintendent Signature — {log.user?.name ?? ''}</Text>
          </View>
        )}

        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generated by ProFieldHub · {ts}</Text>
          <Text style={S.footerText}>profieldhub.com</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function renderDailyLogPdf(log: DailyLogForPdf): Promise<Uint8Array> {
  const doc = buildDailyLogPdf(log)
  const buffer = await renderToBuffer(doc)
  return new Uint8Array(buffer)
}
