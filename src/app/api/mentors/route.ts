import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const skill = searchParams.get('skill')
  const location = searchParams.get('location')
  const maxRate = searchParams.get('maxRate')

  const mentors = await prisma.user.findMany({
    where: {
      isMentor: true,
      ...(location ? { location: { contains: location, mode: 'insensitive' } } : {}),
      ...(maxRate ? { hourlyRate: { lte: parseFloat(maxRate) } } : {}),
    },
    select: {
      id: true,
      name: true,
      username: true,
      mentorBio: true,
      bio: true,
      skills: true,
      hourlyRate: true,
      location: true,
      yearsExperience: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const filtered = skill
    ? mentors.filter(m => m.skills.includes(skill))
    : mentors

  return NextResponse.json({ mentors: filtered })
}
