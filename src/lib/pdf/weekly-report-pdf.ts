import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

export interface WeeklyReportPdfInput {
  summary: string
  weekStart?: string
  weekEnd?: string
  logCount?: number
}

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 44,
    backgroundColor: '#ffffff',
  },
  // Header
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#f97316',
    paddingBottom: 10,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#f97316', letterSpacing: 2 },
  subtitle: { fontSize: 9, color: '#6b7280', letterSpacing: 1.5, marginTop: 2 },
  // Meta row
  meta: {
    flexDirection: 'row',
    gap: 28,
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  metaLabel: { fontSize: 8, color: '#9ca3af', letterSpacing: 1, marginBottom: 3, fontFamily: 'Helvetica-Bold' },
  metaValue: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  // Body content
  sectionHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#f97316',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 5,
  },
  paragraph: {
    fontSize: 10,
    color: '#1a1a1a',
    lineHeight: 1.65,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 10,
    color: '#f97316',
    marginRight: 6,
    lineHeight: 1.65,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.65,
  },
  spacer: { height: 6 },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 8, color: '#9ca3af' },
})

function parseSummaryToElements(summary: string): React.ReactElement[] {
  const lines = summary.split('\n')
  const elements: React.ReactElement[] = []

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()

    if (!trimmed) {
      elements.push(React.createElement(View, { key: `sp-${i}`, style: S.spacer }))
      continue
    }

    // Bullet points: lines starting with -, *, or •
    if (/^[-*•]/.test(trimmed)) {
      const text = trimmed.replace(/^[-*•]\s*/, '')
      elements.push(
        React.createElement(View, { key: `b-${i}`, style: S.bulletRow },
          React.createElement(Text, { style: S.bulletDot }, '•'),
          React.createElement(Text, { style: S.bulletText }, text),
        )
      )
      continue
    }

    // Section headers: ends with colon, no bullet prefix, reasonably short
    if (trimmed.endsWith(':') && trimmed.length < 60 && !/^[-*•]/.test(trimmed)) {
      elements.push(React.createElement(Text, { key: `h-${i}`, style: S.sectionHeader }, trimmed.toUpperCase()))
      continue
    }

    // Regular paragraph
    elements.push(React.createElement(Text, { key: `p-${i}`, style: S.paragraph }, trimmed))
  }

  return elements
}

export async function renderWeeklyReportPdf(input: WeeklyReportPdfInput): Promise<Uint8Array> {
  const { summary, weekStart, weekEnd, logCount } = input

  const dateRange = weekStart && weekEnd
    ? `${weekStart} to ${weekEnd}`
    : new Date().toISOString().split('T')[0]

  const periodLabel = weekStart && weekEnd
    ? (() => {
        const s = new Date(weekStart + 'T12:00:00')
        const e = new Date(weekEnd + 'T12:00:00')
        const mo = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return `${mo(s)} – ${mo(e)}, ${e.getFullYear()}`
      })()
    : dateRange

  const generatedOn = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const bodyElements = parseSummaryToElements(summary)

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: S.page },

      // Header
      React.createElement(View, { style: S.header },
        React.createElement(View, null,
          React.createElement(Text, { style: S.brand }, 'PROFIELDHUB'),
          React.createElement(Text, { style: S.subtitle }, 'WEEKLY FIELD REPORT'),
        ),
      ),

      // Meta row
      React.createElement(View, { style: S.meta },
        React.createElement(View, null,
          React.createElement(Text, { style: S.metaLabel }, 'PERIOD'),
          React.createElement(Text, { style: S.metaValue }, periodLabel),
        ),
        logCount != null
          ? React.createElement(View, null,
              React.createElement(Text, { style: S.metaLabel }, 'DAILY LOGS'),
              React.createElement(Text, { style: S.metaValue }, String(logCount)),
            )
          : null,
        React.createElement(View, null,
          React.createElement(Text, { style: S.metaLabel }, 'GENERATED'),
          React.createElement(Text, { style: S.metaValue }, generatedOn),
        ),
      ),

      // Parsed body
      React.createElement(View, null, ...bodyElements),

      // Footer
      React.createElement(View, { style: S.footer, fixed: true },
        React.createElement(Text, { style: S.footerText }, 'ProFieldHub — profieldhub.com'),
        React.createElement(Text, { style: S.footerText }, periodLabel),
      ),
    )
  )

  return await renderToBuffer(doc)
}
