import { NextRequest, NextResponse } from 'next/server'

// Static sample logs — full Prisma integration requires audio upload flow
const sampleLogs = [
  {
    id: '1',
    projectName: 'Target Store #2847',
    address: '1234 Main St, Columbus, OH',
    date: '2026-02-21',
    duration: 272,
    status: 'COMPLETED',
    tags: ['daily-log', 'concrete'],
  },
  {
    id: '2',
    projectName: 'Walmart Distribution Center',
    address: '5678 Industrial Blvd, Phoenix, AZ',
    date: '2026-02-20',
    duration: 375,
    status: 'COMPLETED',
    tags: ['steel', 'scheduling'],
  },
  {
    id: '3',
    projectName: 'Apartment Complex Phase 2',
    address: '900 Oak Ave, Austin, TX',
    date: '2026-02-21',
    duration: 228,
    status: 'PROCESSING',
    tags: ['safety'],
  },
]

const logs = [...sampleLogs]

export async function GET() {
  return NextResponse.json({ logs })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (!body.projectName) {
    return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
  }

  const newLog = {
    id: String(Date.now()),
    projectName: body.projectName,
    address: body.address || '',
    date: new Date().toISOString().split('T')[0],
    duration: body.duration || 0,
    status: 'PENDING',
    tags: body.tags || [],
  }

  logs.unshift(newLog)

  return NextResponse.json({ log: newLog }, { status: 201 })
}
