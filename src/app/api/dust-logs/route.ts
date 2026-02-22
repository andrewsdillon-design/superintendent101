// API route for dust logs
import { NextRequest, NextResponse } from 'next/server'

const audioLogs = [
  { id: '1', projectName: 'Target Store #2847', address: '1234 Main St, Columbus, OH', date: '2026-02-21', duration: '4:32', status: 'COMPLETED' },
  { id: '2', projectName: 'Walmart Distribution Center', address: '5678 Industrial Blvd, Phoenix, AZ', date: '2026-02-20', duration: '6:15', status: 'COMPLETED' },
  { id: '3', projectName: 'Apartment Complex Phase 2', address: '900 Oak Ave, Austin, TX', date: '2026-02-21', duration: '3:48', status: 'PROCESSING' },
]

export async function GET(request: NextRequest) {
  return NextResponse.json({ logs: audioLogs })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  const newLog = {
    id: String(audioLogs.length + 1),
    projectName: body.projectName,
    address: body.address || '',
    date: new Date().toISOString().split('T')[0],
    duration: body.duration || '0:00',
    status: 'PROCESSING',
  }
  
  audioLogs.unshift(newLog)
  
  return NextResponse.json({ log: newLog })
}
