import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, username: true, subscription: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  })

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ company })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { name, logoUrl, brandColor, contactEmail, seats, active } = body

  const company = await prisma.company.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(brandColor !== undefined && { brandColor }),
      ...(contactEmail !== undefined && { contactEmail: contactEmail || null }),
      ...(seats !== undefined && { seats: Number(seats) }),
      ...(active !== undefined && { active }),
    },
  })

  return NextResponse.json({ company })
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.company.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
