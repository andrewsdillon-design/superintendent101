import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    backgroundColor: '#ffffff',
  },
  // Header
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
  // Meta row
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
  // Crew table
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
  // Sections
  section: { marginBottom: 12 },
  sectionHeader: {
    backgroundColor: '#f97316',
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 8,
    marginBottom: 5,
  },
  sectionTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 },
  sectionBody: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
    paddingHorizontal: 4,
  },
  sectionEmpty: { fontSize: 9, color: '#9ca3af', fontStyle: 'italic', paddingHorizontal: 4 },
  // Photos
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  photo: { width: 150, height: 112, objectFit: 'cover', borderRadius: 4 },
  // Signature
  signatureSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 },
  sigImage: { width: 200, height: 60, objectFit: 'contain' },
  sigLine: { borderBottomWidth: 1, borderBottomColor: '#374151', width: 200, marginTop: 4 },
  sigLabel: { fontSize: 8, color: '#9ca3af', marginTop: 3 },
  // Footer
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
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {value?.trim() ? (
        <Text style={styles.sectionBody}>{value.trim()}</Text>
      ) : (
        <Text style={styles.sectionEmpty}>None reported</Text>
      )}
    </View>
  )
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = await prisma.dailyLog.findFirst({
    where: { id: params.id, userId },
    include: { project: { select: { title: true, location: true } }, user: { select: { name: true } } },
  })

  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const crewCounts = log.crewCounts as Record<string, number>
  const totalCrew = Object.values(crewCounts).reduce((s, n) => s + (n || 0), 0)
  const crewEntries = Object.entries(crewCounts)

  const generatedAt = new Date().toLocaleString('en-US')

  const pdfDoc = (
    <Document title={`Daily Log — ${formatDate(log.date)}`} author={log.user?.name ?? 'ProFieldHub'}>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>PROFIELDHUB</Text>
            <Text style={styles.brandSub}>SUPERINTENDENT DAILY LOG</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.logTitle}>Daily Field Report</Text>
            <Text style={styles.logDate}>{formatDate(log.date)}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>SUPERINTENDENT</Text>
            <Text style={styles.metaValue}>{log.user?.name ?? '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>PROJECT</Text>
            <Text style={styles.metaValue}>{log.project?.title ?? '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>LOCATION</Text>
            <Text style={styles.metaValue}>{log.project?.location ?? '—'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>WEATHER</Text>
            <Text style={styles.metaValue}>{log.weather || '—'}</Text>
          </View>
        </View>

        {/* Crew Counts */}
        {crewEntries.length > 0 && (
          <View style={styles.crewTable}>
            <View style={styles.crewHeader}>
              <Text style={styles.crewHeaderText}>TRADE</Text>
              <Text style={styles.crewHeaderText}>HEADCOUNT</Text>
            </View>
            {crewEntries.map(([trade, count], i) => (
              <View key={trade} style={[styles.crewRow, i % 2 === 1 ? styles.crewRowAlt : {}]}>
                <Text style={styles.crewCell}>{trade}</Text>
                <Text style={styles.crewCell}>{count}</Text>
              </View>
            ))}
            <View style={styles.crewTotal}>
              <Text style={styles.crewTotalLabel}>TOTAL ON SITE</Text>
              <Text style={styles.crewTotalValue}>{totalCrew}</Text>
            </View>
          </View>
        )}

        <Section title="WORK PERFORMED" value={log.workPerformed} />
        <Section title="DELIVERIES" value={log.deliveries} />
        <Section title="INSPECTIONS" value={log.inspections} />
        <Section title="ISSUES / DELAYS" value={log.issues} />
        <Section title="SAFETY NOTES" value={log.safetyNotes} />

        {/* Photos */}
        {log.photoUrls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>SITE PHOTOS</Text>
            </View>
            <View style={styles.photosGrid}>
              {log.photoUrls.map((url, i) => (
                <Image key={i} src={url} style={styles.photo} />
              ))}
            </View>
          </View>
        )}

        {/* Signature */}
        {log.signatureUrl && (
          <View style={styles.signatureSection}>
            <Image src={log.signatureUrl} style={styles.sigImage} />
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>Superintendent Signature — {log.user?.name ?? ''}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Generated by ProFieldHub · {generatedAt}</Text>
          <Text style={styles.footerText}>profieldhub.com</Text>
        </View>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(pdfDoc)
  const uint8 = new Uint8Array(buffer)

  const filename = `daily-log-${log.date.toISOString().split('T')[0]}.pdf`

  return new NextResponse(uint8, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
