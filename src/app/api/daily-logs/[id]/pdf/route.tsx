import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { renderDailyLogPdf } from '@/lib/pdf/daily-log-pdf'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const log = await prisma.dailyLog.findFirst({
    where: { id: params.id, userId },
    include: {
      project: { select: { title: true, location: true } },
      user: { select: { name: true } },
    },
  })

  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const uint8 = await renderDailyLogPdf({
    ...log,
    crewCounts: log.crewCounts as Record<string, number>,
  })

  const filename = `daily-log-${log.date.toISOString().split('T')[0]}.pdf`

  // If the client requests JSON (mobile app), return base64 to avoid binary fetch issues in React Native
  const accept = req.headers.get('accept') ?? ''
  if (accept.includes('application/json')) {
    return NextResponse.json({
      base64: Buffer.from(uint8).toString('base64'),
      filename,
    })
  }

  return new NextResponse(Buffer.from(uint8), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
