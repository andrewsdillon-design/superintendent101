import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/get-user-id'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { summary, weekStart, weekEnd, logCount } = body as {
    summary?: string; weekStart?: string; weekEnd?: string; logCount?: number
  }

  if (!summary) return NextResponse.json({ error: 'summary required' }, { status: 400 })

  const S = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, backgroundColor: '#ffffff' },
    header: { borderBottomWidth: 2, borderBottomColor: '#f97316', paddingBottom: 10, marginBottom: 20 },
    brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#f97316', letterSpacing: 2 },
    subtitle: { fontSize: 9, color: '#6b7280', letterSpacing: 1, marginTop: 2 },
    meta: { flexDirection: 'row', gap: 20, marginBottom: 24 },
    metaItem: { fontSize: 9, color: '#6b7280' },
    metaValue: { fontFamily: 'Helvetica-Bold', color: '#111827' },
    body: { lineHeight: 1.7, fontSize: 10, color: '#1a1a1a' },
    footer: { position: 'absolute', bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 8, color: '#9ca3af' },
  })

  const dateRange = weekStart && weekEnd
    ? `${weekStart} to ${weekEnd}`
    : new Date().toISOString().split('T')[0]

  const generatedOn = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const doc = React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: S.page },
      React.createElement(View, { style: S.header },
        React.createElement(Text, { style: S.brand }, 'PROFIELDHUB'),
        React.createElement(Text, { style: S.subtitle }, 'WEEKLY FIELD REPORT'),
      ),
      React.createElement(View, { style: S.meta },
        React.createElement(View, null,
          React.createElement(Text, { style: S.metaItem }, 'PERIOD'),
          React.createElement(Text, { style: S.metaValue }, dateRange),
        ),
        logCount != null ? React.createElement(View, null,
          React.createElement(Text, { style: S.metaItem }, 'DAILY LOGS'),
          React.createElement(Text, { style: S.metaValue }, String(logCount)),
        ) : null,
        React.createElement(View, null,
          React.createElement(Text, { style: S.metaItem }, 'GENERATED'),
          React.createElement(Text, { style: S.metaValue }, generatedOn),
        ),
      ),
      React.createElement(Text, { style: S.body }, summary),
      React.createElement(View, { style: S.footer, fixed: true },
        React.createElement(Text, { style: S.footerText }, 'ProFieldHub — profieldhub.com'),
        React.createElement(Text, { style: S.footerText }, `${dateRange}`),
      ),
    )
  )

  const uint8 = await renderToBuffer(doc)
  const filename = `weekly-report-${weekStart ?? 'report'}.pdf`

  return new NextResponse(Buffer.from(uint8), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
