import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { members: true } } },
  })

  return NextResponse.json({ companies })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, logoUrl, brandColor, contactEmail, seats } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const baseSlug = slug(name.trim())
  let finalSlug = baseSlug
  let i = 1
  while (await prisma.company.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${i++}`
  }

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      slug: finalSlug,
      logoUrl: logoUrl || null,
      brandColor: brandColor || '#2563eb',
      contactEmail: contactEmail || null,
      seats: seats ? Number(seats) : 10,
    },
  })

  return NextResponse.json({ company }, { status: 201 })
}
