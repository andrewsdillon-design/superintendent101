import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/integrations/procore/link — link a ProFieldHub project to a Procore project
// Body: { projectId, procoreProjectId, procoreCompanyId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, procoreProjectId, procoreCompanyId } = await req.json()
  if (!projectId || !procoreProjectId || !procoreCompanyId) {
    return NextResponse.json({ error: 'projectId, procoreProjectId, and procoreCompanyId are required' }, { status: 400 })
  }

  // Verify the project belongs to this user
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const link = await prisma.procoreProjectLink.upsert({
    where: { userId_projectId: { userId: user.id, projectId } },
    create: { userId: user.id, projectId, procoreProjectId, procoreCompanyId },
    update: { procoreProjectId, procoreCompanyId },
  })

  return NextResponse.json({ link })
}

// DELETE /api/integrations/procore/link?projectId=xxx — unlink a project
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  await prisma.procoreProjectLink.deleteMany({ where: { userId: user.id, projectId } })
  return NextResponse.json({ unlinked: true })
}

// GET /api/integrations/procore/link — get all project links for this user
export async function GET() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const links = await prisma.procoreProjectLink.findMany({ where: { userId: user.id } })
  return NextResponse.json({ links })
}
