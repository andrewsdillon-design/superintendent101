import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/get-user-id'
import { prisma } from '@/lib/db'

// POST /api/integrations/procore/link — link a ProFieldHub project to a Procore project
// Body: { projectId, procoreProjectId, procoreCompanyId }
export async function POST(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId, procoreProjectId, procoreCompanyId } = await req.json()
  if (!projectId || !procoreProjectId || !procoreCompanyId) {
    return NextResponse.json({ error: 'projectId, procoreProjectId, and procoreCompanyId are required' }, { status: 400 })
  }

  // Verify the project belongs to this user
  const project = await prisma.project.findFirst({ where: { id: projectId, userId } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const link = await prisma.procoreProjectLink.upsert({
    where: { userId_projectId: { userId, projectId } },
    create: { userId, projectId, procoreProjectId, procoreCompanyId },
    update: { procoreProjectId, procoreCompanyId },
  })

  return NextResponse.json({ link })
}

// DELETE /api/integrations/procore/link?projectId=xxx — unlink a project
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 })

  await prisma.procoreProjectLink.deleteMany({ where: { userId, projectId } })
  return NextResponse.json({ unlinked: true })
}

// GET /api/integrations/procore/link — get all project links for this user
export async function GET(req: NextRequest) {
  const userId = await getUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const links = await prisma.procoreProjectLink.findMany({ where: { userId } })
  return NextResponse.json({ links })
}
