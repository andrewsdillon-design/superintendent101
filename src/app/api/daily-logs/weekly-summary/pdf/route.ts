import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/get-user-id'
import { renderWeeklyReportPdf } from '@/lib/pdf/weekly-report-pdf'

export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { summary, weekStart, weekEnd, logCount } = body as {
    summary?: string; weekStart?: string; weekEnd?: string; logCount?: number
  }

  if (!summary) return NextResponse.json({ error: 'summary required' }, { status: 400 })

  const pdfBuffer = await renderWeeklyReportPdf({ summary, weekStart, weekEnd, logCount })
  const filename = `weekly-report-${weekStart ?? 'report'}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
