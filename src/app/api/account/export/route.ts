import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserId } from '@/lib/get-user-id'
import { renderDailyLogPdf } from '@/lib/pdf/daily-log-pdf'
import JSZip from 'jszip'

const README = `ProFieldHub — Your Data Export
================================
Generated: {DATE}

This archive contains all data associated with your ProFieldHub account.

Files:
  profile.json     — Your account details and settings
  projects.json    — All your projects
  daily-logs.json  — All your daily field logs (structured data)
  pdfs/            — Each daily log as a professional PDF

Your data belongs to you.
If you have questions, contact support at profieldhub.com.
`

export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch everything in parallel
  const [user, projects, logs] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        bio: true,
        location: true,
        skills: true,
        yearsExperience: true,
        role: true,
        subscription: true,
        createdAt: true,
      },
    }),
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.dailyLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      include: {
        project: { select: { title: true, location: true } },
        user: { select: { name: true } },
      },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const zip = new JSZip()
  const exportDate = new Date().toISOString()

  // README
  zip.file('README.txt', README.replace('{DATE}', new Date().toLocaleString('en-US')))

  // profile.json
  zip.file('profile.json', JSON.stringify(user, null, 2))

  // projects.json
  zip.file('projects.json', JSON.stringify(projects, null, 2))

  // daily-logs.json — structured data without user/project nesting (clean flat export)
  const logsExport = logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString().split('T')[0],
    project: l.project?.title ?? null,
    weather: l.weather,
    crewCounts: l.crewCounts,
    workPerformed: l.workPerformed,
    deliveries: l.deliveries,
    inspections: l.inspections,
    issues: l.issues,
    safetyNotes: l.safetyNotes,
    photoUrls: l.photoUrls,
    signatureUrl: l.signatureUrl,
    createdAt: l.createdAt.toISOString(),
  }))
  zip.file('daily-logs.json', JSON.stringify(logsExport, null, 2))

  // PDFs — generate one per log (cap at 365 to keep response reasonable)
  const pdfsFolder = zip.folder('pdfs')!
  const logsForPdf = logs.slice(0, 365)

  // Generate PDFs concurrently in batches of 5 to avoid memory spikes
  const BATCH = 5
  for (let i = 0; i < logsForPdf.length; i += BATCH) {
    const batch = logsForPdf.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async (log) => {
        try {
          const pdf = await renderDailyLogPdf({
            ...log,
            crewCounts: log.crewCounts as Record<string, number>,
          })
          const dateStr = log.date.toISOString().split('T')[0]
          const projectSlug = log.project?.title
            ? `-${log.project.title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`
            : ''
          pdfsFolder.file(`${dateStr}${projectSlug}.pdf`, pdf)
        } catch {
          // Skip a failed PDF rather than aborting the whole export
        }
      })
    )
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })

  // Slice to a plain ArrayBuffer — valid BodyInit across all TS lib versions
  const arrayBuf = zipBuffer.buffer.slice(
    zipBuffer.byteOffset,
    zipBuffer.byteOffset + zipBuffer.byteLength
  )

  const filename = `profieldhub-export-${exportDate.split('T')[0]}.zip`

  return new NextResponse(arrayBuf as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
