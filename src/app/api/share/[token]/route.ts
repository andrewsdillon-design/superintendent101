import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/share/[token] — public read-only project data (no auth required)
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const share = await prisma.projectShare.findUnique({
    where: { token: params.token },
    include: {
      project: {
        select: {
          title: true,
          location: true,
          address: true,
          permitNumber: true,
          status: true,
          dailyLogs: {
            where: { archived: false },
            orderBy: { date: 'desc' },
            take: 100,
            select: {
              id: true,
              date: true,
              weather: true,
              crewCounts: true,
              workPerformed: true,
              deliveries: true,
              inspections: true,
              issues: true,
              safetyNotes: true,
              rfi: true,
              address: true,
              permitNumber: true,
              photoUrls: true,
            },
          },
        },
      },
    },
  })

  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check expiry
  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This share link has expired' }, { status: 410 })
  }

  // Increment view count (fire-and-forget)
  prisma.projectShare.update({
    where: { token: params.token },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {})

  return NextResponse.json({
    project: share.project,
    label: share.label,
    createdAt: share.createdAt,
    viewCount: share.viewCount,
  })
}
